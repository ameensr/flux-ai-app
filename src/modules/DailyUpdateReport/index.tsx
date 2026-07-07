import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Settings, ClipboardCheck, LayoutGrid, Clock, AlertCircle,
  CheckCircle, ChevronDown, RefreshCw, Layers, AlertTriangle
} from 'lucide-react'
import { useDailyReportStore } from './store'
import { useAppStore } from '@/store/useAppStore'
import { usePermissions } from '@/hooks/usePermissions'
import { ROUTES } from '@/lib/routes'
import { GlassCard } from '@/components/ui/GlassCard'
import { SupportExceptionLog } from './components/SupportExceptionLog'
import { ReleaseTestingStatus } from './components/ReleaseTestingStatus'

export const DailyUpdateReport: React.FC = () => {
  const navigate = useNavigate()
  const { role } = useAppStore()
  const { can } = usePermissions()
  const {
    supportRows,
    releaseRows,
    loading,
    syncing,
    fetchDropdownConfigs,
    fetchReportRows,
    syncRowsToDatabase,
    syncStatus,
    overdueOnlyFilter,
    setOverdueOnlyFilter,
    projects,
    selectedProjectId,
    fetchProjects,
    setSelectedProjectId
  } = useDailyReportStore()

  // Active Tab state
  const [activeTab, setActiveTab] = useState<'support' | 'release'>('support')

  // Load initial configurations and user records on mount
  useEffect(() => {
    fetchDropdownConfigs()
    fetchProjects()
  }, [])

  // Fetch report rows when project changes
  useEffect(() => {
    if (selectedProjectId) {
      fetchReportRows()
    }
  }, [selectedProjectId])

  // Check if role is authorized to view dropdown configuration manager
  const isAuthorizedToConfig = can('daily-report', 'can_configure')

  // Metrics summary calculations
  const totalSupport = supportRows.length
  const totalRelease = releaseRows.length

  const completedSupport = supportRows.filter(r => ['Passed', 'Closed', 'Fixed'].includes(r.status)).length
  const completedRelease = releaseRows.filter(r => ['Pass', 'Passes'].includes(r.smoke_testing_status)).length
  const totalCompleted = completedSupport + completedRelease

  const blockedSupport = supportRows.filter(r => r.status === 'Blocked').length
  const blockedRelease = releaseRows.filter(r => r.smoke_testing_status === 'Blocked').length
  const totalBlocked = blockedSupport + blockedRelease

  const pendingSupport = supportRows.filter(r => ['Pending', 'In Progress', 'Retesting'].includes(r.status)).length
  const pendingRelease = releaseRows.filter(r => ['Not Executed', 'Retesting'].includes(r.smoke_testing_status)).length
  const totalPending = pendingSupport + pendingRelease

  const todayStr = new Date().toISOString().split('T')[0]
  const overdueTasksCount = supportRows.filter(r => {
    if (r.actual_end_date) return false
    if (!r.planned_end_date) return false
    return r.planned_end_date < todayStr  // Changed: < instead of <= (excludes today)
  }).length

  // Estimate hrs = support estimation + support retesting + release initial + release smoke + release overall
  const sumVal = (arr: any[], key: string) => {
    return arr.reduce((acc, row) => {
      const v = parseFloat(row[key])
      return acc + (isNaN(v) ? 0 : v)
    }, 0)
  }

  const totalEstimatedHrs =
    sumVal(supportRows, 'estimation_hrs') +
    sumVal(supportRows, 'retesting_estimation_hrs') +
    sumVal(releaseRows, 'initial_round_estimation_hrs') +
    sumVal(releaseRows, 'smoke_testing_estimation_hrs') +
    sumVal(releaseRows, 'overall_estimation_hrs')

  // Spent Hours = completed support estimation + completed release overall estimation + blocked hours (overhead)
  const completedSupportHrs = supportRows
    .filter(r => ['Passed', 'Closed', 'Fixed'].includes(r.status))
    .reduce((acc, r) => acc + (parseFloat(r.estimation_hrs as any) || 0) + (parseFloat(r.retesting_estimation_hrs as any) || 0), 0)

  const completedReleaseHrs = releaseRows
    .filter(r => ['Pass', 'Passes'].includes(r.smoke_testing_status))
    .reduce((acc, r) => acc + (parseFloat(r.overall_estimation_hrs as any) || 0), 0)

  const totalBlockedHrs = sumVal(supportRows, 'blocked_hours')

  const totalActualHrs = completedSupportHrs + completedReleaseHrs + totalBlockedHrs

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

          {/* Config button (RBAC protected) */}
          {isAuthorizedToConfig && (
            <button
              onClick={() => navigate(ROUTES.dailyReportConfig)}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent-gold text-black hover:opacity-90 transition-all font-black uppercase tracking-wider"
            >
              <Settings className="w-3.5 h-3.5" />
              Configuration
            </button>
          )}
        </div>
      </div>

      {/* Project Filter */}
      <div className="mb-8">
        <GlassCard hoverEffect={false} className="p-5">
          <div className="flex items-center gap-4">
            <label className="text-sm font-bold text-[var(--text-primary)] shrink-0">
              Filter by Project:
            </label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="flex-1 max-w-md px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] text-sm focus:outline-none focus:ring-2 focus:ring-accent-gold/50 transition-all"
            >
              <option value="">-- All Projects --</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>
                  {p.project_name} ({p.project_code})
                </option>
              ))}
            </select>
            {selectedProjectId && (
              <span className="text-xs text-text-muted">
                Showing updates from project members only
              </span>
            )}
          </div>
        </GlassCard>
      </div>

      {/* Summary Dashboard widgets */}
      <div className={`grid grid-cols-2 md:grid-cols-4 ${activeTab === 'support' ? 'lg:grid-cols-8' : 'lg:grid-cols-7'} gap-4 mb-10`}>
        {(activeTab === 'support' ? [
          { label: 'Support Tasks', val: totalSupport, icon: Layers, color: 'text-blue-400 bg-blue-500/5' },
          { label: 'Passed/Fixed', val: completedSupport, icon: CheckCircle, color: 'text-green-400 bg-green-500/5' },
          { label: 'Pending Run', val: pendingSupport, icon: Clock, color: 'text-yellow-400 bg-yellow-500/5' },
          { label: 'Blocked Support', val: blockedSupport, icon: AlertCircle, color: 'text-red-400 bg-red-500/5' },
          { label: 'Overdue Tasks', val: overdueTasksCount, icon: AlertTriangle, color: 'text-rose-400 bg-rose-500/5', isClickable: true },
          { label: 'Est. Hours', val: `${Math.round((sumVal(supportRows, 'estimation_hrs') + sumVal(supportRows, 'retesting_estimation_hrs')) * 10) / 10}h`, icon: Clock, color: 'text-indigo-400 bg-indigo-500/5' },
          { label: 'Blocked Hours', val: `${Math.round(totalBlockedHrs * 10) / 10}h`, icon: AlertCircle, color: 'text-orange-400 bg-orange-500/5' },
          { label: 'Total TCs', val: sumVal(supportRows, 'tc_count'), icon: LayoutGrid, color: 'text-pink-400 bg-pink-500/5' },
        ] : [
          { label: 'Release Tasks', val: totalRelease, icon: Layers, color: 'text-pink-400 bg-pink-500/5' },
          { label: 'Smoke Passed', val: completedRelease, icon: CheckCircle, color: 'text-green-400 bg-green-500/5' },
          { label: 'Pending Smoke', val: pendingRelease, icon: Clock, color: 'text-yellow-400 bg-yellow-500/5' },
          { label: 'Blocked Smoke', val: blockedRelease, icon: AlertCircle, color: 'text-red-400 bg-red-500/5' },
          { label: 'Initial Est', val: `${Math.round(sumVal(releaseRows, 'initial_round_estimation_hrs') * 10) / 10}h`, icon: Clock, color: 'text-purple-400 bg-purple-500/5' },
          { label: 'Smoke Est', val: `${Math.round(sumVal(releaseRows, 'smoke_testing_estimation_hrs') * 10) / 10}h`, icon: Clock, color: 'text-indigo-400 bg-indigo-500/5' },
          { label: 'Overall Est', val: `${Math.round(sumVal(releaseRows, 'overall_estimation_hrs') * 10) / 10}h`, icon: CheckCircle, color: 'text-emerald-400 bg-emerald-500/5' },
        ]).map((card, i) => {
          const isOverdueCard = card.label === 'Overdue Tasks'
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
              <div className="flex items-center justify-between">
                <span className="text-[9px] uppercase font-bold tracking-widest text-text-muted">{card.label}</span>
                <card.icon className={`w-4 h-4 ${card.color.split(' ')[0]}`} />
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

      {/* Premium Centered Navigation Switcher */}
      <div className="flex justify-center mb-10 border-b border-[var(--divider)] pb-6">
        <div className="flex items-center gap-1.5 bg-[var(--surface-secondary)]/80 backdrop-blur-xl border border-[var(--border)] p-1.5 rounded-2xl relative shadow-xl">
          {[
            { id: 'support', label: 'Support & Exception Log', count: totalSupport },
            { id: 'release', label: 'Release Testing Status', count: totalRelease }
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
