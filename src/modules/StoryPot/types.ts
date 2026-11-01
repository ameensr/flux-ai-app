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

// Cached work package from Supabase (snake_case to match DB)
export interface CachedStoryPotWorkPackage {
  id: number
  project_id: string
  op_project_id: number | null
  op_project_name: string | null
  subject: string
  description: string | null
  type: string
  status: string
  priority: string
  author: string | null
  assignee: string | null
  responsible: string | null
  release_tag: string | null
  testing_status: string | null
  is_qa_missed: string | null
  qa_confirmation: string | null
  forwarded_to_testing_at: string | null
  forwarded_to_testing_by: string | null
  handoff_verified: boolean
  handoff_count: number
  start_date: string | null
  due_date: string | null
  created_at: string | null
  updated_at: string | null
  percentage_done: number
  estimated_time: string | null
  spent_time: string | null
  story_points: number | null
  is_overdue: boolean
  version_name: string | null
  last_synced_at: string
}

// Convert cached work package to display format
export function cachedToDisplay(cached: CachedStoryPotWorkPackage): StoryPotWorkPackage {
  return {
    id: cached.id,
    subject: cached.subject,
    description: cached.description || '',
    type: cached.type,
    status: cached.status,
    priority: cached.priority,
    assignee: cached.assignee || 'Unassigned',
    responsible: cached.responsible,
    project: cached.op_project_name || '',
    author: cached.author || '',
    version: cached.version_name,
    release: cached.release_tag,
    startDate: cached.start_date,
    dueDate: cached.due_date,
    createdAt: cached.created_at,
    updatedAt: cached.updated_at,
    percentageDone: cached.percentage_done,
    estimatedTime: cached.estimated_time,
    spentTime: cached.spent_time,
    storyPoints: cached.story_points,
    isOverdue: cached.is_overdue,
    customFields: {},
    testingStatus: cached.testing_status,
    isQAMissed: cached.is_qa_missed,
    qaConfirmation: cached.qa_confirmation,
    receivedDate: null,
    forwardedToTestingAt: cached.forwarded_to_testing_at,
    forwardedToTestingBy: cached.forwarded_to_testing_by,
    handoffVerified: cached.handoff_verified,
    handoffCount: cached.handoff_count,
  }
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
