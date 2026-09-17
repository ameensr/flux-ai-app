// src/modules/QAWeeklyReport/components/ReleaseBugStatus/taskWiseTypes.ts
// Types for Task-Wise Status analytics

export interface TaskWiseRecord {
  [key: string]: any // Dynamic fields from Excel
}

export interface ParentStatusSummary {
  parent: string
  total: number
  statusCounts: Record<string, number>
}

export interface OverallStatusSummary {
  status: string
  count: number
}

export interface TaskWiseAnalytics {
  uploadedFileName: string
  uploadedAt: string
  rawRowCount: number
  
  // Detected column names from Excel
  detectedColumns: string[]
  parentColumn: string | null
  statusColumn: string | null
  
  // All records (preserving exact field names)
  allRecords: TaskWiseRecord[]
  
  // Parent-wise status summary
  parentWiseStatus: ParentStatusSummary[]
  
  // Overall status summary
  overallStatus: OverallStatusSummary[]
  
  // Unique values
  uniqueParents: number
  uniqueStatuses: string[]
  
  // Validation
  validation: {
    totalRecordsMatch: boolean
    parentWiseTotalMatch: boolean
    overallStatusTotalMatch: boolean
    missingFields: string[]
    blankParentCount: number
  }
}

// Column name aliases for auto-detection
export const PARENT_COLUMN_ALIASES = [
  'parent', 'parentticket', 'parent ticket', 'parent_ticket',
  'parent issue', 'parent-ticket', 'epic', 'epic link', 'parent id'
]

export const TASK_STATUS_COLUMN_ALIASES = [
  'status', 'issue status', 'task status', 'current status',
  'workflow status', 'state', 'issue state'
]
