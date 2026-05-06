import React from 'react'
import { useAppStore } from '@/store/useAppStore'
import { hasPermission } from '@/lib/rbac'
import type { Permission, Role } from '@/lib/rbac'
import { GlassCard } from './GlassCard'
import { Lock } from 'lucide-react'

interface RoleGuardProps {
  permission?: Permission
  role?: Role
  fallback?: React.ReactNode
  children: React.ReactNode
}

export const RoleGuard: React.FC<RoleGuardProps> = ({ permission, role, fallback, children }) => {
  const { profile } = useAppStore()
  const userRole = (profile?.role ?? 'free') as Role

  const allowed = permission
    ? hasPermission(userRole, permission)
    : role
    ? userRole === role || userRole === 'admin'
    : true

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
