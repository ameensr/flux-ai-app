# Database Setup, Migration & Cleanup Guide (Qaly / Supabase)

This document is the **authoritative guide** for:

1. Fresh **Qaly-ai** production database setup (new Supabase project)
2. Local **Flux-ai** development database workflow
3. Safe data cleanup / reset operations

> **Warning:** Wipe and reset operations are destructive. Take a backup (Dashboard → Database → Backups, or `pg_dump`) before running anything against a shared or production database.

---

## Architecture

| Environment | Supabase project | How schema is applied |
|-------------|------------------|------------------------|
| **Local development** | Flux-ai (local Docker / linked dev project) | Numbered files in `supabase/migrations/000_*.sql` … `061_*.sql` via `supabase db reset` |
| **Vercel / organization production** | **Qaly-ai** (separate cloud project) | **One file:** [`supabase/migrations/combined_qaly_schema.sql`](supabase/migrations/combined_qaly_schema.sql) |

These are **separate databases**. Do not point production env vars at the Flux-ai project.

```
LOCAL DEV (.env)
  VITE_SUPABASE_URL      → Flux-ai
  VITE_SUPABASE_ANON_KEY → Flux-ai anon/publishable key

VERCEL PRODUCTION
  VITE_SUPABASE_URL      → Qaly-ai
  VITE_SUPABASE_ANON_KEY → Qaly-ai anon/publishable key
```

Never put a **service-role / secret** key in any `VITE_*` variable (those are exposed to the browser).

---

## Mental model

| Layer | Schema | What it holds |
|-------|--------|----------------|
| **Auth** | `auth.*` | Users, passwords, sessions (managed by Supabase Auth) |
| **App data** | `public.*` | Profiles, projects, reports, RBAC, AI config, etc. |
| **Internal helpers** | `private.*` | SECURITY DEFINER helpers used by RLS (not exposed via PostgREST RPC) |
| **Config** | Project settings | URL, anon key, Auth providers (not in SQL) |

Important relationships:

- `public.profiles.id` → `auth.users(id)` with **`ON DELETE CASCADE`**
- Profile rows are created by trigger `handle_new_user` on **new** Auth signups (default `role = 'free'`)
- Org roles live on `profiles.role` (`free`, `pro`, `admin`, `super_admin`, `manager`, `qa_lead`, `qa_engineer`, `developer`, `standard`, `guest`)
- Project roles live on `project_members.project_role` (`owner`, `lead`, `member`, `viewer`)

Canonical fresh-schema file for **new** Qaly-ai:

- [`supabase/migrations/combined_qaly_schema.sql`](supabase/migrations/combined_qaly_schema.sql)

---

# Fresh Database Setup (Qaly-ai production)

This is the normal path for a **new** organization / Vercel production database.

### Exact SQL to run

**Run this file once on a fresh Qaly-ai Supabase database:**

`supabase/migrations/combined_qaly_schema.sql`

One file is enough. Do **not** also push numbered `000…061` migrations onto that same fresh project (they represent incremental Flux-ai history; the combined file is the final state).

### Step-by-step

1. **Create a new Supabase project** named for production (e.g. `Qaly-ai`).
2. **Copy client-safe credentials** from Project Settings → API:
   - Project URL → `VITE_SUPABASE_URL`
   - `anon` / publishable key → `VITE_SUPABASE_ANON_KEY`
3. **Open SQL Editor** → New query.
4. **Paste the full contents** of `supabase/migrations/combined_qaly_schema.sql` and **Run**.
5. **Verify migration success** (see verification queries below). There should be no errors.
6. **Auth settings** (Dashboard → Authentication):
   - Enable Email provider (or your org SSO later)
   - Confirm Site URL / Redirect URLs match your Vercel domain
