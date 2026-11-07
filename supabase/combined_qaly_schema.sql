-- ============================================================================
-- COMBINED QALY-AI SCHEMA — Single-file Supabase bootstrap migration
--
-- PURPOSE
--   Initializes a brand-new, empty Supabase project (production "Qaly-ai")
--   with the complete schema required by the CURRENT application.
--   Does NOT copy Flux-ai development data, users, secrets, or API keys.
--
-- ARCHITECTURE
--   LOCAL DEVELOPMENT  → Flux-ai  (numbered migrations via `supabase db reset`)
--   VERCEL / ORG PROD  → Qaly-ai  (THIS file once on a fresh Supabase project)
--
-- HOW THIS FILE WAS BUILT
--   Reconciled from migrations 000..072 + every supabase.from()/rpc() call in
--   src/ and supabase/functions/. Application code is ground truth where
--   migration history drifted (notably projects: use 034 `name`/`tags` shape,
--   never the obsolete 021 `project_name` shape).
--
-- SECURITY
--   SECURITY DEFINER helpers live in schema `private` (not exposed by PostgREST).
--   Public INVOKER wrappers exist only for app RPCs:
--     get_role_permissions, check_module_permission
--   Trigger functions remain in `public` with locked search_path.
--
-- USAGE (fresh Qaly-ai only)
--   1. Create new Supabase project
--   2. SQL Editor → paste/run THIS FILE once
--   3. Register first user via the app
--   4. Run Super Admin assignment (SECTION at end of this file)
--   5. Set VITE_SUPABASE_URL + VITE_SUPABASE_ANON_KEY on Vercel
--
-- DO NOT
--   - Run this on Flux-ai if numbered migrations already applied
--   - Commit secrets / real emails / business data into this file
--   - Use DROP SCHEMA public CASCADE for normal setup
-- ============================================================================

-- SECTION 0: Extensions

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres;

-- ══════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto; -- gen_random_uuid()


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 1: Generic helpers
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 2: Core RBAC — roles, modules, permissions, role_module_permissions
-- (source: 003_rbac.sql, extended by 008, 023, 026, 028, 035, 056)
-- ══════════════════════════════════════════════════════════════════════════════

-- NOTE ON ORDERING: table creation happens here, but RLS/policies for these
-- four tables are deferred to SECTION 4B (after public.profiles exists),
-- because their admin-write policies need to query public.profiles — and
-- CREATE POLICY validates referenced relations at creation time (unlike a
-- plpgsql function body, which defers checks until it actually runs).
-- Creating them here first would fail against a clean database.

create table if not exists public.roles (
  id            uuid primary key default gen_random_uuid(),
  role_key      text not null unique,
  role_name     text not null,
  description   text,
  is_system     boolean not null default false,
  priority      integer not null default 50,
  inherits_from uuid references public.roles(id) on delete set null,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create table if not exists public.modules (
  id          uuid primary key default gen_random_uuid(),
  module_key  text not null unique,
  module_name text not null,
  route_path  text,
  icon        text,
  is_active   boolean not null default true,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.permissions (
  id              uuid primary key default gen_random_uuid(),
  permission_key  text not null unique,
  permission_name text not null,
  description     text,
  created_at      timestamptz not null default now()
);

create table if not exists public.role_module_permissions (
  id            uuid primary key default gen_random_uuid(),
  role_id       uuid not null references public.roles(id) on delete cascade,
  module_id     uuid not null references public.modules(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  is_enabled    boolean not null default false,
  updated_at    timestamptz not null default now(),
  unique (role_id, module_id, permission_id)
);

drop trigger if exists rmp_updated_at on public.role_module_permissions;
create trigger rmp_updated_at
  before update on public.role_module_permissions
  for each row execute function public.set_updated_at();


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 3: Enterprise RBAC support tables needed by profiles' FKs
-- (source: 008_enterprise_rbac.sql)
-- RLS/policies for these are also deferred to SECTION 4B for the same reason.
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

create table if not exists public.plans (
  id          uuid primary key default gen_random_uuid(),
  plan_key    text not null unique,
  plan_name   text not null,
  description text,
  sort_order  integer not null default 0
);


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 4: public.profiles
--
-- DISCREPANCY NOTE: no migration in this repo CREATEs this table — it was
-- created directly in the Supabase dashboard. Reconstructed here from every
-- ALTER TABLE public.profiles across 003/008/010-012/025/031/033 plus real
-- .select()/.insert() column usage in the application (AuthPage.tsx,
-- App.tsx, UserManagement.tsx, useAppStore.ts Profile type).
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  email          text not null,
  full_name      text,
  phone          text,                                          -- 025_profiles_phone.sql
  role           text not null default 'free',
  team_id        uuid,                                           -- DEPRECATED: teams feature removed (032/036). No FK — the `teams` table is not created by this migration and the historical FK was dropped via CASCADE when teams was dropped.
  employee_id    text,                                           -- 008_enterprise_rbac.sql
  department_id  uuid references public.departments(id) on delete set null,
  plan_id        uuid references public.plans(id) on delete set null,
  status         text not null default 'active',
  last_login_at  timestamptz,
  avatar_url     text,
  created_at     timestamptz not null default now(),
  constraint profiles_role_check check (role in (
    'free', 'pro', 'admin',
    'super_admin', 'manager', 'qa_lead', 'qa_engineer',
    'developer', 'standard', 'guest'
  )),
  constraint profiles_status_check check (status in (
    'active','inactive','suspended','pending','locked','invited'
  ))
);

create index if not exists idx_profiles_team_id on public.profiles(team_id);

alter table public.profiles enable row level security;

drop policy if exists "profiles_read_authenticated"      on public.profiles;
drop policy if exists "profiles_self_insert"              on public.profiles;
drop policy if exists "profiles_self_update"              on public.profiles;
drop policy if exists "profiles_admin_update"             on public.profiles;
drop policy if exists "profiles_admin_delete"             on public.profiles;
drop policy if exists "profiles_admin_read"               on public.profiles;
drop policy if exists "profiles_admin_update_by_service"  on public.profiles;

-- get_my_role(): SECURITY DEFINER helper to avoid recursive RLS lookups
-- (see 011_fix_profiles_rls.sql for the original recursion bug this fixes)
create or replace function private.get_my_role()
returns text
language sql stable security definer set search_path = public
as $$
  select role from public.profiles where id = auth.uid() limit 1;
$$;

grant execute on function private.get_my_role() to authenticated;

-- All authenticated users can read all profiles (no sensitive secrets stored here)
drop policy if exists "profiles_read_authenticated" on public.profiles;
create policy "profiles_read_authenticated" on public.profiles
  for select
  to authenticated
  using (true);

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- SECURITY DEFINER: load caller's profile even if SELECT policies are wrong
create or replace function public.get_my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;
revoke all on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;

create policy "profiles_self_insert" on public.profiles
  for insert with check ( auth.uid() = id );

-- Final version from 033_fix_profiles_self_update_rls.sql: narrowed so it
-- never fires for admin/super_admin rows being updated by themselves, which
-- previously conflicted with profiles_admin_update's WITH CHECK clause.
create policy "profiles_self_update" on public.profiles
  for update
  using ( auth.uid() = id and private.get_my_role() not in ('admin', 'super_admin') )
  with check ( auth.uid() = id and private.get_my_role() not in ('admin', 'super_admin') );

create policy "profiles_admin_update" on public.profiles
  for update
  using ( private.get_my_role() in ('admin', 'super_admin') )
  with check ( private.get_my_role() in ('admin', 'super_admin') );

create policy "profiles_admin_delete" on public.profiles
  for delete using ( private.get_my_role() in ('admin', 'super_admin') );

-- Auto-create a profile row whenever a new user signs up via Supabase Auth.
-- (source: 006_profile_trigger.sql)
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    'free'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 4B: RLS + policies for roles/modules/permissions/role_module_permissions
-- /departments/plans (deferred here from SECTIONS 2-3 because these policies
-- query public.profiles, which did not exist until SECTION 4 above).
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.roles enable row level security;
drop policy if exists "roles_read_all"    on public.roles;
drop policy if exists "roles_admin_write" on public.roles;
create policy "roles_read_all" on public.roles for select using (true);
create policy "roles_admin_write" on public.roles for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
);

alter table public.modules enable row level security;
drop policy if exists "modules_read_all"    on public.modules;
drop policy if exists "modules_admin_write" on public.modules;
create policy "modules_read_all" on public.modules for select using (true);
create policy "modules_admin_write" on public.modules for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

alter table public.permissions enable row level security;
drop policy if exists "permissions_read_all"    on public.permissions;
drop policy if exists "permissions_admin_write" on public.permissions;
create policy "permissions_read_all" on public.permissions for select using (true);
create policy "permissions_admin_write" on public.permissions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

alter table public.role_module_permissions enable row level security;
drop policy if exists "rmp_read_all"    on public.role_module_permissions;
drop policy if exists "rmp_admin_write" on public.role_module_permissions;
create policy "rmp_read_all" on public.role_module_permissions for select using (true);
-- Final version from 017_fix_rmp_rls.sql (widened to super_admin)
create policy "rmp_admin_write" on public.role_module_permissions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
);

alter table public.departments enable row level security;
drop policy if exists "departments_read_all"    on public.departments;
drop policy if exists "departments_admin_write" on public.departments;
create policy "departments_read_all" on public.departments for select using (true);
create policy "departments_admin_write" on public.departments for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
);

alter table public.plans enable row level security;
drop policy if exists "plans_read_all" on public.plans;
create policy "plans_read_all" on public.plans for select using (true);


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 5: RBAC RPC functions (used by frontend + edge functions)
-- (source: 004_rbac_helpers.sql, 005_rbac_get_permissions.sql)
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function private.check_module_permission(
  p_role_key       text,
  p_module_key     text,
  p_permission_key text
)
returns boolean
language sql stable security definer
as $$
  select coalesce(
    (
      select rmp.is_enabled
      from public.role_module_permissions rmp
      join public.roles       r  on r.id  = rmp.role_id
      join public.modules     m  on m.id  = rmp.module_id
      join public.permissions p  on p.id  = rmp.permission_id
      where r.role_key  = p_role_key
        and m.module_key = p_module_key
        and p.permission_key = p_permission_key
      limit 1
    ),
    false
  );
$$;

grant execute on function private.check_module_permission(text, text, text) to authenticated;

-- RPC used by the frontend permission engine (loadPermissionsForRole in src/lib/rbac.ts)
create or replace function private.get_role_permissions(p_role_key text)
returns table (
  module_key     text,
  permission_key text,
  is_enabled     boolean
)
language sql stable security definer
as $$
  select
    m.module_key,
    p.permission_key,
    rmp.is_enabled
  from public.role_module_permissions rmp
  join public.roles       r  on r.id  = rmp.role_id
  join public.modules     m  on m.id  = rmp.module_id
  join public.permissions p  on p.id  = rmp.permission_id
  where r.role_key = p_role_key;
$$;

grant execute on function private.get_role_permissions(text) to authenticated;

create or replace function private.is_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'super_admin')
  )
$$;

create or replace function private.is_super_admin()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'super_admin'
  )
$$;


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 6: Enterprise RBAC extras — overrides, templates, audit logs
-- (source: 008_enterprise_rbac.sql)
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.user_permission_overrides (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  module_id     uuid not null references public.modules(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  is_allowed    boolean not null,
  reason        text,
  created_by    uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (user_id, module_id, permission_id)
);

alter table public.user_permission_overrides enable row level security;
drop policy if exists "overrides_admin_all" on public.user_permission_overrides;
drop policy if exists "overrides_self_read" on public.user_permission_overrides;
create policy "overrides_admin_all" on public.user_permission_overrides for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
);
create policy "overrides_self_read" on public.user_permission_overrides for select using (
  user_id = auth.uid()
);

create table if not exists public.permission_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  config      jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

alter table public.permission_templates enable row level security;
drop policy if exists "templates_read_all"    on public.permission_templates;
drop policy if exists "templates_admin_write" on public.permission_templates;
create policy "templates_read_all" on public.permission_templates for select using (true);
create policy "templates_admin_write" on public.permission_templates for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
);

create table if not exists public.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid references auth.users(id) on delete set null,
  actor_email text,
  action      text not null,
  target_type text,
  target_id   text,
  module      text,
  old_value   jsonb,
  new_value   jsonb,
  ip_address  text,
  user_agent  text,
  created_at  timestamptz not null default now()
);

alter table public.audit_logs enable row level security;
drop policy if exists "audit_admin_read"    on public.audit_logs;
drop policy if exists "audit_service_insert" on public.audit_logs;
create policy "audit_admin_read" on public.audit_logs for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
);
create policy "audit_service_insert" on public.audit_logs
  for insert to authenticated, service_role
  with check (
    auth.role() = 'service_role'
    or private.is_admin()
    or private.is_super_admin()
  );

create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_id_idx   on public.audit_logs (actor_id);


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 7: AI provider configuration, prompts, usage logs
-- (source: 001_ai_provider_configs.sql, 002_ai_module_prompts.sql,
--  018_fix_ai_provider_rls.sql, 019_fix_usage_logs_fk.sql, 026)
-- NOTE: No ai_provider_configs data is seeded — API keys are secrets and must
-- be configured post-deploy via the Admin > AI Settings UI.
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.ai_provider_configs (
  id                   uuid primary key default gen_random_uuid(),
  provider_name        text not null,
  encrypted_api_key    text not null,
  model_name           text not null,
  is_active            boolean not null default false,
  is_enabled           boolean not null default true,
  max_tokens           integer not null default 4096,
  temperature          numeric(3,2) not null default 0.7,
  rate_limit_rpm       integer,
  monthly_budget       numeric(10,2),
  fallback_provider_id uuid references public.ai_provider_configs(id),
  provider_priority    integer not null default 0,
  created_by           uuid not null references auth.users(id) on delete cascade,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create unique index if not exists ai_provider_configs_single_active
  on public.ai_provider_configs (is_active)
  where is_active = true;

drop trigger if exists ai_provider_configs_updated_at on public.ai_provider_configs;
create trigger ai_provider_configs_updated_at
  before update on public.ai_provider_configs
  for each row execute function public.set_updated_at();

alter table public.ai_provider_configs enable row level security;
drop policy if exists "admins_all" on public.ai_provider_configs;
-- Final version from 018_fix_ai_provider_rls.sql (widened to super_admin, added WITH CHECK)
create policy "admins_all" on public.ai_provider_configs
  for all
  using ( exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')) )
  with check ( exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin')) );

create table if not exists public.ai_usage_logs (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users(id) on delete cascade,
  provider_id        uuid references public.ai_provider_configs(id) on delete set null, -- 019_fix_usage_logs_fk.sql
  module             text,
  prompt_tokens      integer,
  completion_tokens  integer,
  total_tokens       integer,
  latency_ms         integer,
  created_at         timestamptz not null default now()
);

alter table public.ai_usage_logs enable row level security;
drop policy if exists "admins_read_logs" on public.ai_usage_logs;
drop policy if exists "users_own_logs"   on public.ai_usage_logs;
drop policy if exists "admins_write_logs" on public.ai_usage_logs;
create policy "admins_read_logs" on public.ai_usage_logs for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
);
create policy "users_own_logs" on public.ai_usage_logs for select using (user_id = auth.uid());
create policy "admins_write_logs" on public.ai_usage_logs for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
);

create table if not exists public.ai_module_prompts (
  id            uuid primary key default gen_random_uuid(),
  module_key    text not null,
  module_name   text not null,
  system_prompt text not null default '',
  is_active     boolean not null default true,
  version       integer not null default 1,
  temperature   numeric(3,2),
  max_tokens    integer,
  created_by    uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create unique index if not exists ai_module_prompts_active_module
  on public.ai_module_prompts (module_key)
  where is_active = true;

drop trigger if exists ai_module_prompts_updated_at on public.ai_module_prompts;
create trigger ai_module_prompts_updated_at
  before update on public.ai_module_prompts
  for each row execute function public.set_updated_at();

alter table public.ai_module_prompts enable row level security;
drop policy if exists "admins_all_prompts" on public.ai_module_prompts;
create policy "admins_all_prompts" on public.ai_module_prompts
  for all using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );

create table if not exists public.ai_prompt_versions (
  id            uuid primary key default gen_random_uuid(),
  prompt_id     uuid not null references public.ai_module_prompts(id) on delete cascade,
  module_key    text not null,
  system_prompt text not null,
  version       integer not null,
  changed_by    uuid not null references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now()
);

alter table public.ai_prompt_versions enable row level security;
drop policy if exists "admins_read_versions" on public.ai_prompt_versions;
create policy "admins_read_versions" on public.ai_prompt_versions
  for select using ( exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') );


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 8: Projects & Project Members (Project Hub)
--
-- DISCREPANCY NOTE: uses the 034_project_hub.sql shape (name/status/tags/
-- metadata), verified as ground truth against projectService.ts and
-- QAWeeklyReport/store.ts, superseding the incompatible 021_project_master.sql
-- shape (project_name/project_code unique/is_active) which real application
-- code never queries.
-- (source: 034, 035, 039_fix_project_member_role_hierarchy.sql, 040, 043, 044)
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.projects (
  id                uuid primary key default gen_random_uuid(),
  name              text not null,
  description       text,
  project_code      text,
  status            text not null default 'active'
    check (status in ('active', 'on_hold', 'completed', 'archived')),
  start_date        date,
  target_end_date   date,
  actual_end_date   date,
  tags              text[],
  metadata          jsonb default '{}',
  created_by        uuid references public.profiles(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_projects_status     on public.projects(status);
create index if not exists idx_projects_created_by on public.projects(created_by);
create index if not exists idx_projects_code       on public.projects(project_code);

drop trigger if exists projects_updated_at on public.projects;
create trigger projects_updated_at
  before update on public.projects
  for each row execute function public.set_updated_at();

create table if not exists public.project_members (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  project_role  text not null default 'member'
    check (project_role in ('owner', 'lead', 'member', 'viewer')),
  assigned_at   timestamptz not null default now(),
  assigned_by   uuid references public.profiles(id) on delete set null,
  unique(project_id, user_id)
);

create index if not exists idx_project_members_project_id on public.project_members(project_id);
create index if not exists idx_project_members_user_id    on public.project_members(user_id);

-- ── Helper functions ──────────────────────────────────────────────────────────

-- Final version from 040_fix_qa_lead_project_access.sql: qa_lead excluded so
-- QA Leads follow strict project-membership rules like regular users.
create or replace function private.is_project_manager()
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('manager', 'admin', 'super_admin')
  )
$$;

create or replace function private.is_project_member(project_uuid uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.project_members
    where project_id = project_uuid and user_id = auth.uid()
  )
$$;

create or replace function private.is_project_owner_or_lead(project_uuid uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.project_members
    where project_id = project_uuid
      and user_id = auth.uid()
      and project_role in ('owner', 'lead')
  )
$$;

-- Final version from 043_fix_project_deletion_permissions.sql
create or replace function private.is_project_owner(project_uuid uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.project_members
    where project_id = project_uuid
      and user_id = auth.uid()
      and project_role = 'owner'
  )
$$;

create or replace function private.my_org_id()
returns uuid language sql stable security definer as $$
  select null::uuid
$$;

create or replace function private.get_user_project_role(p_project_id uuid)
returns text language plpgsql security definer stable as $$
declare
  v_role text;
begin
  select project_role into v_role
  from public.project_members
  where project_id = p_project_id and user_id = auth.uid()
  limit 1;
  return v_role;
end;
$$;

create or replace function private.can_edit_in_project(p_project_id uuid)
returns boolean language plpgsql security definer stable as $$
declare
  v_role text;
begin
  if private.is_admin() then return true; end if;
  if p_project_id is null then return true; end if;
  v_role := private.get_user_project_role(p_project_id);
  return v_role in ('owner', 'lead', 'member');
end;
$$;

-- Final (065): only admins get global bypass — managers must be owner/lead on that project
create or replace function private.can_modify_project_member_role(
  p_member_id uuid,
  p_new_role  text
) returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_current_user_role text;
  v_target_current_role text;
  v_project_id uuid;
  v_owner_count int;
begin
  if private.is_admin() then return true; end if;

  select project_id, project_role into v_project_id, v_target_current_role
  from public.project_members where id = p_member_id;

  if v_project_id is null then return false; end if;

  select project_role into v_current_user_role
  from public.project_members
  where project_id = v_project_id and user_id = auth.uid();

  if v_current_user_role is null then return false; end if;

  if v_current_user_role = 'owner' then
    if v_target_current_role = 'owner' and p_new_role != 'owner' then
      select count(*) into v_owner_count from public.project_members
      where project_id = v_project_id and project_role = 'owner';
      if v_owner_count <= 1 then return false; end if;
    end if;
    return true;
  end if;

  if v_current_user_role = 'lead' then
    if v_target_current_role = 'owner' then return false; end if;
    if p_new_role = 'owner' then return false; end if;
    return true;
  end if;

  return false;
end;
$$;

create or replace function private.can_remove_project_member(
  p_member_id uuid
) returns boolean language plpgsql stable security definer set search_path = public as $$
declare
  v_current_user_role text;
  v_target_role text;
  v_target_user_id uuid;
  v_project_id uuid;
  v_owner_count int;
begin
  if private.is_admin() then return true; end if;

  select project_id, project_role, user_id into v_project_id, v_target_role, v_target_user_id
  from public.project_members where id = p_member_id;

  if v_project_id is null then return false; end if;

  if v_target_user_id = auth.uid() then
    if v_target_role = 'owner' then
      select count(*) into v_owner_count from public.project_members
      where project_id = v_project_id and project_role = 'owner';
      if v_owner_count <= 1 then return false; end if;
    end if;
    return true;
  end if;

  select project_role into v_current_user_role
  from public.project_members
  where project_id = v_project_id and user_id = auth.uid();

  if v_current_user_role is null then return false; end if;

  if v_current_user_role = 'owner' then
    if v_target_role = 'owner' then
      select count(*) into v_owner_count from public.project_members
      where project_id = v_project_id and project_role = 'owner';
      if v_owner_count <= 1 then return false; end if;
    end if;
    return true;
  end if;

  if v_current_user_role = 'lead' then
    if v_target_role = 'owner' then return false; end if;
    return true;
  end if;

  return false;
end;
$$;

-- ── RLS: projects ─────────────────────────────────────────────────────────────

alter table public.projects enable row level security;

drop policy if exists "projects_select" on public.projects;
drop policy if exists "projects_insert" on public.projects;
drop policy if exists "projects_update" on public.projects;
drop policy if exists "projects_delete" on public.projects;

-- Final visibility (065/066): admins, members, or project creator
create policy "projects_select" on public.projects for select using (
  private.is_admin()
  or private.is_project_member(id)
  or created_by = auth.uid()
);
create policy "projects_insert" on public.projects for insert with check (
  private.is_admin() or private.is_project_manager()
);
-- Final update (065): no blanket manager bypass
create policy "projects_update" on public.projects for update using (
  private.is_admin() or private.is_project_owner_or_lead(id)
);
-- Final version from 043_fix_project_deletion_permissions.sql: owners only, not leads
create policy "projects_delete" on public.projects for delete using (
  private.is_admin() or private.is_project_owner(id)
);

-- Auto-assign creator as owner (066) so INSERT RETURNING + membership work
create or replace function private.add_project_creator_as_owner()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.created_by is not null then
    insert into public.project_members (project_id, user_id, project_role, assigned_by)
    values (new.id, new.created_by, 'owner', new.created_by)
    on conflict (project_id, user_id) do nothing;
  end if;
  return new;
end;
$$;

drop trigger if exists projects_add_creator_as_owner on public.projects;
create trigger projects_add_creator_as_owner
  after insert on public.projects
  for each row execute function private.add_project_creator_as_owner();

-- ── RLS: project_members ──────────────────────────────────────────────────────

alter table public.project_members enable row level security;

drop policy if exists "project_members_select" on public.project_members;
drop policy if exists "project_members_insert" on public.project_members;
drop policy if exists "project_members_update" on public.project_members;
drop policy if exists "project_members_delete" on public.project_members;

-- Final visibility (066): admins, own rows, or fellow project members
create policy "project_members_select" on public.project_members for select using (
  private.is_admin()
  or user_id = auth.uid()
  or private.is_project_member(project_id)
);
-- Final insert (065): creator may self-bootstrap as owner; no manager join-any-project
create policy "project_members_insert" on public.project_members for insert with check (
  private.is_admin()
  or private.is_project_owner_or_lead(project_id)
  or (
    user_id = auth.uid()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.created_by = auth.uid()
    )
  )
);
-- Final version from 039_fix_project_member_role_hierarchy.sql: hierarchy-enforced
create policy "project_members_update" on public.project_members for update using (
  private.can_modify_project_member_role(id, project_role)
);
create policy "project_members_delete" on public.project_members for delete using (
  private.can_remove_project_member(id)
);

-- ── Triggers: last-owner protection (039) ─────────────────────────────────────

create or replace function public.prevent_last_owner_role_change()
returns trigger language plpgsql set search_path = public as $$
declare
  v_owner_count int;
begin
  if current_setting('app.admin_deleting_user', true) = 'true' then
    return new;
  end if;
  if coalesce(auth.jwt() ->> 'role', auth.role()) = 'service_role' then
    return new;
  end if;
  if private.is_admin() then return new; end if;
  if private.is_super_admin() then return new; end if;
  if old.project_role = 'owner' and new.project_role != 'owner' then
    select count(*) into v_owner_count from public.project_members
    where project_id = old.project_id and project_role = 'owner';
    if v_owner_count <= 1 then
      raise exception 'Cannot remove or demote the last project owner. Assign another owner first.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists prevent_last_owner_role_change_trigger on public.project_members;
create trigger prevent_last_owner_role_change_trigger
  before update of project_role on public.project_members
  for each row execute function public.prevent_last_owner_role_change();

create or replace function public.prevent_last_owner_deletion()
returns trigger language plpgsql set search_path = public as $$
declare
  v_owner_count int;
begin
  -- Project CASCADE delete: allow removing all members including last owner
  if current_setting('app.cascading_project_delete', true) = 'true' then
    return old;
  end if;

  -- Admin hard-delete of a user (068)
  if current_setting('app.admin_deleting_user', true) = 'true' then
    return old;
  end if;

  -- Service role (edge functions)
  if coalesce(auth.jwt() ->> 'role', auth.role()) = 'service_role' then
    return old;
  end if;

  -- Admins / super_admins may remove any member (including last owner)
  if private.is_admin() then return old; end if;

  if old.project_role = 'owner' then
    select count(*) into v_owner_count from public.project_members
    where project_id = old.project_id and project_role = 'owner';
    if v_owner_count <= 1 then
      raise exception 'Cannot remove the last project owner. Assign another owner first.';
    end if;
  end if;
  return old;
end;
$$;

drop trigger if exists prevent_last_owner_deletion_trigger on public.project_members;
create trigger prevent_last_owner_deletion_trigger
  before delete on public.project_members
  for each row execute function public.prevent_last_owner_deletion();


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 9: Project deletion audit trail
-- (source: 044_project_cascade_deletion.sql)
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.project_deletion_audit (
  id                       uuid primary key default gen_random_uuid(),
  project_id               uuid not null,
  project_name             text not null,
  project_code             text,
  deleted_by               uuid references public.profiles(id) on delete set null,
  deleted_at               timestamptz not null default now(),
  associated_data_counts   jsonb default '{}',
  metadata                 jsonb default '{}'
);

alter table public.project_deletion_audit enable row level security;
drop policy if exists "project_deletion_audit_select" on public.project_deletion_audit;
drop policy if exists "project_deletion_audit_insert" on public.project_deletion_audit;
create policy "project_deletion_audit_select" on public.project_deletion_audit for select using (private.is_admin());
create policy "project_deletion_audit_insert" on public.project_deletion_audit
  for insert to authenticated, service_role
  with check (
    auth.role() = 'service_role'
    or private.is_admin()
    or private.is_super_admin()
  );

-- Logs project deletion details before CASCADE delete removes all associated
-- data (weekly_reports/daily_support_logs/daily_release_testing_status are
-- only created further down in SECTIONS 10/13 — that's fine, plpgsql
-- function bodies are not validated against the catalog until they actually
-- run, and by the time this trigger can fire, the whole script will have
-- finished and those tables will exist).
create or replace function public.log_project_deletion()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- Skip last-owner guard while project_members rows cascade away
  perform set_config('app.cascading_project_delete', 'true', true);

  insert into public.project_deletion_audit (
    project_id, project_name, project_code, deleted_by, associated_data_counts, metadata
  )
  select
    old.id,
    old.name,
    old.project_code,
    auth.uid(),
    jsonb_build_object(
      'members', (select count(*) from public.project_members where project_id = old.id),
      'weekly_reports', (select count(*) from public.weekly_reports where project_id = old.id),
      'support_logs', (select count(*) from public.daily_support_logs where project_id = old.id),
      'testing_status', (select count(*) from public.daily_release_testing_status where project_id = old.id)
    ),
    jsonb_build_object('status', old.status, 'created_at', old.created_at, 'created_by', old.created_by, 'tags', old.tags);
  return old;
end;
$$;

drop trigger if exists projects_deletion_audit on public.projects;
create trigger projects_deletion_audit
  before delete on public.projects
  for each row execute function public.log_project_deletion();


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 10: Weekly Reports (QA Weekly Report module)
-- (source: 007_weekly_reports.sql, 021, 031, 034, 044, 059, 075 — 075 is final RLS)
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.weekly_reports (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  week            text not null,
  project         text not null,
  generated_date  timestamptz not null default now(),
  created_by      text not null,
  markdown        text not null,
  form_data       jsonb not null default '{}'::jsonb,
  status          text not null default 'Final',
  created_at      timestamptz not null default now(),
  project_id      uuid references public.projects(id) on delete cascade, -- CASCADE per 044
  team_id         uuid -- DEPRECATED: teams feature removed; no FK (see profiles.team_id note)
);

create index if not exists idx_weekly_reports_project_id on public.weekly_reports(project_id);

alter table public.weekly_reports enable row level security;

drop policy if exists "weekly_reports_select_own"  on public.weekly_reports;
drop policy if exists "weekly_reports_insert_own"  on public.weekly_reports;
drop policy if exists "weekly_reports_update_own"  on public.weekly_reports;
drop policy if exists "weekly_reports_delete_own"  on public.weekly_reports;
drop policy if exists "weekly_reports_select"      on public.weekly_reports;
drop policy if exists "weekly_reports_insert"      on public.weekly_reports;
drop policy if exists "weekly_reports_update"      on public.weekly_reports;
drop policy if exists "weekly_reports_delete"      on public.weekly_reports;
drop policy if exists "weekly_reports_select_team" on public.weekly_reports;
drop policy if exists "weekly_reports_update_team" on public.weekly_reports;
drop policy if exists "weekly_reports_delete_team" on public.weekly_reports;

-- Final policies from 059 + 075 (any project member can see project reports)
create policy "weekly_reports_select_team" on public.weekly_reports
  for select using (
    -- Own reports
    auth.uid() = user_id
    or
    -- Any member of the same project can see the report
    (
      project_id is not null
      and exists (
        select 1 from public.project_members pm
        where pm.user_id = auth.uid()
          and pm.project_id = weekly_reports.project_id
      )
    )
    or
    -- Admins see everything
    private.is_admin()
  );

create policy "weekly_reports_insert_own" on public.weekly_reports
  for insert with check (auth.uid() = user_id);

create policy "weekly_reports_update_team" on public.weekly_reports
  for update using (
    auth.uid() = user_id
    or private.is_admin()
    or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'qa_lead'))
      and exists (
        select 1 from public.project_members pm1
        join public.project_members pm2 on pm1.project_id = pm2.project_id
        where pm1.user_id = auth.uid() and pm2.user_id = weekly_reports.user_id
      )
    )
  );

