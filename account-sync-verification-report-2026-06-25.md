# Account Sync Verification Report - 2026-06-25

## Current Verification Update - 2026-06-26

This section supersedes the earlier "C" decision below where the older text refers to missing Supabase/RLS validation.

Current HEAD:

- `a47bf3c89d9018f3426c07bcbe44a6bcfd6190ef`

Current branch state:

- `main...origin/main [ahead 3]`
- After committing this verification update locally, this is expected to become `ahead 4`.
- Push performed in this verification pass: no.
- Deployment performed in this verification pass: no.

Real Supabase status:

- Project URL configured locally in ignored `.env.local`: yes.
- Publishable key configured locally in ignored `.env.local`: yes.
- Secret/service role key in frontend or repository: no.
- SQL migration `202606250001_account_sync.sql` manually executed in Supabase Dashboard SQL Editor: yes.
- Dashboard result observed: `Success. No rows returned`.

Real A/B RLS test:

- Test account A exists: `soldiersmini+testa@gmail.com`.
- Test account B exists: `soldiersmini+testb@gmail.com`.
- Test passwords are stored only in ignored `.env.rls.local`.
- RLS smoke test command: `RLS_SMOKE_WRITE=1 node scripts/rls-smoke-test.mjs`.
- Result: passed.
- Verified with normal publishable key and normal user sessions, not service role.
- User A can write and read its own `user_data_documents` row.
- User B can write and read its own `user_data_documents` row.
- User A cannot read User B documents.
- User B cannot read User A documents.
- User A cannot forge a write to User B's `user_id`.
- User B cannot forge a write to User A's `user_id`.
- Unauthenticated write is blocked.
- Unauthenticated read does not expose A/B documents.
- Temporary test rows are restored or removed after the test.

Local verification after real Supabase configuration:

| Command | Result | Notes |
|---|---:|---|
| `npm ci` | Passed | 1 low severity npm audit item remains; no automatic dependency change was made. |
| `npm run build` | Passed | Existing Vite chunk-size warning remains: main JS chunk is about 719.58 kB, above the configured 700 kB warning limit. |
| `npm test` | Passed | Existing test suite passed. |
| `node scripts/account-framework.test.mjs` | Passed | Account framework static checks passed. |
| `RLS_SMOKE_WRITE=1 node scripts/rls-smoke-test.mjs` | Passed | Real Supabase A/B RLS isolation passed. |
| `node scripts/cloud-sync-smoke-test.mjs` | Passed | Real Supabase sync logic smoke test passed. |
| `git diff --check` | Passed | Only LF/CRLF warning for `scripts/rls-smoke-test.mjs`; no whitespace error. |

Cloud sync smoke test:

- Added `scripts/cloud-sync-smoke-test.mjs`.
- Verified `LocalDataAdapter`, `CloudDataAdapter`, and `mergeDocuments`.
- Verified A/B cloud sync document isolation using normal user sessions.
- Verified empty cloud document lists do not clear local data.
- Verified missing cloud client/failure path does not mutate local data.
- Temporary cloud sync test documents are restored or removed after the test.

Cloud sync UI status:

- Logic-layer cloud sync smoke test: passed.
- Full AccountPage UI end-to-end sync acceptance: not complete.
- Reason: the current AccountPage displays sync status and data-management information, but it does not yet expose a complete user-facing upload/download/merge sync action flow to click through.

GitHub Pages workflow status:

- `push` trigger: removed.
- `pull_request` trigger: absent.
- `workflow_dispatch`: present.
- Current deployment risk from pushing `main`: reduced; this workflow no longer automatically deploys from `main`.
- Deployment still not allowed because production acceptance is incomplete.

Security scan update:

- No test passwords found in tracked project files.
- No previously pasted database password or secret key found in tracked project files.
- `.env.local` is ignored by Git.
- `.env.rls.local` is ignored by Git.
- Browser/client code still uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Service role references remain limited to documentation/tests and the Supabase Edge Function skeleton.

Remaining blockers:

