-- ============================================================
-- 008: Enterprise RBAC Extensions
-- Adds: departments, plans, user_status, role hierarchy,
--       user_overrides, audit_logs, permission_templates
-- ============================================================

-- 1. Extend roles table with priority + inheritance
alter table public.roles
  add column if not exists priority      integer not null default 50,
  add column if not exists inherits_from uuid references public.roles(id) on delete set null,
  add column if not exists created_by    uuid references auth.users(id) on delete set null;

-- Update existing role priorities
update public.roles set priority = 10 where role_key = 'admin';
update public.roles set priority = 50 where role_key = 'pro';
update public.roles set priority = 90 where role_key = 'free';

-- Seed additional enterprise roles
insert into public.roles (role_key, role_name, description, is_system, priority) values
  ('super_admin',  'Super Admin',   'Unrestricted access. Can manage all roles and users.',        true,  1),
  ('manager',      'Manager',       'Team management, reports, and approval workflows.',            false, 20),
  ('qa_lead',      'QA Lead',       'Leads QA team, manages test plans and reports.',               false, 30),
  ('qa_engineer',  'QA Engineer',   'Creates and runs test cases, bug reports, and AI summaries.', false, 40),
  ('developer',    'Developer',     'Access to bug refiner, test generator, and code tools.',       false, 45),
  ('standard',     'Standard User', 'Standard access to core modules.',                             false, 60),
  ('guest',        'Guest',         'Read-only access to shared content.',                          false, 95)
on conflict (role_key) do nothing;

-- Set inheritance chain
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

-- 2. Departments
create table if not exists public.departments (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  created_at  timestamptz not null default now()
);

alter table public.departments enable row level security;
create policy "departments_read_all"    on public.departments for select using (true);
create policy "departments_admin_write" on public.departments for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
);

insert into public.departments (name) values
  ('QA'), ('Development'), ('Management'), ('Support'), ('HR'), ('Finance'), ('Operations')
on conflict (name) do nothing;

-- 3. Subscription plans
create table if not exists public.plans (
  id          uuid primary key default gen_random_uuid(),
  plan_key    text not null unique,
  plan_name   text not null,
  description text,
  sort_order  integer not null default 0
);

alter table public.plans enable row level security;
create policy "plans_read_all" on public.plans for select using (true);

insert into public.plans (plan_key, plan_name, sort_order) values
  ('enterprise',   'Enterprise',   1),
  ('business',     'Business',     2),
  ('professional', 'Professional', 3),
  ('standard',     'Standard',     4),
  ('free',         'Free',         5),
  ('trial',        'Trial',        6)
on conflict (plan_key) do nothing;

-- 4. Extend profiles with enterprise fields
alter table public.profiles
  add column if not exists employee_id    text,
  add column if not exists department_id  uuid references public.departments(id) on delete set null,
  add column if not exists plan_id        uuid references public.plans(id) on delete set null,
  add column if not exists status         text not null default 'active'
    check (status in ('active','inactive','suspended','pending','locked','invited')),
  add column if not exists last_login_at  timestamptz,
  add column if not exists avatar_url     text;

-- 5. User permission overrides
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
create policy "overrides_admin_all" on public.user_permission_overrides for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
);
create policy "overrides_self_read" on public.user_permission_overrides for select using (
  user_id = auth.uid()
);

-- 6. Permission templates
create table if not exists public.permission_templates (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  description text,
  config      jsonb not null default '{}',
  created_at  timestamptz not null default now()
);

alter table public.permission_templates enable row level security;
create policy "templates_read_all"    on public.permission_templates for select using (true);
create policy "templates_admin_write" on public.permission_templates for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
);

insert into public.permission_templates (name, description, config) values
  ('Administrator', 'Full access to all modules', '{"preset":"admin"}'),
  ('Manager',       'Manage team, view reports, approve actions', '{"preset":"manager"}'),
  ('Developer',     'Bug refiner, test generator, writing assistant', '{"preset":"developer"}'),
  ('QA Engineer',   'Test cases, bug reports, AI summaries, history', '{"preset":"qa_engineer"}'),
  ('Viewer',        'Read-only access to all visible modules', '{"preset":"viewer"}'),
  ('Client',        'View shared reports and dashboards only', '{"preset":"client"}'),
  ('Guest',         'Minimal read-only access', '{"preset":"guest"}')
on conflict (name) do nothing;

-- 7. Audit logs
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
create policy "audit_admin_read" on public.audit_logs for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('admin','super_admin'))
);
create policy "audit_service_insert" on public.audit_logs for insert with check (true);

-- Index for performance
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_actor_id_idx   on public.audit_logs (actor_id);
