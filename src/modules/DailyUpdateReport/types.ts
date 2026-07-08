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

export interface DashboardSummary {
  totalSupportTasks: number
  totalReleaseTasks: number
  completed: number
  pending: number
  blocked: number
  totalEstimatedHours: number
  totalActualHours: number
}