- Real cloud sync logic has passed, but AccountPage UI sync workflow is not fully accepted end-to-end.
- Email verification callback has not been fully tested with a real email round trip.
- Password recovery callback has not been fully tested with a real email round trip.
- `delete-account` Edge Function has not been deployed or accepted.
- GitHub repository Variable/Secret values have not been configured for Actions.
- GitHub Pages workflow is manual-only after this update, but GitHub Actions Variables/Secrets and production callback behavior still need acceptance.

Current decision:

```text
B. 允许本地提交 / 可考虑非部署分支；不允许 push main；不允许部署
```

Operational caveat: the workflow has now been changed to manual-only deployment (`workflow_dispatch`) to prevent accidental GitHub Pages deployment from a `main` push. Even with that safety gate, do not push `main` until the user explicitly approves the next release step. Deployment remains blocked until cloud sync UI, GitHub Actions env vars, auth email flows, and production callback behavior are accepted.

## 0. Automation Attempt - 2026-06-26

Goal: move from account/sync framework to real Supabase acceptance as automatically as possible.

Automation completed:

- Re-ran local repository status checks.
- Re-ran `npm ci`, `npm run build`, `npm test`, and `node scripts/account-framework.test.mjs`.
- Re-ran `node scripts/rls-smoke-test.mjs`; it correctly refused to run without real Supabase/test-account environment values.
- Checked Supabase CLI availability:
  - Global `supabase` command: not installed.
  - `npx supabase --version`: available, version `2.108.0`.
  - `npx supabase projects list`: blocked because no access token is available.
  - `npx supabase login --no-browser`: blocked in non-TTY environment unless `--token` or `SUPABASE_ACCESS_TOKEN` is provided.
- Checked GitHub CLI availability:
  - `gh`: not installed.
  - `GH_TOKEN` / `GITHUB_TOKEN`: not present.
- Confirmed `.env.local` and `.env.rls.local` do not exist yet.
- Updated `scripts/rls-smoke-test.mjs` to read `.env.rls.local` and to accept both concise and long variable names.
- Updated `SUPABASE-SETUP.md` with `.env.rls.local` instructions.

Current automation blocker:

- No Supabase access token is available, so I cannot create/list/link a Supabase project, run hosted migrations, configure Auth URLs, create test accounts, deploy Edge Functions, or retrieve project keys.
- No GitHub CLI/token is available, so I cannot automatically set GitHub Actions Variables/Secrets.

Historical decision at that time, now superseded by the 2026-06-26 verification update above:

```text
C. 不允许 push，不允许部署
```

Reason: no real Supabase project, no real A/B account isolation test, no real RLS test, no real cloud sync acceptance, and no GitHub Actions secret configuration have been completed.

## 1. Current Commit and Branch

- Current HEAD: `4c6d77469715acc24d920c706b253987c15e7011`
- Account framework commit present in history: `6d8ff935984c6d67af2643c2e4b971bd906ac468`
- Branch: `main`
- Branch status at audit time: `main...origin/main [ahead 2]`
- Working tree after this audit: `SUPABASE-SETUP.md` modified, `account-sync-verification-report-2026-06-25.md` and `scripts/rls-smoke-test.mjs` untracked until the user decides whether to commit.
- Production GitHub Pages status: not updated by this audit.
- Push/deploy performed: no.

Note: the user-stated status said `ahead 1`; actual local state is `ahead 2` because a later local commit, `4c6d774 Improve vocabulary training prompt quality`, exists after the account framework commit.

## 2. Local Command Results

| Command | Result | Notes |
|---|---:|---|
| `git status --short --branch` | Passed | Current branch is `main`, ahead 2. |
| `git log --oneline -5` | Passed | Shows `4c6d774`, `6d8ff93`, `e4fc22e`, `c7d7c72`, `5332d14`. |
| `npm ci` | Passed | Reported 1 low severity dependency audit item. No `npm audit fix` was run. |
| `npm run build` | Passed | Vite production build completed. |
| `npm test` | Passed | All current test scripts passed. |
| `node scripts/account-framework.test.mjs` | Passed | Account framework static checks passed. |

## 3. Required Account Framework Files

All required files exist:

