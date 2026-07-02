-- Helper function for backend permission checks in edge functions
-- Returns true if the given role has the given permission on the given module

create or replace function public.check_module_permission(
  p_role_key       text,
  p_module_key     text,
  p_permission_key text
)
returns boolean
language sql
stable
security definer
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

-- Grant execute to authenticated users (edge functions use service role which bypasses this,
-- but anon/authenticated need it for any direct RPC calls)
grant execute on function public.check_module_permission(text, text, text) to authenticated;
