// src/modules/ReleaseTaskTracker/components/AddEditReleaseTaskModal.tsx
// Modal for adding or editing release tasks.
// Populates Product dropdown dynamically from Project Hub (/project-hub).
// Actual Hours is non-editable, using cumulative Time Logs.

import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, Edit3, PlusCircle, Clock, AlertCircle, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useAppStore } from '@/store/useAppStore'
import { EstimationLockControl } from '@/components/qa-operations/EstimationLockControl'
import { useReleaseTrackerStore } from '../store'
import { generateNextTaskId } from '../releaseTrackerService'
import type { ReleaseTask, PriorityType, TaskStatusType } from '../types'
import { calculateEffort, DEFAULT_TASK_STATUSES, DEFAULT_PRIORITIES } from '../types'

interface Props {
  isOpen: boolean
  taskToEdit: ReleaseTask | null
  onClose: () => void
  onSaveSuccess?: () => void
  onOpenTimeLog?: (task: ReleaseTask) => void
}

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
    employees,
    dropdownConfigs,
    tasks,
    addOrUpdateTask,
    toggleEstimationLock,
    getAvailableReleases
  } = useReleaseTrackerStore()

  // Guard against double submission
  const submitRef = useRef(false)

  // Form states
  const [projectId, setProjectId] = useState('')
  const [releaseVersion, setReleaseVersion] = useState('Release 1.0')
  const [taskId, setTaskId] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState<PriorityType>('Medium')
  const [startDate, setStartDate] = useState('')
  const [targetDate, setTargetDate] = useState('')
  const [finishDate, setFinishDate] = useState('')
  const [assignedUserId, setAssignedUserId] = useState<string>('')
  const [assignedName, setAssignedName] = useState<string>('Unassigned')
  const [estimatedHours, setEstimatedHours] = useState<number | string>(8)
  const [isEstLocked, setIsEstLocked] = useState(false)
  const [lockedBy, setLockedBy] = useState<string | null>(null)
  const [lockedAt, setLockedAt] = useState<string | null>(null)
  const [taskStatus, setTaskStatus] = useState<TaskStatusType>('Not Started')
  const [comments, setComments] = useState('')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Compute available assignees from Configuration -> Dropdown Configuration -> Assigned To
  // Requirement 12: Only enabled users should appear in the task form.
  // If a configured user is disabled, existing tasks assigned to that user must remain intact.
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

  // Reset or fill form when modal opens
  useEffect(() => {
    if (!isOpen) {
      submitRef.current = false
      return
    }

    if (taskToEdit) {
      setProjectId(taskToEdit.project_id || products[0]?.id || '')
      setReleaseVersion(taskToEdit.release_version || 'Release 1.0')
      setTaskId(taskToEdit.task_id || '')
      setDescription(taskToEdit.description || '')
      setPriority(taskToEdit.priority || 'Medium')
      setStartDate(taskToEdit.start_date || '')
      setTargetDate(taskToEdit.target_date || '')
      setFinishDate(taskToEdit.finish_date || '')
      setAssignedUserId(taskToEdit.assigned_to_user_id || '')
      setAssignedName(taskToEdit.assigned_to_name || 'Unassigned')
      setEstimatedHours(taskToEdit.estimated_hours ?? 0)
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
      const today = new Date().toISOString().split('T')[0]
      setStartDate(today)
      setTargetDate('')
      setFinishDate('')
      const defaultAssignee = dropdownConfigs.assigned_to.find(a => a.is_active)
      setAssignedUserId(defaultAssignee?.value || '')
      setAssignedName(defaultAssignee?.label || 'Unassigned')
      setEstimatedHours(8)
      setIsEstLocked(false)
      setLockedBy(null)
      setLockedAt(null)
      setTaskStatus('Not Started')
      setComments('')
    }
    setErrors({})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, taskToEdit?.id])

  // Handle employee change from configuration options
  const handleAssigneeChange = (val: string) => {
    setAssignedUserId(val)
    const found = dropdownConfigs.assigned_to.find(a => a.value === val)
    if (found) {
      setAssignedName(found.label.replace(' (Inactive)', ''))
    } else if (!val) {
      setAssignedName('Unassigned')
    }
  }

  // Effort preview
  const currentActual = taskToEdit ? Number(taskToEdit.actual_hours) || 0 : 0
  const effortCalc = calculateEffort(Number(estimatedHours) || 0, currentActual)

  const validateForm = () => {
    const errs: Record<string, string> = {}
    if (!projectId) errs.projectId = 'Please select a Product from Project Hub'
    if (!releaseVersion.trim()) errs.releaseVersion = 'Release version is required (e.g. Release 4.2)'
    if (!taskId.trim()) errs.taskId = 'Task ID is required (e.g. REL-001)'
    if (!taskToEdit && tasks.some(t => !t.is_deleted && t.task_id.toLowerCase() === taskId.trim().toLowerCase())) {
      errs.taskId = `Task ID "${taskId.trim()}" already exists. Please use a unique ID.`
    }
    if (!description.trim()) errs.description = 'Task description is required'
    if (Number(estimatedHours) < 0) errs.estimatedHours = 'Estimated hours cannot be negative'
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
          start_date: startDate || null,
          target_date: targetDate || null,
          finish_date: finishDate || null,
          assigned_to_user_id: assignedUserId || null,
          assigned_to_name: assignedName,
          estimated_hours: isEstLocked ? Number(taskToEdit?.estimated_hours ?? 0) : (Number(estimatedHours) || 0),
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
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: err.message || 'Could not save release task'
      })
    } finally {
      setSaving(false)
      submitRef.current = false
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => !saving && onClose()}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-2xl bg-surface border border-white/15 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto z-10"
        >
          {/* ── Modal Header ── */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-surface-elevated/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                {taskToEdit ? <Edit3 className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />}
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  {taskToEdit ? `Edit Task: ${taskToEdit.task_id}` : 'Create New Release Task'}
                </h3>
                <p className="text-xs text-text-muted">
                  {taskToEdit
                    ? `Updating release task details for ${taskToEdit.product_name}`
                    : 'Add a new release task with estimation and schedule'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* ── Form Body (Scrollable) ── */}
          <form id="release-task-form" onSubmit={handleSubmit} className="overflow-y-auto p-5 space-y-4 flex-1">
            {/* Product, Release & Task ID Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* Product (from /project-hub) */}
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Product <span className="text-rose-400">*</span>
                </label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className={`w-full h-9 bg-surface-elevated border rounded-xl px-3 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent ${
                    errors.projectId ? 'border-rose-500' : 'border-white/10'
                  }`}
                >
                  <option value="">Select Product from Project Hub</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.project_code ? `(${p.project_code})` : ''}
                    </option>
                  ))}
                </select>
                {errors.projectId && (
                  <p className="text-[11px] text-rose-400 mt-1">{errors.projectId}</p>
                )}
              </div>

              {/* Release */}
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Release <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  list="release-version-suggestions"
                  value={releaseVersion}
                  onChange={(e) => setReleaseVersion(e.target.value)}
                  placeholder="e.g. Release 4.2"
                  className={`w-full h-9 bg-surface-elevated border rounded-xl px-3 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent ${
                    errors.releaseVersion ? 'border-rose-500' : 'border-white/10'
                  }`}
                />
                <datalist id="release-version-suggestions">
                  {getAvailableReleases().map(rel => (
                    <option key={rel} value={rel} />
                  ))}
                </datalist>
                {errors.releaseVersion && (
                  <p className="text-[11px] text-rose-400 mt-1">{errors.releaseVersion}</p>
                )}
              </div>

              {/* Task ID */}
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Task ID <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={taskId}
                  onChange={(e) => setTaskId(e.target.value)}
                  placeholder="e.g. REL-001"
                  disabled={Boolean(taskToEdit)}
                  className={`w-full h-9 bg-surface-elevated border rounded-xl px-3 font-mono text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent ${
                    errors.taskId ? 'border-rose-500' : 'border-white/10'
                  } ${taskToEdit ? 'opacity-60 cursor-not-allowed' : ''}`}
                />
                {errors.taskId && (
                  <p className="text-[11px] text-rose-400 mt-1">{errors.taskId}</p>
                )}
              </div>
            </div>

            {/* Task Description */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Task Description <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detailed description of the release task, testing scope, acceptance criteria..."
                className={`w-full bg-surface-elevated border rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent ${
                  errors.description ? 'border-rose-500' : 'border-white/10'
                }`}
              />
              {errors.description && (
                <p className="text-[11px] text-rose-400 mt-1">{errors.description}</p>
              )}
            </div>

            {/* Priority & Assigned To & Status Row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Priority */}
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full h-9 bg-surface-elevated border border-white/10 rounded-xl px-3 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {dropdownConfigs.priority.filter(p => p.is_active).map((p) => (
                    <option key={p.id} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assigned To (Configured via Configuration -> Assigned To) */}
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Assigned To
                </label>
                <select
                  value={assignedUserId}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  className="w-full h-9 bg-surface-elevated border border-white/10 rounded-xl px-3 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">Unassigned</option>
                  {availableAssignees.map((emp) => (
                    <option key={emp.id} value={emp.value}>
                      {emp.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task Status */}
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Task Status <span className="text-rose-400">*</span>
                </label>
                <select
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value)}
                  className="w-full h-9 bg-surface-elevated border border-white/10 rounded-xl px-3 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  {dropdownConfigs.task_status.filter(s => s.is_active).map((s) => (
                    <option key={s.id} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates Row: Start Date, Target Date, Finish Date */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full h-9 bg-surface-elevated border border-white/10 rounded-xl px-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Target Date
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full h-9 bg-surface-elevated border border-white/10 rounded-xl px-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary block mb-1">
                  Finish Date
                </label>
                <input
                  type="date"
                  value={finishDate}
                  onChange={(e) => setFinishDate(e.target.value)}
                  className="w-full h-9 bg-surface-elevated border border-white/10 rounded-xl px-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>
            </div>

            {/* Hours Row (Estimated vs Actual) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 p-3.5 rounded-xl border border-white/10 bg-surface-elevated/40">
              {/* Estimated Hours */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <label className="text-xs font-semibold text-text-secondary">
                      Estimated Hours <span className="text-rose-400">*</span>
                    </label>
                    {isEstLocked && (
                      <span className="text-[10px] text-amber-400 font-semibold flex items-center gap-0.5">
                        🔒 Locked
                      </span>
                    )}
                  </div>
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
                          if (shouldLock) {
                            setEstimatedHours(updated.estimated_hours)
                          }
                          toast({
                            title: shouldLock ? 'Estimation Locked' : 'Estimation Unlocked',
                            description: shouldLock
                              ? `Estimated hours for ${taskToEdit.task_id} locked at ${updated.estimated_hours}h.`
                              : `Estimated hours for ${taskToEdit.task_id} unlocked for editing.`
                          })
                        } catch (err: any) {
                          toast({
                            title: 'Lock Action Failed',
                            description: err?.message || 'Failed to update estimation lock',
                            variant: 'destructive'
                          })
                        }
                      }}
                    />
                  )}
                </div>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={estimatedHours}
                  disabled={isEstLocked || !canEditEst}
                  onChange={(e) => setEstimatedHours(e.target.value)}
                  className={`w-full h-9 bg-surface-elevated border rounded-xl px-3 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent ${
                    isEstLocked || !canEditEst
                      ? 'opacity-65 cursor-not-allowed bg-surface-elevated/40 border-amber-500/20'
                      : errors.estimatedHours
                      ? 'border-rose-500'
                      : 'border-white/10'
                  }`}
                  title={
                    isEstLocked
                      ? 'Estimated Hours are locked and cannot be modified.'
                      : !canEditEst
                      ? 'Requires "Edit Estimated Hours" permission to modify.'
                      : 'Enter estimated hours'
                  }
                />
                {isEstLocked && (
                  <p className="text-[10px] text-amber-300/80 mt-1 leading-tight">
                    🔒 Locked{lockedBy ? ` by ${lockedBy}` : ''}{lockedAt ? ` on ${new Date(lockedAt).toLocaleDateString()}` : ''}.
                    {canUnlockEst ? ' Click 🔒 above to unlock.' : ' Contact an authorized QA Lead to unlock.'}
                  </p>
                )}
                {!isEstLocked && !canEditEst && (
                  <p className="text-[10px] text-text-muted mt-1 leading-tight">
                    * You need "Edit Estimated Hours" permission to change this value.
                  </p>
                )}
                {errors.estimatedHours && (
                  <p className="text-[11px] text-rose-400 mt-1">{errors.estimatedHours}</p>
                )}
              </div>

              {/* Actual Hours — Important: Read-only Cumulative */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-text-secondary">
                    Actual Hours (Cumulative)
                  </label>
                  {taskToEdit && onOpenTimeLog && (
                    <button
                      type="button"
                      onClick={() => onOpenTimeLog(taskToEdit)}
                      className="text-[11px] text-accent hover:underline flex items-center gap-1"
                    >
                      <Clock className="w-3 h-3" />
                      + Add Time Log
                    </button>
                  )}
                </div>
                <div className="h-9 px-3 rounded-xl bg-surface-elevated/80 border border-white/10 flex items-center justify-between text-xs font-mono">
                  <span className="font-bold text-purple-300">
                    {currentActual} hrs
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${
                    effortCalc.indicatorState === 'overrun'
                      ? 'bg-rose-500/15 text-rose-400'
                      : effortCalc.indicatorState === 'attention'
                      ? 'bg-amber-500/15 text-amber-400'
                      : 'bg-emerald-500/15 text-emerald-400'
                  }`}>
                    {effortCalc.displayText}
                  </span>
                </div>
                <p className="text-[10px] text-text-muted mt-1">
                  Actual hours update automatically from tester time logs.
                </p>
              </div>
            </div>

            {/* Comments */}
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1">
                Comments & Notes
              </label>
              <textarea
                rows={2}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Optional release task notes, dependencies, blocker remarks..."
                className="w-full bg-surface-elevated border border-white/10 rounded-xl p-3 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
              />
            </div>
          </form>

          {/* ── Sticky Modal Footer ── */}
          <div className="px-5 py-3.5 border-t border-white/10 flex items-center justify-end gap-2.5 bg-surface-elevated/90 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="h-9 px-4 rounded-xl border border-white/10 text-xs font-medium text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              form="release-task-form"
              disabled={saving}
              className="h-9 px-5 rounded-xl bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-all shadow-md shadow-accent/20 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>{taskToEdit ? 'Save Changes' : 'Create Release Task'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
