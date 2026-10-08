// src/modules/ReleaseTaskTracker/components/AddReleaseTimeLogModal.tsx
// Incremental Time Logging Modal for Release Tasks.
// Cumulative calculation: Actual Hrs = SUM(time logs), Remaining = Estimated - Actual, Overrun = Actual - Estimated.

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Plus, X, Calendar, User, FileText, CheckCircle2,
  AlertCircle, Flame, Sparkles
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useToast } from '@/hooks/use-toast'
import { useReleaseTrackerStore } from '../store'
import type { ReleaseTask } from '../types'
import { calculateEffort } from '../types'

interface Props {
  isOpen: boolean
  task: ReleaseTask | null
  onClose: () => void
  onSuccess?: () => void
}

const QUICK_HOUR_PRESETS = [0.5, 1, 2, 3, 4, 8]

export function AddReleaseTimeLogModal({
  isOpen,
  task,
  onClose,
  onSuccess
}: Props) {
  useBodyScrollLock(isOpen)
  const { user, profile } = useAppStore()
  const { toast } = useToast()
  const { logWorkHours } = useReleaseTrackerStore()

  const [hoursAdded, setHoursAdded] = useState<string>('2')
  const [comment, setComment] = useState<string>('')
  const [testerName, setTesterName] = useState<string>('')
  const [workDate, setWorkDate] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && task) {
      setHoursAdded('2')
      setComment('')
      setErrorMsg(null)
      const currentUserName =
        (profile?.full_name as string) ||
        (user?.user_metadata?.full_name as string) ||
        user?.email?.split('@')[0] ||
        task.assigned_to_name ||
        'QA Tester'
      setTesterName(currentUserName)

      const now = new Date()
      setWorkDate(now.toISOString().split('T')[0])
    }
  }, [isOpen, task, user, profile])

  if (!isOpen || !task) return null

  const parsedHours = parseFloat(hoursAdded) || 0
  const currentActual = Number(task.actual_hours) || 0
  const estimated = Number(task.estimated_hours) || 0
  const nextActual = Math.round((currentActual + parsedHours) * 100) / 100
  const newEffort = calculateEffort(estimated, nextActual)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (parsedHours <= 0) {
      setErrorMsg('Please enter a duration greater than 0 hours.')
      return
    }

    try {
      setIsSubmitting(true)
      const actorName =
        (profile?.full_name as string) ||
        (user?.user_metadata?.full_name as string) ||
        user?.email ||
        testerName ||
        'QA Tester'

      const result = await logWorkHours(
        {
          task_id: task.task_id,
          release_task_id: task.id,
          user_name: testerName.trim() || actorName,
          user_id: user?.id,
          hours_added: parsedHours,
          comment: comment.trim(),
          date: workDate || new Date().toISOString().split('T')[0],
          logged_at: new Date().toISOString()
        },
        { name: actorName, id: user?.id }
      )

      toast({
        title: 'Work Hours Logged',
        description: `Added +${parsedHours}h to ${task.task_id} (${task.release_version}). Total Actual: ${result.updatedTask.actual_hours}h`
      })

      onClose()
      onSuccess?.()
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to log hours')
      toast({
        variant: 'destructive',
        title: 'Logging Failed',
        description: err.message || 'Could not record time log'
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isSubmitting && onClose()}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-surface border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto z-10"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-surface-elevated/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Log Effort to {task.task_id}
                </h3>
                <p className="text-xs text-text-muted">
                  {task.product_name} • {task.release_version}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Quick Presets */}
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wider text-text-muted block mb-1.5">
                Quick Duration Presets
              </label>
              <div className="grid grid-cols-6 gap-1.5">
                {QUICK_HOUR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setHoursAdded(String(preset))}
                    className={`h-8 rounded-lg text-xs font-semibold border transition-all ${
                      parsedHours === preset
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : 'bg-surface-elevated hover:bg-surface border-white/10 text-text-muted hover:text-text-primary'
                    }`}
                  >
                    +{preset}h
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Hours Input */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Hours Added <span className="text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="100"
                value={hoursAdded}
                onChange={(e) => setHoursAdded(e.target.value)}
                placeholder="e.g. 2, 3.5"
                className="w-full h-9 bg-surface-elevated border border-white/10 rounded-xl px-3 text-xs font-mono font-bold text-text-primary focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
            </div>

            {/* Live Calculation Preview Card */}
            <div className="p-3.5 rounded-xl border border-white/10 bg-surface-elevated/40 space-y-2">
              <span className="text-[11px] font-bold text-text-muted uppercase tracking-wider block">
                Live Calculation Preview
              </span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2 rounded bg-surface border border-white/5">
                  <span className="text-[10px] text-text-muted block">Estimated</span>
                  <span className="font-bold text-text-primary">{estimated}h</span>
                </div>
                <div className="p-2 rounded bg-surface border border-white/5">
                  <span className="text-[10px] text-text-muted block">New Actual</span>
                  <span className="font-bold text-purple-300">
                    {currentActual} + {parsedHours} = {nextActual}h
                  </span>
                </div>
                <div className="p-2 rounded bg-surface border border-white/5">
                  <span className="text-[10px] text-text-muted block">
                    {newEffort.isOverrun ? 'Overrun' : 'Remaining'}
                  </span>
                  <span className={`font-bold ${newEffort.isOverrun ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {newEffort.isOverrun ? `+${newEffort.overrunHrs}h` : `${newEffort.remainingHrs}h`}
                  </span>
                </div>
              </div>

              {newEffort.isOverrun && (
                <div className="flex items-center gap-1.5 text-xs text-rose-400 pt-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Warning: This addition exceeds the estimated effort.</span>
                </div>
              )}
            </div>

            {/* Tester & Date Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Tester / User
                </label>
                <input
                  type="text"
                  value={testerName}
                  onChange={(e) => setTesterName(e.target.value)}
                  className="w-full h-9 bg-surface-elevated border border-white/10 rounded-xl px-3 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Work Date
                </label>
                <input
                  type="date"
                  value={workDate}
                  onChange={(e) => setWorkDate(e.target.value)}
                  className="w-full h-9 bg-surface-elevated border border-white/10 rounded-xl px-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Work Done / Comment
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="e.g. Initial testing, Regression pass, API validation..."
                className="w-full bg-surface-elevated border border-white/10 rounded-xl p-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-purple-400"
              />
            </div>

            {errorMsg && (
              <div className="flex items-center gap-1.5 text-xs text-rose-400">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Footer */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="h-9 px-4 rounded-xl border border-white/10 text-xs font-medium text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="h-9 px-5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-md shadow-purple-600/20 flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add {parsedHours > 0 ? `+${parsedHours}h` : 'Hours'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
