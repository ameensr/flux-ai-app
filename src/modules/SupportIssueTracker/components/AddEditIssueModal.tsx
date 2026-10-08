// src/modules/SupportIssueTracker/components/AddEditIssueModal.tsx
// Modal for adding or editing support issues.
// Populates Product dropdown dynamically from Project Hub (/project-hub)
// Populates Tester dropdown from configured employees.
// Validates mandatory fields before saving.
// Fixed sticky footer ensures Save/Cancel buttons are ALWAYS visible regardless of scroll.

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Edit3, PlusCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useAppStore } from '@/store/useAppStore'
import { useSupportTrackerStore } from '../store'
import type { SupportIssue } from '../types'
import { calculateEffort } from '../types'

interface Props {
  isOpen: boolean
  issueToEdit: SupportIssue | null
  onClose: () => void
  onSaveSuccess?: () => void
}

export function AddEditIssueModal({ isOpen, issueToEdit, onClose, onSaveSuccess }: Props) {
  useBodyScrollLock(isOpen)
  const { toast } = useToast()
  const { user, profile } = useAppStore()
  const { products, dropdownConfigs, issues, addOrUpdateIssue } = useSupportTrackerStore()

  // Ref guard: prevents double-submission on rapid clicks
  const submitRef = useRef(false)

  // Form states
  const [projectId, setProjectId] = useState('')
  const [issueId, setIssueId] = useState('')
  const [description, setDescription] = useState('')
  const [receivedDate, setReceivedDate] = useState('')
  const [startDate, setStartDate] = useState('')
  const [finishDate, setFinishDate] = useState('')
  const [testerName, setTesterName] = useState('')
  const [estimatedHours, setEstimatedHours] = useState<number | string>(0)
  const [actualHours, setActualHours] = useState<number | string>(0)
  const [testingStatus, setTestingStatus] = useState('Not Started')
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Initialize form when modal opens — depend only on isOpen + issueToEdit?.id to avoid stale closure
  useEffect(() => {
    if (!isOpen) {
      submitRef.current = false
      return
    }

    if (issueToEdit) {
      setProjectId(issueToEdit.project_id || products[0]?.id || '')
      setIssueId(issueToEdit.issue_id || '')
      setDescription(issueToEdit.description || '')
      setReceivedDate(issueToEdit.received_date || new Date().toISOString().split('T')[0])
      setStartDate(issueToEdit.start_date || '')
      setFinishDate(issueToEdit.finish_date || '')
      const matchTester = dropdownConfigs.testers.find(
        t => t.value.toLowerCase() === (issueToEdit.tester_name || '').toLowerCase()
      )
      setTesterName(
        matchTester
          ? matchTester.value
          : issueToEdit.tester_name === 'Unassigned' || !issueToEdit.tester_name
          ? 'Unassigned'
          : issueToEdit.tester_name.toUpperCase()
      )
      setEstimatedHours(issueToEdit.estimated_hours ?? 0)
      setActualHours(issueToEdit.actual_hours ?? 0)
      setTestingStatus(issueToEdit.testing_status || 'Not Started')
      setComments(issueToEdit.comments || '')
    } else {
      // Snapshot issues at open time to avoid stale closure
      const currentMax = issues.length > 0 ? Math.max(...issues.map(i => i.sl_no || 0)) : 0
      const nextNum = 1024 + currentMax + 1
      setProjectId(products[0]?.id || '')
      setIssueId(`SUP-${nextNum}`)
      setDescription('')
      setReceivedDate(new Date().toISOString().split('T')[0])
      setStartDate('')
      setFinishDate('')
      setTesterName(dropdownConfigs.testers.find(t => t.is_active)?.value?.toUpperCase() || 'Unassigned')
      setEstimatedHours(0)
      setActualHours(0)
      setTestingStatus('Not Started')
      setComments('')
    }
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, issueToEdit?.id])

  // Live effort calculation preview
  const effortCalc = calculateEffort(Number(estimatedHours) || 0, Number(actualHours) || 0)

  const validateForm = () => {
    const errs: Record<string, string> = {}
    if (!projectId) errs.projectId = 'Please select a Product from Project Hub'
    if (!description.trim()) errs.description = 'Support issue description is required'
    if (!receivedDate) errs.receivedDate = 'Received date is required'
    if (Number(estimatedHours) < 0) errs.estimatedHours = 'Estimated hours cannot be negative'
    if (!testingStatus) errs.testingStatus = 'Testing status is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    // Prevent double-submission
    if (submitRef.current || saving) return
    submitRef.current = true
    setSaving(true)

    try {
      const selectedProject = products.find(p => p.id === projectId)
      const currentUser = {
        name: (profile?.full_name || user?.user_metadata?.full_name || user?.email || 'System User') as string,
        id: user?.id
      }

      await addOrUpdateIssue(
        {
          id: issueToEdit?.id,
          project_id: projectId,
          product_name: selectedProject?.name || 'Unknown Product',
          product_code: selectedProject?.project_code || undefined,
          issue_id: issueId.trim(),
          description: description.trim(),
          received_date: receivedDate,
          start_date: startDate || null,
          finish_date: finishDate || null,
          tester_name: testerName && testerName !== 'Unassigned' ? testerName.trim().toUpperCase() : 'Unassigned',
          estimated_hours: Number(estimatedHours) || 0,
          actual_hours: Number(actualHours) || 0,
          testing_status: testingStatus,
          comments: comments.trim()
        },
        currentUser
      )

      toast({
        title: issueToEdit ? 'Issue Updated' : 'Support Issue Created',
        description: `Successfully ${issueToEdit ? 'saved changes to' : 'created'} ${issueId}`
      })

      onSaveSuccess?.()
      onClose()
    } catch (err: any) {
      console.error('Failed saving support issue:', err)
      // Reset guard so user can retry
      submitRef.current = false
      toast({
        variant: 'destructive',
        title: 'Error Saving Issue',
        description: err.message || 'An unexpected error occurred while saving'
      })
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-sm overflow-hidden"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-surface-elevated border border-white/15 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden"
          style={{ backgroundColor: 'var(--modal-bg, #141c2b)' }}
        >
          {/* ── Fixed Modal Header ────────────────────────────────────────────── */}
          <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between shrink-0 bg-surface/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                {issueToEdit ? <Edit3 className="w-5 h-5" /> : <PlusCircle className="w-5 h-5" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-text-primary">
                    {issueToEdit ? 'Edit Support Issue' : 'Add Support Issue'}
                  </h3>
                  {issueToEdit && (
                    <Badge variant="outline" className="font-mono text-accent border-accent/30 text-xs">
                      {issueToEdit.issue_id}
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  Products are dynamically sourced from Project Hub as single source of truth
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* ── Form with Independent Scrollable Body & Sticky Footer ─────────── */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            {/* Scrollable Form Body */}
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-5 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* 1. Product Dropdown (from Project Hub) */}
                <div>
                  <label className="text-xs font-semibold text-text-primary block mb-1">
                    Product <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                    className="w-full h-10 bg-surface border border-white/15 rounded-xl px-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer"
                  >
                    <option value="" disabled>Select Product from Project Hub</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.project_code ? `(${p.project_code})` : ''}
                      </option>
                    ))}
                  </select>
                  {errors.projectId && (
                    <span className="text-[11px] text-rose-400 mt-1 block font-medium">{errors.projectId}</span>
                  )}
                </div>

                {/* 2. Support Issue ID */}
                <div>
                  <label className="text-xs font-semibold text-text-primary block mb-1">
                    Support Issue ID <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={issueId}
                    onChange={(e) => setIssueId(e.target.value)}
                    placeholder="e.g. SUP-1025"
                    className="w-full h-10 bg-surface border border-white/15 rounded-xl px-3 font-mono text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50"
                  />
                </div>
              </div>

              {/* 3. Description */}
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">
                  Support Issue Description <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the defect, behavior, reproduction summary..."
                  className="w-full bg-surface border border-white/15 rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none leading-relaxed"
                />
                {errors.description && (
                  <span className="text-[11px] text-rose-400 mt-1 block font-medium">{errors.description}</span>
                )}
              </div>

              {/* 4. Dates row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-text-primary block mb-1">
                    Received Date <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="date"
                    value={receivedDate}
                    onChange={(e) => setReceivedDate(e.target.value)}
                    className="w-full h-10 bg-surface border border-white/15 rounded-xl px-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer"
                  />
                  {errors.receivedDate && (
                    <span className="text-[11px] text-rose-400 mt-1 block font-medium">{errors.receivedDate}</span>
                  )}
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-primary block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full h-10 bg-surface border border-white/15 rounded-xl px-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-primary block mb-1">
                    Finish Date
                  </label>
                  <input
                    type="date"
                    value={finishDate}
                    onChange={(e) => setFinishDate(e.target.value)}
                    className="w-full h-10 bg-surface border border-white/15 rounded-xl px-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer"
                  />
                </div>
              </div>

              {/* 5. Tester & Testing Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-text-primary block mb-1">
                    Who's Testing (Tester)
                  </label>
                  <select
                    value={testerName}
                    onChange={(e) => setTesterName(e.target.value)}
                    className="w-full h-10 bg-surface border border-white/15 rounded-xl px-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer"
                  >
                    <option value="Unassigned">Unassigned</option>
                    {dropdownConfigs.testers.filter(t => t.is_active).map((t) => (
                      <option key={t.id} value={t.value.toUpperCase()}>
                        {t.label.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-text-primary block mb-1">
                    Testing Status <span className="text-rose-400">*</span>
                  </label>
                  <select
                    value={testingStatus}
                    onChange={(e) => setTestingStatus(e.target.value)}
                    className="w-full h-10 bg-surface border border-white/15 rounded-xl px-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 cursor-pointer"
                  >
                    {dropdownConfigs.testing_status.filter(ts => ts.is_active).map((ts) => (
                      <option key={ts.id} value={ts.value}>
                        {ts.label}
                      </option>
                    ))}
                  </select>
                  {errors.testingStatus && (
                    <span className="text-[11px] text-rose-400 mt-1 block font-medium">{errors.testingStatus}</span>
                  )}
                </div>
              </div>

              {/* 6. Estimation & Actual Hours with Live Indicator Preview */}
              <div className="p-4 rounded-xl bg-surface/80 border border-white/10 space-y-3">
                <div className="text-xs font-semibold text-text-primary flex items-center justify-between">
                  <span>Effort & Hours Calculation</span>
                  <Badge variant="outline" className="text-[10px] font-mono border-white/15 text-accent">
                    Live Formula Preview
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-medium text-text-muted block mb-1">
                      Estimation Hrs
                    </label>
                    <input
                      type="number"
                      step="0.25"
                      min="0"
                      value={estimatedHours}
                      onChange={(e) => setEstimatedHours(e.target.value)}
                      className="w-full h-9 bg-surface-elevated border border-white/10 rounded-lg px-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent font-mono"
                    />
                    {errors.estimatedHours && (
                      <span className="text-[11px] text-rose-400 mt-1 block">{errors.estimatedHours}</span>
                    )}
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-text-muted block mb-1">
                      Total Actual Hrs (Time Logged)
                    </label>
                    {issueToEdit ? (
                      <div className="h-9 bg-surface-elevated/60 border border-white/10 rounded-lg px-2.5 flex items-center justify-between text-xs text-text-primary font-mono font-bold">
                        <span>{actualHours || 0} hrs</span>
                        <span className="text-[10px] text-accent font-sans font-normal">Cumulative</span>
                      </div>
                    ) : (
                      <div className="h-9 bg-surface-elevated/40 border border-white/10 rounded-lg px-2.5 flex items-center justify-between text-xs text-text-muted font-mono">
                        <span>0 hrs</span>
                        <span className="text-[10px] text-text-muted font-sans">Via Time Log</span>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-text-muted italic">
                  * Actual hours are cumulative and managed via the progressive Time Log system to maintain QA auditability.
                </p>

                {/* Calculation outcome banner */}
                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-text-muted">Remaining Hrs: </span>
                    {effortCalc.isOverrun ? (
                      <span className="font-bold text-rose-400">
                        Overrun: {effortCalc.overrunHrs} Hrs
                      </span>
                    ) : (
                      <span className="font-bold text-text-primary">
                        {effortCalc.remainingHrs} Hrs
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-text-muted">Status:</span>
                    {effortCalc.indicatorState === 'on_track' && (
                      <span className="text-emerald-400 font-semibold">🟢 On Track ({effortCalc.percentage}%)</span>
                    )}
                    {effortCalc.indicatorState === 'attention' && (
                      <span className="text-amber-400 font-semibold">🟡 Attention ({effortCalc.percentage}%)</span>
                    )}
                    {effortCalc.indicatorState === 'overrun' && (
                      <span className="text-rose-400 font-semibold">🔴 Overrun ({effortCalc.percentage}%)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* 7. Comments */}
              <div>
                <label className="text-xs font-semibold text-text-primary block mb-1">
                  Comments / Test Notes
                </label>
                <textarea
                  rows={2}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Additional context, blocker details, or test execution remarks..."
                  className="w-full bg-surface border border-white/15 rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none leading-relaxed"
                />
              </div>
            </div>

            {/* ── Fixed Sticky Footer (Always Visible, Never Cut Off!) ────────── */}
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3 shrink-0 bg-surface/80 backdrop-blur-sm">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-accent hover:bg-accent-hover text-white transition-all shadow-lg shadow-accent/25 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saving...' : issueToEdit ? 'Update Issue' : 'Save Support Issue'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
