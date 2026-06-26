import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as esbuild from 'esbuild';
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
const namespaces = ['settings', 'training_preferences', 'learning_progress', 'mistakes', 'test_history', 'neural_state'];

const { CloudDataAdapter, LocalDataAdapter, mergeDocuments } = await loadSyncModules();

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

async function readAllOwned(supabase, userId) {
  const { data, error } = await supabase
    .from('user_data_documents')
    .select('namespace,schema_version,revision,payload,updated_at')
    .eq('user_id', userId);
  if (error) throw new Error(`Could not read existing cloud documents: ${error.message}`);
  return data || [];
}

async function restoreOwned(supabase, userId, previousRows) {
  const { error: deleteError } = await supabase
    .from('user_data_documents')
    .delete()
    .eq('user_id', userId)
    .in('namespace', namespaces);
  if (deleteError) throw new Error(`Could not clean temporary cloud documents: ${deleteError.message}`);
  if (!previousRows.length) return;
  const { error: restoreError } = await supabase.from('user_data_documents').upsert(
    previousRows.map((row) => ({
      user_id: userId,
      namespace: row.namespace,
      schema_version: row.schema_version,
      revision: row.revision,
      payload: row.payload,
      updated_at: row.updated_at,
    })),
    { onConflict: 'user_id,namespace' },
  );
  if (restoreError) throw new Error(`Could not restore previous cloud documents: ${restoreError.message}`);
}

function createStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return {
    get length() {
      return data.size;
    },
    key(index) {
      return Array.from(data.keys())[index] ?? null;
    },
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(String(key), String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      throw new Error('localStorage.clear() must not be used by sync smoke tests');
    },
    snapshot() {
      return Object.fromEntries(data.entries());
    },
  };
}

function seedLocalStorage(label) {
  const stamp = new Date().toISOString();
  const storage = createStorage({
    'spanish-locale': label === 'A' ? 'zh' : 'en',
    'spanish-theme': label === 'A' ? 'dark' : 'light',
    'spanish-learning-center:training-mode-preferences:v1': JSON.stringify({ version: 1, selectedModes: ['word-recognition'], updatedAt: stamp, owner: label }),
    [`spanish-progress-${label.toLowerCase()}`]: JSON.stringify([`progress-${label}`]),
    [`spanish-vocab-training-wrong-${label}`]: JSON.stringify([`wrong-${label}`]),
    [`spanish-vocab-test-records-${label}`]: JSON.stringify([{ id: `record-${label}`, accuracy: label === 'A' ? 0.9 : 0.8 }]),
    'spanish-neural-learning-progress': JSON.stringify({ owner: label, visitedNodeIds: [`node-${label}`], updatedAt: stamp }),
    'unrelated-app-key': 'must-not-sync',
  });
  globalThis.localStorage = storage;
  return storage;
}

function expectPayloadContains(document, key, value) {
  assert(document, `Missing document for key ${key}`);
  assert.equal(document.payload?.[key], value, `Cloud payload for ${key} did not match expected value`);
}

const userA = await signIn('User A', readEnv(['RLS_TEST_USER_A_EMAIL', 'TEST_A_EMAIL']), readEnv(['RLS_TEST_USER_A_PASSWORD', 'TEST_A_PASSWORD']));
const userB = await signIn('User B', readEnv(['RLS_TEST_USER_B_EMAIL', 'TEST_B_EMAIL']), readEnv(['RLS_TEST_USER_B_PASSWORD', 'TEST_B_PASSWORD']));

const previousA = await readAllOwned(userA.supabase, userA.user.id);
const previousB = await readAllOwned(userB.supabase, userB.user.id);

