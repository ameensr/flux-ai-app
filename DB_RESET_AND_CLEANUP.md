# Database Reset & Cleanup Guide (Qaly / Supabase)

This guide covers three common operations against this project's Supabase Postgres database:

1. **Delete all application data** (nuclear wipe of `public` data)
2. **Make the DB new** (fresh schema on a new or emptied project)
3. **Delete all data but keep Authentication** (users can still log in)

> **Warning:** All wipe operations are destructive. Take a backup (Dashboard → Database → Backups, or `pg_dump`) before running anything in production.

---

## Mental model

| Layer | Schema | What it holds | Wipe impact |
|---|---|---|---|
| **Auth** | `auth.*` | Users, passwords, sessions, identities | Login accounts |
| **App data** | `public.*` | Profiles, projects, reports, RBAC, AI config, etc. | Business data |
| **Config** | Supabase project settings | URL, anon/service keys, Auth providers | Not in SQL tables |

Important relationships in this app:

- `public.profiles.id` → `auth.users(id)` with **`ON DELETE CASCADE`**
  - Deleting an auth user also deletes their profile.
  - Deleting a profile does **not** delete the auth user.
- Many tables reference `auth.users(id)` (`created_by`, `user_id`, `uploaded_by`, etc.).
- RBAC seed data lives in `roles`, `modules`, `permissions`, `role_module_permissions`.
- AI provider API keys live in `ai_provider_configs` (secrets — never copy between envs).

Canonical fresh-schema file:

- [`supabase/migrations/combined_qaly_schema.sql`](supabase/migrations/combined_qaly_schema.sql)

Incremental migrations (existing Flux/dev project):

- [`supabase/migrations/001_*.sql` … `059_*.sql`](supabase/migrations/)

---

## Option A — Delete all data in the existing DB

Use this when you want a clean slate on the **same** Supabase project, including wiping users.

### A1. Dashboard (Auth + app data)

1. Supabase Dashboard → **Authentication → Users** → delete all users (or use Admin API).
2. Then wipe `public` tables with Option A2 / B scripts below.

Deleting all `auth.users` will cascade-delete `profiles` (and any other `ON DELETE CASCADE` FKs). Tables with `ON DELETE SET NULL` will keep rows but null out the user FK.

### A2. SQL — truncate everything in `public` (keeps table structure)

Run in **SQL Editor** as a privileged role (service role / postgres). Order matters less with `CASCADE`, but disable RLS interference by using the service role / SQL editor.

```sql
-- NUCLEAR: clears ALL public tables (structure kept). Does NOT touch auth.users by itself.
-- Profiles will be emptied; auth users remain unless you also delete them (see below).

BEGIN;

TRUNCATE TABLE
  public.announcement_acknowledgements,
  public.announcement_reads,
  public.announcements,
  public.daily_report_custom_field_values,
  public.daily_report_column_mappings,
  public.daily_report_column_configs,
  public.daily_support_logs,
  public.daily_release_testing_status,
  public.daily_report_dropdown_configs,
  public.team_capacity_members,
  public.team_capacity_reports,
  public.weekly_reports,
  public.project_deletion_audit,
  public.project_members,
  public.projects,
  public.ai_prompt_versions,
  public.ai_module_prompts,
  public.ai_usage_logs,
  public.ai_provider_configs,
  public.login_events,
  public.audit_logs,
  public.user_permission_overrides,
  public.permission_templates,
  public.role_module_permissions,
  public.maintenance_config,
  public.profiles,
  public.departments,
  public.plans,
  public.permissions,
  public.modules,
  public.roles
RESTART IDENTITY CASCADE;

COMMIT;
```

Then delete auth users if you also want no logins left:

```sql
-- Optional: wipe Authentication too
DELETE FROM auth.users;
```

Or use Dashboard → Authentication → Users.

### A3. After a full wipe — reseed RBAC

Truncating `roles` / `modules` / `permissions` removes the matrix the app needs. Re-run the seed section from `combined_qaly_schema.sql` (SECTION: seed roles/modules/permissions/RMP), **or** re-run the full combined file carefully (it uses `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` for most creates/seeds).

Minimum after wipe:

