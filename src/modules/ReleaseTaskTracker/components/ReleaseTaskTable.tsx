// src/modules/ReleaseTaskTracker/components/ReleaseTaskTable.tsx
import React, { useState, useMemo, useEffect, useRef } from 'react'
import {
  Search, Edit3, Trash2, Eye, ChevronLeft, ChevronRight,
  ArrowUpDown, ChevronUp, ChevronDown, Plus, Clock, AlertCircle, Flame,
  CheckSquare, History, X
} from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/useAppStore'
import { EstimationLockControl } from '@/components/qa-operations/EstimationLockControl'
import { useReleaseTrackerStore } from '../store'
import type { ReleaseTask, EffortIndicatorState } from '../types'
import { calculateEffort, DEFAULT_TASK_STATUSES, DEFAULT_PRIORITIES } from '../types'

interface Props {
  onViewTask: (task: ReleaseTask) => void
  onEditTask: (task: ReleaseTask) => void
  onDeleteTask: (task: ReleaseTask) => void
  onLogHours: (task: ReleaseTask) => void
  onViewTimeLogs: (task: ReleaseTask) => void
  onViewHistory?: (task: ReleaseTask) => void
  onBulkDelete?: (ids: string[]) => void
}

export function ReleaseTaskTable({
  onViewTask, onEditTask, onDeleteTask, onLogHours, onViewTimeLogs, onViewHistory, onBulkDelete
}: Props) {
  const { toast } = useToast()
  const { user, profile } = useAppStore()
  const currentUser = {
    name: (profile?.full_name || user?.user_metadata?.full_name || user?.email || 'System User') as string,
    id: user?.id
  }

  const { can } = usePermissions()
  const canEdit = can('release-tracker', 'can_edit')
  const canDelete = can('release-tracker', 'can_delete')
  const canViewHistory = can('release-tracker', 'can_view_history')
  const canLockEst = can('release-tracker', 'can_lock_estimated_hours')
  const canUnlockEst = can('release-tracker', 'can_unlock_estimated_hours')

  const {
    getFilteredTasks, filters, setFilters, dropdownConfigs,
    getTimeLogsForTask, drillDownRelease, setDrillDownRelease, toggleEstimationLock
  } = useReleaseTrackerStore()

  // Use total_estimation_hrs for display; fall back to estimated_hours for legacy rows
  const getDisplayEst = (task: ReleaseTask) =>
    Number((task as any).total_estimation_hrs ?? task.estimated_hours) || 0

  const tasks = getFilteredTasks()

  // ── Selection state ──────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const prevTaskIdsRef = useRef<string>('')
  useEffect(() => {
    const key = tasks.map(t => t.id).join(',')
    if (key !== prevTaskIdsRef.current) {
      setSelectedIds(new Set())
      prevTaskIdsRef.current = key
    }
  }, [tasks])

  // ── Pagination & sorting ─────────────────────────────────────────────────
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortField, setSortField] = useState<keyof ReleaseTask>('sl_no')
  const [sortAsc, setSortAsc] = useState(true)

  const prevTaskCountRef = useRef(tasks.length)
  useEffect(() => {
    if (prevTaskCountRef.current !== tasks.length) {
      setCurrentPage(1)
      prevTaskCountRef.current = tasks.length
    }
  }, [tasks.length])

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aVal = a[sortField] ?? ''
      const bVal = b[sortField] ?? ''
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortAsc ? aVal - bVal : bVal - aVal
      return sortAsc ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal))
    })
  }, [tasks, sortField, sortAsc])

  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / pageSize))
  const paginatedTasks = useMemo(() => {
    const from = (currentPage - 1) * pageSize
    return sortedTasks.slice(from, from + pageSize)
  }, [sortedTasks, currentPage, pageSize])

  const handleSort = (field: keyof ReleaseTask) => {
    if (sortField === field) setSortAsc(!sortAsc)
    else { setSortField(field); setSortAsc(true) }
  }

  // Render header sort arrow
  const renderSortIndicator = (field: keyof ReleaseTask) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-text-muted/50 group-hover/th:text-text-muted transition-colors" />
    }
    return sortAsc ? (
      <ChevronUp className="w-3.5 h-3.5 text-accent font-bold" />
    ) : (
      <ChevronDown className="w-3.5 h-3.5 text-accent font-bold" />
    )
  }

  // ── Select-all (current page only) ──────────────────────────────────────
  const pageIds = paginatedTasks.map(t => t.id)
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

  // ── Badges ───────────────────────────────────────────────────────────────
  const getStatusBadge = (statusName: string) => {
    const config = dropdownConfigs.task_status.find(s => s.value === statusName)
    const fallback = DEFAULT_TASK_STATUSES.find(s => s.value === statusName)
    const color = config?.color || fallback?.color || '#94a3b8'
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border shadow-xs transition-all duration-150"
        style={{ backgroundColor: `${color}18`, borderColor: `${color}40`, color }}
      >
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
        {statusName}
      </span>
    )
  }

  const getPriorityBadge = (priorityName: string) => {
    const config = dropdownConfigs.priority.find(p => p.value === priorityName)
    const fallback = DEFAULT_PRIORITIES.find(p => p.value === priorityName)
    const color = config?.color || fallback?.color || '#3b82f6'
    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border font-mono"
        style={{ backgroundColor: `${color}15`, borderColor: `${color}35`, color }}
      >
        {priorityName}
      </span>
    )
  }

  const renderEffortCell = (task: ReleaseTask) => {
    const effort = calculateEffort(getDisplayEst(task), task.actual_hours)
    let textColor = 'text-emerald-500 dark:text-emerald-400'
    let iconColor = 'bg-emerald-500'
    let barColor = 'bg-emerald-500'
    let stateLabel = 'On Track'

    if (effort.indicatorState === 'overrun') {
      textColor = 'text-rose-500 dark:text-rose-400'
      iconColor = 'bg-rose-500'
      barColor = 'bg-rose-500'
      stateLabel = 'Overrun'
    } else if (effort.indicatorState === 'attention') {
      textColor = 'text-amber-500 dark:text-amber-400'
      iconColor = 'bg-amber-500'
      barColor = 'bg-amber-500'
      stateLabel = 'Attention'
    }

    const clampedProgress = Math.min(100, Math.max(0, effort.percentage))
    const taskLogs = getTimeLogsForTask(task.task_id)

    return (
      <div className="space-y-1.5 min-w-[155px]">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-text-primary font-bold font-mono">
            {task.actual_hours} <span className="text-text-muted font-normal font-sans">/ {getDisplayEst(task)}h</span>
          </span>
          <span className={`text-[10px] font-semibold flex items-center gap-1 ${textColor}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${iconColor}`} />
            <span>{stateLabel}</span>
          </span>
        </div>

        {/* Mini progress indicator */}
        <div className="w-full h-1.5 bg-surface-secondary rounded-full overflow-hidden border border-border/50">
          <div
            className={`h-full rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${clampedProgress}%` }}
          />
        </div>

        {/* Incremental Log Actions Bar */}
        <div className="flex items-center justify-between pt-0.5">
          <button
            type="button"
            title="Log work effort to this task"
            onClick={(e) => {
              e.stopPropagation()
              onLogHours(task)
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
              onViewTimeLogs(task)
            }}
            className="text-[10px] text-text-muted hover:text-accent hover:underline font-mono cursor-pointer"
          >
            {taskLogs.length > 0 ? `${taskLogs.length} logs` : `${effort.percentage}%`}
          </button>
        </div>
      </div>
    )
  }

  const renderRemainingCell = (estimated: number | undefined, actual: number) => {
    const est = Number(estimated) || 0
    const act = Number(actual) || 0
    if (act > est) {
      const overrun = Math.round((act - est) * 100) / 100
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-500 dark:text-rose-400 font-bold text-xs whitespace-nowrap">
          <Flame className="w-3 h-3 text-rose-500 shrink-0" />
          <span>Overrun: {overrun}h</span>
        </span>
      )
    }
    const rem = Math.round((est - act) * 100) / 100
    return (
      <span className="font-semibold text-text-primary text-xs font-mono">
        {rem}h
      </span>
    )
  }

  return (
    <div id="release-task-table-section" className="space-y-3.5">
      {/* ── Drill-down Banner ── */}
      {drillDownRelease && (
        <div className="p-3 px-4 rounded-xl bg-accent/10 border border-accent/25 flex items-center justify-between text-xs text-text-primary shadow-xs">
          <div className="flex items-center gap-2">
            <CheckSquare className="w-4 h-4 text-accent" />
            <span>Release filter active: <strong className="text-accent font-semibold">{drillDownRelease}</strong></span>
          </div>
          <button
            type="button"
            onClick={() => { setDrillDownRelease(null); setFilters({ selectedRelease: 'all' }) }}
            className="text-accent hover:underline font-semibold text-xs cursor-pointer"
          >
            Clear Drill-Down
          </button>
        </div>
      )}

      {/* ── Bulk Action Toolbar ── */}
      {canDelete && selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 text-xs shadow-xs animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-400" />
            <span className="text-rose-300 font-semibold">
              {selectedIds.size} {selectedIds.size === 1 ? 'task' : 'tasks'} selected
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
            placeholder="Search by ID, Description, Release, Product, Assignee..."
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
            Showing <strong className="text-text-primary font-medium">{sortedTasks.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-text-primary font-medium">{Math.min(currentPage * pageSize, sortedTasks.length)}</strong> of{' '}
            <strong className="text-text-primary font-medium">{sortedTasks.length}</strong>
          </div>
        </div>
      </div>

      {/* ── Main Release Task Table ───────────────────────────────────────── */}
      <div className="rounded-2xl border border-border/60 bg-surface/80 backdrop-blur-md overflow-hidden shadow-xs">
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[1760px] text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-secondary/90 border-b border-border/60 text-[11px] uppercase tracking-wider text-text-muted font-semibold sticky top-0 z-10">
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
                <th onClick={() => handleSort('sl_no')} className="py-3 px-3 text-center cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap group/th w-12">
                  <div className="flex items-center justify-center gap-1"><span>#</span>{renderSortIndicator('sl_no')}</div>
                </th>
                <th onClick={() => handleSort('product_name')} className="py-3 px-3.5 cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap group/th min-w-[130px]">
                  <div className="flex items-center gap-1"><span>Product</span>{renderSortIndicator('product_name')}</div>
                </th>
                <th onClick={() => handleSort('release_version')} className="py-3 px-3 cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap group/th w-24">
                  <div className="flex items-center gap-1"><span>Release</span>{renderSortIndicator('release_version')}</div>
                </th>
                <th onClick={() => handleSort('task_id')} className="py-3 px-3 cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap group/th min-w-[110px]">
                  <div className="flex items-center gap-1"><span>Task ID</span>{renderSortIndicator('task_id')}</div>
                </th>
                <th className="py-3 px-4 min-w-[220px]">Description</th>
                <th onClick={() => handleSort('assigned_to_name')} className="py-3 px-3 cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap group/th w-32">
                  <div className="flex items-center gap-1"><span>QA Engineer</span>{renderSortIndicator('assigned_to_name')}</div>
                </th>
                <th onClick={() => handleSort('received_date_time')} className="py-3 px-3 cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap group/th w-36">
                  <div className="flex items-center gap-1"><span>Received Date/Time</span>{renderSortIndicator('received_date_time')}</div>
                </th>
                <th onClick={() => handleSort('task_status')} className="py-3 px-3 text-center cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap group/th w-28">
                  <div className="flex items-center justify-center gap-1"><span>Status</span>{renderSortIndicator('task_status')}</div>
                </th>
                <th className="py-3 px-3 text-right whitespace-nowrap w-24">Test Design Est</th>
                <th className="py-3 px-3 text-right whitespace-nowrap w-24">Data Prep Est</th>
                <th className="py-3 px-3 text-right whitespace-nowrap w-28">Func. Testing Est</th>
                <th className="py-3 px-3 text-right whitespace-nowrap w-24">Retesting Est</th>
                <th className="py-3 px-3 text-right whitespace-nowrap w-24 text-accent">Total Est</th>
                <th onClick={() => handleSort('start_date')} className="py-3 px-3 cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap group/th w-28">
                  <div className="flex items-center gap-1"><span>Actual Start</span>{renderSortIndicator('start_date')}</div>
                </th>
                <th className="py-3 px-3.5 text-center min-w-[155px] whitespace-nowrap">Actual / Effort</th>
                <th className="py-3 px-3.5 text-center whitespace-nowrap w-28">Remaining Hrs</th>
                <th onClick={() => handleSort('actual_end_date')} className="py-3 px-3 cursor-pointer hover:text-text-primary transition-colors whitespace-nowrap group/th w-28">
                  <div className="flex items-center gap-1"><span>Actual End</span>{renderSortIndicator('actual_end_date')}</div>
                </th>
                <th className="py-3 px-4 min-w-[160px]">Comments</th>
                <th className="py-3 px-3 text-center whitespace-nowrap w-28">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 font-normal">
              {paginatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={canDelete ? 20 : 19} className="py-12 text-center text-text-muted text-xs">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <AlertCircle className="w-7 h-7 text-text-muted/50" />
                      <p className="font-semibold text-text-primary text-sm">No release tasks found</p>
                      <p className="text-xs text-text-muted">Try adjusting the product or release filters, or click "+ Add Release Task" to create one.</p>
                      <button
                        type="button"
                        onClick={() => useReleaseTrackerStore.getState().resetFilters()}
                        className="mt-1 text-accent hover:underline text-xs font-semibold cursor-pointer"
                      >
                        Reset filters to view all tasks
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTasks.map((task, index) => {
                  const autoSlNo = (currentPage - 1) * pageSize + index + 1
                  const isSelected = selectedIds.has(task.id)

                  return (
                    <tr
                      key={task.id}
                      className={`group transition-colors duration-150 cursor-default hover:bg-accent/[0.04] dark:hover:bg-accent/[0.08] ${
                        isSelected ? 'bg-rose-500/[0.06]' : ''
                      }`}
                    >
                      {canDelete && (
                        <td className="py-3 px-3 text-center align-middle" onClick={e => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRow(task.id)}
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
                          <span className="font-semibold text-text-primary text-xs group-hover:text-accent transition-colors duration-150">{task.product_name}</span>
                          {task.product_code && <span className="text-[10px] text-text-muted font-mono">{task.product_code}</span>}
                        </div>
                      </td>

                      {/* 3. Release */}
                      <td className="py-3 px-3 font-medium whitespace-nowrap align-middle">
                        <span className="px-2 py-0.5 rounded-md bg-surface-secondary border border-border/60 font-mono text-xs text-text-secondary">{task.release_version}</span>
                      </td>

                      {/* 4. Task ID */}
                      <td className="py-3 px-3 font-mono font-bold whitespace-nowrap align-middle">
                        <span className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/25 text-accent text-xs inline-block">{task.task_id}</span>
                      </td>

                      {/* 5. Description */}
                      <td className="py-3 px-4 text-text-secondary leading-relaxed max-w-sm align-middle text-xs" title={task.description}>
                        <p className="line-clamp-2">{task.description}</p>
                      </td>

                      {/* 6. QA Engineer */}
                      <td className="py-3 px-3 whitespace-nowrap align-middle text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-5 h-5 rounded-full bg-accent/15 border border-accent/30 text-accent flex items-center justify-center text-[9px] font-bold">
                            {(task.assigned_to_name || 'U').slice(0, 1).toUpperCase()}
                          </div>
                          <span className="font-medium text-text-primary">{task.assigned_to_name || 'Unassigned'}</span>
                        </div>
                      </td>

                      {/* 7. Received Date/Time */}
                      <td className="py-3 px-3 text-text-muted font-mono whitespace-nowrap align-middle text-xs">
                        {task.received_date_time
                          ? new Date(task.received_date_time).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                          : '—'}
                      </td>

                      {/* 8. Status */}
                      <td className="py-3 px-3 text-center whitespace-nowrap align-middle">
                        {getStatusBadge(task.task_status)}
                      </td>

                      {/* 9. Test Design Est */}
                      <td className="py-3 px-3 text-right font-mono text-xs text-text-secondary align-middle whitespace-nowrap">
                        {Number(task.test_design_est_hrs) || 0}h
                      </td>

                      {/* 10. Data Prep Est */}
                      <td className="py-3 px-3 text-right font-mono text-xs text-text-secondary align-middle whitespace-nowrap">
                        {Number(task.data_prep_est_hrs) || 0}h
                      </td>

                      {/* 11. Functional Testing Est */}
                      <td className="py-3 px-3 text-right font-mono text-xs text-text-secondary align-middle whitespace-nowrap">
                        {Number(task.functional_testing_est_hrs) || 0}h
                      </td>

                      {/* 12. Retesting Est */}
                      <td className="py-3 px-3 text-right font-mono text-xs text-text-secondary align-middle whitespace-nowrap">
                        {Number(task.retesting_est_hrs) || 0}h
                      </td>

                      {/* 13. Total Est (computed, read-only) */}
                      <td className="py-3 px-3 text-right whitespace-nowrap align-middle">
                        <div className="inline-flex items-center justify-end gap-1.5 font-semibold text-text-primary">
                          <span className="font-mono tabular-nums text-accent">{getDisplayEst(task)}h</span>
                          <EstimationLockControl
                            isLocked={task.estimated_hours_locked}
                            canLock={canLockEst}
                            canUnlock={canUnlockEst}
                            lockedBy={task.estimated_hours_locked_by}
                            lockedAt={task.estimated_hours_locked_at ? new Date(task.estimated_hours_locked_at).toLocaleString() : null}
                            size="xs"
                            onToggleLock={async (shouldLock) => {
                              try {
                                await toggleEstimationLock(task.id, shouldLock, currentUser)
                                toast({
                                  title: shouldLock ? 'Estimation Locked' : 'Estimation Unlocked',
                                  description: shouldLock
                                    ? `Estimated hours for ${task.task_id} locked at ${getDisplayEst(task)}h.`
                                    : `Estimated hours for ${task.task_id} unlocked.`
                                })
                              } catch (err: any) {
                                toast({ title: 'Action Failed', description: err?.message || 'Failed to update estimation lock', variant: 'destructive' })
                              }
                            }}
                          />
                        </div>
                      </td>

                      {/* 14. Actual Start Date */}
                      <td className="py-3 px-3 text-text-muted font-mono whitespace-nowrap align-middle text-xs">
                        {task.start_date || '—'}
                      </td>

                      {/* 15. Actual / Effort */}
                      <td className="py-3 px-3.5 align-middle">
                        {renderEffortCell(task)}
                      </td>

                      {/* 16. Remaining Hrs */}
                      <td className="py-3 px-3.5 text-center align-middle">
                        {renderRemainingCell(getDisplayEst(task), task.actual_hours)}
                      </td>

                      {/* 17. Actual End Date */}
                      <td className="py-3 px-3 text-text-muted font-mono whitespace-nowrap align-middle text-xs">
                        {task.actual_end_date || '—'}
                      </td>

                      {/* 18. Comments */}
                      <td className="py-3 px-4 text-text-muted text-[11px] leading-relaxed max-w-xs align-middle" title={task.comments || undefined}>
                        {task.comments ? (
                          <p className="line-clamp-2 italic text-text-secondary">"{task.comments}"</p>
                        ) : (
                          <span className="text-text-muted/40">—</span>
                        )}
                      </td>

                      {/* 16. Actions */}
                      <td className="py-3 px-3 text-center whitespace-nowrap align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            title="View Release Task"
                            onClick={() => onViewTask(task)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-colors cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {canEdit && (
                            <button
                              type="button"
                              title="Edit Release Task"
                              onClick={() => onEditTask(task)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-blue-400 hover:bg-blue-500/10 transition-colors cursor-pointer"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            title="View Time Logs"
                            onClick={() => onViewTimeLogs(task)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-purple-400 hover:bg-purple-500/10 transition-colors cursor-pointer"
                          >
                            <Clock className="w-3.5 h-3.5" />
                          </button>
                          {canViewHistory && onViewHistory && (
                            <button
                              type="button"
                              title="View Audit History"
                              onClick={() => onViewHistory(task)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors cursor-pointer"
                            >
                              <History className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              title="Delete Release Task"
                              onClick={() => onDeleteTask(task)}
                              className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })
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
