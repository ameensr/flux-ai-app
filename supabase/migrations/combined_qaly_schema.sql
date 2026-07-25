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
--   Reconciled from migrations 000..061 + every supabase.from()/rpc() call in
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
create policy "profiles_read_authenticated" on public.profiles
  for select using ( auth.role() = 'authenticated' );

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
  created_by           uuid not null references auth.users(id),
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
  user_id            uuid not null references auth.users(id),
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
  created_by    uuid not null references auth.users(id),
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
  changed_by    uuid not null references auth.users(id),
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

create or replace function private.can_modify_project_member_role(
  p_member_id uuid,
  p_new_role  text
) returns boolean language plpgsql stable security definer as $$
declare
  v_current_user_role text;
  v_target_current_role text;
  v_project_id uuid;
  v_owner_count int;
begin
  if private.is_super_admin() then return true; end if;
  if private.is_admin() or private.is_project_manager() then return true; end if;

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
) returns boolean language plpgsql stable security definer as $$
declare
  v_current_user_role text;
  v_target_role text;
  v_target_user_id uuid;
  v_project_id uuid;
  v_owner_count int;
begin
  if private.is_super_admin() then return true; end if;
  if private.is_admin() or private.is_project_manager() then return true; end if;

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

create policy "projects_select" on public.projects for select using (
  private.is_admin() or private.is_project_manager() or private.is_project_member(id)
);
create policy "projects_insert" on public.projects for insert with check (
  private.is_admin() or private.is_project_manager()
);
create policy "projects_update" on public.projects for update using (
  private.is_admin() or private.is_project_owner_or_lead(id) or private.is_project_manager()
);
-- Final version from 043_fix_project_deletion_permissions.sql: owners only, not leads
create policy "projects_delete" on public.projects for delete using (
  private.is_admin() or private.is_project_owner(id)
);

-- ── RLS: project_members ──────────────────────────────────────────────────────

alter table public.project_members enable row level security;

drop policy if exists "project_members_select" on public.project_members;
drop policy if exists "project_members_insert" on public.project_members;
drop policy if exists "project_members_update" on public.project_members;
drop policy if exists "project_members_delete" on public.project_members;

create policy "project_members_select" on public.project_members for select using (
  private.is_admin() or private.is_project_member(project_id) or private.is_project_manager()
);
create policy "project_members_insert" on public.project_members for insert with check (
  private.is_admin() or private.is_project_owner_or_lead(project_id) or private.is_project_manager()
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
returns trigger language plpgsql as $$
declare
  v_owner_count int;
begin
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
returns trigger language plpgsql as $$
declare
  v_owner_count int;
begin
  if private.is_super_admin() then return old; end if;
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
returns trigger language plpgsql security definer as $$
begin
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
-- (source: 007_weekly_reports.sql, 021, 031, 034, 044, 059 — 059 is final RLS)
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

-- Final policies from 059_weekly_reports_team_visibility.sql
create policy "weekly_reports_select_team" on public.weekly_reports
  for select using (
    auth.uid() = user_id
    or (
      exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'qa_lead'))
      and exists (
        select 1 from public.project_members pm1
        join public.project_members pm2 on pm1.project_id = pm2.project_id
        where pm1.user_id = auth.uid() and pm2.user_id = weekly_reports.user_id
      )
    )
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'super_admin'))
  );

create policy "weekly_reports_insert_own" on public.weekly_reports
  for insert with check (auth.uid() = user_id);

create policy "weekly_reports_update_team" on public.weekly_reports
  for update using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'admin', 'super_admin'))
  );

create policy "weekly_reports_delete_team" on public.weekly_reports
  for delete using (
    auth.uid() = user_id
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('manager', 'admin', 'super_admin'))
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
  uploaded_by UUID references auth.users(id),
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
    author_id       UUID not null references auth.users(id) on delete set null,
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
  updated_by      UUID references auth.users(id),
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

/*
-- ASSIGN Super Admin (safe: updates only the matching profile)
UPDATE public.profiles AS p
SET role = 'super_admin',
    status = 'active'
FROM auth.users AS u
WHERE p.id = u.id
  AND lower(u.email) = lower('your-admin@example.com');

-- VERIFY assignment
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
*/

-- ============================================================================
-- END OF combined_qaly_schema.sql
-- ============================================================================