create policy "weekly_reports_delete_team" on public.weekly_reports
  for delete using (
    auth.uid() = user_id
    or private.is_admin()
    or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'qa_lead'))
      and exists (
        select 1 from public.project_members pm1
        join public.project_members pm2 on pm1.project_id = pm2.project_id
        where pm1.user_id = auth.uid() and pm2.user_id = weekly_reports.user_id
      )
    )
  );


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 11: Login activity tracking
-- (source: 014_login_events.sql, 022_fix_login_events_admin_rls.sql)
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.login_events (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  event_type  text not null check (event_type in ('sign_in', 'sign_up', 'failed')),
  browser     text,
  os          text,
  ip_address  text,
  created_at  timestamptz not null default now()
);

create index if not exists idx_login_events_user_created on public.login_events(user_id, created_at desc);

alter table public.login_events enable row level security;

drop policy if exists "Users can view own login events"   on public.login_events;
drop policy if exists "Users can insert own login events" on public.login_events;
drop policy if exists "Users can delete own login events" on public.login_events;
drop policy if exists "Admins can view all login events"  on public.login_events;

create policy "Users can view own login events" on public.login_events for select using (auth.uid() = user_id);
create policy "Users can insert own login events" on public.login_events for insert with check (auth.uid() = user_id);
create policy "Users can delete own login events" on public.login_events for delete using (auth.uid() = user_id);
-- Final version from 022: widened to super_admin
create policy "Admins can view all login events" on public.login_events for select using (
  exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'super_admin'))
);

-- List concurrent auth sessions for Active Sessions UI (067 / 069 / 070)
drop function if exists public.list_my_sessions();

create or replace function public.list_my_sessions()
returns table (
  id uuid,
  created_at text,
  updated_at text,
  refreshed_at text,
  user_agent text,
  ip text,
  is_current boolean
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_sid uuid;
begin
  if v_uid is null then
    return;
  end if;

  begin
    v_sid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
  exception when others then
    v_sid := null;
  end;

  if v_sid is null then
    begin
      v_sid := nullif(
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'session_id',
        ''
      )::uuid;
    exception when others then
      v_sid := null;
    end;
  end if;

  return query
  select
    s.id,
    s.created_at::text,
    s.updated_at::text,
    s.refreshed_at::text,
    coalesce(s.user_agent::text, ''),
    case when s.ip is null then null else s.ip::text end,
    (v_sid is not null and s.id = v_sid)
  from auth.sessions as s
  where s.user_id = v_uid
  order by coalesce(s.refreshed_at, s.updated_at, s.created_at) desc nulls last;
end;
$$;

revoke all on function public.list_my_sessions() from public;
grant execute on function public.list_my_sessions() to authenticated;

-- Revoke all other sessions for caller (071) — Sign Out All Other Devices
create or replace function public.revoke_my_other_sessions(
  p_current_session_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_uid uuid := auth.uid();
  v_sid uuid;
  v_deleted int := 0;
  v_revoked int := 0;
begin
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  v_sid := p_current_session_id;

  if v_sid is null then
    begin
      v_sid := nullif(auth.jwt() ->> 'session_id', '')::uuid;
    exception when others then
      v_sid := null;
    end;
  end if;

  if v_sid is null then
    begin
      v_sid := nullif(
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'session_id',
        ''
      )::uuid;
    exception when others then
      v_sid := null;
    end;
  end if;

  if v_sid is null then
    raise exception 'Could not determine current session id';
  end if;

  if not exists (
    select 1 from auth.sessions s
    where s.id = v_sid and s.user_id = v_uid
  ) then
    raise exception 'Current session not found for this user';
  end if;

  begin
    update auth.refresh_tokens rt
    set revoked = true, updated_at = now()
    where rt.session_id is not null
      and rt.session_id <> v_sid
      and rt.session_id in (
        select s.id from auth.sessions s
        where s.user_id = v_uid and s.id <> v_sid
      )
      and coalesce(rt.revoked, false) = false;
    get diagnostics v_revoked = row_count;
  exception when others then
    v_revoked := 0;
  end;

  delete from auth.sessions s
  where s.user_id = v_uid
    and s.id <> v_sid;

  get diagnostics v_deleted = row_count;

  return jsonb_build_object(
    'success', true,
    'revoked_sessions', v_deleted,
    'revoked_refresh_tokens', v_revoked,
    'kept_session_id', v_sid
  );
end;
$$;

revoke all on function public.revoke_my_other_sessions(uuid) from public;
grant execute on function public.revoke_my_other_sessions(uuid) to authenticated;

-- Prepare hard-delete of a user (068) — used by admin-permissions edge function
create or replace function public.admin_prepare_user_deletion(
  target_user_id uuid,
  actor_user_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := coalesce(actor_user_id, auth.uid());
  v_actor_role text;
  v_removed_members int := 0;
begin
  if target_user_id is null then
    raise exception 'target_user_id is required';
  end if;

  if coalesce(auth.jwt() ->> 'role', auth.role()) <> 'service_role' then
    if v_actor is null then
      raise exception 'Forbidden';
    end if;
    select role into v_actor_role from public.profiles where id = v_actor;
    if v_actor_role is null or v_actor_role not in ('admin', 'super_admin') then
      raise exception 'Forbidden';
    end if;
  end if;

  if v_actor is not null and v_actor = target_user_id then
    raise exception 'You cannot delete your own account from User Management';
  end if;

  perform set_config('app.admin_deleting_user', 'true', true);

  delete from public.project_members where user_id = target_user_id;
  get diagnostics v_removed_members = row_count;

  begin
    update public.project_members set assigned_by = null where assigned_by = target_user_id;
  exception when undefined_column or undefined_table then
    null;
  end;

  begin
    update public.projects set created_by = null where created_by = target_user_id;
  exception when undefined_column or undefined_table then
    null;
  end;

  return jsonb_build_object('ok', true, 'removed_memberships', v_removed_members);
end;
$$;

revoke all on function public.admin_prepare_user_deletion(uuid, uuid) from public;
grant execute on function public.admin_prepare_user_deletion(uuid, uuid) to service_role;
grant execute on function public.admin_prepare_user_deletion(uuid, uuid) to authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 12: Daily Update Report — dropdown master config
-- (source: 013_daily_update_report.sql, 031, 036, 038, 039_add_issue_source,
--  041_daily_report_testing_status_enhancements.sql)
-- NOTE: category 'status' was renamed to 'testing_status' by migration 041 —
-- this table is created directly with the final 'testing_status' category.
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.daily_report_dropdown_configs (
  id uuid primary key default gen_random_uuid(),
  category text not null, -- 'branch' | 'qa' | 'testing_status' | 'retesting_status' | 'smoke_status' | 'issue_source'
  value text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  team_id uuid, -- DEPRECATED: teams feature removed; no FK (see profiles.team_id note)
  unique (category, value)
);

comment on table public.daily_report_dropdown_configs is
  'Master dropdown configuration values for Daily Report module. Categories: branch, qa, testing_status, retesting_status, smoke_status, issue_source. Still used by /qa-report''s testing_status + priority dropdowns; the Daily Report side migrated to per-column dropdown_options in migration 056/057.';

alter table public.daily_report_dropdown_configs enable row level security;

drop policy if exists "daily_report_configs_select"     on public.daily_report_dropdown_configs;
drop policy if exists "daily_report_configs_all_admin"  on public.daily_report_dropdown_configs;
drop policy if exists "daily_report_configs_write"      on public.daily_report_dropdown_configs;

-- Final SELECT from 036_remove_teams.sql (team_id retained only as legacy column, not used for scoping anymore)
create policy "daily_report_configs_select" on public.daily_report_dropdown_configs for select using (
  team_id is null or private.is_admin()
);

-- Final WRITE policy from 038_fix_daily_report_config_permissions.sql
create policy "daily_report_configs_write" on public.daily_report_dropdown_configs for all using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin'
        or private.is_admin()
        or private.check_module_permission(p.role, 'daily-report', 'can_configure')
      )
  )
);


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 13: Daily Update Report — Support & Exception Log / Release Testing Log
-- (source: 013, 031, 034, 039_add_issue_source_column.sql,
--  041_daily_report_testing_status_enhancements.sql — renamed status ->
--  testing_status, 042_daily_report_project_role_access.sql — final RLS,
--  044 — CASCADE FK)
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.daily_support_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  support_id text,
  bug_id text,
  branch text,
  description text,
  received_date date,
  qa text,
  tc_count integer,
  estimation_hrs numeric,
  actual_start_date date,
  planned_end_date date,
  actual_end_date date,
  testing_status text, -- renamed from `status` in migration 041
  comments text,
  blocked_hours numeric,
  retesting_status text,
  retesting_estimation_hrs numeric,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  team_id uuid, -- DEPRECATED: teams feature removed; no FK (see profiles.team_id note)
  project_id uuid references public.projects(id) on delete cascade, -- CASCADE per 044
  issue_source text -- 039_add_issue_source_column.sql
);

create index if not exists idx_daily_support_logs_project_id     on public.daily_support_logs(project_id);
create index if not exists idx_daily_support_logs_issue_source   on public.daily_support_logs(issue_source);
create index if not exists idx_daily_support_logs_testing_status on public.daily_support_logs(testing_status);

comment on column public.daily_support_logs.testing_status is
  'Testing status of the support task (e.g., Passed, Failed, Blocked, In Progress). Uses testing_status dropdown config.';
comment on column public.daily_support_logs.issue_source is
  'Source/origin of the issue: Missed by QA, Backend Update, Customer Reported, Internal Testing, Production, etc.';

alter table public.daily_support_logs enable row level security;

drop policy if exists "daily_support_logs_all_auth" on public.daily_support_logs;
drop policy if exists "daily_support_logs_select"   on public.daily_support_logs;
drop policy if exists "daily_support_logs_insert"   on public.daily_support_logs;
drop policy if exists "daily_support_logs_update"   on public.daily_support_logs;
drop policy if exists "daily_support_logs_delete"   on public.daily_support_logs;

-- Final policies from 042_daily_report_project_role_access.sql
create policy "daily_support_logs_select" on public.daily_support_logs for select using (
  private.is_admin()
  or user_id = auth.uid()
  or (project_id is not null and private.is_project_member(project_id))
  or (project_id is null and team_id is null)
);
create policy "daily_support_logs_insert" on public.daily_support_logs for insert with check (
  auth.uid() = user_id
  and (private.is_admin() or project_id is null or private.can_edit_in_project(project_id))
);
create policy "daily_support_logs_update" on public.daily_support_logs for update using (
  private.is_admin()
  or (project_id is not null and private.is_project_member(project_id) and private.can_edit_in_project(project_id))
  or (project_id is null and user_id = auth.uid())
);
create policy "daily_support_logs_delete" on public.daily_support_logs for delete using (
  private.is_admin()
  or (project_id is not null and private.is_project_member(project_id) and private.can_edit_in_project(project_id))
  or (project_id is null and user_id = auth.uid())
);

create table if not exists public.daily_release_testing_status (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete cascade,
  task_id text,
  description text,
  qa text,
  initial_round_estimation_hrs numeric,
  smoke_testing_status text,
  scope_of_testing_for_smoke text,
  smoke_testing_estimation_hrs numeric,
  overall_scope_of_testing text,
  overall_estimation_hrs numeric,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  team_id uuid, -- DEPRECATED: teams feature removed; no FK (see profiles.team_id note)
  project_id uuid references public.projects(id) on delete cascade, -- CASCADE per 044
  testing_status text -- added in migration 041 (in addition to smoke_testing_status)
);

create index if not exists idx_daily_release_testing_status_project_id      on public.daily_release_testing_status(project_id);
create index if not exists idx_daily_release_testing_status_testing_status on public.daily_release_testing_status(testing_status);

comment on column public.daily_release_testing_status.testing_status is
  'Centralized testing status field (e.g., Passed, Failed, Blocked, In Progress). Uses testing_status dropdown config.';

alter table public.daily_release_testing_status enable row level security;

drop policy if exists "daily_release_testing_status_all_auth" on public.daily_release_testing_status;
drop policy if exists "daily_release_testing_status_select"   on public.daily_release_testing_status;
drop policy if exists "daily_release_testing_status_insert"   on public.daily_release_testing_status;
drop policy if exists "daily_release_testing_status_update"   on public.daily_release_testing_status;
drop policy if exists "daily_release_testing_status_delete"   on public.daily_release_testing_status;

create policy "daily_release_testing_status_select" on public.daily_release_testing_status for select using (
  private.is_admin()
  or user_id = auth.uid()
  or (project_id is not null and private.is_project_member(project_id))
  or (project_id is null and team_id is null)
);
create policy "daily_release_testing_status_insert" on public.daily_release_testing_status for insert with check (
  auth.uid() = user_id
  and (private.is_admin() or project_id is null or private.can_edit_in_project(project_id))
);
create policy "daily_release_testing_status_update" on public.daily_release_testing_status for update using (
  private.is_admin()
  or (project_id is not null and private.is_project_member(project_id) and private.can_edit_in_project(project_id))
  or (project_id is null and user_id = auth.uid())
);
create policy "daily_release_testing_status_delete" on public.daily_release_testing_status for delete using (
  private.is_admin()
  or (project_id is not null and private.is_project_member(project_id) and private.can_edit_in_project(project_id))
  or (project_id is null and user_id = auth.uid())
);

