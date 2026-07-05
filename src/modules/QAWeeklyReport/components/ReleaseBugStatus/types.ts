// src/modules/QAWeeklyReport/components/ReleaseBugStatus/types.ts
// Types for Release Bug Status analytics

export interface BugStatusEntry {
  status: string
  count: number
}

export interface BugSeverityEntry {
  severity: string
  count: number
}

export interface BugPriorityEntry {
  priority: string
  count: number
}

export type ReleaseHealthStatus = 'ready' | 'needs_review' | 'not_ready'

export interface ReleaseHealthResult {
  status: ReleaseHealthStatus
  label: string
  emoji: string
  color: string
  score: number
}

export interface ReleaseBugMetrics {
  totalBugs: number
  completedBugs: number
  resolvedBugs: number
  activeBugs: number
  deferredBugs: number
  invalidBugs: number
  closurePercentage: number
  activePercentage: number
  deferredPercentage: number
  invalidPercentage: number
}

export interface ReleaseBugAnalytics {
  uploadedFileName: string
  uploadedAt: string
  metrics: ReleaseBugMetrics
  statusDistribution: BugStatusEntry[]
  severityDistribution: BugSeverityEntry[]
  priorityDistribution: BugPriorityEntry[]
  releaseHealth: ReleaseHealthResult
  aiSummary: string
  rawRowCount: number
}

// ── Status Classification Groups ──────────────────────────────────────────────

export const STATUS_GROUPS = {
  completed: ['closed', 'verified', 'uat passed', 'done'],
  resolved: ['fixed', 'ready for qa', 'ready for retest', 'ready for uat', 'resolved', 'ready for verification'],
  active: ['new', 'open', 'assigned', 'in progress', 'qa testing', 'retest', 'reopened', 'active', 'retesting'],
  deferred: ['deferred', 'on hold', 'postponed', 'backlog'],
  invalid: ['rejected', 'duplicate', 'non-reproducible bug', 'non-reproducible', 'cannot reproduce', 'not a bug', 'invalid', "won't fix", 'wont fix', 'cancelled', 'canceled', 'by design'],
} as const

// ── Column Name Mappings (intelligent header detection) ───────────────────────

export const STATUS_COLUMN_ALIASES = [
  'status', 'bug status', 'current status', 'workflow status', 'issue status',
  'state', 'bug state', 'resolution', 'issue state',
]

export const SEVERITY_COLUMN_ALIASES = [
  'severity', 'impact', 'bug severity', 'issue severity', 'sev', 'severity level',
]

export const PRIORITY_COLUMN_ALIASES = [
  'priority', 'priority level', 'bug priority', 'issue priority', 'pri',
]
