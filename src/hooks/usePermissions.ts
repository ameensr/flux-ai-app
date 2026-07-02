// src/hooks/usePermissions.ts
import { useAppStore } from '@/store/useAppStore'
import { canAccessModule, hasModulePermission } from '@/lib/rbac'

export function usePermissions() {
  const { permissionMap, role, permissionsLoaded } = useAppStore()

  return {
    permissionsLoaded,
    role,
    canView: (moduleKey: string) => {
      if (role === 'admin') return true
      return canAccessModule(permissionMap, moduleKey)
    },
    can: (moduleKey: string, permissionKey: string) => {
      if (role === 'admin') return true
      return hasModulePermission(permissionMap, moduleKey, permissionKey)
    },
    canExport: (moduleKey: string) => {
      if (role === 'admin') return true
      return hasModulePermission(permissionMap, moduleKey, 'can_export')
    },
  }
}
