// src/modules/SupportIssueTracker/components/EditTimeLogModal.tsx
// Modal for correcting an existing time-log entry (hours and/or comment).
// Requires a mandatory correction reason. Records full audit trail.

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Edit3, X, AlertCircle, CheckCircle2, ArrowRight, Flame } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useToast } from '@/hooks/use-toast'
import { useSupportTrackerStore } from '../store'
import type { SupportIssue, SupportIssueTimeLog } from '../types'
import { calculateEffort } from '../types'

interface Props {
  isOpen: boolean
  issue: SupportIssue | null
  log: SupportIssueTimeLog | null
  onClose: () => void
  onSuccess?: () => void
}

const CORRECTION_REASON_PRESETS = [
  'Entered the wrong number of hours by mistake.',
  'Logged hours against the wrong issue.',
  'Duplicate entry — removing excess hours.',
  'Actual work took less time than initially recorded.',
  'Actual work took more time than initially recorded.',
]

export function EditTimeLogModal({ isOpen, issue, log, onClose, onSuccess }: Props) {
  useBodyScrollLock(isOpen)
  const { user, profile } = useAppStore()
  const { toast } = useToast()
  const { editTimeLog } = useSupportTrackerStore()

  const [hoursAdded, setHoursAdded] = useState<string>('')
  const [comment, setComment] = useState<string>('')
  const [correctionReason, setCorrectionReason] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (isOpen && log) {
      setHoursAdded(String(log.hours_added))
      setComment(log.comment || '')
      setCorrectionReason('')
      setErrorMsg(null)
      setShowConfirm(false)
      setIsSubmitting(false)
    }
  }, [isOpen, log])

  if (!isOpen || !issue || !log) return null

  const parsedHours = parseFloat(hoursAdded) || 0
  const oldHours = Number(log.hours_added)
  const diff = Math.round((parsedHours - oldHours) * 100) / 100
  const currentActual = Number(issue.actual_hours) || 0
  const estimated = Number(issue.estimated_hours) || 0
  const projectedActual = Math.round((currentActual - oldHours + parsedHours) * 100) / 100
  const newEffort = calculateEffort(estimated, projectedActual)

  const formatLogDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr)
      if (isNaN(d.getTime())) return dateStr
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    } catch { return dateStr }
  }

  const validate = (): string | null => {
    if (parsedHours <= 0 || isNaN(parsedHours)) return 'Corrected hours must be a valid number greater than zero.'
    if (!correctionReason.trim()) return 'A reason for correction is required.'
    return null
  }

  const handleRequestSave = (e: React.FormEvent) => {
    e.preventDefault()
    const err = validate()
    if (err) { setErrorMsg(err); return }
    setErrorMsg(null)
    setShowConfirm(true)
  }

  const handleConfirmSave = async () => {
    const err = validate()
    if (err) { setErrorMsg(err); setShowConfirm(false); return }

    try {
      setIsSubmitting(true)
      const actorName =
        (profile?.full_name as string) ||
        (user?.user_metadata?.full_name as string) ||
        user?.email || 'System User'

      await editTimeLog(
        log.id,
        { hours_added: parsedHours, comment: comment.trim(), correction_reason: correctionReason.trim() },
        { name: actorName, id: user?.id }
      )

      toast({
        title: 'Time Log Corrected',
        description: `Updated from ${oldHours}h → ${parsedHours}h (${diff >= 0 ? '+' : ''}${diff}h). Totals recalculated.`
      })
      onSuccess?.()
      onClose()
    } catch (err: any) {
      console.error('[EditTimeLogModal] error:', err)
      setErrorMsg(err?.message || 'Failed to save correction. Please try again.')
      setShowConfirm(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !isSubmitting && onClose()}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="relative z-10 w-full max-w-lg bg-surface border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
        >
          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-border/40 flex items-center justify-between bg-surface-secondary/40 shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-text-primary">Correct Time Log</h3>
                  <span className="px-2 py-0.5 rounded-md bg-accent/10 border border-accent/25 text-accent font-mono text-xs font-bold">
                    {issue.issue_id}
                  </span>
                </div>
                <p className="text-xs text-text-muted mt-0.5 line-clamp-1">
                  {issue.product_name} • Logged by {log.user_name} on {formatLogDate(log.logged_at)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => !isSubmitting && onClose()}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Confirmation overlay */}
          {showConfirm && (
            <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-xs rounded-2xl">
              <div className="bg-surface border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl space-y-4">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">Confirm Correction</p>
                    <p className="text-xs text-text-muted">This will update the time log and recalculate all totals.</p>
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-surface-secondary/60 border border-border/40 text-xs space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-text-muted w-24 shrink-0">Hours:</span>
                    <span className="text-rose-400 line-through font-mono">{oldHours}h</span>
                    <ArrowRight className="w-3 h-3 text-text-muted" />
                    <span className="text-emerald-400 font-bold font-mono">{parsedHours}h</span>
                    <span className={`font-mono text-[11px] ${diff < 0 ? 'text-rose-400' : diff > 0 ? 'text-emerald-400' : 'text-text-muted'}`}>
                      ({diff >= 0 ? '+' : ''}{diff}h)
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="text-text-muted w-24 shrink-0">Reason:</span>
                    <span className="text-text-secondary italic">{correctionReason}</span>
                  </div>
                </div>
                <div className="flex gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowConfirm(false)}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 rounded-xl border border-border/50 text-xs font-semibold text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors disabled:opacity-50"
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSave}
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-all shadow-md flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{isSubmitting ? 'Saving...' : 'Save Correction'}</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRequestSave} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Original entry summary */}
            <div className="p-3.5 rounded-xl bg-surface-secondary/60 border border-border/40 text-xs space-y-1.5">
              <p className="text-[10px] uppercase font-semibold text-text-muted tracking-wider">Original Entry</p>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Logged hours:</span>
                <span className="font-bold font-mono text-text-primary">{oldHours}h</span>
              </div>
              <div className="flex items-start justify-between gap-2">
                <span className="text-text-muted shrink-0">Comment:</span>
                <span className="text-text-secondary text-right italic">{log.comment || '(none)'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-text-muted">Logged by:</span>
                <span className="font-medium text-text-primary">{log.user_name}</span>
              </div>
            </div>

            {/* Corrected Hours */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Corrected Hours <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.25"
                  min="0.01"
                  max="999"
                  value={hoursAdded}
                  onChange={(e) => setHoursAdded(e.target.value)}
                  placeholder="e.g. 2.5"
                  required
                  className="w-full h-10 px-3 text-sm bg-surface-elevated border border-border/50 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-mono font-bold"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-muted">hours</span>
              </div>
              {parsedHours > 0 && parsedHours !== oldHours && (
                <p className={`text-[11px] mt-1.5 font-mono ${diff < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {diff >= 0 ? '+' : ''}{diff}h from original ({oldHours}h → {parsedHours}h)
                </p>
              )}
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Work Description / Notes <span className="text-text-muted text-[10px] font-normal">(Optional)</span>
              </label>
              <textarea
                rows={2}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Update the work description if needed..."
                className="w-full p-3 text-xs bg-surface-elevated border border-border/50 rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-accent/50 leading-relaxed resize-none"
              />
            </div>

            {/* Correction Reason — mandatory */}
            <div>
              <label className="block text-xs font-semibold text-text-primary mb-1.5">
                Reason for Correction <span className="text-rose-400">*</span>
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {CORRECTION_REASON_PRESETS.map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setCorrectionReason(preset)}
                    className={`px-2 py-1 rounded-lg text-[11px] font-medium transition-colors text-left ${
                      correctionReason === preset
                        ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
                        : 'bg-surface-secondary hover:bg-surface-elevated text-text-muted border border-border/30'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>
              <textarea
                rows={2}
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                placeholder="Required: Explain why this time log is being corrected..."
                required
                className={`w-full p-3 text-xs bg-surface-elevated border rounded-xl text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-amber-500/50 leading-relaxed resize-none ${
                  !correctionReason.trim() ? 'border-amber-500/40' : 'border-border/50'
                }`}
              />
              {!correctionReason.trim() && (
                <p className="text-[11px] text-amber-400 mt-1">This field is required before saving.</p>
              )}
            </div>

            {/* Live impact preview */}
            {parsedHours > 0 && (
              <div className="p-3 rounded-xl bg-surface-secondary/60 border border-border/40 text-xs space-y-1.5">
                <p className="text-[10px] uppercase font-semibold text-text-muted tracking-wider">Impact Preview</p>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">New Actual / Effort:</span>
                  <span className="font-bold font-mono text-indigo-400">{projectedActual}h</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-text-muted">Remaining Hrs:</span>
                  {newEffort.isOverrun ? (
                    <span className="font-bold font-mono text-rose-400 flex items-center gap-1">
                      <Flame className="w-3 h-3" />Overrun {newEffort.overrunHrs}h
                    </span>
                  ) : (
                    <span className="font-bold font-mono text-emerald-400">{newEffort.remainingHrs}h</span>
                  )}
                </div>
              </div>
            )}
          </form>

          {/* Footer */}
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
              disabled={isSubmitting || parsedHours <= 0 || !correctionReason.trim()}
              onClick={handleRequestSave}
              className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-white text-xs font-bold transition-all shadow-md shadow-amber-500/25 flex items-center gap-1.5 disabled:opacity-50"
            >
              <Edit3 className="w-4 h-4" />
              <span>Review & Save</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
