import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  Search, Edit3, Trash2, History, ChevronLeft, ChevronRight,
  AlertCircle, Clock, Flame, Filter,
  ArrowUpDown, ChevronUp, ChevronDown, Plus, X
} from 'lucide-react'
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
  onBulkDelete?: (ids: string[]) => void
}

export function SupportIssueTable({
  onEditIssue,
  onDeleteIssue,
  onViewHistory,
  onLogHours,
  onViewTimeLogs,
  onBulkDelete
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

  // ── Selection state ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Clear selection when filters/data change
  const prevIssueIdsRef = useRef<string>('')
  useEffect(() => {
    const key = issues.map(i => i.id).join(',')
    if (key !== prevIssueIdsRef.current) {
      setSelectedIds(new Set())
      prevIssueIdsRef.current = key
    }
  }, [issues])

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

  // Reset page when filter changes
  useEffect(() => { setCurrentPage(1) }, [issues.length])

  // ── Select-all checkbox state (current page only) ────────────────────────
  const pageIds = paginatedIssues.map(i => i.id)
  const selectedOnPage = pageIds.filter(id => selectedIds.has(id))
  const allPageSelected = pageIds.length > 0 && selectedOnPage.length === pageIds.length
  const somePageSelected = selectedOnPage.length > 0 && !allPageSelected

  const toggleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(prev => { const n = new Set(prev); pageIds.forEach(id => n.delete(id)); return n })
    } else {
      setSelectedIds(prev => { const n = new Set(prev); pageIds.forEach(id => n.add(id)); return n })
    }
  }

  const toggleRow = (id: string) => {
    setSelectedIds(prev => {
      const n = new Set(prev)
      n.has(id) ? n.delete(id) : n.add(id)
      return n
    })
  }

  const handleSort = (field: keyof SupportIssue) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(true) }
  }

  // Render header sort arrow
  const renderSortIndicator = (field: keyof SupportIssue) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-text-muted/50 group-hover/th:text-text-muted transition-colors" />
    }
    return sortAsc ? (
      <ChevronUp className="w-3.5 h-3.5 text-accent font-bold" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-accent font-bold" />
    )
  }

  // Get status color / badge class
  const getStatusBadge = (statusName: string) => {
    const config = dropdownConfigs.testing_status.find(s => s.value === statusName)
    const fallback = DEFAULT_TESTING_STATUSES.find(s => s.value === statusName)
    const color = config?.color || fallback?.color || '#94a3b8'

    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-xs transition-all duration-150"
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
    const { percentage, indicatorState } = calculateEffort(estimated, actual)

    const indicatorConfig: Record<EffortIndicatorState, { iconColor: string; textColor: string; barColor: string; label: string }> = {
      on_track: {
        iconColor: 'bg-emerald-500',
        textColor: 'text-emerald-500 dark:text-emerald-400',
        barColor: 'bg-emerald-500',
        label: 'On Track'
      },
      attention: {
        iconColor: 'bg-amber-500',
        textColor: 'text-amber-500 dark:text-amber-400',
        barColor: 'bg-amber-500',
        label: 'Attention'
      },
      overrun: {
        iconColor: 'bg-rose-500',
        textColor: 'text-rose-500 dark:text-rose-400',
        barColor: 'bg-rose-500',
        label: 'Overrun'
      }
    }

    const cfg = indicatorConfig[indicatorState]
    const clampedProgress = Math.min(100, Math.max(0, percentage))
    const issueLogs = getTimeLogsForIssue(issue.issue_id)

    return (
      <div className="space-y-1.5 min-w-[155px]">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-text-primary font-bold font-mono">
            {actual} <span className="text-text-muted font-normal font-sans">/ {estimated}h</span>
          </span>
          <span className={`text-[10px] font-semibold flex items-center gap-1 ${cfg.textColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.iconColor}`} />
            <span>{cfg.label}</span>
          </span>
        </div>

        {/* Mini progress indicator */}
        <div className="w-full h-1.5 bg-surface-secondary rounded-full overflow-hidden border border-border/50">
          <div
            className={`h-full rounded-full transition-all duration-300 ${cfg.barColor}`}
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
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-accent/10 hover:bg-accent hover:text-white text-accent transition-colors border border-accent/25 cursor-pointer"
          >
            <Plus className="w-2.5 h-2.5" />
            <span>Add Hours</span>
          </button>

          <button
            type="button"
            title="View complete time log history"
            onClick={(e) => {
              e.stopPropagation()
              onViewTimeLogs?.(issue)
            }}
            className="text-[10px] text-text-muted hover:text-accent hover:underline font-mono cursor-pointer"
          >
            {issueLogs.length > 0 ? `${issueLogs.length} logs` : `${percentage}%`}
          </button>
        </div>
      </div>
    )
  }

  // Render Remaining Hrs Cell
  const renderRemainingCell = (estimated: number, actual: number) => {
    const { isOverrun, remainingHrs, overrunHrs } = calculateEffort(estimated, actual)

    if (isOverrun) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-400 font-bold text-xs whitespace-nowrap">
          <Flame className="w-3 h-3 text-rose-500 shrink-0" />
          <span>Overrun: {overrunHrs}h</span>
        </span>
      )
    }

    return (
      <span className="font-semibold text-text-primary text-xs font-mono">
        {remainingHrs}h
      </span>
    )
  }

  return (
    <div id="support-issue-table-section" className="space-y-3.5">
      {/* ── Drill-down Banner ── */}
      {drillDownTarget && (
        <div className="p-3 px-4 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-between text-xs text-text-primary shadow-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-accent" />
            <span>Product filter active: <strong className="text-accent font-semibold">{drillDownTarget}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => { setDrillDownTarget(null); setFilters({ selectedProductId: 'all' }) }}
            className="text-accent hover:underline font-semibold text-xs cursor-pointer"
          >
            Show All Products
          </button>
        </div>
      )}

      {/* ── Bulk Action Toolbar ── */}
      {canDelete && selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs shadow-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="text-rose-300 font-semibold">
              {selectedIds.size} {selectedIds.size === 1 ? 'issue' : 'issues'} selected
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="h-7 px-3 rounded-lg border border-border/60 bg-surface/70 text-text-muted hover:text-text-primary text-xs transition-colors cursor-pointer"
            >
              Deselect All
            </button>
            <button
              type="button"
              onClick={() => onBulkDelete?.([...selectedIds])}
              className="h-7 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Table Top Bar with Search & Pagination Controls ────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by ID, Description, Product, Tester, Comments..."
            value={filters.searchQuery || ''}
            onChange={(e) => setFilters({ searchQuery: e.target.value })}
            className="w-full h-9 pl-9 pr-8 text-xs bg-surface-secondary/70 border border-border/60 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => setFilters({ searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text-primary cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-3.5 self-end sm:self-auto text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <span>Rows:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="h-8 bg-surface-secondary/70 border border-border/60 rounded-lg px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>

          <div className="text-text-muted tabular-nums">
            Showing <strong className="text-text-primary font-medium">{sortedIssues.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-text-primary font-medium">{Math.min(currentPage * pageSize, sortedIssues.length)}</strong> of{' '}
            <strong className="text-text-primary font-medium">{sortedIssues.length}</strong>
          </div>
        </div>
      </div>

      {/* ── Support Issue Tracker Main Table ───────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-surface/80 backdrop-blur-md overflow-hidden shadow-xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[1150px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-secondary/90 border-b border-border/60 text-[11px] uppercase tracking-wider text-text-muted font-semibold sticky top-0 z-10">
                {/* Checkbox column — only shown when user can delete */}
                {canDelete && (
                  <th className="py-3 px-3 text-center w-10">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      ref={el => { if (el) el.indeterminate = somePageSelected }}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded accent-rose-500 cursor-pointer"
                      title="Select all on this page"
                    />
                  </th>
                )}
                <th
                  onClick={() => handleSort('sl_no')}
                  className="py-3 px-3 text-center cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap group/th w-16"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>#</span>
                    {renderSortIndicator('sl_no')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('product_name')}
                  className="py-3 px-3.5 cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap group/th min-w-[150px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Product</span>
                    {renderSortIndicator('product_name')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('issue_id')}
                  className="py-3 px-3 cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap group/th min-w-[130px]"
                >
                  <div className="flex items-center gap-1">
                    <span>Issue ID</span>
                    {renderSortIndicator('issue_id')}
                  </div>
                </th>
                <th className="py-3 px-4 min-w-[240px]">
                  Description
                </th>
                <th
                  onClick={() => handleSort('received_date')}
                  className="py-3 px-3 cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap group/th w-28"
                >
                  <div className="flex items-center gap-1">
                    <span>Received</span>
                    {renderSortIndicator('received_date')}
                  </div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap w-28">Start Date</th>
                <th className="py-3 px-3 whitespace-nowrap w-28">Finish Date</th>
                <th
                  onClick={() => handleSort('tester_name')}
                  className="py-3 px-3 cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap group/th w-36"
                >
                  <div className="flex items-center gap-1">
                    <span>Who's Testing</span>
                    {renderSortIndicator('tester_name')}
                  </div>
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap w-32">Est. Hrs</th>
                <th className="py-3 px-3.5 text-center min-w-[155px] whitespace-nowrap">Actual / Effort</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap w-32">Remaining</th>
                <th className="py-3 px-3 text-center whitespace-nowrap w-32">Status</th>
                <th className="py-3 px-4 min-w-[180px]">Comments</th>
                <th className="py-3 px-3 text-center whitespace-nowrap w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 font-normal">
              {paginatedIssues.map((issue, index) => {
                const autoSlNo = (currentPage - 1) * pageSize + index + 1

                return (
                  <tr
                    key={issue.id}
                    className={`group transition-colors duration-150 cursor-default hover:bg-accent/[0.04] dark:hover:bg-accent/[0.08] ${
                      selectedIds.has(issue.id) ? 'bg-rose-500/[0.06]' : ''
                    }`}
                  >
                    {/* Checkbox cell */}
                    {canDelete && (
                      <td className="py-3 px-3 text-center align-middle" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(issue.id)}
                          onChange={() => toggleRow(issue.id)}
                          className="w-3.5 h-3.5 rounded accent-rose-500 cursor-pointer"
                        />
                      </td>
                    )}
                    {/* 1. Sl. No. */}
                    <td className="py-3 px-3 text-center font-mono text-xs text-text-muted border-l-[3px] border-l-transparent group-hover:border-l-accent group-hover:text-accent font-medium transition-colors duration-150 align-middle">
                      {autoSlNo}
                    </td>

                    {/* 2. Product */}
                    <td className="py-3 px-3.5 font-medium whitespace-nowrap align-middle">
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
                    <td className="py-3 px-3 font-mono font-bold whitespace-nowrap align-middle">
                      <span className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/25 text-accent text-xs inline-block">
                        {issue.issue_id}
                      </span>
                    </td>

                    {/* 4. Support Issue Description */}
                    <td
                      className="py-3 px-4 text-text-secondary leading-relaxed max-w-sm align-middle text-xs"
                      title={issue.description}
                    >
                      <p className="line-clamp-2">
                        {issue.description}
                      </p>
                    </td>

                    {/* 5. Received Date */}
                    <td className="py-3 px-3 text-text-muted font-mono whitespace-nowrap align-middle text-xs">
                      {issue.received_date || '—'}
                    </td>

                    {/* 6. Start Date */}
                    <td className="py-3 px-3 text-text-muted font-mono whitespace-nowrap align-middle text-xs">
                      {issue.start_date || '—'}
                    </td>

                    {/* 7. Finish Date */}
                    <td className="py-3 px-3 text-text-muted font-mono whitespace-nowrap align-middle text-xs">
                      {issue.finish_date || '—'}
                    </td>

                    {/* 8. Who's Testing */}
                    <td className="py-3 px-3 whitespace-nowrap align-middle text-xs">
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
                    <td className="py-3 px-3 text-right whitespace-nowrap align-middle text-xs">
                      <div className="inline-flex items-center justify-end gap-1.5 font-semibold text-text-primary">
                        <span className="font-mono tabular-nums">{issue.estimated_hours}h</span>
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

                    {/* 10. Actual Hrs & Indicators */}
                    <td className="py-3 px-3.5 align-middle">
                      {renderEffortCell(issue)}
                    </td>

                    {/* 11. Remaining Hrs */}
                    <td className="py-3 px-3.5 text-center align-middle">
                      {renderRemainingCell(issue.estimated_hours, issue.actual_hours)}
                    </td>

                    {/* 12. Testing Status */}
                    <td className="py-3 px-3 text-center whitespace-nowrap align-middle">
                      {getStatusBadge(issue.testing_status)}
                    </td>

                    {/* 13. Comments */}
                    <td
                      className="py-3 px-4 text-text-muted text-[11px] leading-relaxed max-w-xs align-middle"
                      title={issue.comments || undefined}
                    >
                      {issue.comments ? (
                        <p className="line-clamp-2 italic text-text-secondary">
                          "{issue.comments}"
                        </p>
                      ) : (
                        <span className="text-text-muted/40">—</span>
                      )}
                    </td>

                    {/* 14. Actions */}
                    <td className="py-3 px-3 text-center whitespace-nowrap align-middle">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                          <button
                            type="button"
                            title="Edit Support Issue"
                            onClick={() => onEditIssue(issue)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {onViewTimeLogs && (
                          <button
                            type="button"
                            title="View Time Log & History"
                            onClick={() => onViewTimeLogs(issue)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canViewHistory && (
                          <button
                            type="button"
                            title="View Audit History"
                            onClick={() => onViewHistory(issue)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {canDelete && (
                          <button
                            type="button"
                            title="Delete Support Issue"
                            onClick={() => onDeleteIssue(issue)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
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
                  <td colSpan={canDelete ? 15 : 14} className="py-12 text-center text-text-muted text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-7 h-7 text-text-muted/50" />
                      <p className="font-semibold text-text-primary text-sm">No support issues found</p>
                      <p className="text-xs text-text-muted">No records match your active search or filter criteria.</p>
                      <button
                        type="button"
                        onClick={() => useSupportTrackerStore.getState().resetFilters()}
                        className="mt-1 text-accent hover:underline text-xs font-semibold cursor-pointer"
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
          <div className="p-3 px-4 border-t border-border/50 flex items-center justify-between text-xs text-text-muted bg-surface-secondary/40">
            <div className="tabular-nums">
              Page <strong className="text-text-primary">{currentPage}</strong> of{' '}
              <strong className="text-text-primary">{totalPages}</strong>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg border border-border/60 hover:bg-surface-elevated disabled:opacity-40 disabled:pointer-events-none text-text-primary transition-colors cursor-pointer"
                title="Previous page"
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
                      className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        currentPage === pageNum
                          ? 'bg-accent text-white font-bold shadow-xs'
                          : 'hover:bg-surface-elevated text-text-muted hover:text-text-primary'
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
                className="p-1.5 rounded-lg border border-border/60 hover:bg-surface-elevated disabled:opacity-40 disabled:pointer-events-none text-text-primary transition-colors cursor-pointer"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
