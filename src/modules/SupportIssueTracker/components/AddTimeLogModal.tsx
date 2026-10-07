// src/modules/SupportIssueTracker/components/AddTimeLogModal.tsx
// Modal for incrementally adding QA / Support work hours to an issue.
// Cumulative time-log system ensuring auditability and effort tracking.

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Clock, Plus, X, Calendar, User, FileText, CheckCircle2,
  AlertCircle, Flame, Sparkles
} from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useToast } from '@/hooks/use-toast'
import { useSupportTrackerStore } from '../store'
import type { SupportIssue } from '../types'
import { calculateEffort } from '../types'

interface Props {
  isOpen: boolean
  issue: SupportIssue | null
  onClose: () => void
  onSuccess?: () => void
}

const QUICK_HOUR_PRESETS = [0.5, 1, 2, 3, 4, 8]

export function AddTimeLogModal({ isOpen, issue, onClose, onSuccess }: Props) {
  useBodyScrollLock(isOpen)
  const { user, profile } = useAppStore()
  const { toast } = useToast()
  const { logWorkHours, dropdownConfigs } = useSupportTrackerStore()

  const [hoursAdded, setHoursAdded] = useState<string>('2')
  const [comment, setComment] = useState<string>('')
  const [testerName, setTesterName] = useState<string>('')
  const [loggedDate, setLoggedDate] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Initialize form when modal opens with target issue
  useEffect(() => {
    if (isOpen && issue) {
      setHoursAdded('2')
      setComment('')
      setErrorMsg(null)
      // Default tester to current user full name, email, or issue assigned tester (ALL CAPS)
      const currentUserName =
        profile?.full_name ||
        user?.user_metadata?.full_name ||
        user?.user_metadata?.name ||
        issue.tester_name ||
        'AMEEN'
      setTesterName(currentUserName.toUpperCase())

      // Default date to current local date and time formatted for datetime-local
      const now = new Date()
      const tzOffset = now.getTimezoneOffset() * 60000
      const localISOTime = new Date(now.getTime() - tzOffset).toISOString().slice(0, 16)
      setLoggedDate(localISOTime)
    }
  }, [isOpen, issue, user, profile])

  if (!isOpen || !issue) return null

  const parsedHours = parseFloat(hoursAdded) || 0
  const currentActual = Number(issue.actual_hours) || 0
  const estimated = Number(issue.estimated_hours) || 0
  const nextActual = Math.round((currentActual + parsedHours) * 100) / 100
  const newEffort = calculateEffort(estimated, nextActual)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)

    if (parsedHours <= 0) {
      setErrorMsg('Please enter a valid duration of work hours greater than 0.')
      return
    }

    try {
      setIsSubmitting(true)
      const actorName =
        (user?.user_metadata?.full_name as string) ||
        (user?.user_metadata?.name as string) ||
        user?.email ||
        testerName ||
        'QA Tester'

      await logWorkHours(
        {
          issue_id: issue.issue_id,
          support_issue_id: issue.id,
          user_name: (testerName || actorName).trim().toUpperCase(),
          user_id: user?.id,
          hours_added: parsedHours,
          comment: comment.trim(),
          logged_at: loggedDate ? new Date(loggedDate).toISOString() : new Date().toISOString()
        },
        { name: actorName, id: user?.id }
      )

      toast({
        title: 'Work Hours Logged',
        description: `Added +${parsedHours} hrs to ${issue.issue_id}. Total actual: ${nextActual} hrs`
      })

      onSuccess?.()
      onClose()
    } catch (err: any) {
      console.error('[AddTimeLogModal] error logging hours:', err)
      setErrorMsg(err?.message || 'Failed to record work hours. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 w-full max-w-lg bg-surface border border-white/10 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between bg-surface-secondary/40">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent shadow-xs">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-text-primary">
                    Log Work Hours
                  </h3>
                  <span className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/25 text-accent font-mono text-xs font-bold">
                    {issue.issue_id}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                  {issue.product_name} • {issue.description}
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

          {/* Form Content */}
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Current Effort Status Card */}
            <div className="p-3.5 rounded-xl bg-surface-secondary/60 border border-border/40 grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] text-text-muted uppercase font-semibold block">Estimated</span>
                <span className="font-bold text-text-primary text-sm font-mono">{estimated} hrs</span>
              </div>
              <div className="border-x border-border/30">
                <span className="text-[10px] text-text-muted uppercase font-semibold block">Logged So Far</span>
                <span className="font-bold text-indigo-400 text-sm font-mono">{currentActual} hrs</span>
              </div>
              <div>
                <span className="text-[10px] text-text-muted uppercase font-semibold block">Current Balance</span>
                <span className="font-bold text-text-primary text-sm font-mono">
                  {issue.overrun_hours > 0 ? (
                    <span className="text-rose-400">+{issue.overrun_hours}h Overrun</span>
                  ) : (
                    <span>{issue.remaining_hours} hrs rem</span>
                  )}
                </span>
              </div>
            </div>

            {/* Hours Input with Quick Chips */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Hours Added <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.25"
                  min="0.1"
                  max="100"
                  value={hoursAdded}
                  onChange={(e) => setHoursAdded(e.target.value)}
                  placeholder="e.g. 2.5"
                  required
                  className="w-full h-10 px-3 text-sm bg-surface-elevated border border-border/50 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono font-bold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted font-medium">
                  hours
                </span>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                <span className="text-[11px] text-text-muted mr-1">Quick Add:</span>
                {QUICK_HOUR_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setHoursAdded(String(preset))}
                    className={`px-2 py-0.5 rounded-lg text-xs font-mono font-medium transition-colors ${
                      parsedHours === preset
                        ? 'bg-accent text-white font-bold'
                        : 'bg-surface-secondary hover:bg-surface-elevated text-text-secondary border border-border/30'
                    }`}
                  >
                    +{preset}h
                  </button>
                ))}
              </div>
            </div>

            {/* Tester / User Name */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Who Performed Testing?
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={testerName}
                  onChange={(e) => setTesterName(e.target.value.toUpperCase())}
                  placeholder="Tester Name (e.g. AMEEN SR)"
                  className="w-full h-9 pl-9 pr-3 text-xs bg-surface-elevated border border-border/50 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 font-medium uppercase font-mono"
                />
              </div>
            </div>

            {/* Date / Timestamp */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Work Date & Time
              </label>
              <div className="relative">
                <Calendar className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="datetime-local"
                  value={loggedDate}
                  onChange={(e) => setLoggedDate(e.target.value)}
                  className="w-full h-9 pl-9 pr-3 text-xs bg-surface-elevated border border-border/50 rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 font-mono"
                />
              </div>
            </div>

            {/* Comment / Description of Work */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Work Description / QA Notes <span className="text-text-muted text-[10px] font-normal">(Optional)</span>
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Optional notes or test scenarios performed (e.g. Tested login and payment flow, regression check...)"
                className="w-full p-3 text-xs bg-surface-elevated border border-border/50 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 leading-relaxed resize-none"
              />
            </div>

            {/* Live Effort Impact Preview */}
            <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 text-xs">
              <div className="flex items-center justify-between font-medium">
                <span className="text-text-muted">Impact on Total Actual:</span>
                <span className="text-text-primary font-bold">
                  {currentActual}h + <strong className="text-accent">{parsedHours}h</strong> ={' '}
                  <strong className="text-accent font-mono">{nextActual} hrs</strong>
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 text-[11px]">
                <span className="text-text-muted">Calculated Status:</span>
                <span className="font-semibold flex items-center gap-1">
                  {newEffort.isOverrun ? (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <Flame className="w-3 h-3 text-rose-500" />
                      Overrun: {newEffort.overrunHrs} hrs
                    </span>
                  ) : (
                    <span className="text-emerald-400 font-semibold">
                      Remaining: {newEffort.remainingHrs} hrs ({newEffort.percentage}% of estimate)
                    </span>
                  )}
                </span>
              </div>
            </div>
          </form>

          {/* Sticky Modal Footer */}
          <div className="p-4 border-t border-border/40 bg-surface-secondary/40 flex items-center justify-end gap-2.5 shrink-0">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-border/50 hover:bg-white/5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isSubmitting || parsedHours <= 0}
              onClick={handleSubmit}
              className="px-5 py-2 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-md shadow-accent/25 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isSubmitting ? 'Logging...' : 'Add Work Hours'}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
