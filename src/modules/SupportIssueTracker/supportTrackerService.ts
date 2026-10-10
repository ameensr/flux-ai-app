// src/modules/SupportIssueTracker/supportTrackerService.ts

import { supabase } from '@/lib/supabase'
import { fetchProjects as fetchProjectHubProjects } from '@/modules/ProjectHub/projectService'
import type { ProjectWithMembers } from '@/modules/ProjectHub/types'
import type {
  SupportIssue,
  SupportIssueHistoryRecord,
  SupportIssueTimeLog,
  SupportIssueBlockedPeriod,
  SupportDropdownOption,
  SupportDropdownCategory
} from './types'
import { DEFAULT_TESTING_STATUSES, DEFAULT_IS_QA_MISS_OPTIONS, DEFAULT_RETESTING_STATUS_OPTIONS } from './types'
import * as XLSX from 'xlsx'

export const LOCAL_STORAGE_ISSUES_KEY = 'qaly_support_tracker_issues_v2'
export const LOCAL_STORAGE_HISTORY_KEY = 'qaly_support_tracker_history_v2'
export const LOCAL_STORAGE_DROPDOWNS_KEY = 'qaly_support_tracker_dropdowns_v2'
export const LOCAL_STORAGE_TIMELOGS_KEY = 'qaly_support_tracker_time_logs_v2'

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

export function isUUID(val?: string | null): boolean {
  if (!val) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val)
}

const DUMMY_CLEANUP_KEY = 'qaly_support_tracker_dummy_removed_v2'
if (typeof window !== 'undefined') {
  try {
    if (!localStorage.getItem(DUMMY_CLEANUP_KEY)) {
      localStorage.removeItem('qaly_support_tracker_issues_v1')
      localStorage.removeItem('qaly_support_tracker_history_v1')
      localStorage.removeItem('qaly_support_tracker_time_logs_v1')
      localStorage.removeItem(LOCAL_STORAGE_ISSUES_KEY)
      localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY)
      localStorage.removeItem(LOCAL_STORAGE_TIMELOGS_KEY)
      localStorage.setItem(DUMMY_CLEANUP_KEY, 'true')
    }
  } catch { /* ignore */ }
}

export const DEFAULT_TESTERS = [
  'AMEEN SR', 'SARAH JENKINS', 'MICHAEL ROSS',
  'EMILY TAYLOR', 'DAVID KUMAR', 'ALEX CHEN', 'RACHEL GREEN'
]

// ── Product Source ────────────────────────────────────────────────────────────

export async function fetchProductsFromProjectHub(): Promise<ProjectWithMembers[]> {
  try {
    const projects = await fetchProjectHubProjects()
    if (projects && projects.length > 0) return projects
  } catch (err) {
    console.warn('[supportTrackerService] fetchProjectHubProjects error:', err)
  }
  try {
    const { data, error } = await supabase.from('projects').select('*').order('name', { ascending: true })
    if (!error && data && data.length > 0) {
      return data.map(p => ({ ...p, members: [], member_count: 0 })) as ProjectWithMembers[]
    }
  } catch (dbErr) {
    console.warn('[supportTrackerService] direct projects fetch error:', dbErr)
  }
  return [
    {
      id: '00000000-0000-4000-8000-000000000001', name: 'Qaly AI Engine Core',
      project_code: 'QALY-CORE', description: 'Core AI Agentic Engine', status: 'active',
      start_date: '2026-01-01', target_end_date: '2026-12-31', actual_end_date: null,
      tags: ['AI'], metadata: {}, created_by: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      members: [], member_count: 5
    },
    {
      id: '00000000-0000-4000-8000-000000000002', name: 'Flux Web Portal',
      project_code: 'FLUX-WEB', description: 'Enterprise UI Portal', status: 'active',
      start_date: '2026-02-15', target_end_date: '2026-11-30', actual_end_date: null,
      tags: ['Frontend'], metadata: {}, created_by: null,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      members: [], member_count: 4
    }
  ]
}

// ── Deduplication helpers ─────────────────────────────────────────────────────

function deduplicateIssues(issues: SupportIssue[]): SupportIssue[] {
  const seen = new Set<string>()
  return issues.filter(i => { if (seen.has(i.id)) return false; seen.add(i.id); return true })
}

function deduplicateLogs(logs: SupportIssueTimeLog[]): SupportIssueTimeLog[] {
  const seen = new Set<string>()
  return logs.filter(l => { if (seen.has(l.id)) return false; seen.add(l.id); return true })
}

function deduplicateDropdowns(options: SupportDropdownOption[]): SupportDropdownOption[] {
  const seen = new Set<string>()
  return options.filter(o => {
    const key = o.value.toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

// ── Fetch Issues ──────────────────────────────────────────────────────────────

export async function fetchSupportIssues(
  products: ProjectWithMembers[],
  timeLogs?: SupportIssueTimeLog[]
): Promise<SupportIssue[]> {
  const resolvedLogs = timeLogs ?? await fetchSupportTimeLogs()

  const syncWithTimeLogs = (issuesList: SupportIssue[]): SupportIssue[] => {
    return issuesList.map(issue => {
      const logs = resolvedLogs.filter(
        l => l.issue_id === issue.issue_id || (issue.id && l.support_issue_id === issue.id)
      )
      if (logs.length > 0) {
        const sumActual = Math.round(logs.reduce((acc, l) => acc + Number(l.hours_added), 0) * 100) / 100
        const est = Number(issue.estimated_hours) || 0
        const isOverrun = sumActual > est
        return {
          ...issue,
          actual_hours: sumActual,
          remaining_hours: isOverrun ? 0 : Math.round((est - sumActual) * 100) / 100,
          overrun_hours: isOverrun ? Math.round((sumActual - est) * 100) / 100 : 0
        }
      }
      return issue
    })
  }

  let localIssues: SupportIssue[] = []
  const cached = localStorage.getItem(LOCAL_STORAGE_ISSUES_KEY)
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as SupportIssue[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        localIssues = deduplicateIssues(parsed.filter(item => !item.id?.startsWith('issue-100')))
      }
    } catch (e) { console.warn('Failed parsing cached issues', e) }
  }

  // Collect authorized project IDs from the already-fetched products list.
  // This scopes the query to only rows the current user is permitted to see,
  // matching the RLS boundary on the projects table (migration 065).
  const authorizedProjectIds = products
    .map(p => p.id)
    .filter(id => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))

  try {
    let issueQuery = supabase
      .from('support_issues')
      .select('*')
      .order('sl_no', { ascending: true })

    // Only apply the project filter when we have real UUID project IDs.
    // If the list is empty (no projects assigned) return nothing rather than
    // falling through to an unfiltered query.
    if (authorizedProjectIds.length > 0) {
      issueQuery = issueQuery.in('project_id', authorizedProjectIds)
    } else {
      // User has no authorized projects — return empty set immediately.
      return []
    }

    const { data, error } = await issueQuery

    if (!error && data) {
      if (data.length === 0) {
        // User has authorized projects but no issues — clear any stale cache and return empty.
        localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify([]))
        return []
      }
      const mapped = data.map((item: any) => {
        const matchingProject = products.find(p => p.id === item.project_id)
        const est = Number(item.estimated_hours) || 0
        const act = Number(item.actual_hours) || 0
        const isOverrun = act > est
        return {
          ...item,
          product_name: matchingProject?.name || item.product_name,
          product_code: matchingProject?.project_code || item.product_code,
          estimated_hours: est,
          actual_hours: act,
          remaining_hours: isOverrun ? 0 : Math.round((est - act) * 100) / 100,
          overrun_hours: isOverrun ? Math.round((act - est) * 100) / 100 : 0,
          // Normalize new fields with safe defaults
          received_time: item.received_time || null,
          is_qa_miss: item.is_qa_miss || 'Not Applicable',
          test_case_count: item.test_case_count != null ? Number(item.test_case_count) : 0,
          planned_end_date: item.planned_end_date || null,
          actual_end_date: item.actual_end_date || null,
          blocked_hours: item.blocked_hours != null ? Number(item.blocked_hours) : 0,
          retesting_status: item.retesting_status || 'Not Required',
          retesting_estimation_hrs: item.retesting_estimation_hrs != null ? Number(item.retesting_estimation_hrs) : 0,
          // finish_date kept for backward compat
          finish_date: item.finish_date || null
        }
      })

      const dbIds = new Set(mapped.map((m: any) => m.id))
      const dbIssueIds = new Set(mapped.map((m: any) => m.issue_id))
      const authorizedSet = new Set(authorizedProjectIds)
      const pendingLocal = localIssues.filter(l =>
        !dbIds.has(l.id) && !dbIssueIds.has(l.issue_id) &&
        (!l.project_id || authorizedSet.has(l.project_id))
      )
      const merged = deduplicateIssues([...mapped, ...pendingLocal])
      const synced = syncWithTimeLogs(merged)
      localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify(synced))
      return synced
    }
  } catch (err) {
    console.warn('[supportTrackerService] supabase fetchSupportIssues error:', err)
  }

  if (localIssues.length > 0) {
    // Filter cached issues to only those belonging to authorized projects.
    const authorizedSet = new Set(authorizedProjectIds)
    const filtered = localIssues.filter(item =>
      !item.project_id || authorizedSet.has(item.project_id)
    )
    const synced = syncWithTimeLogs(filtered.map(item => {
      const matchingProject = products.find(p => p.id === item.project_id)
      return matchingProject ? { ...item, product_name: matchingProject.name } : item
    }))
    localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify(synced))
    return synced
  }

  return []
}

