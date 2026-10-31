// src/modules/StoryPot/types.ts

export interface StoryPotWorkPackage {
  id: number
  subject: string
  description: string
  type: string
  status: string
  priority: string
  assignee: string
  responsible: string | null
  project: string
  author: string
  version: string | null
  release: string | null // Release custom field from OpenProject
  startDate: string | null
  dueDate: string | null
  createdAt: string | null
  updatedAt: string | null
  percentageDone: number
  estimatedTime: string | null
  spentTime: string | null
  storyPoints: number | null
  isOverdue: boolean
  // Custom fields from OpenProject
  customFields: Record<string, string | null>
  testingStatus: string | null
  isQAMissed: string | null
  qaConfirmation: string | null
  // Received Date from OpenProject custom field (NOT the actual transition date)
  receivedDate: string | null
  // Actual Testing Status transition data (from activity history)
  forwardedToTestingAt: string | null // Actual timestamp when forwarded
  forwardedToTestingBy: string | null // Person who changed the status
  handoffVerified: boolean // Whether the handoff data is from verified activity history
  handoffCount: number // Number of times forwarded (for multiple forwarding events)
}

export interface StoryPotFilters {
  // Basic filters
  search: string
  status: string
  type: string
  priority: string
  // QA Manager/Lead filters
  author: string
  assignee: string
  releaseTag: string
  testingStatus: string
  isQAMissed: string // 'Yes' | 'No' | ''
  qaConfirmation: string
  // Date range filter (ticket created date)
  receivedDateFrom: string
  receivedDateTo: string
  // Testing Received Date filter (when forwarded to testing)
  testingReceivedDateFrom: string
  testingReceivedDateTo: string
}

export interface StoryPotStats {
  total: number
  filtered: number
  byStatus: Record<string, number>
  byType: Record<string, number>
  byPriority: Record<string, number>
  byAuthor: Record<string, number>
  byAssignee: Record<string, number>
  byTestingStatus: Record<string, number>
  overdue: number
  unassigned: number
  completedPercentage: number
  qaMissedCount: number
}

export interface FilterOption {
  id: number | string
  name: string
}

export interface CustomFieldConfig {
  id: number
  name: string
  fieldFormat: string
  mappedTo?: 'testingStatus' | 'isQAMissed' | 'qaConfirmation'
}
