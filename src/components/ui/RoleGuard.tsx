import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { usePermissions } from '@/hooks/usePermissions'
import { ROUTES } from '@/lib/routes'

interface RoleGuardProps {
  /** Check can_view on a module key */
  moduleKey?: string
  /** Check a specific permission on a module */
  permission?: { module: string; key: string }
  /** Restrict to exact role(s) */
  roles?: string[]
  fallback?: React.ReactNode
  children: React.ReactNode
}

export const RoleGuard: React.FC<RoleGuardProps> = ({
  moduleKey,
  permission,
  roles,
  fallback,
  children,
}) => {
  const { role, permissionsLoaded } = useAppStore()
  const { canView, can } = usePermissions()

  // Admin always has full access — never block
  if (role === 'admin' || role === 'super_admin') return <>{children}</>

  // Wait for permissions to load before blocking
  if (!permissionsLoaded) return (
    <div className="flex items-center justify-center py-32">
      <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
    </div>
  )

  let allowed = true

  if (roles?.length) {
    allowed = roles.includes(role)
  } else if (moduleKey) {
    allowed = canView(moduleKey)
  } else if (permission) {
    allowed = can(permission.module, permission.key)
  }

  if (allowed) return <>{children}</>
  if (fallback) return <>{fallback}</>

  // Redirect to 401 Unauthorized page
  return <Navigate to={ROUTES.qalyAiEngine401} replace />
}