// ── Save Issue ────────────────────────────────────────────────────────────────

export async function saveSupportIssue(
  issue: Partial<SupportIssue> & { project_id: string; product_name: string; description: string },
  currentUser: { name: string; id?: string },
  allIssues: SupportIssue[]
): Promise<SupportIssue> {
  const isEdit = Boolean(issue.id)
  const est = Number(issue.estimated_hours) || 0
  const act = Number(issue.actual_hours) || 0
  const isOverrun = act > est
  const remaining = isOverrun ? 0 : Math.round((est - act) * 100) / 100
  const overrun = isOverrun ? Math.round((act - est) * 100) / 100 : 0

  let savedIssue: SupportIssue

  if (isEdit) {
    const existing = allIssues.find(i => i.id === issue.id) || null

    if (
      existing?.estimated_hours_locked &&
      issue.estimated_hours !== undefined &&
      est !== Number(existing.estimated_hours)
    ) {
      throw new Error('Estimated Hours are locked and cannot be modified. Please contact an authorized user to unlock.')
    }

    savedIssue = {
      ...existing,
      ...issue,
      id: issue.id!,
      sl_no: existing?.sl_no || (allIssues.length + 1),
      issue_id: issue.issue_id || existing?.issue_id || `SUP-${1024 + allIssues.length}`,
      project_id: issue.project_id,
      product_name: issue.product_name,
      description: issue.description,
      received_date: issue.received_date || existing?.received_date || new Date().toISOString().split('T')[0],
      received_time: issue.received_time ?? existing?.received_time ?? null,
      is_qa_miss: issue.is_qa_miss ?? existing?.is_qa_miss ?? 'Not Applicable',
      test_case_count: issue.test_case_count != null ? Number(issue.test_case_count) : (existing?.test_case_count ?? 0),
      start_date: issue.start_date ?? existing?.start_date ?? null,
      planned_end_date: issue.planned_end_date ?? existing?.planned_end_date ?? null,
      actual_end_date: issue.actual_end_date ?? existing?.actual_end_date ?? null,
      finish_date: issue.finish_date ?? existing?.finish_date ?? null,
      tester_name: issue.tester_name || existing?.tester_name || 'Unassigned',
      estimated_hours: existing?.estimated_hours_locked ? Number(existing.estimated_hours) : est,
      estimated_hours_locked: existing?.estimated_hours_locked ?? false,
      estimated_hours_locked_by: existing?.estimated_hours_locked_by ?? null,
      estimated_hours_locked_at: existing?.estimated_hours_locked_at ?? null,
      actual_hours: act,
      remaining_hours: remaining,
      overrun_hours: overrun,
      blocked_hours: issue.blocked_hours != null ? Number(issue.blocked_hours) : (existing?.blocked_hours ?? 0),
      testing_status: issue.testing_status || existing?.testing_status || 'Not Started',
      comments: issue.comments ?? existing?.comments ?? '',
      retesting_status: issue.retesting_status ?? existing?.retesting_status ?? 'Not Required',
      retesting_estimation_hrs: issue.retesting_estimation_hrs != null
        ? Number(issue.retesting_estimation_hrs)
        : (existing?.retesting_estimation_hrs ?? 0),
      updated_at: new Date().toISOString()
    } as SupportIssue

    // Audit changed fields
    if (existing) {
      const auditFields: Array<[keyof SupportIssue, string, string]> = [
        ['tester_name', 'QA Engineer', 'Tester Assigned'],
        ['testing_status', 'Testing Status', 'Status Changed'],
        ['is_qa_miss', 'Is QA Miss?', 'Issue Updated'],
        ['test_case_count', 'Test Case Count', 'Issue Updated'],
        ['planned_end_date', 'Planned End Date', 'Issue Updated'],
        ['actual_end_date', 'Actual End Date', 'Issue Updated'],
        ['blocked_hours', 'Blocked Hours', 'Issue Updated'],
        ['retesting_status', 'Retesting Status', 'Issue Updated'],
        ['retesting_estimation_hrs', 'Retesting Estimation (Hrs)', 'Issue Updated'],
        ['comments', 'Comments', 'Comment Added'],
        ['project_id', 'Product', 'Issue Updated'],
      ]
      for (const [field, label, action] of auditFields) {
        const oldVal = String(existing[field] ?? '')
        const newVal = String(savedIssue[field] ?? '')
        if (oldVal !== newVal) {
          logHistoryEvent({
            issue_id: savedIssue.issue_id,
            product_name: savedIssue.product_name,
            user_name: currentUser.name,
            user_id: currentUser.id,
            action: action as any,
            field: label,
            old_value: field === 'project_id' ? existing.product_name : oldVal,
            new_value: field === 'project_id' ? savedIssue.product_name : newVal
          })
        }
      }
      if (existing.estimated_hours !== savedIssue.estimated_hours) {
        logHistoryEvent({
          issue_id: savedIssue.issue_id, product_name: savedIssue.product_name,
          user_name: currentUser.name, user_id: currentUser.id,
          action: 'Estimated Hours Updated', field: 'Estimation (Hrs)',
          old_value: String(existing.estimated_hours), new_value: String(savedIssue.estimated_hours)
        })
      }
    }
  } else {
    const nextSlNo = allIssues.length > 0 ? Math.max(...allIssues.map(i => i.sl_no || 0)) + 1 : 1
    const autoIssueId = issue.issue_id?.trim() || `SUP-${1024 + nextSlNo}`
    const generatedId = (issue.id && isUUID(issue.id)) ? issue.id : generateUUID()

    savedIssue = {
      id: generatedId,
      sl_no: nextSlNo,
      issue_id: autoIssueId,
      project_id: issue.project_id,
      product_name: issue.product_name,
      description: issue.description,
      received_date: issue.received_date || new Date().toISOString().split('T')[0],
      received_time: issue.received_time ?? null,
      is_qa_miss: issue.is_qa_miss ?? 'Not Applicable',
      test_case_count: issue.test_case_count != null ? Number(issue.test_case_count) : 0,
      start_date: issue.start_date ?? null,
      planned_end_date: issue.planned_end_date ?? null,
      actual_end_date: issue.actual_end_date ?? null,
      finish_date: issue.finish_date ?? null,
      tester_name: issue.tester_name && issue.tester_name !== 'Unassigned'
        ? issue.tester_name.trim().toUpperCase() : 'Unassigned',
      estimated_hours: est,
      actual_hours: act,
      remaining_hours: remaining,
      overrun_hours: overrun,
      blocked_hours: issue.blocked_hours != null ? Number(issue.blocked_hours) : 0,
      testing_status: issue.testing_status || 'Not Started',
      comments: issue.comments || '',
      retesting_status: issue.retesting_status ?? 'Not Required',
      retesting_estimation_hrs: issue.retesting_estimation_hrs != null ? Number(issue.retesting_estimation_hrs) : 0,
      created_by: (currentUser.id && isUUID(currentUser.id)) ? currentUser.id : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    logHistoryEvent({
      issue_id: savedIssue.issue_id, product_name: savedIssue.product_name,
      user_name: currentUser.name, user_id: currentUser.id,
      action: 'Issue Created', field: 'New Issue',
      old_value: null, new_value: `${savedIssue.issue_id} (${savedIssue.testing_status})`
    })
  }

  // Persist to localStorage
  const updatedIssues = isEdit
    ? allIssues.map(i => i.id === savedIssue.id ? savedIssue : i)
    : [savedIssue, ...allIssues.filter(i => i.id !== savedIssue.id)]
  localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify(updatedIssues))

  // Persist to Supabase
  try {
    const payload: any = {
      id: isUUID(savedIssue.id) ? savedIssue.id : generateUUID(),
      sl_no: savedIssue.sl_no,
      product_name: savedIssue.product_name,
      issue_id: savedIssue.issue_id,
      description: savedIssue.description,
      received_date: savedIssue.received_date,
      received_time: savedIssue.received_time || null,
      is_qa_miss: savedIssue.is_qa_miss || 'Not Applicable',
      test_case_count: savedIssue.test_case_count ?? 0,
      start_date: savedIssue.start_date,
      planned_end_date: savedIssue.planned_end_date || null,
      actual_end_date: savedIssue.actual_end_date || null,
      finish_date: savedIssue.finish_date || null,
      tester_name: savedIssue.tester_name,
      estimated_hours: savedIssue.estimated_hours,
      estimated_hours_locked: savedIssue.estimated_hours_locked ?? false,
      estimated_hours_locked_by: savedIssue.estimated_hours_locked_by ?? null,
      estimated_hours_locked_at: savedIssue.estimated_hours_locked_at ?? null,
      actual_hours: savedIssue.actual_hours,
      blocked_hours: savedIssue.blocked_hours ?? 0,
      testing_status: savedIssue.testing_status,
      comments: savedIssue.comments,
      retesting_status: savedIssue.retesting_status || 'Not Required',
      retesting_estimation_hrs: savedIssue.retesting_estimation_hrs ?? 0,
      updated_at: savedIssue.updated_at
    }
    if (savedIssue.project_id && isUUID(savedIssue.project_id)) {
      payload.project_id = savedIssue.project_id
    }
    const { error: dbError } = await supabase.from('support_issues').upsert(payload, { onConflict: 'issue_id' })
    if (dbError) console.warn('[supportTrackerService] supabase save error:', dbError)
  } catch (err) {
    console.warn('[supportTrackerService] supabase save error:', err)
  }

  return savedIssue
}

