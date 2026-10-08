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
  task_id: string          // e.g. REL-001
  description: string
  priority: PriorityType
  start_date: string | null
  target_date: string | null
  finish_date: string | null
  assigned_to: string
  assigned_to_id?: string | null
  estimated_hours: number
  actual_hours: number
  remaining_hours: number
  overrun_hours: number
  task_status: TaskStatusType
  comments: string
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface ReleaseTaskTimeLog {
  id: string
  task_id: string
  release_task_id?: string
  user_name: string
  user_id?: string | null
  hours_added: number
  comment: string
  logged_at: string
  created_at?: string
}

export interface ReleaseTaskHistoryRecord {
  id: string
  task_id: string
  product_name: string
  release?: string
  user_name: string
  user_id?: string | null
  action: string
  field?: string
  old_value?: string | null
  new_value?: string | null
  timestamp: string
}

export interface ReleaseDropdownOption {
  id: string
  category: 'task_status' | 'priority' | 'tester'
  label: string
  value: string
  color?: string
  is_active: boolean
  sort_order: number
}

export interface ReleaseTaskFilters {
  selectedProductId: string
  selectedRelease: string
  taskStatus: string[]
  assignedTo: string[]
  priority: string[]
  startDateFrom?: string
  startDateTo?: string
  targetDateFrom?: string
  targetDateTo?: string
  searchQuery?: string
}

export interface ReleaseKPICounters {
  totalTasks: number
  notStarted: number
  assigned: number
  inProgress: number
  blocked: number
  inReview: number
  completed: number
  totalEstimatedHrs: number
  totalActualHrs: number
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

export type EffortIndicatorState = 'on_track' | 'attention' | 'overrun'

export interface EffortCalculation {
  remainingHrs: number
  overrunHrs: number
  isOverrun: boolean
  percentage: number
  indicatorState: EffortIndicatorState
}

export const DEFAULT_TASK_STATUSES: Array<{ label: string; value: string; color: string }> = [
  { label: 'Not Started', value: 'Not Started', color: '#94a3b8' },
  { label: 'Assigned',    value: 'Assigned',    color: '#3b82f6' },
  { label: 'In Progress', value: 'In Progress', color: '#8b5cf6' },
  { label: 'Blocked',     value: 'Blocked',     color: '#ef4444' },
  { label: 'In Review',   value: 'In Review',   color: '#06b6d4' },
  { label: 'Completed',   value: 'Completed',   color: '#10b981' },
  { label: 'Cancelled',   value: 'Cancelled',   color: '#6b7280' },
]

export const DEFAULT_PRIORITIES: Array<{ label: string; value: string; color: string }> = [
  { label: 'Critical', value: 'Critical', color: '#ef4444' },
  { label: 'High',     value: 'High',     color: '#f97316' },
  { label: 'Medium',   value: 'Medium',   color: '#eab308' },
  { label: 'Low',      value: 'Low',      color: '#22c55e' },
]

export function calculateEffort(estimated: number, actual: number): EffortCalculation {
  const est = Math.max(0, Number(estimated) || 0)
  const act = Math.max(0, Number(actual) || 0)
  const isOverrun = act > est
  const remainingHrs = isOverrun ? 0 : Math.round((est - act) * 100) / 100
  const overrunHrs = isOverrun ? Math.round((act - est) * 100) / 100 : 0
  const percentage = est > 0 ? Math.round((act / est) * 100) : (act > 0 ? 100 : 0)
  let indicatorState: EffortIndicatorState = 'on_track'
  if (act > est) indicatorState = 'overrun'
  else if (est > 0 && act > est * 0.75) indicatorState = 'attention'
  return { remainingHrs, overrunHrs, isOverrun, percentage, indicatorState }
}