- `SUPABASE-SETUP.md`
- `account-framework-report-2026-06-25.md`
- `src/auth/AuthProvider.tsx`
- `src/lib/supabase/client.ts`
- `src/pages/account/AccountPage.tsx`
- `src/sync/SyncCoordinator.ts`
- `supabase/migrations/202606250001_account_sync.sql`
- `supabase/functions/delete-account/index.ts`

## 4. What the Account System Currently Does

- Provides a Supabase browser client factory guarded by missing-config fallback.
- Uses only `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Configures Supabase Auth with PKCE.
- Provides login, registration, password recovery, email verification notice, profile, sync status, and delete-account notice pages.
- Keeps the site in guest/local-only mode when Supabase variables are absent.
- Exchanges `?auth=callback&code=...` on startup and removes callback query parameters after exchange.

## 5. What the Cloud Sync System Currently Does

- Defines local data namespaces for settings, training preferences, learning progress, mistakes, test history, and Neural state.
- Reads owned localStorage keys through `LocalDataAdapter`.
- Reads/upserts `user_data_documents` through `CloudDataAdapter`.
- Provides `upload-local`, `download-cloud`, and `merge` operations through `SyncCoordinator`.
- Uses merge-by-namespace with object payload merge.

Current limitation: this is a framework and has not been validated against a real Supabase project. It does not yet prove safe production migration behavior for real user accounts.

## 6. Security Check Results

| Check | Result | Evidence |
|---|---:|---|
| Browser code contains no service role key | Passed | `service_role` appears only in docs/tests and `supabase/functions/delete-account/index.ts`. |
| Browser code contains no secret key | Passed | No real secret values found. |
| Frontend env vars are restricted to public Vite vars | Passed | Client uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. |
| `.env.local` ignored | Passed | `.gitignore` includes `.env.local` and `.env.*.local`. |
| `.env.example` has no real key | Passed | Contains blank placeholders only. |
| GitHub Actions does not hardcode keys | Passed | Reads GitHub Variables/Secrets only. |
| No service role Vite variable | Passed | No `VITE_SUPABASE_SERVICE_ROLE` or equivalent found. |
| Frontend does not bypass RLS | Passed statically | No admin client in browser; real RLS must still be tested. |
| No `localStorage.clear()` | Passed | Only documentation/test assertions mention the forbidden string. |
| No private-data `USING (true)` or `WITH CHECK (true)` | Passed | Migration uses `auth.uid() = user_id`. |

Important caveat: static checks do not prove Supabase RLS behavior. Real project testing is still required.

## 7. Environment Variable Status

`.env.example`:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

No real Supabase URL or key is present in the repository. Without real variables, the app must remain in guest/local-only mode and must not claim cloud sync is available.

Manual values required from Supabase Dashboard:

1. Project URL.
2. Publishable key / anon public key.
3. Auth Site URL and Redirect URLs.
4. SQL Editor access for running migration.
5. Edge Function deployment/secrets area, only if delete-account is enabled.
6. GitHub repository Variables/Secrets area.

## 8. Auth Redirect URL Checklist

Current callback function:

- `getAuthCallbackUrl()` builds `${origin}${BASE_URL}/?auth=callback`.
- Supabase callback exchange runs when `auth=callback` or `code` is present.
- Missing code produces a friendly auth message.
- Supabase errors are mapped through `humanizeAuthError`.

Required Supabase Auth URLs:

Local:

- `http://localhost:5173/`
- `http://localhost:5173/?auth=callback`
- `http://127.0.0.1:5173/`
- `http://127.0.0.1:5173/?auth=callback`

Production:

- `https://soldiersmini-blip.github.io/spanish-learning-center/`
- `https://soldiersmini-blip.github.io/spanish-learning-center/?auth=callback`

Cannot be honestly validated locally without a real Supabase project:

- Email verification link round trip.
- Password recovery email round trip.
- Expired/invalid token behavior from real Supabase links.
- GitHub Pages callback behavior with real deployed env vars.

## 9. Migration and RLS Review

Migration reviewed: `supabase/migrations/202606250001_account_sync.sql`

