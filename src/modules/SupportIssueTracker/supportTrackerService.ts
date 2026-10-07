// src/modules/SupportIssueTracker/supportTrackerService.ts
// Service layer for Support Issue Tracker module
// Products are fetched dynamically from Project Hub (/project-hub) as the single source of truth.

import { supabase } from '@/lib/supabase'
import { fetchProjects as fetchProjectHubProjects } from '@/modules/ProjectHub/projectService'
import type { ProjectWithMembers } from '@/modules/ProjectHub/types'
import type {
  SupportIssue,
  SupportIssueHistoryRecord,
  SupportIssueTimeLog,
  SupportDropdownOption,
  TestingStatusType
} from './types'
import { DEFAULT_TESTING_STATUSES } from './types'
import * as XLSX from 'xlsx'

const LOCAL_STORAGE_ISSUES_KEY = 'qaly_support_tracker_issues_v2'
const LOCAL_STORAGE_HISTORY_KEY = 'qaly_support_tracker_history_v2'
const LOCAL_STORAGE_DROPDOWNS_KEY = 'qaly_support_tracker_dropdowns_v2'
const LOCAL_STORAGE_TIMELOGS_KEY = 'qaly_support_tracker_time_logs_v2'

// Automatic cleanup of legacy dummy seed data from localStorage
const DUMMY_CLEANUP_KEY = 'qaly_support_tracker_dummy_removed_v2'
if (typeof window !== 'undefined') {
  try {
    if (!localStorage.getItem(DUMMY_CLEANUP_KEY)) {
      // Clear legacy v1 keys that contained dummy records
      localStorage.removeItem('qaly_support_tracker_issues_v1')
      localStorage.removeItem('qaly_support_tracker_history_v1')
      localStorage.removeItem('qaly_support_tracker_time_logs_v1')
      localStorage.removeItem(LOCAL_STORAGE_ISSUES_KEY)
      localStorage.removeItem(LOCAL_STORAGE_HISTORY_KEY)
      localStorage.removeItem(LOCAL_STORAGE_TIMELOGS_KEY)
      localStorage.setItem(DUMMY_CLEANUP_KEY, 'true')
    }
  } catch {
    // Ignore storage errors in non-browser environments
  }
}

// Default fallback tester options
export const DEFAULT_TESTERS = [
  'Ameen SR',
  'Sarah Jenkins',
  'Michael Ross',
  'Emily Taylor',
  'David Kumar',
  'Alex Chen',
  'Rachel Green'
]

// ══════════════════════════════════════════════════════════════════════════════
// 1. DYNAMIC PRODUCT SOURCE FROM PROJECT HUB
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch available products dynamically from Project Hub.
 * Project Hub is the SINGLE SOURCE OF TRUTH for products.
 * Products must NOT be duplicated or manually created in Support Tracker.
 */