// ── Estimation Lock ───────────────────────────────────────────────────────────

export async function toggleSupportIssueEstimationLock(
  targetId: string,
  shouldLock: boolean,
  currentUser: { name: string; id?: string },
  allIssues: SupportIssue[]
): Promise<SupportIssue> {
  const existing = allIssues.find(i => i.id === targetId || i.issue_id === targetId)
  if (!existing) throw new Error('Support issue not found')

  const updatedIssue: SupportIssue = {
    ...existing,
    estimated_hours_locked: shouldLock,
    estimated_hours_locked_by: shouldLock ? currentUser.name : null,
    estimated_hours_locked_at: shouldLock ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }

  logHistoryEvent({
    issue_id: existing.issue_id, product_name: existing.product_name,
    user_name: currentUser.name, user_id: currentUser.id,
    action: shouldLock ? 'Estimated Hours Locked' : 'Estimated Hours Unlocked',
    field: 'Estimation Lock',
    old_value: shouldLock ? `${existing.estimated_hours} (Unlocked)` : 'Locked',
    new_value: shouldLock ? `${existing.estimated_hours} (Locked)` : 'Unlocked'
  })

  const nextIssues = allIssues.map(i => (i.id === updatedIssue.id ? updatedIssue : i))
  try { localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify(nextIssues)) } catch { /* ignore */ }

  try {
    if (isUUID(existing.id)) {
      await supabase.from('support_issues').update({
        estimated_hours_locked: shouldLock,
        estimated_hours_locked_by: shouldLock ? currentUser.name : null,
        estimated_hours_locked_at: shouldLock ? new Date().toISOString() : null,
        updated_at: updatedIssue.updated_at
      }).eq('id', existing.id)
    }
  } catch (err) { console.warn('[supportTrackerService] supabase toggle lock error:', err) }

  return updatedIssue
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteSupportIssue(
  issueId: string,
  currentUser: { name: string; id?: string },
  allIssues: SupportIssue[]
): Promise<void> {
  const target = allIssues.find(i => i.id === issueId)
  if (target) {
    logHistoryEvent({
      issue_id: target.issue_id, product_name: target.product_name,
      user_name: currentUser.name, user_id: currentUser.id,
      action: 'Issue Deleted', field: 'Record Removed',
      old_value: `${target.issue_id} - ${target.description.slice(0, 30)}...`,
      new_value: '(Deleted)'
    })
  }
  const updatedIssues = allIssues.filter(i => i.id !== issueId)
  localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify(updatedIssues))
  try { await supabase.from('support_issues').delete().eq('id', issueId) } catch (err) {
    console.warn('[supportTrackerService] supabase delete error:', err)
  }
}

export async function bulkDeleteSupportIssues(
  ids: string[],
  currentUser: { name: string; id?: string },
  allIssues: SupportIssue[]
): Promise<{ deleted: string[]; failed: Array<{ id: string; reason: string }> }> {
  const deleted: string[] = []
  const failed: Array<{ id: string; reason: string }> = []
  const uniqueIds = [...new Set(ids)]

  for (const id of uniqueIds) {
    const target = allIssues.find(i => i.id === id)
    if (!target) { failed.push({ id, reason: 'Record not found' }); continue }
    try {
      logHistoryEvent({
        issue_id: target.issue_id, product_name: target.product_name,
        user_name: currentUser.name, user_id: currentUser.id,
        action: 'Bulk Delete', field: 'Record Removed',
        old_value: `${target.issue_id} - ${target.description.slice(0, 40)}`,
        new_value: '(Bulk Deleted)'
      })
      const { error } = await supabase.from('support_issues').delete().eq('id', id)
      if (error) throw error
      deleted.push(id)
    } catch (err: any) { failed.push({ id, reason: err?.message || 'Delete failed' }) }
  }

  const remaining = allIssues.filter(i => !deleted.includes(i.id))
  try { localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify(remaining)) } catch { /* ignore */ }
  return { deleted, failed }
}

// ── Blocked Periods ───────────────────────────────────────────────────────────

export async function fetchBlockedPeriods(supportIssueId: string): Promise<SupportIssueBlockedPeriod[]> {
  try {
    const { data, error } = await supabase
      .from('support_issue_blocked_periods')
      .select('*')
      .eq('support_issue_id', supportIssueId)
      .order('blocked_at', { ascending: true })
    if (!error && data) return data as SupportIssueBlockedPeriod[]
  } catch (err) { console.warn('[supportTrackerService] fetchBlockedPeriods error:', err) }
  return []
}

/**
 * When status changes to Blocked, open a new blocked period.
 * When status changes away from Blocked, close the open period and recalculate blocked_hours.
 */
export async function handleBlockedStatusChange(
  issue: SupportIssue,
  newStatus: string,
  currentUser: { name: string; id?: string }
): Promise<number> {
  const wasBlocked = (issue.testing_status || '').toLowerCase() === 'blocked'
  const isNowBlocked = newStatus.toLowerCase() === 'blocked'

  if (!wasBlocked && isNowBlocked) {
    // Open a new blocked period
    try {
      await supabase.from('support_issue_blocked_periods').insert({
        support_issue_id: issue.id,
        issue_id: issue.issue_id,
        blocked_at: new Date().toISOString()
      })
    } catch (err) { console.warn('[supportTrackerService] open blocked period error:', err) }
    return Number(issue.blocked_hours) || 0
  }

  if (wasBlocked && !isNowBlocked) {
    // Close open blocked period
    try {
      const { data: openPeriods } = await supabase
        .from('support_issue_blocked_periods')
        .select('*')
        .eq('support_issue_id', issue.id)
        .is('unblocked_at', null)

      if (openPeriods && openPeriods.length > 0) {
        const now = new Date().toISOString()
        for (const period of openPeriods) {
          await supabase.from('support_issue_blocked_periods')
            .update({ unblocked_at: now })
            .eq('id', period.id)
        }
      }

      // Recalculate total blocked hours from all closed periods
      const { data: allPeriods } = await supabase
        .from('support_issue_blocked_periods')
        .select('hours_blocked')
        .eq('support_issue_id', issue.id)
        .not('unblocked_at', 'is', null)

      if (allPeriods) {
        const total = Math.round(
          allPeriods.reduce((sum: number, p: any) => sum + (Number(p.hours_blocked) || 0), 0) * 100
        ) / 100
        return total
      }
    } catch (err) { console.warn('[supportTrackerService] close blocked period error:', err) }
  }

  return Number(issue.blocked_hours) || 0
}

