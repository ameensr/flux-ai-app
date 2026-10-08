// src/modules/ReleaseTaskTracker/components/ReleaseTimeLogDrawer.tsx
// Slide-over drawer displaying cumulative time log entries for a release task.
// Shows total actual hours and allows removal with audit trail.

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Clock, Plus, Trash2, Calendar, User, FileText,
  AlertCircle, CheckCircle2, Flame
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/useAppStore'
import { useReleaseTrackerStore } from '../store'
import type { ReleaseTask, ReleaseTaskTimeLog } from '../types'
import { calculateEffort } from '../types'

interface Props {
  isOpen: boolean
  task: ReleaseTask | null
  onClose: () => void
  onAddHours: (task: ReleaseTask) => void
}

export function ReleaseTimeLogDrawer({
  isOpen,
  task,
  onClose,
  onAddHours
}: Props) {
  useBodyScrollLock(isOpen)
  const { toast } = useToast()
  const { user, profile } = useAppStore()
  const { getTimeLogsForTask, removeTimeLog } = useReleaseTrackerStore()

  if (!isOpen || !task) return null

  const logs = getTimeLogsForTask(task.task_id)
  const effort = calculateEffort(task.estimated_hours, task.actual_hours)

  const handleRemoveLog = async (log: ReleaseTaskTimeLog) => {
    try {
      const actorName =
        (profile?.full_name as string) ||
        (user?.user_metadata?.full_name as string) ||
        user?.email ||
        'QA Tester'

      await removeTimeLog(log.id, { name: actorName, id: user?.id })

      toast({
        title: 'Time Log Removed',
        description: `Removed ${log.hours_added}h logged by ${log.user_name}`
      })
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message || 'Could not remove time log'
      })
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-screen max-w-md bg-surface border-l border-white/10 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-surface-elevated/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-accent/20 text-accent">
                      {task.task_id}
                    </span>
                    <span className="text-xs font-semibold text-text-primary">
                      Time Logs
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted mt-0.5 truncate max-w-[220px]">
                    {task.product_name} • {task.release_version}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Effort Summary Box */}
            <div className="p-4 bg-surface-elevated/40 border-b border-white/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted uppercase font-semibold">Total Actual Effort</span>
                <span className="text-lg font-bold font-mono text-purple-300">
                  {task.actual_hours} hrs
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-surface border border-white/5">
                  <span className="text-[10px] text-text-muted block">Estimated</span>
                  <span className="font-bold text-text-primary">{task.estimated_hours}h</span>
                </div>
                <div className="p-2 rounded bg-surface border border-white/5">
                  <span className="text-[10px] text-text-muted block">
                    {effort.isOverrun ? 'Overrun' : 'Remaining'}
                  </span>
                  <span className={`font-bold ${effort.isOverrun ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {effort.isOverrun ? `+${effort.overrunHrs}h` : `${effort.remainingHrs}h`}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onClose()
                  onAddHours(task)
                }}
                className="w-full h-8 mt-1 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Time Log
              </button>
            </div>

            {/* Logs List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {logs.length === 0 ? (
                <div className="py-16 text-center text-text-muted text-xs">
                  <Clock className="w-8 h-8 text-text-muted/30 mx-auto mb-2" />
                  No time logs recorded yet for this task.
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 rounded-xl border border-white/10 bg-surface-elevated/50 hover:border-white/20 transition-all flex items-start justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-text-primary">
                          {log.user_name}
                        </span>
                        <span className="font-mono text-xs font-bold text-purple-300 px-1.5 py-0.5 rounded bg-purple-500/10">
                          +{log.hours_added}h
                        </span>
                      </div>
                      {log.comment && (
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {log.comment}
                        </p>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-text-muted">
                        <Calendar className="w-3 h-3" />
                        <span>{log.date}</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      title="Remove this log entry"
                      onClick={() => handleRemoveLog(log)}
                      className="p-1 rounded text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-surface-elevated/70 flex items-center justify-between text-xs text-text-muted">
              <span>{logs.length} logged entries</span>
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-text-primary"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}