export async function fetchProductsFromProjectHub(): Promise<ProjectWithMembers[]> {
  try {
    const projects = await fetchProjectHubProjects()
    if (projects && projects.length > 0) {
      return projects
    }
  } catch (err) {
    console.warn('[supportTrackerService] fetchProjectHubProjects error:', err)
  }

  // Direct Supabase table fallback if projectService threw a non-fatal error
  try {
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('name', { ascending: true })

    if (!error && data && data.length > 0) {
      return data.map(p => ({
        ...p,
        members: [],
        member_count: 0
      })) as ProjectWithMembers[]
    }
  } catch (dbErr) {
    console.warn('[supportTrackerService] direct projects fetch error:', dbErr)
  }

  // Graceful fallback sample projects in development if no projects exist yet
  return [
    {
      id: 'proj-001',
      name: 'Qaly AI Engine Core',
      project_code: 'QALY-CORE',
      description: 'Core AI Agentic Engine and Execution Pipeline',
      status: 'active',
      start_date: '2026-01-01',
      target_end_date: '2026-12-31',
      actual_end_date: null,
      tags: ['AI', 'Core'],
      metadata: {},
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      members: [],
      member_count: 5
    },
    {
      id: 'proj-002',
      name: 'Flux Web Portal',
      project_code: 'FLUX-WEB',
      description: 'Enterprise User Interface and Analytics Portal',
      status: 'active',
      start_date: '2026-02-15',
      target_end_date: '2026-11-30',
      actual_end_date: null,
      tags: ['Frontend', 'React'],
      metadata: {},
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      members: [],
      member_count: 4
    },
    {
      id: 'proj-003',
      name: 'Mobile QA Companion',
      project_code: 'MOB-QA',
      description: 'Cross-platform Mobile Test Automation Service',
      status: 'active',
      start_date: '2026-03-01',
      target_end_date: '2026-10-15',
      actual_end_date: null,
      tags: ['Mobile', 'iOS', 'Android'],
      metadata: {},
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      members: [],
      member_count: 3
    }
  ]
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. SUPPORT ISSUES CRUD
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchSupportIssues(products: ProjectWithMembers[]): Promise<SupportIssue[]> {
  const timeLogs = await fetchSupportTimeLogs()

  const syncWithTimeLogs = (issuesList: SupportIssue[]): SupportIssue[] => {
    return issuesList.map(issue => {
      const logs = timeLogs.filter(
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

  try {
    const { data, error } = await supabase
      .from('support_issues')
      .select('*')
      .order('sl_no', { ascending: true })

    if (!error && data && data.length > 0) {
      // Map and sync product names from Project Hub if updated
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
          overrun_hours: isOverrun ? Math.round((act - est) * 100) / 100 : 0
        }
      })
      const synced = syncWithTimeLogs(mapped)
      localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify(synced))
      return synced
    }
  } catch (err) {
    console.warn('[supportTrackerService] supabase fetchSupportIssues error:', err)
  }

  // Local storage fallback (excluding any legacy dummy items)
  const cached = localStorage.getItem(LOCAL_STORAGE_ISSUES_KEY)
  if (cached) {
    try {
      const parsed = JSON.parse(cached) as SupportIssue[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        const nonDummy = parsed.filter(item => !item.id?.startsWith('issue-100'))
        if (nonDummy.length > 0) {
          // Re-sync product names with Project Hub
          const synced = syncWithTimeLogs(nonDummy.map(item => {
            const matchingProject = products.find(p => p.id === item.project_id)
            return matchingProject ? { ...item, product_name: matchingProject.name } : item
          }))
          return synced
        }
      }
    } catch (e) {
      console.warn('Failed parsing cached issues', e)
    }
  }

  // Return empty list if no user issues exist
  return []
}

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
    const existingIndex = allIssues.findIndex(i => i.id === issue.id)
    const existing = existingIndex !== -1 ? allIssues[existingIndex] : null

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
      start_date: issue.start_date ?? null,
      finish_date: issue.finish_date ?? null,
      tester_name: issue.tester_name || existing?.tester_name || 'Unassigned',
      estimated_hours: est,
      actual_hours: act,
      remaining_hours: remaining,
      overrun_hours: overrun,
      testing_status: issue.testing_status || existing?.testing_status || 'Not Started',
      comments: issue.comments || '',
      updated_at: new Date().toISOString()
    } as SupportIssue

    // Audit logs for changes
    if (existing) {
      if (existing.actual_hours !== act) {
        logHistoryEvent({
          issue_id: savedIssue.issue_id,
          product_name: savedIssue.product_name,
          user_name: currentUser.name,
          user_id: currentUser.id,
          action: 'Actual Hours Updated',
          field: 'Actual Hrs',
          old_value: String(existing.actual_hours),
          new_value: String(act)
        })
      }
      if (existing.estimated_hours !== est) {
        logHistoryEvent({
          issue_id: savedIssue.issue_id,
          product_name: savedIssue.product_name,
          user_name: currentUser.name,
          user_id: currentUser.id,
          action: 'Estimated Hours Updated',
          field: 'Estimation Hrs',
          old_value: String(existing.estimated_hours),
          new_value: String(est)
        })
      }
      if (existing.testing_status !== savedIssue.testing_status) {
        logHistoryEvent({
          issue_id: savedIssue.issue_id,
          product_name: savedIssue.product_name,
          user_name: currentUser.name,
          user_id: currentUser.id,
          action: savedIssue.testing_status === 'Completed' ? 'Issue Completed' : 'Status Changed',
          field: 'Testing Status',
          old_value: existing.testing_status,
          new_value: savedIssue.testing_status
        })
      }
      if (existing.tester_name !== savedIssue.tester_name) {
        logHistoryEvent({
          issue_id: savedIssue.issue_id,
          product_name: savedIssue.product_name,
          user_name: currentUser.name,
          user_id: currentUser.id,
          action: 'Tester Assigned',
          field: "Who's Testing",
          old_value: existing.tester_name,
          new_value: savedIssue.tester_name
        })
      }
      if (existing.project_id !== savedIssue.project_id) {
        logHistoryEvent({
          issue_id: savedIssue.issue_id,
          product_name: savedIssue.product_name,
          user_name: currentUser.name,
          user_id: currentUser.id,
          action: 'Issue Updated',
          field: 'Product',
          old_value: existing.product_name,
          new_value: savedIssue.product_name
        })
      }
      if (existing.comments !== savedIssue.comments) {
        logHistoryEvent({
          issue_id: savedIssue.issue_id,
          product_name: savedIssue.product_name,
          user_name: currentUser.name,
          user_id: currentUser.id,
          action: 'Comment Added',
          field: 'Comments',
          old_value: existing.comments ? '(Previous Comment)' : '(Empty)',
          new_value: savedIssue.comments ? '(Updated Comment)' : '(Empty)'
        })
      }
    }
  } else {
    // New issue creation
    const nextSlNo = allIssues.length > 0 ? Math.max(...allIssues.map(i => i.sl_no || 0)) + 1 : 1
    const nextIssueNum = 1024 + nextSlNo
    const autoIssueId = issue.issue_id?.trim() || `SUP-${nextIssueNum}`

    savedIssue = {
      id: `issue-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      sl_no: nextSlNo,
      issue_id: autoIssueId,
      project_id: issue.project_id,
      product_name: issue.product_name,
      description: issue.description,
      received_date: issue.received_date || new Date().toISOString().split('T')[0],
      start_date: issue.start_date ?? null,
      finish_date: issue.finish_date ?? null,
      tester_name: issue.tester_name || 'Unassigned',
      estimated_hours: est,
      actual_hours: act,
      remaining_hours: remaining,
      overrun_hours: overrun,
      testing_status: issue.testing_status || 'Not Started',
      comments: issue.comments || '',
      created_by: currentUser.id || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    logHistoryEvent({
      issue_id: savedIssue.issue_id,
      product_name: savedIssue.product_name,
      user_name: currentUser.name,
      user_id: currentUser.id,
      action: 'Issue Created',
      field: 'New Issue',
      old_value: null,
      new_value: `${savedIssue.issue_id} (${savedIssue.testing_status})`
    })
  }

  // Try DB persistence
  try {
    await supabase.from('support_issues').upsert({
      id: savedIssue.id,
      sl_no: savedIssue.sl_no,
      project_id: savedIssue.project_id,
      product_name: savedIssue.product_name,
      issue_id: savedIssue.issue_id,
      description: savedIssue.description,
      received_date: savedIssue.received_date,
      start_date: savedIssue.start_date,
      finish_date: savedIssue.finish_date,
      tester_name: savedIssue.tester_name,
      estimated_hours: savedIssue.estimated_hours,
      actual_hours: savedIssue.actual_hours,
      testing_status: savedIssue.testing_status,
      comments: savedIssue.comments,
      updated_at: savedIssue.updated_at
    })
  } catch (err) {
    console.warn('[supportTrackerService] supabase save error:', err)
  }

  return savedIssue
}

export async function deleteSupportIssue(
  issueId: string,
  currentUser: { name: string; id?: string },
  allIssues: SupportIssue[]
): Promise<void> {
  const target = allIssues.find(i => i.id === issueId)
  if (target) {
    logHistoryEvent({
      issue_id: target.issue_id,
      product_name: target.product_name,
      user_name: currentUser.name,
      user_id: currentUser.id,
      action: 'Issue Deleted',
      field: 'Record Removed',
      old_value: `${target.issue_id} - ${target.description.slice(0, 30)}...`,
      new_value: '(Deleted)'
    })
  }

  try {
    await supabase.from('support_issues').delete().eq('id', issueId)
  } catch (err) {
    console.warn('[supportTrackerService] supabase delete error:', err)
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2.1 INCREMENTAL TIME LOGGING (Requirement: Cumulative Work Hour System)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch all time logs or time logs for a specific support issue.
 */
export async function fetchSupportTimeLogs(issueId?: string): Promise<SupportIssueTimeLog[]> {
  try {
    let query = supabase
      .from('support_issue_time_logs')
      .select('*')
      .order('logged_at', { ascending: false })

    if (issueId) {
      query = query.or(`issue_id.eq.${issueId},support_issue_id.eq.${issueId}`)
    }

    const { data, error } = await query
    if (!error && data && data.length > 0) {
      const mapped: SupportIssueTimeLog[] = data.map((d: any) => ({
        id: d.id,
        issue_id: d.issue_id,
        support_issue_id: d.support_issue_id,
        user_name: d.user_name,
        user_id: d.user_id,
        hours_added: Number(d.hours_added) || 0,
        comment: d.comment || '',
        logged_at: d.logged_at || d.created_at,
        created_at: d.created_at
      }))
      localStorage.setItem(LOCAL_STORAGE_TIMELOGS_KEY, JSON.stringify(mapped))
      return mapped
    }
  } catch (err) {
    console.warn('[supportTrackerService] supabase time logs fetch error:', err)
  }

  // Local storage fallback
  const cached = localStorage.getItem(LOCAL_STORAGE_TIMELOGS_KEY)
  let allLogs: SupportIssueTimeLog[] = []
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed) && parsed.length > 0) {
        allLogs = parsed.filter((l: any) => !l.id?.startsWith('log-10'))
      }
    } catch { /* ignore */ }
  }

  if (issueId) {
    return allLogs.filter(l => l.issue_id === issueId || l.support_issue_id === issueId)
  }
  return allLogs
}

/**
 * Log work hours incrementally against a support issue.
 * Automatically recalculates total actual hours as the sum of all time-log entries.
 * Dynamically updates remaining hours = estimated - total actual (or overrun if actual > estimated).
 * Records an immutable audit log record.
 */
export async function addSupportTimeLog(
  input: {
    issue_id: string
    support_issue_id?: string
    user_name: string
    user_id?: string | null
    hours_added: number
    comment: string
    logged_at?: string
  },
  currentUser: { name: string; id?: string },
  allIssues: SupportIssue[]
): Promise<{ newLog: SupportIssueTimeLog; updatedIssue: SupportIssue }> {
  const roundedHours = Math.round(Number(input.hours_added) * 100) / 100
  const timestamp = input.logged_at || new Date().toISOString()

  const newLog: SupportIssueTimeLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    issue_id: input.issue_id,
    support_issue_id: input.support_issue_id,
    user_name: input.user_name || currentUser.name || 'QA Tester',
    user_id: input.user_id || currentUser.id || null,
    hours_added: roundedHours,
    comment: input.comment.trim(),
    logged_at: timestamp,
    created_at: timestamp
  }

  // Insert into Supabase if available
  try {
    const { data, error } = await supabase
      .from('support_issue_time_logs')
      .insert({
        issue_id: newLog.issue_id,
        support_issue_id: newLog.support_issue_id,
        user_name: newLog.user_name,
        user_id: newLog.user_id,
        hours_added: newLog.hours_added,
        comment: newLog.comment,
        logged_at: newLog.logged_at
      })
      .select()
      .single()

    if (!error && data) {
      newLog.id = data.id
    }
  } catch (err) {
    console.warn('[supportTrackerService] supabase insert time log error:', err)
  }

  // Update local storage time logs
  const existingLogsStr = localStorage.getItem(LOCAL_STORAGE_TIMELOGS_KEY)
  let allLogs: SupportIssueTimeLog[] = []
  if (existingLogsStr) {
    try {
      const parsed = JSON.parse(existingLogsStr)
      if (Array.isArray(parsed)) {
        allLogs = parsed.filter((l: any) => !l.id?.startsWith('log-10'))
      }
    } catch { /* ignore */ }
  }
  allLogs.unshift(newLog)
  localStorage.setItem(LOCAL_STORAGE_TIMELOGS_KEY, JSON.stringify(allLogs))

  // Find target issue and recalculate actual_hours = sum(all time logs for this issue)
  const targetIndex = allIssues.findIndex(
    i => i.issue_id === input.issue_id || (input.support_issue_id && i.id === input.support_issue_id)
  )
  const targetIssue = targetIndex !== -1 ? allIssues[targetIndex] : null

  if (!targetIssue) {
    throw new Error(`Target support issue ${input.issue_id} not found`)
  }

  const logsForIssue = allLogs.filter(
    l => l.issue_id === targetIssue.issue_id || (targetIssue.id && l.support_issue_id === targetIssue.id)
  )
  const totalActual = Math.round(logsForIssue.reduce((sum, l) => sum + Number(l.hours_added), 0) * 100) / 100
  const est = Number(targetIssue.estimated_hours) || 0
  const isOverrun = totalActual > est
  const remaining = isOverrun ? 0 : Math.round((est - totalActual) * 100) / 100
  const overrun = isOverrun ? Math.round((totalActual - est) * 100) / 100 : 0

  const oldActual = targetIssue.actual_hours

  const updatedIssue: SupportIssue = {
    ...targetIssue,
    actual_hours: totalActual,
    remaining_hours: remaining,
    overrun_hours: overrun,
    updated_at: new Date().toISOString()
  }

  // Update in Supabase support_issues
  try {
    await supabase
      .from('support_issues')
      .update({
        actual_hours: totalActual,
        updated_at: updatedIssue.updated_at
      })
      .eq('id', targetIssue.id)
  } catch (err) {
    console.warn('[supportTrackerService] supabase update issue actual_hours error:', err)
  }

  // Update in local storage
  const updatedIssues = allIssues.map(i => i.id === updatedIssue.id ? updatedIssue : i)
  localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify(updatedIssues))

  // Audit history log
  logHistoryEvent({
    issue_id: targetIssue.issue_id,
    product_name: targetIssue.product_name,
    user_name: newLog.user_name,
    user_id: newLog.user_id,
    action: 'Work Hours Logged',
    field: 'Work Hours Logged',
    old_value: `${oldActual} hrs`,
    new_value: `${totalActual} hrs (+${roundedHours} hrs: "${newLog.comment}")`
  })

  return { newLog, updatedIssue }
}

/**
 * Delete a time log entry and recalculate the issue's total actual hours.
 */
export async function deleteSupportTimeLog(
  logId: string,
  currentUser: { name: string; id?: string },
  allIssues: SupportIssue[]
): Promise<{ deletedLogId: string; updatedIssue: SupportIssue }> {
  // Update local storage
  const existingLogsStr = localStorage.getItem(LOCAL_STORAGE_TIMELOGS_KEY)
  let allLogs: SupportIssueTimeLog[] = []
  if (existingLogsStr) {
    try { allLogs = JSON.parse(existingLogsStr) } catch { /* ignore */ }
  }
  const targetLog = allLogs.find(l => l.id === logId)
  if (!targetLog) {
    throw new Error(`Time log ${logId} not found`)
  }

  // Delete from Supabase
  try {
    await supabase.from('support_issue_time_logs').delete().eq('id', logId)
  } catch (err) {
    console.warn('[supportTrackerService] supabase delete time log error:', err)
  }

  allLogs = allLogs.filter(l => l.id !== logId)
  localStorage.setItem(LOCAL_STORAGE_TIMELOGS_KEY, JSON.stringify(allLogs))

  // Find target issue and recalculate actual_hours
  const targetIndex = allIssues.findIndex(
    i => i.issue_id === targetLog.issue_id || (targetLog.support_issue_id && i.id === targetLog.support_issue_id)
  )
  const targetIssue = targetIndex !== -1 ? allIssues[targetIndex] : null

  if (!targetIssue) {
    throw new Error(`Target support issue ${targetLog.issue_id} not found`)
  }

  const logsForIssue = allLogs.filter(
    l => l.issue_id === targetIssue.issue_id || (targetIssue.id && l.support_issue_id === targetIssue.id)
  )
  const totalActual = Math.round(logsForIssue.reduce((sum, l) => sum + Number(l.hours_added), 0) * 100) / 100
  const est = Number(targetIssue.estimated_hours) || 0
  const isOverrun = totalActual > est
  const remaining = isOverrun ? 0 : Math.round((est - totalActual) * 100) / 100
  const overrun = isOverrun ? Math.round((totalActual - est) * 100) / 100 : 0

  const oldActual = targetIssue.actual_hours

  const updatedIssue: SupportIssue = {
    ...targetIssue,
    actual_hours: totalActual,
    remaining_hours: remaining,
    overrun_hours: overrun,
    updated_at: new Date().toISOString()
  }

  // Update in Supabase
  try {
    await supabase
      .from('support_issues')
      .update({
        actual_hours: totalActual,
        updated_at: updatedIssue.updated_at
      })
      .eq('id', targetIssue.id)
  } catch (err) {
    console.warn('[supportTrackerService] supabase update issue actual_hours error:', err)
  }

  // Update in local storage
  const updatedIssues = allIssues.map(i => i.id === updatedIssue.id ? updatedIssue : i)
  localStorage.setItem(LOCAL_STORAGE_ISSUES_KEY, JSON.stringify(updatedIssues))

  // Audit history log
  logHistoryEvent({
    issue_id: targetIssue.issue_id,
    product_name: targetIssue.product_name,
    user_name: currentUser.name,
    user_id: currentUser.id,
    action: 'Work Hours Deleted',
    field: 'Work Hours Removed',
    old_value: `${oldActual} hrs`,
    new_value: `${totalActual} hrs (-${targetLog.hours_added} hrs: "${targetLog.comment}")`
  })

  return { deletedLogId: logId, updatedIssue }
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. AUDIT HISTORY
// ══════════════════════════════════════════════════════════════════════════════

export function formatCurrentTimestamp(): string {
  const now = new Date()
  const day = String(now.getDate()).padStart(2, '0')
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
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
    const { data, error } = await supabase
      .from('support_issue_history')
      .select('*')
      .order('timestamp', { ascending: false })

    if (!error && data && data.length > 0) {
      localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(data))
      return data
    }
  } catch (err) {
    console.warn('[supportTrackerService] supabase history fetch error:', err)
  }

  const cached = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((h: any) => !h.id?.startsWith('hist-'))
      }
    } catch { /* ignore */ }
  }

  return []
}

export function logHistoryEvent(event: Omit<SupportIssueHistoryRecord, 'id' | 'timestamp'> & { timestamp?: string }): void {
  const newRecord: SupportIssueHistoryRecord = {
    id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    issue_id: event.issue_id,
    product_name: event.product_name,
    user_name: event.user_name || 'System User',
    user_id: event.user_id || null,
    action: event.action,
    field: event.field || '',
    old_value: event.old_value ?? null,
    new_value: event.new_value ?? null,
    timestamp: event.timestamp || formatCurrentTimestamp()
  }

  try {
    const existing = JSON.parse(localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY) || '[]')
    const updated = [newRecord, ...existing].slice(0, 500)
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated))
  } catch (e) {
    console.warn('Failed to save history to localStorage', e)
  }

  // Async DB insert
  supabase.from('support_issue_history').insert({
    id: newRecord.id,
    issue_id: newRecord.issue_id,
    product_name: newRecord.product_name,
    user_name: newRecord.user_name,
    user_id: newRecord.user_id,
    action: newRecord.action,
    field: newRecord.field,
    old_value: newRecord.old_value,
    new_value: newRecord.new_value
  }).then(({ error }) => {
    if (error) console.warn('[supportTrackerService] supabase history insert error:', error)
  })
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. CONFIGURABLE DROPDOWNS
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchDropdownConfigurations(): Promise<{
  testing_status: SupportDropdownOption[]
  testers: SupportDropdownOption[]
}> {
  let testingStatusOptions: SupportDropdownOption[] = []
  let testerOptions: SupportDropdownOption[] = []

  try {
    const { data, error } = await supabase
      .from('support_issue_dropdown_configs')
      .select('*')
      .order('sort_order', { ascending: true })

    if (!error && data && data.length > 0) {
      testingStatusOptions = data.filter((d: any) => d.category === 'testing_status')
      testerOptions = data.filter((d: any) => d.category === 'tester')
    }
  } catch (e) {
    console.warn('[supportTrackerService] dropdown configs fetch error:', e)
  }

  if (testingStatusOptions.length === 0 || testerOptions.length === 0) {
    const cached = localStorage.getItem(LOCAL_STORAGE_DROPDOWNS_KEY)
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (parsed.testing_status?.length) testingStatusOptions = parsed.testing_status
        if (parsed.testers?.length) testerOptions = parsed.testers
      } catch { /* ignore */ }
    }
  }

  // Default testing statuses if none
  if (testingStatusOptions.length === 0) {
    testingStatusOptions = DEFAULT_TESTING_STATUSES.map((item, index) => ({
      id: `ts-${index + 1}`,
      category: 'testing_status',
      label: item.label,
      value: item.value,
      color: item.color,
      is_active: true,
      sort_order: index + 1
    }))
  }

  // Default testers if none
  if (testerOptions.length === 0) {
    testerOptions = DEFAULT_TESTERS.map((name, index) => ({
      id: `tester-${index + 1}`,
      category: 'tester',
      label: name,
      value: name,
      is_active: true,
      sort_order: index + 1
    }))
  }

  const result = { testing_status: testingStatusOptions, testers: testerOptions }
  localStorage.setItem(LOCAL_STORAGE_DROPDOWNS_KEY, JSON.stringify(result))
  return result
}

export async function saveDropdownConfigurations(
  configs: { testing_status: SupportDropdownOption[]; testers: SupportDropdownOption[] },
  currentUser: { name: string; id?: string }
): Promise<void> {
  localStorage.setItem(LOCAL_STORAGE_DROPDOWNS_KEY, JSON.stringify(configs))

  logHistoryEvent({
    issue_id: 'CONFIG',
    product_name: 'All Products',
    user_name: currentUser.name,
    user_id: currentUser.id,
    action: 'Dropdown Configuration Change',
    field: 'Dropdown Master List',
    old_value: 'Previous options',
    new_value: `Updated ${configs.testing_status.length} statuses, ${configs.testers.length} testers`
  })

  // Upsert to Supabase
  try {
    const all = [...configs.testing_status, ...configs.testers]
    for (const item of all) {
      await supabase.from('support_issue_dropdown_configs').upsert({
        id: item.id.startsWith('ts-') || item.id.startsWith('tester-') ? undefined : item.id,
        category: item.category,
        label: item.label,
        value: item.value,
        color: item.color || null,
        is_active: item.is_active,
        sort_order: item.sort_order
      })
    }
  } catch (err) {
    console.warn('[supportTrackerService] supabase dropdown save error:', err)
  }
}

/**
 * Sync active profiles from Supabase to populated tester dropdown options
 */
export async function syncTestersFromUserProfiles(): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('status', 'active')
      .order('full_name', { ascending: true })

    if (!error && data && data.length > 0) {
      const names = data
        .map(p => p.full_name?.trim() || p.email?.split('@')[0])
        .filter(Boolean) as string[]
      return Array.from(new Set([...names, ...DEFAULT_TESTERS]))
    }
  } catch (err) {
    console.warn('[supportTrackerService] syncTestersFromUserProfiles error:', err)
  }
  return DEFAULT_TESTERS
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. EXPORT & IMPORT (EXCEL / CSV)
// ══════════════════════════════════════════════════════════════════════════════

export function exportSupportIssuesToCSV(issues: SupportIssue[], filename = 'support-issues.csv'): void {
  const headers = [
    'Sl. No.',
    'Product',
    'Support Issue ID',
    'Support Issue Description',
    'Received Date',
    'Start Date',
    'Finish Date',
    "Who's Testing",
    'Estimation Hrs',
    'Actual Hrs',
    'Remaining Hrs',
    'Overrun Hrs',
    'Testing Status',
    'Comments'
  ]

  const rows = issues.map(issue => [
    issue.sl_no,
    `"${(issue.product_name || '').replace(/"/g, '""')}"`,
    issue.issue_id,
    `"${(issue.description || '').replace(/"/g, '""')}"`,
    issue.received_date || '',
    issue.start_date || '',
    issue.finish_date || '',
    `"${(issue.tester_name || '').replace(/"/g, '""')}"`,
    issue.estimated_hours,
    issue.actual_hours,
    issue.remaining_hours,
    issue.overrun_hours,
    issue.testing_status,
    `"${(issue.comments || '').replace(/"/g, '""')}"`
  ])

  const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
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
  const data = issues.map(issue => ({
    'Sl. No.': issue.sl_no,
    'Product': issue.product_name,
    'Support Issue ID': issue.issue_id,
    'Support Issue Description': issue.description,
    'Received Date': issue.received_date,
    'Start Date': issue.start_date || '',
    'Finish Date': issue.finish_date || '',
    "Who's Testing": issue.tester_name,
    'Estimation Hrs': issue.estimated_hours,
    'Actual Hrs': issue.actual_hours,
    'Remaining Hrs': issue.remaining_hours,
    'Overrun Hrs': issue.overrun_hours,
    'Testing Status': issue.testing_status,
    'Comments': issue.comments || ''
  }))

  const worksheet = XLSX.utils.json_to_sheet(data)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Support Issues')

  // Auto-fit column widths
  const colWidths = [
    { wch: 8 },  // Sl. No.
    { wch: 24 }, // Product
    { wch: 16 }, // Issue ID
    { wch: 45 }, // Description
    { wch: 14 }, // Received
    { wch: 14 }, // Start
    { wch: 14 }, // Finish
    { wch: 20 }, // Tester
    { wch: 15 }, // Est
    { wch: 12 }, // Act
    { wch: 15 }, // Rem
    { wch: 14 }, // Overrun
    { wch: 16 }, // Status
    { wch: 35 }  // Comments
  ]
  worksheet['!cols'] = colWidths

  XLSX.writeFile(workbook, filename)
}