// ── Time Logs ─────────────────────────────────────────────────────────────────

export async function fetchSupportTimeLogs(issueId?: string): Promise<SupportIssueTimeLog[]> {
  try {
    let query = supabase.from('support_issue_time_logs').select('*').order('logged_at', { ascending: false })
    if (issueId) query = query.or(`issue_id.eq.${issueId},support_issue_id.eq.${issueId}`)
    const { data, error } = await query
    if (!error && data && data.length > 0) {
      const mapped: SupportIssueTimeLog[] = deduplicateLogs(data.map((d: any) => ({
        id: d.id, issue_id: d.issue_id, support_issue_id: d.support_issue_id,
        user_name: d.user_name, user_id: d.user_id,
        hours_added: Number(d.hours_added) || 0, comment: d.comment || '',
        logged_at: d.logged_at || d.created_at, created_at: d.created_at
      })))
      localStorage.setItem(LOCAL_STORAGE_TIMELOGS_KEY, JSON.stringify(mapped))
      return mapped
    }
  } catch (err) { console.warn('[supportTrackerService] supabase time logs fetch error:', err) }

  const cached = localStorage.getItem(LOCAL_STORAGE_TIMELOGS_KEY)
  let allLogs: SupportIssueTimeLog[] = []
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed) && parsed.length > 0) {
        allLogs = deduplicateLogs(parsed.filter((l: any) => !l.id?.startsWith('log-10')))
      }
    } catch { /* ignore */ }
  }
  if (issueId) return allLogs.filter(l => l.issue_id === issueId || l.support_issue_id === issueId)
  return allLogs
}

export async function addSupportTimeLog(
  input: {
    issue_id: string; support_issue_id?: string; user_name: string;
    user_id?: string | null; hours_added: number; comment: string; logged_at?: string
  },
  currentUser: { name: string; id?: string },
  allIssues: SupportIssue[]
): Promise<{ newLog: SupportIssueTimeLog; updatedIssue: SupportIssue }> {
  const roundedHours = Math.round(Number(input.hours_added) * 100) / 100
  const timestamp = input.logged_at || new Date().toISOString()

  const newLog: SupportIssueTimeLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    issue_id: input.issue_id, support_issue_id: input.support_issue_id,
    user_name: input.user_name || currentUser.name || 'QA Tester',
    user_id: input.user_id || currentUser.id || null,
    hours_added: roundedHours, comment: input.comment.trim(),
    logged_at: timestamp, created_at: timestamp
  }

  try {
    const { data, error } = await supabase.from('support_issue_time_logs').insert({
      issue_id: newLog.issue_id, support_issue_id: newLog.support_issue_id,
      user_name: newLog.user_name, user_id: newLog.user_id,
      hours_added: newLog.hours_added, comment: newLog.comment, logged_at: newLog.logged_at
    }).select().single()
    if (!error && data) newLog.id = data.id
  } catch (err) { console.warn('[supportTrackerService] supabase insert time log error:', err) }

  const existingLogsStr = localStorage.getItem(LOCAL_STORAGE_TIMELOGS_KEY)
  let allLogs: SupportIssueTimeLog[] = []
  if (existingLogsStr) {
    try {
      const parsed = JSON.parse(existingLogsStr)
      if (Array.isArray(parsed)) allLogs = parsed.filter((l: any) => !l.id?.startsWith('log-10'))
    } catch { /* ignore */ }
  }
  if (!allLogs.some(l => l.id === newLog.id)) allLogs.unshift(newLog)
  localStorage.setItem(LOCAL_STORAGE_TIMELOGS_KEY, JSON.stringify(allLogs))

  const targetIssue = allIssues.find(
    i => i.issue_id === input.issue_id || (input.support_issue_id && i.id === input.support_issue_id)
  )
  if (!targetIssue) throw new Error(`Target support issue ${input.issue_id} not found`)

  const logsForIssue = allLogs.filter(
    l => l.issue_id === targetIssue.issue_id || (targetIssue.id && l.support_issue_id === targetIssue.id)
  )
  const totalActual = Math.round(logsForIssue.reduce((sum, l) => sum + Number(l.hours_added), 0) * 100) / 100
  const est = Number(targetIssue.estimated_hours) || 0
  const isOverrun = totalActual > est
  const oldActual = targetIssue.actual_hours

  const updatedIssue: SupportIssue = {
    ...targetIssue,
    actual_hours: totalActual,
    remaining_hours: isOverrun ? 0 : Math.round((est - totalActual) * 100) / 100,
    overrun_hours: isOverrun ? Math.round((totalActual - est) * 100) / 100 : 0,
    updated_at: new Date().toISOString()
  }

  try {
    await supabase.from('support_issues').update({ actual_hours: totalActual, updated_at: updatedIssue.updated_at }).eq('id', targetIssue.id)
  } catch (err) { console.warn('[supportTrackerService] supabase update actual_hours error:', err) }

  const updatedIssues = allIssues.map(i => i.id === updatedIssue.id ? updatedIssue : i)
  localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify(updatedIssues))

  logHistoryEvent({
    issue_id: targetIssue.issue_id, product_name: targetIssue.product_name,
    user_name: newLog.user_name, user_id: newLog.user_id,
    action: 'Work Hours Logged', field: 'Work Hours Logged',
    old_value: `${oldActual} hrs`,
    new_value: `${totalActual} hrs (+${roundedHours} hrs: "${newLog.comment}")`
  })

  return { newLog, updatedIssue }
}

export async function deleteSupportTimeLog(
  logId: string,
  currentUser: { name: string; id?: string },
  allIssues: SupportIssue[]
): Promise<{ deletedLogId: string; updatedIssue: SupportIssue }> {
  const existingLogsStr = localStorage.getItem(LOCAL_STORAGE_TIMELOGS_KEY)
  let allLogs: SupportIssueTimeLog[] = []
  if (existingLogsStr) { try { allLogs = JSON.parse(existingLogsStr) } catch { /* ignore */ } }
  const targetLog = allLogs.find(l => l.id === logId)
  if (!targetLog) throw new Error(`Time log ${logId} not found`)

  try { await supabase.from('support_issue_time_logs').delete().eq('id', logId) } catch (err) {
    console.warn('[supportTrackerService] supabase delete time log error:', err)
  }

  allLogs = allLogs.filter(l => l.id !== logId)
  localStorage.setItem(LOCAL_STORAGE_TIMELOGS_KEY, JSON.stringify(allLogs))

  const targetIssue = allIssues.find(
    i => i.issue_id === targetLog.issue_id || (targetLog.support_issue_id && i.id === targetLog.support_issue_id)
  )
  if (!targetIssue) throw new Error(`Target support issue ${targetLog.issue_id} not found`)

  const logsForIssue = allLogs.filter(
    l => l.issue_id === targetIssue.issue_id || (targetIssue.id && l.support_issue_id === targetIssue.id)
  )
  const totalActual = Math.round(logsForIssue.reduce((sum, l) => sum + Number(l.hours_added), 0) * 100) / 100
  const est = Number(targetIssue.estimated_hours) || 0
  const isOverrun = totalActual > est
  const oldActual = targetIssue.actual_hours

  const updatedIssue: SupportIssue = {
    ...targetIssue,
    actual_hours: totalActual,
    remaining_hours: isOverrun ? 0 : Math.round((est - totalActual) * 100) / 100,
    overrun_hours: isOverrun ? Math.round((totalActual - est) * 100) / 100 : 0,
    updated_at: new Date().toISOString()
  }

  try {
    await supabase.from('support_issues').update({ actual_hours: totalActual, updated_at: updatedIssue.updated_at }).eq('id', targetIssue.id)
  } catch (err) { console.warn('[supportTrackerService] supabase update actual_hours error:', err) }

  const updatedIssues = allIssues.map(i => i.id === updatedIssue.id ? updatedIssue : i)
  localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify(updatedIssues))

  logHistoryEvent({
    issue_id: targetIssue.issue_id, product_name: targetIssue.product_name,
    user_name: currentUser.name, user_id: currentUser.id,
    action: 'Work Hours Deleted', field: 'Work Hours Removed',
    old_value: `${oldActual} hrs`,
    new_value: `${totalActual} hrs (-${targetLog.hours_added} hrs: "${targetLog.comment}")`
  })

  return { deletedLogId: logId, updatedIssue }
}