| Requirement | Result |
|---|---:|
| `profiles` references `auth.users(id)` | Passed |
| `user_data_documents` has `user_id` | Passed |
| RLS enabled on both private tables | Passed |
| Policies use `auth.uid() = user_id` | Passed |
| Insert/update use `WITH CHECK (auth.uid() = user_id)` | Passed |
| Unauthenticated role has no explicit read/write policy | Passed |
| No `USING (true)` for private data | Passed |
| `updated_at` exists | Passed |
| Update triggers exist | Passed |
| Unique constraint prevents duplicate user namespace documents | Passed: primary key `(user_id, namespace)` |
| Necessary index | Acceptable: primary key covers `(user_id, namespace)` |

No SQL security patch is required before first real execution. If this migration has already been run in a real Supabase project, future schema changes should be added as new patch migrations instead of silently editing this file.

## 10. Real Two-Account Acceptance Plan

Use:

- Account A: `test-a@example.com`
- Account B: `test-b@example.com`

Required manual flow:

1. No Supabase config:
   - Site enters guest mode.
   - Local learning records save normally.
   - UI does not claim cloud sync is enabled.
   - No blank screen.
2. Configure Supabase:
   - Register Account A.
   - Verify Account A email.
   - Log in as Account A.
   - Write A learning progress.
   - Write A wrong words.
   - Write A training records.
   - Write A training mode preferences.
   - Write A Neural state.
   - Log out Account A.
3. Register/log in Account B:
   - B must not see A data.
   - B writes own progress, wrong words, and training records.
   - Log out Account B.
4. Log in Account A again:
   - A sees only A data.
   - A does not see B data.
   - Local/cloud merge result is correct.
5. Log in Account B again:
   - B sees only B data.
   - B does not see A data.
6. Unauthenticated:
   - Cannot read `user_data_documents`.
   - Cannot write `user_data_documents`.
   - Cannot read private profile rows for other users.

Result in this audit: not executed. No real Supabase project or test accounts were available.

## 11. RLS Smoke Test Script

Added:

```text
scripts/rls-smoke-test.mjs
```

Properties:

- Reads Supabase URL/key and test account credentials from environment variables.
- Does not commit or hardcode passwords.
- Uses only the publishable key and normal user sessions.
- Does not use service role.
- Verifies unauthenticated reads are blocked.
- Verifies User A cannot read User B rows and User B cannot read User A rows.
- Default mode is read-only.
- Optional `RLS_SMOKE_WRITE=1` writes a marker to `recent_learning` and attempts to restore the previous document.

Not run successfully in this audit because real Supabase env vars and test accounts are not available.

## 12. Sync System Acceptance Review

| Requirement | Current Status |
|---|---|
| Local data is not deleted on cloud read failure | Passed structurally: `downloadCloud` returns error before local write. |
| Cloud empty should not silently erase local data | Needs real flow work: current `downloadCloud` writes cloud docs when selected; user choice UI is still framework-level. |
| First login should prompt or safely merge | Partially implemented as framework concept; not production-validated. |
| Network failure keeps local data | Passed structurally; sync state UI is basic. |
| Conflict strategy explicit | Partially implemented: namespace merge exists; user-facing conflict flow not fully validated. |
| Different users do not mix cloud data | Passed at RLS and cloud sync logic layer; full UI session switching still needs end-to-end acceptance. |
| Local cache user boundary | Partially accepted: sync payload is isolated by user in cloud, but browser localStorage keys are still device/site-scoped. This needs explicit UI migration UX before production sync. |
| No passwords/tokens in sync payload | Passed statically: registry includes learning/settings keys only. |
| Sync failure UI | Basic status exists; detailed error UX not fully validated. |

Conclusion: sync framework and real cloud sync logic smoke test have passed, but the AccountPage UI sync workflow is not yet production-accepted end to end.

## 13. Delete Account Edge Function Review

File: `supabase/functions/delete-account/index.ts`

Status:

- Edge Function skeleton exists.
- Requires `Authorization` header.
- Uses service role only from Edge Function environment variable.
- Calls `auth.getUser()` to identify current user.
- Deletes only current user data by `user_id`.
- Requires confirmation text: `DELETE MY SPANISH LEARNING ACCOUNT`.

