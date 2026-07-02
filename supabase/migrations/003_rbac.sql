-- ============================================================
-- RBAC: roles, modules, permissions, role_module_permissions
-- ============================================================

-- 1. roles
create table if not exists public.roles (
  id          uuid primary key default gen_random_uuid(),
  role_key    text not null unique,
  role_name   text not null,
  description text,
  is_system   boolean not null default false,  -- system roles cannot be deleted
  created_at  timestamptz not null default now()
);

alter table public.roles enable row level security;

drop policy if exists "roles_read_all"   on public.roles;
drop policy if exists "roles_admin_write" on public.roles;

create policy "roles_read_all" on public.roles
  for select using (true);

create policy "roles_admin_write" on public.roles
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 2. modules
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

alter table public.modules enable row level security;

drop policy if exists "modules_read_all"    on public.modules;
drop policy if exists "modules_admin_write" on public.modules;

create policy "modules_read_all" on public.modules
  for select using (true);

create policy "modules_admin_write" on public.modules
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 3. permissions
create table if not exists public.permissions (
  id              uuid primary key default gen_random_uuid(),
  permission_key  text not null unique,
  permission_name text not null,
  description     text,
  created_at      timestamptz not null default now()
);

alter table public.permissions enable row level security;

drop policy if exists "permissions_read_all"    on public.permissions;
drop policy if exists "permissions_admin_write" on public.permissions;

create policy "permissions_read_all" on public.permissions
  for select using (true);

create policy "permissions_admin_write" on public.permissions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- 4. role_module_permissions (junction)
create table if not exists public.role_module_permissions (
  id            uuid primary key default gen_random_uuid(),
  role_id       uuid not null references public.roles(id) on delete cascade,
  module_id     uuid not null references public.modules(id) on delete cascade,
  permission_id uuid not null references public.permissions(id) on delete cascade,
  is_enabled    boolean not null default false,
  updated_at    timestamptz not null default now(),
  unique (role_id, module_id, permission_id)
);

alter table public.role_module_permissions enable row level security;

drop policy if exists "rmp_read_all"    on public.role_module_permissions;
drop policy if exists "rmp_admin_write" on public.role_module_permissions;

create policy "rmp_read_all" on public.role_module_permissions
  for select using (true);