grant execute on function private.get_user_project_role(uuid) to authenticated;
grant execute on function private.can_edit_in_project(uuid)   to authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 14: Daily Update Report — Dynamic column customization
-- (source: 056_daily_report_dynamic_columns.sql, 057, 058)
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.daily_report_column_configs (
  id                    uuid primary key default gen_random_uuid(),
  project_id            uuid references public.projects(id) on delete cascade, -- NULL = Organization Default
  table_key             text not null check (table_key in ('support', 'release')),
  internal_key          text not null,
  display_name          text not null,
  column_type           text not null default 'short_text' check (column_type in (
                           'short_text', 'long_text', 'number', 'percentage', 'date', 'datetime',
                           'dropdown', 'multiselect', 'status', 'boolean', 'user', 'url'
                         )),
  description           text,
  placeholder            text,
  is_required            boolean not null default false,
  is_visible             boolean not null default true,
  is_system              boolean not null default false,
  include_in_qa_report   boolean not null default true,
  include_in_export      boolean not null default true,
  default_value          text,
  dropdown_options       jsonb not null default '[]'::jsonb,
  config_category        text, -- DEPRECATED (migration 057): no longer read by the frontend
  display_order          integer not null default 0,
  dashboard_role         text check (dashboard_role in ('testing_status', 'smoke_status')), -- 058
  created_by             uuid references public.profiles(id) on delete set null,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

create unique index if not exists uq_column_configs_org
  on public.daily_report_column_configs (table_key, internal_key)
  where project_id is null;

create unique index if not exists uq_column_configs_project
  on public.daily_report_column_configs (project_id, table_key, internal_key)
  where project_id is not null;

create index if not exists idx_column_configs_project_table
  on public.daily_report_column_configs (project_id, table_key);

create unique index if not exists uq_column_configs_dashboard_role_org
  on public.daily_report_column_configs (table_key, dashboard_role)
  where project_id is null and dashboard_role is not null;

create unique index if not exists uq_column_configs_dashboard_role_project
  on public.daily_report_column_configs (project_id, table_key, dashboard_role)
  where project_id is not null and dashboard_role is not null;

drop trigger if exists column_configs_updated_at on public.daily_report_column_configs;
create trigger column_configs_updated_at
  before update on public.daily_report_column_configs
  for each row execute function public.set_updated_at();

create table if not exists public.daily_report_custom_field_values (
  id            uuid primary key default gen_random_uuid(),
  row_id        uuid not null,
  table_key     text not null check (table_key in ('support', 'release')),
  column_id     uuid not null references public.daily_report_column_configs(id) on delete cascade,
  value         jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (row_id, column_id)
);

create index if not exists idx_custom_field_values_row    on public.daily_report_custom_field_values (row_id, table_key);
create index if not exists idx_custom_field_values_column on public.daily_report_custom_field_values (column_id);

drop trigger if exists custom_field_values_updated_at on public.daily_report_custom_field_values;
create trigger custom_field_values_updated_at
  before update on public.daily_report_custom_field_values
  for each row execute function public.set_updated_at();

create table if not exists public.daily_report_column_mappings (
  id             uuid primary key default gen_random_uuid(),
  project_id     uuid references public.projects(id) on delete cascade,
  table_key      text not null check (table_key in ('support', 'release')),
  dup_column_id  uuid not null references public.daily_report_column_configs(id) on delete cascade,
  action         text not null default 'skip' check (action in ('map_existing', 'create_new', 'skip')),
  target_field   text,
  created_by     uuid references public.profiles(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create unique index if not exists uq_column_mappings_org
  on public.daily_report_column_mappings (table_key, dup_column_id)
  where project_id is null;

create unique index if not exists uq_column_mappings_project
  on public.daily_report_column_mappings (project_id, table_key, dup_column_id)
  where project_id is not null;

drop trigger if exists column_mappings_updated_at on public.daily_report_column_mappings;
create trigger column_mappings_updated_at
  before update on public.daily_report_column_mappings
  for each row execute function public.set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────

alter table public.daily_report_column_configs ENABLE ROW LEVEL SECURITY;
alter table public.daily_report_custom_field_values ENABLE ROW LEVEL SECURITY;
alter table public.daily_report_column_mappings ENABLE ROW LEVEL SECURITY;

drop policy if exists "column_configs_select" on public.daily_report_column_configs;
drop policy if exists "column_configs_write"  on public.daily_report_column_configs;

create policy "column_configs_select" on public.daily_report_column_configs for select using (
  auth.uid() is not null
);

create policy "column_configs_write" on public.daily_report_column_configs for all using (
  private.is_admin()
  or (
    project_id is null and exists (
      select 1 from public.profiles p where p.id = auth.uid()
        and private.check_module_permission(p.role, 'daily-report', 'can_manage_org_config')
    )
  )
  or (
    project_id is not null and (
      private.is_project_owner_or_lead(project_id)
      or exists (
        select 1 from public.profiles p where p.id = auth.uid()
          and private.check_module_permission(p.role, 'daily-report', 'can_manage_project_config')
      )
    )
  )
) with check (
  private.is_admin()
  or (
    project_id is null and exists (
      select 1 from public.profiles p where p.id = auth.uid()
        and private.check_module_permission(p.role, 'daily-report', 'can_manage_org_config')
    )
  )
  or (
    project_id is not null and (
      private.is_project_owner_or_lead(project_id)
      or exists (
        select 1 from public.profiles p where p.id = auth.uid()
          and private.check_module_permission(p.role, 'daily-report', 'can_manage_project_config')
      )
    )
  )
);

drop policy if exists "custom_field_values_select" on public.daily_report_custom_field_values;
drop policy if exists "custom_field_values_write"  on public.daily_report_custom_field_values;

create policy "custom_field_values_select" on public.daily_report_custom_field_values for select using (
  (table_key = 'support' and exists (select 1 from public.daily_support_logs r where r.id = row_id))
  or (table_key = 'release' and exists (select 1 from public.daily_release_testing_status r where r.id = row_id))
);

create policy "custom_field_values_write" on public.daily_report_custom_field_values for all using (
  (
    (table_key = 'support' and exists (select 1 from public.daily_support_logs r where r.id = row_id))
    or (table_key = 'release' and exists (select 1 from public.daily_release_testing_status r where r.id = row_id))
  )
  and exists (
    select 1 from public.profiles p where p.id = auth.uid()
      and (p.role in ('admin', 'super_admin') or private.check_module_permission(p.role, 'daily-report', 'can_edit'))
  )
) with check (
  (
    (table_key = 'support' and exists (select 1 from public.daily_support_logs r where r.id = row_id))
    or (table_key = 'release' and exists (select 1 from public.daily_release_testing_status r where r.id = row_id))
  )
  and exists (
    select 1 from public.profiles p where p.id = auth.uid()
      and (p.role in ('admin', 'super_admin') or private.check_module_permission(p.role, 'daily-report', 'can_edit'))
  )
);

drop policy if exists "column_mappings_select" on public.daily_report_column_mappings;
drop policy if exists "column_mappings_write"  on public.daily_report_column_mappings;

create policy "column_mappings_select" on public.daily_report_column_mappings for select using (
  auth.uid() is not null
);

create policy "column_mappings_write" on public.daily_report_column_mappings for all using (
  private.is_admin()
  or (
    project_id is null and exists (
      select 1 from public.profiles p where p.id = auth.uid()
        and private.check_module_permission(p.role, 'daily-report', 'can_manage_org_config')
    )
  )
  or (
    project_id is not null and (
      private.is_project_owner_or_lead(project_id)
      or exists (
        select 1 from public.profiles p where p.id = auth.uid()
          and private.check_module_permission(p.role, 'daily-report', 'can_manage_project_config')
      )
    )
  )
) with check (
  private.is_admin()
  or (
    project_id is null and exists (
      select 1 from public.profiles p where p.id = auth.uid()
        and private.check_module_permission(p.role, 'daily-report', 'can_manage_org_config')
    )
  )
  or (
    project_id is not null and (
      private.is_project_owner_or_lead(project_id)
      or exists (
        select 1 from public.profiles p where p.id = auth.uid()
          and private.check_module_permission(p.role, 'daily-report', 'can_manage_project_config')
      )
    )
  )
);


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 15: Team Capacity
--
-- DISCREPANCY NOTE: 030_team_capacity.sql's team_capacity_reports.report_id
-- referenced public.qa_weekly_reports(id), a table that is never created
-- anywhere in this codebase and never queried by any application code (the
-- real historical/report table is `weekly_reports`). That FK is DROPPED here
-- so this table can actually be created on a fresh database. Additionally,
-- neither team_capacity_reports nor team_capacity_members is queried by any
-- current frontend code (confirmed via grep across src/) — flagged as
-- POTENTIALLY UNUSED. Included for schema completeness / data preservation
-- since a genuine "Team Capacity" UI (TeamCapacityModal, TeamCapacityUpload,
-- TeamCapacityDisplay) exists and may persist data through a path not
-- captured by this audit.
-- (source: 030_team_capacity.sql)
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.team_capacity_reports (
  id UUID primary key default gen_random_uuid(),
  report_id UUID, -- historically referenced a non-existent qa_weekly_reports table; FK intentionally omitted (see note above)
  uploaded_by UUID references auth.users(id) on delete set null,
  file_name TEXT not null,
  upload_date TIMESTAMPTZ not null default now(),
  period_start DATE,
  period_end DATE,
  total_members INTEGER not null,
  available_members INTEGER not null,
  on_leave_members INTEGER not null,
  no_logs_members INTEGER not null,
  average_hours NUMERIC(5,1) not null,
  estimated_capacity_percent INTEGER not null,
  ai_summary TEXT,
  created_at TIMESTAMPTZ not null default now(),
  updated_at TIMESTAMPTZ not null default now()
);

create table if not exists public.team_capacity_members (
  id UUID primary key default gen_random_uuid(),
  capacity_report_id UUID not null references public.team_capacity_reports(id) on delete cascade,
  member_name TEXT not null,
  logged_hours NUMERIC(6,2) not null default 0,
  leave_hours NUMERIC(6,2) not null default 0,
  status TEXT not null check (status in ('available', 'on-leave', 'no-logs')),
  created_at TIMESTAMPTZ not null default now()
);

create index if not exists idx_team_capacity_reports_report_id    on public.team_capacity_reports(report_id);
create index if not exists idx_team_capacity_reports_uploaded_by  on public.team_capacity_reports(uploaded_by);
create index if not exists idx_team_capacity_reports_upload_date  on public.team_capacity_reports(upload_date desc);
create index if not exists idx_team_capacity_members_report       on public.team_capacity_members(capacity_report_id);
create index if not exists idx_team_capacity_members_status       on public.team_capacity_members(status);

alter table public.team_capacity_reports enable row level security;
alter table public.team_capacity_members enable row level security;

drop policy if exists "Users can view team capacity reports"      on public.team_capacity_reports;
drop policy if exists "Users can create team capacity reports"    on public.team_capacity_reports;
drop policy if exists "Users can update their own capacity reports" on public.team_capacity_reports;
drop policy if exists "Users can delete their own capacity reports" on public.team_capacity_reports;
drop policy if exists "Users can view capacity member data"       on public.team_capacity_members;
drop policy if exists "Users can insert capacity member data"     on public.team_capacity_members;

create policy "Users can view team capacity reports" on public.team_capacity_reports
  for select to authenticated using (true);
create policy "Users can create team capacity reports" on public.team_capacity_reports
  for insert to authenticated with check (uploaded_by = auth.uid());
create policy "Users can update their own capacity reports" on public.team_capacity_reports
  for update to authenticated using (uploaded_by = auth.uid()) with check (uploaded_by = auth.uid());
create policy "Users can delete their own capacity reports" on public.team_capacity_reports
  for delete to authenticated using (uploaded_by = auth.uid());

create policy "Users can view capacity member data" on public.team_capacity_members
  for select to authenticated using (true);
create policy "Users can insert capacity member data" on public.team_capacity_members
  for insert to authenticated with check (
    exists (select 1 from public.team_capacity_reports where id = capacity_report_id and uploaded_by = auth.uid())
  );

create or replace function public.update_team_capacity_updated_at()
returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

drop trigger if exists trigger_update_team_capacity_reports_updated_at on public.team_capacity_reports;
create trigger trigger_update_team_capacity_reports_updated_at
  before update on public.team_capacity_reports
  for each row execute function public.update_team_capacity_updated_at();


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 16: Announcements
-- (source: 015, 016, 017_announcements_rls_rbac.sql, 020, 027 — route moved
--  to /admin/announcements)
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.announcements (
    id              UUID primary key default gen_random_uuid(),
    title           TEXT not null,
    description     TEXT not null,
    priority        TEXT not null default 'medium' check (priority in ('critical', 'high', 'medium', 'low')),
    category        TEXT not null default 'general' check (category in ('general', 'maintenance', 'feature', 'security', 'policy', 'event')),
    status          TEXT not null default 'draft' check (status in ('draft', 'published', 'archived')),
    is_pinned       BOOLEAN not null default false,
    requires_ack    BOOLEAN not null default false,
    audience        TEXT not null default 'all' check (audience in ('all', 'admin', 'pro', 'free')),
    publish_date    TIMESTAMPTZ,
    expiry_date     TIMESTAMPTZ,
    attachment_url  TEXT,
    attachment_name TEXT,
    external_link   TEXT,
    author_id       UUID references auth.users(id) on delete set null,
    author_name     TEXT,
    created_at      TIMESTAMPTZ not null default now(),
    updated_at      TIMESTAMPTZ not null default now()
);

create index if not exists idx_announcements_active on public.announcements(status, publish_date desc) where status = 'published';
create index if not exists idx_announcements_expiry on public.announcements(expiry_date) where expiry_date is not null;

create table if not exists public.announcement_reads (
    id              UUID primary key default gen_random_uuid(),
    announcement_id UUID not null references public.announcements(id) on delete cascade,
    user_id         UUID not null references auth.users(id) on delete cascade,
    read_at         TIMESTAMPTZ not null default now(),
    unique(announcement_id, user_id)
);

create index if not exists idx_announcement_reads_announcement on public.announcement_reads(announcement_id);
create index if not exists idx_announcement_reads_user         on public.announcement_reads(user_id);

create table if not exists public.announcement_acknowledgements (
    id              UUID primary key default gen_random_uuid(),
    announcement_id UUID not null references public.announcements(id) on delete cascade,
    user_id         UUID not null references auth.users(id) on delete cascade,
    acknowledged_at TIMESTAMPTZ not null default now(),
    unique(announcement_id, user_id)
);

create index if not exists idx_announcement_acks_announcement on public.announcement_acknowledgements(announcement_id);

alter table public.announcements enable row level security;
alter table public.announcement_reads enable row level security;
alter table public.announcement_acknowledgements enable row level security;

drop policy if exists "Users can view published announcements"     on public.announcements;
drop policy if exists "Admins can view all announcements"          on public.announcements;
drop policy if exists "Admins can insert announcements"            on public.announcements;
drop policy if exists "Admins can update announcements"            on public.announcements;
drop policy if exists "Admins can delete announcements"            on public.announcements;
drop policy if exists "Users can view announcements based on audience" on public.announcements;
drop policy if exists "Users can create announcements with permission" on public.announcements;
drop policy if exists "Users can edit their own announcements or admins edit any" on public.announcements;
drop policy if exists "Only admins can delete announcements"       on public.announcements;

-- Final policies from 017_announcements_rls_rbac.sql, widened to super_admin per 020
create policy "Users can view announcements based on audience" on public.announcements
  for select using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
    or (
      status = 'published'
      and (audience = 'all' or audience = (select role from public.profiles where id = auth.uid()))
    )
    or author_id = auth.uid()
  );

create policy "Users can create announcements with permission" on public.announcements
  for insert with check (auth.uid() is not null);

create policy "Users can edit their own announcements or admins edit any" on public.announcements
  for update using (
    author_id = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
  );

create policy "Only admins can delete announcements" on public.announcements
  for delete using (
    exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
  );

grant select, insert, update on public.announcements to authenticated;
grant delete on public.announcements to authenticated;

create or replace function public.set_announcement_author()
returns trigger as $$
begin
  new.author_id := auth.uid();
  if TG_OP = 'INSERT' then new.created_at := now(); end if;
  new.updated_at := now();
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists set_announcement_author_trigger on public.announcements;
create trigger set_announcement_author_trigger
  before insert or update on public.announcements
  for each row execute function public.set_announcement_author();

drop policy if exists "Users can view their own reads"    on public.announcement_reads;
drop policy if exists "Users can create their own reads"  on public.announcement_reads;
drop policy if exists "Admins can view all reads"         on public.announcement_reads;

create policy "Users can view their own reads" on public.announcement_reads for select using (user_id = auth.uid());
create policy "Users can create their own reads" on public.announcement_reads for insert with check (user_id = auth.uid());
create policy "Admins can view all reads" on public.announcement_reads for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
);

drop policy if exists "Users can view their own acks"     on public.announcement_acknowledgements;
drop policy if exists "Users can create their own acks"   on public.announcement_acknowledgements;
drop policy if exists "Admins can view all acknowledgements" on public.announcement_acknowledgements;

create policy "Users can view their own acks" on public.announcement_acknowledgements for select using (user_id = auth.uid());
create policy "Users can create their own acks" on public.announcement_acknowledgements for insert with check (user_id = auth.uid());
create policy "Admins can view all acknowledgements" on public.announcement_acknowledgements for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
);

grant select, insert on public.announcement_reads to authenticated;
grant select, insert on public.announcement_acknowledgements to authenticated;


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 17: Maintenance mode (role-based)
-- (source: 024_maintenance_mode.sql)
-- Realtime required: src/App.tsx subscribes to postgres_changes UPDATE
-- events on this table to live-refresh the maintenance banner.
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.maintenance_config (
  id              UUID primary key default gen_random_uuid(),
  enabled         BOOLEAN not null default false,
  maintenance_type TEXT not null default 'full_lock' check (maintenance_type in ('full_lock', 'custom_message')),
  reason          TEXT default 'Scheduled maintenance in progress.',
  start_time      TIMESTAMPTZ,
  end_time        TIMESTAMPTZ,
  locked_roles    TEXT[] not null default '{}',
  allowed_roles   TEXT[] not null default '{super_admin,admin}',
  show_countdown  BOOLEAN not null default true,
  show_branding   BOOLEAN not null default true,
  support_email   TEXT default 'support@company.com',
  custom_message  TEXT,
  updated_by      UUID references auth.users(id) on delete set null,
  updated_at      TIMESTAMPTZ not null default now(),
  created_at      TIMESTAMPTZ not null default now()
);

insert into public.maintenance_config (id, enabled, locked_roles, allowed_roles)
values ('00000000-0000-0000-0000-000000000001', false, '{}', '{super_admin,admin}')
on conflict (id) do nothing;

alter table public.maintenance_config enable row level security;

drop policy if exists "Anyone can read maintenance config"     on public.maintenance_config;
drop policy if exists "Admins can update maintenance config"   on public.maintenance_config;
drop policy if exists "Admins can insert maintenance config"   on public.maintenance_config;

create policy "Anyone can read maintenance config" on public.maintenance_config for select using (true);
create policy "Admins can update maintenance config" on public.maintenance_config for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
);
create policy "Admins can insert maintenance config" on public.maintenance_config for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
);

-- Enable Realtime for maintenance_config (required by src/App.tsx's
-- `.channel('maintenance_config_changes')` subscription). Guarded so this is
-- a no-op if the table is already part of the publication (e.g. re-run).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'maintenance_config'
  ) then
    alter publication supabase_realtime add table public.maintenance_config;
  end if;
exception when undefined_object then
  -- supabase_realtime publication does not exist in this environment; skip.
  null;
end $$;


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 17B: Centralised AI platform config (kill-switch + allowlist)
-- (source: 072_ai_platform_config.sql, 073_ai_platform_allowed_users.sql)
-- Realtime required: src/App.tsx subscribes to postgres_changes UPDATE
-- events on this table to live-refresh AI availability.
-- allowed_user_ids: empty = admins only; non-empty = those users (+ admins).
-- ══════════════════════════════════════════════════════════════════════════════

create table if not exists public.ai_platform_config (
  id          UUID primary key default gen_random_uuid(),
  enabled     BOOLEAN not null default true,
  allowed_user_ids UUID[] not null default '{}',
  updated_by  UUID references auth.users(id) on delete set null,
  updated_at  TIMESTAMPTZ not null default now(),
  created_at  TIMESTAMPTZ not null default now()
);

-- Forward-compat for DBs that already have the table without the allowlist column
-- (source: 073_ai_platform_allowed_users.sql)
alter table public.ai_platform_config
  add column if not exists allowed_user_ids UUID[] not null default '{}';

comment on column public.ai_platform_config.allowed_user_ids is
  'User IDs allowed to use AI while Centralised AI is enabled. Empty = admins only. Admin/super_admin always bypass.';

insert into public.ai_platform_config (id, enabled)
values ('00000000-0000-0000-0000-000000000001', true)
on conflict (id) do nothing;

alter table public.ai_platform_config enable row level security;

drop policy if exists "Anyone can read ai platform config"   on public.ai_platform_config;
drop policy if exists "Admins can update ai platform config" on public.ai_platform_config;
drop policy if exists "Admins can insert ai platform config" on public.ai_platform_config;

create policy "Anyone can read ai platform config" on public.ai_platform_config for select using (true);
create policy "Admins can update ai platform config" on public.ai_platform_config for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
);
create policy "Admins can insert ai platform config" on public.ai_platform_config for insert with check (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin', 'super_admin'))
);

grant select on table public.ai_platform_config to anon, authenticated;
grant update, insert on table public.ai_platform_config to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'ai_platform_config'
  ) then
    alter publication supabase_realtime add table public.ai_platform_config;
  end if;
exception when undefined_object then
  null;
end $$;


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 18: Seed data — roles, modules, permissions, role_module_permissions
-- (source: 003, 008, 009, 013, 016, 023, 026, 028, 035, 056 reconciled to
--  their FINAL cumulative state)
-- ══════════════════════════════════════════════════════════════════════════════

-- ── Roles (003 + 008) ──────────────────────────────────────────────────────

insert into public.roles (role_key, role_name, description, is_system, priority) values
  ('admin',        'Administrator',  'Full platform access. Manages users, permissions, AI settings.', true,  10),
  ('pro',          'Pro User',       'Access to premium modules, advanced AI, and export features.',   true,  50),
  ('free',         'Free User',      'Access to basic modules with limited AI usage.',                 true,  90),
  ('super_admin',  'Super Admin',    'Unrestricted access. Can manage all roles and users.',           true,  1),
  ('manager',      'Manager',        'Team management, reports, and approval workflows.',              false, 20),
  ('qa_lead',      'QA Lead',        'Leads QA team, manages test plans and reports.',                 false, 30),
  ('qa_engineer',  'QA Engineer',    'Creates and runs test cases, bug reports, and AI summaries.',     false, 40),
  ('developer',    'Developer',      'Access to bug refiner, test generator, and code tools.',         false, 45),
  ('standard',     'Standard User',  'Standard access to core modules.',                               false, 60),
  ('guest',        'Guest',          'Read-only access to shared content.',                            false, 95)
on conflict (role_key) do nothing;

do $$
declare
  r_super uuid; r_admin uuid; r_manager uuid; r_qa_lead uuid; r_qa_eng uuid;
begin
  select id into r_super   from public.roles where role_key = 'super_admin';
  select id into r_admin   from public.roles where role_key = 'admin';
  select id into r_manager from public.roles where role_key = 'manager';
  select id into r_qa_lead from public.roles where role_key = 'qa_lead';
  select id into r_qa_eng  from public.roles where role_key = 'qa_engineer';

  update public.roles set inherits_from = r_super   where role_key = 'admin';
  update public.roles set inherits_from = r_admin   where role_key = 'manager';
  update public.roles set inherits_from = r_manager where role_key = 'qa_lead';
  update public.roles set inherits_from = r_qa_lead where role_key = 'qa_engineer';
end $$;

-- ── Modules (final set after 003, 009, 013, 016/027, 028 removal, 034/035) ──
-- NOTE: 'prompt-settings' and 'analytics' were seeded in 003 but removed in
-- 028 as never-implemented; they are intentionally excluded here.

insert into public.modules (module_key, module_name, route_path, icon, sort_order) values
  ('dashboard',          'Dashboard',            '/dashboard',              'LayoutDashboard', 0),
  ('bug-refiner',        'AI Bug Refiner',        '/bug-refiner',            'Bug',             1),
  ('test-generator',     'Test Case Generator',   '/test-generator',        'FileText',        2),
  ('writing-assistant',  'Writing Assistant',     '/writing-assistant',     'PenTool',         3),
  ('qa-report',          'QA Weekly Report',      '/qa-report',              'ClipboardList',   3),
  ('history',            'History',               '/history',                'History',         4),
  ('daily-report',       'Daily Update Report',   '/daily-report',           'ClipboardCheck',  4),
  ('settings',           'Settings',              '/settings',               'Settings',        5),
  ('admin',              'Admin Panel',           '/admin',                  'Shield',          6),
  ('ai-settings',        'AI Settings',           '/admin/ai-settings',      'Cpu',             7),
  ('user-management',    'User Management',       '/admin/users',            'Users',           10),
  ('announcements',      'Announcements',         '/admin/announcements',    'Megaphone',       11),
  ('project-hub',        'Project Hub',           '/project-hub',            'FolderKanban',    15)
on conflict (module_key) do update set
  module_name = excluded.module_name,
  route_path  = excluded.route_path,
  icon        = excluded.icon,
  sort_order  = excluded.sort_order;

-- ── Permissions (final set after 003, 016, 023 can_manage->can_configure, 035, 056) ──
-- NOTE: 'can_manage' was renamed to 'can_configure' by migration 023 and is
-- intentionally excluded here (only 'can_configure' is seeded).

insert into public.permissions (permission_key, permission_name, description) values
  ('can_view',                  'View',                        'Can view/access the module'),
  ('can_create',                'Create',                      'Can create new items'),
  ('can_edit',                  'Edit',                        'Can edit existing items'),
  ('can_delete',                'Delete',                      'Can delete items'),
  ('can_export',                'Export',                      'Can export data (Jira, Slack, CSV)'),
  ('can_generate_ai',           'Generate AI',                 'Can use AI generation features'),
  ('can_configure',             'Configure',                   'Can modify module settings and configurations'),
  ('can_use_advanced_ai',       'Advanced AI',                 'Can use advanced/premium AI models'),
  ('can_share',                 'Share',                       'Can share items with others or external stakeholders'),
  ('can_assign_members',        'Can Assign Members',          'Add/remove members to/from projects'),
  ('can_manage_roles',          'Can Manage Roles',            'Change project roles for members'),
  ('can_manage_columns',        'Manage Columns',               'Can open the Customize QA Daily Update Columns interface'),
  ('can_add_columns',           'Add Custom Columns',          'Can add new custom columns to the QA Daily Update table'),
  ('can_rename_columns',        'Rename Columns',              'Can rename the display label of existing columns'),
  ('can_reorder_columns',       'Reorder Columns',             'Can reorder columns via drag-and-drop'),
  ('can_hide_show_columns',     'Hide/Show Columns',           'Can toggle column visibility'),
  ('can_delete_custom_columns', 'Delete Custom Columns',       'Can permanently delete custom (non-system) columns'),
  ('can_manage_org_config',     'Manage Organization Config',  'Can manage the organization-wide default column configuration'),
  ('can_manage_project_config', 'Manage Project Config',       'Can manage the column configuration for a specific project')
on conflict (permission_key) do nothing;

-- ── Departments & plans (008) ──────────────────────────────────────────────

insert into public.departments (name) values
  ('QA'), ('Development'), ('Management'), ('Support'), ('HR'), ('Finance'), ('Operations')
on conflict (name) do nothing;

insert into public.plans (plan_key, plan_name, sort_order) values
  ('enterprise',   'Enterprise',   1),
  ('business',     'Business',     2),
  ('professional', 'Professional', 3),
  ('standard',     'Standard',     4),
  ('free',         'Free',         5),
  ('trial',        'Trial',        6)
