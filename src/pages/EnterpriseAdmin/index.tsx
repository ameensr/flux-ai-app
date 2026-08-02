// src/pages/EnterpriseAdmin/index.tsx
import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useLocation } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { CinematicHeading } from '@/components/ui/CinematicHeading'
import { UserManagement } from './UserManagement'
import { RoleManagement } from './RoleManagement'
import { PermissionTemplates } from './PermissionTemplates'
import { AuditLogs } from './AuditLogs'
import { MaintenanceSettings } from './MaintenanceSettings'
import { AIPlatformSettings } from './AIPlatformSettings'
import {
  Users, Shield, Layers, Activity, RefreshCw, ChevronLeft, ChevronRight,
  Wrench, Bot, PawPrint,
} from 'lucide-react'
import { ROUTES } from '@/lib/routes'
import { SilentBoundary } from '@/components/ErrorBoundary'
import { GlassCard } from '@/components/ui/GlassCard'
import { useAppStore } from '@/store/useAppStore'

const AdminPandaConfig = lazy(() =>
  import('@/components/LazyPanda/AdminPandaConfig').then(m => ({ default: m.AdminPandaConfig })),
)

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

const BASE_TABS = [
  { path: ROUTES.enterpriseUsers, label: 'User Management', icon: Users, short: 'Users' },
  { path: ROUTES.enterpriseRoles, label: 'Roles & Permissions', icon: Shield, short: 'Roles' },
  { path: ROUTES.enterpriseTemplates, label: 'Permission Templates', icon: Layers, short: 'Templates' },
  { path: ROUTES.enterpriseAudit, label: 'Audit Logs', icon: Activity, short: 'Audit' },
  { path: ROUTES.enterpriseMaintenance, label: 'Maintenance Mode', icon: Wrench, short: 'Maintenance' },
  { path: ROUTES.enterpriseAI, label: 'AI Platform', icon: Bot, short: 'AI' },
] as const

const PANDA_TAB = {
  path: ROUTES.enterprisePanda,
  label: 'Lazy Panda',
  icon: PawPrint,
  short: 'Panda',
} as const

export function EnterpriseAdmin() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { role } = useAppStore()
  const isSuperAdmin = role === 'super_admin'
  const tabScrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const TABS = isSuperAdmin ? [...BASE_TABS, PANDA_TAB] : [...BASE_TABS]

  const activeTab = TABS.find(t => pathname === t.path)?.path
    ?? (pathname === ROUTES.enterprisePanda && !isSuperAdmin ? ROUTES.enterpriseUsers : undefined)
    ?? ROUTES.enterpriseUsers

  const updateTabScroll = useCallback(() => {
    const el = tabScrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setCanScrollLeft(scrollLeft > 2)
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 2)
  }, [])

  useEffect(() => {
    const el = tabScrollRef.current
    if (!el) return
    updateTabScroll()
    el.addEventListener('scroll', updateTabScroll, { passive: true })
    const ro = new ResizeObserver(updateTabScroll)
    ro.observe(el)
    window.addEventListener('resize', updateTabScroll)
    return () => {
      el.removeEventListener('scroll', updateTabScroll)
      ro.disconnect()
      window.removeEventListener('resize', updateTabScroll)
    }
  }, [updateTabScroll, TABS.length])

  const scrollTabs = (dir: 'left' | 'right') => {
    const el = tabScrollRef.current
    if (!el) return
    el.scrollBy({ left: dir === 'left' ? -180 : 180, behavior: 'smooth' })
  }

  const renderContent = () => {
    switch (activeTab) {
      case ROUTES.enterpriseUsers: return <TabBoundary><UserManagement /></TabBoundary>
      case ROUTES.enterpriseRoles: return <TabBoundary><RoleManagement /></TabBoundary>
      case ROUTES.enterpriseTemplates: return <TabBoundary><PermissionTemplates /></TabBoundary>
      case ROUTES.enterpriseAudit: return <TabBoundary><AuditLogs /></TabBoundary>
      case ROUTES.enterpriseMaintenance: return <TabBoundary><MaintenanceSettings /></TabBoundary>
      case ROUTES.enterpriseAI: return <TabBoundary><AIPlatformSettings /></TabBoundary>
      case ROUTES.enterprisePanda:
        return isSuperAdmin ? (
          <TabBoundary>
            <Suspense fallback={
              <div className="flex items-center justify-center py-20">
                <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
              </div>
            }>
              <AdminPandaConfig />
            </Suspense>
          </TabBoundary>
        ) : (
          <TabBoundary><UserManagement /></TabBoundary>
        )
      default: return <TabBoundary><UserManagement /></TabBoundary>
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="py-6 sm:py-12"
    >
      <button
        onClick={() => navigate(ROUTES.admin)}
        className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest mb-6 transition-colors"
        style={{ color: 'var(--text-muted)' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
      >
        <ChevronLeft className="w-3.5 h-3.5" /> Back to Admin Panel
      </button>

      <CinematicHeading
        title="Enterprise RBAC"
        subtitle="Centralized user management, role-based access control, and audit logging."
        align="left"
      />

      {/* Tab bar — arrow controls, no visible scrollbar */}
      <div className="relative mb-8 sm:mb-10 w-full min-w-0 group/tabs">
        <div
          ref={tabScrollRef}
          className="flex gap-1 sm:gap-2 p-1 bg-white/5 rounded-2xl w-full overflow-x-auto scrollbar-none"
          style={{ WebkitOverflowScrolling: 'touch' }}
        >
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

        {/* Left / right scroll arrows — vertically centered */}
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollTabs('left')}
            aria-label="Scroll tabs left"
            className="absolute left-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all"
            style={{
              background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollTabs('right')}
            aria-label="Scroll tabs right"
            className="absolute right-1 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full flex items-center justify-center transition-all"
            style={{
              background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
              backdropFilter: 'blur(8px)',
            }}
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {renderContent()}
    </motion.div>
  )
}
