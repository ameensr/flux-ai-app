-- ============================================================
-- 013: Daily Update Report Tables & RBAC Configurations
-- ============================================================

-- 1. Drop-down configuration master table
create table if not exists public.daily_report_dropdown_configs (
  id uuid primary key default gen_random_uuid(),
  category text not null, -- 'branch', 'qa', 'status', 'retesting_status', 'smoke_status'
  value text not null,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (category, value)
);

-- Enable RLS
alter table public.daily_report_dropdown_configs enable row level security;

-- Drop existing policies if any
drop policy if exists "daily_report_configs_select" on public.daily_report_dropdown_configs;
drop policy if exists "daily_report_configs_all_admin" on public.daily_report_dropdown_configs;

-- Policies
create policy "daily_report_configs_select" on public.daily_report_dropdown_configs for select using (true);
create policy "daily_report_configs_all_admin" on public.daily_report_dropdown_configs for all using (
  exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (
        p.role = 'super_admin' or
        public.check_module_permission(p.role, 'daily-report', 'can_manage')
      )
  )
);

-- Seed values for masters
insert into public.daily_report_dropdown_configs (category, value, sort_order) values
  ('branch', 'main', 1),
  ('branch', 'develop', 2),
  ('branch', 'release/v2.4', 3),
  ('branch', 'feature/auth', 4),
  ('qa', 'Ameen S.', 1),
  ('qa', 'Sarah Jenkins', 2),
  ('qa', 'Michael Ross', 3),
  ('qa', 'Emily Taylor', 4),
  ('status', 'Passed', 1),
  ('status', 'Failed', 2),
  ('status', 'Blocked', 3),
  ('status', 'In Progress', 4),
  ('status', 'Pending', 5),
  ('status', 'Not Executed', 6),
  ('retesting_status', 'Open', 1),
  ('retesting_status', 'Retesting', 2),
  ('retesting_status', 'Fixed', 3),
  ('retesting_status', 'Closed', 4),
  ('smoke_status', 'Pass', 1),
  ('smoke_status', 'Fail', 2),
  ('smoke_status', 'Blocked', 3),
  ('smoke_status', 'Not Executed', 4)
on conflict (category, value) do nothing;

-- 2. Daily Support Logs spreadsheet table
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
  status text,
  comments text,
  blocked_hours numeric,
  retesting_status text,
  retesting_estimation_hrs numeric,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.daily_support_logs enable row level security;

-- Drop existing policies if any
drop policy if exists "daily_support_logs_all_auth" on public.daily_support_logs;
drop policy if exists "daily_support_logs_select" on public.daily_support_logs;
drop policy if exists "daily_support_logs_insert" on public.daily_support_logs;
drop policy if exists "daily_support_logs_update" on public.daily_support_logs;
drop policy if exists "daily_support_logs_delete" on public.daily_support_logs;

-- Policies
create policy "daily_support_logs_select" on public.daily_support_logs for select using (
  auth.uid() = user_id and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'super_admin' or public.check_module_permission(p.role, 'daily-report', 'can_view'))
  )
);

create policy "daily_support_logs_insert" on public.daily_support_logs for insert with check (
  auth.uid() = user_id and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'super_admin' or public.check_module_permission(p.role, 'daily-report', 'can_create'))
  )
);

create policy "daily_support_logs_update" on public.daily_support_logs for update using (
  auth.uid() = user_id and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'super_admin' or public.check_module_permission(p.role, 'daily-report', 'can_edit'))
  )
);

create policy "daily_support_logs_delete" on public.daily_support_logs for delete using (
  auth.uid() = user_id and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'super_admin' or public.check_module_permission(p.role, 'daily-report', 'can_delete'))
  )
);

-- 3. Daily Release Testing Status spreadsheet table
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
  updated_at timestamptz not null default now()
);

-- Enable RLS
alter table public.daily_release_testing_status enable row level security;

-- Drop existing policies if any
drop policy if exists "daily_release_testing_status_all_auth" on public.daily_release_testing_status;
drop policy if exists "daily_release_testing_status_select" on public.daily_release_testing_status;
drop policy if exists "daily_release_testing_status_insert" on public.daily_release_testing_status;
drop policy if exists "daily_release_testing_status_update" on public.daily_release_testing_status;
drop policy if exists "daily_release_testing_status_delete" on public.daily_release_testing_status;

