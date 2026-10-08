// src/modules/ReleaseTaskTracker/components/ReleaseTaskTable.tsx
// Main Release Task Table implementing the 16 required columns, effort indicators, and actions.

import React, { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Search, Edit3, Trash2, Eye, ChevronLeft, ChevronRight,
  ArrowUpDown, Plus, Clock, CheckCircle2, AlertCircle, Flame,
  FileSpreadsheet, Filter, CheckSquare, History
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
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
}

export function ReleaseTaskTable({
  onViewTask,
  onEditTask,
  onDeleteTask,
  onLogHours,
  onViewTimeLogs,
  onViewHistory
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
    getFilteredTasks,
    filters,
    setFilters,
    dropdownConfigs,
    getTimeLogsForTask,
    drillDownRelease,
    setDrillDownRelease,
    toggleEstimationLock
  } = useReleaseTrackerStore()

  const tasks = getFilteredTasks()

  // Pagination & sorting
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortField, setSortField] = useState<keyof ReleaseTask>('sl_no')
  const [sortAsc, setSortAsc] = useState(true)

  // Sort tasks
  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aVal = a[sortField] ?? ''
      const bVal = b[sortField] ?? ''
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal
      }
      return sortAsc
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })
  }, [tasks, sortField, sortAsc])

  // Pagination
  const totalPages = Math.max(1, Math.ceil(sortedTasks.length / pageSize))
  const paginatedTasks = useMemo(() => {
    const from = (currentPage - 1) * pageSize
    return sortedTasks.slice(from, from + pageSize)
  }, [sortedTasks, currentPage, pageSize])

  const handleSort = (field: keyof ReleaseTask) => {
    if (sortField === field) {
      setSortAsc(!sortAsc)
    } else {
      setSortField(field)
      setSortAsc(true)
    }
  }

  // Get status badge
  const getStatusBadge = (statusName: string) => {
    const config = dropdownConfigs.task_status.find(s => s.value === statusName)
    const fallback = DEFAULT_TASK_STATUSES.find(s => s.value === statusName)
    const color = config?.color || fallback?.color || '#94a3b8'

    return (
      <span
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shadow-xs group-hover:brightness-110 transition-all duration-150"
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

  // Get priority badge
  const getPriorityBadge = (priorityName: string) => {
    const config = dropdownConfigs.priority.find(p => p.value === priorityName)
    const fallback = DEFAULT_PRIORITIES.find(p => p.value === priorityName)
    const color = config?.color || fallback?.color || '#3b82f6'

    return (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border"
        style={{
          backgroundColor: `${color}15`,
          borderColor: `${color}35`,
          color: color
        }}
      >
        {priorityName}
      </span>
    )
  }

  // Render Effort cell with Green / Yellow / Red indicator & progress
  const renderEffortCell = (task: ReleaseTask) => {
    const effort = calculateEffort(task.estimated_hours, task.actual_hours)
    const taskLogs = getTimeLogsForTask(task.task_id)

    let badgeColor = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
    let stateLabel = 'On Track'
    let barColor = 'bg-emerald-500'

    if (effort.indicatorState === 'overrun') {
      badgeColor = 'bg-rose-500/15 text-rose-400 border-rose-500/30'
      stateLabel = 'Overrun'
      barColor = 'bg-rose-500'
    } else if (effort.indicatorState === 'attention') {
      badgeColor = 'bg-amber-500/15 text-amber-400 border-amber-500/30'
      stateLabel = 'Attention'
      barColor = 'bg-amber-500'
    }

    return (
      <div className="flex flex-col items-center gap-1 min-w-[130px]">
        <div className="flex items-center justify-between w-full">
          <button
            type="button"
            title="View Cumulative Time Logs"
            onClick={() => onViewTimeLogs(task)}
            className="font-bold text-xs font-mono text-purple-300 hover:text-purple-200 hover:underline flex items-center gap-1"
          >
            <Clock className="w-3 h-3 text-purple-400" />
            {task.actual_hours} hrs
          </button>
          <span className={`text-[10px] px-1.5 py-0.2 rounded border font-semibold ${badgeColor}`}>
            {stateLabel}
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div
            className={`h-full rounded-full ${barColor} transition-all duration-300`}
            style={{ width: `${Math.min(100, effort.percentage)}%` }}
          />
        </div>

        <div className="flex items-center justify-between w-full text-[10px] text-text-muted">
          <span>{effort.percentage}%</span>
          <button
            type="button"
            onClick={() => onLogHours(task)}
            title="Log work effort to this task"
            className="text-accent hover:text-accent-hover font-semibold hover:underline flex items-center gap-0.5"
          >
            <Plus className="w-2.5 h-2.5" />
            Add Time
          </button>
        </div>
      </div>
    )
  }

  // Render Remaining Hours cell
  const renderRemainingCell = (estimated: number, actual: number) => {
    const est = Number(estimated) || 0
    const act = Number(actual) || 0
    if (act > est) {
      const overrun = Math.round((act - est) * 100) / 100
      return (
        <span className="font-semibold text-xs text-rose-400 flex items-center justify-center gap-1">
          <Flame className="w-3 h-3 text-rose-500" />
          Overrun: {overrun}h
        </span>
      )
    }
    const remaining = Math.round((est - act) * 100) / 100
    return (
      <span className="font-semibold text-xs text-emerald-400">
        {remaining} hrs
      </span>
    )
  }

  return (
    <div id="release-task-table-section" className="space-y-4">
      {/* ── Drill-down Banner if active ─────────────────────────────────────── */}
      {drillDownRelease && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-xl border border-accent/30 bg-accent/10 text-xs">
          <div className="flex items-center gap-2 text-accent">
            <CheckSquare className="w-4 h-4" />
            <span>
              Drill-down active for release: <strong>{drillDownRelease}</strong>
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setDrillDownRelease(null)
              setFilters({ selectedRelease: 'all' })
            }}
            className="text-text-muted hover:text-text-primary underline text-xs"
          >
            Clear Drill-Down
          </button>
        </div>
      )}

      {/* ── Table Top Control Bar ───────────────────────────────────────────── */}
      <GlassCard className="p-3.5 border border-white/10 bg-surface/90 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            aria-label="Search release tasks"
            placeholder="Search tasks by ID, description, release, product, assignee..."
            value={filters.searchQuery || ''}
            onChange={(e) => setFilters({ searchQuery: e.target.value })}
            className="w-full h-9 pl-9 pr-3 text-xs bg-surface-elevated/70 border border-white/10 rounded-xl text-text-primary placeholder:text-text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Count and Page Size Selector */}
        <div className="flex items-center gap-3 text-xs text-text-muted">
          <span>
            Showing <strong>{tasks.length}</strong> tasks
          </span>
          <div className="flex items-center gap-1.5">
            <span>Per page:</span>
            <select
              aria-label="Items per page"
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="h-8 bg-surface-elevated/80 border border-white/10 rounded-lg px-2 text-xs text-text-primary focus:outline-none"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
          </div>
        </div>
      </GlassCard>

      {/* ── Main Task Table (16 Columns) ────────────────────────────────────── */}
      <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-surface shadow-lg">
        <table className="w-full text-left text-xs whitespace-nowrap">
          <thead className="bg-surface-elevated/90 text-text-muted font-semibold uppercase tracking-wider text-[11px] border-b border-white/10 select-none">
            <tr>
              {/* 1. Sl. No. */}
              <th
                onClick={() => handleSort('sl_no')}
                className="py-3 px-3 text-center cursor-pointer hover:text-text-primary"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Sl. No.</span>
                  <ArrowUpDown className="w-3 h-3 text-text-muted/60" />
                </div>
              </th>

              {/* 2. Product */}
              <th
                onClick={() => handleSort('product_name')}
                className="py-3 px-3.5 cursor-pointer hover:text-text-primary"
              >
                <div className="flex items-center gap-1">
                  <span>Product</span>
                  <ArrowUpDown className="w-3 h-3 text-text-muted/60" />
                </div>
              </th>

              {/* 3. Release */}
              <th
                onClick={() => handleSort('release_version')}
                className="py-3 px-3 cursor-pointer hover:text-text-primary"
              >
                <div className="flex items-center gap-1">
                  <span>Release</span>
                  <ArrowUpDown className="w-3 h-3 text-text-muted/60" />
                </div>
              </th>

              {/* 4. Release Task ID */}
              <th
                onClick={() => handleSort('task_id')}
                className="py-3 px-3 cursor-pointer hover:text-text-primary"
              >
                <div className="flex items-center gap-1">
                  <span>Task ID</span>
                  <ArrowUpDown className="w-3 h-3 text-text-muted/60" />
                </div>
              </th>

              {/* 5. Task Description */}
              <th className="py-3 px-4 min-w-[240px] whitespace-normal">
                Task Description
              </th>

              {/* 6. Priority */}
              <th
                onClick={() => handleSort('priority')}
                className="py-3 px-3 cursor-pointer hover:text-text-primary"
              >
                <div className="flex items-center gap-1">
                  <span>Priority</span>
                  <ArrowUpDown className="w-3 h-3 text-text-muted/60" />
                </div>
              </th>

              {/* 7. Start Date */}
              <th
                onClick={() => handleSort('start_date')}
                className="py-3 px-3 cursor-pointer hover:text-text-primary"
              >
                <div className="flex items-center gap-1">
                  <span>Start Date</span>
                  <ArrowUpDown className="w-3 h-3 text-text-muted/60" />
                </div>
              </th>

              {/* 8. Target Date */}
              <th
                onClick={() => handleSort('target_date')}
                className="py-3 px-3 cursor-pointer hover:text-text-primary"
              >
                <div className="flex items-center gap-1">
                  <span>Target Date</span>
                  <ArrowUpDown className="w-3 h-3 text-text-muted/60" />
                </div>
              </th>

              {/* 9. Finish Date */}
              <th
                onClick={() => handleSort('finish_date')}
                className="py-3 px-3 cursor-pointer hover:text-text-primary"
              >
                <div className="flex items-center gap-1">
                  <span>Finish Date</span>
                  <ArrowUpDown className="w-3 h-3 text-text-muted/60" />
                </div>
              </th>

              {/* 10. Assigned To */}
              <th
                onClick={() => handleSort('assigned_to_name')}
                className="py-3 px-3 cursor-pointer hover:text-text-primary"
              >
                <div className="flex items-center gap-1">
                  <span>Assigned To</span>
                  <ArrowUpDown className="w-3 h-3 text-text-muted/60" />
                </div>
              </th>

              {/* 11. Estimated Hrs */}
              <th
                onClick={() => handleSort('estimated_hours')}
                className="py-3 px-3 text-right cursor-pointer hover:text-text-primary"
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Estimated Hrs</span>
                  <ArrowUpDown className="w-3 h-3 text-text-muted/60" />
                </div>
              </th>

              {/* 12. Actual Hrs */}
              <th className="py-3 px-3 text-center min-w-[140px]">
                Actual Hrs / Effort
              </th>

              {/* 13. Remaining Hrs */}
              <th className="py-3 px-3 text-center">
                Remaining Hrs
              </th>

              {/* 14. Task Status */}
              <th
                onClick={() => handleSort('task_status')}
                className="py-3 px-3 text-center cursor-pointer hover:text-text-primary"
              >
                <div className="flex items-center justify-center gap-1">
                  <span>Task Status</span>
                  <ArrowUpDown className="w-3 h-3 text-text-muted/60" />
                </div>
              </th>

              {/* 15. Comments */}
              <th className="py-3 px-4 min-w-[160px] whitespace-normal">
                Comments
              </th>

              {/* 16. Actions */}
              <th className="py-3 px-3 text-center">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {paginatedTasks.length === 0 ? (
              <tr>
                <td colSpan={16} className="py-12 text-center text-text-muted text-xs">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckSquare className="w-8 h-8 text-text-muted/40" />
                    <span className="font-semibold">No Release Tasks Found</span>
                    <span className="text-[11px] text-text-muted/60">
                      Try adjusting the product or release filters, or click "+ Add Release Task" to create one.
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedTasks.map((task, index) => {
                const autoSlNo = (currentPage - 1) * pageSize + index + 1

                return (
                  <tr
                    key={task.id}
                    className="hover:bg-accent/[0.06] transition-colors duration-150 cursor-default group"
                  >
                    {/* 1. Sl. No. */}
                    <td className="py-3 px-3 text-center font-mono text-text-muted border-l-[3px] border-l-transparent group-hover:border-l-accent group-hover:text-accent font-semibold transition-colors">
                      {autoSlNo}
                    </td>

                    {/* 2. Product */}
                    <td className="py-3 px-3.5 font-medium">
                      <div className="flex flex-col">
                        <span className="font-semibold text-text-primary group-hover:text-accent transition-colors">
                          {task.product_name}
                        </span>
                        {task.product_code && (
                          <span className="text-[10px] text-text-muted font-mono">
                            {task.product_code}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* 3. Release */}
                    <td className="py-3 px-3 font-medium">
                      <span className="px-2 py-0.5 rounded bg-white/10 font-mono text-xs text-text-secondary">
                        {task.release_version}
                      </span>
                    </td>

                    {/* 4. Release Task ID */}
                    <td className="py-3 px-3 font-mono font-bold">
                      <span className="px-2 py-0.5 rounded-md bg-accent/15 border border-accent/30 text-accent inline-block text-xs">
                        {task.task_id}
                      </span>
                    </td>

                    {/* 5. Task Description */}
                    <td
                      className="py-3 px-4 text-text-secondary whitespace-normal max-w-xs text-xs leading-relaxed"
                      title={task.description}
                    >
                      <p className="line-clamp-2">
                        {task.description}
                      </p>
                    </td>

                    {/* 6. Priority */}
                    <td className="py-3 px-3">
                      {getPriorityBadge(task.priority)}
                    </td>

                    {/* 7. Start Date */}
                    <td className="py-3 px-3 text-text-muted font-mono text-xs">
                      {task.start_date || '—'}
                    </td>

                    {/* 8. Target Date */}
                    <td className="py-3 px-3 text-text-muted font-mono text-xs">
                      {task.target_date || '—'}
                    </td>

                    {/* 9. Finish Date */}
                    <td className="py-3 px-3 text-text-muted font-mono text-xs">
                      {task.finish_date || '—'}
                    </td>

                    {/* 10. Assigned To */}
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-1.5">
                        <div className="w-5 h-5 rounded-full bg-accent/20 border border-accent/40 text-accent flex items-center justify-center text-[9px] font-bold">
                          {task.assigned_to_name.slice(0, 1).toUpperCase()}
                        </div>
                        <span className="font-medium text-text-primary text-xs">
                          {task.assigned_to_name}
                        </span>
                      </div>
                    </td>

                    {/* 11. Estimated Hrs */}
                    <td className="py-3 px-3 text-right whitespace-nowrap align-middle">
                      <div className="inline-flex items-center justify-end gap-1.5 font-semibold text-text-primary text-xs">
                        <span>{task.estimated_hours}h</span>
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
                                  ? `Estimated hours for ${task.task_id} locked at ${task.estimated_hours}h.`
                                  : `Estimated hours for ${task.task_id} unlocked for editing.`
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

                    {/* 12. Actual Hrs / Effort */}
                    <td className="py-3 px-3 text-center">
                      {renderEffortCell(task)}
                    </td>

                    {/* 13. Remaining Hrs */}
                    <td className="py-3 px-3 text-center">
                      {renderRemainingCell(task.estimated_hours, task.actual_hours)}
                    </td>

                    {/* 14. Task Status */}
                    <td className="py-3 px-3 text-center">
                      {getStatusBadge(task.task_status)}
                    </td>

                    {/* 15. Comments */}
                    <td
                      className="py-3 px-4 text-text-muted text-[11px] whitespace-normal max-w-xs"
                      title={task.comments || undefined}
                    >
                      {task.comments ? (
                        <p className="line-clamp-2 italic">
                          "{task.comments}"
                        </p>
                      ) : (
                        <span className="text-text-muted/40">—</span>
                      )}
                    </td>

                    {/* 16. Actions */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {/* View Task */}
                        <button
                          type="button"
                          title="View Release Task"
                          onClick={() => onViewTask(task)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* Edit Task (Permission: can_edit) */}
                        {canEdit && (
                          <button
                            type="button"
                            title="Edit Release Task"
                            onClick={() => onEditTask(task)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-blue-400 hover:bg-blue-500/10 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Time Logs */}
                        <button
                          type="button"
                          title="View Time Logs"
                          onClick={() => onViewTimeLogs(task)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                        >
                          <Clock className="w-3.5 h-3.5" />
                        </button>

                        {/* Audit History (Permission: can_view_history) */}
                        {canViewHistory && onViewHistory && (
                          <button
                            type="button"
                            title="View Audit History"
                            onClick={() => onViewHistory(task)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* Delete Task (Permission: can_delete) */}
                        {canDelete && (
                          <button
                            type="button"
                            title="Delete Release Task"
                            onClick={() => onDeleteTask(task)}
                            className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
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

      {/* ── Table Pagination Bar ────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2 text-xs text-text-muted">
          <div>
            Showing {(currentPage - 1) * pageSize + 1} to{' '}
            {Math.min(currentPage * pageSize, sortedTasks.length)} of{' '}
            {sortedTasks.length} tasks
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-3 font-semibold text-text-primary">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="p-1.5 rounded-lg border border-white/10 hover:bg-white/5 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
