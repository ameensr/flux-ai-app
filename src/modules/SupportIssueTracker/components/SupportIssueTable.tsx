import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Search, Edit3, Trash2, History, ChevronLeft, ChevronRight,
  AlertCircle, CheckCircle2, Clock, Flame, Filter, MessageSquare,
  ArrowUpDown, ExternalLink, Plus
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { usePermissions } from '@/hooks/usePermissions'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/useAppStore'
import { EstimationLockControl } from '@/components/qa-operations/EstimationLockControl'
import { useSupportTrackerStore } from '../store'
import type { SupportIssue, EffortIndicatorState } from '../types'
import { calculateEffort, DEFAULT_TESTING_STATUSES } from '../types'

interface Props {
  onEditIssue: (issue: SupportIssue) => void
  onDeleteIssue: (issue: SupportIssue) => void
  onViewHistory: (issue: SupportIssue) => void
  onLogHours?: (issue: SupportIssue) => void
  onViewTimeLogs?: (issue: SupportIssue) => void
}

export function SupportIssueTable({
  onEditIssue,
  onDeleteIssue,
  onViewHistory,
  onLogHours,
  onViewTimeLogs
}: Props) {
  const { toast } = useToast()
  const { user, profile } = useAppStore()
  const currentUser = {
    name: (profile?.full_name || user?.user_metadata?.full_name || user?.email || 'System User') as string,
    id: user?.id
  }

  const { can } = usePermissions()
  const canEdit = can('support-tracker', 'can_edit')
  const canDelete = can('support-tracker', 'can_delete')
  const canViewHistory = can('support-tracker', 'can_view_history')
  const canLockEst = can('support-tracker', 'can_lock_estimated_hours')
  const canUnlockEst = can('support-tracker', 'can_unlock_estimated_hours')

  const {
    getFilteredIssues,
    filters,
    setFilters,
    dropdownConfigs,
    drillDownTarget,
    setDrillDownTarget,
    getTimeLogsForIssue,
    toggleEstimationLock
  } = useSupportTrackerStore()

  const issues = getFilteredIssues()

  // Local pagination & sorting state
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortField, setSortField] = useState<keyof SupportIssue>('sl_no')
  const [sortAsc, setSortAsc] = useState(true)

  // Sort issues
  const sortedIssues = useMemo(() => {
    return [...issues].sort((a, b) => {
      const aVal = a[sortField] ?? ''
      const bVal = b[sortField] ?? ''
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal
      }
      return sortAsc
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })
  }, [issues, sortField, sortAsc])

  // Pagination slice
  const totalPages = Math.max(1, Math.ceil(sortedIssues.length / pageSize))
  const paginatedIssues = useMemo(() => {
    const from = (currentPage - 1) * pageSize
    return sortedIssues.slice(from, from + pageSize)
  }, [sortedIssues, currentPage, pageSize])

  const handleSort = (field: keyof SupportIssue) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  // Get status color / badge class
  const getStatusBadge = (statusName: string) => {
    const config = dropdownConfigs.testing_status.find(s => s.value === statusName)
    const fallback = DEFAULT_TESTING_STATUSES.find(s => s.value === statusName)
    const color = config?.color || fallback?.color || '#94a3b8'

    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-xs group-hover:brightness-110 group-hover:shadow-sm transition-all duration-150"
        style={{
          backgroundColor: `${color}18`,
          borderColor: `${color}40`,
          color: color
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        {statusName}
      </span>
    )
  }

  // Render Effort Indicator with Incremental Time-Log Actions
  const renderEffortCell = (issue: SupportIssue) => {
    const estimated = Number(issue.estimated_hours) || 0
    const actual = Number(issue.actual_hours) || 0
    const { remainingHrs, overrunHrs, isOverrun, percentage, indicatorState } =
      calculateEffort(estimated, actual)

    const indicatorConfig: Record<EffortIndicatorState, { icon: any; color: string; bg: string; label: string }> = {
      on_track: {
        icon: '🟢',
        color: 'text-emerald-500 dark:text-emerald-400',
        bg: 'bg-emerald-500',
        label: 'On Track'
      },
      attention: {
        icon: '🟡',
        color: 'text-amber-500 dark:text-amber-400',
        bg: 'bg-amber-500',
        label: 'Attention'
      },
      overrun: {
        icon: '🔴',
        color: 'text-rose-500 dark:text-rose-400',
        bg: 'bg-rose-500',
        label: 'Overrun'
      }
    }

    const cfg = indicatorConfig[indicatorState]
    const clampedProgress = Math.min(100, Math.max(0, percentage))
    const issueLogs = getTimeLogsForIssue(issue.issue_id)

    return (
      <div className="space-y-1.5 min-w-[145px]">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-text-primary font-bold">
            {actual} <span className="text-text-muted font-normal">/ {estimated} hrs</span>
          </span>
          <span className={`text-[10px] font-semibold flex items-center gap-1 ${cfg.color}`}>
            <span>{cfg.icon}</span>
            <span>{cfg.label}</span>
          </span>
        </div>

        {/* Mini progress indicator */}
        <div className="w-full h-1.5 bg-surface-secondary rounded-full overflow-hidden border border-border/40">
          <div
            className={`h-full rounded-full transition-all duration-300 ${cfg.bg}`}
            style={{ width: `${clampedProgress}%` }}
          />
        </div>

        {/* Incremental Log Actions Bar */}
        <div className="flex items-center justify-between pt-0.5">
          <button
            type="button"
            title="Log work hours incrementally to this issue"
            onClick={(e) => {
              e.stopPropagation()
              onLogHours?.(issue)
            }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-accent/10 hover:bg-accent hover:text-white text-accent transition-colors border border-accent/25"
          >
            <Plus className="w-2.5 h-2.5" />
            <span>+ Add Hours</span>
          </button>

          <button
            type="button"
            title="View complete time log history"
            onClick={(e) => {
              e.stopPropagation()
              onViewTimeLogs?.(issue)
            }}
            className="text-[10px] text-text-muted hover:text-accent hover:underline font-mono"
          >
            {issueLogs.length > 0 ? `${issueLogs.length} logs` : `${percentage}%`}
          </button>
        </div>
      </div>
    )
  }

  // Render Remaining Hrs Cell (Requirement 9: Remaining Hrs = Estimated - Actual, If Overrun: Overrun: 2 Hrs)
  const renderRemainingCell = (estimated: number, actual: number) => {
    const { isOverrun, remainingHrs, overrunHrs } = calculateEffort(estimated, actual)

    if (isOverrun) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-400 font-bold text-xs whitespace-nowrap">
          <Flame className="w-3 h-3 text-rose-500" />
          Overrun: {overrunHrs} Hrs
        </span>
      )
    }

    return (
      <span className="font-semibold text-text-primary text-xs">
        {remainingHrs} Hrs
      </span>
    )
  }

  return (
    <div id="support-issue-table-section" className="space-y-4">
      {/* ── Drill-down Banner Alert if active ──────────────────────────────── */}
      {drillDownTarget && (
        <div className="p-3 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-between text-xs text-text-primary">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-accent" />
            <span>
              Drill-down active for product: <strong className="text-accent">{drillDownTarget}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setDrillDownTarget(null)
              setFilters({ selectedProductId: 'all' })
            }}
            className="text-accent hover:underline font-medium text-xs"
          >
            Show All Products
          </button>
        </div>
      )}

      {/* ── Table Top Bar with Search & Pagination Controls ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Issue ID, Description, Product, Tester, Comments..."
            value={filters.searchQuery || ''}
            onChange={(e) => setFilters({ searchQuery: e.target.value })}
            className="w-full h-9 pl-9 pr-3 text-xs bg-surface-elevated/80 border border-border/40 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50"
          />
        </div>

        <div className="flex items-center gap-3 self-end sm:self-auto">
          <div className="flex items-center gap-2 text-xs text-text-muted">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="h-8 bg-surface-elevated border border-border/40 rounded-lg px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="text-xs text-text-muted">
            Showing <strong className="text-text-primary">{sortedIssues.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-text-primary">{Math.min(currentPage * pageSize, sortedIssues.length)}</strong> of{' '}
            <strong className="text-text-primary">{sortedIssues.length}</strong>
          </div>
        </div>
      </div>

      {/* ── Support Issue Tracker Main Table ───────────────────────────────── */}
      <GlassCard hoverEffect={false} className="p-0 border border-border/40 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[1100px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-secondary/80 border-b border-border/40 text-[11px] uppercase tracking-wider text-text-muted font-semibold">
                <th
                  onClick={() => handleSort('sl_no')}
                  className="py-3.5 px-3 text-center cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>Sl. No.</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted/60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('product_name')}
                  className="py-3.5 px-3.5 cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Product</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted/60" />
                  </div>
                </th>
                <th
                  onClick={() => handleSort('issue_id')}
                  className="py-3.5 px-3 cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Support Issue ID</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted/60" />
                  </div>
                </th>
                <th className="py-3.5 px-4 min-w-[240px]">
                  Support Issue Description
                </th>
                <th
                  onClick={() => handleSort('received_date')}
                  className="py-3.5 px-3 cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Received Date</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted/60" />
                  </div>
                </th>
                <th className="py-3.5 px-3 whitespace-nowrap">Start Date</th>
                <th className="py-3.5 px-3 whitespace-nowrap">Finish Date</th>
                <th
                  onClick={() => handleSort('tester_name')}
                  className="py-3.5 px-3 cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap"
                >
                  <div className="flex items-center gap-1">
                    <span>Who's Testing</span>
                    <ArrowUpDown className="w-3 h-3 text-text-muted/60" />
                  </div>
                </th>
                <th className="py-3.5 px-3 text-right whitespace-nowrap">Estimation Hrs</th>
                <th className="py-3.5 px-3.5 text-center min-w-[130px] whitespace-nowrap">Actual Hrs / Effort</th>
                <th className="py-3.5 px-3.5 text-center whitespace-nowrap">Remaining Hrs</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">Testing Status</th>
                <th className="py-3.5 px-4 min-w-[180px]">Comments</th>
                <th className="py-3.5 px-3 text-center whitespace-nowrap">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 font-normal">
              {paginatedIssues.map((issue, index) => {
                const autoSlNo = (currentPage - 1) * pageSize + index + 1

                return (
                  <tr
                    key={issue.id}
                    className="group transition-colors duration-150 cursor-default hover:bg-accent/[0.07] dark:hover:bg-accent/[0.12]"
                  >
                    {/* 1. Sl. No. with crisp 3px accent left indicator */}
                    <td className="py-3.5 px-3 text-center font-mono text-xs text-text-muted border-l-[3px] border-l-transparent group-hover:border-l-accent group-hover:text-accent font-medium group-hover:font-semibold transition-colors duration-150 align-middle">
                      {autoSlNo}
                    </td>

                    {/* 2. Product */}
                    <td className="py-3.5 px-3.5 font-medium whitespace-nowrap align-middle">
                      <div className="flex flex-col">
                        <span className="font-semibold text-text-primary text-xs group-hover:text-accent transition-colors duration-150">
                          {issue.product_name}
                        </span>
                        {issue.product_code && (
                          <span className="text-[10px] text-text-muted font-mono">
                            {issue.product_code}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Support Issue ID */}
                    <td className="py-3.5 px-3 font-mono font-bold whitespace-nowrap align-middle">
                      <span className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-accent group-hover:bg-accent/20 group-hover:border-accent/40 transition-colors duration-150 inline-block text-xs">
                        {issue.issue_id}
                      </span>
                    </td>

                    {/* 4. Support Issue Description */}
                    <td
                      className="py-3.5 px-4 text-text-secondary leading-relaxed max-w-sm align-middle text-xs"
                      title={issue.description}
                    >
                      <p className="line-clamp-2">
                        {issue.description}
                      </p>
                    </td>

                    {/* 5. Received Date */}
                    <td className="py-3.5 px-3 text-text-muted font-mono whitespace-nowrap align-middle text-xs">
                      {issue.received_date || '—'}
                    </td>

                    {/* 6. Start Date */}
                    <td className="py-3.5 px-3 text-text-muted font-mono whitespace-nowrap align-middle text-xs">
                      {issue.start_date || '—'}
                    </td>

                    {/* 7. Finish Date */}
                    <td className="py-3.5 px-3 text-text-muted font-mono whitespace-nowrap align-middle text-xs">
                      {issue.finish_date || '—'}
                    </td>

                    {/* 8. Who's Testing */}
                    <td className="py-3.5 px-3 whitespace-nowrap align-middle text-xs">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-accent/15 border border-accent/30 text-accent flex items-center justify-center text-[9px] font-bold">
                          {(issue.tester_name || 'U').slice(0, 1).toUpperCase()}
                        </div>
                        <span className="font-medium text-text-primary">
                          {issue.tester_name ? (issue.tester_name.toLowerCase() === 'unassigned' ? 'Unassigned' : issue.tester_name.toUpperCase()) : 'Unassigned'}
                        </span>
                      </div>
                    </td>

                    {/* 9. Estimation Hrs (With per-record lock indicator and toggle) */}
                    <td className="py-3.5 px-3 text-right whitespace-nowrap align-middle text-xs">
                      <div className="inline-flex items-center justify-end gap-1.5 font-semibold text-text-primary">
                        <span>{issue.estimated_hours} hrs</span>
                        <EstimationLockControl
                          isLocked={issue.estimated_hours_locked}
                          canLock={canLockEst}
                          canUnlock={canUnlockEst}
                          lockedBy={issue.estimated_hours_locked_by}
                          lockedAt={issue.estimated_hours_locked_at ? new Date(issue.estimated_hours_locked_at).toLocaleString() : null}
                          size="xs"
                          onToggleLock={async (shouldLock) => {
                            try {
                              await toggleEstimationLock(issue.id, shouldLock, currentUser)
                              toast({
                                title: shouldLock ? 'Estimation Locked' : 'Estimation Unlocked',
                                description: shouldLock
                                  ? `Estimated hours for ${issue.issue_id} locked at ${issue.estimated_hours} hrs.`
                                  : `Estimated hours for ${issue.issue_id} unlocked for editing.`
                              })
                            } catch (err: any) {
                              toast({
                                title: 'Action Failed',
                                description: err?.message || 'Failed to update estimation lock',
                                variant: 'destructive'
                              })
                            }
                          }}
                        />
                      </div>
                    </td>

                    {/* 10. Actual Hrs & Indicators (Incremental Time-Log) */}
                    <td className="py-3.5 px-3.5 align-middle">
                      {renderEffortCell(issue)}
                    </td>

                    {/* 11. Remaining Hrs */}
                    <td className="py-3.5 px-3.5 text-center align-middle">
                      {renderRemainingCell(issue.estimated_hours, issue.actual_hours)}
                    </td>

                    {/* 12. Testing Status */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap align-middle">
                      {getStatusBadge(issue.testing_status)}
                    </td>

                    {/* 13. Comments */}
                    <td
                      className="py-3.5 px-4 text-text-muted text-[11px] leading-relaxed max-w-xs align-middle"
                      title={issue.comments || undefined}
                    >
                      {issue.comments ? (
                        <p className="line-clamp-2 italic">
                          "{issue.comments}"
                        </p>
                      ) : (
                        <span className="text-text-muted/40">—</span>
                      )}
                    </td>

                    {/* 14. Actions */}
                    <td className="py-3.5 px-3 text-center whitespace-nowrap align-middle">
                      <div className="flex items-center justify-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity duration-150">
                        {canEdit && (
                          <button
                            type="button"
                            title="Edit Support Issue"
                            onClick={() => onEditIssue(issue)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onViewTimeLogs && (
                          <button
                            type="button"
                            title="View Time Log & History"
                            onClick={() => onViewTimeLogs(issue)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canViewHistory && (
                          <button
                            type="button"
                            title="View Audit History"
                            onClick={() => onViewHistory(issue)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-cyan-500 hover:bg-cyan-500/10 transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            title="Delete Support Issue"
                            onClick={() => onDeleteIssue(issue)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}

              {paginatedIssues.length === 0 && (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-text-muted text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-6 h-6 text-text-muted/50" />
                      <p className="font-medium">No support issues found matching the active filters.</p>
                      <button
                        type="button"
                        onClick={() => useSupportTrackerStore.getState().resetFilters()}
                        className="text-accent hover:underline text-xs"
                      >
                        Reset filters to view all issues
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Table Pagination Bar ─────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="p-3.5 border-t border-white/5 flex items-center justify-between text-xs text-text-muted bg-surface/50">
            <div>
              Page <strong className="text-text-primary">{currentPage}</strong> of{' '}
              <strong className="text-text-primary">{totalPages}</strong>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none text-text-primary"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1
                if (
                  pageNum === 1 ||
                  pageNum === totalPages ||
                  (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                ) {
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors ${
                        currentPage === pageNum
                          ? 'bg-accent text-white shadow-xs font-bold'
                          : 'hover:bg-white/5 text-text-muted hover:text-text-primary'
                      }`}
                    >
                      {pageNum}
                    </button>
                  )
                }
                if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                  return <span key={pageNum} className="px-1 text-text-muted">...</span>
                }
                return null
              })}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:pointer-events-none text-text-primary"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </GlassCard>
    </div>
  )
}
