// src/modules/SupportIssueTracker/components/AddEditIssueModal.tsx

import React, { useState, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X, Check } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useAppStore } from '@/store/useAppStore'
import { EstimationLockControl } from '@/components/qa-operations/EstimationLockControl'
import { useSupportTrackerStore } from '../store'
import type { SupportIssue } from '../types'
import { calculateEffort } from '../types'

interface Props {
  isOpen: boolean
  issueToEdit: SupportIssue | null
  onClose: () => void
  onSaveSuccess?: () => void
}

const inputCls = 'w-full h-9 bg-transparent border border-border rounded-md px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-accent/60 transition-colors'
const selectCls = inputCls + ' cursor-pointer'
const labelCls = 'block text-xs font-medium text-text-muted mb-1'
const errorCls = 'text-[11px] text-rose-400 mt-0.5 block'

export function AddEditIssueModal({ isOpen, issueToEdit, onClose, onSaveSuccess }: Props) {
  useBodyScrollLock(isOpen)
  const { toast } = useToast()
  const { user, profile } = useAppStore()
  const { can } = usePermissions()
  const canLockEst = can('support-tracker', 'can_lock_estimated_hours')
  const canUnlockEst = can('support-tracker', 'can_unlock_estimated_hours')
  const canEditEst = can('support-tracker', 'can_edit_estimated_hours')

  const { products, dropdownConfigs, issues, addOrUpdateIssue, toggleEstimationLock } = useSupportTrackerStore()
  const submitRef = useRef(false)

  const [projectId, setProjectId] = useState('')
  const [issueId, setIssueId] = useState('')
  const [description, setDescription] = useState('')
  const [receivedDate, setReceivedDate] = useState('')
  const [receivedTime, setReceivedTime] = useState('')
  const [isQaMiss, setIsQaMiss] = useState('Not Applicable')
  const [testCaseCount, setTestCaseCount] = useState<number | string>(0)
  const [startDate, setStartDate] = useState('')
  const [plannedEndDate, setPlannedEndDate] = useState('')
  const [actualEndDate, setActualEndDate] = useState('')
  const [testerName, setTesterName] = useState('')
  const [estimatedHours, setEstimatedHours] = useState<number | string>(0)
  const [actualHours, setActualHours] = useState<number | string>(0)
  const [isEstLocked, setIsEstLocked] = useState(false)
  const [lockedBy, setLockedBy] = useState<string | null>(null)
  const [lockedAt, setLockedAt] = useState<string | null>(null)
  const [blockedHours, setBlockedHours] = useState<number | string>(0)
  const [testingStatus, setTestingStatus] = useState('Not Started')
  const [comments, setComments] = useState('')
  const [retestingStatus, setRetestingStatus] = useState('Not Required')
  const [retestingEstHrs, setRetestingEstHrs] = useState<number | string>(0)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!isOpen) { submitRef.current = false; return }

    if (issueToEdit) {
      setProjectId(issueToEdit.project_id || products[0]?.id || '')
      setIssueId(issueToEdit.issue_id || '')
      setDescription(issueToEdit.description || '')
      setReceivedDate(issueToEdit.received_date || new Date().toISOString().split('T')[0])
      setReceivedTime(issueToEdit.received_time || '')
      setIsQaMiss(issueToEdit.is_qa_miss || 'Not Applicable')
      setTestCaseCount(issueToEdit.test_case_count ?? 0)
      setStartDate(issueToEdit.start_date || '')
      setPlannedEndDate(issueToEdit.planned_end_date || '')
      setActualEndDate(issueToEdit.actual_end_date || '')
      const matchTester = dropdownConfigs.testers.find(
        t => t.value.toLowerCase() === (issueToEdit.tester_name || '').toLowerCase()
      )
      setTesterName(
        matchTester ? matchTester.value
          : issueToEdit.tester_name === 'Unassigned' || !issueToEdit.tester_name
          ? 'Unassigned' : issueToEdit.tester_name.toUpperCase()
      )
      setEstimatedHours(issueToEdit.estimated_hours ?? 0)
      setActualHours(issueToEdit.actual_hours ?? 0)
      setIsEstLocked(Boolean(issueToEdit.estimated_hours_locked))
      setLockedBy(issueToEdit.estimated_hours_locked_by || null)
      setLockedAt(issueToEdit.estimated_hours_locked_at || null)
      setBlockedHours(issueToEdit.blocked_hours ?? 0)
      setTestingStatus(issueToEdit.testing_status || 'Not Started')
      setComments(issueToEdit.comments || '')
      setRetestingStatus(issueToEdit.retesting_status || 'Not Required')
      setRetestingEstHrs(issueToEdit.retesting_estimation_hrs ?? 0)
    } else {
      const currentMax = issues.length > 0 ? Math.max(...issues.map(i => i.sl_no || 0)) : 0
      const nextNum = 1024 + currentMax + 1
      setProjectId(products[0]?.id || '')
      setIssueId(`SUP-${nextNum}`)
      setDescription('')
      setReceivedDate(new Date().toISOString().split('T')[0])
      setReceivedTime('')
      setIsQaMiss('Not Applicable')
      setTestCaseCount(0)
      setStartDate('')
      setPlannedEndDate('')
      setActualEndDate('')
      setTesterName(dropdownConfigs.testers.find(t => t.is_active)?.value?.toUpperCase() || 'Unassigned')
      setEstimatedHours(0)
      setActualHours(0)
      setIsEstLocked(false)
      setLockedBy(null)
      setLockedAt(null)
      setBlockedHours(0)
      setTestingStatus('Not Started')
      setComments('')
      setRetestingStatus('Not Required')
      setRetestingEstHrs(0)
    }
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, issueToEdit?.id])

  const effortCalc = calculateEffort(Number(estimatedHours) || 0, Number(actualHours) || 0)

  const validateForm = () => {
    const errs: Record<string, string> = {}
    if (!projectId) errs.projectId = 'Please select a Product from Project Hub'
    if (!description.trim()) errs.description = 'Support issue description is required'
    if (!receivedDate) errs.receivedDate = 'Received date is required'
    if (Number(estimatedHours) < 0) errs.estimatedHours = 'Estimated hours cannot be negative'
    if (!testingStatus) errs.testingStatus = 'Testing status is required'
    const tcc = Number(testCaseCount)
    if (isNaN(tcc) || tcc < 0 || !Number.isInteger(tcc)) errs.testCaseCount = 'Test Case Count must be a non-negative whole number'
    if (Number(retestingEstHrs) < 0) errs.retestingEstHrs = 'Retesting Estimation cannot be negative'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
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
          received_time: receivedTime || null,
          is_qa_miss: isQaMiss,
          test_case_count: Math.max(0, Math.floor(Number(testCaseCount) || 0)),
          start_date: startDate || null,
          planned_end_date: plannedEndDate || null,
          actual_end_date: actualEndDate || null,
          tester_name: testerName && testerName !== 'Unassigned' ? testerName.trim().toUpperCase() : 'Unassigned',
          estimated_hours: isEstLocked ? Number(issueToEdit?.estimated_hours ?? 0) : (Number(estimatedHours) || 0),
          actual_hours: Number(actualHours) || 0,
          blocked_hours: Number(blockedHours) || 0,
          testing_status: testingStatus,
          comments: comments.trim(),
          retesting_status: retestingStatus,
          retesting_estimation_hrs: Number(retestingEstHrs) || 0
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
      submitRef.current = false
      toast({ variant: 'destructive', title: 'Error Saving Issue', description: err.message || 'An unexpected error occurred' })
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-[2px]"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-2xl bg-surface border border-border rounded-lg shadow-xl flex flex-col max-h-[92vh] overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                {issueToEdit ? `Edit Issue — ${issueToEdit.issue_id}` : 'Add Support Issue'}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">Products sourced from Project Hub</p>
            </div>
            <button type="button" onClick={onClose} className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-white/8 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4 space-y-4">

              {/* Product + Issue ID */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Product <span className="text-rose-400">*</span></label>
                  <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className={selectCls}>
                    <option value="" disabled>Select Product</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}{p.project_code ? ` (${p.project_code})` : ''}</option>
                    ))}
                  </select>
                  {errors.projectId && <span className={errorCls}>{errors.projectId}</span>}
                </div>
                <div>
                  <label className={labelCls}>Issue ID <span className="text-rose-400">*</span></label>
                  <input type="text" value={issueId} onChange={(e) => setIssueId(e.target.value)}
                    placeholder="e.g. SUP-1025"
                    className={inputCls + ' font-mono'} />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className={labelCls}>Description <span className="text-rose-400">*</span></label>
                <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the production/support issue..."
                  className="w-full bg-transparent border border-border rounded-md p-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-accent/60 resize-none leading-relaxed transition-colors" />
                {errors.description && <span className={errorCls}>{errors.description}</span>}
              </div>

              {/* Received Date + Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Received Date <span className="text-rose-400">*</span></label>
                  <input type="date" value={receivedDate} onChange={(e) => setReceivedDate(e.target.value)} className={inputCls} />
                  {errors.receivedDate && <span className={errorCls}>{errors.receivedDate}</span>}
                </div>
                <div>
                  <label className={labelCls}>Received Time</label>
                  <input type="time" value={receivedTime} onChange={(e) => setReceivedTime(e.target.value)} className={inputCls + ' font-mono'} />
                </div>
              </div>

              {/* QA Engineer + QA Miss */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>QA Engineer</label>
                  <select value={testerName} onChange={(e) => setTesterName(e.target.value)} className={selectCls}>
                    <option value="Unassigned">Unassigned</option>
                    {dropdownConfigs.testers.filter(t => t.is_active).map((t) => (
                      <option key={t.id} value={t.value.toUpperCase()}>{t.label.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Is QA Miss?</label>
                  <select value={isQaMiss} onChange={(e) => setIsQaMiss(e.target.value)} className={selectCls}>
                    {dropdownConfigs.is_qa_miss.filter(o => o.is_active).map((o) => (
                      <option key={o.id} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Test Case Count + Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Test Case Count</label>
                  <input type="number" min="0" step="1" value={testCaseCount}
                    onChange={(e) => setTestCaseCount(e.target.value)}
                    className={inputCls + ' font-mono'} />
                  {errors.testCaseCount && <span className={errorCls}>{errors.testCaseCount}</span>}
                </div>
                <div>
                  <label className={labelCls}>Status <span className="text-rose-400">*</span></label>
                  <select value={testingStatus} onChange={(e) => setTestingStatus(e.target.value)} className={selectCls}>
                    {dropdownConfigs.testing_status.filter(ts => ts.is_active).map((ts) => (
                      <option key={ts.id} value={ts.value}>{ts.label}</option>
                    ))}
                  </select>
                  {errors.testingStatus && <span className={errorCls}>{errors.testingStatus}</span>}
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Actual Start Date</label>
                  <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Planned End Date</label>
                  <input type="date" value={plannedEndDate} onChange={(e) => setPlannedEndDate(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Actual End Date</label>
                  <input type="date" value={actualEndDate} onChange={(e) => setActualEndDate(e.target.value)} className={inputCls} />
                </div>
              </div>

              {/* Effort & Hours */}
              <div className="border border-border rounded-md p-3.5 space-y-3">
                <p className="text-xs font-semibold text-text-primary">Effort & Hours</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className={labelCls + ' mb-0'}>
                        Estimation (Hrs)
                        {isEstLocked && <span className="ml-1.5 text-[10px] text-amber-400">🔒 Locked</span>}
                      </label>
                      {issueToEdit && (
                        <EstimationLockControl
                          isLocked={isEstLocked} canLock={canLockEst} canUnlock={canUnlockEst}
                          lockedBy={lockedBy} lockedAt={lockedAt ? new Date(lockedAt).toLocaleString() : null}
                          size="xs"
                          onToggleLock={async (shouldLock) => {
                            try {
                              const updated = await toggleEstimationLock(issueToEdit.id, shouldLock, {
                                name: (profile?.full_name || user?.user_metadata?.full_name || user?.email || 'System User') as string,
                                id: user?.id
                              })
                              setIsEstLocked(shouldLock)
                              setLockedBy(updated.estimated_hours_locked_by || null)
                              setLockedAt(updated.estimated_hours_locked_at || null)
                              if (shouldLock) setEstimatedHours(updated.estimated_hours)
                              toast({ title: shouldLock ? 'Estimation Locked' : 'Estimation Unlocked' })
                            } catch (err: any) {
                              toast({ title: 'Lock Action Failed', description: err?.message, variant: 'destructive' })
                            }
                          }}
                        />
                      )}
                    </div>
                    <input type="number" step="0.25" min="0" value={estimatedHours}
                      disabled={isEstLocked || !canEditEst}
                      onChange={(e) => setEstimatedHours(e.target.value)}
                      className={`w-full h-9 bg-transparent border rounded-md px-3 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors ${isEstLocked || !canEditEst ? 'opacity-60 cursor-not-allowed border-amber-500/30' : 'border-border'}`} />
                    {errors.estimatedHours && <span className={errorCls}>{errors.estimatedHours}</span>}
                  </div>
                  <div>
                    <label className={labelCls}>Actual / Effort (Hrs)</label>
                    {issueToEdit ? (
                      <div className="h-9 border border-border rounded-md px-3 flex items-center justify-between text-sm font-mono text-text-primary">
                        <span>{actualHours || 0} hrs</span>
                        <span className="text-[10px] text-text-muted font-sans">Cumulative</span>
                      </div>
                    ) : (
                      <div className="h-9 border border-border rounded-md px-3 flex items-center text-xs text-text-muted font-mono">
                        0 hrs — via Time Log
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[11px] text-text-muted">* Actual hours are cumulative and managed via the Time Log system.</p>
                <div className="pt-2.5 border-t border-border flex items-center justify-between text-xs">
                  <div>
                    <span className="text-text-muted">Remaining: </span>
                    {effortCalc.isOverrun
                      ? <span className="font-semibold text-rose-400">Overrun: {effortCalc.overrunHrs} Hrs</span>
                      : <span className="font-semibold text-text-primary">{effortCalc.remainingHrs} Hrs</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-text-muted">Status:</span>
                    {effortCalc.indicatorState === 'on_track' && <span className="text-emerald-400 font-medium">🟢 On Track ({effortCalc.percentage}%)</span>}
                    {effortCalc.indicatorState === 'attention' && <span className="text-amber-400 font-medium">🟡 Attention ({effortCalc.percentage}%)</span>}
                    {effortCalc.indicatorState === 'overrun' && <span className="text-rose-400 font-medium">🔴 Overrun ({effortCalc.percentage}%)</span>}
                  </div>
                </div>
              </div>

              {/* Blocked Hours */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Blocked Hours</label>
                  <input type="number" step="0.25" min="0" value={blockedHours}
                    onChange={(e) => setBlockedHours(e.target.value)}
                    placeholder="0"
                    className={inputCls + ' font-mono'} />
                  <p className="text-[11px] text-text-muted mt-1">Total hours the issue was blocked</p>
                </div>
              </div>

              {/* Comments */}
              <div>
                <label className={labelCls}>Comments</label>
                <textarea rows={2} value={comments} onChange={(e) => setComments(e.target.value)}
                  placeholder="Additional context, blocker details, or test execution remarks..."
                  className="w-full bg-transparent border border-border rounded-md p-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-accent/60 resize-none leading-relaxed transition-colors" />
              </div>

              {/* Retesting */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Retesting Status</label>
                  <select value={retestingStatus} onChange={(e) => setRetestingStatus(e.target.value)} className={selectCls}>
                    {dropdownConfigs.retesting_status.filter(o => o.is_active).map((o) => (
                      <option key={o.id} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Retesting Estimation (Hrs)</label>
                  <input type="number" step="0.25" min="0" value={retestingEstHrs}
                    onChange={(e) => setRetestingEstHrs(e.target.value)}
                    className={inputCls + ' font-mono'} />
                  {errors.retestingEstHrs && <span className={errorCls}>{errors.retestingEstHrs}</span>}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 shrink-0">
              <button type="button" onClick={onClose} disabled={saving}
                className="px-4 py-2 rounded-md text-xs font-medium text-text-muted hover:text-text-primary hover:bg-white/8 transition-colors disabled:opacity-50">
                Cancel
              </button>
              <button type="submit" disabled={saving}
                className="px-5 py-2 rounded-md text-xs font-semibold bg-accent hover:bg-accent-hover text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
                <Check className="w-3.5 h-3.5" />
                {saving ? 'Saving...' : issueToEdit ? 'Update Issue' : 'Save Issue'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
