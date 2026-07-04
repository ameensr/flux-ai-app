// src/hooks/usePermissions.ts
import { useAppStore } from '@/store/useAppStore'
import { canAccessModule, hasModulePermission } from '@/lib/rbac'

export function usePermissions() {
  const { permissionMap, role, permissionsLoaded } = useAppStore()

  const isAdmin = role === 'admin' || role === 'super_admin'

  return {
    permissionsLoaded,
    role,
    canView: (moduleKey: string) => {
      if (isAdmin) return true
      return canAccessModule(permissionMap, moduleKey)
    },
    can: (moduleKey: string, permissionKey: string) => {
      if (isAdmin) return true
      return hasModulePermission(permissionMap, moduleKey, permissionKey)
    },
    canExport: (moduleKey: string) => {
      if (isAdmin) return true
      return hasModulePermission(permissionMap, moduleKey, 'can_export')
    },
  }
}