7. **Storage:** not required for current Qaly (app does not use Supabase Storage buckets).
8. **Register the first application user** through the normal app signup flow (do this *after* pointing a build at the new project, or use a temporary local `.env` pointing at Qaly-ai).
9. **Assign Super Admin** (see section below).
10. **Verify Super Admin** with the verification query.
11. **Configure Vercel Production** env vars (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` → Qaly-ai). Redeploy Edge Functions if used (`ai-gateway`, `admin-ai-config`, `admin-prompt-config`, `admin-permissions`) with the Qaly-ai project secrets (service role stays server-side only).
12. **Deploy / redeploy** the frontend.
13. **Smoke test:** login → Super Admin sees Admin Hub → create project → Daily Report → QA Weekly Report → AI Settings (add provider keys in UI).

### Post-migration verification (structure)

```sql
-- Core tables present?
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY 1;

-- RBAC seeded?
SELECT 'roles' AS t, COUNT(*) FROM public.roles
UNION ALL SELECT 'modules', COUNT(*) FROM public.modules
UNION ALL SELECT 'permissions', COUNT(*) FROM public.permissions
UNION ALL SELECT 'rmp', COUNT(*) FROM public.role_module_permissions;

-- Projects shape matches app (must have name + tags, not only project_name)
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'projects'
ORDER BY ordinal_position;

-- Private helpers + public RPC wrappers
SELECT n.nspname, p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('is_admin', 'get_role_permissions', 'check_module_permission', 'handle_new_user')
ORDER BY 1, 2;
```

---

## Assign First Super Admin

Preferred administrator workflow:

1. Combined migration already applied.
2. App is pointed at the new Qaly-ai project.
3. Intended admin **registers normally** (Auth signup) so `auth.users` + `profiles` exist.
4. Confirm the user exists (query below).
5. Run the **assignment** query with the placeholder email replaced.
6. Run the **verification** query.
7. **Logout and login again** so the app reloads `get_role_permissions` for `super_admin`.

### Confirm user exists

```sql
SELECT u.id, u.email, p.role, p.status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE lower(u.email) = lower('your-admin@example.com');
```

### Assignment query

```sql
-- Replace your-admin@example.com with the registered Super Admin email.
UPDATE public.profiles AS p
SET role = 'super_admin',
    status = 'active'
FROM auth.users AS u
WHERE p.id = u.id
  AND lower(u.email) = lower('your-admin@example.com');
```

### Verification query

```sql
SELECT
  u.id          AS auth_user_id,
  u.email,
  p.id          AS profile_id,
  p.role,
  p.status,
  p.full_name,
  p.created_at
FROM auth.users u
JOIN public.profiles p ON p.id = u.id
WHERE lower(u.email) = lower('your-admin@example.com');
```

Expected: `role = super_admin`, `status = active`.

> These queries are also included (commented) at the end of `combined_qaly_schema.sql`.

---

## Production environment variables

| Variable | Where | Points to |
|----------|--------|-----------|
| `VITE_SUPABASE_URL` | Local `.env` | Flux-ai |
| `VITE_SUPABASE_ANON_KEY` | Local `.env` | Flux-ai anon key |
| `VITE_SUPABASE_URL` | Vercel Production | **Qaly-ai** |
| `VITE_SUPABASE_ANON_KEY` | Vercel Production | **Qaly-ai** anon key |
| `VITE_FASTAPI_URL` | As needed | Your FastAPI URL (optional for some modules) |

Edge Functions / backend (server only — **not** `VITE_*`):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_JWT_SECRET` / backend JWT validation secrets as documented in `backend/.env.example`

---

# Destructive Database Reset

> ### STOP — Production safety
>
> The following sections can **destroy data**.
>
> - **Never** run `DROP SCHEMA public CASCADE` (or Option A/B3 wipes) against production Qaly-ai as part of normal migration.
> - Normal Qaly-ai setup = **Fresh Database Setup** above (new project + combined SQL).
> - Use wipe/reset only for local Flux-ai or an explicitly disposable project after backup.

---

## Option A — Delete all data in an existing DB

Use when you want a clean slate on the **same** Supabase project, including wiping users.

### A1. Dashboard (Auth + app data)

1. Authentication → Users → delete users (or Admin API).
2. Wipe `public` tables with A2 below.

Deleting `auth.users` cascades to `profiles`.

### A2. SQL — truncate `public` data (structure kept)

```sql
-- NUCLEAR: clears ALL public tables (structure kept). Does NOT delete auth.users by itself.

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

Optional — also wipe Auth:

```sql
DELETE FROM auth.users;
```

### A3. After a full wipe — reseed

Truncating RBAC removes the permission matrix. Prefer re-running the **seed sections** of `combined_qaly_schema.sql`, or recreate the project with the full combined file on a **new** empty database.

Minimum after wipe:

1. Re-seed roles, modules, permissions, `role_module_permissions`
2. Re-seed `daily_report_dropdown_configs` / column defaults if needed
3. Reconfigure AI providers in Admin → AI Settings
4. Ensure at least one `super_admin` / `admin` profile exists

---

## Option B — Make the DB new

### B1. Recommended: brand-new Supabase project

Follow **Fresh Database Setup (Qaly-ai production)** above.

### B2. Local Flux-ai CLI reset

```bash
supabase db reset
```

Applies numbered migrations only (not `combined_qaly_schema.sql`). Use for local Docker development.

### B3. Rebuild schema on an existing remote project (last resort)

1. Backup.
2. Prefer a **new** project (B1) over dropping objects in place.
3. If you must rebuild in place: wipe carefully, then run `combined_qaly_schema.sql` on an emptied `public` schema.
4. Do **not** treat `DROP SCHEMA public CASCADE` as a routine step.

---

## Option C — Delete business data, keep Authentication

Goal: same logins (`auth.users`), business data gone.

### Keep

| Keep | Why |
|------|-----|
| `auth.users` (+ identities/sessions) | Login still works |
| `public.profiles` (usually) | Trigger only creates profiles on **new** signups |
| RBAC seed tables (usually) | Roles/modules/permissions matrix |

### Wipe (example)

```sql
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

### Optional — reset profile metadata (keep role)

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
  status        = 'active';
  -- keep: id, email, role
;
```

### Do not do these if you want Auth preserved

```sql
-- Deletes login accounts
DELETE FROM auth.users;

-- Removes profile rows; existing users are NOT auto-recreated
-- (handle_new_user only fires on NEW auth.users inserts)
TRUNCATE public.profiles;
```

If profiles were truncated by mistake:

```sql
INSERT INTO public.profiles (id, email, full_name, role)
SELECT
  u.id,
  u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  'free'
FROM auth.users u
ON CONFLICT (id) DO NOTHING;

-- Then promote admin using the Super Admin assignment query (placeholder email).
```

---

## Quick decision matrix

| Goal | Do this |
|------|---------|
| New org / Vercel production DB | **Fresh Qaly-ai Setup** + `combined_qaly_schema.sql` |
| Empty business data, same logins | **Option C** |
| Empty everything including users | **Option A2** + delete `auth.users` |
| Local Docker recreate | **`supabase db reset`** (Option B2) |

---

## Public tables (reference)

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

## Historical numbered migrations

Files `supabase/migrations/000_*.sql` … `061_*.sql` remain for **local Flux-ai / CLI history**.

- Keep them for `supabase db reset` and migration history.
- Do **not** delete them as part of Qaly-ai bootstrap.
- Do **not** apply both the full numbered chain **and** `combined_qaly_schema.sql` to the same fresh cloud project.

`combined_qaly_schema.sql` is intentionally **unnumbered** so the CLI will not auto-apply it during `db reset`.

---

## Safety checklist

- [ ] Confirmed project (Flux-ai vs Qaly-ai)
- [ ] Backup taken if wiping
- [ ] Fresh setup uses **combined** file only (not DROP SCHEMA)
- [ ] First user registered via normal Auth
- [ ] Super Admin assigned + verified
- [ ] Vercel env points to Qaly-ai (anon key only in `VITE_*`)
- [ ] AI providers configured in Admin UI (no keys in SQL)
- [ ] Smoke test: project create, Daily Report, QA Report, Admin Hub