on conflict (plan_key) do nothing;

insert into public.permission_templates (name, description, config) values
  ('Administrator', 'Full access to all modules', '{"preset":"admin"}'),
  ('Manager',       'Manage team, view reports, approve actions', '{"preset":"manager"}'),
  ('Developer',     'Bug refiner, test generator, writing assistant', '{"preset":"developer"}'),
  ('QA Engineer',   'Test cases, bug reports, AI summaries, history', '{"preset":"qa_engineer"}'),
  ('Viewer',        'Read-only access to all visible modules', '{"preset":"viewer"}'),
  ('Client',        'View shared reports and dashboards only', '{"preset":"client"}'),
  ('Guest',         'Minimal read-only access', '{"preset":"guest"}')
on conflict (name) do nothing;

-- ── role_module_permissions matrix ──────────────────────────────────────────
-- Base matrix follows 026_cleanup_module_permissions.sql (the last full
-- rebuild — it DELETEd and reseeded everything with only meaningful
-- permissions per module), then layers on 035 (project-hub) and 056
-- (daily-report column-management permissions). Enterprise (non-system)
-- roles default to false across the board (deny-by-default), matching 026's
-- final loop. NOTE: 'ai-settings' and 'user-management' modules are
-- intentionally left unseeded here — no migration ever seeded
-- role_module_permissions for them either; those admin-only routes are
-- gated directly by role === 'admin' checks in the frontend, not the
-- permission matrix (preserved as-is as a discrepancy, not assumed away).

do $$
declare
  r_admin uuid; r_super_admin uuid; r_pro uuid; r_free uuid;
  m_dashboard uuid; m_bug uuid; m_test uuid; m_writing uuid;
  m_qa_report uuid; m_daily uuid; m_settings uuid; m_admin uuid;
  m_announcements uuid; m_history uuid;

  p_view uuid; p_create uuid; p_edit uuid; p_delete uuid;
  p_export uuid; p_gen_ai uuid; p_adv_ai uuid; p_share uuid; p_configure uuid;
begin
  select id into r_admin       from public.roles where role_key = 'admin';
  select id into r_super_admin from public.roles where role_key = 'super_admin';
  select id into r_pro         from public.roles where role_key = 'pro';
  select id into r_free        from public.roles where role_key = 'free';

  select id into m_dashboard     from public.modules where module_key = 'dashboard';
  select id into m_bug           from public.modules where module_key = 'bug-refiner';
  select id into m_test          from public.modules where module_key = 'test-generator';
  select id into m_writing       from public.modules where module_key = 'writing-assistant';
  select id into m_qa_report     from public.modules where module_key = 'qa-report';
  select id into m_daily         from public.modules where module_key = 'daily-report';
  select id into m_settings      from public.modules where module_key = 'settings';
  select id into m_admin         from public.modules where module_key = 'admin';
  select id into m_announcements from public.modules where module_key = 'announcements';
  select id into m_history       from public.modules where module_key = 'history';

  select id into p_view      from public.permissions where permission_key = 'can_view';
  select id into p_create    from public.permissions where permission_key = 'can_create';
  select id into p_edit      from public.permissions where permission_key = 'can_edit';
  select id into p_delete    from public.permissions where permission_key = 'can_delete';
  select id into p_export    from public.permissions where permission_key = 'can_export';
  select id into p_gen_ai    from public.permissions where permission_key = 'can_generate_ai';
  select id into p_adv_ai    from public.permissions where permission_key = 'can_use_advanced_ai';
  select id into p_share     from public.permissions where permission_key = 'can_share';
  select id into p_configure from public.permissions where permission_key = 'can_configure';

  -- ADMIN
  insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled) values
    (r_admin, m_dashboard, p_view, true), (r_admin, m_dashboard, p_export, true),
    (r_admin, m_bug, p_view, true), (r_admin, m_bug, p_create, true), (r_admin, m_bug, p_edit, true), (r_admin, m_bug, p_delete, true), (r_admin, m_bug, p_export, true), (r_admin, m_bug, p_gen_ai, true), (r_admin, m_bug, p_adv_ai, true), (r_admin, m_bug, p_share, true),
    (r_admin, m_test, p_view, true), (r_admin, m_test, p_create, true), (r_admin, m_test, p_edit, true), (r_admin, m_test, p_delete, true), (r_admin, m_test, p_export, true), (r_admin, m_test, p_gen_ai, true), (r_admin, m_test, p_adv_ai, true), (r_admin, m_test, p_share, true),
    (r_admin, m_writing, p_view, true), (r_admin, m_writing, p_create, true), (r_admin, m_writing, p_edit, true), (r_admin, m_writing, p_delete, true), (r_admin, m_writing, p_export, true), (r_admin, m_writing, p_gen_ai, true), (r_admin, m_writing, p_adv_ai, true),
    (r_admin, m_qa_report, p_view, true), (r_admin, m_qa_report, p_create, true), (r_admin, m_qa_report, p_edit, true), (r_admin, m_qa_report, p_delete, true), (r_admin, m_qa_report, p_export, true), (r_admin, m_qa_report, p_gen_ai, true), (r_admin, m_qa_report, p_configure, true),
    (r_admin, m_daily, p_view, true), (r_admin, m_daily, p_create, true), (r_admin, m_daily, p_edit, true), (r_admin, m_daily, p_delete, true), (r_admin, m_daily, p_export, true), (r_admin, m_daily, p_configure, true),
    (r_admin, m_settings, p_view, true), (r_admin, m_settings, p_edit, true),
    (r_admin, m_admin, p_view, true), (r_admin, m_admin, p_configure, true),
    (r_admin, m_announcements, p_view, true), (r_admin, m_announcements, p_create, true), (r_admin, m_announcements, p_edit, true), (r_admin, m_announcements, p_delete, true), (r_admin, m_announcements, p_configure, true),
    (r_admin, m_history, p_view, true), (r_admin, m_history, p_delete, true), (r_admin, m_history, p_export, true)
  on conflict (role_id, module_id, permission_id) do nothing;

  -- PRO
  insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled) values
    (r_pro, m_dashboard, p_view, true), (r_pro, m_dashboard, p_export, true),
    (r_pro, m_bug, p_view, true), (r_pro, m_bug, p_create, true), (r_pro, m_bug, p_edit, true), (r_pro, m_bug, p_delete, true), (r_pro, m_bug, p_export, true), (r_pro, m_bug, p_gen_ai, true), (r_pro, m_bug, p_adv_ai, true),
    (r_pro, m_test, p_view, true), (r_pro, m_test, p_create, true), (r_pro, m_test, p_edit, true), (r_pro, m_test, p_delete, true), (r_pro, m_test, p_export, true), (r_pro, m_test, p_gen_ai, true), (r_pro, m_test, p_adv_ai, true),
    (r_pro, m_writing, p_view, true), (r_pro, m_writing, p_create, true), (r_pro, m_writing, p_edit, true), (r_pro, m_writing, p_delete, true), (r_pro, m_writing, p_export, true), (r_pro, m_writing, p_gen_ai, true), (r_pro, m_writing, p_adv_ai, true),
    (r_pro, m_qa_report, p_view, true), (r_pro, m_qa_report, p_create, true), (r_pro, m_qa_report, p_edit, true), (r_pro, m_qa_report, p_delete, true), (r_pro, m_qa_report, p_export, true), (r_pro, m_qa_report, p_gen_ai, true), (r_pro, m_qa_report, p_configure, true),
    (r_pro, m_daily, p_view, true), (r_pro, m_daily, p_create, true), (r_pro, m_daily, p_edit, true), (r_pro, m_daily, p_delete, true), (r_pro, m_daily, p_export, true), (r_pro, m_daily, p_configure, true),
    (r_pro, m_settings, p_view, true), (r_pro, m_settings, p_edit, true),
    (r_pro, m_history, p_view, true), (r_pro, m_history, p_delete, true), (r_pro, m_history, p_export, true),
    (r_pro, m_announcements, p_view, true)
  on conflict (role_id, module_id, permission_id) do nothing;

  -- FREE
  insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled) values
    (r_free, m_dashboard, p_view, true),
    (r_free, m_bug, p_view, true), (r_free, m_bug, p_create, true), (r_free, m_bug, p_edit, false), (r_free, m_bug, p_delete, false), (r_free, m_bug, p_gen_ai, true),
    (r_free, m_test, p_view, true), (r_free, m_test, p_create, true), (r_free, m_test, p_edit, false), (r_free, m_test, p_delete, false), (r_free, m_test, p_gen_ai, true),
    (r_free, m_writing, p_view, true), (r_free, m_writing, p_create, true), (r_free, m_writing, p_gen_ai, true),
    (r_free, m_qa_report, p_view, true), (r_free, m_qa_report, p_create, true), (r_free, m_qa_report, p_gen_ai, true),
    (r_free, m_daily, p_view, true), (r_free, m_daily, p_create, true),
    (r_free, m_settings, p_view, true), (r_free, m_settings, p_edit, true),
    (r_free, m_announcements, p_view, true)
  on conflict (role_id, module_id, permission_id) do nothing;

  -- Enterprise (non-system) roles default to false across every module x permission
  insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
  select r.id, m.id, p.id, false
  from public.roles r
  cross join public.modules m
  cross join public.permissions p
  where r.is_system = false
  on conflict (role_id, module_id, permission_id) do nothing;

  -- super_admin: mirror admin's explicit grants (frontend also always treats
  -- super_admin as implicitly all-access via is_admin()/get_my_role() checks,
  -- but the matrix UI reads role_module_permissions directly, so seed it too)
  insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
  select r_super_admin, module_id, permission_id, is_enabled
  from public.role_module_permissions
  where role_id = r_admin
  on conflict (role_id, module_id, permission_id) do update set is_enabled = excluded.is_enabled;
end $$;

-- ── Project Hub permissions (035) ───────────────────────────────────────────

insert into public.permissions (permission_key, permission_name, description)
values
  ('can_view', 'Can View', 'View projects and project details'),
  ('can_create', 'Can Create', 'Create new projects'),
  ('can_edit', 'Can Edit', 'Edit existing projects'),
  ('can_delete', 'Can Delete', 'Delete or archive projects'),
  ('can_assign_members', 'Can Assign Members', 'Add/remove members to/from projects'),
  ('can_manage_roles', 'Can Manage Roles', 'Change project roles for members')
on conflict (permission_key) do nothing;

do $$
declare
  v_module_id uuid;
  v_role record;
  v_perm_view uuid; v_perm_create uuid; v_perm_edit uuid; v_perm_delete uuid;
  v_perm_assign uuid; v_perm_manage_roles uuid;
  grants jsonb := '{
    "admin":        {"view":true,"create":true,"edit":true,"delete":true,"assign":true,"manage_roles":true},
    "super_admin":  {"view":true,"create":true,"edit":true,"delete":true,"assign":true,"manage_roles":true},
    "manager":      {"view":true,"create":true,"edit":true,"delete":true,"assign":true,"manage_roles":true},
    "qa_lead":      {"view":true,"create":true,"edit":true,"delete":false,"assign":true,"manage_roles":true},
    "qa_engineer":  {"view":true,"create":false,"edit":false,"delete":false,"assign":false,"manage_roles":false},
    "developer":    {"view":true,"create":false,"edit":false,"delete":false,"assign":false,"manage_roles":false},
    "standard":     {"view":true,"create":false,"edit":false,"delete":false,"assign":false,"manage_roles":false},
    "pro":          {"view":true,"create":true,"edit":true,"delete":false,"assign":false,"manage_roles":false},
    "free":         {"view":true,"create":false,"edit":false,"delete":false,"assign":false,"manage_roles":false},
    "guest":        {"view":true,"create":false,"edit":false,"delete":false,"assign":false,"manage_roles":false}
  }'::jsonb;
begin
  select id into v_module_id from public.modules where module_key = 'project-hub';
  select id into v_perm_view from public.permissions where permission_key = 'can_view';
  select id into v_perm_create from public.permissions where permission_key = 'can_create';
  select id into v_perm_edit from public.permissions where permission_key = 'can_edit';
  select id into v_perm_delete from public.permissions where permission_key = 'can_delete';
  select id into v_perm_assign from public.permissions where permission_key = 'can_assign_members';
  select id into v_perm_manage_roles from public.permissions where permission_key = 'can_manage_roles';

  for v_role in select id, role_key from public.roles where role_key in (select jsonb_object_keys(grants)) loop
    insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled) values
      (v_role.id, v_module_id, v_perm_view,         (grants->v_role.role_key->>'view')::boolean),
      (v_role.id, v_module_id, v_perm_create,       (grants->v_role.role_key->>'create')::boolean),
      (v_role.id, v_module_id, v_perm_edit,         (grants->v_role.role_key->>'edit')::boolean),
      (v_role.id, v_module_id, v_perm_delete,       (grants->v_role.role_key->>'delete')::boolean),
      (v_role.id, v_module_id, v_perm_assign,       (grants->v_role.role_key->>'assign')::boolean),
      (v_role.id, v_module_id, v_perm_manage_roles, (grants->v_role.role_key->>'manage_roles')::boolean)
    on conflict (role_id, module_id, permission_id) do update set is_enabled = excluded.is_enabled;
  end loop;
end $$;

-- ── Daily Report column-management permissions (056) ────────────────────────

do $$
declare
  m_daily uuid;
  r record;
  p record;
  new_keys text[] := array[
    'can_manage_columns', 'can_add_columns', 'can_rename_columns', 'can_reorder_columns',
    'can_hide_show_columns', 'can_delete_custom_columns', 'can_manage_org_config', 'can_manage_project_config'
  ];
  is_full_access boolean;
begin
  select id into m_daily from public.modules where module_key = 'daily-report';

  for r in select id, role_key from public.roles loop
    is_full_access := r.role_key in ('admin', 'super_admin', 'pro', 'manager', 'qa_lead');
    for p in select id from public.permissions where permission_key = any(new_keys) loop
      insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
      values (r.id, m_daily, p.id, is_full_access)
      on conflict (role_id, module_id, permission_id) do update set is_enabled = excluded.is_enabled;
    end loop;
  end loop;
end $$;


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 19: Seed data — Daily Report dropdown configs & system column configs
-- (source: 013, 039_add_issue_source_column.sql, 056)
-- ══════════════════════════════════════════════════════════════════════════════

insert into public.daily_report_dropdown_configs (category, value, sort_order) values
  ('branch', 'main', 1),
  ('branch', 'develop', 2),
  ('branch', 'release/v2.4', 3),
  ('branch', 'feature/auth', 4),
  ('testing_status', 'Passed', 1),
  ('testing_status', 'Failed', 2),
  ('testing_status', 'Blocked', 3),
  ('testing_status', 'In Progress', 4),
  ('testing_status', 'Pending', 5),
  ('testing_status', 'Not Executed', 6),
  ('retesting_status', 'Open', 1),
  ('retesting_status', 'Retesting', 2),
  ('retesting_status', 'Fixed', 3),
  ('retesting_status', 'Closed', 4),
  ('smoke_status', 'Pass', 1),
  ('smoke_status', 'Fail', 2),
  ('smoke_status', 'Blocked', 3),
  ('smoke_status', 'Not Executed', 4),
  ('issue_source', 'Missed by QA', 1),
  ('issue_source', 'Backend Update', 2),
  ('issue_source', 'Customer Reported', 3),
  ('issue_source', 'Internal Testing', 4),
  ('issue_source', 'Production', 5)
on conflict (category, value) do nothing;

-- config_category is populated here (matching 056's original seed exactly) even
-- though the frontend no longer reads it (deprecated by 057) — kept as
-- historical/debugging metadata per 057's own comment, so a fresh project's
-- data matches what a real upgraded project actually has on disk.
-- dropdown_options are pre-populated with what 057's one-time backfill would
-- have produced by reading the daily_report_dropdown_configs seed above, so a
-- fresh project doesn't need that backfill to run to get working dropdowns.
insert into public.daily_report_column_configs
  (project_id, table_key, internal_key, display_name, column_type, is_required, is_visible, is_system, include_in_qa_report, include_in_export, config_category, dashboard_role, display_order,
   dropdown_options)
values
  -- Support & Exception Log system columns
  (null, 'support', 'support_id',               'Support ID',           'short_text', true,  true, true, true, true, null,               null,             1,  '[]'),
  (null, 'support', 'bug_id',                    'Bug ID',                'short_text', false, true, true, true, true, null,               null,             2,  '[]'),
  (null, 'support', 'branch',                    'Branch',                'dropdown',   false, true, true, true, true, 'branch',           null,             3,
    '[{"id":"opt-main","label":"main","sort_order":1,"outcome_bucket":null},{"id":"opt-develop","label":"develop","sort_order":2,"outcome_bucket":null},{"id":"opt-releasev24","label":"release/v2.4","sort_order":3,"outcome_bucket":null},{"id":"opt-featureauth","label":"feature/auth","sort_order":4,"outcome_bucket":null}]'),
  (null, 'support', 'description',               'Description',          'long_text',  true,  true, true, true, true, null,               null,             4,  '[]'),
  (null, 'support', 'received_date',             'Received Date',        'date',       false, true, true, true, true, null,               null,             5,  '[]'),
  (null, 'support', 'qa',                        'QA',                    'dropdown',   false, true, true, true, true, 'qa',               null,             6,
    '[{"id":"opt-qa-ameen","label":"Ameen S.","sort_order":1,"outcome_bucket":null},{"id":"opt-qa-sarah","label":"Sarah Jenkins","sort_order":2,"outcome_bucket":null},{"id":"opt-qa-michael","label":"Michael Ross","sort_order":3,"outcome_bucket":null},{"id":"opt-qa-emily","label":"Emily Taylor","sort_order":4,"outcome_bucket":null}]'),
  (null, 'support', 'tc_count',                  'TC Count',              'number',     false, true, true, true, true, null,               null,             7,  '[]'),
  (null, 'support', 'estimation_hrs',            'Estimation (Hrs)',      'number',     false, true, true, true, true, null,               null,             8,  '[]'),
  (null, 'support', 'actual_start_date',         'Actual Start Date',     'date',       false, true, true, true, true, null,               null,             9,  '[]'),
  (null, 'support', 'planned_end_date',          'Planned End Date',      'date',       false, true, true, true, true, null,               null,            10,  '[]'),
  (null, 'support', 'actual_end_date',           'Actual End Date',       'date',       false, true, true, true, true, null,               null,            11,  '[]'),
  (null, 'support', 'testing_status',            'Testing Status',        'dropdown',   false, true, true, true, true, 'testing_status',   'testing_status', 12,
    '[{"id":"opt-passed","label":"Passed","sort_order":1,"outcome_bucket":"completed"},{"id":"opt-failed","label":"Failed","sort_order":2,"outcome_bucket":"other"},{"id":"opt-blocked","label":"Blocked","sort_order":3,"outcome_bucket":"blocked"},{"id":"opt-inprogress","label":"In Progress","sort_order":4,"outcome_bucket":"pending"},{"id":"opt-pending","label":"Pending","sort_order":5,"outcome_bucket":"pending"},{"id":"opt-notexecuted","label":"Not Executed","sort_order":6,"outcome_bucket":"pending"}]'),
  (null, 'support', 'issue_source',              'Issue Source',          'dropdown',   false, true, true, true, true, 'issue_source',     null,            13,
    '[{"id":"opt-missedqa","label":"Missed by QA","sort_order":1,"outcome_bucket":null},{"id":"opt-backend","label":"Backend Update","sort_order":2,"outcome_bucket":null},{"id":"opt-customer","label":"Customer Reported","sort_order":3,"outcome_bucket":null},{"id":"opt-internal","label":"Internal Testing","sort_order":4,"outcome_bucket":null},{"id":"opt-production","label":"Production","sort_order":5,"outcome_bucket":null}]'),
  (null, 'support', 'comments',                  'Comments',              'long_text',  false, true, true, true, true, null,               null,            14,  '[]'),
  (null, 'support', 'blocked_hours',             'Blocked Hours',         'number',     false, true, true, true, true, null,               null,            15,  '[]'),
  (null, 'support', 'retesting_status',          'Retesting Status',      'dropdown',   false, true, true, true, true, 'retesting_status', null,            16,
    '[{"id":"opt-open","label":"Open","sort_order":1,"outcome_bucket":null},{"id":"opt-retesting","label":"Retesting","sort_order":2,"outcome_bucket":null},{"id":"opt-fixed","label":"Fixed","sort_order":3,"outcome_bucket":null},{"id":"opt-closed","label":"Closed","sort_order":4,"outcome_bucket":null}]'),
  (null, 'support', 'retesting_estimation_hrs',  'Retesting Est (Hrs)',   'number',     false, true, true, true, true, null,               null,            17,  '[]'),

  -- Release Testing Log system columns
  (null, 'release', 'task_id',                          'Task ID',                 'short_text', true,  true, true, true, true, null,             null,             1,  '[]'),
  (null, 'release', 'description',                      'Description',             'long_text',  true,  true, true, true, true, null,             null,             2,  '[]'),
  (null, 'release', 'qa',                               'QA',                       'dropdown',   false, true, true, true, true, 'qa',             null,             3,
    '[{"id":"opt-qa-ameen2","label":"Ameen S.","sort_order":1,"outcome_bucket":null},{"id":"opt-qa-sarah2","label":"Sarah Jenkins","sort_order":2,"outcome_bucket":null},{"id":"opt-qa-michael2","label":"Michael Ross","sort_order":3,"outcome_bucket":null},{"id":"opt-qa-emily2","label":"Emily Taylor","sort_order":4,"outcome_bucket":null}]'),
  (null, 'release', 'initial_round_estimation_hrs',     'Initial Est (Hrs)',       'number',     false, true, true, true, true, null,             null,             4,  '[]'),
  (null, 'release', 'testing_status',                   'Testing Status',          'dropdown',   false, true, true, true, true, 'testing_status', null,             5,
    '[{"id":"opt-passed2","label":"Passed","sort_order":1,"outcome_bucket":"completed"},{"id":"opt-failed2","label":"Failed","sort_order":2,"outcome_bucket":"other"},{"id":"opt-blocked3","label":"Blocked","sort_order":3,"outcome_bucket":"blocked"},{"id":"opt-inprogress2","label":"In Progress","sort_order":4,"outcome_bucket":"pending"},{"id":"opt-pending2","label":"Pending","sort_order":5,"outcome_bucket":"pending"},{"id":"opt-notexecuted3","label":"Not Executed","sort_order":6,"outcome_bucket":"pending"}]'),
  (null, 'release', 'smoke_testing_status',             'Smoke Status',            'dropdown',   false, true, true, true, true, 'smoke_status',   'smoke_status',   6,
    '[{"id":"opt-pass","label":"Pass","sort_order":1,"outcome_bucket":"completed"},{"id":"opt-fail","label":"Fail","sort_order":2,"outcome_bucket":"other"},{"id":"opt-blocked4","label":"Blocked","sort_order":3,"outcome_bucket":"blocked"},{"id":"opt-notexecuted4","label":"Not Executed","sort_order":4,"outcome_bucket":"pending"}]'),
  (null, 'release', 'scope_of_testing_for_smoke',       'Smoke Test Scope',        'long_text',  false, true, true, true, true, null,             null,             7,  '[]'),
  (null, 'release', 'smoke_testing_estimation_hrs',     'Smoke Est (Hrs)',         'number',     false, true, true, true, true, null,             null,             8,  '[]'),
  (null, 'release', 'overall_scope_of_testing',         'Overall Scope',           'long_text',  false, true, true, true, true, null,             null,             9,  '[]'),
  (null, 'release', 'overall_estimation_hrs',           'Overall Est (Hrs)',       'number',     false, true, true, true, true, null,             null,            10,  '[]')
on conflict do nothing;


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION 20: Seed data — default AI module prompts
-- (source: 002_ai_module_prompts.sql)
-- NOTE: created_by requires an existing auth.users row. On a brand-new
-- project with zero users this insert is a safe no-op (WHERE guard below);
-- run it again (or via the Admin UI) after the first admin account exists.
-- ══════════════════════════════════════════════════════════════════════════════

-- Skip on empty Auth (fresh project). After first user exists, either re-run
-- this block or configure prompts via Admin UI.
insert into public.ai_module_prompts (module_key, module_name, system_prompt, created_by)
select v.module_key, v.module_name, v.system_prompt, u.id
from (values
  ('test-case-generator', 'Test Case Generator',
   'You are a senior QA engineer. Given a requirement, return ONLY a valid JSON array (no markdown, no explanation) of test case objects. Each object must have exactly these fields: "title" (string), "priority" ("High" | "Medium" | "Low"), "status" ("Draft" | "Ready" | "Automated").'),
  ('bug-refiner', 'Bug Refiner',
   'You are a professional QA engineer. Convert the user''s rough bug notes into a structured bug report with these sections: **Title**, **Severity** (Critical/High/Medium/Low), **Environment**, **Steps to Reproduce**, **Expected Result**, **Actual Result**, **Possible Cause**. Be concise and professional. Output only the report, no preamble.'),
  ('writing-assistant', 'Writing Assistant',
   'You are a professional technical writer specializing in QA documentation. Rewrite the provided text to be clear, concise, and professional. Preserve the original meaning while improving clarity and tone.'),
  ('ai-copilot', 'AI Copilot',
   'You are Flux AI, an expert QA and software engineering assistant. Provide concise, accurate, and actionable answers. Format responses with markdown when helpful.')
) as v(module_key, module_name, system_prompt)
cross join lateral (
  select id from auth.users order by id limit 1
) u
on conflict do nothing;

-- ══════════════════════════════════════════════════════════════════════════════
-- END OF COMBINED SCHEMA
-- ══════════════════════════════════════════════════════════════════════════════

-- Pin search_path on all private helpers
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'private'
  loop
    execute format('alter function %s set search_path = public', r.sig);
    execute format('revoke all on function %s from public', r.sig);
    execute format('revoke execute on function %s from anon', r.sig);
  end loop;
end $$;


-- ============================================================================
-- SECTION: private-schema grants + public INVOKER RPC wrappers
-- ============================================================================

grant usage on schema private to postgres, authenticated, service_role;

grant execute on all functions in schema private to authenticated;
grant execute on all functions in schema private to service_role;

-- App RPCs (SECURITY INVOKER → call private DEFINER bodies)
create or replace function public.get_role_permissions(p_role_key text)
returns table(module_key text, permission_key text, is_enabled boolean)
language sql
stable
security invoker
set search_path = public
as $$
  select g.module_key, g.permission_key, g.is_enabled
  from private.get_role_permissions(p_role_key) as g;
$$;

create or replace function public.check_module_permission(
  p_role_key text,
  p_module_key text,
  p_permission_key text
)
returns boolean
language sql
stable
security invoker
set search_path = public
as $$
  select private.check_module_permission(p_role_key, p_module_key, p_permission_key);
$$;

revoke all on function public.get_role_permissions(text) from public;
revoke all on function public.check_module_permission(text, text, text) from public;
revoke execute on function public.get_role_permissions(text) from anon;
revoke execute on function public.check_module_permission(text, text, text) from anon;
grant execute on function public.get_role_permissions(text) to authenticated;
grant execute on function public.check_module_permission(text, text, text) to authenticated, service_role;

-- Lock search_path on remaining public trigger helpers
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in (
        'handle_new_user', 'set_updated_at', 'set_projects_updated_at',
        'set_announcement_author', 'update_announcements_updated_at',
        'update_team_capacity_updated_at', 'prevent_last_owner_role_change',
        'prevent_last_owner_deletion', 'log_project_deletion'
      )
  loop
    execute format('alter function %s set search_path = public', r.sig);
    execute format('revoke all on function %s from public', r.sig);
    execute format('revoke execute on function %s from anon, authenticated', r.sig);
  end loop;
end $$;

-- ============================================================================
-- SECTION: Admin Hub module + admin-only permissions (037)
-- ============================================================================

insert into public.modules (module_key, module_name, route_path, icon, is_active, sort_order)
values ('admin-hub', 'Admin Hub', '/admin', 'Shield', true, 5)
on conflict (module_key) do update set
  module_name = excluded.module_name,
  route_path = excluded.route_path,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

-- Bug Status Module (074_bug_status_module.sql)
insert into public.modules (module_key, module_name, route_path, icon, is_active, sort_order)
values ('bug-status', 'What''s the Bug Status?', '/bug-status', 'AlertCircle', true, 15)
on conflict (module_key) do update set
  module_name = excluded.module_name,
  route_path = excluded.route_path,
  is_active = excluded.is_active,
  sort_order = excluded.sort_order;

insert into public.permissions (permission_key, permission_name, description) values
  ('can_manage_users',         'Manage Users',         'Create, update, and deactivate users'),
  ('can_manage_permissions',   'Manage Permissions',   'Edit role-module permission matrix'),
  ('can_manage_ai_providers',  'Manage AI Providers',  'Configure AI provider keys and models'),
  ('can_manage_announcements', 'Manage Announcements', 'Create and manage announcements'),
  ('can_view_audit_logs',      'View Audit Logs',      'View system audit and login history'),
  ('can_manage_templates',     'Manage Templates',     'Manage permission templates'),
  ('can_manage_maintenance',   'Manage Maintenance',   'Toggle maintenance mode'),
  ('can_manage_system',        'Manage System',        'System-level administration')
on conflict (permission_key) do nothing;

do $$
declare
  v_module_id uuid;
  v_role_admin uuid;
  v_role_super uuid;
  v_perm record;
begin
  select id into v_module_id from public.modules where module_key = 'admin-hub';
  select id into v_role_admin from public.roles where role_key = 'admin';
  select id into v_role_super from public.roles where role_key = 'super_admin';

  if v_module_id is null then
    raise exception 'admin-hub module missing';
  end if;

  for v_perm in
    select id from public.permissions
    where permission_key in (
      'can_view', 'can_create', 'can_edit', 'can_delete',
      'can_manage_users', 'can_manage_roles', 'can_manage_permissions',
      'can_manage_ai_providers', 'can_manage_announcements',
      'can_view_audit_logs', 'can_manage_templates',
      'can_manage_maintenance', 'can_manage_system'
    )
  loop
    if v_role_admin is not null then
      insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
      values (v_role_admin, v_module_id, v_perm.id, true)
      on conflict (role_id, module_id, permission_id) do update set is_enabled = true;
    end if;
    if v_role_super is not null then
      insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
      values (v_role_super, v_module_id, v_perm.id, true)
      on conflict (role_id, module_id, permission_id) do update set is_enabled = true;
    end if;
  end loop;
end $$;

-- ============================================================================
-- SECTION: Bug Status Module Permissions
-- Source: 074_bug_status_module.sql
-- ============================================================================
do $$
declare
  v_module_id uuid;
  v_perm_view_id uuid;
  v_perm_export_id uuid;
  v_role_id uuid;
  v_role_key text;
begin
  select id into v_module_id from public.modules where module_key = 'bug-status';
  select id into v_perm_view_id from public.permissions where permission_key = 'can_view';
  select id into v_perm_export_id from public.permissions where permission_key = 'can_export';
  
  if v_module_id is not null and v_perm_view_id is not null then
    for v_role_id, v_role_key in select id, role_key from public.roles
    loop
      -- can_view for all roles
      insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
      values (v_role_id, v_module_id, v_perm_view_id, true)
      on conflict (role_id, module_id, permission_id) do update set is_enabled = true;
      
      -- can_export for admin, super_admin, pro roles
      if v_role_key in ('admin', 'super_admin', 'pro') and v_perm_export_id is not null then
        insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
        values (v_role_id, v_module_id, v_perm_export_id, true)
        on conflict (role_id, module_id, permission_id) do update set is_enabled = true;
      end if;
    end loop;
  end if;
end $$;

-- ============================================================================
-- SECTION 22: Table privileges for authenticated (PostgREST)
-- Source: 063_grant_authenticated_table_privileges.sql
--
-- RLS alone is not enough. Without these GRANTs the app fails with:
--   "permission denied for table departments"
--   "permission denied for table role_module_permissions"
-- Run as part of every fresh / Testing / Staging / Prod apply.
-- ============================================================================

do $$
declare
  r record;
begin
  for r in
    select tablename
    from pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'grant select, insert, update, delete on table public.%I to authenticated',
      r.tablename
    );
  end loop;
