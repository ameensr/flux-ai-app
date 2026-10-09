// src/modules/ReleaseTaskTracker/components/AddEditReleaseTaskModal.tsx
// Modal for adding or editing release tasks.
// Populates Product dropdown dynamically from Project Hub (/project-hub).
// Actual Hours is non-editable, using cumulative Time Logs.

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Clock } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useAppStore } from '@/store/useAppStore'
import { EstimationLockControl } from '@/components/qa-operations/EstimationLockControl'
import { useReleaseTrackerStore } from '../store'
import { generateNextTaskId } from '../releaseTrackerService'
import type { ReleaseTask, PriorityType, TaskStatusType } from '../types'
import { calculateEffort } from '../types'

interface Props {
  isOpen: boolean
  taskToEdit: ReleaseTask | null
  onClose: () => void
  onSaveSuccess?: () => void
  onOpenTimeLog?: (task: ReleaseTask) => void
}

const inputCls = 'w-full h-9 bg-transparent border border-border rounded-md px-3 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-accent/60 transition-colors'
const selectCls = inputCls + ' cursor-pointer'
const labelCls = 'block text-xs font-medium text-text-muted mb-1'
const errorCls = 'text-[11px] text-rose-400 mt-0.5 block'

export function AddEditReleaseTaskModal({
  isOpen,
  taskToEdit,
  onClose,
  onSaveSuccess,
  onOpenTimeLog
}: Props) {
  useBodyScrollLock(isOpen)
  const { toast } = useToast()
  const { user, profile } = useAppStore()
  const { can } = usePermissions()
  const canLockEst = can('release-tracker', 'can_lock_estimated_hours')
  const canUnlockEst = can('release-tracker', 'can_unlock_estimated_hours')
  const canEditEst = can('release-tracker', 'can_edit_estimated_hours')

  const {
    products,
    dropdownConfigs,
    tasks,
    addOrUpdateTask,
    toggleEstimationLock,
    getAvailableReleases
  } = useReleaseTrackerStore()

  const submitRef = useRef(false)

  const [projectId, setProjectId] = useState('')
  const [releaseVersion, setReleaseVersion] = useState('Release 1.0')
  const [taskId, setTaskId] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<PriorityType>('Medium')
  const [receivedDateTime, setReceivedDateTime] = useState('')
  const [startDate, setStartDate] = useState('')
  const [actualEndDate, setActualEndDate] = useState('')
  const [assignedUserId, setAssignedUserId] = useState('')
  const [assignedName, setAssignedName] = useState('Unassigned')
  const [testDesignEst, setTestDesignEst] = useState<number | string>(0)
  const [dataPrepEst, setDataPrepEst] = useState<number | string>(0)
  const [functionalTestingEst, setFunctionalTestingEst] = useState<number | string>(8)
  const [retestingEst, setRetestingEst] = useState<number | string>(0)
  const [isEstLocked, setIsEstLocked] = useState(false)
  const [lockedBy, setLockedBy] = useState<string | null>(null)
  const [lockedAt, setLockedAt] = useState<string | null>(null)
  const [taskStatus, setTaskStatus] = useState<TaskStatusType>('Not Started')
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const totalEst = Math.round((
    (Number(testDesignEst) || 0) +
    (Number(dataPrepEst) || 0) +
    (Number(functionalTestingEst) || 0) +
    (Number(retestingEst) || 0)
  ) * 100) / 100

  const availableAssignees = React.useMemo(() => {
    const all = [...(dropdownConfigs.assigned_to || [])]
    const active = all.filter(a => a.is_active)
    if (taskToEdit) {
      const existingAssignee = all.find(
        a =>
          !a.is_active &&
          ((taskToEdit.assigned_to_user_id && a.value === taskToEdit.assigned_to_user_id) ||
           a.label.toLowerCase() === taskToEdit.assigned_to_name.toLowerCase())
      )
      if (existingAssignee && !active.some(a => a.value === existingAssignee.value)) {
        active.push({ ...existingAssignee, label: `${existingAssignee.label} (Inactive)` })
      }
    }
    return active
  }, [dropdownConfigs.assigned_to, taskToEdit])

  useEffect(() => {
    if (!isOpen) { submitRef.current = false; return }

    if (taskToEdit) {
      setProjectId(taskToEdit.project_id || products[0]?.id || '')
      setReleaseVersion(taskToEdit.release_version || 'Release 1.0')
      setTaskId(taskToEdit.task_id || '')
      setDescription(taskToEdit.description || '')
      setPriority(taskToEdit.priority || 'Medium')
      setReceivedDateTime(taskToEdit.received_date_time || '')
      setStartDate(taskToEdit.start_date || '')
      setActualEndDate(taskToEdit.actual_end_date || '')
      setAssignedUserId(taskToEdit.assigned_to_user_id || '')
      setAssignedName(taskToEdit.assigned_to_name || 'Unassigned')
      setTestDesignEst(taskToEdit.test_design_est_hrs ?? 0)
      setDataPrepEst(taskToEdit.data_prep_est_hrs ?? 0)
      setFunctionalTestingEst(taskToEdit.functional_testing_est_hrs ?? 0)
      setRetestingEst(taskToEdit.retesting_est_hrs ?? 0)
      setIsEstLocked(Boolean(taskToEdit.estimated_hours_locked))
      setLockedBy(taskToEdit.estimated_hours_locked_by || null)
      setLockedAt(taskToEdit.estimated_hours_locked_at || null)
      setTaskStatus(taskToEdit.task_status || 'Not Started')
      setComments(taskToEdit.comments || '')
    } else {
      const firstProject = products[0]
      const defaultRel =
        (firstProject?.metadata?.version as string) ||
        (firstProject?.metadata?.release as string) ||
        getAvailableReleases()[0] ||
        'Release 1.0'

      setProjectId(firstProject?.id || '')
      setReleaseVersion(defaultRel)
      setTaskId(generateNextTaskId(tasks))
      setDescription('')
      setPriority('Medium')
      setReceivedDateTime('')
      setStartDate(new Date().toISOString().split('T')[0])
      setActualEndDate('')
      const defaultAssignee = dropdownConfigs.assigned_to.find(a => a.is_active)
      setAssignedUserId(defaultAssignee?.value || '')
      setAssignedName(defaultAssignee?.label || 'Unassigned')
      setTestDesignEst(0)
      setDataPrepEst(0)
      setFunctionalTestingEst(8)
      setRetestingEst(0)
      setIsEstLocked(false)
      setLockedBy(null)
      setLockedAt(null)
      setTaskStatus('Not Started')
      setComments('')
    }
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, taskToEdit?.id])

  const handleAssigneeChange = (val: string) => {
    setAssignedUserId(val)
    const found = dropdownConfigs.assigned_to.find(a => a.value === val)
    if (found) setAssignedName(found.label.replace(' (Inactive)', ''))
    else if (!val) setAssignedName('Unassigned')
  }

  const currentActual = taskToEdit ? Number(taskToEdit.actual_hours) || 0 : 0
  const effortCalc = calculateEffort(totalEst, currentActual)

  const validateForm = () => {
    const errs: Record<string, string> = {}
    if (!projectId) errs.projectId = 'Please select a Product from Project Hub'
    if (!releaseVersion.trim()) errs.releaseVersion = 'Release version is required (e.g. Release 4.2)'
    if (!taskId.trim()) errs.taskId = 'Task ID is required (e.g. REL-001)'
    if (!taskToEdit && tasks.some(t => !t.is_deleted && t.task_id.toLowerCase() === taskId.trim().toLowerCase())) {
      errs.taskId = `Task ID "${taskId.trim()}" already exists. Please use a unique ID.`
    }
    if (!description.trim()) errs.description = 'Task description is required'
    if (!taskStatus) errs.taskStatus = 'Task status is required'
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
      const actorName =
        (profile?.full_name as string) ||
        (user?.user_metadata?.full_name as string) ||
        user?.email ||
        'QA Engineer'

      const saved = await addOrUpdateTask(
        {
          id: taskToEdit?.id,
          task_id: taskId.trim(),
          project_id: projectId,
          product_name: selectedProject?.name || 'General Product',
          product_code: selectedProject?.project_code || null,
          release_version: releaseVersion.trim(),
          description: description.trim(),
          priority,
          received_date_time: receivedDateTime || null,
          start_date: startDate || null,
          actual_end_date: actualEndDate || null,
          assigned_to_user_id: assignedUserId || null,
          assigned_to_name: assignedName,
          test_design_est_hrs: Number(testDesignEst) || 0,
          data_prep_est_hrs: Number(dataPrepEst) || 0,
          functional_testing_est_hrs: Number(functionalTestingEst) || 0,
          retesting_est_hrs: Number(retestingEst) || 0,
          task_status: taskStatus,
          comments: comments.trim()
        },
        { name: actorName, id: user?.id }
      )

      toast({
        title: taskToEdit ? 'Task Updated' : 'Release Task Created',
        description: `Successfully saved ${saved.task_id} for ${saved.product_name}`
      })

      onClose()
      onSaveSuccess?.()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: err.message || 'Could not save release task' })
    } finally {
      setSaving(false)
      submitRef.current = false
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !saving && onClose()}
          className="fixed inset-0 bg-black/60 backdrop-blur-[2px]"
        />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.18 }}
          className="relative w-full max-w-2xl bg-surface border border-border rounded-lg shadow-xl flex flex-col max-h-[92vh] my-auto z-10 overflow-hidden"
        >
          {/* Header */}
          <div className="px-5 py-3.5 border-b border-border flex items-center justify-between shrink-0">
            <div>
              <h3 className="text-sm font-semibold text-text-primary">
                {taskToEdit ? `Edit Task — ${taskToEdit.task_id}` : 'Create New Release Task'}
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                {taskToEdit
                  ? `Updating release task details for ${taskToEdit.product_name}`
                  : 'Add a new release task with estimation and schedule'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="p-1.5 rounded-md text-text-muted hover:text-text-primary hover:bg-white/8 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form Body */}
          <form id="release-task-form" onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1">

            {/* Product, Release & Task ID */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Product <span className="text-rose-400">*</span></label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className={errors.projectId ? selectCls.replace('border-border', 'border-rose-500') : selectCls}
                >
                  <option value="">Select Product</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}{p.project_code ? ` (${p.project_code})` : ''}</option>
                  ))}
                </select>
                {errors.projectId && <span className={errorCls}>{errors.projectId}</span>}
              </div>

              <div>
                <label className={labelCls}>Release <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  list="release-version-suggestions"
                  value={releaseVersion}
                  onChange={(e) => setReleaseVersion(e.target.value)}
                  placeholder="e.g. Release 4.2"
                  className={errors.releaseVersion ? inputCls.replace('border-border', 'border-rose-500') : inputCls}
                />
                <datalist id="release-version-suggestions">
                  {getAvailableReleases().map(rel => <option key={rel} value={rel} />)}
                </datalist>
                {errors.releaseVersion && <span className={errorCls}>{errors.releaseVersion}</span>}
              </div>

              <div>
                <label className={labelCls}>Task ID <span className="text-rose-400">*</span></label>
                <input
                  type="text"
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                  placeholder="e.g. REL-001"
                  disabled={Boolean(taskToEdit)}
                  className={`${errors.taskId ? inputCls.replace('border-border', 'border-rose-500') : inputCls} font-mono ${taskToEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
                {errors.taskId && <span className={errorCls}>{errors.taskId}</span>}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className={labelCls}>Task Description <span className="text-rose-400">*</span></label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the release task, testing scope, acceptance criteria..."
                className={`w-full bg-transparent border rounded-md p-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-accent/60 resize-none leading-relaxed transition-colors ${errors.description ? 'border-rose-500' : 'border-border'}`}
              />
              {errors.description && <span className={errorCls}>{errors.description}</span>}
            </div>

            {/* QA Engineer, Priority & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>QA Engineer</label>
                <select value={assignedUserId} onChange={(e) => handleAssigneeChange(e.target.value)} className={selectCls}>
                  <option value="">Unassigned</option>
                  {availableAssignees.map((emp) => (
                    <option key={emp.id} value={emp.value}>{emp.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Priority</label>
                <select value={priority} onChange={(e) => setPriority(e.target.value)} className={selectCls}>
                  {dropdownConfigs.priority.filter(p => p.is_active).map((p) => (
                    <option key={p.id} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelCls}>Task Status <span className="text-rose-400">*</span></label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value)}
                  className={errors.taskStatus ? selectCls.replace('border-border', 'border-rose-500') : selectCls}
                >
                  {dropdownConfigs.task_status.filter(s => s.is_active).map((s) => (
                    <option key={s.id} value={s.value}>{s.label}</option>
                  ))}
                </select>
                {errors.taskStatus && <span className={errorCls}>{errors.taskStatus}</span>}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Received Date / Time</label>
                <input
                  type="datetime-local"
                  value={receivedDateTime}
                  onChange={(e) => setReceivedDateTime(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className={labelCls}>Actual Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className={inputCls} />
              </div>
              <div>
                <label className={labelCls}>Actual End Date</label>
                <input type="date" value={actualEndDate} onChange={(e) => setActualEndDate(e.target.value)} className={inputCls} />
              </div>
            </div>

            {/* Estimation Breakdown */}
            <div className="border border-border rounded-md p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-text-primary">Estimation Breakdown</p>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Total:</span>
                  <span className="font-semibold font-mono text-accent text-sm">{totalEst}h</span>
                  {isEstLocked && <span className="text-[10px] text-amber-400">🔒 Locked</span>}
                  {taskToEdit && (
                    <EstimationLockControl
                      isLocked={isEstLocked}
                      canLock={canLockEst}
                      canUnlock={canUnlockEst}
                      lockedBy={lockedBy}
                      lockedAt={lockedAt ? new Date(lockedAt).toLocaleString() : null}
                      size="xs"
                      onToggleLock={async (shouldLock) => {
                        try {
                          const updated = await toggleEstimationLock(taskToEdit.id, shouldLock, {
                            name: (profile?.full_name as string) || (user?.user_metadata?.full_name as string) || user?.email || 'QA Engineer',
                            id: user?.id
                          })
                          setIsEstLocked(shouldLock)
                          setLockedBy(updated.estimated_hours_locked_by || null)
                          setLockedAt(updated.estimated_hours_locked_at || null)
                          toast({
                            title: shouldLock ? 'Estimation Locked' : 'Estimation Unlocked',
                            description: shouldLock
                              ? `Estimated hours for ${taskToEdit.task_id} locked at ${totalEst}h.`
                              : `Estimated hours for ${taskToEdit.task_id} unlocked for editing.`
                          })
                        } catch (err: any) {
                          toast({ title: 'Lock Action Failed', description: err?.message || 'Failed to update estimation lock', variant: 'destructive' })
                        }
                      }}
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {([
                  { label: 'Test Design', value: testDesignEst, setter: setTestDesignEst },
                  { label: 'Data Prep', value: dataPrepEst, setter: setDataPrepEst },
                  { label: 'Functional Testing', value: functionalTestingEst, setter: setFunctionalTestingEst },
                  { label: 'Retesting', value: retestingEst, setter: setRetestingEst },
                ] as const).map(({ label, value, setter }) => (
                  <div key={label}>
                    <label className={labelCls}>{label} (Hrs)</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={value}
                      disabled={isEstLocked || !canEditEst}
                      onChange={(e) => setter(e.target.value)}
                      className={`w-full h-9 bg-transparent border rounded-md px-3 text-sm font-mono text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/60 transition-colors ${
                        isEstLocked || !canEditEst ? 'opacity-60 cursor-not-allowed border-amber-500/30' : 'border-border'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Actual Hours — Read-only */}
              <div className="pt-2.5 border-t border-border">
                <div className="flex items-center justify-between mb-1">
                  <label className={labelCls + ' mb-0'}>Actual Hours (Cumulative)</label>
                  {taskToEdit && onOpenTimeLog && (
                    <button type="button" onClick={() => onOpenTimeLog(taskToEdit)} className="text-[11px] text-accent hover:underline flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      + Add Time Log
                    </button>
                  )}
                </div>
                <div className="h-9 px-3 rounded-md border border-border flex items-center justify-between text-sm font-mono">
                  <span className="text-text-primary">{currentActual} hrs</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                    effortCalc.indicatorState === 'overrun'
                      ? 'bg-rose-500/15 text-rose-400'
                      : effortCalc.indicatorState === 'attention'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-emerald-500/15 text-emerald-400'
                  }`}>
                    {effortCalc.displayText}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted mt-1">Actual hours update automatically from tester time logs.</p>
              </div>
            </div>

            {/* Comments */}
            <div>
              <label className={labelCls}>Comments & Notes</label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Optional release task notes, dependencies, blocker remarks..."
                className="w-full bg-transparent border border-border rounded-md p-2.5 text-sm text-text-primary focus:outline-none focus:ring-1 focus:ring-accent/60 focus:border-accent/60 resize-none leading-relaxed transition-colors"
              />
            </div>
          </form>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-md text-xs font-medium text-text-muted hover:text-text-primary hover:bg-white/8 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="release-task-form"
              disabled={saving}
              className="px-5 py-2 rounded-md text-xs font-semibold bg-accent hover:bg-accent-hover text-white transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>{taskToEdit ? 'Save Changes' : 'Create Task'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
