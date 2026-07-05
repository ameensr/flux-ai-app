-- ============================================================
-- 009: Add missing qa-report module to RBAC
-- ============================================================

-- Insert the module (safe no-op if somehow already exists)
insert into public.modules (module_key, module_name, route_path, icon, sort_order)
values ('qa-report', 'QA Weekly Report', '/qa-report', 'ClipboardList', 3)
on conflict (module_key) do nothing;

-- Seed role_module_permissions for qa-report across all existing roles
do $$
declare
  m_qa    uuid;
  r_admin uuid; r_pro uuid; r_free uuid;
  p_view uuid; p_create uuid; p_edit uuid; p_delete uuid;
  p_export uuid; p_gen_ai uuid; p_manage uuid; p_adv_ai uuid;
  r       record;
begin
  select id into m_qa    from public.modules     where module_key    = 'qa-report';
  select id into r_admin from public.roles       where role_key      = 'admin';
  select id into r_pro   from public.roles       where role_key      = 'pro';
  select id into r_free  from public.roles       where role_key      = 'free';

  select id into p_view    from public.permissions where permission_key = 'can_view';
  select id into p_create  from public.permissions where permission_key = 'can_create';
  select id into p_edit    from public.permissions where permission_key = 'can_edit';
  select id into p_delete  from public.permissions where permission_key = 'can_delete';
  select id into p_export  from public.permissions where permission_key = 'can_export';
  select id into p_gen_ai  from public.permissions where permission_key = 'can_generate_ai';
  select id into p_manage  from public.permissions where permission_key = 'can_configure';
  select id into p_adv_ai  from public.permissions where permission_key = 'can_use_advanced_ai';

  -- ADMIN: full access
  insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
  select r_admin, m_qa, p.id, true
  from public.permissions p
  on conflict (role_id, module_id, permission_id) do nothing;

  -- PRO: full access to qa-report (view, create, edit, delete, export, ai)
  insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled) values
    (r_pro, m_qa, p_view,   true),
    (r_pro, m_qa, p_create, true),
    (r_pro, m_qa, p_edit,   true),
    (r_pro, m_qa, p_delete, true),
    (r_pro, m_qa, p_export, true),
    (r_pro, m_qa, p_gen_ai, true),
    (r_pro, m_qa, p_manage, false),
    (r_pro, m_qa, p_adv_ai, true)
  on conflict (role_id, module_id, permission_id) do nothing;

  -- FREE: view + ai only, no export/delete
  insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled) values
    (r_free, m_qa, p_view,   true),
    (r_free, m_qa, p_create, true),
    (r_free, m_qa, p_edit,   false),
    (r_free, m_qa, p_delete, false),
    (r_free, m_qa, p_export, false),
    (r_free, m_qa, p_gen_ai, true),
    (r_free, m_qa, p_manage, false),
    (r_free, m_qa, p_adv_ai, false)
  on conflict (role_id, module_id, permission_id) do nothing;

  -- All other roles (enterprise roles added in 008): seed with no access by default
  -- so they appear in the matrix and can be toggled
  for r in
    select id from public.roles
    where id not in (r_admin, r_pro, r_free)
  loop
    insert into public.role_module_permissions (role_id, module_id, permission_id, is_enabled)
    select r.id, m_qa, p.id, false
    from public.permissions p
    on conflict (role_id, module_id, permission_id) do nothing;
  end loop;

end $$;