// ── Edit Time Log ─────────────────────────────────────────────────────────────

export async function editSupportTimeLog(
  logId: string,
  updates: { hours_added: number; comment: string; correction_reason: string },
  currentUser: { name: string; id?: string },
  allIssues: SupportIssue[]
): Promise<{ updatedLog: SupportIssueTimeLog; updatedIssue: SupportIssue }> {
  if (updates.hours_added <= 0) throw new Error('Corrected hours must be greater than zero.')
  if (!updates.correction_reason.trim()) throw new Error('A reason for correction is required.')

  const existingLogsStr = localStorage.getItem(LOCAL_STORAGE_TIMELOGS_KEY)
  let allLogs: SupportIssueTimeLog[] = []
  if (existingLogsStr) { try { allLogs = JSON.parse(existingLogsStr) } catch { /* ignore */ } }

  const targetLog = allLogs.find(l => l.id === logId)
  if (!targetLog) throw new Error(`Time log ${logId} not found.`)

  const oldHours = targetLog.hours_added
  const roundedNew = Math.round(Number(updates.hours_added) * 100) / 100

  // Update the log in-place
  const updatedLog: SupportIssueTimeLog = {
    ...targetLog,
    hours_added: roundedNew,
    comment: updates.comment.trim()
  }

  allLogs = allLogs.map(l => l.id === logId ? updatedLog : l)
  localStorage.setItem(LOCAL_STORAGE_TIMELOGS_KEY, JSON.stringify(allLogs))

  // Persist to Supabase
  try {
    await supabase.from('support_issue_time_logs').update({
      hours_added: roundedNew,
      comment: updates.comment.trim()
    }).eq('id', logId)
  } catch (err) { console.warn('[supportTrackerService] supabase edit time log error:', err) }

  // Recalculate cumulative actual_hours for the parent issue
  const targetIssue = allIssues.find(
    i => i.issue_id === targetLog.issue_id || (targetLog.support_issue_id && i.id === targetLog.support_issue_id)
  )
  if (!targetIssue) throw new Error(`Parent issue for log ${logId} not found.`)

  const logsForIssue = allLogs.filter(
    l => l.issue_id === targetIssue.issue_id || (targetIssue.id && l.support_issue_id === targetIssue.id)
  )
  const totalActual = Math.round(logsForIssue.reduce((sum, l) => sum + Number(l.hours_added), 0) * 100) / 100
  const est = Number(targetIssue.estimated_hours) || 0
  const isOverrun = totalActual > est

  const updatedIssue: SupportIssue = {
    ...targetIssue,
    actual_hours: totalActual,
    remaining_hours: isOverrun ? 0 : Math.round((est - totalActual) * 100) / 100,
    overrun_hours: isOverrun ? Math.round((totalActual - est) * 100) / 100 : 0,
    updated_at: new Date().toISOString()
  }

  try {
    await supabase.from('support_issues').update({
      actual_hours: totalActual,
      updated_at: updatedIssue.updated_at
    }).eq('id', targetIssue.id)
  } catch (err) { console.warn('[supportTrackerService] supabase update actual_hours error:', err) }

  const updatedIssues = allIssues.map(i => i.id === updatedIssue.id ? updatedIssue : i)
  localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify(updatedIssues))

  const diff = Math.round((roundedNew - oldHours) * 100) / 100
  logHistoryEvent({
    issue_id: targetIssue.issue_id,
    product_name: targetIssue.product_name,
    user_name: currentUser.name,
    user_id: currentUser.id,
    action: 'Work Hours Logged',
    field: 'Time Log Corrected',
    old_value: `${oldHours} hrs — "${targetLog.comment}"`,
    new_value: `${roundedNew} hrs (${diff >= 0 ? '+' : ''}${diff} hrs) — "${updates.comment}" | Reason: ${updates.correction_reason}`
  })

  return { updatedLog, updatedIssue }
}

// ── Audit History ─────────────────────────────────────────────────────────────

