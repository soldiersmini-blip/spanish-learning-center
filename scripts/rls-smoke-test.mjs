import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

loadLocalEnv('.env.rls.local');

const required = [
  ['VITE_SUPABASE_URL', 'SUPABASE_URL'],
  ['VITE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_PUBLISHABLE_KEY'],
  ['RLS_TEST_USER_A_EMAIL', 'TEST_A_EMAIL'],
  ['RLS_TEST_USER_A_PASSWORD', 'TEST_A_PASSWORD'],
  ['RLS_TEST_USER_B_EMAIL', 'TEST_B_EMAIL'],
  ['RLS_TEST_USER_B_PASSWORD', 'TEST_B_PASSWORD'],
];

const missing = required.filter((keys) => !readEnv(keys)).map((keys) => keys.join(' or '));
if (missing.length) {
  console.error(`Missing required environment variables: ${missing.join(', ')}`);
  process.exit(2);
}

const url = readEnv(['VITE_SUPABASE_URL', 'SUPABASE_URL']);
const key = readEnv(['VITE_SUPABASE_PUBLISHABLE_KEY', 'SUPABASE_PUBLISHABLE_KEY']);
const namespace = process.env.RLS_SMOKE_NAMESPACE || 'recent_learning';
const allowWrite = process.env.RLS_SMOKE_WRITE === '1';

function client() {
  return createClient(url, key, {
    auth: {
      flowType: 'pkce',
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

async function signIn(label, email, password) {
  const supabase = client();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) throw new Error(`${label} sign-in failed: ${error?.message || 'missing user'}`);
  return { supabase, user: data.user };
}

async function selectDocuments(supabase, userId) {
  return supabase
    .from('user_data_documents')
    .select('user_id,namespace,payload')
    .eq('user_id', userId);
}

async function readOne(supabase, userId) {
  return supabase
    .from('user_data_documents')
    .select('user_id,namespace,schema_version,revision,payload,updated_at')
    .eq('user_id', userId)
    .eq('namespace', namespace)
    .maybeSingle();
}

async function upsertMarker(supabase, userId, label) {
  return supabase.from('user_data_documents').upsert({
    user_id: userId,
    namespace,
    schema_version: 1,
    revision: Date.now(),
    payload: { rlsSmokeTest: label, updatedAt: new Date().toISOString() },
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id,namespace' });
}

async function restoreDocument(supabase, previous) {
  if (!previous) return;
  const { error } = await supabase.from('user_data_documents').upsert({
    user_id: previous.user_id,
    namespace: previous.namespace,
    schema_version: previous.schema_version,
    revision: previous.revision,
    payload: previous.payload,
    updated_at: previous.updated_at,
  }, { onConflict: 'user_id,namespace' });
  if (error) throw new Error(`Failed to restore previous document: ${error.message}`);
}

const anonymous = client();
const anonymousRead = await anonymous.from('user_data_documents').select('user_id,namespace').limit(1);
assert(anonymousRead.error, 'Unauthenticated user unexpectedly read private documents');

const userA = await signIn('User A', readEnv(['RLS_TEST_USER_A_EMAIL', 'TEST_A_EMAIL']), readEnv(['RLS_TEST_USER_A_PASSWORD', 'TEST_A_PASSWORD']));
const userB = await signIn('User B', readEnv(['RLS_TEST_USER_B_EMAIL', 'TEST_B_EMAIL']), readEnv(['RLS_TEST_USER_B_PASSWORD', 'TEST_B_PASSWORD']));

let previousB = null;
if (allowWrite) {
  const existingB = await readOne(userB.supabase, userB.user.id);
  if (existingB.error) throw new Error(`Could not read User B existing document: ${existingB.error.message}`);
  previousB = existingB.data;
  const marker = await upsertMarker(userB.supabase, userB.user.id, `b-${Date.now()}`);
  if (marker.error) throw new Error(`Could not write User B marker document: ${marker.error.message}`);
}

try {
  const ownA = await selectDocuments(userA.supabase, userA.user.id);
  assert(!ownA.error, `User A could not read own documents: ${ownA.error?.message}`);

  const crossAReadsB = await selectDocuments(userA.supabase, userB.user.id);
  assert(!crossAReadsB.error, `Cross-user select should be filtered, not fail unexpectedly: ${crossAReadsB.error?.message}`);
  assert.equal(crossAReadsB.data.length, 0, 'User A can read User B documents; RLS isolation failed');

  const ownB = await selectDocuments(userB.supabase, userB.user.id);
  assert(!ownB.error, `User B could not read own documents: ${ownB.error?.message}`);

  const crossBReadsA = await selectDocuments(userB.supabase, userA.user.id);
  assert(!crossBReadsA.error, `Cross-user select should be filtered, not fail unexpectedly: ${crossBReadsA.error?.message}`);
  assert.equal(crossBReadsA.data.length, 0, 'User B can read User A documents; RLS isolation failed');
} finally {
  if (allowWrite) await restoreDocument(userB.supabase, previousB);
  await userA.supabase.auth.signOut();
  await userB.supabase.auth.signOut();
}

console.log('RLS smoke test passed');
console.log(`Write mode: ${allowWrite ? 'enabled with restore attempt' : 'disabled; read-only isolation check only'}`);

function readEnv(keys) {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) return value;
  }
  return '';
}

function loadLocalEnv(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, 'utf8');
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const separator = line.indexOf('=');
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^["']|["']$/g, '');
    if (!process.env[key]) process.env[key] = value;
  }
}
