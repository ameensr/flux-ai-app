// src/pages/AdminPanel.tsx

import React, { useEffect, Suspense, lazy } from 'react'
import { useNavigate, useLocation, Navigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ROUTES } from '@/lib/routes'
import { CinematicHeading } from '@/components/ui/CinematicHeading'
import { Cpu, ShieldCheck, Megaphone, PawPrint } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTheme } from '@/context/ThemeContext'
import { useAppStore } from '@/store/useAppStore'

const AdminAISettings = lazy(() => import('@/pages/AdminAISettings').then(m => ({ default: m.AdminAISettings })))
const AdminAnnouncements = lazy(() => import('@/modules/Announcements/AdminAnnouncements').then(m => ({ default: m.AdminAnnouncements })))
const AdminPandaConfig = lazy(() => import('@/components/LazyPanda/AdminPandaConfig').then(m => ({ default: m.AdminPandaConfig })))

const BASE_TABS = [
  { path: ROUTES.adminAI, label: 'AI Providers', icon: Cpu },
  { path: ROUTES.enterprise, label: 'Enterprise RBAC', icon: ShieldCheck },
  { path: ROUTES.adminAnnouncements, label: 'Announcements', icon: Megaphone },
] as const

export const AdminPanel = () => {
  const { theme } = useTheme()
  const { role } = useAppStore()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const isSuperAdmin = role === 'super_admin'

  // Panda tab only visible to super_admin (Events embedded inside Panda Config)
  const TABS = isSuperAdmin
    ? [...BASE_TABS, { path: ROUTES.adminPanda, label: 'Lazy Panda', icon: PawPrint }] as const
    : BASE_TABS

  const activeTab = pathname.startsWith(ROUTES.enterprise)
    ? ROUTES.enterprise
    : pathname.startsWith(ROUTES.adminAnnouncements)
      ? ROUTES.adminAnnouncements
      : pathname.startsWith(ROUTES.adminPanda) || pathname.startsWith(ROUTES.adminEvents)
        ? ROUTES.adminPanda
        : (TABS.find(t => pathname === t.path)?.path ?? ROUTES.adminAI)

  // Redirect /admin, /admin/users, /admin/permissions → /admin/ai-providers
  useEffect(() => {
    if (
      pathname === ROUTES.admin ||
      pathname === ROUTES.adminUsers ||
      pathname === ROUTES.adminPermissions
    ) navigate(ROUTES.adminAI, { replace: true })
  }, [pathname])

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="py-6 sm:py-12"
    >
      <CinematicHeading
        title="Admin Panel"
        subtitle="Manage users, roles, and centralized AI provider configuration."
        align="left"
      />

      {/* URL-driven tabs */}
      <div className="flex gap-1 sm:gap-2 mb-8 sm:mb-10 p-1 bg-white/5 rounded-2xl w-full sm:w-fit overflow-x-auto scrollbar-none">
        {TABS.map(t => (
          <button
            key={t.path}
            onClick={() => navigate(t.path)}
            className={cn(
              'flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[10px] sm:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap shrink-0',
              activeTab === t.path
                ? 'bg-accent-gold text-background'
                : theme === 'dark' ? 'text-text-muted hover:text-white' : 'text-text-secondary hover:text-slate-900'
            )}
          >
            <t.icon className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === ROUTES.adminAI && (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" /></div>}>
          <AdminAISettings />
        </Suspense>
      )}
      {activeTab === ROUTES.enterprise && <Navigate to={ROUTES.enterpriseUsers} replace />}
      {activeTab === ROUTES.adminAnnouncements && (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" /></div>}>
          <AdminAnnouncements />
        </Suspense>
      )}
      {activeTab === ROUTES.adminPanda && isSuperAdmin && (
        <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" /></div>}>
          <AdminPandaConfig />
        </Suspense>
      )}
    </motion.div>
  )
}