Not production-ready until:

- Function is deployed to Supabase.
- Function secrets are configured.
- Browser UI is wired to call it.
- Real failure/success behavior is tested.
- Export-before-delete UX is finalized.

Current UI correctly presents deletion as requiring an Edge Function; it does not claim deletion is active.

## 14. GitHub Pages and Actions Review

Workflow: `.github/workflows/deploy.yml`

| Check | Result |
|---|---:|
| Reads `VITE_SUPABASE_URL` | Passed: GitHub Variable. |
| Reads `VITE_SUPABASE_PUBLISHABLE_KEY` | Passed: GitHub Secret. |
| Injects Vite env vars during build | Passed. |
| Builds without variables | Passed locally; app falls back to missing config. |
| GitHub Pages base path | Passed: `vite.config.ts` base is `/spanish-learning-center/`. |
| Callback under subpath | Passed structurally: `getAuthCallbackUrl()` uses `BASE_URL`. |
| Workflow does not print key | Passed. |
| No real key in repo | Passed. |

GitHub manual entries required:

- Repository Variable: `VITE_SUPABASE_URL`
- Repository Secret: `VITE_SUPABASE_PUBLISHABLE_KEY`

## 15. Passed Items

- Local dependency install.
- Production build.
- Full existing automated test suite.
- Account framework static test.
- Required files present.
- `.env.example` safe.
- `.env.local` ignored.
- Browser-side service role absence.
- RLS migration static review.
- GitHub Actions env injection static review.
- Guest/local-only fallback structure.

## 16. Failed Items

No local command failed.

Blocking validation failures by absence of environment:

- No real Supabase project configured.
- No real email verification tested.
- No real password recovery tested.
- No real two-account RLS test executed.
- No real cloud sync migration executed.
- No real Edge Function deployment/test executed.
- No real GitHub Pages deployment with Supabase env vars executed.

## 17. Untested Items

- Supabase Dashboard Auth settings.
- SMTP/email delivery.
- CAPTCHA or anti-abuse settings.
- Production callback URL behavior.
- Account A/B data isolation in live database.
- Offline/network failure behavior against live Supabase.
- Cloud/local conflict resolution with real user data.
- Delete account Edge Function in Supabase runtime.

## 18. Push / Deployment Decision

Conclusion:

```text
B. 允许本地提交 / 可考虑非部署分支；不允许 push main；不允许部署
```

Reason:

The real Supabase project is connected locally, the migration has been executed, and real A/B RLS isolation has passed. Deployment is still blocked because real cloud sync UI acceptance, GitHub Actions environment configuration, production auth callback behavior, email verification, password recovery, and delete-account Edge Function acceptance are not complete.

Important operational caveat: the GitHub Pages workflow has been changed to manual-only deployment (`workflow_dispatch`) to reduce accidental deployment risk. Do not push `main` or deploy until the user explicitly approves the next release step.

## 19. Next Minimum Manual Steps

1. Configure Supabase Auth URLs:
   - `http://localhost:5173/`
   - `http://localhost:5173/?auth=callback`
   - `http://127.0.0.1:5173/`
   - `http://127.0.0.1:5173/?auth=callback`
   - `https://soldiersmini-blip.github.io/spanish-learning-center/`
   - `https://soldiersmini-blip.github.io/spanish-learning-center/?auth=callback`
2. Configure GitHub repository Variable/Secret:
   - Variable: `VITE_SUPABASE_URL`
   - Secret: `VITE_SUPABASE_PUBLISHABLE_KEY`
3. Validate the real application login, logout, and account page against Supabase.
4. Perform real cloud sync UI acceptance for A/B accounts.
5. Test email verification callback with a real email round trip.
6. Test password recovery callback with a real email round trip.
7. Keep `delete-account` hidden/unavailable unless the Edge Function is deployed and accepted.
8. Decide whether account sync UX needs stronger per-account localStorage isolation before deployment.
9. Only after all live checks pass, decide whether deployment to GitHub Pages is allowed.
