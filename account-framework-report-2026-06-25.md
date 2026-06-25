# Account and Cloud Sync Framework Report - 2026-06-25

## 1. 技术方案

- Frontend: React + Vite
- Hosting target: GitHub Pages, `https://soldiersmini-blip.github.io/spanish-learning-center/`
- Auth provider: Supabase Auth, email/password, PKCE
- User data store: Supabase Postgres
- Data authorization: Supabase Row Level Security
- Default mode when not configured: guest/local-only mode

No real Supabase project or real environment variables were provided in this phase, so the account framework is present but not live-connected.

## 2. Existing Local Data Audit

The audit only covers storage keys owned by this website. It does not copy full browser storage.

| 数据类别 | 当前键名 | 数据结构 | 是否属于游客数据 | 是否需要云同步 | 合并策略 |
|---|---|---|---|---|---|
| 界面语言 | `spanish-locale` | `zh | en | es` string | 是 | 默认否 | 保留当前设备设置，用户可手动覆盖。 |
| 深色模式 | `spanish-theme` | `light | dark` string | 是 | 默认否 | 保留当前设备设置，用户可手动覆盖。 |
| 学习进度 | `spanish-progress-a1`, `spanish-progress-a2` | completed module id array | 是 | 是 | 按模块 id 取并集，保留较新 revision。 |
| 词汇测试记录 | `spanish-vocab-test-records-A1`, `spanish-vocab-test-records-A2` | `VocabTestRecord[]` | 是 | 是 | 按唯一记录 id/session id 去重合并。 |
| 错题 | `spanish-vocab-training-wrong-A1`, `spanish-vocab-training-wrong-A2` | word id array | 是 | 是 | 按词条 id 取并集，未来可扩展错误次数。 |
| 训练模式设置 | `spanish-learning-center:training-mode-preferences:v1` | `{ version, selectedModes, updatedAt }` | 是 | 是 | 用户确认后选择本机或云端版本。 |
| Neural 学习状态 | `spanish-neural-learning-progress` | visited/completed node ids and updatedAt | 是 | 是 | 按稳定节点 id 合并，保留较新 updatedAt。 |
| Neural 返回上下文 | `sessionStorage: spanish-neural-return-url` | temporary URL | 否 | 否 | 会话级，不迁移。 |
| 训练草稿 | `sessionStorage: spanish-vocab-training-draft-A1/A2` | in-progress draft | 否 | 否 | 会话级，不迁移。 |

No IndexedDB or Cache Storage usage was found in the current source scan.

## 3. Database Structure

Migration file:

```text
supabase/migrations/202606250001_account_sync.sql
```

Tables:

- `profiles`
  - `user_id`
  - `display_name`
  - `preferred_language`
  - `created_at`
  - `updated_at`
- `user_data_documents`
  - `user_id`
  - `namespace`
  - `schema_version`
  - `revision`
  - `payload`
  - `updated_at`

Namespaces planned:

- `settings`
- `training_preferences`
- `learning_progress`
- `mistakes`
- `favorites`
- `test_history`
- `recent_learning`
- `neural_state`

Static vocabulary, lesson source data, and assets are not duplicated per user.

## 4. RLS Policies

Both private tables enable RLS.

All policies use:

```sql
auth.uid() = user_id
```

Policies are scoped to the `authenticated` role for select, insert, update, and delete. The migration does not use `USING (true)` or `WITH CHECK (true)` for private user data.

## 5. Account Pages and Routes

Route metadata was added for:

- `#/account`
- `#/account/login`
- `#/account/register`
- `#/account/verify-email`
- `#/account/password-recovery`
- `#/account/sync`
- `#/account/delete`

All account child pages have `#/account` as their direct parent and use the existing `PageHeader` navigation rule.

## 6. Auth Callback Handling

Callback URLs to configure:

- Production: `https://soldiersmini-blip.github.io/spanish-learning-center/?auth=callback`
- Local: `http://127.0.0.1:5173/?auth=callback`
- Optional local: `http://localhost:5173/?auth=callback`

Startup behavior:

1. Detect `?auth=callback` and `code`.
2. Exchange code with Supabase using PKCE.
3. Remove auth query parameters.
4. Route back into the hash app.
5. Avoid infinite redirects.

## 7. Local and Cloud Sync Rules

Framework files:

- `src/sync/LocalDataAdapter.ts`
- `src/sync/CloudDataAdapter.ts`
- `src/sync/SyncCoordinator.ts`
- `src/sync/merge.ts`
- `src/sync/localDataRegistry.ts`

Sync states planned:

- local-only
- syncing
- synced
- pending-upload
- offline
- failed
- conflict

The first version keeps local data as the offline cache and treats Supabase as the cloud sync layer after login.

## 8. Conflict Handling

First-login migration must ask before changing either side:

- local data exists, cloud empty: upload local / skip / export backup
- local empty, cloud exists: download cloud / skip
- both exist: merge / use local / use cloud / export both / cancel

Before migration, generate a local JSON backup. This framework does not silently overwrite local or cloud data.

## 9. Account Deletion Plan

Browser code does not contain admin credentials and cannot delete auth users directly.

Edge Function skeleton:

```text
supabase/functions/delete-account/index.ts
```

It verifies the current session, requires confirmation text, deletes/anonymizes the current user's data, and deletes only the current authenticated user.

## 10. Environment Variables

`.env.example` contains blank placeholders:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_PUBLISHABLE_KEY=
```

`.env.local` is ignored by Git.

GitHub Actions reads:

- Repository Variable: `VITE_SUPABASE_URL`
- Repository Secret: `VITE_SUPABASE_PUBLISHABLE_KEY`

## 11. Manual Supabase Console Steps

See `SUPABASE-SETUP.md`.

Required:

1. Create Supabase project.
2. Enable email/password auth.
3. Configure Site URL and Redirect URLs.
4. Configure email templates.
5. Configure custom SMTP before production use.
6. Configure CAPTCHA if needed.
7. Run SQL migration.
8. Deploy delete-account Edge Function if account deletion is enabled.
9. Add GitHub repository variable/secret for build.

## 12. Test Results

Automated tests added:

- `scripts/account-framework.test.mjs`

Current passing checks:

- Supabase env names exist.
- Browser client does not contain service role configuration.
- PKCE is configured.
- Auth callback exchange exists.
- Account routes declare parents.
- RLS migration enables RLS and uses `auth.uid() = user_id`.
- GitHub Actions passes Supabase build env variables.
- Local data registry includes learning progress and Neural progress keys.

Verification run on 2026-06-25:

- `npm ci`: passed.
- `npm run build`: passed.
- `npm test`: passed.
- Security scan: no `localStorage.clear()` in application code.
- Security scan: no browser-side service role configuration. The only service role reference is inside `supabase/functions/delete-account/index.ts`, which is an Edge Function skeleton and must be deployed with Supabase function secrets only.

## 13. Actual Supabase Connection

Not connected yet. No real Supabase project URL or publishable key was provided.

## 14. Production Deployment

Not deployed in this phase. The account framework is default-safe, but real Supabase validation has not been completed.

## 15. Release Commit SHA

Pending. This report was generated before final commit.