end $$;

grant usage, select on all sequences in schema public to authenticated;

alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
alter default privileges in schema public
  grant usage, select on sequences to authenticated;

-- Prefer DEFINER for the public RPC so permission loads survive grant drift
create or replace function public.get_role_permissions(p_role_key text)
returns table(module_key text, permission_key text, is_enabled boolean)
language sql
stable
security definer
set search_path = public
as $$
  select
    m.module_key,
    p.permission_key,
    rmp.is_enabled
  from public.role_module_permissions rmp
  join public.roles       r on r.id = rmp.role_id
  join public.modules     m on m.id = rmp.module_id
  join public.permissions p on p.id = rmp.permission_id
  where r.role_key = p_role_key;
$$;

revoke all on function public.get_role_permissions(text) from public;
revoke execute on function public.get_role_permissions(text) from anon;
grant execute on function public.get_role_permissions(text) to authenticated;

-- ============================================================================
-- SECTION: Support Issue Tracker Module & Incremental Time Logs (Migrations 076 & 077)
-- ============================================================================

-- 1. Register Module
INSERT INTO public.modules (module_key, module_name, route_path, icon, is_active, sort_order)
VALUES ('support-tracker', 'Support Issue Tracker', '/support-tracker', 'LifeBuoy', true, 18)
ON CONFLICT (module_key) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  route_path = EXCLUDED.route_path,
  is_active = EXCLUDED.is_active;

-- 2. Register granular permissions
INSERT INTO public.permissions (permission_key, permission_name, description) VALUES
  ('can_view_dashboard',     'View Support Dashboard',  'Can view the Manager Live Dashboard overview and analytics'),
  ('can_view_history',       'View History',            'Can view complete audit history logs and change trails'),
  ('can_configure_dropdowns','Configure Dropdowns',     'Can modify master dropdown lists (testing status, testers)'),
  ('can_import',             'Import Support Issues',   'Can import support issues in bulk from Excel/CSV')
ON CONFLICT (permission_key) DO NOTHING;

-- 3. Seed Role Permissions for Support Issue Tracker
DO $$
DECLARE
  v_module_id UUID;
  v_role RECORD;
  v_perm RECORD;
  v_enabled BOOLEAN;
BEGIN
  SELECT id INTO v_module_id FROM public.modules WHERE module_key = 'support-tracker';
  IF v_module_id IS NULL THEN
    RETURN;
  END IF;

  FOR v_role IN SELECT id, role_key FROM public.roles LOOP
    FOR v_perm IN SELECT id, permission_key FROM public.permissions WHERE permission_key IN (
      'can_view',
      'can_view_dashboard',
      'can_create',
      'can_edit',
      'can_delete',
      'can_export',
      'can_import',
      'can_view_history',
      'can_configure_dropdowns',
      'can_manage_permissions'
    ) LOOP
      -- Permission matrix rules
      v_enabled := false;

      IF v_role.role_key IN ('admin', 'super_admin') THEN
        v_enabled := true;
      ELSIF v_role.role_key = 'manager' THEN
        v_enabled := true;
      ELSIF v_role.role_key = 'qa_lead' THEN
        v_enabled := v_perm.permission_key NOT IN ('can_delete', 'can_manage_permissions');
      ELSIF v_role.role_key IN ('qa_engineer', 'pro') THEN
        v_enabled := v_perm.permission_key IN ('can_view', 'can_create', 'can_edit', 'can_export', 'can_view_history');
      ELSIF v_role.role_key IN ('standard', 'free') THEN
        v_enabled := v_perm.permission_key IN ('can_view', 'can_create');
      ELSIF v_role.role_key = 'guest' THEN
        v_enabled := false;
      END IF;

      INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role.id, v_module_id, v_perm.id, v_enabled)
      ON CONFLICT (role_id, module_id, permission_id) 
      DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    END LOOP;
  END LOOP;
END $$;

