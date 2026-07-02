import React, { useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { usePermissions } from '@/hooks/usePermissions'
import {
  LayoutDashboard,
  Bug,
  FileText,
  PenTool,
  Settings,
  History,
  ChevronLeft,
  Shield,
  LogOut,
  ClipboardList,
} from 'lucide-react'
import { Logo } from '../ui/Logo'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/lib/routes'

const ALL_MENU_ITEMS = [
  { path: ROUTES.dashboard,        label: 'Dashboard',         icon: LayoutDashboard, moduleKey: 'dashboard' },
  { path: ROUTES.bugRefiner,       label: 'AI Bug Refiner',    icon: Bug,             moduleKey: 'bug-refiner' },
  { path: ROUTES.testGenerator,    label: 'Test Case Gen',     icon: FileText,        moduleKey: 'test-generator' },
  { path: ROUTES.writingAssistant, label: 'Writing Assistant', icon: PenTool,          moduleKey: 'writing-assistant' },
  { path: ROUTES.qaReport,         label: 'QA Weekly Report',  icon: ClipboardList,    moduleKey: 'qa-report' },
  { path: ROUTES.history,          label: 'History',           icon: History,         moduleKey: 'history' },
  { path: ROUTES.settings,         label: 'Settings',          icon: Settings,        moduleKey: 'settings' },
  { path: ROUTES.admin,            label: 'Admin Panel',       icon: Shield,          moduleKey: 'admin' },
]

export const Sidebar = () => {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { isSidebarOpen, setSidebarOpen, profile, setUser, setProfile } = useAppStore()
  const { canView, permissionsLoaded } = usePermissions()

  useEffect(() => {
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }, [pathname])

  useEffect(() => {
    const onResize = () => { if (window.innerWidth < 1024) setSidebarOpen(false) }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const visibleItems = permissionsLoaded
    ? ALL_MENU_ITEMS.filter((item) => canView(item.moduleKey))
    : ALL_MENU_ITEMS

  const isActive = (itemPath: string) =>
    pathname === itemPath || pathname.startsWith(itemPath + '/')

  const sidebarContent = (
    <div className="flex flex-col h-full">
      <div className="p-5 flex items-center justify-between h-[72px] shrink-0">
        <Logo
          collapsed={!isSidebarOpen}
          size="md"
          className={cn('transition-all duration-500', !isSidebarOpen && 'ml-1')}
        />
        <button
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-white/5 rounded-lg transition-all text-text-secondary hover:text-white shrink-0"
          aria-label="Toggle sidebar"
        >
          <ChevronLeft className={cn('w-5 h-5 transition-transform duration-500', !isSidebarOpen && 'rotate-180')} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={cn(
              'flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden w-full text-left',
              isActive(item.path)
                ? 'bg-accent-gold text-background font-bold'
                : 'text-text-secondary hover:text-white hover:bg-white/5'
            )}
          >
            <item.icon className={cn(
              'w-5 h-5 shrink-0',
              isActive(item.path) ? 'text-background' : 'group-hover:text-accent-gold transition-colors'
            )} />
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -8 }}
                  transition={{ duration: 0.2 }}
                  className="text-sm tracking-wide whitespace-nowrap overflow-hidden"
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
            {isActive(item.path) && (
              <motion.div
                layoutId="active-pill"
                className="absolute inset-0 bg-accent-gold -z-10"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 flex flex-col gap-3 shrink-0">
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="bg-white/5 rounded-2xl p-4"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">AI System Live</span>
              </div>
              <p className="text-[11px] text-text-secondary leading-relaxed">
                Quantum Engine v2.4 initialized and ready for QA.
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isSidebarOpen && profile && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-2 rounded-xl bg-white/[0.03] border border-white/5 flex items-center gap-2"
            >
              <div className={cn(
                'w-2 h-2 rounded-full shrink-0',
                profile.role === 'admin' ? 'bg-red-400' : profile.role === 'pro' ? 'bg-accent-gold' : 'bg-white/30'
              )} />
              <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">
                {profile.role} plan
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={handleSignOut}
          className="flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 text-text-secondary hover:text-white hover:bg-white/5 group w-full"
        >
          <LogOut className="w-5 h-5 shrink-0 group-hover:text-red-400 transition-colors" />
          <AnimatePresence>
            {isSidebarOpen && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="text-sm tracking-wide"
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </div>
  )

  return (
    <>
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 280 : 80 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'fixed top-0 bottom-0 glass-panel z-40 flex flex-col overflow-hidden',
          'left-0 rounded-none lg:left-4 lg:top-4 lg:bottom-4 lg:rounded-[32px]',
          !isSidebarOpen && 'max-lg:-translate-x-full'
        )}
        style={{ width: isSidebarOpen ? 280 : undefined }}
      >
        {sidebarContent}
      </motion.aside>
    </>
  )
}
