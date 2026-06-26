import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

const client = readFileSync(join(root, 'src/lib/supabase/client.ts'), 'utf8');
const auth = readFileSync(join(root, 'src/lib/supabase/auth.ts'), 'utf8');
const provider = readFileSync(join(root, 'src/auth/AuthProvider.tsx'), 'utf8');
const routes = readFileSync(join(root, 'src/navigation/routes.ts'), 'utf8');
const migration = readFileSync(join(root, 'supabase/migrations/202606250001_account_sync.sql'), 'utf8');
const workflow = readFileSync(join(root, '.github/workflows/deploy.yml'), 'utf8');
const registry = readFileSync(join(root, 'src/sync/localDataRegistry.ts'), 'utf8');

assert(client.includes('VITE_SUPABASE_URL'), 'Supabase URL must come from Vite env');
assert(client.includes('VITE_SUPABASE_PUBLISHABLE_KEY'), 'Supabase publishable key must come from Vite env');
assert(client.includes("flowType: 'pkce'"), 'Supabase auth must use PKCE');
assert(client.includes('supabaseConfigStatus'), 'Client must expose missing/configured status');
assert(!/service_role|SERVICE_ROLE|SUPABASE_SERVICE_ROLE_KEY/.test(client), 'Browser client must not contain service role configuration');

assert(auth.includes('exchangeCodeForSession'), 'Auth callback must exchange code for session');
assert(auth.includes('resetPasswordForEmail'), 'Password reset must be wired');
assert(provider.includes('onAuthStateChange'), 'Auth provider must listen for auth state changes');

for (const id of ['account-login', 'account-register', 'account-verify-email', 'account-password-recovery', 'account-sync', 'account-delete']) {
  assert(routes.includes(`id: '${id}'`), `${id} route must be declared`);
  assert(routes.includes(`parentRouteId: 'account'`), 'Account child pages must return to account parent');
}

assert(migration.includes('alter table public.profiles enable row level security'), 'profiles RLS must be enabled');
assert(migration.includes('alter table public.user_data_documents enable row level security'), 'user_data_documents RLS must be enabled');
assert(migration.includes('auth.uid() = user_id'), 'RLS policies must isolate by auth.uid() = user_id');
assert(!/USING\s*\(\s*true\s*\)|WITH CHECK\s*\(\s*true\s*\)/i.test(migration), 'Private user data policies must not use true-only rules');

assert(workflow.includes('VITE_SUPABASE_URL'), 'GitHub Actions must pass Supabase URL env');
assert(workflow.includes('VITE_SUPABASE_PUBLISHABLE_KEY'), 'GitHub Actions must pass Supabase publishable key env');
assert(workflow.includes('workflow_dispatch:'), 'GitHub Pages deployment must keep a manual dispatch trigger');
assert(!/push:\s*\n\s*branches:\s*\[\s*main\s*\]/.test(workflow), 'GitHub Pages deployment must not auto-deploy on main push before account sync acceptance is complete');
assert(registry.includes('spanish-progress-a1 / spanish-progress-a2'), 'Local data registry must audit learning progress keys');
assert(registry.includes('spanish-neural-learning-progress'), 'Local data registry must audit Neural progress key');

console.log('account-framework tests passed');