export function formatCurrentTimestamp(): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const month = months[now.getMonth()]
  const year = now.getFullYear()
  let hours = now.getHours()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  hours = hours % 12 || 12
  const formattedHours = String(hours).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${day} ${month} ${year}, ${formattedHours}:${minutes} ${ampm}`
}

export async function fetchSupportHistory(): Promise<SupportIssueHistoryRecord[]> {
  try {
    const { data, error } = await supabase.from('support_issue_history').select('*').order('timestamp', { ascending: false })
    if (!error && data && data.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(data))
      return data
    }
  } catch (err) { console.warn('[supportTrackerService] supabase history fetch error:', err) }

  const cached = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    } catch { /* ignore */ }
  }
  return []
}

export function logHistoryEvent(event: Omit<SupportIssueHistoryRecord, 'id' | 'timestamp'> & { timestamp?: string }): void {
  const newRecord: SupportIssueHistoryRecord = {
    id: generateUUID(),
    issue_id: event.issue_id, product_name: event.product_name,
    user_name: event.user_name || 'System User',
    user_id: (event.user_id && isUUID(event.user_id)) ? event.user_id : null,
    action: event.action, field: event.field || '',
    old_value: event.old_value ?? null, new_value: event.new_value ?? null,
    timestamp: event.timestamp || formatCurrentTimestamp()
  }

  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY) || '[]')
    const updated = [newRecord, ...existing].slice(0, 500)
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated))
  } catch (e) { console.warn('Failed to save history to localStorage', e) }

  supabase.from('support_issue_history').insert({
    id: newRecord.id, issue_id: newRecord.issue_id, product_name: newRecord.product_name,
    user_name: newRecord.user_name, user_id: newRecord.user_id,
    action: newRecord.action, field: newRecord.field,
    old_value: newRecord.old_value, new_value: newRecord.new_value
  }).then(({ error }) => {
    if (error) console.warn('[supportTrackerService] supabase history insert error:', error)
  })
}

// ── Dropdown Configurations ───────────────────────────────────────────────────

export async function fetchDropdownConfigurations(): Promise<{
  testing_status: SupportDropdownOption[]
  testers: SupportDropdownOption[]
  is_qa_miss: SupportDropdownOption[]
  retesting_status: SupportDropdownOption[]
}> {
  let testingStatusOptions: SupportDropdownOption[] = []
  let testerOptions: SupportDropdownOption[] = []
  let isQaMissOptions: SupportDropdownOption[] = []
  let retestingStatusOptions: SupportDropdownOption[] = []
  let hasDbRows = false

  try {
    const { data, error } = await supabase
      .from('support_issue_dropdown_configs').select('*').order('sort_order', { ascending: true })
    if (!error && data && data.length > 0) {
      hasDbRows = true
      testingStatusOptions = deduplicateDropdowns(data.filter((d: any) => d.category === 'testing_status'))
      testerOptions = deduplicateDropdowns(data.filter((d: any) => d.category === 'tester').map((t: any) => ({
        ...t, label: t.label.toUpperCase(), value: t.value.toUpperCase()
      })))
      isQaMissOptions = deduplicateDropdowns(data.filter((d: any) => d.category === 'is_qa_miss'))
      retestingStatusOptions = deduplicateDropdowns(data.filter((d: any) => d.category === 'retesting_status'))
    }
  } catch (e) { console.warn('[supportTrackerService] dropdown configs fetch error:', e) }

  // Fallback to localStorage only if DB was completely empty / unreachable
  if (!hasDbRows) {
    const cached = localStorage.getItem(LOCAL_STORAGE_DROPDOWNS_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed.testing_status?.length)
          testingStatusOptions = deduplicateDropdowns(parsed.testing_status)
        if (parsed.testers?.length)
          testerOptions = deduplicateDropdowns(parsed.testers.map((t: any) => ({ ...t, label: t.label.toUpperCase(), value: t.value.toUpperCase() })))
        if (parsed.is_qa_miss?.length)
          isQaMissOptions = deduplicateDropdowns(parsed.is_qa_miss)
        if (parsed.retesting_status?.length)
          retestingStatusOptions = deduplicateDropdowns(parsed.retesting_status)
      } catch { /* ignore */ }
    }
  }

  // Initial seeding defaults ONLY if neither DB nor localStorage provided any options
  if (!hasDbRows && testingStatusOptions.length === 0) {
    testingStatusOptions = DEFAULT_TESTING_STATUSES.map((item, index) => ({
      id: `ts-default-${index + 1}`, category: 'testing_status' as const,
      label: item.label, value: item.value, color: item.color, is_active: true, sort_order: index + 1
    }))
  }

  if (!hasDbRows && testerOptions.length === 0) {
    testerOptions = DEFAULT_TESTERS.map((name, index) => ({
      id: `tester-default-${index + 1}`, category: 'tester' as const,
      label: name.toUpperCase(), value: name.toUpperCase(), is_active: true, sort_order: index + 1
    }))
  }

  if (!hasDbRows && isQaMissOptions.length === 0) {
    isQaMissOptions = DEFAULT_IS_QA_MISS_OPTIONS.map((item, index) => ({
      id: `qamiss-default-${index + 1}`, category: 'is_qa_miss' as const,
      label: item.label, value: item.value, is_active: true, sort_order: index + 1
    }))
  }

  if (!hasDbRows && retestingStatusOptions.length === 0) {
    retestingStatusOptions = DEFAULT_RETESTING_STATUS_OPTIONS.map((item, index) => ({
      id: `retest-default-${index + 1}`, category: 'retesting_status' as const,
      label: item.label, value: item.value, color: item.color, is_active: true, sort_order: index + 1
    }))
  }

  const result = {
    testing_status: testingStatusOptions,
    testers: testerOptions,
    is_qa_miss: isQaMissOptions,
    retesting_status: retestingStatusOptions
  }
  localStorage.setItem(LOCAL_STORAGE_DROPDOWNS_KEY, JSON.stringify(result))
  return result
}

export async function saveDropdownConfigurations(
  configs: {
    testing_status: SupportDropdownOption[]
    testers: SupportDropdownOption[]
    is_qa_miss: SupportDropdownOption[]
    retesting_status: SupportDropdownOption[]
  },
  currentUser: { name: string; id?: string }
): Promise<{
  testing_status: SupportDropdownOption[]
  testers: SupportDropdownOption[]
  is_qa_miss: SupportDropdownOption[]
  retesting_status: SupportDropdownOption[]
}> {
  const normalizedStatuses = configs.testing_status.map((s, idx) => ({
    ...s,
    label: s.label.trim(),
    value: s.value.trim(),
    sort_order: s.sort_order ?? idx + 1
  }))
  const normalizedTesters = configs.testers.map((t, idx) => ({
    ...t,
    label: t.label.trim().toUpperCase(),
    value: t.value.trim().toUpperCase(),
    sort_order: t.sort_order ?? idx + 1
  }))
  const normalizedMiss = (configs.is_qa_miss || []).map((m, idx) => ({
    ...m,
    label: m.label.trim(),
    value: m.value.trim(),
    sort_order: m.sort_order ?? idx + 1
  }))
  const normalizedRetest = (configs.retesting_status || []).map((r, idx) => ({
    ...r,
    label: r.label.trim(),
    value: r.value.trim(),
    sort_order: r.sort_order ?? idx + 1
  }))

  const normalizedConfigs = {
    testing_status: normalizedStatuses,
    testers: normalizedTesters,
    is_qa_miss: normalizedMiss,
    retesting_status: normalizedRetest
  }

  localStorage.setItem(LOCAL_STORAGE_DROPDOWNS_KEY, JSON.stringify(normalizedConfigs))

  logHistoryEvent({
    issue_id: 'CONFIG', product_name: 'All Products',
    user_name: currentUser.name, user_id: currentUser.id,
    action: 'Dropdown Configuration Change', field: 'Dropdown Master List',
    old_value: 'Previous options',
    new_value: `Updated ${normalizedConfigs.testing_status.length} statuses, ${normalizedConfigs.testers.length} testers, ${normalizedConfigs.is_qa_miss.length} QA Miss options, ${normalizedConfigs.retesting_status.length} retesting statuses`
  })

  try {
    const categories = ['testing_status', 'tester', 'is_qa_miss', 'retesting_status']
    const { data: existingRows, error: fetchErr } = await supabase
      .from('support_issue_dropdown_configs')
      .select('id, category, value')
      .in('category', categories)

    if (fetchErr) {
      console.warn('[supportTrackerService] error fetching existing dropdowns for sync:', fetchErr)
    }

    const existing = existingRows || []

    const activeValuesByCategory: Record<string, Set<string>> = {
      testing_status: new Set(normalizedStatuses.map(s => s.value.trim().toLowerCase())),
      tester: new Set(normalizedTesters.map(t => t.value.trim().toLowerCase())),
      is_qa_miss: new Set(normalizedMiss.map(m => m.value.trim().toLowerCase())),
      retesting_status: new Set(normalizedRetest.map(r => r.value.trim().toLowerCase()))
    }

    // 1. Permanently delete options from DB that were deleted in the UI
    const idsToDelete: string[] = []
    for (const row of existing) {
      const allowed = activeValuesByCategory[row.category]
      if (allowed && !allowed.has((row.value || '').trim().toLowerCase())) {
        idsToDelete.push(row.id)
      }
    }

    if (idsToDelete.length > 0) {
      const { error: delErr } = await supabase
        .from('support_issue_dropdown_configs')
        .delete()
        .in('id', idsToDelete)
      if (delErr) {
        console.warn('[supportTrackerService] error deleting removed dropdown options:', delErr)
      }
    }

    // 2. Build index of remaining DB rows by category + lower(value) and by id
    const remainingExisting = existing.filter(r => !idsToDelete.includes(r.id))
    const existingByCatAndVal = new Map<string, string>()
    const existingIds = new Set<string>()

    for (const r of remainingExisting) {
      existingIds.add(r.id)
      existingByCatAndVal.set(`${r.category}:${(r.value || '').trim().toLowerCase()}`, r.id)
    }

    const allKeptOptions = [
      ...normalizedStatuses,
      ...normalizedTesters,
      ...normalizedMiss,
      ...normalizedRetest
    ]

    // 3. Update existing or insert new options without invalid ON CONFLICT specification
    for (const item of allKeptOptions) {
      const lookupKey = `${item.category}:${item.value.trim().toLowerCase()}`
      const matchingId = (item.id && isUUID(item.id) && existingIds.has(item.id))
        ? item.id
        : existingByCatAndVal.get(lookupKey)

      if (matchingId) {
        const { error: updateErr } = await supabase
          .from('support_issue_dropdown_configs')
          .update({
            label: item.label,
            value: item.value,
            color: item.color || null,
            is_active: item.is_active,
            sort_order: item.sort_order,
            updated_at: new Date().toISOString()
          })
          .eq('id', matchingId)
        if (updateErr) {
          console.warn('[supportTrackerService] error updating dropdown option:', updateErr)
        }
      } else {
        const newRow: any = {
          category: item.category,
          label: item.label,
          value: item.value,
          color: item.color || null,
          is_active: item.is_active,
          sort_order: item.sort_order
        }
        if (item.id && isUUID(item.id)) {
          newRow.id = item.id
        }
        const { data: inserted, error: insertErr } = await supabase
          .from('support_issue_dropdown_configs')
          .insert(newRow)
          .select('id')
        if (insertErr) {
          console.warn('[supportTrackerService] error inserting dropdown option:', insertErr)
        } else if (inserted && inserted[0]?.id) {
          existingIds.add(inserted[0].id)
          existingByCatAndVal.set(lookupKey, inserted[0].id)
        }
      }
    }

    // 4. Fetch the refreshed database state
    const { data: freshData, error: refreshErr } = await supabase
      .from('support_issue_dropdown_configs')
      .select('*')
      .order('sort_order', { ascending: true })

    if (!refreshErr && freshData && freshData.length > 0) {
      const freshStatuses = deduplicateDropdowns(freshData.filter((d: any) => d.category === 'testing_status'))
      const freshTesters = deduplicateDropdowns(freshData.filter((d: any) => d.category === 'tester').map((t: any) => ({
        ...t, label: t.label.toUpperCase(), value: t.value.toUpperCase()
      })))
      const freshMiss = deduplicateDropdowns(freshData.filter((d: any) => d.category === 'is_qa_miss'))
      const freshRetest = deduplicateDropdowns(freshData.filter((d: any) => d.category === 'retesting_status'))

      const freshResult = {
        testing_status: freshStatuses,
        testers: freshTesters,
        is_qa_miss: freshMiss,
        retesting_status: freshRetest
      }
      localStorage.setItem(LOCAL_STORAGE_DROPDOWNS_KEY, JSON.stringify(freshResult))
      return freshResult
    }
  } catch (err) {
    console.warn('[supportTrackerService] supabase dropdown save error:', err)
  }

  return normalizedConfigs
}

export async function syncTestersFromUserProfiles(): Promise<string[]> {
  try {
    const { data, error } = await supabase.from('profiles').select('full_name, email')
      .eq('status', 'active').order('full_name', { ascending: true })
    if (!error && data && data.length > 0) {
      const names = data
        .map(p => (p.full_name?.trim() || p.email?.split('@')[0])?.toUpperCase())
        .filter(Boolean) as string[]
      if (names.length > 0) {
        return Array.from(new Set(names))
      }
    }
  } catch (err) { console.warn('[supportTrackerService] syncTestersFromUserProfiles error:', err) }
  return [...DEFAULT_TESTERS]
}

// ── Export ────────────────────────────────────────────────────────────────────

const EXPORT_HEADERS = [
  'Sl. No.', 'Product', 'Issue ID', 'Description',
  'Received Date', 'Received Time', 'QA Engineer', 'Is QA Miss?',
  'Test Case Count', 'Estimation (Hrs)', 'Actual / Effort (Hrs)', 'Remaining Hrs',
  'Actual Start Date', 'Planned End Date', 'Actual End Date',
  'Blocked Hours', 'Status', 'Comments', 'Retesting Status', 'Retesting Estimation (Hrs)'
]

function issueToExportRow(issue: SupportIssue): any[] {
  return [
    issue.sl_no,
    issue.product_name,
    issue.issue_id,
    issue.description,
    issue.received_date || '',
    issue.received_time || '',
    issue.tester_name || '',
    issue.is_qa_miss || 'Not Applicable',
    issue.test_case_count ?? 0,
    issue.estimated_hours,
    issue.actual_hours,
    (() => {
      const est = Number(issue.estimated_hours) || 0
      const act = Number(issue.actual_hours) || 0
      if (act > est) return `Overrun ${Math.round((act - est) * 100) / 100} Hrs`
      return Math.round((est - act) * 100) / 100
    })(),
    issue.start_date || '',
    issue.planned_end_date || '',
    issue.actual_end_date || '',
    issue.blocked_hours ?? 0,
    issue.testing_status,
    issue.comments || '',
    issue.retesting_status || 'Not Required',
    issue.retesting_estimation_hrs ?? 0
  ]
}

export function exportSupportIssuesToCSV(issues: SupportIssue[], filename = 'support-issues.csv'): void {
  const rows = issues.map(issue =>
    issueToExportRow(issue).map((v, i) => {
      if (typeof v === 'string' && (v.includes(',') || v.includes('"') || v.includes('\n'))) {
        return `"${v.replace(/"/g, '""')}"`
      }
      return v
    })
  )
  const csvContent = [EXPORT_HEADERS.join(','), ...rows.map(r => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportSupportIssuesToExcel(issues: SupportIssue[], filename = 'support-issues.xlsx'): void {
  const data = issues.map(issue => {
    const row: Record<string, any> = {}
    EXPORT_HEADERS.forEach((h, i) => { row[h] = issueToExportRow(issue)[i] })
    return row
  })

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Support Issues')

  worksheet['!cols'] = [
    { wch: 8 }, { wch: 24 }, { wch: 14 }, { wch: 45 },
    { wch: 14 }, { wch: 12 }, { wch: 20 }, { wch: 14 },
    { wch: 14 }, { wch: 15 }, { wch: 18 }, { wch: 16 },
    { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 14 }, { wch: 16 }, { wch: 35 }, { wch: 16 }, { wch: 22 }
  ]

  XLSX.writeFile(workbook, filename)
}

// ── Import Template ───────────────────────────────────────────────────────────

// Exact headers that parseImportRow reads — order matches the data sheet columns
export const SUPPORT_IMPORT_HEADERS = [
  'Product',
  'Issue ID',
  'Description',
  'Received Date',
  'Received Time',
  'QA Engineer',
  'Is QA Miss?',
  'Test Case Count',
  'Estimation (Hrs)',
  'Actual Start Date',
  'Planned End Date',
  'Actual End Date',
  'Blocked Hours',
  'Status',
  'Comments',
  'Retesting Status',
  'Retesting Estimation (Hrs)'
] as const

export function downloadImportTemplate(products: ProjectWithMembers[]): void {
  downloadSupportImportTemplate(products)
}

export function downloadSupportImportTemplate(products: ProjectWithMembers[]): void {
  const workbook = XLSX.utils.book_new()

  // ── Sheet 1: Import Data ──────────────────────────────────────────────────
  const dataRows: Record<string, any>[] = []
  const dataSheet = XLSX.utils.json_to_sheet(dataRows, { header: [...SUPPORT_IMPORT_HEADERS] })

  // Bold header row via cell styles (SheetJS community edition supports cell objects)
  SUPPORT_IMPORT_HEADERS.forEach((_, colIdx) => {
    const cellAddr = XLSX.utils.encode_cell({ r: 0, c: colIdx })
    if (dataSheet[cellAddr]) {
      dataSheet[cellAddr].s = { font: { bold: true } }
    }
  })

  dataSheet['!cols'] = [
    { wch: 28 }, // Product
    { wch: 14 }, // Issue ID
    { wch: 50 }, // Description
    { wch: 14 }, // Received Date
    { wch: 14 }, // Received Time
    { wch: 20 }, // QA Engineer
    { wch: 14 }, // Is QA Miss?
    { wch: 16 }, // Test Case Count
    { wch: 16 }, // Estimation (Hrs)
    { wch: 16 }, // Actual Start Date
    { wch: 16 }, // Planned End Date
    { wch: 16 }, // Actual End Date
    { wch: 14 }, // Blocked Hours
    { wch: 16 }, // Status
    { wch: 40 }, // Comments
    { wch: 18 }, // Retesting Status
    { wch: 24 }, // Retesting Estimation (Hrs)
  ]

  // Freeze header row
  dataSheet['!freeze'] = { xSplit: 0, ySplit: 1 }

  XLSX.utils.book_append_sheet(workbook, dataSheet, 'Import Data')

  // ── Sheet 2: Instructions ─────────────────────────────────────────────────
  const productList = products.map(p => p.name).join(', ') || 'Use exact product name from Project Hub'

  const instructions = [
    ['Support Issue Tracker — Import Template Instructions'],
    [''],
    ['HOW TO USE THIS TEMPLATE'],
    ['1. Fill in your data on the "Import Data" sheet starting from row 2.'],
    ['2. Do not modify or delete the header row (row 1).'],
    ['3. Save the file as .xlsx and upload it via the Import popup.'],
    [''],
    ['COLUMN REFERENCE'],
    ['Column', 'Required', 'Format / Accepted Values', 'Notes'],
    ['Product', 'YES', productList, 'Must exactly match a product name in Project Hub (case-insensitive).'],
    ['Issue ID', 'No', 'e.g. SUP-1050', 'Auto-generated if left blank.'],
    ['Description', 'YES', 'Free text', 'Support issue description. Cannot be empty.'],
    ['Received Date', 'YES', 'YYYY-MM-DD  e.g. 2026-10-07', 'Date the issue was received. Defaults to today if blank.'],
    ['Received Time', 'No', 'HH:MM  e.g. 09:30', '24-hour format. Leave blank if unknown.'],
    ['QA Engineer', 'No', 'e.g. AMEEN SR', 'Must match a configured tester name (case-insensitive). Defaults to Unassigned.'],
    ['Is QA Miss?', 'No', 'Yes | No | Under Review | Not Applicable', 'Defaults to Not Applicable.'],
    ['Test Case Count', 'No', 'Non-negative whole number  e.g. 5', 'Defaults to 0.'],
    ['Estimation (Hrs)', 'No', 'Non-negative decimal  e.g. 8 or 2.5', 'Defaults to 0. Actual hours are managed via Time Logs.'],
    ['Actual Start Date', 'No', 'YYYY-MM-DD', 'Leave blank if not yet started.'],
    ['Planned End Date', 'No', 'YYYY-MM-DD', 'Leave blank if not planned.'],
    ['Actual End Date', 'No', 'YYYY-MM-DD', 'Leave blank if not completed.'],
    ['Blocked Hours', 'No', 'Non-negative decimal  e.g. 2', 'Total hours the issue was blocked. Defaults to 0.'],
    ['Status', 'No', 'Not Started | Assigned | In Testing | Blocked | Retesting | Completed | Cancelled', 'Defaults to Not Started. Must match a configured status value.'],
    ['Comments', 'No', 'Free text', 'Optional remarks, blocker details, or test notes.'],
    ['Retesting Status', 'No', 'Not Required | Pending | In Retesting | Passed | Failed | Blocked', 'Defaults to Not Required.'],
    ['Retesting Estimation (Hrs)', 'No', 'Non-negative decimal  e.g. 1.5', 'Defaults to 0.'],
    [''],
    ['IMPORTANT NOTES'],
    ['• Actual / Effort (Hrs) is NOT imported — it is calculated cumulatively from Time Logs.'],
    ['• Duplicate rows (same Description + Product) are automatically skipped.'],
    ['• Rows with validation errors will be reported before import is confirmed.'],
    ['• Date format must be YYYY-MM-DD (e.g. 2026-10-07).'],
    ['• Time format must be HH:MM in 24-hour notation (e.g. 14:30).'],
  ]

  const instrSheet = XLSX.utils.aoa_to_sheet(instructions)
  instrSheet['!cols'] = [
    { wch: 30 }, { wch: 12 }, { wch: 70 }, { wch: 60 }
  ]
  XLSX.utils.book_append_sheet(workbook, instrSheet, 'Instructions')

  XLSX.writeFile(workbook, 'Support_Issue_Import_Template.xlsx')
}

export function parseImportRow(
  row: any,
  idx: number,
  products: ProjectWithMembers[],
  issues: SupportIssue[],
  dropdownConfigs: {
    testing_status: SupportDropdownOption[]
    testers: SupportDropdownOption[]
    is_qa_miss: SupportDropdownOption[]
    retesting_status: SupportDropdownOption[]
  }
): { parsed: Partial<SupportIssue> & { project_id: string; product_name: string; description: string }; errors: string[] } {
  const errors: string[] = []
  const rowNum = idx + 2

  const prodName = String(row['Product'] || row['product'] || '').trim()
  const desc = String(row['Description'] || row['Support Issue Description'] || row['description'] || '').trim()

  if (!prodName) errors.push(`Row ${rowNum}: Product is missing.`)
  if (!desc) errors.push(`Row ${rowNum}: Description is missing.`)

  const matchedProj = products.find(p => p.name.toLowerCase() === prodName.toLowerCase())
  if (prodName && !matchedProj) {
    errors.push(`Row ${rowNum}: Product '${prodName}' not found in Project Hub.`)
  }

  // Validate testing status
  const rawStatus = String(row['Status'] || row['Testing Status'] || row['testing_status'] || 'Not Started').trim()
  const validStatuses = dropdownConfigs.testing_status.map(s => s.value.toLowerCase())
  if (rawStatus && !validStatuses.includes(rawStatus.toLowerCase())) {
    errors.push(`Row ${rowNum}: Status '${rawStatus}' is not a configured value.`)
  }

  // Validate is_qa_miss
  const rawQaMiss = String(row['Is QA Miss?'] || row['is_qa_miss'] || 'Not Applicable').trim()
  const validQaMiss = dropdownConfigs.is_qa_miss.map(s => s.value.toLowerCase())
  if (rawQaMiss && !validQaMiss.includes(rawQaMiss.toLowerCase())) {
    errors.push(`Row ${rowNum}: Is QA Miss? value '${rawQaMiss}' is not configured.`)
  }

  // Validate retesting status
  const rawRetestStatus = String(row['Retesting Status'] || row['retesting_status'] || 'Not Required').trim()
  const validRetestStatuses = dropdownConfigs.retesting_status.map(s => s.value.toLowerCase())
  if (rawRetestStatus && !validRetestStatuses.includes(rawRetestStatus.toLowerCase())) {
    errors.push(`Row ${rowNum}: Retesting Status '${rawRetestStatus}' is not configured.`)
  }

  // Validate test_case_count
  const rawTCC = row['Test Case Count'] ?? row['test_case_count']
  const testCaseCount = rawTCC != null ? Number(rawTCC) : 0
  if (isNaN(testCaseCount) || testCaseCount < 0 || !Number.isInteger(testCaseCount)) {
    errors.push(`Row ${rowNum}: Test Case Count must be a non-negative whole number.`)
  }

  // Validate estimation
  const rawEst = row['Estimation (Hrs)'] ?? row['Estimation Hrs'] ?? row['estimated_hours']
  const estimatedHours = rawEst != null ? Number(rawEst) : 0
  if (isNaN(estimatedHours) || estimatedHours < 0) {
    errors.push(`Row ${rowNum}: Estimation (Hrs) must be a non-negative number.`)
  }

  // Validate retesting estimation
  const rawRetestEst = row['Retesting Estimation (Hrs)'] ?? row['retesting_estimation_hrs']
  const retestingEstHrs = rawRetestEst != null ? Number(rawRetestEst) : 0
  if (isNaN(retestingEstHrs) || retestingEstHrs < 0) {
    errors.push(`Row ${rowNum}: Retesting Estimation (Hrs) must be a non-negative number.`)
  }

  const rawTester = String(row['QA Engineer'] || row["Who's Testing"] || row['Tester'] || 'Unassigned').trim()

  const parsed = {
    project_id: matchedProj?.id || products[0]?.id || '',
    product_name: matchedProj?.name || prodName,
    issue_id: String(row['Issue ID'] || row['Support Issue ID'] || `SUP-${1025 + issues.length + idx}`).trim(),
    description: desc,
    received_date: String(row['Received Date'] || row['received_date'] || new Date().toISOString().split('T')[0]).trim(),
    received_time: String(row['Received Time'] || row['received_time'] || '').trim() || null,
    is_qa_miss: rawQaMiss || 'Not Applicable',
    test_case_count: isNaN(testCaseCount) ? 0 : Math.max(0, Math.floor(testCaseCount)),
    tester_name: rawTester.toLowerCase() === 'unassigned' ? 'Unassigned' : rawTester.toUpperCase(),
    estimated_hours: isNaN(estimatedHours) ? 0 : Math.max(0, estimatedHours),
    start_date: String(row['Actual Start Date'] || row['Start Date'] || row['start_date'] || '').trim() || null,
    planned_end_date: String(row['Planned End Date'] || row['planned_end_date'] || '').trim() || null,
    actual_end_date: String(row['Actual End Date'] || row['actual_end_date'] || '').trim() || null,
    blocked_hours: Number(row['Blocked Hours'] || row['blocked_hours'] || 0),
    testing_status: rawStatus || 'Not Started',
    comments: String(row['Comments'] || row['comments'] || '').trim(),
    retesting_status: rawRetestStatus || 'Not Required',
    retesting_estimation_hrs: isNaN(retestingEstHrs) ? 0 : Math.max(0, retestingEstHrs)
  }

  return { parsed, errors }
}
