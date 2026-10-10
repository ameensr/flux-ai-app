// src/modules/SupportIssueTracker/types.ts

export type TestingStatusType =
  | 'Not Started'
  | 'Assigned'
  | 'In Testing'
  | 'Blocked'
  | 'Retesting'
  | 'Completed'
  | 'Cancelled'
  | string

export type IsQaMissType = 'Yes' | 'No' | 'Under Review' | 'Not Applicable' | string
export type RetestingStatusType = 'Not Required' | 'Pending' | 'In Retesting' | 'Passed' | 'Failed' | 'Blocked' | string

export interface SupportIssue {
  id: string
  sl_no: number
  project_id: string            // Linked to Project Hub project id
  product_name: string          // Display product name from Project Hub
  product_code?: string | null  // Product code from Project Hub
  issue_id: string              // e.g. 'SUP-1024'
  description: string           // Support Issue Description
  received_date: string         // YYYY-MM-DD
  received_time?: string | null // HH:MM (24h) or HH:MM:SS
  is_qa_miss?: IsQaMissType | null
  test_case_count?: number | null
  start_date: string | null     // Actual Start Date (YYYY-MM-DD)
  planned_end_date?: string | null  // Planned End Date (YYYY-MM-DD)
  actual_end_date?: string | null   // Actual End Date (YYYY-MM-DD) — NOT auto-set
  tester_name: string           // QA Engineer
  estimated_hours: number       // Estimation (Hrs)
  estimated_hours_locked?: boolean
  estimated_hours_locked_by?: string | null
  estimated_hours_locked_at?: string | null
  actual_hours: number          // Actual / Effort (Hrs) — calculated from time logs
  remaining_hours: number       // Derived: max(0, estimated - actual)
  overrun_hours: number         // Derived: max(0, actual - estimated)
  blocked_hours?: number | null // Total blocked duration in hours
  testing_status: TestingStatusType
  comments: string
  retesting_status?: RetestingStatusType | null
  retesting_estimation_hrs?: number | null
  // Legacy field — kept for backward compat; maps to actual_end_date in new schema
  finish_date?: string | null
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface SupportIssueTimeLog {
  id: string
  issue_id: string
  support_issue_id?: string
  user_name: string
  user_id?: string | null
  hours_added: number
  comment: string
  logged_at: string
  created_at?: string
}

export interface SupportIssueBlockedPeriod {
  id: string
  support_issue_id: string
  issue_id: string
  blocked_at: string
  unblocked_at?: string | null
  hours_blocked?: number | null
  created_at: string
}

export interface SupportIssueHistoryRecord {
  id: string
  issue_id: string
  product_name: string
  user_name: string
  user_id?: string | null
  action:
    | 'Issue Created'
    | 'Issue Updated'
    | 'Tester Assigned'
    | 'Testing Started'
    | 'Status Changed'
    | 'Actual Hours Updated'
    | 'Work Hours Logged'
    | 'Work Hours Deleted'
    | 'Estimated Hours Updated'
    | 'Estimated Hours Locked'
    | 'Estimated Hours Unlocked'
    | 'Comment Added'
    | 'Issue Completed'
    | 'Issue Deleted'
    | 'Issue Restored'
    | 'Bulk Delete'
    | 'Dropdown Configuration Change'
    | 'Permission Change'
    | 'Export'
    | 'Import'
  field?: string
  old_value?: string | null
  new_value?: string | null
  timestamp: string
}

export type SupportDropdownCategory =
  | 'testing_status'
  | 'tester'
  | 'is_qa_miss'
  | 'retesting_status'
  | 'priority'

export interface SupportDropdownOption {
  id: string
  category: SupportDropdownCategory
  label: string
  value: string
  color?: string
  is_active: boolean
  sort_order: number
}

export interface SupportFilters {
  selectedProductId: string
  testingStatus: string[]
  tester: string[]
  isQaMiss: string[]
  retestingStatus: string[]
  receivedDateStart?: string
  receivedDateEnd?: string
  startDateStart?: string
  startDateEnd?: string
  plannedEndDateStart?: string
  plannedEndDateEnd?: string
  actualEndDateStart?: string
  actualEndDateEnd?: string
  searchQuery?: string
  estimationLock?: 'all' | 'locked' | 'unlocked'
  overdueOnly?: boolean
  overrunOnly?: boolean
}

export interface ProductSummary {
  projectId: string
  productName: string
  productCode?: string
  totalIssues: number
  open: number
  inTesting: number
  blocked: number
  retesting: number
  completed: number
  estimatedHrs: number
  actualHrs: number
  remainingHrs: number
  overrunHrs: number
  blockedHrs: number
  retestingEstHrs: number
  qaMissCount: number
  testCaseCount: number
}

export interface TesterWorkload {
  testerName: string
  activeIssues: number
  estimatedHrs: number
  actualHrs: number
  remainingHrs: number
  overrunHrs: number
}

export interface KPICounters {
  totalIssues: number
  openIssues: number
  inTesting: number
  blocked: number
  retesting: number
  completed: number
  totalEstimatedHours: number
  totalActualHours: number
  remainingHours: number
  overrunHours: number
  totalBlockedHours: number
  totalRetestingEstHours: number
  qaMissCount: number
  totalTestCases: number
}

export type EffortIndicatorState = 'on_track' | 'attention' | 'overrun'

export interface EffortCalculation {
  remainingHrs: number
  overrunHrs: number
  isOverrun: boolean
  percentage: number
  indicatorState: EffortIndicatorState
  displayText: string
}

export const DEFAULT_TESTING_STATUSES: Array<{
  label: string
  value: string
  color: string
  badgeClass: string
}> = [
  { label: 'Not Started', value: 'Not Started', color: '#94a3b8', badgeClass: 'bg-slate-500/15 text-slate-300 border-slate-500/30' },
  { label: 'Assigned',    value: 'Assigned',    color: '#3b82f6', badgeClass: 'bg-blue-500/15 text-blue-400 border-blue-500/30' },
  { label: 'In Testing',  value: 'In Testing',  color: '#8b5cf6', badgeClass: 'bg-purple-500/15 text-purple-300 border-purple-500/30' },
  { label: 'Blocked',     value: 'Blocked',     color: '#ef4444', badgeClass: 'bg-red-500/15 text-red-400 border-red-500/30' },
  { label: 'Retesting',   value: 'Retesting',   color: '#06b6d4', badgeClass: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30' },
  { label: 'Completed',   value: 'Completed',   color: '#10b981', badgeClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' },
  { label: 'Cancelled',   value: 'Cancelled',   color: '#6b7280', badgeClass: 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30' },
]

export const DEFAULT_IS_QA_MISS_OPTIONS: Array<{ label: string; value: string }> = [
  { label: 'Yes',            value: 'Yes' },
  { label: 'No',             value: 'No' },
  { label: 'Under Review',   value: 'Under Review' },
  { label: 'Not Applicable', value: 'Not Applicable' },
]

export const DEFAULT_RETESTING_STATUS_OPTIONS: Array<{ label: string; value: string; color: string }> = [
  { label: 'Not Required', value: 'Not Required', color: '#6b7280' },
  { label: 'Pending',      value: 'Pending',      color: '#f59e0b' },
  { label: 'In Retesting', value: 'In Retesting', color: '#06b6d4' },
  { label: 'Passed',       value: 'Passed',       color: '#10b981' },
  { label: 'Failed',       value: 'Failed',       color: '#ef4444' },
  { label: 'Blocked',      value: 'Blocked',      color: '#f97316' },
]

export function calculateEffort(estimated: number, actual: number): EffortCalculation {
  const est = Math.max(0, Number(estimated) || 0)
  const act = Math.max(0, Number(actual) || 0)

  const isOverrun = act > est
  const remainingHrs = isOverrun ? 0 : Math.round((est - act) * 100) / 100
  const overrunHrs = isOverrun ? Math.round((act - est) * 100) / 100 : 0

  const percentage = est > 0 ? Math.round((act / est) * 100) : (act > 0 ? 100 : 0)

  let indicatorState: EffortIndicatorState = 'on_track'
  if (act > est) {
    indicatorState = 'overrun'
  } else if (est > 0 && act > est * 0.75) {
    indicatorState = 'attention'
  }

  const displayText = isOverrun
    ? `Overrun: ${overrunHrs} Hrs`
    : `${remainingHrs} Hrs`

  return { remainingHrs, overrunHrs, isOverrun, percentage, indicatorState, displayText }
}
