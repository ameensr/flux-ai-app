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
      can_manage_ai_providers: true, can_manage_announcements: true,
      can_view_audit_logs: true, can_manage_templates: true, can_manage_maintenance: true,
      can_manage_system: true,
    },
    'user-management': { can_view: true, can_create: true, can_edit: true, can_delete: true },
    announcements: { can_view: true, can_create: true, can_edit: true, can_delete: true },
    settings: { can_view: true, can_edit: true },
    history: { can_view: true },
    'ai-settings': { can_view: true, can_edit: true },
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
      can_manage_ai_providers: true, can_manage_announcements: true,
      can_view_audit_logs: true, can_manage_templates: true, can_manage_maintenance: true,
      can_manage_system: true,
    },
    'user-management': { can_view: true, can_create: true, can_edit: true, can_delete: true },
    announcements: { can_view: true, can_create: true, can_edit: true, can_delete: true },
    settings: { can_view: true, can_edit: true },
    history: { can_view: true },
    'ai-settings': { can_view: true, can_edit: true },
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