-- 4. Create support_issues table
CREATE TABLE IF NOT EXISTS public.support_issues (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sl_no             INTEGER,
  project_id        UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  product_name      TEXT NOT NULL,
  issue_id          TEXT NOT NULL,
  description       TEXT NOT NULL,
  received_date     DATE NOT NULL DEFAULT CURRENT_DATE,
  start_date        DATE,
  finish_date       DATE,
  tester_name       TEXT,
  estimated_hours   NUMERIC(6, 2) NOT NULL DEFAULT 0,
  actual_hours      NUMERIC(6, 2) NOT NULL DEFAULT 0,
  testing_status    TEXT NOT NULL DEFAULT 'Not Started',
  comments          TEXT DEFAULT '',
  created_by        UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_issues_project_id ON public.support_issues(project_id);
CREATE INDEX IF NOT EXISTS idx_support_issues_issue_id ON public.support_issues(issue_id);
CREATE INDEX IF NOT EXISTS idx_support_issues_status ON public.support_issues(testing_status);
CREATE INDEX IF NOT EXISTS idx_support_issues_tester ON public.support_issues(tester_name);

-- 5. Create support_issue_history table
CREATE TABLE IF NOT EXISTS public.support_issue_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id      TEXT NOT NULL,
  product_name  TEXT NOT NULL,
  user_name     TEXT NOT NULL,
  user_id       UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action        TEXT NOT NULL,
  field         TEXT,
  old_value     TEXT,
  new_value     TEXT,
  timestamp     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_issue_history_issue_id ON public.support_issue_history(issue_id);
CREATE INDEX IF NOT EXISTS idx_support_issue_history_timestamp ON public.support_issue_history(timestamp DESC);

-- 6. Create support_issue_dropdown_configs table
CREATE TABLE IF NOT EXISTS public.support_issue_dropdown_configs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category      TEXT NOT NULL, -- 'testing_status', 'tester', 'priority'
  label         TEXT NOT NULL,
  value         TEXT NOT NULL,
  color         TEXT,
  is_active     BOOLEAN NOT NULL DEFAULT true,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_dropdown_category ON public.support_issue_dropdown_configs(category, sort_order);

-- 7. Create support_issue_time_logs table (Cumulative Incremental Time Log System)
CREATE TABLE IF NOT EXISTS public.support_issue_time_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id          TEXT NOT NULL, -- e.g. 'SUP-1024'
  support_issue_id  UUID REFERENCES public.support_issues(id) ON DELETE CASCADE,
  user_name         TEXT NOT NULL,
  user_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  hours_added       NUMERIC(6, 2) NOT NULL,
  comment           TEXT NOT NULL DEFAULT '',
  logged_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_time_logs_issue_str ON public.support_issue_time_logs(issue_id);
CREATE INDEX IF NOT EXISTS idx_support_time_logs_issue_id ON public.support_issue_time_logs(support_issue_id);
CREATE INDEX IF NOT EXISTS idx_support_time_logs_logged_at ON public.support_issue_time_logs(logged_at DESC);

-- 8. Relax project_id FK so issues can be saved without a matching projects row
ALTER TABLE public.support_issues DROP CONSTRAINT IF EXISTS support_issues_project_id_fkey;
ALTER TABLE public.support_issues ALTER COLUMN project_id DROP NOT NULL;

-- 9. Unique indexes to prevent duplicate data at the DB level
CREATE UNIQUE INDEX IF NOT EXISTS uq_support_dropdown_category_value
  ON public.support_issue_dropdown_configs (category, lower(value));

CREATE UNIQUE INDEX IF NOT EXISTS uq_support_issues_issue_id
  ON public.support_issues (issue_id);

-- 10. Enable RLS
ALTER TABLE public.support_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_issue_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_issue_dropdown_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_issue_time_logs ENABLE ROW LEVEL SECURITY;

-- 9. Policies for authenticated users
-- support_issues: scoped SELECT (085) + permissive writes
DO $$
BEGIN
  DROP POLICY IF EXISTS "support_issues_all_auth"       ON public.support_issues;
  DROP POLICY IF EXISTS "support_issues_all_anon"       ON public.support_issues;
  DROP POLICY IF EXISTS "support_issues_select_scoped"  ON public.support_issues;
  DROP POLICY IF EXISTS "support_issues_insert_auth"    ON public.support_issues;
  DROP POLICY IF EXISTS "support_issues_update_auth"    ON public.support_issues;
  DROP POLICY IF EXISTS "support_issues_delete_auth"    ON public.support_issues;

  -- Scoped SELECT: admins see all; others see only rows for their projects
  CREATE POLICY "support_issues_select_scoped" ON public.support_issues
    FOR SELECT TO authenticated
    USING (
      private.is_admin()
      OR project_id IS NULL
      OR private.is_project_member(project_id)
    );

  CREATE POLICY "support_issues_insert_auth" ON public.support_issues
    FOR INSERT TO authenticated WITH CHECK (true);

  CREATE POLICY "support_issues_update_auth" ON public.support_issues
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

  CREATE POLICY "support_issues_delete_auth" ON public.support_issues
    FOR DELETE TO authenticated USING (true);

  CREATE POLICY "support_issues_all_anon" ON public.support_issues
    FOR ALL TO anon USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "support_history_all_auth" ON public.support_issue_history;
  CREATE POLICY "support_history_all_auth" ON public.support_issue_history
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "support_dropdown_all_auth" ON public.support_issue_dropdown_configs;
  CREATE POLICY "support_dropdown_all_auth" ON public.support_issue_dropdown_configs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "support_time_logs_all_auth" ON public.support_issue_time_logs;
  CREATE POLICY "support_time_logs_all_auth" ON public.support_issue_time_logs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION (080): Release Task Tracker Module
-- (source: 080_release_task_tracker.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- Register module
INSERT INTO public.modules (module_key, module_name, route_path, icon, is_active, sort_order)
VALUES ('release-tracker', 'Release Task Tracker', '/release-tracker', 'Rocket', true, 19)
ON CONFLICT (module_key) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  route_path  = EXCLUDED.route_path,
  is_active   = EXCLUDED.is_active;

-- Register permissions
INSERT INTO public.permissions (permission_key, permission_name, description) VALUES
  ('can_view_dashboard',      'View Dashboard',      'Can view the Manager Live Dashboard overview and analytics'),
  ('can_view_history',        'View History',        'Can view complete audit history logs and change trails'),
  ('can_configure_dropdowns', 'Configure Dropdowns', 'Can modify master dropdown lists (status, priority, etc.)'),
  ('can_import',              'Import Data',         'Can import records in bulk from Excel/CSV')
ON CONFLICT (permission_key) DO NOTHING;

-- Seed role permissions
DO $$
DECLARE
  v_module_id UUID;
  v_role      RECORD;
  v_perm      RECORD;
  v_enabled   BOOLEAN;
BEGIN
  SELECT id INTO v_module_id FROM public.modules WHERE module_key = 'release-tracker';
  IF v_module_id IS NULL THEN RETURN; END IF;

  FOR v_role IN SELECT id, role_key FROM public.roles LOOP
    FOR v_perm IN SELECT id, permission_key FROM public.permissions WHERE permission_key IN (
      'can_view','can_view_dashboard','can_create','can_edit','can_delete',
      'can_export','can_import','can_view_history','can_configure_dropdowns','can_manage_permissions'
    ) LOOP
      v_enabled := false;
      IF v_role.role_key IN ('admin','super_admin','manager') THEN
        v_enabled := true;
      ELSIF v_role.role_key = 'qa_lead' THEN
        v_enabled := v_perm.permission_key NOT IN ('can_delete','can_manage_permissions');
      ELSIF v_role.role_key = 'qa_engineer' THEN
        v_enabled := v_perm.permission_key IN ('can_view','can_create','can_edit','can_export','can_view_history');
      ELSIF v_role.role_key = 'pro' THEN
        v_enabled := v_perm.permission_key NOT IN ('can_manage_permissions');
      ELSIF v_role.role_key IN ('standard','free') THEN
        v_enabled := v_perm.permission_key IN ('can_view','can_create');
      ELSIF v_role.role_key = 'guest' THEN
        v_enabled := false;
      END IF;

      INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role.id, v_module_id, v_perm.id, v_enabled)
      ON CONFLICT (role_id, module_id, permission_id)
      DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    END LOOP;
  END LOOP;
END $$;

-- release_tasks
CREATE TABLE IF NOT EXISTS public.release_tasks (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sl_no                 INTEGER,
  project_id            UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  product_name          TEXT NOT NULL,
  product_code          TEXT,
  release_version       TEXT NOT NULL DEFAULT 'Release 1.0',
  task_id               TEXT NOT NULL,
  description           TEXT NOT NULL,
  priority              TEXT NOT NULL DEFAULT 'Medium',
  start_date            DATE,
  target_date           DATE,
  finish_date           DATE,
  assigned_to_user_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  assigned_to_name      TEXT NOT NULL DEFAULT 'Unassigned',
  estimated_hours       NUMERIC(6,2) NOT NULL DEFAULT 0,
  actual_hours          NUMERIC(6,2) NOT NULL DEFAULT 0,
  task_status           TEXT NOT NULL DEFAULT 'Not Started',
  comments              TEXT DEFAULT '',
  is_deleted            BOOLEAN NOT NULL DEFAULT false,
  created_by            UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_release_tasks_task_id      ON public.release_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_release_tasks_project_id         ON public.release_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_release_tasks_release            ON public.release_tasks(release_version);
CREATE INDEX IF NOT EXISTS idx_release_tasks_status             ON public.release_tasks(task_status);
CREATE INDEX IF NOT EXISTS idx_release_tasks_priority           ON public.release_tasks(priority);
CREATE INDEX IF NOT EXISTS idx_release_tasks_assigned           ON public.release_tasks(assigned_to_user_id);
CREATE INDEX IF NOT EXISTS idx_release_tasks_deleted            ON public.release_tasks(is_deleted);

-- release_task_time_logs
CREATE TABLE IF NOT EXISTS public.release_task_time_logs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         TEXT NOT NULL,
  release_task_id UUID REFERENCES public.release_tasks(id) ON DELETE CASCADE,
  user_name       TEXT NOT NULL,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  hours_added     NUMERIC(6,2) NOT NULL,
  comment         TEXT NOT NULL DEFAULT '',
  logged_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_release_time_logs_task_str  ON public.release_task_time_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_release_time_logs_task_id   ON public.release_task_time_logs(release_task_id);
CREATE INDEX IF NOT EXISTS idx_release_time_logs_logged_at ON public.release_task_time_logs(logged_at DESC);

-- release_task_history
CREATE TABLE IF NOT EXISTS public.release_task_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         TEXT NOT NULL,
  product_name    TEXT NOT NULL,
  release_version TEXT NOT NULL,
  user_name       TEXT NOT NULL,
  user_id         UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  field           TEXT,
  old_value       TEXT,
  new_value       TEXT,
  timestamp       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_release_task_history_task_id   ON public.release_task_history(task_id);
CREATE INDEX IF NOT EXISTS idx_release_task_history_timestamp ON public.release_task_history(timestamp DESC);

-- release_task_dropdown_configs
CREATE TABLE IF NOT EXISTS public.release_task_dropdown_configs (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category   TEXT NOT NULL,
  label      TEXT NOT NULL,
  value      TEXT NOT NULL,
  color      TEXT,
  is_active  BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_release_dropdown_category_value
  ON public.release_task_dropdown_configs (category, lower(value));

INSERT INTO public.release_task_dropdown_configs (category, label, value, color, is_active, sort_order) VALUES
  ('task_status', 'Not Started', 'Not Started', '#94a3b8', true, 1),
  ('task_status', 'Assigned',    'Assigned',    '#3b82f6', true, 2),
  ('task_status', 'In Progress', 'In Progress', '#8b5cf6', true, 3),
  ('task_status', 'Blocked',     'Blocked',     '#ef4444', true, 4),
  ('task_status', 'In Review',   'In Review',   '#f59e0b', true, 5),
  ('task_status', 'Completed',   'Completed',   '#10b981', true, 6),
  ('task_status', 'Cancelled',   'Cancelled',   '#6b7280', true, 7),
  ('priority',    'Critical',    'Critical',    '#ef4444', true, 1),
  ('priority',    'High',        'High',        '#f97316', true, 2),
  ('priority',    'Medium',      'Medium',      '#3b82f6', true, 3),
  ('priority',    'Low',         'Low',         '#10b981', true, 4)
ON CONFLICT (category, lower(value)) DO NOTHING;

-- RLS
ALTER TABLE public.release_tasks                ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_task_time_logs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_task_history         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_task_dropdown_configs ENABLE ROW LEVEL SECURITY;

-- release_tasks: scoped SELECT (085) + permissive writes
DO $$
BEGIN
  DROP POLICY IF EXISTS "release_tasks_all_auth"         ON public.release_tasks;
  DROP POLICY IF EXISTS "release_tasks_all_anon"         ON public.release_tasks;
  DROP POLICY IF EXISTS "release_tasks_select_scoped"    ON public.release_tasks;
  DROP POLICY IF EXISTS "release_tasks_insert_auth"      ON public.release_tasks;
  DROP POLICY IF EXISTS "release_tasks_update_auth"      ON public.release_tasks;
  DROP POLICY IF EXISTS "release_tasks_delete_auth"      ON public.release_tasks;

  -- Scoped SELECT: admins see all; others see only rows for their projects
  CREATE POLICY "release_tasks_select_scoped" ON public.release_tasks
    FOR SELECT TO authenticated
    USING (
      private.is_admin()
      OR project_id IS NULL
      OR private.is_project_member(project_id)
    );

  CREATE POLICY "release_tasks_insert_auth" ON public.release_tasks
    FOR INSERT TO authenticated WITH CHECK (true);

  CREATE POLICY "release_tasks_update_auth" ON public.release_tasks
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

  CREATE POLICY "release_tasks_delete_auth" ON public.release_tasks
    FOR DELETE TO authenticated USING (true);

  CREATE POLICY "release_tasks_all_anon" ON public.release_tasks
    FOR ALL TO anon USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "release_time_logs_all_auth" ON public.release_task_time_logs;
  DROP POLICY IF EXISTS "release_time_logs_all_anon" ON public.release_task_time_logs;
  CREATE POLICY "release_time_logs_all_auth" ON public.release_task_time_logs FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "release_time_logs_all_anon" ON public.release_task_time_logs FOR ALL TO anon        USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "release_history_all_auth" ON public.release_task_history;
  DROP POLICY IF EXISTS "release_history_all_anon" ON public.release_task_history;
  CREATE POLICY "release_history_all_auth" ON public.release_task_history FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "release_history_all_anon" ON public.release_task_history FOR ALL TO anon        USING (true) WITH CHECK (true);

  DROP POLICY IF EXISTS "release_dropdown_all_auth" ON public.release_task_dropdown_configs;
  DROP POLICY IF EXISTS "release_dropdown_all_anon" ON public.release_task_dropdown_configs;
  CREATE POLICY "release_dropdown_all_auth" ON public.release_task_dropdown_configs FOR ALL TO authenticated USING (true) WITH CHECK (true);
  CREATE POLICY "release_dropdown_all_anon" ON public.release_task_dropdown_configs FOR ALL TO anon        USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

GRANT ALL ON TABLE public.release_tasks                 TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.release_task_time_logs        TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.release_task_history          TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.release_task_dropdown_configs TO authenticated, anon, service_role;


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION (081): Estimation Hours Lock
-- (source: 081_estimation_hours_lock.sql)
-- ══════════════════════════════════════════════════════════════════════════════

-- Lock columns on support_issues
ALTER TABLE public.support_issues
  ADD COLUMN IF NOT EXISTS estimated_hours_locked    BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_hours_locked_by TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_hours_locked_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_support_issues_locked ON public.support_issues(estimated_hours_locked);


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION (082): Support Issue Tracker — New Columns
-- (source: 082_support_tracker_new_columns.sql)
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.support_issues
  ADD COLUMN IF NOT EXISTS received_time             TIME,
  ADD COLUMN IF NOT EXISTS is_qa_miss                TEXT DEFAULT 'Not Applicable',
  ADD COLUMN IF NOT EXISTS test_case_count           INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS planned_end_date          DATE,
  ADD COLUMN IF NOT EXISTS actual_end_date           DATE,
  ADD COLUMN IF NOT EXISTS blocked_hours             NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retesting_status          TEXT DEFAULT 'Not Required',
  ADD COLUMN IF NOT EXISTS retesting_estimation_hrs  NUMERIC(6,2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_support_issues_is_qa_miss       ON public.support_issues(is_qa_miss);
CREATE INDEX IF NOT EXISTS idx_support_issues_retesting_status ON public.support_issues(retesting_status);
CREATE INDEX IF NOT EXISTS idx_support_issues_planned_end      ON public.support_issues(planned_end_date);
CREATE INDEX IF NOT EXISTS idx_support_issues_actual_end       ON public.support_issues(actual_end_date);

-- Dropdown seeds for is_qa_miss
INSERT INTO public.support_issue_dropdown_configs (category, label, value, is_active, sort_order)
VALUES
  ('is_qa_miss', 'Yes',            'Yes',            true, 1),
  ('is_qa_miss', 'No',             'No',             true, 2),
  ('is_qa_miss', 'Under Review',   'Under Review',   true, 3),
  ('is_qa_miss', 'Not Applicable', 'Not Applicable', true, 4)
ON CONFLICT (category, lower(value)) DO NOTHING;

-- Dropdown seeds for retesting_status
INSERT INTO public.support_issue_dropdown_configs (category, label, value, is_active, sort_order)
VALUES
  ('retesting_status', 'Not Required', 'Not Required', true, 1),
  ('retesting_status', 'Pending',      'Pending',      true, 2),
  ('retesting_status', 'In Retesting', 'In Retesting', true, 3),
  ('retesting_status', 'Passed',       'Passed',       true, 4),
  ('retesting_status', 'Failed',       'Failed',       true, 5),
  ('retesting_status', 'Blocked',      'Blocked',      true, 6)
ON CONFLICT (category, lower(value)) DO NOTHING;

-- Blocked time tracking table
CREATE TABLE IF NOT EXISTS public.support_issue_blocked_periods (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  support_issue_id UUID NOT NULL REFERENCES public.support_issues(id) ON DELETE CASCADE,
  issue_id         TEXT NOT NULL,
  blocked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unblocked_at     TIMESTAMPTZ,
  hours_blocked    NUMERIC(6,2) GENERATED ALWAYS AS (
    CASE
      WHEN unblocked_at IS NOT NULL
      THEN ROUND(EXTRACT(EPOCH FROM (unblocked_at - blocked_at)) / 3600.0, 2)
      ELSE NULL
    END
  ) STORED,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_periods_issue_id  ON public.support_issue_blocked_periods(support_issue_id);
CREATE INDEX IF NOT EXISTS idx_blocked_periods_issue_str ON public.support_issue_blocked_periods(issue_id);

ALTER TABLE public.support_issue_blocked_periods ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "support_blocked_periods_all_auth" ON public.support_issue_blocked_periods;
  CREATE POLICY "support_blocked_periods_all_auth" ON public.support_issue_blocked_periods
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
  DROP POLICY IF EXISTS "support_blocked_periods_all_anon" ON public.support_issue_blocked_periods;
  CREATE POLICY "support_blocked_periods_all_anon" ON public.support_issue_blocked_periods
    FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT ALL ON TABLE public.support_issue_blocked_periods TO authenticated, anon, service_role;


-- Lock columns on release_tasks
ALTER TABLE public.release_tasks
  ADD COLUMN IF NOT EXISTS estimated_hours_locked    BOOLEAN     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS estimated_hours_locked_by TEXT        DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS estimated_hours_locked_at TIMESTAMPTZ DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_release_tasks_locked ON public.release_tasks(estimated_hours_locked);

-- Register permissions
INSERT INTO public.permissions (permission_key, permission_name, description) VALUES
  ('can_lock_estimated_hours',   'Lock Estimated Hours',   'Can lock Estimated Hours for a specific issue or task to prevent edits'),
  ('can_unlock_estimated_hours', 'Unlock Estimated Hours', 'Can unlock Estimated Hours for a specific issue or task'),
  ('can_edit_estimated_hours',   'Edit Estimated Hours',   'Can modify Estimated Hours when the estimation is unlocked'),
  ('can_edit_time_logs',         'Edit Time Logs',         'Can correct previously logged time-log entries with mandatory audit reason')
ON CONFLICT (permission_key) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  description     = EXCLUDED.description;

-- Seed role permissions for support-tracker and release-tracker
DO $$
DECLARE
  v_support_module_id UUID;
  v_release_module_id UUID;
  v_role  RECORD;
  v_perm  RECORD;
  v_enabled BOOLEAN;
BEGIN
  SELECT id INTO v_support_module_id FROM public.modules WHERE module_key = 'support-tracker';
  SELECT id INTO v_release_module_id FROM public.modules WHERE module_key = 'release-tracker';

  FOR v_role IN SELECT id, role_key FROM public.roles LOOP
    FOR v_perm IN SELECT id, permission_key FROM public.permissions
      WHERE permission_key IN ('can_lock_estimated_hours','can_unlock_estimated_hours','can_edit_estimated_hours','can_edit_time_logs')
    LOOP
      IF v_role.role_key IN ('super_admin','admin','manager','qa_lead') THEN
        v_enabled := true;
      ELSIF v_role.role_key IN ('qa_engineer','pro') THEN
        v_enabled := v_perm.permission_key IN ('can_edit_estimated_hours','can_edit_time_logs');
      ELSE
        v_enabled := false;
      END IF;

      IF v_support_module_id IS NOT NULL THEN
        INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
        VALUES (v_role.id, v_support_module_id, v_perm.id, v_enabled)
        ON CONFLICT (role_id, module_id, permission_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
      END IF;

      IF v_release_module_id IS NOT NULL THEN
        INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
        VALUES (v_role.id, v_release_module_id, v_perm.id, v_enabled)
        ON CONFLICT (role_id, module_id, permission_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
      END IF;
    END LOOP;
  END LOOP;
END $$;


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION (083): Release Task Tracker — Estimation Redesign
-- (source: 083_release_task_estimation_redesign.sql)
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.release_tasks
  ADD COLUMN IF NOT EXISTS test_design_est_hrs        NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS data_prep_est_hrs          NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS functional_testing_est_hrs NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retesting_est_hrs          NUMERIC(6,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_date_time         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS actual_end_date            DATE;

-- Migrate existing estimated_hours → functional_testing_est_hrs for legacy rows
UPDATE public.release_tasks
SET functional_testing_est_hrs = estimated_hours
WHERE functional_testing_est_hrs = 0
  AND estimated_hours > 0;

CREATE INDEX IF NOT EXISTS idx_release_tasks_received_dt ON public.release_tasks(received_date_time);
CREATE INDEX IF NOT EXISTS idx_release_tasks_actual_end  ON public.release_tasks(actual_end_date);


-- ============================================================================
-- SECTION: Super Admin assignment (run AFTER first user registers)
-- ============================================================================
-- Preferred workflow:
--   1. Run this entire combined migration on a fresh Qaly-ai project
--   2. Start the app pointed at that project
--   3. Register the intended admin via normal Auth signup
--   4. Confirm the profile row exists
--   5. Uncomment and run the assignment query below (replace the email)
--   6. Run the verification query
--   7. Logout/login so the app reloads permissions
--
-- Replace your-admin@example.com with the registered Super Admin email.
-- DO NOT commit a real personal email into this file.



-- ----------------------------------------------------------------------------
-- BOOTSTRAP Super Admin (run manually in SQL Editor — do NOT leave real emails
-- committed). Copy ONE block at a time, replace the email, run, confirm rows.
-- ----------------------------------------------------------------------------

-- 1) Check auth user + profile
-- SELECT u.id, u.email, p.id AS profile_id, p.role, p.status
-- FROM auth.users u
-- LEFT JOIN public.profiles p ON p.id = u.id
-- WHERE lower(u.email) = lower('your-admin@example.com');

-- 2) Create profile if missing + set super_admin (must return 1 row)
-- INSERT INTO public.profiles (id, email, full_name, role, status)
-- SELECT u.id, u.email,
--        coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
--        'super_admin', 'active'
-- FROM auth.users u
-- WHERE lower(u.email) = lower('your-admin@example.com')
-- ON CONFLICT (id) DO UPDATE
-- SET role = 'super_admin', status = 'active', email = EXCLUDED.email
-- RETURNING id, email, role, status;

-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION (086): Project Data Archive
-- (source: 086_project_data_archive.sql)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.project_archive_jobs (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id            UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  initiated_by          UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,

  status                TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending',
      'exporting',
      'awaiting_download_confirmation',
      'ready_for_deletion',
      'deleting',
      'completed',
      'failed'
    )),

  export_started_at     TIMESTAMPTZ,
  export_completed_at   TIMESTAMPTZ,
  export_status         TEXT,

  support_logs_count          INTEGER NOT NULL DEFAULT 0,
  release_logs_count          INTEGER NOT NULL DEFAULT 0,
  daily_support_count         INTEGER NOT NULL DEFAULT 0,
  daily_release_count         INTEGER NOT NULL DEFAULT 0,
  weekly_reports_count        INTEGER NOT NULL DEFAULT 0,
  total_records_count         INTEGER NOT NULL DEFAULT 0,

  exported_support_ids        UUID[]  NOT NULL DEFAULT '{}',
  exported_release_ids        UUID[]  NOT NULL DEFAULT '{}',
  exported_daily_support_ids  UUID[]  NOT NULL DEFAULT '{}',
  exported_daily_release_ids  UUID[]  NOT NULL DEFAULT '{}',
  exported_report_ids         UUID[]  NOT NULL DEFAULT '{}',

  deletion_started_at         TIMESTAMPTZ,
  deletion_completed_at       TIMESTAMPTZ,
  deletion_status             TEXT,
  deleted_support_count       INTEGER,
  deleted_release_count       INTEGER,
  deleted_daily_support_count INTEGER,
  deleted_daily_release_count INTEGER,
  deleted_report_count        INTEGER,
  total_deleted_count         INTEGER,

  failure_details       TEXT,

  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_archive_jobs_project_id   ON public.project_archive_jobs(project_id);
CREATE INDEX IF NOT EXISTS idx_archive_jobs_initiated_by ON public.project_archive_jobs(initiated_by);
CREATE INDEX IF NOT EXISTS idx_archive_jobs_status       ON public.project_archive_jobs(status);

CREATE OR REPLACE FUNCTION public.set_archive_jobs_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS archive_jobs_updated_at ON public.project_archive_jobs;
CREATE TRIGGER archive_jobs_updated_at
  BEFORE UPDATE ON public.project_archive_jobs
  FOR EACH ROW EXECUTE FUNCTION public.set_archive_jobs_updated_at();

-- Add new columns idempotently (safe if table was created above or already existed)
ALTER TABLE public.project_archive_jobs
  ADD COLUMN IF NOT EXISTS daily_support_count         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS daily_release_count         INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS exported_daily_support_ids  UUID[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS exported_daily_release_ids  UUID[]  NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deleted_daily_support_count INTEGER,
  ADD COLUMN IF NOT EXISTS deleted_daily_release_count INTEGER;

ALTER TABLE public.project_archive_jobs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "archive_jobs_select" ON public.project_archive_jobs;
DROP POLICY IF EXISTS "archive_jobs_insert" ON public.project_archive_jobs;
DROP POLICY IF EXISTS "archive_jobs_update" ON public.project_archive_jobs;
DROP POLICY IF EXISTS "archive_jobs_delete" ON public.project_archive_jobs;

CREATE POLICY "archive_jobs_select" ON public.project_archive_jobs
  FOR SELECT TO authenticated
  USING (
    private.is_admin()
    OR initiated_by = auth.uid()
    OR private.is_project_member(project_id)
  );

CREATE POLICY "archive_jobs_insert" ON public.project_archive_jobs
  FOR INSERT TO authenticated
  WITH CHECK (
    initiated_by = auth.uid()
    AND (private.is_admin() OR private.is_project_member(project_id))
  );

CREATE POLICY "archive_jobs_update" ON public.project_archive_jobs
  FOR UPDATE TO authenticated
  USING (
    private.is_admin()
    OR initiated_by = auth.uid()
  );

CREATE POLICY "archive_jobs_delete" ON public.project_archive_jobs
  FOR DELETE TO authenticated
  USING (private.is_admin());

INSERT INTO public.permissions (permission_key, permission_name, description)
VALUES (
  'can_archive_data',
  'Archive Project Data',
  'Can export project data to Excel and permanently delete archived records from the active database'
)
ON CONFLICT (permission_key) DO NOTHING;

DO $$
DECLARE
  v_module_id   UUID;
  v_perm_id     UUID;
  v_role        RECORD;
BEGIN
  SELECT id INTO v_module_id FROM public.modules WHERE module_key = 'project-hub';
  SELECT id INTO v_perm_id   FROM public.permissions WHERE permission_key = 'can_archive_data';

  IF v_module_id IS NULL OR v_perm_id IS NULL THEN
    RAISE NOTICE 'project-hub module or can_archive_data permission not found — skipping grant';
    RETURN;
  END IF;

  FOR v_role IN
    SELECT id FROM public.roles WHERE role_key IN ('admin', 'super_admin', 'manager')
  LOOP
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    VALUES (v_role.id, v_module_id, v_perm_id, true)
    ON CONFLICT (role_id, module_id, permission_id)
    DO UPDATE SET is_enabled = true;
  END LOOP;

  FOR v_role IN
    SELECT id FROM public.roles WHERE role_key NOT IN ('admin', 'super_admin', 'manager')
  LOOP
    INSERT INTO public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    VALUES (v_role.id, v_module_id, v_perm_id, false)
    ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
  END LOOP;
END $$;

COMMENT ON TABLE public.project_archive_jobs IS
  'Audit trail for Project Data Archive operations. Each row tracks one export+deletion cycle for a project.';

COMMENT ON COLUMN public.project_archive_jobs.exported_support_ids IS
  'Exact UUIDs of support_issues rows included in the export.';
COMMENT ON COLUMN public.project_archive_jobs.exported_release_ids IS
  'Exact UUIDs of release_tasks rows included in the export.';
COMMENT ON COLUMN public.project_archive_jobs.exported_daily_support_ids IS
  'Exact UUIDs of daily_support_logs rows included in the export.';
COMMENT ON COLUMN public.project_archive_jobs.exported_daily_release_ids IS
  'Exact UUIDs of daily_release_testing_status rows included in the export.';
COMMENT ON COLUMN public.project_archive_jobs.exported_report_ids IS
  'Exact UUIDs of weekly_reports rows included in the export.';


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION: StoryPot Module (source: 090_story_pot_module.sql)
-- ══════════════════════════════════════════════════════════════════════════════

INSERT INTO modules (module_key, module_name, route_path, icon, is_active, sort_order)
VALUES ('story-pot', 'StoryPot', '/story-pot', 'Soup', true, 25)
ON CONFLICT (module_key) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  route_path = EXCLUDED.route_path,
  is_active = EXCLUDED.is_active;

DO $$
DECLARE
  v_module_id UUID;
  v_perm_view UUID;
  v_perm_dashboard UUID;
  v_perm_export UUID;
  v_perm_import UUID;
  v_role RECORD;
BEGIN
  SELECT id INTO v_module_id FROM modules WHERE module_key = 'story-pot';
  SELECT id INTO v_perm_view FROM permissions WHERE permission_key = 'can_view';
  SELECT id INTO v_perm_dashboard FROM permissions WHERE permission_key = 'can_view_dashboard';
  SELECT id INTO v_perm_export FROM permissions WHERE permission_key = 'can_export';
  SELECT id INTO v_perm_import FROM permissions WHERE permission_key = 'can_import';

  FOR v_role IN SELECT id, role_key FROM roles LOOP
    IF v_perm_view IS NOT NULL THEN
      INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role.id, v_module_id, v_perm_view, true)
      ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
    END IF;

    IF v_perm_dashboard IS NOT NULL THEN
      INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role.id, v_module_id, v_perm_dashboard,
        v_role.role_key IN ('admin', 'super_admin', 'pro', 'manager', 'qa_lead'))
      ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
    END IF;

    IF v_perm_export IS NOT NULL THEN
      INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role.id, v_module_id, v_perm_export, v_role.role_key != 'free')
      ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
    END IF;

    IF v_perm_import IS NOT NULL THEN
      INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role.id, v_module_id, v_perm_import,
        v_role.role_key IN ('admin', 'super_admin', 'manager'))
      ON CONFLICT (role_id, module_id, permission_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;


-- ══════════════════════════════════════════════════════════════════════════════
-- SECTION: StoryPot Cache Tables (source: 091_storypot_cache.sql, 092_fix_storypot_rls.sql)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS openproject_work_packages_cache (
  id BIGINT PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER,
  op_project_name TEXT,
  subject TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Normal',
  author TEXT,
  assignee TEXT,
  responsible TEXT,
  release_tag TEXT,
  testing_status TEXT,
  is_qa_missed TEXT,
  qa_confirmation TEXT,
  forwarded_to_testing_at TIMESTAMPTZ,
  forwarded_to_testing_by TEXT,
  handoff_verified BOOLEAN DEFAULT FALSE,
  handoff_count INTEGER DEFAULT 0,
  start_date DATE,
  due_date DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  percentage_done INTEGER DEFAULT 0,
  estimated_time TEXT,
  spent_time TEXT,
  story_points INTEGER,
  is_overdue BOOLEAN DEFAULT FALSE,
  version_name TEXT,
  raw_data JSONB,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  sync_source TEXT DEFAULT 'manual'
);

CREATE INDEX IF NOT EXISTS idx_wp_cache_forwarded_date ON openproject_work_packages_cache(forwarded_to_testing_at DESC NULLS LAST) WHERE forwarded_to_testing_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wp_cache_project_forwarded ON openproject_work_packages_cache(project_id, forwarded_to_testing_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_wp_cache_type ON openproject_work_packages_cache(type);
CREATE INDEX IF NOT EXISTS idx_wp_cache_bug_release ON openproject_work_packages_cache(release_tag) WHERE type = 'Bug' AND release_tag IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wp_cache_projects ON openproject_work_packages_cache(project_id, op_project_id);
CREATE INDEX IF NOT EXISTS idx_wp_cache_testing_status ON openproject_work_packages_cache(testing_status);
CREATE INDEX IF NOT EXISTS idx_wp_cache_status ON openproject_work_packages_cache(status);
CREATE INDEX IF NOT EXISTS idx_wp_cache_priority ON openproject_work_packages_cache(priority);
CREATE INDEX IF NOT EXISTS idx_wp_cache_author ON openproject_work_packages_cache(author);
CREATE INDEX IF NOT EXISTS idx_wp_cache_assignee ON openproject_work_packages_cache(assignee);
CREATE INDEX IF NOT EXISTS idx_wp_cache_due_date ON openproject_work_packages_cache(due_date) WHERE due_date IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_wp_cache_subject_search ON openproject_work_packages_cache USING gin(to_tsvector('english', subject));
CREATE INDEX IF NOT EXISTS idx_wp_cache_last_synced ON openproject_work_packages_cache(last_synced_at);

CREATE TABLE IF NOT EXISTS openproject_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER,
  last_full_sync_at TIMESTAMPTZ,
  last_incremental_sync_at TIMESTAMPTZ,
  last_sync_status TEXT DEFAULT 'pending',
  last_sync_error TEXT,
  total_work_packages INTEGER DEFAULT 0,
  work_packages_with_forwarding_date INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, op_project_id)
);

CREATE INDEX IF NOT EXISTS idx_sync_status_project ON openproject_sync_status(project_id);

ALTER TABLE openproject_work_packages_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE openproject_sync_status ENABLE ROW LEVEL SECURITY;

-- SELECT policies with admin/manager bypass (092_fix_storypot_rls.sql)
CREATE POLICY "Users can view cached work packages for their projects"
  ON openproject_work_packages_cache FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin', 'manager'))
    OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = openproject_work_packages_cache.project_id AND pm.user_id = auth.uid())
  );

-- Write policies: permission-based via RBAC (095_storypot_permission_based_rls.sql)
-- Any role with can_import enabled on story-pot module can write
CREATE POLICY "Admins can manage cached work packages"
  ON openproject_work_packages_cache FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM role_module_permissions rmp
      JOIN modules m   ON m.id  = rmp.module_id
      JOIN permissions p ON p.id = rmp.permission_id
      JOIN profiles pr  ON pr.id = auth.uid()
      JOIN roles r      ON r.role_key = pr.role
      WHERE m.module_key = 'story-pot' AND p.permission_key = 'can_import'
        AND rmp.role_id = r.id AND rmp.is_enabled = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_module_permissions rmp
      JOIN modules m   ON m.id  = rmp.module_id
      JOIN permissions p ON p.id = rmp.permission_id
      JOIN profiles pr  ON pr.id = auth.uid()
      JOIN roles r      ON r.role_key = pr.role
      WHERE m.module_key = 'story-pot' AND p.permission_key = 'can_import'
        AND rmp.role_id = r.id AND rmp.is_enabled = true
    )
  );