create policy "rmp_admin_write" on public.role_module_permissions
  for all using (
    exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop trigger if exists rmp_updated_at on public.role_module_permissions;
create trigger rmp_updated_at
  before update on public.role_module_permissions
  for each row execute function public.set_updated_at();

-- ============================================================
-- SEED: roles
-- ============================================================
insert into public.roles (role_key, role_name, description, is_system) values
  ('admin', 'Administrator', 'Full platform access. Manages users, permissions, AI settings.', true),
  ('pro',   'Pro User',      'Access to premium modules, advanced AI, and export features.',  true),
  ('free',  'Free User',     'Access to basic modules with limited AI usage.',                true)
on conflict (role_key) do nothing;

-- ============================================================
-- SEED: modules
-- ============================================================
insert into public.modules (module_key, module_name, route_path, icon, sort_order) values
  ('dashboard',          'Dashboard',            '/dashboard',          'LayoutDashboard', 0),
  ('bug-refiner',        'AI Bug Refiner',        '/bug-refiner',        'Bug',             1),
  ('test-generator',     'Test Case Generator',   '/test-generator',     'FileText',        2),
  ('writing-assistant',  'Writing Assistant',     '/writing-assistant',  'PenTool',         3),
  ('history',            'History',               '/history',            'History',         4),
  ('settings',           'Settings',              '/settings',           'Settings',        5),
  ('admin',              'Admin Panel',           '/admin',              'Shield',          6),
  ('ai-settings',        'AI Settings',           '/admin/ai-settings',  'Cpu',             7),
  ('prompt-settings',    'Prompt Settings',       '/admin/prompts',      'MessageSquare',   8),
  ('analytics',          'Analytics',             '/analytics',          'BarChart2',       9),
  ('user-management',    'User Management',       '/admin/users',        'Users',           10)
on conflict (module_key) do nothing;

-- ============================================================
-- SEED: permissions
-- ============================================================
insert into public.permissions (permission_key, permission_name, description) values
  ('can_view',         'View',           'Can view/access the module'),
  ('can_create',       'Create',         'Can create new items'),
  ('can_edit',         'Edit',           'Can edit existing items'),
  ('can_delete',       'Delete',         'Can delete items'),
  ('can_export',       'Export',         'Can export data (Jira, Slack, CSV)'),
  ('can_generate_ai',  'Generate AI',    'Can use AI generation features'),
  ('can_manage',       'Manage',         'Can manage settings and configurations'),
  ('can_use_advanced_ai', 'Advanced AI', 'Can use advanced/premium AI models')
on conflict (permission_key) do nothing;

-- ============================================================
-- SEED: role_module_permissions
-- Helper: insert all combos for a role+module with given permissions enabled
-- ============================================================

-- We use a DO block to reference seeded IDs
do $$
declare
  r_admin uuid; r_pro uuid; r_free uuid;
  p_view uuid; p_create uuid; p_edit uuid; p_delete uuid;
  p_export uuid; p_gen_ai uuid; p_manage uuid; p_adv_ai uuid;
  m record;
begin
  select id into r_admin from public.roles where role_key = 'admin';
  select id into r_pro   from public.roles where role_key = 'pro';
  select id into r_free  from public.roles where role_key = 'free';

  select id into p_view    from public.permissions where permission_key = 'can_view';
  select id into p_create  from public.permissions where permission_key = 'can_create';
  select id into p_edit    from public.permissions where permission_key = 'can_edit';
  select id into p_delete  from public.permissions where permission_key = 'can_delete';
  select id into p_export  from public.permissions where permission_key = 'can_export';
  select id into p_gen_ai  from public.permissions where permission_key = 'can_generate_ai';
  select id into p_manage  from public.permissions where permission_key = 'can_manage';
  select id into p_adv_ai  from public.permissions where permission_key = 'can_use_advanced_ai';

  -- ── ADMIN: full access to everything ──────────────────────
  for m in select id from public.modules loop
    insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    select r_admin, m.id, p.id, true
    from public.permissions p
    on conflict (role_id, module_id, permission_id) do nothing;
  end loop;

  -- ── PRO: premium modules, no admin-only ───────────────────
  for m in select id, module_key from public.modules
           where module_key in ('dashboard','bug-refiner','test-generator','writing-assistant','history','settings') loop
    insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    values
      (r_pro, m.id, p_view,   true),
      (r_pro, m.id, p_create, true),
      (r_pro, m.id, p_edit,   true),
      (r_pro, m.id, p_delete, true),
      (r_pro, m.id, p_export, true),
      (r_pro, m.id, p_gen_ai, true),
      (r_pro, m.id, p_manage, false),
      (r_pro, m.id, p_adv_ai, true)
    on conflict (role_id, module_id, permission_id) do nothing;
  end loop;

  -- PRO: admin/management modules — no access
  for m in select id from public.modules
           where module_key in ('admin','ai-settings','prompt-settings','analytics','user-management') loop
    insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    select r_pro, m.id, p.id, false
    from public.permissions p
    on conflict (role_id, module_id, permission_id) do nothing;
  end loop;

  -- ── FREE: basic modules only ──────────────────────────────
  for m in select id, module_key from public.modules
           where module_key in ('dashboard','bug-refiner','test-generator','writing-assistant','settings') loop
    insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    values
      (r_free, m.id, p_view,   true),
      (r_free, m.id, p_create, true),
      (r_free, m.id, p_edit,   false),
      (r_free, m.id, p_delete, false),
      (r_free, m.id, p_export, false),
      (r_free, m.id, p_gen_ai, true),
      (r_free, m.id, p_manage, false),
      (r_free, m.id, p_adv_ai, false)
    on conflict (role_id, module_id, permission_id) do nothing;
  end loop;

  -- FREE: restricted modules — no access
  for m in select id from public.modules
           where module_key in ('history','admin','ai-settings','prompt-settings','analytics','user-management') loop
    insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    select r_free, m.id, p.id, false
    from public.permissions p
    on conflict (role_id, module_id, permission_id) do nothing;
  end loop;

end $$;
