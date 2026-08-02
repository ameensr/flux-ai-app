#!/usr/bin/env python3
"""Upgrade combined_qaly_schema.sql for fresh Qaly-ai bootstrap."""
from __future__ import annotations

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "supabase" / "migrations" / "combined_qaly_schema.sql"

PRIVATE_FUNCS = [
    "can_edit_in_project",
    "can_modify_project_member_role",
    "can_remove_project_member",
    "check_module_permission",
    "get_my_role",
    "get_role_permissions",
    "get_user_project_role",
    "is_admin",
    "is_project_manager",
    "is_project_member",
    "is_project_owner",
    "is_project_owner_or_lead",
    "is_super_admin",
    "my_org_id",
]

HEADER = """-- ============================================================================
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

"""

TAIL = r"""

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
      'can_manage_announcements',
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
"""


def main() -> None:
    text = SRC.read_text(encoding="utf-8")

    # Drop old banner through first real section marker
    marker = "-- SECTION 0: Extensions"
    idx = text.find(marker)
    if idx < 0:
        raise SystemExit("SECTION 0 marker not found")
    body = text[idx:]

    # Ensure private schema exists before functions
    body = body.replace(
        marker,
        marker
        + """

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres;
""",
        1,
    )

    # Move helper function definitions into private schema
    for name in PRIVATE_FUNCS:
        body = body.replace(
            f"create or replace function public.{name}",
            f"create or replace function private.{name}",
        )

    # Retarget helper calls (policies + function bodies)
    # Order matters: longer names first to avoid partial replacements
    replacements = [
        ("public.can_modify_project_member_role", "private.can_modify_project_member_role"),
        ("public.can_remove_project_member", "private.can_remove_project_member"),
        ("public.check_module_permission", "private.check_module_permission"),
        ("public.get_role_permissions", "private.get_role_permissions"),
        ("public.get_user_project_role", "private.get_user_project_role"),
        ("public.is_project_owner_or_lead", "private.is_project_owner_or_lead"),
        ("public.is_project_manager", "private.is_project_manager"),
        ("public.is_project_member", "private.is_project_member"),
        ("public.is_project_owner", "private.is_project_owner"),
        ("public.can_edit_in_project", "private.can_edit_in_project"),
        ("public.is_super_admin", "private.is_super_admin"),
        ("public.get_my_role", "private.get_my_role"),
        ("public.is_admin", "private.is_admin"),
        ("public.my_org_id", "private.my_org_id"),
    ]
    for old, new in replacements:
        body = body.replace(old, new)

    # Tighten audit insert policies (replace always-true checks)
    body = body.replace(
        'create policy "audit_service_insert" on public.audit_logs for insert with check (true);',
        '''create policy "audit_service_insert" on public.audit_logs
  for insert to authenticated, service_role
  with check (
    auth.role() = 'service_role'
    or private.is_admin()
    or private.is_super_admin()
  );''',
    )
    body = body.replace(
        'create policy "project_deletion_audit_insert" on public.project_deletion_audit for insert with check (true);',
        '''create policy "project_deletion_audit_insert" on public.project_deletion_audit
  for insert to authenticated, service_role
  with check (
    auth.role() = 'service_role'
    or private.is_admin()
    or private.is_super_admin()
  );''',
    )

    # Ensure helpers created with search_path when missing — add after LANGUAGE lines is hard;
    # append ALTER FUNCTION batch in TAIL instead (already includes trigger path).
    # Add search_path alters for private helpers in TAIL prefix:
    search_path_block = "\n-- Pin search_path on private helpers\n"
    for name in PRIVATE_FUNCS:
        search_path_block += (
            f"alter function private.{name} set search_path = public;\n"
            if name
            not in (
                "can_modify_project_member_role",
                "check_module_permission",
                "get_role_permissions",
                "can_edit_in_project",
                "can_remove_project_member",
                "get_user_project_role",
                "is_project_member",
                "is_project_owner",
                "is_project_owner_or_lead",
            )
            else ""
        )

    # Precise alters with signatures via DO block instead
    search_path_block = """
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
"""

    out = HEADER + body.rstrip() + "\n" + search_path_block + TAIL
    SRC.write_text(out, encoding="utf-8", newline="\n")
    print(f"Wrote {SRC} ({len(out.splitlines())} lines)")


if __name__ == "__main__":
    main()
