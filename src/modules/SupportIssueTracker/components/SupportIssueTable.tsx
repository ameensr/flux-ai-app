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
import { calculateEffort, DEFAULT_TESTING_STATUSES, DEFAULT_RETESTING_STATUS_OPTIONS } from '../types'

interface Props {
  onEditIssue: (issue: SupportIssue) => void
  onDeleteIssue: (issue: SupportIssue) => void
  onViewHistory: (issue: SupportIssue) => void
  onLogHours?: (issue: SupportIssue) => void
  onViewTimeLogs?: (issue: SupportIssue) => void
  onBulkDelete?: (ids: string[]) => void
}

export function SupportIssueTable({
  onEditIssue, onDeleteIssue, onViewHistory, onLogHours, onViewTimeLogs, onBulkDelete
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
    getFilteredIssues, filters, setFilters, dropdownConfigs,
    drillDownTarget, setDrillDownTarget, getTimeLogsForIssue, toggleEstimationLock
  } = useSupportTrackerStore()

  const issues = getFilteredIssues()

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const prevIssueIdsRef = useRef<string>('')
  useEffect(() => {
    const key = issues.map(i => i.id).join(',')
    if (key !== prevIssueIdsRef.current) {
      setSelectedIds(new Set())
      prevIssueIdsRef.current = key
    }
  }, [issues])

  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortField, setSortField] = useState<keyof SupportIssue>('sl_no')
  const [sortAsc, setSortAsc] = useState(true)

  const sortedIssues = useMemo(() => {
    return [...issues].sort((a, b) => {
      const aVal = a[sortField] ?? ''
      const bVal = b[sortField] ?? ''
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortAsc ? aVal - bVal : bVal - aVal
      return sortAsc ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal))
    })
  }, [issues, sortField, sortAsc])

  const totalPages = Math.max(1, Math.ceil(sortedIssues.length / pageSize))
  const paginatedIssues = useMemo(() => {
    const from = (currentPage - 1) * pageSize
    return sortedIssues.slice(from, from + pageSize)
  }, [sortedIssues, currentPage, pageSize])

  useEffect(() => { setCurrentPage(1) }, [issues.length])

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
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const handleSort = (field: keyof SupportIssue) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(true) }
  }
  const renderSortIndicator = (field: keyof SupportIssue) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-text-muted/50 group-hover/th:text-text-muted transition-colors" />
    return sortAsc ? <ChevronUp className="w-3.5 h-3.5 text-accent font-bold" /> : <ChevronDown className="w-3.5 h-3.5 text-accent font-bold" />
  }

  const getStatusBadge = (statusName: string) => {
    const config = dropdownConfigs.testing_status.find(s => s.value === statusName)
    const fallback = DEFAULT_TESTING_STATUSES.find(s => s.value === statusName)
    const color = config?.color || fallback?.color || '#94a3b8'
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-xs"
        style={{ backgroundColor: `${color}18`, borderColor: `${color}40`, color }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        {statusName}
      </span>
    )
  }

  const getRetestingBadge = (statusName: string) => {
    const config = dropdownConfigs.retesting_status?.find(s => s.value.toLowerCase() === (statusName || '').toLowerCase())
    const fallback = DEFAULT_RETESTING_STATUS_OPTIONS.find(s => s.value.toLowerCase() === (statusName || '').toLowerCase())
    const color = config?.color || fallback?.color || '#6b7280'
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border"
        style={{ backgroundColor: `${color}15`, borderColor: `${color}35`, color }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        {statusName || 'Not Required'}
      </span>
    )
  }

  const renderEffortCell = (issue: SupportIssue) => {
    const estimated = Number(issue.estimated_hours) || 0
    const actual = Number(issue.actual_hours) || 0
    const { percentage, indicatorState } = calculateEffort(estimated, actual)
    const cfgMap: Record<EffortIndicatorState, { iconColor: string; textColor: string; barColor: string; label: string }> = {
      on_track: { iconColor: 'bg-emerald-500', textColor: 'text-emerald-500', barColor: 'bg-emerald-500', label: 'On Track' },
      attention: { iconColor: 'bg-amber-500', textColor: 'text-amber-500', barColor: 'bg-amber-500', label: 'Attention' },
      overrun: { iconColor: 'bg-rose-500', textColor: 'text-rose-500', barColor: 'bg-rose-500', label: 'Overrun' }
    }
    const cfg = cfgMap[indicatorState]
    const clampedProgress = Math.min(100, Math.max(0, percentage))
    const issueLogs = getTimeLogsForIssue(issue.issue_id)
    return (
      <div className="space-y-1.5 min-w-[140px]">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-text-primary font-bold font-mono">{actual} <span className="text-text-muted font-normal font-sans">/ {estimated}h</span></span>
          <span className={`text-[10px] font-semibold flex items-center gap-1 ${cfg.textColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${cfg.iconColor}`} />{cfg.label}
          </span>
        </div>
        <div className="w-full h-1.5 bg-surface-secondary rounded-full overflow-hidden border border-border/50">
          <div className={`h-full rounded-full transition-all duration-300 ${cfg.barColor}`} style={{ width: `${clampedProgress}%` }} />
        </div>
        <div className="flex items-center justify-between pt-0.5">
          <button type="button" title="Log work hours" onClick={(e) => { e.stopPropagation(); onLogHours?.(issue) }}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-accent/10 hover:bg-accent hover:text-white text-accent transition-colors border border-accent/25 cursor-pointer">
            <Plus className="w-2.5 h-2.5" /><span>Add Hours</span>
          </button>
          <button type="button" title="View time logs" onClick={(e) => { e.stopPropagation(); onViewTimeLogs?.(issue) }}
            className="text-[10px] text-text-muted hover:text-accent hover:underline font-mono cursor-pointer">
            {issueLogs.length > 0 ? `${issueLogs.length} logs` : `${percentage}%`}
          </button>
        </div>
      </div>
    )
  }

  const colCount = canDelete ? 22 : 21

  return (
    <div id="support-issue-table-section" className="space-y-3.5">
      {drillDownTarget && (
        <div className="p-3 px-4 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-between text-xs text-text-primary shadow-xs">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-accent" />
            <span>Product filter active: <strong className="text-accent font-semibold">{drillDownTarget}</strong></span>
          </div>
          <button type="button" onClick={() => { setDrillDownTarget(null); setFilters({ selectedProductId: 'all' }) }}
            className="text-accent hover:underline font-semibold text-xs cursor-pointer">Show All Products</button>
        </div>
      )}

      {canDelete && selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs shadow-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="text-rose-300 font-semibold">{selectedIds.size} {selectedIds.size === 1 ? 'issue' : 'issues'} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setSelectedIds(new Set())}
              className="h-7 px-3 rounded-lg border border-border/60 bg-surface/70 text-text-muted hover:text-text-primary text-xs transition-colors cursor-pointer">Deselect All</button>
            <button type="button" onClick={() => onBulkDelete?.([...selectedIds])}
              className="h-7 px-3 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95">
              <Trash2 className="w-3.5 h-3.5" /><span>Delete Selected</span>
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input type="text" placeholder="Search by ID, Description, Product, QA Engineer..."
            value={filters.searchQuery || ''} onChange={(e) => setFilters({ searchQuery: e.target.value })}
            className="w-full h-9 pl-9 pr-8 text-xs bg-surface-secondary/70 border border-border/60 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/40 transition-all" />
          {filters.searchQuery && (
            <button type="button" onClick={() => setFilters({ searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-text-muted hover:text-text-primary cursor-pointer">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3.5 self-end sm:self-auto text-xs text-text-muted">
          <div className="flex items-center gap-1.5">
            <span>Rows:</span>
            <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setCurrentPage(1) }}
              className="h-8 bg-surface-secondary/70 border border-border/60 rounded-lg px-2 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent cursor-pointer">
              <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option>
            </select>
          </div>
          <div className="text-text-muted tabular-nums">
            Showing <strong className="text-text-primary font-medium">{sortedIssues.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-text-primary font-medium">{Math.min(currentPage * pageSize, sortedIssues.length)}</strong> of{' '}
            <strong className="text-text-primary font-medium">{sortedIssues.length}</strong>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-surface/80 backdrop-blur-md overflow-hidden shadow-xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[1760px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-secondary/90 border-b border-border/60 text-[11px] uppercase tracking-wider text-text-muted font-semibold sticky top-0 z-10">
                {canDelete && (
                  <th className="py-3 px-3 text-center w-10">
                    <input type="checkbox" checked={allPageSelected}
                      ref={el => { if (el) el.indeterminate = somePageSelected }}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded accent-rose-500 cursor-pointer" />
                  </th>
                )}
                <th onClick={() => handleSort('sl_no')} className="py-3 px-3 text-center cursor-pointer hover:text-text-primary whitespace-nowrap group/th w-14">
                  <div className="flex items-center justify-center gap-1"><span>#</span>{renderSortIndicator('sl_no')}</div>
                </th>
                <th onClick={() => handleSort('product_name')} className="py-3 px-3.5 cursor-pointer hover:text-text-primary whitespace-nowrap group/th min-w-[140px]">
                  <div className="flex items-center gap-1"><span>Product</span>{renderSortIndicator('product_name')}</div>
                </th>
                <th onClick={() => handleSort('issue_id')} className="py-3 px-3 cursor-pointer hover:text-text-primary whitespace-nowrap group/th min-w-[110px]">
                  <div className="flex items-center gap-1"><span>Issue ID</span>{renderSortIndicator('issue_id')}</div>
                </th>
                <th className="py-3 px-4 min-w-[220px]">Description</th>
                <th onClick={() => handleSort('received_date')} className="py-3 px-3 cursor-pointer hover:text-text-primary whitespace-nowrap group/th w-28">
                  <div className="flex items-center gap-1"><span>Received Date</span>{renderSortIndicator('received_date')}</div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap w-24">Received Time</th>
                <th onClick={() => handleSort('tester_name')} className="py-3 px-3 cursor-pointer hover:text-text-primary whitespace-nowrap group/th w-32">
                  <div className="flex items-center gap-1"><span>QA Engineer</span>{renderSortIndicator('tester_name')}</div>
                </th>
                <th className="py-3 px-3 whitespace-nowrap w-28">Is QA Miss?</th>
                <th className="py-3 px-3 text-right whitespace-nowrap w-24">Test Cases</th>
                <th className="py-3 px-3 text-right whitespace-nowrap w-28">Est. (Hrs)</th>
                <th className="py-3 px-3.5 text-center min-w-[150px] whitespace-nowrap">Actual / Effort</th>
                <th className="py-3 px-3 text-right whitespace-nowrap w-28">Remaining Hrs</th>
                <th onClick={() => handleSort('start_date')} className="py-3 px-3 cursor-pointer hover:text-text-primary whitespace-nowrap group/th w-28">
                  <div className="flex items-center gap-1"><span>Start Date</span>{renderSortIndicator('start_date')}</div>
                </th>
                <th onClick={() => handleSort('planned_end_date')} className="py-3 px-3 cursor-pointer hover:text-text-primary whitespace-nowrap group/th w-28">
                  <div className="flex items-center gap-1"><span>Planned End</span>{renderSortIndicator('planned_end_date')}</div>
                </th>
                <th onClick={() => handleSort('actual_end_date')} className="py-3 px-3 cursor-pointer hover:text-text-primary whitespace-nowrap group/th w-28">
                  <div className="flex items-center gap-1"><span>Actual End</span>{renderSortIndicator('actual_end_date')}</div>
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap w-24">Blocked Hrs</th>
                <th className="py-3 px-3 text-center whitespace-nowrap w-32">Status</th>
                <th className="py-3 px-4 min-w-[160px]">Comments</th>
                <th className="py-3 px-3 text-center whitespace-nowrap w-28">Retesting</th>
                <th className="py-3 px-3 text-right whitespace-nowrap w-28">Retest Est.</th>
                <th className="py-3 px-3 text-center whitespace-nowrap w-24">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 font-normal">
              {paginatedIssues.map((issue, index) => {
                const autoSlNo = (currentPage - 1) * pageSize + index + 1
                return (
                  <tr key={issue.id}
                    className={`group transition-colors duration-150 cursor-default hover:bg-accent/[0.04] dark:hover:bg-accent/[0.08] ${selectedIds.has(issue.id) ? 'bg-rose-500/[0.06]' : ''}`}>
                    {canDelete && (
                      <td className="py-3 px-3 text-center align-middle" onClick={e => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(issue.id)} onChange={() => toggleRow(issue.id)}
                          className="w-3.5 h-3.5 rounded accent-rose-500 cursor-pointer" />
                      </td>
                    )}
                    {/* 1. Sl. No. */}
                    <td className="py-3 px-3 text-center font-mono text-xs text-text-muted border-l-[3px] border-l-transparent group-hover:border-l-accent group-hover:text-accent font-medium transition-colors align-middle">{autoSlNo}</td>
                    {/* 2. Product */}
                    <td className="py-3 px-3.5 font-medium whitespace-nowrap align-middle">
                      <div className="flex flex-col">
                        <span className="font-semibold text-text-primary text-xs group-hover:text-accent transition-colors">{issue.product_name}</span>
                        {issue.product_code && <span className="text-[10px] text-text-muted font-mono">{issue.product_code}</span>}
                      </div>
                    </td>
                    {/* 3. Issue ID */}
                    <td className="py-3 px-3 font-mono font-bold whitespace-nowrap align-middle">
                      <span className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/25 text-accent text-xs inline-block">{issue.issue_id}</span>
                    </td>
                    {/* 4. Description */}
                    <td className="py-3 px-4 text-text-secondary leading-relaxed max-w-sm align-middle text-xs" title={issue.description}>
                      <p className="line-clamp-2">{issue.description}</p>
                    </td>
                    {/* 5. Received Date */}
                    <td className="py-3 px-3 text-text-muted font-mono whitespace-nowrap align-middle text-xs">{issue.received_date || '—'}</td>
                    {/* 6. Received Time */}
                    <td className="py-3 px-3 text-text-muted font-mono whitespace-nowrap align-middle text-xs">{issue.received_time || '—'}</td>
                    {/* 7. QA Engineer */}
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
                    {/* 8. Is QA Miss? */}
                    <td className="py-3 px-3 whitespace-nowrap align-middle text-xs">
                      {(() => {
                        const v = issue.is_qa_miss || 'Not Applicable'
                        const colorMap: Record<string, string> = { 'Yes': 'text-rose-400 bg-rose-500/10 border-rose-500/25', 'No': 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25', 'Under Review': 'text-amber-400 bg-amber-500/10 border-amber-500/25', 'Not Applicable': 'text-text-muted bg-surface-secondary border-border/40' }
                        return <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${colorMap[v] || colorMap['Not Applicable']}`}>{v}</span>
                      })()}
                    </td>
                    {/* 9. Test Case Count */}
                    <td className="py-3 px-3 text-right font-mono text-xs text-text-primary align-middle">{issue.test_case_count ?? 0}</td>
                    {/* 10. Estimation (Hrs) */}
                    <td className="py-3 px-3 text-right whitespace-nowrap align-middle text-xs">
                      <div className="inline-flex items-center justify-end gap-1.5 font-semibold text-text-primary">
                        <span className="font-mono tabular-nums">{issue.estimated_hours}h</span>
                        <EstimationLockControl
                          isLocked={issue.estimated_hours_locked} canLock={canLockEst} canUnlock={canUnlockEst}
                          lockedBy={issue.estimated_hours_locked_by}
                          lockedAt={issue.estimated_hours_locked_at ? new Date(issue.estimated_hours_locked_at).toLocaleString() : null}
                          size="xs"
                          onToggleLock={async (shouldLock) => {
                            try {
                              await toggleEstimationLock(issue.id, shouldLock, currentUser)
                              toast({ title: shouldLock ? 'Estimation Locked' : 'Estimation Unlocked' })
                            } catch (err: any) {
                              toast({ title: 'Action Failed', description: err?.message, variant: 'destructive' })
                            }
                          }}
                        />
                      </div>
                    </td>
                    {/* 11. Actual / Effort (Hrs) */}
                    <td className="py-3 px-3.5 align-middle">{renderEffortCell(issue)}</td>
                    {/* 12. Remaining Hrs */}
                    <td className="py-3 px-3 text-right whitespace-nowrap align-middle text-xs">
                      {(() => {
                        const est = Number(issue.estimated_hours) || 0
                        const act = Number(issue.actual_hours) || 0
                        if (act > est) {
                          const overrun = Math.round((act - est) * 100) / 100
                          return (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-500/10 border border-rose-500/25 text-rose-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                              Overrun {overrun}h
                            </span>
                          )
                        }
                        const remaining = Math.round((est - act) * 100) / 100
                        return (
                          <span className={`font-mono font-semibold tabular-nums ${
                            remaining === 0 ? 'text-text-muted' :
                            remaining <= est * 0.25 ? 'text-amber-400' : 'text-emerald-400'
                          }`}>
                            {remaining}h
                          </span>
                        )
                      })()}
                    </td>
                    {/* 13. Actual Start Date */}
                    <td className="py-3 px-3 text-text-muted font-mono whitespace-nowrap align-middle text-xs">{issue.start_date || '—'}</td>
                    {/* 14. Planned End Date */}
                    <td className="py-3 px-3 text-text-muted font-mono whitespace-nowrap align-middle text-xs">{issue.planned_end_date || '—'}</td>
                    {/* 15. Actual End Date */}
                    <td className="py-3 px-3 text-text-muted font-mono whitespace-nowrap align-middle text-xs">{issue.actual_end_date || '—'}</td>
                    {/* 16. Blocked Hours */}
                    <td className="py-3 px-3 text-right font-mono text-xs align-middle">
                      {Number(issue.blocked_hours) > 0
                        ? <span className="text-orange-400 font-semibold">{issue.blocked_hours}h</span>
                        : <span className="text-text-muted/50">0</span>}
                    </td>
                    {/* 17. Status */}
                    <td className="py-3 px-3 text-center whitespace-nowrap align-middle">{getStatusBadge(issue.testing_status)}</td>
                    {/* 18. Comments */}
                    <td className="py-3 px-4 text-text-muted text-[11px] leading-relaxed max-w-xs align-middle" title={issue.comments || undefined}>
                      {issue.comments
                        ? <p className="line-clamp-2 italic text-text-secondary">"{issue.comments}"</p>
                        : <span className="text-text-muted/40">—</span>}
                    </td>
                    {/* 19. Retesting Status */}
                    <td className="py-3 px-3 text-center whitespace-nowrap align-middle">{getRetestingBadge(issue.retesting_status || 'Not Required')}</td>
                    {/* 20. Retesting Estimation (Hrs) */}
                    <td className="py-3 px-3 text-right font-mono text-xs align-middle">
                      {Number(issue.retesting_estimation_hrs) > 0
                        ? <span className="text-cyan-400 font-semibold">{issue.retesting_estimation_hrs}h</span>
                        : <span className="text-text-muted/50">0</span>}
                    </td>
                    {/* Actions */}
                    <td className="py-3 px-3 text-center whitespace-nowrap align-middle">
                      <div className="flex items-center justify-center gap-1">
                        {canEdit && (
                          <button type="button" title="Edit" onClick={() => onEditIssue(issue)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer">
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onViewTimeLogs && (
                          <button type="button" title="Time Logs" onClick={() => onViewTimeLogs(issue)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors cursor-pointer">
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canViewHistory && (
                          <button type="button" title="Audit History" onClick={() => onViewHistory(issue)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer">
                            <History className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button type="button" title="Delete" onClick={() => onDeleteIssue(issue)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer">
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
                  <td colSpan={colCount} className="py-12 text-center text-text-muted text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-7 h-7 text-text-muted/50" />
                      <p className="font-semibold text-text-primary text-sm">No support issues found</p>
                      <p className="text-xs text-text-muted">No records match your active search or filter criteria.</p>
                      <button type="button" onClick={() => useSupportTrackerStore.getState().resetFilters()}
                        className="mt-1 text-accent hover:underline text-xs font-semibold cursor-pointer">Reset filters</button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="p-3 px-4 border-t border-border/50 flex items-center justify-between text-xs text-text-muted bg-surface-secondary/40">
            <div className="tabular-nums">Page <strong className="text-text-primary">{currentPage}</strong> of <strong className="text-text-primary">{totalPages}</strong></div>
            <div className="flex items-center gap-1">
              <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                className="p-1.5 rounded-lg border border-border/60 hover:bg-surface-elevated disabled:opacity-40 disabled:pointer-events-none text-text-primary transition-colors cursor-pointer">
                <ChevronLeft className="w-4 h-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => {
                const pageNum = i + 1
                if (pageNum === 1 || pageNum === totalPages || (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)) {
                  return (
                    <button key={pageNum} type="button" onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-[28px] h-7 rounded-lg text-xs font-medium transition-colors cursor-pointer ${currentPage === pageNum ? 'bg-accent text-white font-bold shadow-xs' : 'hover:bg-surface-elevated text-text-muted hover:text-text-primary'}`}>
                      {pageNum}
                    </button>
                  )
                }
                if (pageNum === currentPage - 2 || pageNum === currentPage + 2) {
                  return <span key={pageNum} className="px-1 text-text-muted">...</span>
                }
                return null
              })}
              <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                className="p-1.5 rounded-lg border border-border/60 hover:bg-surface-elevated disabled:opacity-40 disabled:pointer-events-none text-text-primary transition-colors cursor-pointer">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
