// src/modules/SupportIssueTracker/types.ts
// Comprehensive type definitions for Support Issue Tracker

export type TestingStatusType =
  | 'Not Started'
  | 'Assigned'
  | 'In Testing'
  | 'Blocked'
  | 'Retesting'
  | 'Completed'
  | 'Cancelled'
  | string

export interface SupportIssue {
  id: string
  sl_no: number
  project_id: string       // Linked to Project Hub project id
  product_name: string     // Display product name from Project Hub
  product_code?: string | null // Product code from Project Hub
  issue_id: string         // e.g. 'SUP-1024'
  description: string      // Support Issue Description
  received_date: string    // YYYY-MM-DD
  start_date: string | null// YYYY-MM-DD
  finish_date: string | null// YYYY-MM-DD
  tester_name: string      // Who's Testing
  estimated_hours: number  // Estimation Hrs
  estimated_hours_locked?: boolean // Requirement: Estimation Hours Lock
  estimated_hours_locked_by?: string | null // User who locked it
  estimated_hours_locked_at?: string | null // Timestamp when locked
  actual_hours: number     // Actual Hrs
  remaining_hours: number  // Remaining Hrs (max(0, estimated - actual))
  overrun_hours: number    // Overrun Hrs (max(0, actual - estimated))
  testing_status: TestingStatusType
  comments: string
  created_by?: string | null
  created_at: string
  updated_at: string
}

export interface SupportIssueTimeLog {
  id: string
  issue_id: string          // Issue string code e.g. 'SUP-1024'
  support_issue_id?: string // UUID of the parent support issue
  user_name: string         // Who logged the effort (e.g. 'Ameen', 'Rahul')
  user_id?: string | null   // Optional profile UUID
  hours_added: number       // Added effort in hours (e.g. 2, 2.5, 0.75)
  comment: string           // Description of work done (e.g. 'Payment module testing')
  logged_at: string         // ISO string timestamp (or formatted)
  created_at?: string
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
  timestamp: string // formatted e.g. "07 Oct 2026, 09:32 PM"
}

export interface SupportDropdownOption {
  id: string
  category: 'testing_status' | 'tester' | 'priority'
  label: string
  value: string
  color?: string
  is_active: boolean
  sort_order: number
}

export interface SupportFilters {
  selectedProductId: string // 'all' or project_id
  testingStatus: string[]   // empty = all
  tester: string[]          // empty = all
  receivedDateStart?: string
  receivedDateEnd?: string
  startDateStart?: string
  startDateEnd?: string
  finishDateStart?: string
  finishDateEnd?: string
  searchQuery?: string
  estimationLock?: 'all' | 'locked' | 'unlocked'
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

// Default testing statuses and their visual badges
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

// Calculation helper for Actual vs Estimated effort
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
    displayText
  }
}
