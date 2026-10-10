// src/modules/QAWeeklyReport/qaohImportMapping.ts
// Maps QAOH (Support Issue Tracker / Release Task Tracker) records into the
// QA Report's SupportTicket / ReleaseItem shapes.
//
// Reuses mergeSupportImport / mergeReleaseImport from dupImportMapping so
// duplicate-handling, upsert logic, and deduplication keys are identical to
// the existing Import from DUP workflow.

import { supabase } from '@/lib/supabase'
import type { SupportIssue } from '@/modules/SupportIssueTracker/types'
import type { ReleaseTask } from '@/modules/ReleaseTaskTracker/types'
import type { SupportTicket, ReleaseItem } from './types'
import { mergeSupportImport, mergeReleaseImport } from './dupImportMapping'

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Parse a date-only string (YYYY-MM-DD) or ISO timestamp to a Date at midnight local. */
function toLocalDate(raw: string | null | undefined): Date | null {
  if (!raw) return null
  try {
    // ISO timestamp — use as-is
    if (raw.includes('T')) return new Date(raw)
    // Date-only — parse as local midnight to avoid UTC-offset shifting the day
    const [y, m, d] = raw.split('-').map(Number)
    if (!y || !m || !d) return null
    return new Date(y, m - 1, d)
  } catch {
    return null
  }
}

/**
 * Inclusive date-range filter.
 * receivedRaw: the raw received_date (YYYY-MM-DD) or received_date_time (ISO).
 * Both from and to are compared at day granularity (time-of-day ignored).
 */
export function isWithinDateRange(
  receivedRaw: string | null | undefined,
  from: string | null | undefined,
  to: string | null | undefined,
): boolean {
  if (!from && !to) return true
  if (!receivedRaw) return false

  const received = toLocalDate(receivedRaw)
  if (!received) return false

  // Normalise to midnight for day-level comparison
  const receivedDay = new Date(received.getFullYear(), received.getMonth(), received.getDate())

  if (from) {
    const fromDay = toLocalDate(from)
    if (fromDay) {
      const f = new Date(fromDay.getFullYear(), fromDay.getMonth(), fromDay.getDate())
      if (receivedDay < f) return false
    }
  }
  if (to) {
    const toDay = toLocalDate(to)
    if (toDay) {
      const t = new Date(toDay.getFullYear(), toDay.getMonth(), toDay.getDate())
      if (receivedDay > t) return false
    }
  }
  return true
}

// ── Fetch helpers (project-scoped, RLS-enforced) ──────────────────────────────

/**
 * Fetch support issues for a project from Supabase.
 * RLS on support_issues enforces project membership — the filter here is an
 * additional explicit guard so the UI never shows cross-project data even if
 * RLS is misconfigured.
 */
export async function fetchQAOHSupportIssues(projectId: string): Promise<SupportIssue[]> {
  const { data, error } = await supabase
    .from('support_issues')
    .select('*')
    .eq('project_id', projectId)
    .order('sl_no', { ascending: true })

  if (error) throw new Error(`Failed to fetch support issues: ${error.message}`)
  return (data || []) as SupportIssue[]
}

/**
 * Fetch release tasks for a project from Supabase.
 * Same dual-guard pattern as above.
 */
export async function fetchQAOHReleaseTasks(projectId: string): Promise<ReleaseTask[]> {
  const { data, error } = await supabase
    .from('release_tasks')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('sl_no', { ascending: true })

  if (error) throw new Error(`Failed to fetch release tasks: ${error.message}`)
  return (data || []) as ReleaseTask[]
}

// ── Column mapping: Support Issue → SupportTicket ────────────────────────────
//
// Support Issue Register → Support & Exception Log
//
// | Source field (SupportIssue)  | Destination field (SupportTicket) |
// |------------------------------|-----------------------------------|
// | issue_id                     | taskId                            |
// | description                  | description                       |
// | tester_name                  | assignedQA                        |
// | testing_status               | status (kept as-is)               |
// | comments                     | remarks                           |
// | is_qa_miss / priority        | priority (heuristic, see below)   |

function mapSupportPriority(issue: SupportIssue): SupportTicket['priority'] {
  // SupportIssue has no explicit priority field — derive from is_qa_miss as a
  // reasonable heuristic; fall back to Medium.
  const miss = (issue.is_qa_miss || '').toLowerCase()
  if (miss === 'yes') return 'High'
  return 'Medium'
}

export function mapSupportIssueToTicket(issue: SupportIssue): SupportTicket {
  return {
    id: crypto.randomUUID(),
    taskId: issue.issue_id || '',
    description: issue.description || '',
    assignedQA: issue.tester_name || '',
    status: (issue.testing_status || 'Open') as SupportTicket['status'],
    priority: mapSupportPriority(issue),
    remarks: issue.comments || '',
  }
}

// ── Column mapping: ReleaseTask → ReleaseItem ─────────────────────────────────
//
// Release Task Register → Release Testing Log
//
// | Source field (ReleaseTask)       | Destination field (ReleaseItem) |
// |----------------------------------|---------------------------------|
// | task_id                          | taskId                          |
// | description                      | featureName                     |
// | assigned_to_name                 | assignee                        |
// | task_status                      | status (normalised)             |
// | priority                         | priority                        |
// | comments                         | remarks                         |
// | total_estimation_hrs (+ 4 parts) | customFields (see below)        |
//
// Estimation sub-fields are stored in customFields so they appear as extra
// columns in the QA Report table without breaking the fixed ReleaseItem schema.

function normaliseReleaseStatus(raw: string): ReleaseItem['status'] {
  const s = (raw || '').toLowerCase().trim()
  if (s.includes('pass') || s.includes('complet') || s.includes('done')) return 'Pass'
  if (s.includes('fail')) return 'Fail'
  if (s.includes('block')) return 'Blocked'
  if (s.includes('progress') || s.includes('in-progress')) return 'In Progress'
  return 'Not Started'
}

export function mapReleaseTaskToItem(task: ReleaseTask): ReleaseItem {
  return {
    id: crypto.randomUUID(),
    taskId: task.task_id || '',
    featureName: task.description || '',
    assignee: task.assigned_to_name || '',
    status: normaliseReleaseStatus(task.task_status),
    priority: (task.priority || 'Medium') as ReleaseItem['priority'],
    remarks: task.comments || '',
    customFields: {
      // Estimation breakdown — stored as custom fields so they render as
      // extra columns in the Release Testing Log table.
      test_design_est_hrs: task.test_design_est_hrs ?? 0,
      data_prep_est_hrs: task.data_prep_est_hrs ?? 0,
      functional_testing_est_hrs: task.functional_testing_est_hrs ?? 0,
      retesting_est_hrs: task.retesting_est_hrs ?? 0,
      total_estimation_hrs: task.total_estimation_hrs ?? 0,
      release_version: task.release_version || '',
      product_name: task.product_name || '',
    },
  }
}

// ── Public import helpers ─────────────────────────────────────────────────────

export function importSupportIssues(
  existing: SupportTicket[],
  issues: SupportIssue[],
): ReturnType<typeof mergeSupportImport> {
  const incoming = issues.map(mapSupportIssueToTicket)
  return mergeSupportImport(existing, incoming)
}

export function importReleaseTasks(
  existing: ReleaseItem[],
  tasks: ReleaseTask[],
): ReturnType<typeof mergeReleaseImport> {
  const incoming = tasks.map(mapReleaseTaskToItem)
  return mergeReleaseImport(existing, incoming)
}
