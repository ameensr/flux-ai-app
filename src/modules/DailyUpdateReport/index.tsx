import React, { useEffect, useRef, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ClipboardCheck, Clock, AlertCircle,
  CheckCircle, ChevronDown, RefreshCw, Layers, AlertTriangle, Info
} from 'lucide-react'
import { useDailyReportStore } from './store'
import { useAppStore } from '@/store/useAppStore'
import { usePermissions } from '@/hooks/usePermissions'
import { GlassCard } from '@/components/ui/GlassCard'
import { SupportExceptionLog } from './components/SupportExceptionLog'
import { ReleaseTestingStatus } from './components/ReleaseTestingStatus'
import { buildOutcomeBucketMap, resolveOutcomeBucket, findDashboardRoleColumn } from './columnConfigStore'
import { useDynamicColumns } from './useDynamicColumns'

// ── Hover "info" icon + tooltip for a summary dashboard card ───────────────
// Explains exactly what each card counts — including, for the bucket-driven
// cards (Passed/Fixed, Pending Run, Blocked Issues, Smoke Passed/Pending/
// Blocked), which column is currently feeding it. If no column has been
// assigned that dashboard role yet (see findDashboardRoleColumn / the
// "Dashboard Metrics" button on each table's toolbar), the tooltip switches
// to an amber warning so cards never silently show zero after a column is
// renamed or rebuilt as a custom field.
const CardInfoTooltip: React.FC<{ text: string; warning?: boolean }> = ({ text, warning }) => {
  const [hovered, setHovered] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)
  const iconRef = useRef<HTMLButtonElement>(null)
  const panelWidth = 240

  const updatePosition = () => {
    const rect = iconRef.current?.getBoundingClientRect()
    if (!rect) return
    const left = Math.min(Math.max(8, rect.left - panelWidth / 2 + rect.width / 2), window.innerWidth - panelWidth - 8)
    setCoords({ top: rect.bottom + 8, left })
  }

  useLayoutEffect(() => {
    if (!hovered) return
    updatePosition()
    const handle = () => updatePosition()
    window.addEventListener('scroll', handle, true)
    window.addEventListener('resize', handle)
    return () => {
      window.removeEventListener('scroll', handle, true)
      window.removeEventListener('resize', handle)
    }
  }, [hovered])

  return (
    <>
      <button
        ref={iconRef}
        type="button"
        onClick={e => e.stopPropagation()} // don't trigger the card's own onClick (e.g. Overdue Tasks filter toggle)
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="shrink-0 leading-none opacity-60 hover:opacity-100 transition-opacity"
        aria-label="What does this card count?"
      >
        <Info className="w-3 h-3 text-text-muted cursor-help" />
      </button>

      {createPortal(
        <AnimatePresence>
          {hovered && coords && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              style={{ position: 'fixed', top: coords.top, left: coords.left, width: panelWidth, zIndex: 9999 }}
              className={`pointer-events-none text-[10px] leading-relaxed p-2.5 rounded-lg shadow-2xl backdrop-blur-md border ${warning
                ? 'bg-amber-950/95 border-amber-500/40 text-amber-200'
                : 'bg-[var(--surface-elevated)] border-[var(--border)] text-[var(--text-secondary)]'}`}
            >
              {text}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}

export const DailyUpdateReport: React.FC = () => {
  const { role } = useAppStore()
  const { can } = usePermissions()
  const {
    supportRows,
    releaseRows,
    loading,
    syncing,
    syncRowsToDatabase,
    syncStatus,
    overdueOnlyFilter,
    setOverdueOnlyFilter,
    projects,
    selectedProjectId,
    fetchProjects,
    setSelectedProjectId,
    isProjectViewer,
    userProjectRole
  } = useDailyReportStore()

  // Resolves each table's active column configuration (Project →
  // Organization Default) AND loads custom-field values for the currently
  // loaded rows — needed because the dashboard-role column (see
  // findDashboardRoleColumn) can be a CUSTOM column, whose values live in
  // daily_report_custom_field_values, not on the row object directly.
  // getCellValue() below already knows how to read either kind correctly.
  const supportDyn = useDynamicColumns('support', selectedProjectId)
  const releaseDyn = useDynamicColumns('release', selectedProjectId)

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'support' | 'release'>('support')

  // Load initial user/project records on mount
  useEffect(() => {
    fetchProjects()
  }, [])

  // ⚠️ Report rows are intentionally NOT (re-)fetched here on `selectedProjectId`
  // change. `setSelectedProjectId` (called by the project dropdown below, and
  // by fetchProjects' auto-select) already awaits `fetchProjectMembers` +
  // `fetchUserProjectRole` before calling `fetchReportRows()` itself — those
  // determine which rows the current user is even allowed to see. A second,
  // independent `fetchReportRows()` fired straight off the `selectedProjectId`
  // change (as this effect used to do) races ahead of that member/role fetch
  // and queries with stale/empty filters; whichever of the two out-of-order
  // network responses happened to resolve LAST silently won, which is what
  // intermittently left the table showing an empty result until a manual
  // refresh re-ran the (by-then-correct) sequenced fetch.

  // Load custom-field values for the dashboard-role lookups below (cheap
  // no-op if the dashboard-role column for a table happens to be a system
  // column, since getCellValue only consults this map for custom columns).
  useEffect(() => {
    supportDyn.loadCustomValuesForRows(supportRows.map(r => r.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supportRows.map(r => r.id).join(','), supportDyn.columns.length])
  useEffect(() => {
    releaseDyn.loadCustomValuesForRows(releaseRows.map(r => r.id))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [releaseRows.map(r => r.id).join(','), releaseDyn.columns.length])

  // Which column currently feeds each table's dashboard metric — an
  // explicit dashboard_role assignment made via the "Dashboard Metrics"
  // button on each table's toolbar, which works for system AND custom
  // columns alike (see findDashboardRoleColumn). Falls back to the original
  // system column's internal_key if nothing has been explicitly assigned yet.
  const supportRoleCol = findDashboardRoleColumn(supportDyn.columns, 'testing_status')
  const releaseRoleCol = findDashboardRoleColumn(releaseDyn.columns, 'smoke_status')
  const supportBucketMap = buildOutcomeBucketMap(supportRoleCol)
  const releaseBucketMap = buildOutcomeBucketMap(releaseRoleCol)

  // Resolves the outcome bucket for a row using whichever column holds the
  // role — reading via getCellValue so custom-column values (stored
  // separately) are handled exactly the same as system-column values.
  const supportOutcome = (row: any) => supportRoleCol
    ? resolveOutcomeBucket(supportBucketMap, supportDyn.getCellValue(row, supportRoleCol))
    : 'other'
  const releaseOutcome = (row: any) => releaseRoleCol
    ? resolveOutcomeBucket(releaseBucketMap, releaseDyn.getCellValue(row, releaseRoleCol))
    : 'other'

  // Metrics summary calculations
  const totalSupport = supportRows.length
  const totalRelease = releaseRows.length

  const completedSupport = supportRows.filter(r => supportOutcome(r) === 'completed').length
  const completedRelease = releaseRows.filter(r => releaseOutcome(r) === 'completed').length

  const blockedSupport = supportRows.filter(r => supportOutcome(r) === 'blocked').length
  const blockedRelease = releaseRows.filter(r => releaseOutcome(r) === 'blocked').length

  const pendingSupport = supportRows.filter(r => supportOutcome(r) === 'pending').length
  const pendingRelease = releaseRows.filter(r => releaseOutcome(r) === 'pending').length

  const todayStr = new Date().toISOString().split('T')[0]
  // Overdue uses Planned / Actual End Date system fields when present.
  const overdueTasksCount = supportRows.filter(r => {
    if (r.actual_end_date) return false
    if (!r.planned_end_date) return false
    return r.planned_end_date < todayStr
  }).length

  // Builds the tooltip text for a bucket-driven card, naming the column
  // currently feeding it (so it's clear e.g. "Passed/Fixed" is reading a
  // renamed or custom "STATUS" column, not the original system one) — or a
  // clear warning if no column has that dashboard role assigned yet, which
  // is exactly the situation that made these cards silently show 0 or
  // uncounted rows after a column was renamed/rebuilt.
  const bucketCardTooltip = (roleCol: typeof supportRoleCol, bucketLabel: string) => {
    if (!roleCol) {
      return {
        tooltip: `No column is currently assigned to feed this metric. Click "Dashboard Metrics" on the table toolbar below, pick the source column, and assign a bucket to each of its options.`,
        warning: true,
      }
    }
    return {
      tooltip: `Counts rows where "${roleCol.display_name}" is set to an option tagged with the "${bucketLabel}" bucket. Reassign buckets via "Dashboard Metrics" on the table toolbar.`,
      warning: false,
    }
  }

  return (
    <div className="py-6 sm:py-12">
      {/* Header bar */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-clash font-black text-3xl sm:text-4xl text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <ClipboardCheck className="w-8 h-8 text-accent-gold" />
            Daily Update Report
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Track support exception logs, task estimations, daily test runs, and release readiness.
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs">
          {/* Viewer Mode Badge */}
          {isProjectViewer && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="font-semibold uppercase tracking-wide">Read-Only Mode</span>
            </div>
          )}

          {/* Project Role Badge */}
          {userProjectRole && userProjectRole !== 'viewer' && (
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              <span className="capitalize">{userProjectRole}</span>
            </div>
          )}

          {/* Sync status badge */}
          {syncStatus !== 'local' && (
            <button
              onClick={() => syncRowsToDatabase()}
              disabled={syncing}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-text-secondary hover:text-white transition-all disabled:opacity-40"
              title="Force database sync"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Sync DB
            </button>
          )}

        </div>
      </div>

      {/* Summary Dashboard widgets — status metrics only (hours/TCs removed).
          Bucket cards are driven by Dashboard Metrics configuration.
          Placed above the Filter by Project card so it's the first thing
          visible at the top of the page. */}
      <div className="glass-panel relative overflow-hidden group p-5 mb-8">
      <div className={`grid grid-cols-2 md:grid-cols-3 ${activeTab === 'support' ? 'lg:grid-cols-5' : 'lg:grid-cols-4'} gap-4`}>
        {(activeTab === 'support' ? [
          { label: 'Support Tasks', val: totalSupport, icon: Layers, color: 'text-blue-400 bg-blue-500/5', tooltip: 'Total number of rows currently in the Support & Exception Log for this project.' },
          { label: 'Passed/Fixed', val: completedSupport, icon: CheckCircle, color: 'text-green-400 bg-green-500/5', ...bucketCardTooltip(supportRoleCol, 'Completed') },
          { label: 'Pending Run', val: pendingSupport, icon: Clock, color: 'text-yellow-400 bg-yellow-500/5', ...bucketCardTooltip(supportRoleCol, 'Pending') },
          { label: 'Blocked Issues', val: blockedSupport, icon: AlertCircle, color: 'text-red-400 bg-red-500/5', ...bucketCardTooltip(supportRoleCol, 'Blocked') },
          { label: 'Overdue', val: overdueTasksCount, icon: AlertTriangle, color: 'text-rose-400 bg-rose-500/5', isClickable: true, tooltip: 'Rows whose Planned End Date has already passed and which have no Actual End Date yet. Click this card to filter the table to only these rows.' },
        ] : [
          { label: 'Release Tasks', val: totalRelease, icon: Layers, color: 'text-pink-400 bg-pink-500/5', tooltip: 'Total number of rows currently in the Release Testing Log for this project.' },
          { label: 'Smoke Passed', val: completedRelease, icon: CheckCircle, color: 'text-green-400 bg-green-500/5', ...bucketCardTooltip(releaseRoleCol, 'Completed') },
          { label: 'Pending Smoke', val: pendingRelease, icon: Clock, color: 'text-yellow-400 bg-yellow-500/5', ...bucketCardTooltip(releaseRoleCol, 'Pending') },
          { label: 'Blocked Issues', val: blockedRelease, icon: AlertCircle, color: 'text-red-400 bg-red-500/5', ...bucketCardTooltip(releaseRoleCol, 'Blocked') },
        ]).map((card, i) => {
          const isOverdueCard = card.label === 'Overdue'
          const isSelected = isOverdueCard && overdueOnlyFilter
          return (
            <motion.div
              key={`${activeTab}-${card.label}`}
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.05 }}
              onClick={() => {
                if (card.isClickable) {
                  setOverdueOnlyFilter(!overdueOnlyFilter)
                }
              }}
              className={`p-4 rounded-2xl border ${isSelected
                ? 'border-rose-500/60 bg-rose-500/[0.06] shadow-lg shadow-rose-500/[0.05]'
                : card.isClickable
                  ? 'border-[var(--border)] bg-[var(--surface-secondary)]/50 hover:bg-rose-500/[0.02] hover:border-rose-500/25 hover:shadow-lg cursor-pointer'
                  : 'border-[var(--border)] bg-[var(--surface-secondary)]/50 hover:bg-[var(--surface-secondary)]/90 hover:border-accent-gold/25 hover:shadow-lg'
                } flex flex-col justify-between transition-all duration-300 relative overflow-hidden`}
            >
              <div className="flex items-center justify-between gap-1">
                <span className="flex items-center gap-1 min-w-0">
                  <span className="text-[9px] uppercase font-bold tracking-widest text-text-muted truncate">{card.label}</span>
                  {'tooltip' in card && card.tooltip && <CardInfoTooltip text={card.tooltip} warning={(card as any).warning} />}
                </span>
                <card.icon className={`w-4 h-4 shrink-0 ${card.color.split(' ')[0]}`} />
              </div>
              <div className="flex items-baseline mt-2 gap-1.5 select-none">
                <span className="text-xl font-black text-[var(--text-primary)]">{card.val}</span>
                {isOverdueCard && overdueOnlyFilter && (
                  <span className="text-[9px] font-bold text-rose-500 uppercase tracking-widest ml-1 animate-pulse">(Active)</span>
                )}
              </div>
              <div className="absolute inset-0 bg-radial-gradient from-white/[0.01] to-transparent pointer-events-none" />
            </motion.div>
          )
        })}
      </div>
      </div>

      {/* Project Filter - Layer 3: UI Feedback */}
      <div className="mb-8">
        <GlassCard hoverEffect={false} className="p-5">
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-[var(--text-primary)] shrink-0">
              Filter by Project:
            </label>

            {/* Empty State Feedback */}
            {projects.length === 0 ? (
              <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm text-amber-200 font-medium">
                    No projects assigned to you
                  </p>
                  <p className="text-xs text-amber-300/70 mt-0.5">
                    Contact your manager or QA lead to get assigned to a project
                  </p>
                </div>
              </div>
            ) : (
              <>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="flex-1 max-w-md px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-gold/50 transition-all"
                >
                  <option value="">-- Select a Project --</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.project_name} ({p.project_code})
                    </option>
                  ))}
                </select>
                {selectedProjectId && (
                  <span className="text-xs text-text-muted shrink-0">
                    Showing updates from project members only
                  </span>
                )}
                {projects.length > 1 && (
                  <span className="text-xs text-emerald-400 shrink-0 font-medium">
                    {projects.length} projects available
                  </span>
                )}
              </>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Premium Centered Navigation Switcher */}
      <div className="flex justify-center mb-10 border-b border-[var(--divider)] pb-6">
        <div className="flex items-center gap-1.5 bg-[var(--surface-secondary)]/80 backdrop-blur-xl border border-[var(--border)] p-1.5 rounded-2xl relative shadow-xl">
          {[
            { id: 'support', label: 'Support & Exception Log', count: totalSupport },
            { id: 'release', label: 'Release Testing Log', count: totalRelease }
          ].map(tab => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-wider relative transition-all duration-300 outline-none ${isActive ? 'text-[var(--accent-fg)] font-extrabold' : 'text-text-secondary hover:text-[var(--text-primary)]'}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="active-tab-indicator"
                    className="absolute inset-0 bg-accent-gold rounded-xl z-0 shadow-lg shadow-accent-gold/10"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.5 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
                <span className={`relative z-10 px-2 py-0.5 rounded-md text-[9px] font-mono font-bold transition-colors ${isActive ? 'bg-black/15 text-[var(--accent-fg)]' : 'bg-[var(--surface)] text-[var(--text-secondary)] border border-[var(--border)]'}`}>
                  {tab.count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Main spreadsheets list tabs viewport */}
      {loading ? (
        <div className="flex flex-col gap-6 py-12">
          <div className="h-16 rounded-2xl bg-white/5 animate-pulse w-full" />
          <div className="h-16 rounded-2xl bg-white/5 animate-pulse w-full" />
        </div>
      ) : !selectedProjectId ? (
        /* No Project Selected - Empty State */
        <GlassCard hoverEffect={false} className="p-12">
          <div className="flex flex-col items-center justify-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-gold/20 to-accent-gold/5 border-2 border-accent-gold/30 flex items-center justify-center">
              <Layers className="w-8 h-8 text-accent-gold" />
            </div>
            <div>
              <h3 className="text-lg font-black text-[var(--text-primary)] mb-2">
                Select a Project to View Daily Report
              </h3>
              <p className="text-sm text-text-muted max-w-md">
                Choose a project from the dropdown above to view and manage daily updates,
                support logs, and release testing status for that project.
              </p>
            </div>
            {projects.length > 0 && (
              <button
                onClick={() => setSelectedProjectId(projects[0].id)}
                className="mt-4 flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-gold text-black hover:opacity-90 transition-all font-bold uppercase tracking-wide text-sm"
              >
                <ChevronDown className="w-4 h-4" />
                Select First Project
              </button>
            )}
          </div>
        </GlassCard>
      ) : (
        <div className="relative mt-2">
          <AnimatePresence mode="wait">
            {activeTab === 'support' ? (
              <motion.div
                key="support-tab-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <SupportExceptionLog />
              </motion.div>
            ) : (
              <motion.div
                key="release-tab-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                <ReleaseTestingStatus />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

