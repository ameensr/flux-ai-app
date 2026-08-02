// src/lib/rbac.ts
import { supabase } from './supabase'

export type Role = 'free' | 'pro' | 'admin' | 'super_admin' | 'manager' | 'qa_lead' | 'qa_engineer' | 'developer' | 'standard' | 'guest'

export interface RolePermissionMap {
  [moduleKey: string]: { [permissionKey: string]: boolean }
}

const cache = new Map<string, { data: RolePermissionMap; ts: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

export const FALLBACK_MAPS: Record<string, RolePermissionMap> = {
  admin: {
    dashboard: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, can_generate_ai: true },
    'bug-refiner': { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, can_generate_ai: true },
    'test-generator': { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, can_generate_ai: true },
    'writing-assistant': { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, can_generate_ai: true },
    'qa-report': { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, can_generate_ai: true },
    'daily-report': {
      can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, can_configure: true,
      can_manage_columns: true, can_add_columns: true, can_rename_columns: true, can_reorder_columns: true,
      can_hide_show_columns: true, can_delete_custom_columns: true, can_manage_org_config: true, can_manage_project_config: true,
    },
    'project-hub': { can_view: true, can_create: true, can_edit: true, can_delete: true },
    admin: { can_view: true, can_create: true, can_edit: true, can_delete: true },
    'admin-hub': {
      can_view: true, can_create: true, can_edit: true, can_delete: true,
      can_manage_users: true, can_manage_roles: true, can_manage_permissions: true,
      can_manage_announcements: true,
      can_view_audit_logs: true, can_manage_templates: true, can_manage_maintenance: true,
      can_manage_system: true,
    },
    'user-management': { can_view: true, can_create: true, can_edit: true, can_delete: true },
    announcements: { can_view: true, can_create: true, can_edit: true, can_delete: true },
    settings: { can_view: true, can_edit: true },
    history: { can_view: true },
  },
  super_admin: {
    dashboard: { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, can_generate_ai: true },
    'bug-refiner': { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, can_generate_ai: true },
    'test-generator': { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, can_generate_ai: true },
    'writing-assistant': { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, can_generate_ai: true },
    'qa-report': { can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, can_generate_ai: true },
    'daily-report': {
      can_view: true, can_create: true, can_edit: true, can_delete: true, can_export: true, can_configure: true,
      can_manage_columns: true, can_add_columns: true, can_rename_columns: true, can_reorder_columns: true,
      can_hide_show_columns: true, can_delete_custom_columns: true, can_manage_org_config: true, can_manage_project_config: true,
    },
    'project-hub': { can_view: true, can_create: true, can_edit: true, can_delete: true },
    admin: { can_view: true, can_create: true, can_edit: true, can_delete: true },
    'admin-hub': {
      can_view: true, can_create: true, can_edit: true, can_delete: true,
      can_manage_users: true, can_manage_roles: true, can_manage_permissions: true,
      can_manage_announcements: true,
      can_view_audit_logs: true, can_manage_templates: true, can_manage_maintenance: true,
      can_manage_system: true,
    },
    'user-management': { can_view: true, can_create: true, can_edit: true, can_delete: true },
    announcements: { can_view: true, can_create: true, can_edit: true, can_delete: true },
    settings: { can_view: true, can_edit: true },
    history: { can_view: true },
  },
  pro: {
    dashboard: { can_view: true, can_generate_ai: true },
    'project-hub': { can_view: true, can_create: true, can_edit: true },
    'bug-refiner': { can_view: true, can_generate_ai: true, can_export: true },
    'test-generator': { can_view: true, can_generate_ai: true, can_export: true },
    'writing-assistant': { can_view: true, can_generate_ai: true },
    'qa-report': { can_view: true, can_create: true, can_edit: true, can_export: true, can_generate_ai: true },
    'daily-report': {
      can_view: true, can_create: true, can_edit: true, can_export: true,
      can_manage_columns: true, can_add_columns: true, can_rename_columns: true, can_reorder_columns: true,
      can_hide_show_columns: true, can_delete_custom_columns: true, can_manage_project_config: true,
    },
    announcements: { can_view: true },
    settings: { can_view: true },
  },
  free: {
    dashboard: { can_view: true, can_generate_ai: true },
    'project-hub': { can_view: true },
    'bug-refiner': { can_view: true, can_generate_ai: true },
    'test-generator': { can_view: true, can_generate_ai: true },
    'writing-assistant': { can_view: true, can_generate_ai: true },
    'qa-report': { can_view: true, can_create: true, can_generate_ai: true },
    'daily-report': { can_view: true, can_create: true },
    announcements: { can_view: true },
    settings: { can_view: true },
  },
}

export async function loadPermissionsForRole(roleKey: string): Promise<RolePermissionMap> {
  const cached = cache.get(roleKey)
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.data

  const { data, error } = await supabase.rpc('get_role_permissions', { p_role_key: roleKey })

  if (error || !data || (data as any[]).length === 0) {
    return FALLBACK_MAPS[roleKey] ?? FALLBACK_MAPS.free
  }

  const map: RolePermissionMap = {}
  for (const row of data as { module_key: string; permission_key: string; is_enabled: boolean }[]) {
    if (!map[row.module_key]) map[row.module_key] = {}
    map[row.module_key][row.permission_key] = row.is_enabled
  }

  cache.set(roleKey, { data: map, ts: Date.now() })
  return map
}

export function invalidatePermissionCache(roleKey?: string) {
  if (roleKey) cache.delete(roleKey)
  else cache.clear()
}

/**
 * Fetches every row of public.role_module_permissions, paginating past
 * PostgREST's default "Max Rows" API limit (1000 by default in Supabase
 * project settings). A plain `.select('*')` with no `.range()` silently
 * truncates to that limit — no error is raised — so on a fully-seeded RBAC
 * matrix (roles x modules x permissions can exceed 1000 rows) an admin's
 * saved permission change may or may not appear in the next fetch depending
 * on where that row happens to fall in Postgres's return order (there is no
 * ORDER BY, so this is effectively arbitrary and can shift between saves).
 * This is what caused permissions to "not be highlighted" after a save +
 * refresh, even though the write itself was correctly persisted in the DB.
 *
 * Used by both RoleManagement.tsx and PermissionTemplates.tsx, which each
 * need the complete, unfiltered matrix to render/apply against.
 */
export async function fetchAllRoleModulePermissions(): Promise<
  { id: string; role_id: string; module_id: string; permission_id: string; is_enabled: boolean }[]
> {
  const PAGE_SIZE = 1000
  const all: { id: string; role_id: string; module_id: string; permission_id: string; is_enabled: boolean }[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('role_module_permissions')
      .select('id, role_id, module_id, permission_id, is_enabled')
      .order('id', { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw error
    if (!data || data.length === 0) break

    all.push(...data)
    if (data.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return all
}

export function canAccessModule(map: RolePermissionMap, moduleKey: string): boolean {
  return map[moduleKey]?.['can_view'] === true
}

export function hasModulePermission(
  map: RolePermissionMap,
  moduleKey: string,
  permissionKey: string
): boolean {
  return map[moduleKey]?.[permissionKey] === true
}
