export interface SupportLogRecord {
  id: string
  user_id?: string // Owner of this record
  support_id: string
  bug_id: string
  branch: string
  description: string
  received_date: string
  qa: string
  tc_count: number | ''
  estimation_hrs: number | ''
  actual_start_date: string
  planned_end_date: string
  actual_end_date: string
  testing_status: string // Renamed from 'status' to 'testing_status'
  issue_source: string // Moved after testing_status, before comments
  comments: string
  blocked_hours: number | ''
  retesting_status: string
  retesting_estimation_hrs: number | ''
  sort_order?: number // Database column for ordering rows
  project_id?: string
}

export interface ReleaseTestingRecord {
  id: string
  user_id?: string // Owner of this record
  task_id: string
  description: string
  qa: string
  initial_round_estimation_hrs: number | ''
  testing_status: string // New field: centralized Testing Status
  smoke_testing_status: string
  scope_of_testing_for_smoke: string
  smoke_testing_estimation_hrs: number | ''
  overall_scope_of_testing: string
  overall_estimation_hrs: number | ''
  sort_order?: number // Database column for ordering rows
  project_id?: string
}

export type ConfigCategory = 'branch' | 'qa' | 'testing_status' | 'retesting_status' | 'smoke_status' | 'issue_source' | 'priority'

export interface DropdownConfig {
  id: string
  category: ConfigCategory
  value: string
  is_active: boolean
  sort_order: number
  created_by?: string
  updated_by?: string
  created_at?: string
  updated_at?: string
}

// ══════════════════════════════════════════════════════════════════════════
// Dynamic Column Customization
// ══════════════════════════════════════════════════════════════════════════

export type DailyReportTableKey = 'support' | 'release'

export type ColumnType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'percentage'
  | 'date'
  | 'datetime'
  | 'dropdown'
  | 'multiselect'
  | 'status'
  | 'boolean'
  | 'user'
  | 'url'

// Which bucket a dropdown option's value counts toward on the /daily-report
// summary dashboard cards (Passed/Fixed, Pending, Blocked, etc.). Only
// meaningful for options belonging to the Testing Status / Smoke Status
// columns — every other dropdown/multiselect/status column simply leaves
// this undefined. Values with no bucket assigned are treated as 'other'
// (counted in totals, but not in any specific completed/pending/blocked
// bucket) so a newly added or renamed status never silently disappears from
// the dashboard — it just needs its bucket assigned once.
export type OutcomeBucket = 'completed' | 'blocked' | 'pending' | 'other'

export interface DropdownOptionItem {
  id: string
  label: string
  sort_order: number
  outcome_bucket?: OutcomeBucket | null
}

// Marks a column (system OR custom — either can hold this) as the source the
// /daily-report summary dashboard reads for a given table's status metric.
// 'testing_status' is read by the Support & Exception Log dashboard cards
// (Passed/Fixed, Pending Run, Blocked Support); 'smoke_status' is read by
// the Release Testing Log cards (Smoke Passed, Pending Smoke, Blocked
// Smoke). Exactly one column per table should hold a given role at a time —
// assigning it to a column clears it from whichever column held it before.
// This is an explicit assignment (not inferred from internal_key), so a
// user-renamed or fully custom column can be designated as the dashboard's
// source just as easily as the original system column.
export type DashboardRole = 'testing_status' | 'smoke_status'

export interface ColumnConfig {
  id: string
  project_id: string | null // null = Organization Default
  table_key: DailyReportTableKey
  internal_key: string // stable identifier, never shown/changed by rename
  display_name: string
  column_type: ColumnType
  description?: string | null
  placeholder?: string | null
  is_required: boolean
  is_visible: boolean
  is_system: boolean
  include_in_qa_report: boolean
  include_in_export: boolean
  default_value?: string | null
  dropdown_options: DropdownOptionItem[]
  config_category?: ConfigCategory | null // links system dropdown columns to daily_report_dropdown_configs
  dashboard_role?: DashboardRole | null // see DashboardRole — which summary-card metric this column feeds, if any
  display_order: number
  created_by?: string
  created_at?: string
  updated_at?: string
}

export const COLUMN_TYPE_LABELS: Record<ColumnType, string> = {
  short_text: 'Short Text',
  long_text: 'Long Text',
  number: 'Number',
  percentage: 'Percentage',
  date: 'Date',
  datetime: 'Date and Time',
  dropdown: 'Dropdown',
  multiselect: 'Multi-Select Dropdown',
  status: 'Status',
  boolean: 'Yes/No Toggle',
  user: 'User or Team Member',
  url: 'URL',
}

// Column types that support a configurable option list (dropdown/multiselect/status)
export const OPTION_BASED_COLUMN_TYPES: ColumnType[] = ['dropdown', 'multiselect', 'status']

export interface ColumnMapping {
  id: string
  project_id: string | null
  table_key: DailyReportTableKey
  dup_column_id: string
  action: 'map_existing' | 'create_new' | 'skip'
  target_field?: string | null
}

export interface DashboardSummary {
  totalSupportTasks: number
  totalReleaseTasks: number
  completed: number
  pending: number
  blocked: number
  totalEstimatedHours: number
  totalActualHours: number
}
