import React from 'react'
import { useAppStore } from '@/store/useAppStore'
import { usePermissions } from '@/hooks/usePermissions'
import { GlassCard } from './GlassCard'
import { Lock } from 'lucide-react'

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
  if (role === 'admin') return <>{children}</>

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

  return (
    <GlassCard hoverEffect={false} className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
        <Lock className="w-7 h-7 text-accent-gold" />
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">Access Restricted</h3>
      <p className="text-text-secondary max-w-sm">
        This feature requires a higher plan. Upgrade to <span className="text-accent-gold font-bold">Pro</span> to unlock it.
      </p>
    </GlassCard>
  )
}
