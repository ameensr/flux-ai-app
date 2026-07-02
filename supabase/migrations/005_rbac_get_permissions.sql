-- RPC: get all module permissions for a given role key
-- Used by the frontend permission engine (loadPermissionsForRole)

create or replace function public.get_role_permissions(p_role_key text)
returns table (
  module_key     text,
  permission_key text,
  is_enabled     boolean
)
language sql
stable
security definer
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

grant execute on function public.get_role_permissions(text) to authenticated, anon;