-- Policies
create policy "daily_release_testing_status_select" on public.daily_release_testing_status for select using (
  auth.uid() = user_id and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'super_admin' or public.check_module_permission(p.role, 'daily-report', 'can_view'))
  )
);

create policy "daily_release_testing_status_insert" on public.daily_release_testing_status for insert with check (
  auth.uid() = user_id and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'super_admin' or public.check_module_permission(p.role, 'daily-report', 'can_create'))
  )
);

create policy "daily_release_testing_status_update" on public.daily_release_testing_status for update using (
  auth.uid() = user_id and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'super_admin' or public.check_module_permission(p.role, 'daily-report', 'can_edit'))
  )
);

create policy "daily_release_testing_status_delete" on public.daily_release_testing_status for delete using (
  auth.uid() = user_id and exists (
    select 1 from public.profiles p
    where p.id = auth.uid()
      and (p.role = 'super_admin' or public.check_module_permission(p.role, 'daily-report', 'can_delete'))
  )
);

-- ============================================================
-- 4. RBAC Module & Seeding
-- ============================================================
-- Insert the daily-report module (safe no-op if already exists)
insert into public.modules (module_key, module_name, route_path, icon, sort_order)
values ('daily-report', 'Daily Update Report', '/daily-report', 'ClipboardCheck', 4)
on conflict (module_key) do nothing;

-- Seed role_module_permissions for daily-report across all existing roles
do $$
declare
  m_daily uuid;
  r_admin uuid; r_pro uuid; r_free uuid;
  p_view uuid; p_create uuid; p_edit uuid; p_delete uuid;
  p_export uuid; p_manage uuid;
  r       record;
begin
  select id into m_daily  from public.modules     where module_key    = 'daily-report';
  select id into r_admin  from public.roles       where role_key      = 'admin';
  select id into r_pro    from public.roles       where role_key      = 'pro';
  select id into r_free   from public.roles       where role_key      = 'free';

  select id into p_view    from public.permissions where permission_key = 'can_view';
  select id into p_create  from public.permissions where permission_key = 'can_create';
  select id into p_edit    from public.permissions where permission_key = 'can_edit';
  select id into p_delete  from public.permissions where permission_key = 'can_delete';
  select id into p_export  from public.permissions where permission_key = 'can_export';
  select id into p_manage  from public.permissions where permission_key = 'can_manage';

  -- ADMIN: full access
  if r_admin is not null and m_daily is not null then
    insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    select r_admin, m_daily, p.id, true
    from public.permissions p
    on conflict (role_id, module_id, permission_id) do nothing;
  end if;

  -- PRO: full access (view, create, edit, delete, export, manage)
  if r_pro is not null and m_daily is not null then
    insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled) values
      (r_pro, m_daily, p_view,   true),
      (r_pro, m_daily, p_create, true),
      (r_pro, m_daily, p_edit,   true),
      (r_pro, m_daily, p_delete, true),
      (r_pro, m_daily, p_export, true),
      (r_pro, m_daily, p_manage, true)
    on conflict (role_id, module_id, permission_id) do nothing;
  end if;

  -- FREE: view + create only
  if r_free is not null and m_daily is not null then
    insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled) values
      (r_free, m_daily, p_view,   true),
      (r_free, m_daily, p_create, true),
      (r_free, m_daily, p_edit,   false),
      (r_free, m_daily, p_delete, false),
      (r_free, m_daily, p_export, false),
      (r_free, m_daily, p_manage, false)
    on conflict (role_id, module_id, permission_id) do nothing;
  end if;

  -- All other roles (enterprise roles): seed with no access by default so they appear in matrix
  if m_daily is not null then
    for r in
      select id from public.roles
      where id not in (r_admin, r_pro, r_free)
    loop
      insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
      select r.id, m_daily, p.id, false
      from public.permissions p
      on conflict (role_id, module_id, permission_id) do nothing;
    end loop;
  end if;

end $$;
