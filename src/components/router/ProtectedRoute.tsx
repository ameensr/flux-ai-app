// src/components/router/ProtectedRoute.tsx
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useMaintenanceStore } from '@/store/useMaintenanceStore'
import { ROUTES, resolveModuleKey } from '@/lib/routes'

interface Props {
  children: React.ReactNode
  /** Require admin role */
  adminOnly?: boolean
  /** Check module permission via RBAC (more flexible than adminOnly) */
  moduleKey?: string
}

export function ProtectedRoute({ children, adminOnly = false, moduleKey }: Props) {
  const { isAuthenticated, role } = useAppStore()
  const { canView, permissionsLoaded } = usePermissions()
  const { isRoleLocked } = useMaintenanceStore()
  const location = useLocation()

  // Not logged in → send to login, preserve intended destination
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />
  }

  // Permissions still loading → show spinner (prevents flash of AccessDenied)
  if (!permissionsLoaded) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
      </div>
    )
  }

  // Maintenance mode check — redirect locked roles to /maintenance
  // (but not if they're already on the maintenance page)
  if (location.pathname !== ROUTES.maintenance && isRoleLocked(role)) {
    return <Navigate to={ROUTES.maintenance} replace />
  }

  // Module-level RBAC check (works for any role with permission)
  if (moduleKey && !canView(moduleKey)) {
    return <Navigate to={ROUTES.qalyAiEngine401} replace />
  }

  // Admin-only routes (legacy support)
  if (adminOnly && role !== 'admin' && role !== 'super_admin') {
    return <Navigate to={ROUTES.qalyAiEngine401} replace />
  }

  // Module-level RBAC check from route path (incl. nested e.g. /project-hub/:id)
  const routeModuleKey = resolveModuleKey(location.pathname)
  if (routeModuleKey && role !== 'admin' && role !== 'super_admin' && !canView(routeModuleKey)) {
    return <Navigate to={ROUTES.qalyAiEngine401} replace />
  }

  return <>{children}</>
}