CREATE POLICY "Users can view sync status for their projects"
  ON openproject_sync_status FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin', 'manager'))
    OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = openproject_sync_status.project_id AND pm.user_id = auth.uid())
  );

CREATE POLICY "Admins can manage sync status"
  ON openproject_sync_status FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM role_module_permissions rmp
      JOIN modules m   ON m.id  = rmp.module_id
      JOIN permissions p ON p.id = rmp.permission_id
      JOIN profiles pr  ON pr.id = auth.uid()
      JOIN roles r      ON r.role_key = pr.role
      WHERE m.module_key = 'story-pot' AND p.permission_key = 'can_import'
        AND rmp.role_id = r.id AND rmp.is_enabled = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM role_module_permissions rmp
      JOIN modules m   ON m.id  = rmp.module_id
      JOIN permissions p ON p.id = rmp.permission_id
      JOIN profiles pr  ON pr.id = auth.uid()
      JOIN roles r      ON r.role_key = pr.role
      WHERE m.module_key = 'story-pot' AND p.permission_key = 'can_import'
        AND rmp.role_id = r.id AND rmp.is_enabled = true
    )
  );

CREATE OR REPLACE FUNCTION get_storypot_work_packages(
  p_project_id UUID, p_op_project_id INTEGER DEFAULT NULL, p_forwarded_from TIMESTAMPTZ DEFAULT NULL,
  p_forwarded_to TIMESTAMPTZ DEFAULT NULL, p_type TEXT DEFAULT NULL, p_status TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT NULL, p_release_tag TEXT DEFAULT NULL, p_testing_status TEXT DEFAULT NULL,
  p_author TEXT DEFAULT NULL, p_assignee TEXT DEFAULT NULL, p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 100, p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id BIGINT, subject TEXT, description TEXT, type TEXT, status TEXT, priority TEXT, author TEXT,
  assignee TEXT, release_tag TEXT, testing_status TEXT, is_qa_missed TEXT, qa_confirmation TEXT,
  forwarded_to_testing_at TIMESTAMPTZ, forwarded_to_testing_by TEXT, created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ, due_date DATE, is_overdue BOOLEAN, percentage_done INTEGER,
  op_project_name TEXT, total_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_total BIGINT;
BEGIN
  SELECT COUNT(*) INTO v_total FROM openproject_work_packages_cache c
  WHERE c.project_id = p_project_id
    AND (p_op_project_id IS NULL OR c.op_project_id = p_op_project_id)
    AND (p_forwarded_from IS NULL OR c.forwarded_to_testing_at >= p_forwarded_from)
    AND (p_forwarded_to IS NULL OR c.forwarded_to_testing_at <= p_forwarded_to)
    AND (p_type IS NULL OR c.type = p_type) AND (p_status IS NULL OR c.status = p_status)
    AND (p_priority IS NULL OR c.priority = p_priority) AND (p_release_tag IS NULL OR c.release_tag = p_release_tag)
    AND (p_testing_status IS NULL OR c.testing_status ILIKE '%' || p_testing_status || '%')
    AND (p_author IS NULL OR c.author ILIKE '%' || p_author || '%')
    AND (p_assignee IS NULL OR c.assignee ILIKE '%' || p_assignee || '%')
    AND (p_search IS NULL OR (c.subject ILIKE '%' || p_search || '%' OR c.id::TEXT = p_search));

  RETURN QUERY SELECT c.id, c.subject, c.description, c.type, c.status, c.priority, c.author, c.assignee,
    c.release_tag, c.testing_status, c.is_qa_missed, c.qa_confirmation, c.forwarded_to_testing_at,
    c.forwarded_to_testing_by, c.created_at, c.updated_at, c.due_date,
    (c.due_date IS NOT NULL AND c.due_date < CURRENT_DATE AND c.status NOT IN ('Closed', 'Done', 'Rejected') AND c.percentage_done < 100),
    c.percentage_done, c.op_project_name, v_total
  FROM openproject_work_packages_cache c
  WHERE c.project_id = p_project_id
    AND (p_op_project_id IS NULL OR c.op_project_id = p_op_project_id)
    AND (p_forwarded_from IS NULL OR c.forwarded_to_testing_at >= p_forwarded_from)
    AND (p_forwarded_to IS NULL OR c.forwarded_to_testing_at <= p_forwarded_to)
    AND (p_type IS NULL OR c.type = p_type) AND (p_status IS NULL OR c.status = p_status)
    AND (p_priority IS NULL OR c.priority = p_priority) AND (p_release_tag IS NULL OR c.release_tag = p_release_tag)
    AND (p_testing_status IS NULL OR c.testing_status ILIKE '%' || p_testing_status || '%')
    AND (p_author IS NULL OR c.author ILIKE '%' || p_author || '%')
    AND (p_assignee IS NULL OR c.assignee ILIKE '%' || p_assignee || '%')
    AND (p_search IS NULL OR (c.subject ILIKE '%' || p_search || '%' OR c.id::TEXT = p_search))
  ORDER BY c.forwarded_to_testing_at DESC NULLS LAST, c.updated_at DESC LIMIT p_limit OFFSET p_offset;
END;
$$;

CREATE OR REPLACE FUNCTION get_storypot_stats(p_project_id UUID, p_op_project_id INTEGER DEFAULT NULL)
RETURNS TABLE (
  total_count BIGINT, with_forwarding_date BIGINT, overdue_count BIGINT, unassigned_count BIGINT,
  by_status JSONB, by_type JSONB, by_priority JSONB, by_testing_status JSONB
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY SELECT COUNT(*)::BIGINT,
    COUNT(*) FILTER (WHERE c.forwarded_to_testing_at IS NOT NULL)::BIGINT,
    COUNT(*) FILTER (WHERE c.due_date IS NOT NULL AND c.due_date < CURRENT_DATE AND c.status NOT IN ('Closed', 'Done', 'Rejected') AND c.percentage_done < 100)::BIGINT,
    COUNT(*) FILTER (WHERE c.assignee IS NULL OR c.assignee = 'Unassigned')::BIGINT,
    COALESCE(jsonb_object_agg(c.status, status_count) FILTER (WHERE c.status IS NOT NULL), '{}'::JSONB),
    COALESCE(jsonb_object_agg(c.type, type_count) FILTER (WHERE c.type IS NOT NULL), '{}'::JSONB),
    COALESCE(jsonb_object_agg(c.priority, priority_count) FILTER (WHERE c.priority IS NOT NULL), '{}'::JSONB),
    COALESCE(jsonb_object_agg(c.testing_status, ts_count) FILTER (WHERE c.testing_status IS NOT NULL), '{}'::JSONB)
  FROM (SELECT status, type, priority, testing_status, due_date, percentage_done, assignee, forwarded_to_testing_at,
    COUNT(*) OVER (PARTITION BY status) as status_count, COUNT(*) OVER (PARTITION BY type) as type_count,
    COUNT(*) OVER (PARTITION BY priority) as priority_count, COUNT(*) OVER (PARTITION BY testing_status) as ts_count
    FROM openproject_work_packages_cache WHERE project_id = p_project_id AND (p_op_project_id IS NULL OR op_project_id = p_op_project_id)) c;
END;
$$;

GRANT SELECT ON openproject_work_packages_cache TO authenticated;
GRANT SELECT ON openproject_sync_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_storypot_work_packages TO authenticated;
GRANT EXECUTE ON FUNCTION get_storypot_stats TO authenticated;

-- 093: Remove duplicate sync_status rows (NULL != NULL in UNIQUE, so upsert
-- with op_project_id = NULL inserted a new row on every sync). Keep newest.
DELETE FROM openproject_sync_status
WHERE id NOT IN (
  SELECT DISTINCT ON (project_id, op_project_id) id
  FROM openproject_sync_status
  ORDER BY project_id, op_project_id, updated_at DESC NULLS LAST
);

-- 095: Rename can_import permission label to match frontend
UPDATE permissions
SET permission_name = 'Sync Data',
    description     = 'Can sync / import data (e.g. sync from OpenProject, import from Excel/CSV)'
WHERE permission_key = 'can_import';


-- ============================================================================
-- SECTION: Ticket Bowl Module (097-103)
-- ============================================================================

-- Register 'ticket-bowl' in RBAC modules registry
INSERT INTO modules (module_key, module_name, route_path, icon, is_active, sort_order)
VALUES ('ticket-bowl', 'Ticket Bowl', '/ticket-bowl', 'Ticket', true, 25)
ON CONFLICT (module_key) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- Populate role_module_permissions for 'ticket-bowl'
DO $$
DECLARE
  v_module_id UUID;
  v_perm_view UUID;
  v_perm_dashboard UUID;
  v_perm_export UUID;
  v_perm_import UUID;
  v_perm_history UUID;
  v_role RECORD;
BEGIN
  SELECT id INTO v_module_id FROM modules WHERE module_key = 'ticket-bowl';
  SELECT id INTO v_perm_view FROM permissions WHERE permission_key = 'can_view';
  SELECT id INTO v_perm_dashboard FROM permissions WHERE permission_key = 'can_view_dashboard';
  SELECT id INTO v_perm_export FROM permissions WHERE permission_key = 'can_export';
  SELECT id INTO v_perm_import FROM permissions WHERE permission_key = 'can_import';
  SELECT id INTO v_perm_history FROM permissions WHERE permission_key = 'can_view_history';

  FOR v_role IN SELECT id, role_key FROM roles LOOP
    IF v_perm_view IS NOT NULL THEN
      INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role.id, v_module_id, v_perm_view, true)
      ON CONFLICT (role_id, module_id, permission_id) DO UPDATE SET is_enabled = true;
    END IF;
    IF v_perm_dashboard IS NOT NULL THEN
      INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role.id, v_module_id, v_perm_dashboard, v_role.role_key IN ('admin', 'super_admin', 'pro', 'manager', 'qa_lead'))
      ON CONFLICT (role_id, module_id, permission_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    END IF;
    IF v_perm_export IS NOT NULL THEN
      INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role.id, v_module_id, v_perm_export, v_role.role_key != 'free')
      ON CONFLICT (role_id, module_id, permission_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    END IF;
    IF v_perm_import IS NOT NULL THEN
      INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role.id, v_module_id, v_perm_import, v_role.role_key IN ('admin', 'super_admin', 'manager'))
      ON CONFLICT (role_id, module_id, permission_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    END IF;
    IF v_perm_history IS NOT NULL THEN
      INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role.id, v_module_id, v_perm_history, v_role.role_key != 'free')
      ON CONFLICT (role_id, module_id, permission_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    END IF;
  END LOOP;
END $$;

-- ticket_bowl_work_packages table
CREATE TABLE IF NOT EXISTS ticket_bowl_work_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER,
  op_project_name TEXT,
  work_package_id BIGINT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  type_id INTEGER,
  type_name TEXT NOT NULL,
  status_id INTEGER,
  status_name TEXT NOT NULL,
  priority_id INTEGER,
  priority_name TEXT NOT NULL DEFAULT 'Normal',
  author_id INTEGER,
  author_name TEXT,
  assignee_id INTEGER,
  assignee_name TEXT,
  responsible_id INTEGER,
  responsible_name TEXT,
  testing_status TEXT,
  is_qa_missed TEXT,
  qa_confirmation TEXT,
  release_tag TEXT,
  version_name TEXT,
  percentage_done INTEGER DEFAULT 0,
  estimated_time TEXT,
  spent_time TEXT,
  story_points INTEGER,
  start_date DATE,
  due_date DATE,
  is_overdue BOOLEAN DEFAULT FALSE,
  created_at_op TIMESTAMPTZ,
  updated_at_op TIMESTAMPTZ,
  latest_forwarded_at TIMESTAMPTZ,
  latest_forwarded_by_id INTEGER,
  latest_forwarded_by_name TEXT,
  forwarding_count INTEGER DEFAULT 0,
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'sync_failed', 'partially_synced')),
  history_verification_status TEXT NOT NULL DEFAULT 'unavailable' CHECK (history_verification_status IN ('verified', 'unavailable', 'unverified', 'no_matching_event')),
  history_checked_at TIMESTAMPTZ,
  history_error TEXT,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  raw_custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_tb_wp_project_wpid UNIQUE (project_id, work_package_id)
);

-- ticket_bowl_forwarding_history table
CREATE TABLE IF NOT EXISTS ticket_bowl_forwarding_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER,
  work_package_id BIGINT NOT NULL,
  activity_id BIGINT,
  previous_testing_status TEXT,
  new_testing_status TEXT NOT NULL DEFAULT 'Forwarded to the Testing Team',
  changed_at TIMESTAMPTZ NOT NULL,
  changed_by_id INTEGER,
  changed_by_name TEXT NOT NULL,
  verification_status TEXT NOT NULL DEFAULT 'verified',
  source TEXT NOT NULL DEFAULT 'sync',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_tb_fwd_history UNIQUE (project_id, work_package_id, activity_id, changed_at)
);

-- ticket_bowl_sync_status table
CREATE TABLE IF NOT EXISTS ticket_bowl_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER,
  op_project_name TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_fetched INTEGER DEFAULT 0,
  total_inserted INTEGER DEFAULT 0,
  total_updated INTEGER DEFAULT 0,
  forwarding_events_found INTEGER DEFAULT 0,
  history_verified_count INTEGER DEFAULT 0,
  history_unavailable_count INTEGER DEFAULT 0,
  history_unverified_count INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  last_successful_sync_at TIMESTAMPTZ,
  error_details TEXT,
  reconciliation_status TEXT CHECK (reconciliation_status IN ('healthy', 'minor_issues', 'data_mismatch', 'critical_mismatch')),
  last_reconciliation_at TIMESTAMPTZ,
  missing_ticket_ids BIGINT[],
  duplicate_ticket_ids BIGINT[],
  openproject_total INTEGER DEFAULT 0,
  supabase_total INTEGER DEFAULT 0,
  missing_count INTEGER DEFAULT 0,
  duplicate_count INTEGER DEFAULT 0,
  verified_count INTEGER DEFAULT 0,
  unavailable_count INTEGER DEFAULT 0,
  unverified_count INTEGER DEFAULT 0,
  forwarding_events_count INTEGER DEFAULT 0,
  issues TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_tb_sync_status UNIQUE (project_id, op_project_id)
);

-- ticket_bowl_activity_sync_cursor table
CREATE TABLE IF NOT EXISTS ticket_bowl_activity_sync_cursor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  work_package_id BIGINT NOT NULL,
  last_activity_id BIGINT NOT NULL,
  last_activity_synced_at TIMESTAMPTZ NOT NULL,
  total_activities_fetched INTEGER DEFAULT 0,
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_activity_cursor UNIQUE (project_id, work_package_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_wp ON ticket_bowl_work_packages(project_id, work_package_id);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_op_proj ON ticket_bowl_work_packages(project_id, op_project_id);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_latest_fwd ON ticket_bowl_work_packages(project_id, latest_forwarded_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_testing_status ON ticket_bowl_work_packages(project_id, testing_status);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_type ON ticket_bowl_work_packages(project_id, type_name);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_status ON ticket_bowl_work_packages(project_id, status_name);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_priority ON ticket_bowl_work_packages(project_id, priority_name);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_assignee ON ticket_bowl_work_packages(project_id, assignee_name);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_author ON ticket_bowl_work_packages(project_id, author_name);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_qa_missed ON ticket_bowl_work_packages(project_id, is_qa_missed);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_history_verif ON ticket_bowl_work_packages(project_id, history_verification_status);
CREATE INDEX IF NOT EXISTS idx_tb_wp_subject_gin ON ticket_bowl_work_packages USING gin(to_tsvector('english', subject));
CREATE INDEX IF NOT EXISTS idx_tb_fwd_proj_changed_at ON ticket_bowl_forwarding_history(project_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tb_fwd_wp_changed_at ON ticket_bowl_forwarding_history(work_package_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tb_fwd_changed_at ON ticket_bowl_forwarding_history(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tb_sync_proj ON ticket_bowl_sync_status(project_id);
CREATE INDEX IF NOT EXISTS idx_tb_sync_reconciliation ON ticket_bowl_sync_status(project_id, last_reconciliation_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_activity_cursor_project_wp ON ticket_bowl_activity_sync_cursor(project_id, work_package_id);

-- RLS
ALTER TABLE ticket_bowl_work_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_bowl_forwarding_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_bowl_sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_bowl_activity_sync_cursor ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view ticket bowl work packages" ON ticket_bowl_work_packages FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin', 'manager'))
  OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ticket_bowl_work_packages.project_id AND pm.user_id = auth.uid())
);

CREATE POLICY "Users can view ticket bowl forwarding history" ON ticket_bowl_forwarding_history FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin', 'manager'))
  OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ticket_bowl_forwarding_history.project_id AND pm.user_id = auth.uid())
);

CREATE POLICY "Users can view ticket bowl sync status" ON ticket_bowl_sync_status FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin', 'manager'))
  OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ticket_bowl_sync_status.project_id AND pm.user_id = auth.uid())
);

CREATE POLICY "Users can view activity sync cursors" ON ticket_bowl_activity_sync_cursor FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin', 'manager'))
  OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ticket_bowl_activity_sync_cursor.project_id AND pm.user_id = auth.uid())
);

CREATE POLICY "Authorized users can manage ticket bowl work packages" ON ticket_bowl_work_packages FOR ALL USING (
  EXISTS (
    SELECT 1 FROM role_module_permissions rmp
    JOIN modules m ON m.id = rmp.module_id
    JOIN permissions p ON p.id = rmp.permission_id
    JOIN profiles pr ON pr.id = auth.uid()
    JOIN roles r ON r.role_key = pr.role
    WHERE m.module_key = 'ticket-bowl' AND p.permission_key = 'can_import' AND rmp.role_id = r.id AND rmp.is_enabled = true
  )
);

CREATE POLICY "Authorized users can manage ticket bowl forwarding history" ON ticket_bowl_forwarding_history FOR ALL USING (
  EXISTS (
    SELECT 1 FROM role_module_permissions rmp
    JOIN modules m ON m.id = rmp.module_id
    JOIN permissions p ON p.id = rmp.permission_id
    JOIN profiles pr ON pr.id = auth.uid()
    JOIN roles r ON r.role_key = pr.role
    WHERE m.module_key = 'ticket-bowl' AND p.permission_key = 'can_import' AND rmp.role_id = r.id AND rmp.is_enabled = true
  )
);

CREATE POLICY "Authorized users can manage ticket bowl sync status" ON ticket_bowl_sync_status FOR ALL USING (
  EXISTS (
    SELECT 1 FROM role_module_permissions rmp
    JOIN modules m ON m.id = rmp.module_id
    JOIN permissions p ON p.id = rmp.permission_id
    JOIN profiles pr ON pr.id = auth.uid()
    JOIN roles r ON r.role_key = pr.role
    WHERE m.module_key = 'ticket-bowl' AND p.permission_key = 'can_import' AND rmp.role_id = r.id AND rmp.is_enabled = true
  )
);

