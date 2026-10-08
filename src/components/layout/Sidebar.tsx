import React, { useEffect, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { usePermissions } from '@/hooks/usePermissions'
import {
  LayoutDashboard, Bug, FileText, PenTool, Settings,
  ChevronLeft, Shield, LogOut, ClipboardList,
  ClipboardCheck, FolderKanban, UserRound, AlertCircle,
  LifeBuoy, Layers, Rocket, ChevronDown,
} from 'lucide-react'
import { Logo } from '../ui/Logo'
import { SignOutConfirmModal } from './SignOutConfirmModal'
import { supabase } from '@/lib/supabase'
import { ROUTES } from '@/lib/routes'

export type NavItemEntry = {
  type: 'item'
  path: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  moduleKey: string
}

export type NavGroupEntry = {
  type: 'group'
  label: string
  icon: React.ComponentType<{ className?: string }>
  groupKey: string
  items: Array<{
    path: string
    label: string
    icon: React.ComponentType<{ className?: string }>
    moduleKey: string
  }>
}

export type NavEntry = NavItemEntry | NavGroupEntry

const ALL_NAV_CONFIG: NavEntry[] = [
  { type: 'item', path: ROUTES.dashboard, label: 'Dashboard', icon: LayoutDashboard, moduleKey: 'dashboard' },
  {
    type: 'group',
    label: 'QA Operations Hub',
    icon: Layers,
    groupKey: 'qa-operations',
    items: [
      { path: ROUTES.supportTracker, label: 'Support Issue Tracker', icon: LifeBuoy, moduleKey: 'support-tracker' },
      { path: ROUTES.releaseTracker, label: 'Release Task Tracker', icon: Rocket, moduleKey: 'release-tracker' },
    ]
  },
  { type: 'item', path: ROUTES.dailyReport, label: 'Daily Update Report', icon: ClipboardCheck, moduleKey: 'daily-report' },
  { type: 'item', path: ROUTES.bugStatus, label: "What's the Bug Status?", icon: AlertCircle, moduleKey: 'bug-status' },
  { type: 'item', path: ROUTES.bugRefiner, label: 'AI Bug Refiner', icon: Bug, moduleKey: 'bug-refiner' },
  { type: 'item', path: ROUTES.testGenerator, label: 'Test Cases', icon: FileText, moduleKey: 'test-generator' },
  { type: 'item', path: ROUTES.writingAssistant, label: 'Writing Assistant', icon: PenTool, moduleKey: 'writing-assistant' },
  { type: 'item', path: ROUTES.qaReport, label: 'QA Weekly Report', icon: ClipboardList, moduleKey: 'qa-report' },
  { type: 'item', path: ROUTES.settings, label: 'Settings', icon: Settings, moduleKey: 'settings' },
  { type: 'item', path: ROUTES.projectHub, label: 'Project Hub', icon: FolderKanban, moduleKey: 'project-hub' },
  { type: 'item', path: ROUTES.admin, label: 'Admin Panel', icon: Shield, moduleKey: 'admin' },
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
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [isQaGroupOpen, setIsQaGroupOpen] = useState(true)

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
    setSignOutOpen(false)
    navigate(ROUTES.login, { replace: true })
  }

  const isActive = (itemPath: string) =>
    pathname === itemPath || pathname.startsWith(itemPath + '/')

  const isQaGroupActive = isActive(ROUTES.supportTracker) || isActive(ROUTES.releaseTracker)

  useEffect(() => {
    if (isQaGroupActive) {
      setIsQaGroupOpen(true)
    }
  }, [pathname, isQaGroupActive])

  const visibleEntries: NavEntry[] = permissionsLoaded
    ? (ALL_NAV_CONFIG.map(entry => {
        if (entry.type === 'item') {
          return canView(entry.moduleKey) ? entry : null
        } else {
          const visibleSubs = entry.items.filter(sub => canView(sub.moduleKey))
          if (visibleSubs.length === 0) return null
          return { ...entry, items: visibleSubs }
        }
      }).filter(Boolean) as NavEntry[])
    : ALL_NAV_CONFIG

  const mainEntries = visibleEntries.filter(
    e => e.type === 'group' || !['settings', 'project-hub', 'admin'].includes(e.moduleKey)
  )
  const bottomEntries = visibleEntries.filter(
    e => e.type === 'item' && ['settings', 'project-hub', 'admin'].includes(e.moduleKey)
  ) as NavItemEntry[]

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

  const NavItem = ({
    item,
    isSubItem = false,
  }: {
    item: { path: string; label: string; icon: React.ComponentType<{ className?: string }>; moduleKey: string }
    isSubItem?: boolean
  }) => {
    const active = isActive(item.path)
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
          isSubItem && 'text-[12.5px] py-1.5'
        )}
      >
        {active && (
          <motion.div
            layoutId="sidebar-active"
            className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
            style={{ background: 'var(--accent)' }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
          />
        )}
        <item.icon className={cn('shrink-0', isSidebarOpen ? (isSubItem ? 'w-3.5 h-3.5' : 'w-4 h-4') : 'w-5 h-5')} />
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

  const NavGroup = ({ group }: { group: NavGroupEntry }) => {
    const isAnyActive = group.items.some(it => isActive(it.path))

    if (!isSidebarOpen) {
      return (
        <div className="flex flex-col gap-0.5">
          {group.items.map(subItem => (
            <NavItem key={subItem.path} item={subItem} />
          ))}
        </div>
      )
    }

    return (
      <div className="flex flex-col">
        <button
          type="button"
          onClick={() => setIsQaGroupOpen(prev => !prev)}
          className={cn(
            'qaly-nav-item w-full flex items-center justify-between text-left select-none',
            isAnyActive && 'font-semibold',
          )}
          style={{
            color: isAnyActive ? 'var(--accent)' : 'var(--text-secondary)',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <group.icon className="w-4 h-4 shrink-0" />
            <span className="text-[13px] tracking-tight truncate">{group.label}</span>
          </div>
          <ChevronDown
            className={cn(
              'w-3.5 h-3.5 transition-transform duration-200 shrink-0 text-slate-400',
              isQaGroupOpen && 'rotate-180'
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {isQaGroupOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden flex flex-col gap-0.5 pl-3 border-l ml-3 my-0.5"
              style={{ borderColor: 'var(--border)' }}
            >
              {group.items.map(subItem => (
                <NavItem key={subItem.path} item={subItem} isSubItem />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <>
      <SignOutConfirmModal
        open={signOutOpen}
        onCancel={() => setSignOutOpen(false)}
        onConfirm={handleSignOut}
        displayName={hasName ? displayName : undefined}
      />

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
        transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
        className={cn(
          'qaly-sidebar fixed top-0 bottom-0 z-40 flex flex-col overflow-hidden',
          'left-0 lg:left-3 lg:top-3 lg:bottom-3 lg:rounded-2xl',
          !isSidebarOpen && 'max-lg:-translate-x-full',
        )}
      >
        {/* ── Header ── */}
        <div className={cn(
          'flex items-center h-[60px] shrink-0 px-4',
          isSidebarOpen ? 'justify-between' : 'justify-center',
        )}>
          <Logo size="sm" animate={false} collapsed={!isSidebarOpen} />
          <button
            onClick={() => setSidebarOpen(!isSidebarOpen)}
            className="p-1.5 rounded-lg pressable"
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
          {mainEntries.map(entry => {
            if (entry.type === 'group') {
              return <NavGroup key={entry.groupKey} group={entry} />
            }
            return <NavItem key={entry.path} item={entry} />
          })}
        </nav>

        {/* ── Bottom section ── */}
        <div className="px-2 pb-3 flex flex-col gap-0.5">
          <div style={{ height: 1, background: 'var(--divider)', margin: '4px 4px 8px' }} />

          {bottomEntries.map(item => <NavItem key={item.path} item={item} />)}

          {/* Account card — identity + sign out */}
          {profile ? (
            <div className={cn('mt-1', !isSidebarOpen && 'flex flex-col items-center gap-1.5')}>
              {isSidebarOpen ? (
                <div
                  className="mx-1 rounded-xl overflow-hidden transition-all group/card"
                  style={{
                    background: 'var(--surface-secondary)',
                    border: '1px solid var(--border)',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {/* Top accent — expands + soft shimmer on hover */}
                  <div
                    className="relative h-0.5 w-full overflow-hidden"
                    style={{ background: 'var(--divider)' }}
                  >
                    <span
                      className="absolute inset-y-0 left-0 w-0 group-hover/card:w-full transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      style={{
                        background:
                          'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 35%, transparent))',
                      }}
                    />
                    <span
                      className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 opacity-0 group-hover/card:opacity-100 group-hover/card:translate-x-[280%] transition-all duration-700 ease-out"
                      style={{
                        background:
                          'linear-gradient(90deg, transparent, color-mix(in srgb, var(--accent-fg) 55%, transparent), transparent)',
                      }}
                    />
                  </div>

                  <div className="px-2 py-2 flex items-center gap-1.5">
                    <Link
                      to={ROUTES.settings}
                      title={hasName ? `${displayName} · ${roleLabel}` : 'Add your name in Settings'}
                      className="flex items-center gap-2.5 min-w-0 flex-1 rounded-lg px-1 py-1 -my-0.5 transition-colors"
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = 'var(--hover)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
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
                          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', roleDot)} />
                          <span
                            className="text-[10px] font-medium truncate"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            {roleLabel}
                            {!hasName && profile.email ? ` · ${profile.email}` : ''}
                          </span>
                        </div>
                      </div>
                    </Link>

                    <button
                      type="button"
                      onClick={() => setSignOutOpen(true)}
                      aria-label="Sign out"
                      title="Sign out"
                      className="shrink-0 p-2 rounded-lg transition-all"
                      style={{
                        color: 'var(--text-muted)',
                        border: '1px solid transparent',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.12)'
                        e.currentTarget.style.color = '#f87171'
                        e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.backgroundColor = 'transparent'
                        e.currentTarget.style.color = 'var(--text-muted)'
                        e.currentTarget.style.borderColor = 'transparent'
                      }}
                    >
                      <LogOut className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <Link
                    to={ROUTES.settings}
                    title={hasName ? `${displayName} · ${roleLabel}` : `${roleLabel} · Add your name`}
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
                  <button
                    type="button"
                    onClick={() => setSignOutOpen(true)}
                    aria-label="Sign out"
                    title="Sign out"
                    className="w-9 h-9 rounded-xl flex items-center justify-center transition-all"
                    style={{
                      color: 'var(--text-muted)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface-secondary)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = 'rgba(248,113,113,0.12)'
                      e.currentTarget.style.color = '#f87171'
                      e.currentTarget.style.borderColor = 'rgba(248,113,113,0.25)'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = 'var(--surface-secondary)'
                      e.currentTarget.style.color = 'var(--text-muted)'
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setSignOutOpen(true)}
              aria-label="Sign out"
              className={cn(
                'qaly-nav-item group mt-1',
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
          )}
        </div>
      </motion.aside>
    </>
  )
}