1. Re-seed roles, modules, permissions, `role_module_permissions`
2. Re-seed dropdown configs if Daily Report depends on them
3. Reconfigure AI providers in Admin → AI Settings
4. Ensure at least one admin profile exists for a known auth user

---

## Option B — Make the DB new

Choose based on whether you want a **new Supabase project** or a **reset of the current one**.

### B1. Recommended: brand-new Supabase project (cleanest)

This is what `combined_qaly_schema.sql` was written for.

1. Create a new project in Supabase (e.g. production `Qaly-ai`).
2. Open **SQL Editor**.
3. Paste and run **once**:
   - `supabase/migrations/combined_qaly_schema.sql`
4. Do **not** also `supabase db push` the numbered `001..059` migrations onto that same fresh DB — the combined file already represents their final state and is intentionally unnumbered so the CLI won't auto-pick it up.
5. Point the app at the new project:
   - Update `.env` / Vercel env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (and any service-role secrets used by Edge Functions).
6. Redeploy Edge Functions if used (`ai-gateway`, `admin-ai-config`, `admin-prompt-config`, `admin-permissions`).
7. Post-setup checklist:
   - Sign up / create first user via Auth
   - Promote that user in `profiles.role` to `super_admin` or `admin`
   - Configure AI provider keys in Admin UI
   - Create projects / invite members as needed

### B2. Local / linked CLI reset (dev)

If you use the Supabase CLI against a local stack:

```bash
supabase db reset
```

This drops the local DB, re-applies numbered migrations, and runs seeds (if configured). It does **not** apply `combined_qaly_schema.sql` unless you wire that yourself.

For a **remote** linked project, prefer B1 or careful SQL — remote `db reset` is rarely what you want in shared environments.

### B3. “New” schema on the existing remote project (destructive)

1. Backup.
2. Truncate/wipe as in Option A (and optionally delete `auth.users`).
3. If schema is corrupted/drifted, prefer creating a **new** project (B1) over dropping all tables by hand.
4. If you must rebuild in place: drop `public` objects carefully, then run `combined_qaly_schema.sql`.

Dropping all tables is riskier than a new project because of extensions, grants, and leftover policies.

---

## Option C — Delete all data **without** deleting Authentication

Goal: users remain in `auth.users` (same emails/passwords/sessions), but business data is gone.

### What to keep

| Keep | Why |
|---|---|
| `auth.users`, `auth.identities`, `auth.sessions`, … | Login still works |
| `public.profiles` (usually) | App expects a profile row per user; trigger only creates on **new** signup |
| RBAC seed tables (usually) | Roles/modules/permissions matrix |

### What to wipe

Business / operational tables only, for example:

- Projects & membership: `projects`, `project_members`, `project_deletion_audit`
- Reports: `weekly_reports`, `team_capacity_*`
- Daily Update Report: `daily_support_logs`, `daily_release_testing_status`, `daily_report_*`
- Announcements: `announcements`, `announcement_reads`, `announcement_acknowledgements`
- Telemetry / audit: `login_events`, `audit_logs`, `ai_usage_logs`
- Optional secrets/config: `ai_provider_configs`, `ai_module_prompts`, `ai_prompt_versions`, `maintenance_config`
- Optional overrides: `user_permission_overrides`, `permission_templates`

### C1. Recommended SQL (keep Auth + profiles + RBAC)

```sql
-- Wipe app/business data; KEEP auth.users and public.profiles
-- Also KEEP roles / modules / permissions / role_module_permissions

BEGIN;

TRUNCATE TABLE
  public.announcement_acknowledgements,
  public.announcement_reads,
  public.announcements,
  public.daily_report_custom_field_values,
  public.daily_report_column_mappings,
  public.daily_report_column_configs,
  public.daily_support_logs,
  public.daily_release_testing_status,
  public.daily_report_dropdown_configs,
  public.team_capacity_members,
  public.team_capacity_reports,
  public.weekly_reports,
  public.project_deletion_audit,
  public.project_members,
  public.projects,
  public.ai_prompt_versions,
  public.ai_module_prompts,
  public.ai_usage_logs,
  public.ai_provider_configs,
  public.login_events,
  public.audit_logs,
  public.user_permission_overrides,
  public.permission_templates,
  public.maintenance_config
RESTART IDENTITY CASCADE;

COMMIT;
```

After this:

1. Users can still sign in.
2. Profiles / roles remain (admins stay admins).
3. You will need to recreate projects, reports, and (if truncated) AI provider config.
4. Re-seed `daily_report_dropdown_configs` if Daily Report UI depends on those defaults (see seed block in `combined_qaly_schema.sql`).

### C2. Also reset profile fields but keep the row (optional)

If you want empty profile metadata without breaking Auth:

```sql
UPDATE public.profiles
SET
  full_name     = NULL,
  phone         = NULL,
  team_id       = NULL,
  employee_id   = NULL,
  department_id = NULL,
  plan_id       = NULL,
  avatar_url    = NULL,
  last_login_at = NULL,
  status        = 'active'
  -- keep: id, email, role  (role preserves admin access)
;
```

### C3. Do **not** do these if you want Auth preserved

```sql
-- ❌ Deletes login accounts
DELETE FROM auth.users;

-- ❌ Removes profile rows; existing users won't get auto-recreated
--    (handle_new_user only fires on NEW auth.users inserts)
TRUNCATE public.profiles;
```

If you accidentally truncate `profiles`, recreate rows for existing auth users:

```sql
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  'free'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- Then re-promote admins manually:
UPDATE public.profiles
SET role = 'super_admin'
WHERE email = 'ameenchirayil@gmail.com';

SELECT id, email, role, status
FROM public.profiles
WHERE email = 'ameenchirayil@gmail.com';
```

---

## Quick decision matrix

| Goal | Do this |
|---|---|
| Empty business data, same logins | **Option C1** |
| Empty everything including users | **Option A2 + delete `auth.users`** |
| Brand new production DB | **Option B1** + `combined_qaly_schema.sql` |
| Local dev recreate | **`supabase db reset`** (Option B2) |
| Keep logins + wipe secrets/keys | Include `ai_provider_configs` in the truncate list (C1 already does) |

---

## Verification queries

```sql
-- Auth users still present?
SELECT COUNT(*) AS auth_users FROM auth.users;

-- Profiles still present?
SELECT id, email, role, status FROM public.profiles ORDER BY email;

-- Business tables empty?
SELECT 'projects' AS t, COUNT(*) FROM public.projects
UNION ALL SELECT 'weekly_reports', COUNT(*) FROM public.weekly_reports
UNION ALL SELECT 'daily_support_logs', COUNT(*) FROM public.daily_support_logs
UNION ALL SELECT 'project_members', COUNT(*) FROM public.project_members
UNION ALL SELECT 'announcements', COUNT(*) FROM public.announcements;

-- RBAC still seeded?
SELECT 'roles' AS t, COUNT(*) FROM public.roles
UNION ALL SELECT 'modules', COUNT(*) FROM public.modules
UNION ALL SELECT 'permissions', COUNT(*) FROM public.permissions
UNION ALL SELECT 'rmp', COUNT(*) FROM public.role_module_permissions;
```

---

## Public tables in this app (reference)

From `combined_qaly_schema.sql`:

**Identity / access**

- `profiles`, `roles`, `modules`, `permissions`, `role_module_permissions`
- `user_permission_overrides`, `permission_templates`, `departments`, `plans`
- `audit_logs`, `login_events`, `maintenance_config`

**Product data**

- `projects`, `project_members`, `project_deletion_audit`
- `weekly_reports`, `team_capacity_reports`, `team_capacity_members`
- `daily_support_logs`, `daily_release_testing_status`
- `daily_report_dropdown_configs`, `daily_report_column_configs`
- `daily_report_custom_field_values`, `daily_report_column_mappings`
- `announcements`, `announcement_reads`, `announcement_acknowledgements`

**AI**

- `ai_provider_configs`, `ai_usage_logs`, `ai_module_prompts`, `ai_prompt_versions`

---

## Safety checklist

- [ ] Backup taken
- [ ] Confirmed project URL (dev vs prod)
- [ ] Chose keep-Auth vs wipe-Auth
- [ ] Chose keep-RBAC vs reseed
- [ ] Ran truncate/delete in SQL Editor
- [ ] Verified counts
- [ ] Reconfigured AI providers if wiped
- [ ] Confirmed at least one `admin` / `super_admin` profile can sign in
- [ ] Updated app env vars if you created a new Supabase project
