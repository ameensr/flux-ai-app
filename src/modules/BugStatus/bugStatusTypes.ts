// src/modules/BugStatus/bugStatusTypes.ts
// Types for Bug Status analytics

export interface BugStatusRecord {
  [key: string]: any
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

export interface BugStatusAnalytics {
  uploadedFileName: string
  uploadedAt: string
  rawRowCount: number
  detectedColumns: string[]
  parentColumn: string | null
  statusColumn: string | null
  allRecords: BugStatusRecord[]
  parentWiseStatus: ParentStatusSummary[]
  overallStatus: OverallStatusSummary[]
  uniqueParents: number
  uniqueStatuses: string[]
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
  'parent issue', 'parent-ticket', 'epic', 'epic link', 'parent id',
  'module', 'component', 'feature', 'area'
]

export const BUG_STATUS_COLUMN_ALIASES = [
  'status', 'bug status', 'issue status', 'defect status',
  'current status', 'workflow status', 'state', 'issue state', 'resolution'
]