CREATE POLICY "Authorized users can manage activity sync cursors" ON ticket_bowl_activity_sync_cursor FOR ALL USING (
  EXISTS (
    SELECT 1 FROM role_module_permissions rmp
    JOIN modules m ON m.id = rmp.module_id
    JOIN permissions p ON p.id = rmp.permission_id
    JOIN profiles pr ON pr.id = auth.uid()
    JOIN roles r ON r.role_key = pr.role
    WHERE m.module_key = 'ticket-bowl' AND p.permission_key = 'can_import' AND rmp.role_id = r.id AND rmp.is_enabled = true
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_bowl_work_packages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_bowl_forwarding_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_bowl_sync_status TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_bowl_activity_sync_cursor TO authenticated;

-- get_ticket_bowl_work_packages function
CREATE OR REPLACE FUNCTION get_ticket_bowl_work_packages(
  p_project_id UUID, p_op_project_id INTEGER DEFAULT NULL, p_forwarded_from TIMESTAMPTZ DEFAULT NULL,
  p_forwarded_to TIMESTAMPTZ DEFAULT NULL, p_type_name TEXT DEFAULT NULL, p_status_name TEXT DEFAULT NULL,
  p_priority_name TEXT DEFAULT NULL, p_testing_status TEXT DEFAULT NULL, p_is_qa_missed TEXT DEFAULT NULL,
  p_author_name TEXT DEFAULT NULL, p_assignee_name TEXT DEFAULT NULL, p_history_verification_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 25, p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID, project_id UUID, op_project_id INTEGER, op_project_name TEXT, work_package_id BIGINT,
  subject TEXT, description TEXT, type_id INTEGER, type_name TEXT, status_id INTEGER, status_name TEXT,
  priority_id INTEGER, priority_name TEXT, author_id INTEGER, author_name TEXT, assignee_id INTEGER,
  assignee_name TEXT, responsible_id INTEGER, responsible_name TEXT, testing_status TEXT, is_qa_missed TEXT,
  qa_confirmation TEXT, release_tag TEXT, version_name TEXT, percentage_done INTEGER, estimated_time TEXT,
  spent_time TEXT, story_points INTEGER, start_date DATE, due_date DATE, is_overdue BOOLEAN,
  created_at_op TIMESTAMPTZ, updated_at_op TIMESTAMPTZ, matched_forwarded_at TIMESTAMPTZ,
  matched_forwarded_by TEXT, forwarding_count INTEGER, sync_status TEXT, history_verification_status TEXT,
  history_checked_at TIMESTAMPTZ, last_synced_at TIMESTAMPTZ, total_matching_count BIGINT
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_total BIGINT;
BEGIN
  SELECT COUNT(DISTINCT wp.id) INTO v_total FROM ticket_bowl_work_packages wp
  WHERE wp.project_id = p_project_id
    AND (p_op_project_id IS NULL OR wp.op_project_id = p_op_project_id)
    AND (p_type_name IS NULL OR wp.type_name = p_type_name)
    AND (p_status_name IS NULL OR wp.status_name = p_status_name)
    AND (p_priority_name IS NULL OR wp.priority_name = p_priority_name)
    AND (p_testing_status IS NULL OR wp.testing_status = p_testing_status)
    AND (p_is_qa_missed IS NULL OR wp.is_qa_missed = p_is_qa_missed)
    AND (p_author_name IS NULL OR wp.author_name ILIKE '%' || p_author_name || '%')
    AND (p_assignee_name IS NULL OR wp.assignee_name ILIKE '%' || p_assignee_name || '%')
    AND (p_history_verification_status IS NULL OR wp.history_verification_status = p_history_verification_status)
    AND (p_search IS NULL OR wp.subject ILIKE '%' || p_search || '%' OR wp.work_package_id::TEXT = p_search)
    AND ((p_forwarded_from IS NULL AND p_forwarded_to IS NULL) OR EXISTS (
      SELECT 1 FROM ticket_bowl_forwarding_history fh
      WHERE fh.project_id = wp.project_id AND fh.work_package_id = wp.work_package_id
        AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
        AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
    ));

  RETURN QUERY SELECT wp.id, wp.project_id, wp.op_project_id, wp.op_project_name, wp.work_package_id,
    wp.subject, wp.description, wp.type_id, wp.type_name, wp.status_id, wp.status_name,
    wp.priority_id, wp.priority_name, wp.author_id, wp.author_name, wp.assignee_id, wp.assignee_name,
    wp.responsible_id, wp.responsible_name, wp.testing_status, wp.is_qa_missed, wp.qa_confirmation,
    wp.release_tag, wp.version_name, wp.percentage_done, wp.estimated_time, wp.spent_time,
    wp.story_points, wp.start_date, wp.due_date, wp.is_overdue, wp.created_at_op, wp.updated_at_op,
    COALESCE((SELECT fh.changed_at FROM ticket_bowl_forwarding_history fh
      WHERE fh.project_id = wp.project_id AND fh.work_package_id = wp.work_package_id
        AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
        AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
      ORDER BY fh.changed_at DESC LIMIT 1), wp.latest_forwarded_at) AS matched_forwarded_at,
    COALESCE((SELECT fh.changed_by_name FROM ticket_bowl_forwarding_history fh
      WHERE fh.project_id = wp.project_id AND fh.work_package_id = wp.work_package_id
        AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
        AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
      ORDER BY fh.changed_at DESC LIMIT 1), wp.latest_forwarded_by_name) AS matched_forwarded_by,
    wp.forwarding_count, wp.sync_status, wp.history_verification_status, wp.history_checked_at,
    wp.last_synced_at, v_total AS total_matching_count
  FROM ticket_bowl_work_packages wp
  WHERE wp.project_id = p_project_id
    AND (p_op_project_id IS NULL OR wp.op_project_id = p_op_project_id)
    AND (p_type_name IS NULL OR wp.type_name = p_type_name)
    AND (p_status_name IS NULL OR wp.status_name = p_status_name)
    AND (p_priority_name IS NULL OR wp.priority_name = p_priority_name)
    AND (p_testing_status IS NULL OR wp.testing_status = p_testing_status)
    AND (p_is_qa_missed IS NULL OR wp.is_qa_missed = p_is_qa_missed)
    AND (p_author_name IS NULL OR wp.author_name ILIKE '%' || p_author_name || '%')
    AND (p_assignee_name IS NULL OR wp.assignee_name ILIKE '%' || p_assignee_name || '%')
    AND (p_history_verification_status IS NULL OR wp.history_verification_status = p_history_verification_status)
    AND (p_search IS NULL OR wp.subject ILIKE '%' || p_search || '%' OR wp.work_package_id::TEXT = p_search)
    AND ((p_forwarded_from IS NULL AND p_forwarded_to IS NULL) OR EXISTS (
      SELECT 1 FROM ticket_bowl_forwarding_history fh
      WHERE fh.project_id = wp.project_id AND fh.work_package_id = wp.work_package_id
        AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
        AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
    ))
  ORDER BY COALESCE((SELECT fh.changed_at FROM ticket_bowl_forwarding_history fh
    WHERE fh.project_id = wp.project_id AND fh.work_package_id = wp.work_package_id
      AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
      AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
    ORDER BY fh.changed_at DESC LIMIT 1), wp.latest_forwarded_at) DESC NULLS LAST,
    wp.updated_at_op DESC NULLS LAST, wp.work_package_id DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- get_ticket_bowl_dashboard_stats function
CREATE OR REPLACE FUNCTION get_ticket_bowl_dashboard_stats(
  p_project_id UUID, p_op_project_id INTEGER DEFAULT NULL, p_forwarded_from TIMESTAMPTZ DEFAULT NULL,
  p_forwarded_to TIMESTAMPTZ DEFAULT NULL, p_type_name TEXT DEFAULT NULL, p_status_name TEXT DEFAULT NULL,
  p_priority_name TEXT DEFAULT NULL, p_testing_status TEXT DEFAULT NULL, p_is_qa_missed TEXT DEFAULT NULL,
  p_author_name TEXT DEFAULT NULL, p_assignee_name TEXT DEFAULT NULL, p_history_verification_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_unique_tickets BIGINT, total_forwarding_events BIGINT, repeat_forwarded_tickets BIGINT,
  unavailable_history_tickets BIGINT, current_testing_status_counts JSONB, qa_missed_counts JSONB,
  type_counts JSONB, status_counts JSONB, priority_counts JSONB, history_verification_counts JSONB
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  WITH matched_tickets AS (
    SELECT wp.* FROM ticket_bowl_work_packages wp
    WHERE wp.project_id = p_project_id
      AND (p_op_project_id IS NULL OR wp.op_project_id = p_op_project_id)
      AND (p_type_name IS NULL OR wp.type_name = p_type_name)
      AND (p_status_name IS NULL OR wp.status_name = p_status_name)
      AND (p_priority_name IS NULL OR wp.priority_name = p_priority_name)
      AND (p_testing_status IS NULL OR wp.testing_status = p_testing_status)
      AND (p_is_qa_missed IS NULL OR wp.is_qa_missed = p_is_qa_missed)
      AND (p_author_name IS NULL OR wp.author_name ILIKE '%' || p_author_name || '%')
      AND (p_assignee_name IS NULL OR wp.assignee_name ILIKE '%' || p_assignee_name || '%')
      AND (p_history_verification_status IS NULL OR wp.history_verification_status = p_history_verification_status)
      AND (p_search IS NULL OR wp.subject ILIKE '%' || p_search || '%' OR wp.work_package_id::TEXT = p_search)
      AND ((p_forwarded_from IS NULL AND p_forwarded_to IS NULL) OR EXISTS (
        SELECT 1 FROM ticket_bowl_forwarding_history fh
        WHERE fh.project_id = wp.project_id AND fh.work_package_id = wp.work_package_id
          AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
          AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
      ))
  ),
  events_in_range AS (
    SELECT COUNT(*) AS event_count FROM ticket_bowl_forwarding_history fh
    JOIN matched_tickets mt ON mt.project_id = fh.project_id AND mt.work_package_id = fh.work_package_id
    WHERE (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
      AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
  )
  SELECT
    (SELECT COUNT(*) FROM matched_tickets)::bigint,
    (SELECT event_count FROM events_in_range)::bigint,
    (SELECT COUNT(*) FROM matched_tickets WHERE forwarding_count > 1)::bigint,
    (SELECT COUNT(*) FROM matched_tickets WHERE history_verification_status = 'unavailable')::bigint,
    COALESCE((SELECT jsonb_object_agg(COALESCE(testing_status, 'No Testing Status'), cnt) FROM (SELECT testing_status, COUNT(*)::bigint AS cnt FROM matched_tickets GROUP BY testing_status) s), '{}'::jsonb),
    COALESCE((SELECT jsonb_object_agg(COALESCE(is_qa_missed, 'Unknown'), cnt) FROM (SELECT is_qa_missed, COUNT(*)::bigint AS cnt FROM matched_tickets GROUP BY is_qa_missed) s), '{}'::jsonb),
    COALESCE((SELECT jsonb_object_agg(COALESCE(type_name, 'Unknown'), cnt) FROM (SELECT type_name, COUNT(*)::bigint AS cnt FROM matched_tickets GROUP BY type_name) s), '{}'::jsonb),
    COALESCE((SELECT jsonb_object_agg(COALESCE(status_name, 'Unknown'), cnt) FROM (SELECT status_name, COUNT(*)::bigint AS cnt FROM matched_tickets GROUP BY status_name) s), '{}'::jsonb),
    COALESCE((SELECT jsonb_object_agg(COALESCE(priority_name, 'Normal'), cnt) FROM (SELECT priority_name, COUNT(*)::bigint AS cnt FROM matched_tickets GROUP BY priority_name) s), '{}'::jsonb),
    COALESCE((SELECT jsonb_object_agg(COALESCE(history_verification_status, 'unavailable'), cnt) FROM (SELECT history_verification_status, COUNT(*)::bigint AS cnt FROM matched_tickets GROUP BY history_verification_status) s), '{}'::jsonb);
END;
$$;

GRANT EXECUTE ON FUNCTION get_ticket_bowl_work_packages TO authenticated;
GRANT EXECUTE ON FUNCTION get_ticket_bowl_dashboard_stats TO authenticated;

-- sync_jobs table (102)
CREATE TABLE IF NOT EXISTS sync_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  status TEXT NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  phase TEXT,
  progress_current INTEGER DEFAULT 0,
  progress_total INTEGER DEFAULT 0,
  progress_message TEXT,
  result_summary JSONB,
  error_message TEXT,
  op_project_id INTEGER,
  op_project_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sync_jobs_project_status ON sync_jobs(project_id, status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_user_created ON sync_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status_updated ON sync_jobs(status, updated_at DESC);

ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view sync jobs" ON sync_jobs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles up WHERE up.id = auth.uid() AND up.role IN ('admin', 'super_admin', 'manager'))
  OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = sync_jobs.project_id AND pm.user_id = auth.uid())
);

CREATE POLICY "Users can create sync jobs" ON sync_jobs FOR INSERT WITH CHECK (
  auth.uid() IS NOT NULL AND user_id = auth.uid() AND (
    EXISTS (SELECT 1 FROM profiles up WHERE up.id = auth.uid() AND up.role IN ('admin', 'super_admin', 'manager'))
    OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = sync_jobs.project_id AND pm.user_id = auth.uid() AND pm.project_role IN ('owner', 'lead'))
  )
);

CREATE POLICY "Users can update sync jobs" ON sync_jobs FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

GRANT SELECT, INSERT, UPDATE ON sync_jobs TO authenticated;

-- get_active_sync_job function
CREATE OR REPLACE FUNCTION get_active_sync_job(p_project_id UUID)
RETURNS TABLE (
  id UUID, project_id UUID, op_project_id INTEGER, op_project_name TEXT, status TEXT, phase TEXT,
  progress_current INTEGER, progress_total INTEGER, progress_message TEXT, started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ, error_message TEXT, result_summary JSONB, created_at TIMESTAMPTZ, updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin', 'manager'))
    OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p_project_id AND pm.user_id = auth.uid())
  ) THEN RAISE EXCEPTION 'Access denied'; END IF;
  RETURN QUERY SELECT sj.id, sj.project_id, sj.op_project_id, sj.op_project_name, sj.status, sj.phase,
    sj.progress_current, sj.progress_total, sj.progress_message, sj.started_at, sj.completed_at,
    sj.error_message, sj.result_summary, sj.created_at, sj.updated_at
  FROM sync_jobs sj WHERE sj.project_id = p_project_id AND sj.status IN ('pending', 'running')
  ORDER BY sj.created_at DESC LIMIT 1;
END;
$$;

-- cancel_sync_job function
CREATE OR REPLACE FUNCTION cancel_sync_job(p_job_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF NOT EXISTS (
    SELECT 1 FROM sync_jobs sj WHERE sj.id = p_job_id AND (
      sj.user_id = v_user_id OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = v_user_id AND p.role IN ('admin', 'super_admin'))
    )
  ) THEN RETURN jsonb_build_object('success', false, 'message', 'Access denied'); END IF;
  UPDATE sync_jobs SET status = 'cancelled', updated_at = NOW(), completed_at = CASE WHEN completed_at IS NULL THEN NOW() ELSE completed_at END
  WHERE id = p_job_id AND status IN ('pending', 'running');
  IF FOUND THEN RETURN jsonb_build_object('success', true, 'message', 'Job cancelled successfully');
  ELSE RETURN jsonb_build_object('success', false, 'message', 'Job not found or already completed'); END IF;
END;
$$;

-- cleanup_stuck_sync_jobs function
CREATE OR REPLACE FUNCTION cleanup_stuck_sync_jobs()
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_count INTEGER;
BEGIN
  UPDATE sync_jobs SET status = 'failed', error_message = 'Job timed out (stuck for more than 30 minutes)',
    completed_at = NOW(), updated_at = NOW()
  WHERE status IN ('pending', 'running') AND created_at < NOW() - INTERVAL '30 minutes';
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION get_active_sync_job TO authenticated;
GRANT EXECUTE ON FUNCTION cancel_sync_job TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_stuck_sync_jobs TO authenticated;

-- Staging tables (103)
CREATE TABLE IF NOT EXISTS ticket_bowl_work_packages_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER, op_project_name TEXT, work_package_id BIGINT NOT NULL, subject TEXT NOT NULL,
  description TEXT, type_id INTEGER, type_name TEXT NOT NULL, status_id INTEGER, status_name TEXT NOT NULL,
  priority_id INTEGER, priority_name TEXT NOT NULL DEFAULT 'Normal', author_id INTEGER, author_name TEXT,
  assignee_id INTEGER, assignee_name TEXT, responsible_id INTEGER, responsible_name TEXT, testing_status TEXT,
  is_qa_missed TEXT, qa_confirmation TEXT, release_tag TEXT, version_name TEXT, percentage_done INTEGER DEFAULT 0,
  estimated_time TEXT, spent_time TEXT, story_points INTEGER, start_date DATE, due_date DATE,
  is_overdue BOOLEAN DEFAULT FALSE, created_at_op TIMESTAMPTZ, updated_at_op TIMESTAMPTZ,
  latest_forwarded_at TIMESTAMPTZ, latest_forwarded_by_id INTEGER, latest_forwarded_by_name TEXT,
  forwarding_count INTEGER DEFAULT 0, sync_status TEXT NOT NULL DEFAULT 'synced',
  history_verification_status TEXT NOT NULL DEFAULT 'unavailable', history_checked_at TIMESTAMPTZ,
  history_error TEXT, last_synced_at TIMESTAMPTZ DEFAULT NOW(), raw_custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_staging_job_wp UNIQUE (job_id, project_id, work_package_id)
);

CREATE TABLE IF NOT EXISTS ticket_bowl_forwarding_history_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER, work_package_id BIGINT NOT NULL, activity_id BIGINT, previous_testing_status TEXT,
  new_testing_status TEXT NOT NULL DEFAULT 'Forwarded to the Testing Team', changed_at TIMESTAMPTZ NOT NULL,
  changed_by_id INTEGER, changed_by_name TEXT NOT NULL, verification_status TEXT NOT NULL DEFAULT 'verified',
  source TEXT NOT NULL DEFAULT 'sync', created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_staging_fwd_history UNIQUE (job_id, project_id, work_package_id, activity_id, changed_at)
);

CREATE TABLE IF NOT EXISTS ticket_bowl_testing_status_history_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES sync_jobs(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER, work_package_id BIGINT NOT NULL, activity_id BIGINT, previous_testing_status TEXT,
  new_testing_status TEXT NOT NULL, changed_at TIMESTAMPTZ NOT NULL, changed_by_id INTEGER,
  changed_by_name TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'sync', created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_staging_status_history UNIQUE (job_id, project_id, work_package_id, activity_id, changed_at)
);

CREATE TABLE IF NOT EXISTS ticket_bowl_testing_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER, work_package_id BIGINT NOT NULL, activity_id BIGINT, previous_testing_status TEXT,
  new_testing_status TEXT NOT NULL, changed_at TIMESTAMPTZ NOT NULL, changed_by_id INTEGER,
  changed_by_name TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'sync', created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT uq_tb_status_history UNIQUE (project_id, work_package_id, activity_id, changed_at)
);

CREATE INDEX IF NOT EXISTS idx_staging_wp_job_id ON ticket_bowl_work_packages_staging(job_id);
CREATE INDEX IF NOT EXISTS idx_staging_wp_project_id ON ticket_bowl_work_packages_staging(project_id);
CREATE INDEX IF NOT EXISTS idx_staging_fwd_job_id ON ticket_bowl_forwarding_history_staging(job_id);
CREATE INDEX IF NOT EXISTS idx_staging_fwd_project_id ON ticket_bowl_forwarding_history_staging(project_id);
CREATE INDEX IF NOT EXISTS idx_staging_status_job_id ON ticket_bowl_testing_status_history_staging(job_id);
CREATE INDEX IF NOT EXISTS idx_staging_status_project_id ON ticket_bowl_testing_status_history_staging(project_id);

ALTER TABLE ticket_bowl_work_packages_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_bowl_forwarding_history_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_bowl_testing_status_history_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_bowl_testing_status_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staging_wp_access" ON ticket_bowl_work_packages_staging FOR ALL USING (
  project_id IN (SELECT p.id FROM projects p LEFT JOIN project_members pm ON pm.project_id = p.id
    WHERE pm.user_id = auth.uid() OR p.created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles up WHERE up.id = auth.uid() AND up.role IN ('admin', 'manager')))
);
CREATE POLICY "staging_fwd_access" ON ticket_bowl_forwarding_history_staging FOR ALL USING (
  project_id IN (SELECT p.id FROM projects p LEFT JOIN project_members pm ON pm.project_id = p.id
    WHERE pm.user_id = auth.uid() OR p.created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles up WHERE up.id = auth.uid() AND up.role IN ('admin', 'manager')))
);
CREATE POLICY "staging_status_access" ON ticket_bowl_testing_status_history_staging FOR ALL USING (
  project_id IN (SELECT p.id FROM projects p LEFT JOIN project_members pm ON pm.project_id = p.id
    WHERE pm.user_id = auth.uid() OR p.created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles up WHERE up.id = auth.uid() AND up.role IN ('admin', 'manager')))
);
CREATE POLICY "status_history_access" ON ticket_bowl_testing_status_history FOR ALL USING (
  project_id IN (SELECT p.id FROM projects p LEFT JOIN project_members pm ON pm.project_id = p.id
    WHERE pm.user_id = auth.uid() OR p.created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles up WHERE up.id = auth.uid() AND up.role IN ('admin', 'manager')))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_bowl_work_packages_staging TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_bowl_forwarding_history_staging TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_bowl_testing_status_history_staging TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_bowl_testing_status_history TO authenticated;

-- commit_sync_data function
CREATE OR REPLACE FUNCTION commit_sync_data(p_job_id UUID, p_project_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_wp_inserted INT := 0; v_wp_updated INT := 0; v_fwd_inserted INT := 0; v_status_inserted INT := 0; v_job_status TEXT;
BEGIN
  SELECT status INTO v_job_status FROM sync_jobs WHERE id = p_job_id AND project_id = p_project_id;
  IF v_job_status IS NULL THEN RAISE EXCEPTION 'Sync job not found: %', p_job_id; END IF;
  IF v_job_status = 'cancelled' THEN
    DELETE FROM ticket_bowl_work_packages_staging WHERE job_id = p_job_id;
    DELETE FROM ticket_bowl_forwarding_history_staging WHERE job_id = p_job_id;
    DELETE FROM ticket_bowl_testing_status_history_staging WHERE job_id = p_job_id;
    RETURN jsonb_build_object('success', false, 'message', 'Job was cancelled', 'wp_inserted', 0, 'wp_updated', 0, 'fwd_inserted', 0, 'status_inserted', 0);
  END IF;
  SELECT COUNT(*) INTO v_wp_inserted FROM ticket_bowl_work_packages_staging
  WHERE job_id = p_job_id AND project_id = p_project_id AND work_package_id NOT IN (SELECT work_package_id FROM ticket_bowl_work_packages WHERE project_id = p_project_id);
  v_wp_updated := (SELECT COUNT(*) FROM ticket_bowl_work_packages_staging s WHERE s.job_id = p_job_id AND s.project_id = p_project_id
    AND EXISTS (SELECT 1 FROM ticket_bowl_work_packages p WHERE p.project_id = s.project_id AND p.work_package_id = s.work_package_id));
  INSERT INTO ticket_bowl_work_packages (project_id, op_project_id, op_project_name, work_package_id, subject, description, type_id, type_name, status_id, status_name, priority_id, priority_name, author_id, author_name, assignee_id, assignee_name, responsible_id, responsible_name, testing_status, is_qa_missed, qa_confirmation, release_tag, version_name, percentage_done, estimated_time, spent_time, story_points, start_date, due_date, is_overdue, created_at_op, updated_at_op, latest_forwarded_at, latest_forwarded_by_id, latest_forwarded_by_name, forwarding_count, sync_status, history_verification_status, history_checked_at, history_error, last_synced_at, raw_custom_fields, created_at, updated_at)
  SELECT project_id, op_project_id, op_project_name, work_package_id, subject, description, type_id, type_name, status_id, status_name, priority_id, priority_name, author_id, author_name, assignee_id, assignee_name, responsible_id, responsible_name, testing_status, is_qa_missed, qa_confirmation, release_tag, version_name, percentage_done, estimated_time, spent_time, story_points, start_date, due_date, is_overdue, created_at_op, updated_at_op, latest_forwarded_at, latest_forwarded_by_id, latest_forwarded_by_name, forwarding_count, sync_status, history_verification_status, history_checked_at, history_error, last_synced_at, raw_custom_fields, created_at, updated_at
  FROM ticket_bowl_work_packages_staging WHERE job_id = p_job_id AND project_id = p_project_id
  ON CONFLICT (project_id, work_package_id) DO UPDATE SET op_project_id = EXCLUDED.op_project_id, op_project_name = EXCLUDED.op_project_name, subject = EXCLUDED.subject, description = EXCLUDED.description, type_id = EXCLUDED.type_id, type_name = EXCLUDED.type_name, status_id = EXCLUDED.status_id, status_name = EXCLUDED.status_name, priority_id = EXCLUDED.priority_id, priority_name = EXCLUDED.priority_name, author_id = EXCLUDED.author_id, author_name = EXCLUDED.author_name, assignee_id = EXCLUDED.assignee_id, assignee_name = EXCLUDED.assignee_name, responsible_id = EXCLUDED.responsible_id, responsible_name = EXCLUDED.responsible_name, testing_status = EXCLUDED.testing_status, is_qa_missed = EXCLUDED.is_qa_missed, qa_confirmation = EXCLUDED.qa_confirmation, release_tag = EXCLUDED.release_tag, version_name = EXCLUDED.version_name, percentage_done = EXCLUDED.percentage_done, estimated_time = EXCLUDED.estimated_time, spent_time = EXCLUDED.spent_time, story_points = EXCLUDED.story_points, start_date = EXCLUDED.start_date, due_date = EXCLUDED.due_date, is_overdue = EXCLUDED.is_overdue, created_at_op = EXCLUDED.created_at_op, updated_at_op = EXCLUDED.updated_at_op, latest_forwarded_at = EXCLUDED.latest_forwarded_at, latest_forwarded_by_id = EXCLUDED.latest_forwarded_by_id, latest_forwarded_by_name = EXCLUDED.latest_forwarded_by_name, forwarding_count = EXCLUDED.forwarding_count, sync_status = EXCLUDED.sync_status, history_verification_status = EXCLUDED.history_verification_status, history_checked_at = EXCLUDED.history_checked_at, history_error = EXCLUDED.history_error, last_synced_at = EXCLUDED.last_synced_at, raw_custom_fields = EXCLUDED.raw_custom_fields, updated_at = EXCLUDED.updated_at;
  INSERT INTO ticket_bowl_forwarding_history (project_id, op_project_id, work_package_id, activity_id, previous_testing_status, new_testing_status, changed_at, changed_by_id, changed_by_name, verification_status, source, created_at)
  SELECT project_id, op_project_id, work_package_id, activity_id, previous_testing_status, new_testing_status, changed_at, changed_by_id, changed_by_name, verification_status, source, created_at
  FROM ticket_bowl_forwarding_history_staging WHERE job_id = p_job_id AND project_id = p_project_id
  ON CONFLICT (project_id, work_package_id, activity_id, changed_at) DO NOTHING;
  GET DIAGNOSTICS v_fwd_inserted = ROW_COUNT;
  INSERT INTO ticket_bowl_testing_status_history (project_id, op_project_id, work_package_id, activity_id, previous_testing_status, new_testing_status, changed_at, changed_by_id, changed_by_name, source, created_at)
  SELECT project_id, op_project_id, work_package_id, activity_id, previous_testing_status, new_testing_status, changed_at, changed_by_id, changed_by_name, source, created_at
  FROM ticket_bowl_testing_status_history_staging WHERE job_id = p_job_id AND project_id = p_project_id
  ON CONFLICT (project_id, work_package_id, activity_id, changed_at) DO NOTHING;
  GET DIAGNOSTICS v_status_inserted = ROW_COUNT;
  DELETE FROM ticket_bowl_work_packages_staging WHERE job_id = p_job_id;
  DELETE FROM ticket_bowl_forwarding_history_staging WHERE job_id = p_job_id;
  DELETE FROM ticket_bowl_testing_status_history_staging WHERE job_id = p_job_id;
  RETURN jsonb_build_object('success', true, 'message', 'Sync data committed successfully', 'wp_inserted', v_wp_inserted, 'wp_updated', v_wp_updated, 'fwd_inserted', v_fwd_inserted, 'status_inserted', v_status_inserted);
END;
$$;

-- cleanup_staging_data function
CREATE OR REPLACE FUNCTION cleanup_staging_data(p_job_id UUID)
RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_wp_deleted INT := 0; v_fwd_deleted INT := 0; v_status_deleted INT := 0;
BEGIN
  DELETE FROM ticket_bowl_work_packages_staging WHERE job_id = p_job_id; GET DIAGNOSTICS v_wp_deleted = ROW_COUNT;
  DELETE FROM ticket_bowl_forwarding_history_staging WHERE job_id = p_job_id; GET DIAGNOSTICS v_fwd_deleted = ROW_COUNT;
  DELETE FROM ticket_bowl_testing_status_history_staging WHERE job_id = p_job_id; GET DIAGNOSTICS v_status_deleted = ROW_COUNT;
  RETURN jsonb_build_object('success', true, 'message', 'Staging data cleaned up', 'wp_deleted', v_wp_deleted, 'fwd_deleted', v_fwd_deleted, 'status_deleted', v_status_deleted);
END;
$$;

GRANT EXECUTE ON FUNCTION commit_sync_data(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_staging_data(UUID) TO authenticated;

-- ============================================================================
-- END OF combined_qaly_schema.sql
-- ============================================================================
