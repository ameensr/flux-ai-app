// src/features/panda-copilot/types/pandaTypes.ts
// Shared types for the Hybrid Panda Copilot feature.

// ── Intent Registry ───────────────────────────────────────────────────────────

export type IntentId =
  | 'GET_TODAYS_SUMMARY'
  | 'GET_SUPPORT_ISSUES'
  | 'GET_OPEN_ISSUES'
  | 'GET_CRITICAL_ISSUES'
  | 'GET_RELEASE_STATUS'
  | 'GET_PENDING_RELEASES'
  | 'GET_LATEST_QA_REPORT'
  | 'GET_QA_REPORTS_BY_DATE'
  | 'GET_PROJECT_OVERVIEW'
  | 'GET_MY_TASKS'
  | 'GET_RECENT_UPDATES'
  | 'SEARCH_ACROSS_MODULES'
  | 'COUNT_ISSUES'
  | 'FILTER_RECORDS'
  | 'GET_ISSUE_BY_ID'
  | 'AI_ANALYSIS'
  | 'UNKNOWN'

export type ProcessingLayer = 'RULE_BASED' | 'SEARCH' | 'AI' | 'UNKNOWN'

// ── Parsed Query ──────────────────────────────────────────────────────────────

export interface DateRange {
  start: string  // ISO date YYYY-MM-DD
  end: string    // ISO date YYYY-MM-DD (exclusive)
  label: string  // human-readable e.g. "today", "this week"
}

export interface ParsedQuery {
  raw: string
  normalized: string
  intent: IntentId
  layer: ProcessingLayer
  filters: {
    status?: string[]
    priority?: string[]
    projectId?: string
    projectName?: string
    assignedTo?: string
    issueId?: string
    keyword?: string
    dateRange?: DateRange
    dateField?: 'created' | 'updated' | 'received'
  }
  context: {
    currentRoute?: string
    currentProjectId?: string
    previousIntentId?: IntentId
    previousResultModule?: string
  }
}

// ── Response Types ────────────────────────────────────────────────────────────

export type ResponseType =
  | 'SUMMARY_CARDS'
  | 'DATA_TABLE'
  | 'EMPTY_STATE'
  | 'ERROR_STATE'
  | 'LOADING'
  | 'AI_RESPONSE'
  | 'TEA_BREAK'
  | 'CROSS_MODULE_RESULTS'
  | 'PROJECT_OVERVIEW'
  | 'TEXT'

export interface SupportIssueRow {
  id: string
  issue_id: string
  description: string
  testing_status: string
  tester_name: string
  product_name: string
  received_date: string
  updated_at: string
  estimated_hours: number
  actual_hours: number
  project_id: string
}

export interface ReleaseTaskRow {
  id: string
  task_id: string
  description: string
  task_status: string
  assigned_to_name: string
  product_name: string
  release_version: string
  target_date: string | null
  updated_at: string
  estimated_hours: number
  actual_hours: number
  project_id: string
}

export interface QAReportRow {
  id: string
  week: string
  project: string
  projectId: string
  generatedDate: string
  createdBy: string
  status: 'Draft' | 'Final'
  name?: string
}

export interface ProjectRow {
  id: string
  name: string
  project_code: string
  status: string
  description: string
  member_count: number
}

export interface SummaryCard {
  label: string
  value: number | string
  color?: 'green' | 'red' | 'amber' | 'blue' | 'purple' | 'default'
}

export interface CrossModuleGroup {
  module: string
  moduleKey: string
  route: string
  count: number
  items: Array<{
    id: string
    title: string
    subtitle: string
    status?: string
    route?: string
  }>
}

export interface PandaResponse {
  type: ResponseType
  title?: string
  subtitle?: string
  summaryCards?: SummaryCard[]
  supportIssues?: SupportIssueRow[]
  releaseTasks?: ReleaseTaskRow[]
  qaReports?: QAReportRow[]
  projects?: ProjectRow[]
  crossModuleGroups?: CrossModuleGroup[]
  aiText?: string
  errorMessage?: string
  emptyMessage?: string
  totalCount?: number
  hasMore?: boolean
  // Tea break specific
  originalQuery?: string
  canRetry?: boolean
  canShowData?: boolean
}

// ── Conversation Message ──────────────────────────────────────────────────────

export interface CopilotMessage {
  id: string
  role: 'user' | 'panda'
  text?: string
  response?: PandaResponse
  timestamp: number
  parsedQuery?: ParsedQuery
}

// ── AI Error Classification ───────────────────────────────────────────────────

export type AIErrorClass =
  | 'TEA_BREAK'        // Confirmed temporary service outage
  | 'TIMEOUT'          // Request timed out
  | 'AUTH_ERROR'       // Invalid API key / auth
  | 'QUOTA_EXCEEDED'   // Rate limit / billing
  | 'PERMISSION'       // User permission denied
  | 'INVALID_REQUEST'  // Bad request
  | 'UNKNOWN'          // Unclassified

export function classifyAIError(err: unknown): AIErrorClass {
  const msg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase()

  if (
    msg.includes('service unavailable') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('temporarily unavailable') ||
    msg.includes('all providers failed') ||
    msg.includes('no providers available') ||
    msg.includes('backend is down') ||
    msg.includes('connection refused') ||
    msg.includes('network error') ||
    msg.includes('failed to fetch')
  ) return 'TEA_BREAK'

  if (msg.includes('timed out') || msg.includes('timeout') || msg.includes('aborted')) return 'TIMEOUT'
  if (msg.includes('api key') || msg.includes('unauthorized') || msg.includes('401')) return 'AUTH_ERROR'
  if (msg.includes('quota') || msg.includes('rate limit') || msg.includes('429') || msg.includes('billing')) return 'QUOTA_EXCEEDED'
  if (msg.includes('permission') || msg.includes('restricted') || msg.includes('not allowed')) return 'PERMISSION'
  if (msg.includes('invalid') || msg.includes('bad request') || msg.includes('400')) return 'INVALID_REQUEST'

  return 'UNKNOWN'
}

export const TEA_BREAK_MESSAGE = `🐼 Panda's on a Tea Break! ☕

Even the smartest pandas need a little chai time!

My AI brain is temporarily unavailable, but I can still fetch your project data, QA reports, and support issues.

Let's try the AI magic again in a little while! ✨`
