import React, { useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { usePermissions } from '@/hooks/usePermissions'
import {
  LayoutDashboard, Bug, FileText, PenTool, Settings,
  ChevronLeft, Shield, LogOut, ClipboardList,
  ClipboardCheck, FolderKanban, UserRound,
} from 'lucide-react'
import { Logo } from '../ui/Logo'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/lib/routes'

const ALL_MENU_ITEMS = [
  { path: ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard, moduleKey: 'dashboard' },
  { path: ROUTES.dailyReport, label: 'Daily Update Report', icon: ClipboardCheck, moduleKey: 'daily-report' },
  { path: ROUTES.bugRefiner, label: 'AI Bug Refiner', icon: Bug, moduleKey: 'bug-refiner' },
  { path: ROUTES.testGenerator, label: 'Test Case Gen', icon: FileText, moduleKey: 'test-generator' },
  { path: ROUTES.writingAssistant, label: 'Writing Assistant', icon: PenTool, moduleKey: 'writing-assistant' },
  { path: ROUTES.qaReport, label: 'QA Weekly Report', icon: ClipboardList, moduleKey: 'qa-report' },
  { path: ROUTES.settings, label: 'Settings', icon: Settings, moduleKey: 'settings' },
  { path: ROUTES.projectHub, label: 'Project Hub', icon: FolderKanban, moduleKey: 'project-hub' },
  { path: ROUTES.admin, label: 'Admin Panel', icon: Shield, moduleKey: 'admin' },
]

// ── Nav section label ─────────────────────────────────────────────────────────
const SectionLabel = ({ label, visible }: { label: string; visible: boolean }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="px-3 pt-4 pb-1"
      >
        <span className="text-[10px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      </motion.div>
    )}
  </AnimatePresence>
)

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
    navigate(ROUTES.login, { replace: true })
  }

  const visibleItems = permissionsLoaded
    ? ALL_MENU_ITEMS.filter(item => canView(item.moduleKey))
    : ALL_MENU_ITEMS

  const isActive = (itemPath: string) =>
    pathname === itemPath || pathname.startsWith(itemPath + '/')

  // Split nav into main + bottom items
  const mainItems = visibleItems.filter(i => !['settings', 'project-hub', 'admin'].includes(i.moduleKey))
  const bottomItems = visibleItems.filter(i => ['settings', 'project-hub', 'admin'].includes(i.moduleKey))

  const displayName = profile?.full_name?.trim() || ''
  const hasName = displayName.length > 0
  const emailLocal = profile?.email?.split('@')[0] || ''
  const initials = (hasName ? displayName : emailLocal || '?')
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?'
  const roleLabel = profile
    ? (({
        super_admin: 'Super Admin',
        admin: 'Administrator',
        pro: 'Pro',
        free: 'Free',
        manager: 'Manager',
        qa_lead: 'QA Lead',
        qa_engineer: 'QA Engineer',
        developer: 'Developer',
        standard: 'Standard',
        guest: 'Guest',
      } as Record<string, string>)[profile.role]
      || profile.role.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()))
    : ''
  const roleDot =
    profile?.role === 'admin' || profile?.role === 'super_admin'
      ? 'bg-red-400'
      : profile?.role === 'pro'
        ? 'bg-violet-400'
        : 'bg-slate-400'

  const NavItem = ({ item }: { item: typeof ALL_MENU_ITEMS[0] }) => {
    const active = isActive(item.path)
    // Must be a real <a>/<Link> (not a button + navigate) so Ctrl/Cmd+click and
    // middle-click open the module in a new tab using the browser's native behavior.
    return (
      <Link
        to={item.path}
        title={!isSidebarOpen ? item.label : undefined}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'qaly-nav-item relative',
          active && 'active',
          !isSidebarOpen && 'justify-center px-0',
        )}
      >
        {/* Active indicator bar */}
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
            style={{ background: 'var(--accent)' }}
            transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
          />
        )}
        <item.icon className={cn('shrink-0', isSidebarOpen ? 'w-4 h-4' : 'w-5 h-5')} />
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -6 }}
              transition={{ duration: 0.18 }}
              className="text-[13px] font-medium truncate"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>
    )
  }

  return (
    <>
      {/* Mobile backdrop */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-30 lg:hidden"
            style={{ backgroundColor: 'var(--overlay)', backdropFilter: 'blur(4px)' }}
          />
        )}
      </AnimatePresence>

      <motion.aside
        initial={false}
        animate={{ width: isSidebarOpen ? 240 : 64 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={cn(
          'fixed top-0 bottom-0 z-40 flex flex-col overflow-hidden',
          'left-0 lg:left-3 lg:top-3 lg:bottom-3 lg:rounded-2xl',
          !isSidebarOpen && 'max-lg:-translate-x-full',
        )}
        style={{
          backgroundColor: 'var(--sidebar-bg)',
          borderRight: '1px solid var(--border)',
          // On desktop, use a card-style sidebar
        }}
      >
        {/* ── Header ── */}
        <div className={cn(
          'flex items-center h-[60px] shrink-0 px-4',
          isSidebarOpen ? 'justify-between' : 'justify-center',
        )}>
          <Logo size="sm" animate={false} collapsed={!isSidebarOpen} />
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => {
              e.currentTarget.style.backgroundColor = 'var(--hover)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.backgroundColor = 'transparent'
              e.currentTarget.style.color = 'var(--text-muted)'
            }}
            aria-label="Toggle sidebar"
          >
            <ChevronLeft className={cn(
              'w-4 h-4 transition-transform duration-300',
              !isSidebarOpen && 'rotate-180',
            )} />
          </button>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: 1, background: 'var(--divider)', margin: '0 12px' }} />

        {/* ── Main nav ── */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 flex flex-col gap-0.5">
          <SectionLabel label="Workspace" visible={isSidebarOpen} />
          {mainItems.map(item => <NavItem key={item.path} item={item} />)}
        </nav>

        {/* ── Bottom section ── */}
        <div className="px-2 pb-3 flex flex-col gap-0.5">
          <div style={{ height: 1, background: 'var(--divider)', margin: '4px 4px 8px' }} />

          {bottomItems.map(item => <NavItem key={item.path} item={item} />)}

          {/* User identity — just above Sign Out */}
          {profile && (
            <div className={cn('mt-1', !isSidebarOpen && 'flex justify-center')}>
              {isSidebarOpen ? (
                <Link
                  to={ROUTES.settings}
                  title={hasName ? displayName : 'Add your name in Settings'}
                  className="mx-1 block rounded-xl overflow-hidden transition-all group"
                  style={{
                    background: 'var(--surface-secondary)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  <div
                    className="h-0.5 w-full"
                    style={{
                      background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 20%, transparent))',
                    }}
                  />
                  <div className="px-2.5 py-2.5 flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg shrink-0 flex items-center justify-center text-[11px] font-bold tracking-wide"
                      style={{
                        background: hasName
                          ? 'color-mix(in srgb, var(--accent) 16%, transparent)'
                          : 'var(--hover)',
                        color: hasName ? 'var(--accent)' : 'var(--text-muted)',
                        border: '1px solid var(--border)',
                      }}
                    >
                      {hasName ? initials : <UserRound className="w-3.5 h-3.5" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className="text-[12.5px] font-semibold truncate leading-tight"
                        style={{ color: hasName ? 'var(--text-primary)' : 'var(--text-muted)' }}
                      >
                        {hasName ? displayName : 'Add your name'}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                        <span className={cn('w-1 h-1 rounded-full shrink-0', roleDot)} />
                        <span
                          className="text-[10px] font-medium truncate"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {roleLabel}
                          {!hasName && profile.email ? ` · ${profile.email}` : ''}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ) : (
                <Link
                  to={ROUTES.settings}
                  title={hasName ? displayName : 'Add your name in Settings'}
                  aria-label={hasName ? displayName : 'Add your name'}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[10px] font-bold transition-all"
                  style={{
                    background: hasName
                      ? 'color-mix(in srgb, var(--accent) 16%, transparent)'
                      : 'var(--hover)',
                    color: hasName ? 'var(--accent)' : 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {hasName ? initials : <UserRound className="w-3.5 h-3.5" />}
                </Link>
              )}
            </div>
          )}

          {/* Sign out */}
          <button
            onClick={handleSignOut}
            aria-label="Sign out"
            className={cn(
              'qaly-nav-item group',
              !isSidebarOpen && 'justify-center px-0',
            )}
          >
            <LogOut className={cn(
              'shrink-0 transition-colors group-hover:text-red-400',
              isSidebarOpen ? 'w-4 h-4' : 'w-5 h-5',
            )} />
            <AnimatePresence>
              {isSidebarOpen && (
                <motion.span
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -6 }}
                  transition={{ duration: 0.18 }}
                  className="text-[13px] font-medium"
                >
                  Sign Out
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </motion.aside>
    </>
  )
}
