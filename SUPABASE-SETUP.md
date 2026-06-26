# Supabase Setup

This project is prepared for Supabase Auth and Supabase Postgres sync, but it is not connected until you create a Supabase project and provide environment variables.

## 1. Create Project

1. Create a Supabase project.
2. Keep the project URL and publishable anon key.
3. Do not put the service role key in browser code.

## 2. Auth Settings

Enable email/password authentication.

Recommended URLs:

- Site URL: `https://soldiersmini-blip.github.io/spanish-learning-center/`
- Production redirect URL: `https://soldiersmini-blip.github.io/spanish-learning-center/?auth=callback`
- Production root URL: `https://soldiersmini-blip.github.io/spanish-learning-center/`
- Local redirect URL: `http://127.0.0.1:5173/?auth=callback`
- Local root URL: `http://127.0.0.1:5173/`
- Optional local redirect URL: `http://localhost:5173/?auth=callback`
- Optional local root URL: `http://localhost:5173/`

The app uses PKCE and exchanges the `code` parameter on startup. It then removes auth query parameters and routes back into the hash app.

## 3. Environment Variables

Local development:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

Put real values in `.env.local`. This file is ignored by Git.

GitHub Pages build:

- Repository Variable: `VITE_SUPABASE_URL`
- Repository Secret: `VITE_SUPABASE_PUBLISHABLE_KEY`

Only the publishable key may be used by the frontend.

## 4. Database Migration

Run:

```sql
supabase/migrations/202606250001_account_sync.sql
```

Tables:

- `profiles`
- `user_data_documents`

Both tables enable Row Level Security. Policies restrict access to `auth.uid() = user_id` for the `authenticated` role.

## 5. RLS Isolation Test

Create two test users, User A and User B.

1. Sign in as User A and insert one `user_data_documents` row with `user_id = auth.uid()`.
2. Verify User A can read and update that row.
3. Verify User A cannot read, update, or delete User B rows.
4. Verify unauthenticated requests cannot read private rows.
5. Repeat from User B.

Do not use `USING (true)` or `WITH CHECK (true)` for private user data.

Optional smoke script after creating the real Supabase project:

```powershell
node scripts/rls-smoke-test.mjs
```

The script can read values from a local ignored file named `.env.rls.local`:

```text
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
TEST_A_EMAIL=test-a@example.com
TEST_A_PASSWORD=...
TEST_B_EMAIL=test-b@example.com
TEST_B_PASSWORD=...
```

The script also accepts the longer names `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `RLS_TEST_USER_A_EMAIL`, `RLS_TEST_USER_A_PASSWORD`, `RLS_TEST_USER_B_EMAIL`, and `RLS_TEST_USER_B_PASSWORD`.

The script uses only the publishable key and normal user sessions. It does not use the service role key. By default it does not write test data. To run a stronger write-and-restore check, set:

```powershell
$env:RLS_SMOKE_WRITE="1"
```

Do not run write mode against important production accounts unless you have exported a backup first.

## 6. Email and Anti-Abuse

Before production use:

- Configure custom SMTP.
- Review Supabase email templates.
- Enable CAPTCHA if needed through Supabase Auth settings.
- Keep CAPTCHA provider keys out of frontend code unless they are public site keys.

## 7. Delete Account Function

Skeleton:

```text
supabase/functions/delete-account/index.ts
```

Deploy only after setting Supabase function secrets:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

The browser must call the function with the current user session. It must not submit arbitrary `user_id` values.

## 8. Current Status

At this stage the app has the account and sync framework. Without real Supabase environment variables, guest mode remains active and cloud account actions show a clear configuration warning.
