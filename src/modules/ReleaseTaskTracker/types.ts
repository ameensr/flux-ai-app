// src/modules/ReleaseTaskTracker/types.ts

export type TaskStatusType =
  | 'Not Started'
  | 'Assigned'
  | 'In Progress'
  | 'Blocked'
  | 'In Review'
  | 'Completed'
  | 'Cancelled'
  | string

export type PriorityType = 'Critical' | 'High' | 'Medium' | 'Low' | string

export interface ReleaseTask {
  id: string
  sl_no: number
  project_id: string
  product_name: string
  product_code?: string | null
  release_version: string
  task_id: string
  description: string
  priority: PriorityType
  received_date_time?: string | null       // ISO timestamp — Received Date/Time
  start_date: string | null                // Actual Start Date
  actual_end_date?: string | null          // Actual End Date
  // Legacy date fields kept for backward compat
  target_date: string | null
  finish_date: string | null
  assigned_to_user_id: string | null
  assigned_to_name: string                 // QA Engineer
  // Four individual estimation components
  test_design_est_hrs: number              // Test Design Estimation (Hrs)
  data_prep_est_hrs: number                // Data Preparation Estimation (Hrs)
  functional_testing_est_hrs: number       // Functional Testing Estimation (Hrs)
  retesting_est_hrs: number                // Retesting Estimation (Hrs)
  // Derived total — always = sum of four components, never stored independently
  total_estimation_hrs: number
  // Legacy single estimation kept for backward compat (mirrors total_estimation_hrs)
  estimated_hours: number
  estimated_hours_locked?: boolean
  estimated_hours_locked_by?: string | null
  estimated_hours_locked_at?: string | null
  actual_hours: number
  remaining_hours: number
  overrun_hours: number
  task_status: TaskStatusType
  comments: string
  is_deleted?: boolean
  created_by?: string | null
  created_at: string
  updated_at: string
}

/** Compute total estimation from four components */
export function computeTotalEstimation(task: Pick<ReleaseTask,
  'test_design_est_hrs' | 'data_prep_est_hrs' | 'functional_testing_est_hrs' | 'retesting_est_hrs'
>): number {
  return Math.round((
    (Number(task.test_design_est_hrs) || 0) +
    (Number(task.data_prep_est_hrs) || 0) +
    (Number(task.functional_testing_est_hrs) || 0) +
    (Number(task.retesting_est_hrs) || 0)
  ) * 100) / 100
}

export interface ReleaseTaskTimeLog {
  id: string
  task_id: string
  release_task_id?: string
  user_name: string
  user_id?: string | null
  hours_added: number
  comment: string
  date: string
  logged_at: string
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
    | 'Time Log Corrected'
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
  timestamp: string
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
  selectedProductId: string
  selectedRelease: string
  taskStatus: string[]
  assignedTo: string[]
  priority: string[]
  dateRangeStart?: string
  dateRangeEnd?: string
  dateRangeType?: 'start' | 'target' | 'finish' | 'received' | 'actual_end'
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

export const DEFAULT_TASK_STATUSES: Array<{ label: string; value: string; color: string; badgeClass: string }> = [
  { label: 'Not Started', value: 'Not Started', color: '#94a3b8', badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  { label: 'Assigned',    value: 'Assigned',    color: '#3b82f6', badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { label: 'In Progress', value: 'In Progress', color: '#8b5cf6', badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  { label: 'Blocked',     value: 'Blocked',     color: '#ef4444', badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30' },
  { label: 'In Review',   value: 'In Review',   color: '#f59e0b', badgeClass: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  { label: 'Completed',   value: 'Completed',   color: '#10b981', badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { label: 'Cancelled',   value: 'Cancelled',   color: '#6b7280', badgeClass: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
]

export const DEFAULT_PRIORITIES: Array<{ label: string; value: string; color: string; badgeClass: string }> = [
  { label: 'Critical', value: 'Critical', color: '#ef4444', badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30' },
  { label: 'High',     value: 'High',     color: '#f97316', badgeClass: 'bg-orange-500/15 text-orange-400 border-orange-500/30' },
  { label: 'Medium',   value: 'Medium',   color: '#3b82f6', badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { label: 'Low',      value: 'Low',      color: '#10b981', badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
]

export function calculateEffort(estimated: number, actual: number): EffortCalculation {
  const est = Math.max(0, Number(estimated) || 0)
  const act = Math.max(0, Number(actual) || 0)
  const isOverrun = act > est
  const remainingHrs = isOverrun ? 0 : Math.round((est - act) * 100) / 100
  const overrunHrs = isOverrun ? Math.round((act - est) * 100) / 100 : 0
  const percentage = est > 0 ? Math.round((act / est) * 100) : (act > 0 ? 100 : 0)
  const barPercentage = Math.min(100, percentage)
  let indicatorState: EffortIndicatorState = 'on_track'
  if (act > est) indicatorState = 'overrun'
  else if (est > 0 && act > est * 0.75) indicatorState = 'attention'
  const displayText = isOverrun ? `Overrun: ${overrunHrs} Hrs` : `${remainingHrs} Hrs`
  return { remainingHrs, overrunHrs, isOverrun, percentage, indicatorState, displayText, barPercentage }
}
