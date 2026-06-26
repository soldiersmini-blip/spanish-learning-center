# Account Sync Verification Report - 2026-06-25

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

Current decision remains:

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
| Different users do not mix cloud data | Depends on RLS and real session tests; not proven locally. |
| Local cache user boundary | Not complete: localStorage keys are currently device/site-scoped, not per-account scoped. This needs explicit migration UX before production sync. |
| No passwords/tokens in sync payload | Passed statically: registry includes learning/settings keys only. |
| Sync failure UI | Basic status exists; detailed error UX not fully validated. |

Conclusion: sync framework exists, but real cloud sync is not yet production-accepted.

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
C. 不允许 push，不允许部署
```

Reason:

No real Supabase project, no real test accounts, no RLS isolation test, and no live sync acceptance have been completed. Account/cloud sync is user data security work, so framework completion is not enough for public deployment.

## 19. Next Minimum Manual Steps

1. Create a Supabase project.
2. Enable email/password Auth.
3. Add Auth URLs:
   - `http://localhost:5173/`
   - `http://localhost:5173/?auth=callback`
   - `http://127.0.0.1:5173/`
   - `http://127.0.0.1:5173/?auth=callback`
   - `https://soldiersmini-blip.github.io/spanish-learning-center/`
   - `https://soldiersmini-blip.github.io/spanish-learning-center/?auth=callback`
4. Run `supabase/migrations/202606250001_account_sync.sql` in Supabase SQL Editor.
5. Create test users A and B.
6. Run manual two-account acceptance.
7. Run `scripts/rls-smoke-test.mjs` with env vars.
8. Decide whether account sync UX needs stronger per-account localStorage isolation before deployment.
9. Only after all live checks pass, decide whether a controlled push/deploy is allowed.