try {
  const adapterA = new CloudDataAdapter(userA.supabase);
  const adapterB = new CloudDataAdapter(userB.supabase);

  const storageA = seedLocalStorage('A');
  const localA = new LocalDataAdapter();
  const docsA = localA.readDocuments();
  assert(docsA.some((doc) => doc.namespace === 'learning_progress'), 'LocalDataAdapter did not create learning progress document');
  assert(!JSON.stringify(docsA).includes('unrelated-app-key'), 'LocalDataAdapter included an unrelated localStorage key');
  const uploadA = await adapterA.upsertDocuments(userA.user.id, docsA);
  assert(!uploadA.error, `A upload failed: ${uploadA.error}`);

  const cloudA = await adapterA.readDocuments(userA.user.id);
  assert(!cloudA.error && cloudA.data, `A cloud read failed: ${cloudA.error}`);
  expectPayloadContains(cloudA.data.find((doc) => doc.namespace === 'settings'), 'spanish-locale', 'zh');

  const storageB = seedLocalStorage('B');
  const localB = new LocalDataAdapter();
  const docsB = localB.readDocuments();
  const uploadB = await adapterB.upsertDocuments(userB.user.id, docsB);
  assert(!uploadB.error, `B upload failed: ${uploadB.error}`);

  const bReadsA = await adapterB.readDocuments(userA.user.id);
  assert(!bReadsA.error && bReadsA.data?.length === 0, 'B unexpectedly read A cloud sync documents');

  const aReadsB = await adapterA.readDocuments(userB.user.id);
  assert(!aReadsB.error && aReadsB.data?.length === 0, 'A unexpectedly read B cloud sync documents');

  const cloudOnlyA = [{
    namespace: 'learning_progress',
    schemaVersion: 1,
    revision: 10,
    updatedAt: new Date().toISOString(),
    payload: { 'spanish-progress-cloud-only': 'keep-cloud' },
  }];
  const localOnlyA = [{
    namespace: 'learning_progress',
    schemaVersion: 1,
    revision: 11,
    updatedAt: new Date().toISOString(),
    payload: { 'spanish-progress-local-only': 'keep-local' },
  }];
  const merged = mergeDocuments(localOnlyA, cloudOnlyA);
  assert.equal(merged.length, 1, 'Merge should keep one document per namespace');
  assert.equal(merged[0].payload['spanish-progress-cloud-only'], 'keep-cloud', 'Merge dropped cloud payload');
  assert.equal(merged[0].payload['spanish-progress-local-only'], 'keep-local', 'Merge dropped local payload');

  const beforeEmptyDownload = { ...storageA.snapshot() };
  localA.writeDocuments([]);
  assert.deepEqual(storageA.snapshot(), beforeEmptyDownload, 'Writing empty cloud documents should not clear local data');

  const beforeFailedCloud = { ...storageB.snapshot() };
  const failedCloud = new CloudDataAdapter(null);
  const failedRead = await failedCloud.readDocuments(userB.user.id);
  assert(failedRead.error, 'Missing cloud client should report an error');
  assert.deepEqual(storageB.snapshot(), beforeFailedCloud, 'Cloud failure should not mutate local data');
} finally {
  await restoreOwned(userA.supabase, userA.user.id, previousA);
  await restoreOwned(userB.supabase, userB.user.id, previousB);
  await userA.supabase.auth.signOut();
  await userB.supabase.auth.signOut();
}

console.log('cloud-sync smoke test passed');
console.log('Verified LocalDataAdapter, CloudDataAdapter, mergeDocuments, A/B isolation, empty-cloud safety, and cloud-failure local preservation');

async function loadSyncModules() {
  const __dirname = dirname(fileURLToPath(import.meta.url));
  const projectRoot = join(__dirname, '..');
  const outDir = join(projectRoot, 'node_modules', '.tmp', 'cloud-sync-smoke-test');
  const entryPath = join(outDir, 'entry.ts');
  const bundlePath = join(outDir, 'bundle.mjs');

  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    entryPath,
    [
      "export { CloudDataAdapter } from '../../../src/sync/CloudDataAdapter';",
      "export { LocalDataAdapter } from '../../../src/sync/LocalDataAdapter';",
      "export { mergeDocuments } from '../../../src/sync/merge';",
    ].join('\n'),
    'utf8',
  );

  await esbuild.build({
    entryPoints: [entryPath],
    outfile: bundlePath,
    bundle: true,
    format: 'esm',
    platform: 'node',
    logLevel: 'silent',
  });

  return import(pathToFileURL(bundlePath).href);
}

function readEnv(keys) {
  for (const envKey of keys) {
    const value = process.env[envKey]?.trim();
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
