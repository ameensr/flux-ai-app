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
  // Testing Status change tracking
  forwardedToTestingAt: string | null
  forwardedToTestingBy: string | null
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
