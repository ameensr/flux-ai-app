// src/components/router/ProtectedRoute.tsx
import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useMaintenanceStore } from '@/store/useMaintenanceStore'
import { ROUTES, ROUTE_MODULE_KEY, type AppRoute } from '@/lib/routes'
import { GlassCard } from '@/components/ui/GlassCard'
import { Lock } from 'lucide-react'

interface Props {
  children: React.ReactNode
  /** Require admin role */
  adminOnly?: boolean
}

export function ProtectedRoute({ children, adminOnly = false }: Props) {
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

  // Admin-only routes
  if (adminOnly && role !== 'admin' && role !== 'super_admin') {
    return <AccessDenied />
  }

  // Module-level RBAC check
  const moduleKey = ROUTE_MODULE_KEY[location.pathname as AppRoute]
  if (moduleKey && role !== 'admin' && role !== 'super_admin' && !canView(moduleKey)) {
    return <AccessDenied />
  }

  return <>{children}</>
}

function AccessDenied() {
  return (
    <GlassCard hoverEffect={false} className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-6">
        <Lock className="w-8 h-8 text-accent-gold" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">🔒 Access Restricted</h3>
      <p className="text-text-secondary max-w-sm mb-6">
        You don't have permission to access this module.<br />
        Contact your administrator if you believe this is a mistake.
      </p>
      <button
        onClick={() => window.history.back()}
        className="px-6 py-2.5 rounded-xl border border-white/10 text-sm font-bold text-text-muted hover:text-white hover:border-white/20 transition-all"
      >
        Request Access
      </button>
    </GlassCard>
  )
}
