// src/modules/ReleaseTaskTracker/types.ts
// Comprehensive type definitions for Release Task Tracker module under QA Operations Hub

export type TaskStatusType =
  | 'Not Started'
  | 'Assigned'
  | 'In Progress'
  | 'Blocked'
  | 'In Review'
  | 'Completed'
  | 'Cancelled'
  | string

export type PriorityType =
  | 'Critical'
  | 'High'
  | 'Medium'
  | 'Low'
  | string

export interface ReleaseTask {
  id: string
  sl_no: number
  project_id: string              // Linked to Project Hub project id (Single Source of Truth)
  product_name: string            // Display product name from Project Hub
  product_code?: string | null    // Product code from Project Hub
  release_version: string         // e.g. 'Release 4.2'
  task_id: string                 // Unique formatted Task ID e.g. 'REL-001'
  description: string             // Task Description
  priority: PriorityType          // Configurable Priority
  start_date: string | null       // YYYY-MM-DD
  target_date: string | null      // YYYY-MM-DD
  finish_date: string | null      // YYYY-MM-DD
  assigned_to_user_id: string | null // Stable Profile / User UUID
  assigned_to_name: string        // Employee Display Name (Snapshot)
  estimated_hours: number         // Estimated Hrs
  estimated_hours_locked?: boolean // Requirement: Estimation Hours Lock
  estimated_hours_locked_by?: string | null // User who locked it
  estimated_hours_locked_at?: string | null // Timestamp when locked
  actual_hours: number            // Actual Hrs (Cumulative sum of all time logs)
  remaining_hours: number         // Remaining Hrs (max(0, estimated - actual))
  overrun_hours: number           // Overrun Hrs (max(0, actual - estimated))
  task_status: TaskStatusType     // Configurable Task Status
  comments: string
  is_deleted?: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface ReleaseTaskTimeLog {
  id: string
  task_id: string                 // Unique Task ID string e.g. 'REL-001'
  release_task_id?: string        // UUID of the parent release task
  user_name: string               // Tester / Employee who logged the hours
  user_id?: string | null          // Profile UUID
  hours_added: number             // Effort added in hours (e.g. +2, +3.5)
  comment: string                 // Work description / reason
  date: string                    // Work date (YYYY-MM-DD)
  logged_at: string               // ISO timestamp or formatted
  created_at?: string
}

export interface ReleaseTaskHistoryRecord {
  id: string
  task_id: string
  product_name: string
  release_version: string
  user_name: string
  user_id?: string | null
  action:
    | 'Task Created'
    | 'Task Updated'
    | 'Task Assigned'
    | 'Status Changed'
    | 'Priority Changed'
    | 'Product Changed'
    | 'Release Changed'
    | 'Estimated Hours Changed'
    | 'Estimated Hours Updated'
    | 'Estimated Hours Locked'
    | 'Estimated Hours Unlocked'
    | 'Time Added'
    | 'Time Log Removed'
    | 'Comment Added'
    | 'Task Completed'
    | 'Task Deleted'
    | 'Task Restored'
    | 'Dropdown Configuration Change'
    | 'Export'
    | 'Import'
  field?: string
  old_value?: string | null
  new_value?: string | null
  timestamp: string               // formatted e.g. "08 Oct 2026, 10:32 AM"
}

export interface ReleaseDropdownOption {
  id: string
  category: 'task_status' | 'priority' | 'assigned_to'
  label: string
  value: string
  color?: string
  is_active: boolean
  sort_order: number
  user_id?: string | null
  email?: string | null
}

export const DEFAULT_ASSIGNED_TO_OPTIONS: ReleaseDropdownOption[] = [
  { id: 'usr-ameen', category: 'assigned_to', label: 'Ameen', value: 'usr-ameen', is_active: true, sort_order: 1 },
  { id: 'usr-rahul', category: 'assigned_to', label: 'Rahul', value: 'usr-rahul', is_active: true, sort_order: 2 },
  { id: 'usr-akhil', category: 'assigned_to', label: 'Akhil', value: 'usr-akhil', is_active: true, sort_order: 3 },
  { id: 'usr-john',  category: 'assigned_to', label: 'John',  value: 'usr-john',  is_active: false, sort_order: 4 },
  { id: 'usr-sarah', category: 'assigned_to', label: 'Sarah Jenkins', value: 'usr-sarah', is_active: true, sort_order: 5 }
]

export interface ReleaseFilters {
  selectedProductId: string       // 'all' or project_id from Project Hub
  selectedRelease: string         // 'all' or release string e.g. 'Release 4.2'
  taskStatus: string[]            // empty = all
  assignedTo: string[]            // empty = all (matches assigned_to_user_id or assigned_to_name)
  priority: string[]              // empty = all
  dateRangeStart?: string
  dateRangeEnd?: string
  dateRangeType?: 'start' | 'target' | 'finish'
  searchQuery?: string
  estimationLock?: 'all' | 'locked' | 'unlocked'
}

export interface ReleaseKPICounters {
  totalTasks: number
  notStarted: number
  assigned: number
  inProgress: number
  blocked: number
  inReview: number
  completed: number
  totalEstimatedHours: number
  totalActualHours: number
  remainingHours: number
  overrunHours: number
}

export interface ReleaseProgressData {
  release: string
  totalTasks: number
  completedTasks: number
  remainingTasks: number
  blockedTasks: number
  percentage: number
}

export interface ProductReleaseSummary {
  projectId: string
  productName: string
  productCode?: string
  release: string
  totalTasks: number
  inProgress: number
  blocked: number
  completed: number
  estimatedHrs: number
  actualHrs: number
  remainingHrs: number
  overrunHrs: number
}

export interface TesterWorkload {
  testerName: string
  activeTasks: number
  estimatedHrs: number
  actualHrs: number
  remainingHrs: number
  overrunHrs: number
}

export interface EmployeeUser {
  id: string
  name: string
  email: string
  role?: string
  avatar_url?: string | null
}

export type EffortIndicatorState = 'on_track' | 'attention' | 'overrun'

export interface EffortCalculation {
  remainingHrs: number
  overrunHrs: number
  isOverrun: boolean
  percentage: number
  indicatorState: EffortIndicatorState
  displayText: string
  barPercentage: number
}

// Default Task Statuses
export const DEFAULT_TASK_STATUSES: Array<{
  label: string
  value: string
  color: string
  badgeClass: string
}> = [
  { label: 'Not Started', value: 'Not Started', color: '#94a3b8', badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  { label: 'Assigned',    value: 'Assigned',    color: '#3b82f6', badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { label: 'In Progress', value: 'In Progress', color: '#8b5cf6', badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  { label: 'Blocked',     value: 'Blocked',     color: '#ef4444', badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30' },
  { label: 'In Review',   value: 'In Review',   color: '#f59e0b', badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { label: 'Completed',   value: 'Completed',   color: '#10b981', badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { label: 'Cancelled',   value: 'Cancelled',   color: '#6b7280', badgeClass: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
]

// Default Priorities
export const DEFAULT_PRIORITIES: Array<{
  label: string
  value: string
  color: string
  badgeClass: string
}> = [
  { label: 'Critical', value: 'Critical', color: '#ef4444', badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30' },
  { label: 'High',     value: 'High',     color: '#f97316', badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  { label: 'Medium',   value: 'Medium',   color: '#3b82f6', badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { label: 'Low',      value: 'Low',      color: '#10b981', badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
]

// Effort calculation helper:
// Green: Actual <= 75% of Estimate (On Track)
// Yellow: Actual > 75% and <= 100% (Attention)
// Red: Actual > Estimate (Overrun)
export function calculateEffort(estimated: number, actual: number): EffortCalculation {
  const est = Math.max(0, Number(estimated) || 0)
  const act = Math.max(0, Number(actual) || 0)

  const isOverrun = act > est
  const remainingHrs = isOverrun ? 0 : Math.round((est - act) * 100) / 100
  const overrunHrs = isOverrun ? Math.round((act - est) * 100) / 100 : 0

  const percentage = est > 0 ? Math.round((act / est) * 100) : (act > 0 ? 100 : 0)
  const barPercentage = Math.min(100, percentage)

  let indicatorState: EffortIndicatorState = 'on_track'
  if (act > est) {
    indicatorState = 'overrun'
  } else if (est > 0 && act > est * 0.75) {
    indicatorState = 'attention'
  } else {
    indicatorState = 'on_track'
  }

  const displayText = isOverrun
    ? `Overrun: ${overrunHrs} Hrs`
    : `${remainingHrs} Hrs`

  return {
    remainingHrs,
    overrunHrs,
    isOverrun,
    percentage,
    indicatorState,
    displayText,
    barPercentage
  }
}
