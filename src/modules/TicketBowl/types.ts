// src/modules/TicketBowl/types.ts
// Domain types and data models for Ticket Bowl

export type TicketSyncStatus = 'synced' | 'sync_failed' | 'partially_synced'

export type ForwardingHistoryVerification =
  | 'verified'          // Verified transition to "Forwarded to the Testing Team" identified
  | 'unavailable'       // Historical activity is missing or inaccessible in OpenProject
  | 'unverified'        // Activity exists, but exact transition or actor cannot be confirmed
  | 'no_matching_event' // Activity checked successfully, but no qualifying transition was found

export interface TicketBowlWorkPackage {
  id: string
  project_id: string
  op_project_id: number | null
  op_project_name: string | null
  work_package_id: number
  subject: string
  description: string | null
  type_id: number | null
  type_name: string
  status_id: number | null
  status_name: string
  priority_id: number | null
  priority_name: string
  author_id: number | null
  author_name: string | null
  assignee_id: number | null
  assignee_name: string | null
  responsible_id: number | null
  responsible_name: string | null
  testing_status: string | null
  is_qa_missed: string | null
  qa_confirmation: string | null
  release_tag: string | null
  version_name: string | null
  percentage_done: number
  estimated_time: string | null
  spent_time: string | null
  story_points: number | null
  start_date: string | null
  due_date: string | null
  is_overdue: boolean
  created_at_op: string | null
  updated_at_op: string | null
  matched_forwarded_at: string | null
  matched_forwarded_by: string | null
  latest_forwarded_at: string | null
  latest_forwarded_by_id: number | null
  latest_forwarded_by_name: string | null
  forwarding_count: number

  // Incomplete History & Verification Status
  sync_status: TicketSyncStatus
  history_verification_status: ForwardingHistoryVerification
  history_checked_at: string | null
  history_error: string | null

  last_synced_at: string
  raw_custom_fields?: Record<string, unknown>
}

export interface TicketBowlForwardingEvent {
  id: string
  project_id: string
  op_project_id: number | null
  work_package_id: number
  activity_id: number | null
  previous_testing_status: string | null
  new_testing_status: string
  changed_at: string
  changed_by_id: number | null
  changed_by_name: string
  verification_status: 'verified' | 'unverified'
  source: string
  created_at: string
}

export interface TicketBowlSyncStatus {
  id: string
  project_id: string
  op_project_id: number | null
  op_project_name: string | null
  sync_status: 'pending' | 'running' | 'completed' | 'completed_with_errors' | 'failed'
  started_at: string | null
  completed_at: string | null
  total_fetched: number
  total_inserted: number
  total_updated: number
  forwarding_events_found: number
  history_verified_count: number
  history_unavailable_count: number
  history_unverified_count: number
  errors_count: number
  last_successful_sync_at: string | null
  error_details: string | null
  created_at: string
  updated_at: string
}

export interface TicketBowlFilters {
  projectId: string
  opProjectId?: number | null
  forwardedFrom?: string | null // YYYY-MM-DD
  forwardedTo?: string | null   // YYYY-MM-DD
  typeName?: string | null
  statusName?: string | null
  priorityName?: string | null
  testingStatus?: string | null
  isQAMissed?: string | null
  authorName?: string | null
  assigneeName?: string | null
  historyVerificationStatus?: ForwardingHistoryVerification | null
  search?: string | null
  pageSize: number
  page: number
}

export interface TicketBowlDashboardStats {
  totalUniqueTickets: number
  totalForwardingEvents: number
  repeatForwardedTickets: number
  unavailableHistoryTickets: number
  currentTestingStatusCounts: Record<string, number>
  qaMissedCounts: Record<string, number>
  typeCounts: Record<string, number>
  priorityCounts: Record<string, number>
  historyVerificationCounts: Record<string, number>
}

export interface TicketBowlSyncProgress {
  phase:
    | 'fetching-tickets'
    | 'saving-snapshots'
    | 'fetching-activities'
    | 'saving-history'
    | 'recalculating-counts'
    | 'complete'
    | 'error'
  current: number
  total: number
  message: string
  ticketsSaved?: number
  eventsFound?: number
  verifiedCount?: number
  unavailableCount?: number
  failedCount?: number
}

export interface TicketBowlQueryResult {
  items: TicketBowlWorkPackage[]
  total: number
  pageSize: number
  page: number
  totalPages: number
}
