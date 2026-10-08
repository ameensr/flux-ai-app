// src/modules/ReleaseTaskTracker/components/ViewReleaseTaskModal.tsx
// Modal for viewing full Release Task details including cumulative Time Logs and Audit Trail.
// Identifies task strictly by unique ID.

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Eye, Clock, History, Calendar, CheckSquare, Plus,
  FileText, User, Flame, AlertCircle, CheckCircle2, ChevronRight
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { usePermissions } from '@/hooks/usePermissions'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/useAppStore'
import { EstimationLockControl } from '@/components/qa-operations/EstimationLockControl'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useReleaseTrackerStore } from '../store'
import type { ReleaseTask } from '../types'
import { calculateEffort, DEFAULT_TASK_STATUSES, DEFAULT_PRIORITIES } from '../types'

interface Props {
  isOpen: boolean
  task: ReleaseTask | null
  onClose: () => void
  onLogHours: (task: ReleaseTask) => void
  onEditTask?: (task: ReleaseTask) => void
}

export function ViewReleaseTaskModal({
  isOpen,
  task,
  onClose,
  onLogHours,
  onEditTask
}: Props) {
  useBodyScrollLock(isOpen)
  const { toast } = useToast()
  const { user, profile } = useAppStore()
  const { can } = usePermissions()
  const canLockEst = can('release-tracker', 'can_lock_estimated_hours')
  const canUnlockEst = can('release-tracker', 'can_unlock_estimated_hours')

  const { getTimeLogsForTask, history, dropdownConfigs, toggleEstimationLock } = useReleaseTrackerStore()
  const [activeTab, setActiveTab] = useState<'details' | 'timelogs' | 'history'>('details')
  const [localTask, setLocalTask] = useState<ReleaseTask | null>(task)

  useEffect(() => {
    setLocalTask(task)
  }, [task])

  if (!isOpen || !task) return null

  const currentTask = localTask || task
  const effort = calculateEffort(currentTask.estimated_hours, currentTask.actual_hours)
  const timeLogs = getTimeLogsForTask(currentTask.task_id)
  const taskHistory = history.filter(h => h.task_id === currentTask.task_id)

  const statusConfig = dropdownConfigs.task_status.find(s => s.value === currentTask.task_status)
  const statusColor = statusConfig?.color || '#94a3b8'

  const priorityConfig = dropdownConfigs.priority.find(p => p.value === currentTask.priority)
  const priorityColor = priorityConfig?.color || '#3b82f6'

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-3xl bg-surface border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto z-10"
        >
          {/* ── Modal Header ── */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-surface-elevated/80 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                <CheckSquare className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-sm text-accent px-2 py-0.5 rounded bg-accent/15 border border-accent/30">
                    {task.task_id}
                  </span>
                  <span className="font-semibold text-text-primary text-sm">
                    {task.product_name}
                  </span>
                  <Badge variant="outline" className="text-[10px] bg-white/5 font-mono text-text-muted">
                    {task.release_version}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted mt-0.5 truncate max-w-md">
                  {task.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onLogHours(task)}
                className="h-8 px-3 rounded-xl bg-accent/20 hover:bg-accent/30 border border-accent/30 text-accent text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Time
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* ── Tabs Navigation ── */}
          <div className="flex items-center gap-1 px-6 pt-2 border-b border-white/10 bg-surface-elevated/30 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'details'
                  ? 'border-accent text-accent'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              Task Overview
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('timelogs')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'timelogs'
                  ? 'border-purple-400 text-purple-300'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Time Logs ({timeLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
                activeTab === 'history'
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-text-muted hover:text-text-primary'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Audit Trail ({taskHistory.length})
            </button>
          </div>

          {/* ── Tab Content ── */}
          <div className="overflow-y-auto p-6 space-y-5 flex-1">
            {activeTab === 'details' && (
              <div className="space-y-5">
                {/* Status, Priority & Assignee Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl border border-white/10 bg-surface-elevated/50">
                  <div>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-text-muted block mb-1">
                      Task Status
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border"
                      style={{
                        backgroundColor: `${statusColor}18`,
                        borderColor: `${statusColor}40`,
                        color: statusColor
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: statusColor }} />
                      {task.task_status}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-text-muted block mb-1">
                      Priority
                    </span>
                    <span
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-xs font-semibold border"
                      style={{
                        backgroundColor: `${priorityColor}15`,
                        borderColor: `${priorityColor}35`,
                        color: priorityColor
                      }}
                    >
                      {task.priority}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-text-muted block mb-1">
                      Assigned To
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-medium text-text-primary">
                      <div className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[9px] font-bold">
                        {task.assigned_to_name.slice(0, 1).toUpperCase()}
                      </div>
                      <span>{task.assigned_to_name}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-semibold tracking-wider text-text-muted block mb-1">
                      Release
                    </span>
                    <span className="font-mono text-xs font-semibold text-text-primary">
                      {task.release_version}
                    </span>
                  </div>
                </div>

                {/* Task Description */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                    Task Description
                  </h4>
                  <div className="p-4 rounded-xl border border-white/10 bg-surface-elevated/30 text-xs leading-relaxed text-text-primary whitespace-pre-wrap">
                    {task.description}
                  </div>
                </div>

                {/* Effort & Cumulative Hours Card */}
                <div className="p-4 rounded-xl border border-white/10 bg-surface-elevated/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted">
                      Effort Tracking (Cumulative Work Hours)
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-semibold ${
                        effort.indicatorState === 'overrun'
                          ? 'bg-rose-500/15 text-rose-400'
                          : effort.indicatorState === 'attention'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-emerald-500/15 text-emerald-400'
                      }`}
                    >
                      {effort.displayText}
                    </span>
                  </div>

                  {/* 4 Metrics in a row */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                    <div className="p-2.5 rounded-lg bg-surface border border-white/5 relative flex flex-col justify-between">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="text-[10px] text-text-muted">Estimated Hrs</span>
                        <EstimationLockControl
                          isLocked={currentTask.estimated_hours_locked}
                          canLock={canLockEst}
                          canUnlock={canUnlockEst}
                          lockedBy={currentTask.estimated_hours_locked_by}
                          lockedAt={currentTask.estimated_hours_locked_at ? new Date(currentTask.estimated_hours_locked_at).toLocaleString() : null}
                          size="xs"
                          onToggleLock={async (shouldLock) => {
                            try {
                              const updated = await toggleEstimationLock(currentTask.id, shouldLock, {
                                name: (profile?.full_name as string) || (user?.user_metadata?.full_name as string) || user?.email || 'System User',
                                id: user?.id
                              })
                              setLocalTask(updated)
                              toast({
                                title: shouldLock ? 'Estimation Locked' : 'Estimation Unlocked',
                                description: shouldLock
                                  ? `Estimated hours locked at ${updated.estimated_hours}h.`
                                  : `Estimated hours unlocked for editing.`
                              })
                            } catch (err: any) {
                              toast({
                                title: 'Action Failed',
                                description: err?.message || 'Failed to update lock',
                                variant: 'destructive'
                              })
                            }
                          }}
                        />
                      </div>
                      <div className="flex items-center justify-center gap-1.5 my-0.5">
                        <span className="text-base font-bold text-text-primary">{currentTask.estimated_hours}h</span>
                        <span className="text-xs">
                          {currentTask.estimated_hours_locked ? '🔒' : '🔓'}
                        </span>
                      </div>
                      {currentTask.estimated_hours_locked && (
                        <div className="text-[9px] text-amber-300/80 leading-tight mt-0.5">
                          <span>{currentTask.estimated_hours_locked_by ? `By: ${currentTask.estimated_hours_locked_by}` : 'Locked'}</span>
                          {currentTask.estimated_hours_locked_at && (
                            <span className="block text-text-muted/60">{new Date(currentTask.estimated_hours_locked_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="p-2.5 rounded-lg bg-surface border border-white/5 flex flex-col justify-between">
                      <span className="text-[10px] text-text-muted block">Actual Hrs (Total)</span>
                      <span className="text-base font-bold text-purple-300 my-1">{currentTask.actual_hours}h</span>
                      <span className="text-[9px] text-text-muted/60">Cumulative</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-surface border border-white/5 flex flex-col justify-between">
                      <span className="text-[10px] text-text-muted block">Remaining Hrs</span>
                      <span className="text-base font-bold text-emerald-400 my-1">{currentTask.remaining_hours}h</span>
                      <span className="text-[9px] text-text-muted/60">Formula Balance</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-surface border border-white/5 flex flex-col justify-between">
                      <span className="text-[10px] text-text-muted block">Overrun Hrs</span>
                      <span className={`text-base font-bold my-1 ${currentTask.overrun_hours > 0 ? 'text-rose-400' : 'text-text-muted'}`}>
                        {currentTask.overrun_hours > 0 ? `+${currentTask.overrun_hours}h` : '0h'}
                      </span>
                      <span className="text-[9px] text-text-muted/60">{currentTask.overrun_hours > 0 ? 'Exceeded' : 'On Track'}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        effort.indicatorState === 'overrun'
                          ? 'bg-rose-500'
                          : effort.indicatorState === 'attention'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, effort.percentage)}%` }}
                    />
                  </div>
                </div>

                {/* Schedule Dates */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl border border-white/10 bg-surface-elevated/30">
                    <span className="text-[10px] uppercase font-semibold text-text-muted block mb-1">
                      Start Date
                    </span>
                    <span className="text-xs font-mono text-text-primary">
                      {task.start_date || '—'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-white/10 bg-surface-elevated/30">
                    <span className="text-[10px] uppercase font-semibold text-text-muted block mb-1">
                      Target Date
                    </span>
                    <span className="text-xs font-mono text-text-primary">
                      {task.target_date || '—'}
                    </span>
                  </div>

                  <div className="p-3 rounded-xl border border-white/10 bg-surface-elevated/30">
                    <span className="text-[10px] uppercase font-semibold text-text-muted block mb-1">
                      Finish Date
                    </span>
                    <span className="text-xs font-mono text-text-primary">
                      {task.finish_date || '—'}
                    </span>
                  </div>
                </div>

                {/* Comments */}
                {task.comments && (
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2">
                      Comments & Notes
                    </h4>
                    <div className="p-3.5 rounded-xl border border-white/10 bg-surface-elevated/30 text-xs italic text-text-secondary">
                      "{task.comments}"
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Time Logs Tab */}
            {activeTab === 'timelogs' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary">
                    Total Actual Effort: <strong className="text-purple-300 font-mono">{task.actual_hours} Hrs</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => onLogHours(task)}
                    className="h-8 px-3 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-semibold flex items-center gap-1 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Log Work Hours
                  </button>
                </div>

                {timeLogs.length === 0 ? (
                  <div className="py-12 text-center text-text-muted text-xs rounded-xl border border-dashed border-white/10">
                    No work hours logged yet for this task.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl border border-white/10">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-surface-elevated/80 text-[11px] font-semibold text-text-muted uppercase border-b border-white/10">
                        <tr>
                          <th className="py-2.5 px-3">Date</th>
                          <th className="py-2.5 px-3">User</th>
                          <th className="py-2.5 px-3 text-right">Hours Added</th>
                          <th className="py-2.5 px-4">Comment</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {timeLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/[0.02]">
                            <td className="py-2.5 px-3 font-mono text-text-muted">
                              {log.date}
                            </td>
                            <td className="py-2.5 px-3 font-semibold text-text-primary">
                              {log.user_name}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-purple-300">
                              +{log.hours_added}h
                            </td>
                            <td className="py-2.5 px-4 text-text-secondary">
                              {log.comment || '—'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Audit History Tab */}
            {activeTab === 'history' && (
              <div className="space-y-3">
                <span className="text-xs font-bold text-text-primary block">
                  Change History Trail
                </span>

                {taskHistory.length === 0 ? (
                  <div className="py-12 text-center text-text-muted text-xs rounded-xl border border-dashed border-white/10">
                    No history events recorded yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {taskHistory.map((hist) => (
                      <div
                        key={hist.id}
                        className="p-3 rounded-xl border border-white/10 bg-surface-elevated/40 text-xs flex items-start justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-text-primary">
                              {hist.user_name}
                            </span>
                            <span className="text-accent font-semibold">
                              {hist.action}
                            </span>
                            {hist.field && (
                              <span className="text-text-muted">
                                ({hist.field})
                              </span>
                            )}
                          </div>
                          {(hist.old_value || hist.new_value) && (
                            <div className="mt-1 text-[11px] text-text-secondary">
                              {hist.old_value && (
                                <span className="line-through text-rose-400 mr-2">
                                  {hist.old_value}
                                </span>
                              )}
                              {hist.new_value && (
                                <span className="text-emerald-400">
                                  {hist.new_value}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-text-muted whitespace-nowrap">
                          {hist.timestamp}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="px-6 py-3 border-t border-white/10 flex items-center justify-between bg-surface-elevated/90 shrink-0">
            <span className="text-[11px] text-text-muted">
              Created: {new Date(task.created_at).toLocaleDateString()}
            </span>
            <div className="flex items-center gap-2">
              {onEditTask && (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    onEditTask(task)
                  }}
                  className="h-8 px-4 rounded-xl border border-white/10 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all"
                >
                  Edit Task
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 rounded-xl bg-surface-elevated border border-white/10 text-xs font-medium text-text-primary hover:bg-white/10 transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
