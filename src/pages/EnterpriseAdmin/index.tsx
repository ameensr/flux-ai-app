// src/pages/EnterpriseAdmin/index.tsx
import React from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { CinematicHeading } from '@/components/ui/CinematicHeading'
import { UserManagement } from './UserManagement'
import { RoleManagement } from './RoleManagement'
import { PermissionTemplates } from './PermissionTemplates'
import { AuditLogs } from './AuditLogs'
import { Users, Shield, Layers, Activity, RefreshCw } from 'lucide-react'
import { ROUTES } from '@/lib/routes'
import { SilentBoundary } from '@/components/ErrorBoundary'
import { GlassCard } from '@/components/ui/GlassCard'

function TabErrorFallback({ onRetry }: { onRetry: () => void }) {
  return (
    <GlassCard hoverEffect={false} className="flex flex-col items-center justify-center py-24 text-center">
      <div className="w-14 h-14 rounded-full bg-red-500/10 flex items-center justify-center mb-5">
        <span className="text-2xl">⚠️</span>
      </div>
      <h3 className="text-lg font-bold text-white mb-2">Failed to Load Module</h3>
      <p className="text-text-muted text-sm mb-6 max-w-xs">
        Something went wrong rendering this section. Try refreshing or contact your administrator.
      </p>
      <div className="flex gap-3">
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-gold text-background text-sm font-bold hover:opacity-90 transition-opacity"
        >
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
        <button
          onClick={() => window.location.href = ROUTES.adminUsers}
          className="px-5 py-2.5 rounded-xl border border-white/10 text-text-muted hover:text-white text-sm font-bold transition-colors"
        >
          Back to Admin
        </button>
      </div>
    </GlassCard>
  )
}

/** Stateful wrapper so the Retry button can reset the boundary */
function TabBoundary({ children }: { children: React.ReactNode }) {
  const [key, setKey] = React.useState(0)
  return (
    <SilentBoundary key={key} fallback={<TabErrorFallback onRetry={() => setKey(k => k + 1)} />}>
      {children}
    </SilentBoundary>
  )
}

const TABS = [
  { path: ROUTES.enterpriseUsers,     label: 'User Management',      icon: Users,   short: 'Users' },
  { path: ROUTES.enterpriseRoles,     label: 'Roles & Permissions',  icon: Shield,  short: 'Roles' },
  { path: ROUTES.enterpriseTemplates, label: 'Permission Templates', icon: Layers,  short: 'Templates' },
  { path: ROUTES.enterpriseAudit,     label: 'Audit Logs',           icon: Activity,short: 'Audit' },
] as const

export function EnterpriseAdmin() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const activeTab = TABS.find(t => pathname === t.path)?.path ?? ROUTES.enterpriseUsers

  const renderContent = () => {
    switch (activeTab) {
      case ROUTES.enterpriseUsers:     return <TabBoundary><UserManagement /></TabBoundary>
      case ROUTES.enterpriseRoles:     return <TabBoundary><RoleManagement /></TabBoundary>
      case ROUTES.enterpriseTemplates: return <TabBoundary><PermissionTemplates /></TabBoundary>
      case ROUTES.enterpriseAudit:     return <TabBoundary><AuditLogs /></TabBoundary>
      default:                         return <TabBoundary><UserManagement /></TabBoundary>
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="py-6 sm:py-12"
    >
      <CinematicHeading
        title="Enterprise RBAC"
        subtitle="Centralized user management, role-based access control, and audit logging."
        align="left"
      />

      {/* Tab bar */}
      <div className="flex gap-1 sm:gap-2 mb-8 sm:mb-10 p-1 bg-white/5 rounded-2xl w-full overflow-x-auto scrollbar-none">
        {TABS.map(tab => (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            className={cn(
              'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap shrink-0',
              activeTab === tab.path
                ? 'bg-accent-gold text-background'
                : 'text-text-muted hover:text-white'
            )}
          >
            <tab.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
            <span className="sm:hidden">{tab.short}</span>
          </button>
        ))}
      </div>

      {renderContent()}
    </motion.div>
  )
}
