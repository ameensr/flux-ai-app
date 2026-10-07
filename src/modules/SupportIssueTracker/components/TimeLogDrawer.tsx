// src/modules/SupportIssueTracker/components/TimeLogDrawer.tsx
// Comprehensive Time Log Drawer displaying the audit-grade progressive effort entries per issue.
// Shows Date, User, Added Hrs, Running Total, Comment, and allows adding or deleting entries.

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Plus, X, Trash2, Calendar, User, Download,
  AlertCircle, CheckCircle2, Flame, ArrowRight
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { useSupportTrackerStore } from '../store'
import type { SupportIssue, SupportIssueTimeLog } from '../types'
import { calculateEffort } from '../types'
import * as XLSX from 'xlsx'

interface Props {
  isOpen: boolean
  issue: SupportIssue | null
  onClose: () => void
  onOpenAddHours?: (issue: SupportIssue) => void
  onAddHours?: (issue: SupportIssue) => void
}

export function TimeLogDrawer({ isOpen, issue, onClose, onOpenAddHours, onAddHours }: Props) {
  useBodyScrollLock(isOpen)
  const { user, profile } = useAppStore()
  const confirm = useConfirm()
  const { toast } = useToast()
  const { getTimeLogsForIssue, removeTimeLog } = useSupportTrackerStore()

  const [isDeleting, setIsDeleting] = useState<boolean>(false)

  if (!isOpen || !issue) return null

  const handleTriggerAddHours = () => {
    if (onAddHours) onAddHours(issue)
    else if (onOpenAddHours) onOpenAddHours(issue)
  }

  // Fetch all logs for this issue sorted ascending by timestamp to calculate running totals
  const rawLogs = getTimeLogsForIssue(issue.issue_id)
  
  // Sort chronological for calculating running totals
  const chronologicalLogs = [...rawLogs].sort(
    (a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime()
  )

  // Calculate running cumulative total for each entry
  let runningSum = 0
  const logsWithCumulative = chronologicalLogs.map((log) => {
    runningSum = Math.round((runningSum + Number(log.hours_added)) * 100) / 100
    return {
      ...log,
      cumulativeTotal: runningSum
    }
  })

  // Display logs newest first
  const displayLogs = [...logsWithCumulative].reverse()

  const estimated = Number(issue.estimated_hours) || 0
  const totalActual = runningSum > 0 ? runningSum : (Number(issue.actual_hours) || 0)
  const { isOverrun, remainingHrs, overrunHrs, percentage, displayText } =
    calculateEffort(estimated, totalActual)

  // Format date helper: "Oct 7, 10:15 AM"
  const formatLogDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      })
    } catch {
      return dateStr
    }
  }

  // Handle Delete Time Log Entry
  const handleDeleteLog = async (log: SupportIssueTimeLog) => {
    const isConfirmed = await confirm({
      title: 'Delete Time Log Entry?',
      description: `Are you sure you want to delete this ${log.hours_added} hrs entry by ${log.user_name}? Total actual hours will be recalculated automatically.`,
      confirmLabel: 'Delete Entry',
      cancelLabel: 'Cancel',
      tone: 'danger'
    })

    if (!isConfirmed) return

    try {
      setIsDeleting(true)
      const actorName =
        profile?.full_name ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        'Ameen'

      await removeTimeLog(log.id, { name: actorName, id: user?.id })
      toast({
        title: 'Time Log Entry Removed',
        description: `Removed log entry (-${log.hours_added} hrs). Total actual updated.`
      })
    } catch (err: any) {
      console.error('[TimeLogDrawer] error deleting time log:', err)
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: 'Failed to remove time log entry.'
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Export Time Log for this issue to CSV/Excel
  const handleExportTimeLog = () => {
    const exportRows = logsWithCumulative.map((l, index) => ({
      'Entry #': index + 1,
      'Issue ID': issue.issue_id,
      'Product': issue.product_name,
      'Date & Time': formatLogDate(l.logged_at),
      'Tester': l.user_name,
      'Hours Added': l.hours_added,
      'Cumulative Total (Hrs)': l.cumulativeTotal,
      'Remaining Balance (Hrs)': Math.max(0, estimated - l.cumulativeTotal),
      'Comments / Notes': l.comment
    }))

    const worksheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Time Log')
    XLSX.writeFile(workbook, `${issue.issue_id}_Time_Log_${new Date().toISOString().slice(0, 10)}.xlsx`)
    toast({
      title: 'Export Complete',
      description: `Exported ${issue.issue_id} time log to Excel.`
    })
  }

  return (
    <AnimatePresence>
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Slide-over Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="relative z-10 w-full max-w-xl bg-surface border-l border-white/10 dark:border-white/10 shadow-2xl flex flex-col h-full overflow-hidden"
          >
            {/* Drawer Header */}
            <div className="p-4 sm:p-5 border-b border-border/40 bg-surface-secondary/40 shrink-0">
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-text-primary">
                        {issue.issue_id} — Time Log
                      </h2>
                      <span className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/25 text-accent font-mono text-xs font-bold">
                        {issue.testing_status}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                      {issue.product_name} • {issue.description}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleExportTimeLog}
                    title="Export Time Log to Excel"
                    className="p-2 rounded-lg text-text-muted hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Action bar: Add Hours Button */}
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/30">
                <span className="text-xs text-text-muted">
                  Audit-grade progressive time tracking
                </span>
                <button
                  type="button"
                  onClick={handleTriggerAddHours}
                  className="h-8 px-3 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Log Hours</span>
                </button>
              </div>
            </div>

            {/* KPI Summary Banner */}
            <div className="p-4 bg-surface-secondary/60 border-b border-border/40 grid grid-cols-4 gap-2 text-center text-xs shrink-0">
              <div>
                <span className="text-[10px] text-text-muted uppercase font-semibold block">Estimated</span>
                <span className="font-bold text-text-primary text-sm font-mono">{estimated} hrs</span>
              </div>
              <div className="border-l border-border/30">
                <span className="text-[10px] text-text-muted uppercase font-semibold block">Total Actual</span>
                <span className="font-bold text-indigo-400 text-sm font-mono">{totalActual} hrs</span>
              </div>
              <div className="border-l border-border/30">
                <span className="text-[10px] text-text-muted uppercase font-semibold block">Remaining</span>
                <span className="font-bold text-text-primary text-sm font-mono">
                  {isOverrun ? (
                    <span className="text-rose-400">0 hrs</span>
                  ) : (
                    <span className="text-emerald-400">{remainingHrs} hrs</span>
                  )}
                </span>
              </div>
              <div className="border-l border-border/30">
                <span className="text-[10px] text-text-muted uppercase font-semibold block">Effort Status</span>
                <span className="font-bold text-xs font-mono">
                  {isOverrun ? (
                    <span className="text-rose-400 flex items-center justify-center gap-0.5">
                      <Flame className="w-3 h-3 text-rose-500" />
                      +{overrunHrs}h
                    </span>
                  ) : (
                    <span className="text-emerald-400">{percentage}%</span>
                  )}
                </span>
              </div>
            </div>

            {/* Log Entries List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex items-center justify-between text-xs text-text-muted font-semibold px-1">
                <span>Work Entries ({displayLogs.length})</span>
                <span className="text-[11px] font-normal">Sum of entries = {totalActual} hrs</span>
              </div>

              {displayLogs.length > 0 ? (
                displayLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3.5 rounded-xl border border-border/40 bg-surface-elevated/70 hover:bg-surface-elevated transition-colors relative group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 flex-1">
                        {/* Header: Date, User & Hours */}
                        <div className="flex items-center gap-2 flex-wrap text-xs">
                          <span className="font-semibold text-text-primary flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded-full bg-accent/20 text-accent flex items-center justify-center text-[10px] font-bold">
                              {(log.user_name || 'U').slice(0, 1).toUpperCase()}
                            </span>
                            {log.user_name}
                          </span>
                          <span className="text-text-muted">•</span>
                          <span className="text-text-muted font-mono text-[11px]">
                            {formatLogDate(log.logged_at)}
                          </span>
                        </div>

                        {/* Comment */}
                        {log.comment ? (
                          <p className="text-xs text-text-secondary leading-relaxed pt-1">
                            {log.comment}
                          </p>
                        ) : (
                          <p className="text-xs text-text-muted/50 italic leading-relaxed pt-1">
                            No notes provided
                          </p>
                        )}
                      </div>

                      {/* Right badge: Hours Added & Running Total */}
                      <div className="text-right shrink-0">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent/15 border border-accent/25 text-accent font-bold text-xs font-mono">
                          +{log.hours_added} hrs
                        </span>
                        <div className="text-[10px] text-text-muted font-mono mt-1">
                          Total: <strong className="text-text-primary">{log.cumulativeTotal} hrs</strong>
                        </div>
                      </div>
                    </div>

                    {/* Delete entry trigger on hover */}
                    <div className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        title="Delete this time log entry"
                        disabled={isDeleting}
                        onClick={() => handleDeleteLog(log)}
                        className="p-1.5 rounded-lg text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-16 text-center text-xs text-text-muted flex flex-col items-center justify-center gap-2">
                  <Clock className="w-8 h-8 text-text-muted/40" />
                  <p className="font-medium text-text-secondary">No work hours logged yet for {issue.issue_id}.</p>
                  <p className="max-w-xs text-text-muted">
                    Testers can log hours progressively. Click below to add the first work log.
                  </p>
                  <button
                    type="button"
                    onClick={handleTriggerAddHours}
                    className="mt-2 h-8 px-3 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Log Work Hours</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer Summary */}
            <div className="p-4 border-t border-border/40 bg-surface-secondary/40 flex items-center justify-between text-xs text-text-muted shrink-0">
              <div>
                <span>Total Logged Effort: </span>
                <strong className="text-accent font-mono text-sm">{totalActual} hrs</strong>
                {isOverrun && (
                  <span className="text-rose-400 ml-1.5 font-semibold">
                    (Overrun: +{overrunHrs} hrs)
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-1.5 rounded-xl border border-border/50 hover:bg-white/5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>
  )
}
