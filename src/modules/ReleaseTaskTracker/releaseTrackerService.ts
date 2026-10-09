// src/modules/ReleaseTaskTracker/releaseTrackerService.ts
// Service layer for Release Task Tracker module under QA Operations Hub.
// Products and team members are fetched from Project Hub & User Profiles as single sources of truth.
// Cumulative time logs ensure accurate effort tracking without overwriting historical work.

import { supabase } from '@/lib/supabase'
import { fetchProjects as fetchProjectHubProjects } from '@/modules/ProjectHub/projectService'
import type { ProjectWithMembers } from '@/modules/ProjectHub/types'
import type {
  ReleaseTask,
  ReleaseTaskHistoryRecord,
  ReleaseTaskTimeLog,
  ReleaseDropdownOption,
  EmployeeUser,
  PriorityType,
  TaskStatusType
} from './types'
import {
  DEFAULT_TASK_STATUSES,
  DEFAULT_PRIORITIES,
  DEFAULT_ASSIGNED_TO_OPTIONS,
  calculateEffort
} from './types'
import * as XLSX from 'xlsx'

export const LOCAL_STORAGE_TASKS_KEY = 'qaly_release_tracker_tasks_v1'
export const LOCAL_STORAGE_HISTORY_KEY = 'qaly_release_tracker_history_v1'
export const LOCAL_STORAGE_DROPDOWNS_KEY = 'qaly_release_tracker_dropdowns_v1'
export const LOCAL_STORAGE_TIMELOGS_KEY = 'qaly_release_tracker_time_logs_v1'

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

function formatDateDisplay(d?: string | Date | null): string {
  if (!d) return ''
  const dateObj = typeof d === 'string' ? new Date(d) : d
  if (isNaN(dateObj.getTime())) return String(d)
  return dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

function formatTimestampDisplay(d?: string | Date | null): string {
  if (!d) return ''
  const dateObj = typeof d === 'string' ? new Date(d) : d
  if (isNaN(dateObj.getTime())) return String(d)
  return dateObj.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
}

// Fallback employees if no profiles exist
export const DEFAULT_EMPLOYEES: EmployeeUser[] = [
  { id: 'usr-001', name: 'Ameen SR', email: 'ameen@fluxai.internal', role: 'qa_engineer' },
  { id: 'usr-002', name: 'Rahul Sharma', email: 'rahul@fluxai.internal', role: 'qa_lead' },
  { id: 'usr-003', name: 'Sarah Jenkins', email: 'sarah@fluxai.internal', role: 'manager' },
  { id: 'usr-004', name: 'Michael Ross', email: 'michael@fluxai.internal', role: 'developer' },
  { id: 'usr-005', name: 'Emily Taylor', email: 'emily@fluxai.internal', role: 'qa_engineer' }
]

// ══════════════════════════════════════════════════════════════════════════════
// 1. PRODUCTS & EMPLOYEES SOURCE (Single Source of Truth)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Fetch products dynamically from Project Hub (/project-hub).
 * Single authoritative source. Never duplicates Product Master.
 */
export async function fetchProductsFromProjectHub(): Promise<ProjectWithMembers[]> {
  try {
    const projects = await fetchProjectHubProjects()
    if (projects && projects.length > 0) {
      return projects
    }
  } catch (err) {
    console.warn('[releaseTrackerService] fetchProjectHubProjects error:', err)
  }

  // Supabase fallback
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
    console.warn('[releaseTrackerService] direct projects fetch error:', dbErr)
  }

  // Sample projects in development if database is clean
  return [
    {
      id: '00000000-0000-4000-8000-000000000001',
      name: 'Qaly AI Engine Core',
      project_code: 'QALY-CORE',
      description: 'Core AI Agentic Engine and Execution Pipeline',
      status: 'active',
      start_date: '2026-01-01',
      target_end_date: '2026-12-31',
      actual_end_date: null,
      tags: ['core', 'ai'],
      metadata: {},
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      members: [],
      member_count: 0
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      name: 'Enterprise QA Platform',
      project_code: 'QA-ENT',
      description: 'End-to-End Test & Automation Suite',
      status: 'active',
      start_date: '2026-02-01',
      target_end_date: '2026-10-31',
      actual_end_date: null,
      tags: ['enterprise', 'testing'],
      metadata: {},
      created_by: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      members: [],
      member_count: 0
    }
  ]
}

/**
 * Fetch active team members / employees from profiles table.
 * Uses stable Profile UUID. Deduplicates by ID.
 */
export async function fetchActiveEmployees(): Promise<EmployeeUser[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url')
      .order('full_name', { ascending: true })

    if (!error && data && data.length > 0) {
      const seen = new Set<string>()
      const employees: EmployeeUser[] = []

      for (const p of data) {
        if (!p.id || seen.has(p.id)) continue
        seen.add(p.id)
        const name = (p.full_name?.trim() || p.email?.split('@')[0] || 'Unknown User')
        employees.push({
          id: p.id,
          name,
          email: p.email || '',
          role: p.role,
          avatar_url: p.avatar_url
        })
      }

      if (employees.length > 0) {
        return employees
      }
    }
  } catch (err) {
    console.warn('[releaseTrackerService] fetchActiveEmployees error:', err)
  }

  return DEFAULT_EMPLOYEES
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. TASK ID GENERATION (Requirement 8)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Generates next unique Task ID e.g. REL-001, REL-002, REL-003.
 * Preserves existing numbers and avoids any duplicates.
 */
export function generateNextTaskId(existingTasks: ReleaseTask[]): string {
  let maxNum = 0
  for (const t of existingTasks) {
    if (t.task_id && t.task_id.startsWith('REL-')) {
      const parsed = parseInt(t.task_id.replace('REL-', ''), 10)
      if (!isNaN(parsed) && parsed > maxNum) {
        maxNum = parsed
      }
    }
  }
  const nextNum = maxNum + 1
  return `REL-${String(nextNum).padStart(3, '0')}`
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. RELEASE TASKS (CRUD & Calculations)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Deduplicate tasks by task_id and id.
 */
function deduplicateTasks(tasks: ReleaseTask[]): ReleaseTask[] {
  const seenId = new Set<string>()
  const seenTaskId = new Set<string>()
  const result: ReleaseTask[] = []

  for (const task of tasks) {
    if (!task.id || seenId.has(task.id)) continue
    if (task.task_id && seenTaskId.has(task.task_id)) continue

    seenId.add(task.id)
    if (task.task_id) seenTaskId.add(task.task_id)
    result.push(task)
  }

  return result
}

/**
 * Fetch all release tasks.
 * Aggregates actual_hours cumulatively from time logs!
 */
export async function fetchReleaseTasks(
  products: ProjectWithMembers[],
  preFetchedTimeLogs?: ReleaseTaskTimeLog[]
): Promise<ReleaseTask[]> {
  const timeLogs = preFetchedTimeLogs ?? (await fetchReleaseTimeLogs())

  // Calculate actual hours map — keyed by release_task_id (UUID) AND task_id (string) separately.
  // Each log is counted ONCE: prefer release_task_id when available, else fall back to task_id.
  const actualHoursByUUID = new Map<string, number>()
  const actualHoursByTaskId = new Map<string, number>()
  for (const log of timeLogs) {
    const hrs = Number(log.hours_added) || 0
    if (log.release_task_id) {
      actualHoursByUUID.set(
        log.release_task_id,
        Math.round(((actualHoursByUUID.get(log.release_task_id) || 0) + hrs) * 100) / 100
      )
    } else if (log.task_id) {
      actualHoursByTaskId.set(
        log.task_id,
        Math.round(((actualHoursByTaskId.get(log.task_id) || 0) + hrs) * 100) / 100
      )
    }
  }
  // Merge: UUID map wins; fall back to task_id map
  const actualHoursMap = new Map<string, number>([
    ...actualHoursByTaskId,
    ...actualHoursByUUID
  ])

  // Try DB fetch
  try {
    const { data, error } = await supabase
      .from('release_tasks')
      .select('*')
      .eq('is_deleted', false)
      .order('sl_no', { ascending: true })

    if (!error && data && data.length > 0) {
      const mapped: ReleaseTask[] = data.map((d: any, index: number) => {
        const est = Number(d.estimated_hours) || 0
        const actFromLogs = actualHoursByUUID.get(d.id) ?? actualHoursByTaskId.get(d.task_id)
        const act = actFromLogs !== undefined ? actFromLogs : (Number(d.actual_hours) || 0)
        const effort = calculateEffort(est, act)

        const matchingProd = products.find(p => p.id === d.project_id)

        return {
          id: d.id,
          sl_no: d.sl_no || (index + 1),
          project_id: d.project_id || (matchingProd?.id || products[0]?.id || ''),
          product_name: matchingProd?.name || d.product_name || 'General Product',
          product_code: matchingProd?.project_code || d.product_code || null,
          release_version: d.release_version || 'Release 1.0',
          task_id: d.task_id || `REL-${String(index + 1).padStart(3, '0')}`,
          description: d.description || '',
          priority: (d.priority as PriorityType) || 'Medium',
          start_date: d.start_date || null,
          target_date: d.target_date || null,
          finish_date: d.finish_date || null,
          assigned_to_user_id: d.assigned_to_user_id || null,
          assigned_to_name: d.assigned_to_name || 'Unassigned',
          estimated_hours: est,
          estimated_hours_locked: Boolean(d.estimated_hours_locked),
          estimated_hours_locked_by: d.estimated_hours_locked_by || null,
          estimated_hours_locked_at: d.estimated_hours_locked_at || null,
          actual_hours: act,
          remaining_hours: effort.remainingHrs,
          overrun_hours: effort.overrunHrs,
          task_status: (d.task_status as TaskStatusType) || 'Not Started',
          comments: d.comments || '',
          is_deleted: d.is_deleted || false,
          created_by: d.created_by || null,
          created_at: d.created_at || new Date().toISOString(),
          updated_at: d.updated_at || new Date().toISOString()
        }
      })

      const deduplicated = deduplicateTasks(mapped)
      try {
        localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(deduplicated))
      } catch { /* ignore */ }
      return deduplicated
    }
  } catch (err) {
    console.warn('[releaseTrackerService] supabase release_tasks fetch error:', err)
  }

  // LocalStorage fallback
  const cached = localStorage.getItem(LOCAL_STORAGE_TASKS_KEY)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed) && parsed.length > 0) {
        const enriched = parsed
          .filter(t => !t.is_deleted)
          .map((t: ReleaseTask, idx: number) => {
            const est = Number(t.estimated_hours) || 0
            const actFromLogs = actualHoursByUUID.get(t.id) ?? actualHoursByTaskId.get(t.task_id)
            const act = actFromLogs !== undefined ? actFromLogs : (Number(t.actual_hours) || 0)
            const effort = calculateEffort(est, act)
            return {
              ...t,
              sl_no: t.sl_no || (idx + 1),
              actual_hours: act,
              remaining_hours: effort.remainingHrs,
              overrun_hours: effort.overrunHrs
            }
          })
        return deduplicateTasks(enriched)
      }
    } catch { /* ignore */ }
  }

  return []
}

/**
 * Save / Create / Update a Release Task.
 * Guaranteed no duplicate task records.
 * Generates audit history records.
 */
export async function saveReleaseTask(
  taskInput: Partial<ReleaseTask> & {
    project_id: string
    product_name: string
    release_version: string
    description: string
  },
  currentUser: { name: string; id?: string },
  allTasks: ReleaseTask[],
  allTimeLogs: ReleaseTaskTimeLog[] = []
): Promise<ReleaseTask> {
  const isEdit = Boolean(taskInput.id && allTasks.some(t => t.id === taskInput.id))
  const est = Math.max(0, Number(taskInput.estimated_hours) || 0)

  // Calculate actual hours cumulatively from time logs
  const targetTaskId = taskInput.task_id || (taskInput.id ? allTasks.find(t => t.id === taskInput.id)?.task_id : null)
  let act = 0
  if (taskInput.id || targetTaskId) {
    const taskLogs = allTimeLogs.filter(
      l => (taskInput.id && l.release_task_id === taskInput.id) || (targetTaskId && l.task_id === targetTaskId)
    )
    act = taskLogs.reduce((acc, l) => acc + (Number(l.hours_added) || 0), 0)
    act = Math.round(act * 100) / 100
  }
  if (act === 0 && taskInput.actual_hours !== undefined) {
    act = Number(taskInput.actual_hours) || 0
  }

  const effort = calculateEffort(est, act)
  let savedTask: ReleaseTask

  if (isEdit) {
    const existing = allTasks.find(t => t.id === taskInput.id)!

    // Enforce Estimation Lock server/service validation (Requirement 10, 16 & 25)
    if (
      existing?.estimated_hours_locked &&
      taskInput.estimated_hours !== undefined &&
      est !== Number(existing.estimated_hours)
    ) {
      throw new Error(
        'Estimated Hours are locked and cannot be modified. Please contact an authorized user to unlock the estimation.'
      )
    }

    savedTask = {
      ...existing,
      ...taskInput,
      id: existing.id,
      sl_no: existing.sl_no,
      task_id: existing.task_id, // Unchangeable on edit as per requirement 8
      project_id: taskInput.project_id || existing.project_id,
      product_name: taskInput.product_name || existing.product_name,
      product_code: taskInput.product_code ?? existing.product_code,
      release_version: taskInput.release_version || existing.release_version,
      description: taskInput.description || existing.description,
      priority: taskInput.priority || existing.priority,
      start_date: taskInput.start_date !== undefined ? taskInput.start_date : existing.start_date,
      target_date: taskInput.target_date !== undefined ? taskInput.target_date : existing.target_date,
      finish_date: taskInput.finish_date !== undefined ? taskInput.finish_date : existing.finish_date,
      assigned_to_user_id: taskInput.assigned_to_user_id !== undefined ? taskInput.assigned_to_user_id : existing.assigned_to_user_id,
      assigned_to_name: taskInput.assigned_to_name || existing.assigned_to_name,
      estimated_hours: existing?.estimated_hours_locked ? Number(existing.estimated_hours) : est,
      estimated_hours_locked: existing?.estimated_hours_locked ?? false,
      estimated_hours_locked_by: existing?.estimated_hours_locked_by ?? null,
      estimated_hours_locked_at: existing?.estimated_hours_locked_at ?? null,
      actual_hours: act,
      remaining_hours: effort.remainingHrs,
      overrun_hours: effort.overrunHrs,
      task_status: taskInput.task_status || existing.task_status,
      comments: taskInput.comments !== undefined ? taskInput.comments : existing.comments,
      updated_at: new Date().toISOString()
    }

    // Generate individual audit history records for meaningful changes
    if (existing.task_status !== savedTask.task_status) {
      logReleaseHistoryEvent({
        task_id: savedTask.task_id,
        product_name: savedTask.product_name,
        release_version: savedTask.release_version,
        user_name: currentUser.name,
        user_id: currentUser.id,
        action: savedTask.task_status === 'Completed' ? 'Task Completed' : 'Status Changed',
        field: 'Task Status',
        old_value: existing.task_status,
        new_value: savedTask.task_status
      })
    }
    if (existing.priority !== savedTask.priority) {
      logReleaseHistoryEvent({
        task_id: savedTask.task_id,
        product_name: savedTask.product_name,
        release_version: savedTask.release_version,
        user_name: currentUser.name,
        user_id: currentUser.id,
        action: 'Priority Changed',
        field: 'Priority',
        old_value: existing.priority,
        new_value: savedTask.priority
      })
    }
    if (existing.assigned_to_name !== savedTask.assigned_to_name) {
      logReleaseHistoryEvent({
        task_id: savedTask.task_id,
        product_name: savedTask.product_name,
        release_version: savedTask.release_version,
        user_name: currentUser.name,
        user_id: currentUser.id,
        action: 'Task Assigned',
        field: "Who's Testing",
        old_value: existing.assigned_to_name,
        new_value: savedTask.assigned_to_name
      })
    }
    if (existing.estimated_hours !== est) {
      logReleaseHistoryEvent({
        task_id: savedTask.task_id,
        product_name: savedTask.product_name,
        release_version: savedTask.release_version,
        user_name: currentUser.name,
        user_id: currentUser.id,
        action: 'Estimated Hours Changed',
        field: 'Estimated Hrs',
        old_value: String(existing.estimated_hours),
        new_value: String(est)
      })
    }
    if (existing.product_name !== savedTask.product_name) {
      logReleaseHistoryEvent({
        task_id: savedTask.task_id,
        product_name: savedTask.product_name,
        release_version: savedTask.release_version,
        user_name: currentUser.name,
        user_id: currentUser.id,
        action: 'Product Changed',
        field: 'Product',
        old_value: existing.product_name,
        new_value: savedTask.product_name
      })
    }
    if (existing.release_version !== savedTask.release_version) {
      logReleaseHistoryEvent({
        task_id: savedTask.task_id,
        product_name: savedTask.product_name,
        release_version: savedTask.release_version,
        user_name: currentUser.name,
        user_id: currentUser.id,
        action: 'Release Changed',
        field: 'Release',
        old_value: existing.release_version,
        new_value: savedTask.release_version
      })
    }
    if (existing.comments !== savedTask.comments) {
      logReleaseHistoryEvent({
        task_id: savedTask.task_id,
        product_name: savedTask.product_name,
        release_version: savedTask.release_version,
        user_name: currentUser.name,
        user_id: currentUser.id,
        action: 'Comment Added',
        field: 'Comments',
        old_value: existing.comments ? '(Previous Comment)' : '(Empty)',
        new_value: savedTask.comments ? '(Updated Comment)' : '(Empty)'
      })
    }
  } else {
    // New Task Creation
    const nextSlNo = allTasks.length > 0 ? Math.max(...allTasks.map(t => t.sl_no || 0)) + 1 : 1
    const autoTaskId = taskInput.task_id?.trim() || generateNextTaskId(allTasks)
    const generatedId = (taskInput.id && isUUID(taskInput.id)) ? taskInput.id : generateUUID()

    savedTask = {
      id: generatedId,
      sl_no: nextSlNo,
      project_id: taskInput.project_id,
      product_name: taskInput.product_name,
      product_code: taskInput.product_code || null,
      release_version: taskInput.release_version || 'Release 1.0',
      task_id: autoTaskId,
      description: taskInput.description,
      priority: taskInput.priority || 'Medium',
      start_date: taskInput.start_date || null,
      target_date: taskInput.target_date || null,
      finish_date: taskInput.finish_date || null,
      assigned_to_user_id: taskInput.assigned_to_user_id || null,
      assigned_to_name: taskInput.assigned_to_name || 'Unassigned',
      estimated_hours: est,
      estimated_hours_locked: false,
      estimated_hours_locked_by: null,
      estimated_hours_locked_at: null,
      actual_hours: act,
      remaining_hours: effort.remainingHrs,
      overrun_hours: effort.overrunHrs,
      task_status: taskInput.task_status || 'Not Started',
      comments: taskInput.comments || '',
      is_deleted: false,
      created_by: (currentUser.id && isUUID(currentUser.id)) ? currentUser.id : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    logReleaseHistoryEvent({
      task_id: savedTask.task_id,
      product_name: savedTask.product_name,
      release_version: savedTask.release_version,
      user_name: currentUser.name,
      user_id: currentUser.id,
      action: 'Task Created',
      field: 'New Task',
      old_value: null,
      new_value: `${savedTask.task_id} (${savedTask.release_version})`
    })
  }

  // Update LocalStorage immediately
  const updatedTasks = isEdit
    ? allTasks.map(t => (t.id === savedTask.id ? savedTask : t))
    : [savedTask, ...allTasks.filter(t => t.id !== savedTask.id)]
  try {
    localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(updatedTasks))
  } catch { /* ignore */ }

  // Persist to Supabase
  try {
    const payload: any = {
      id: isUUID(savedTask.id) ? savedTask.id : generateUUID(),
      sl_no: savedTask.sl_no,
      product_name: savedTask.product_name,
      product_code: savedTask.product_code,
      release_version: savedTask.release_version,
      task_id: savedTask.task_id,
      description: savedTask.description,
      priority: savedTask.priority,
      start_date: savedTask.start_date,
      target_date: savedTask.target_date,
      finish_date: savedTask.finish_date,
      assigned_to_name: savedTask.assigned_to_name,
      estimated_hours: savedTask.estimated_hours,
      estimated_hours_locked: savedTask.estimated_hours_locked ?? false,
      estimated_hours_locked_by: savedTask.estimated_hours_locked_by ?? null,
      estimated_hours_locked_at: savedTask.estimated_hours_locked_at ?? null,
      actual_hours: savedTask.actual_hours,
      task_status: savedTask.task_status,
      comments: savedTask.comments,
      is_deleted: false,
      updated_at: savedTask.updated_at
    }

    if (savedTask.project_id && isUUID(savedTask.project_id)) {
      payload.project_id = savedTask.project_id
    }
    if (savedTask.assigned_to_user_id && isUUID(savedTask.assigned_to_user_id)) {
      payload.assigned_to_user_id = savedTask.assigned_to_user_id
    }
    if (savedTask.created_by && isUUID(savedTask.created_by)) {
      payload.created_by = savedTask.created_by
    }

    const { error: dbError } = await supabase.from('release_tasks').upsert(payload, { onConflict: 'task_id' })
    if (dbError) {
      console.warn('[releaseTrackerService] supabase save error:', dbError)
    }
  } catch (err) {
    console.warn('[releaseTrackerService] supabase save error:', err)
  }

  return savedTask
}

/**
 * Toggle Estimation Hours Lock on a specific Release Task (Requirement 1, 2, 7 & 8)
 * Records history entry and persists state per task independently.
 */
export async function toggleReleaseTaskEstimationLock(
  targetId: string,
  shouldLock: boolean,
  currentUser: { name: string; id?: string },
  allTasks: ReleaseTask[]
): Promise<ReleaseTask> {
  const existing = allTasks.find(t => t.id === targetId || t.task_id === targetId)
  if (!existing) {
    throw new Error('Release task not found')
  }

  const updatedTask: ReleaseTask = {
    ...existing,
    estimated_hours_locked: shouldLock,
    estimated_hours_locked_by: shouldLock ? currentUser.name : null,
    estimated_hours_locked_at: shouldLock ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  }

  // Record audit history (Requirement 14)
  logReleaseHistoryEvent({
    task_id: existing.task_id,
    product_name: existing.product_name,
    release_version: existing.release_version,
    user_name: currentUser.name,
    user_id: currentUser.id,
    action: shouldLock ? 'Estimated Hours Locked' : 'Estimated Hours Unlocked',
    field: 'Estimation Lock',
    old_value: shouldLock ? `${existing.estimated_hours} (Unlocked)` : 'Locked',
    new_value: shouldLock ? `${existing.estimated_hours} (Locked)` : 'Unlocked'
  })

  // Update local storage
  const nextTasks = allTasks.map(t => (t.id === updatedTask.id ? updatedTask : t))
  try {
    localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(nextTasks))
  } catch { /* ignore */ }

  // Sync to Supabase
  try {
    if (isUUID(existing.id)) {
      await supabase
        .from('release_tasks')
        .update({
          estimated_hours_locked: shouldLock,
          estimated_hours_locked_by: shouldLock ? currentUser.name : null,
          estimated_hours_locked_at: shouldLock ? new Date().toISOString() : null,
          updated_at: updatedTask.updated_at
        })
        .eq('id', existing.id)
    }
  } catch (err) {
    console.warn('[releaseTrackerService] supabase toggle lock error:', err)
  }

  return updatedTask
}

/**
 * Delete a Release Task (Soft delete for auditability as per requirement 18).
 */
export async function deleteReleaseTask(
  taskId: string,
  currentUser: { name: string; id?: string },
  allTasks: ReleaseTask[]
): Promise<void> {
  const target = allTasks.find(t => t.id === taskId)
  if (target) {
    logReleaseHistoryEvent({
      task_id: target.task_id,
      product_name: target.product_name,
      release_version: target.release_version,
      user_name: currentUser.name,
      user_id: currentUser.id,
      action: 'Task Deleted',
      field: 'Task Removed',
      old_value: `${target.task_id} (${target.release_version})`,
      new_value: '(Deleted)'
    })
  }

  const updatedTasks = allTasks.filter(t => t.id !== taskId)
  try {
    localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(updatedTasks))
  } catch { /* ignore */ }

  try {
    // Attempt soft delete first, fallback to hard delete
    const { error } = await supabase
      .from('release_tasks')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', taskId)

    if (error) {
      await supabase.from('release_tasks').delete().eq('id', taskId)
    }
  } catch (err) {
    console.warn('[releaseTrackerService] supabase delete error:', err)
  }
}

/**
 * Bulk delete release tasks by ID array.
 * Soft-deletes each record, logs a Bulk Delete audit entry per task.
 * Returns ids that were successfully deleted.
 */
export async function bulkDeleteReleaseTasks(
  ids: string[],
  currentUser: { name: string; id?: string },
  allTasks: ReleaseTask[]
): Promise<{ deleted: string[]; failed: Array<{ id: string; reason: string }> }> {
  const deleted: string[] = []
  const failed: Array<{ id: string; reason: string }> = []

  const uniqueIds = [...new Set(ids)]

  for (const id of uniqueIds) {
    const target = allTasks.find(t => t.id === id)
    if (!target) {
      failed.push({ id, reason: 'Record not found' })
      continue
    }
    try {
      logReleaseHistoryEvent({
        task_id: target.task_id,
        product_name: target.product_name,
        release_version: target.release_version,
        user_name: currentUser.name,
        user_id: currentUser.id,
        action: 'Task Deleted',
        field: 'Bulk Delete',
        old_value: `${target.task_id} - ${target.description.slice(0, 40)}`,
        new_value: '(Bulk Deleted)'
      })
      // Soft delete first, fallback to hard delete
      const { error } = await supabase
        .from('release_tasks')
        .update({ is_deleted: true, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) {
        await supabase.from('release_tasks').delete().eq('id', id)
      }
      deleted.push(id)
    } catch (err: any) {
      failed.push({ id, reason: err?.message || 'Delete failed' })
    }
  }

  // Update localStorage
  const remaining = allTasks.filter(t => !deleted.includes(t.id))
  try { localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(remaining)) } catch { /* ignore */ }

  return { deleted, failed }
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. TIME LOG SYSTEM (Requirements 10 & 11: Cumulative Actual Hours)
// ══════════════════════════════════════════════════════════════════════════════

function deduplicateTimeLogs(logs: ReleaseTaskTimeLog[]): ReleaseTaskTimeLog[] {
  const seen = new Set<string>()
  const result: ReleaseTaskTimeLog[] = []
  for (const log of logs) {
    if (!log.id || seen.has(log.id)) continue
    seen.add(log.id)
    result.push(log)
  }
  return result
}

/**
 * Fetch all time logs or time logs for a specific task.
 */
export async function fetchReleaseTimeLogs(taskId?: string): Promise<ReleaseTaskTimeLog[]> {
  try {
    let query = supabase
      .from('release_task_time_logs')
      .select('*')
      .order('logged_at', { ascending: false })

    if (taskId) {
      query = query.or(`task_id.eq.${taskId},release_task_id.eq.${taskId}`)
    }

    const { data, error } = await query
    if (!error && data && data.length > 0) {
      const mapped: ReleaseTaskTimeLog[] = deduplicateTimeLogs(
        data.map((d: any) => ({
          id: d.id,
          task_id: d.task_id,
          release_task_id: d.release_task_id,
          user_name: d.user_name,
          user_id: d.user_id,
          hours_added: Number(d.hours_added) || 0,
          comment: d.comment || '',
          date: d.logged_at ? d.logged_at.split('T')[0] : new Date().toISOString().split('T')[0],
          logged_at: d.logged_at || d.created_at,
          created_at: d.created_at
        }))
      )
      try {
        localStorage.setItem(LOCAL_STORAGE_TIMELOGS_KEY, JSON.stringify(mapped))
      } catch { /* ignore */ }
      return mapped
    }
  } catch (err) {
    console.warn('[releaseTrackerService] supabase time logs fetch error:', err)
  }

  const cached = localStorage.getItem(LOCAL_STORAGE_TIMELOGS_KEY)
  let allLogs: ReleaseTaskTimeLog[] = []
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed)) {
        allLogs = deduplicateTimeLogs(parsed)
      }
    } catch { /* ignore */ }
  }

  if (taskId) {
    return allLogs.filter(l => l.task_id === taskId || l.release_task_id === taskId)
  }
  return allLogs
}

/**
 * Incremental time logging.
 * Calculates Actual = SUM(all time log entries).
 * Remaining = Estimated - Actual.
 * If Actual > Estimated: Overrun = Actual - Estimated.
 */
export async function addReleaseTimeLog(
  input: {
    task_id: string
    release_task_id?: string
    user_name: string
    user_id?: string | null
    hours_added: number
    comment: string
    date?: string
    logged_at?: string
  },
  currentUser: { name: string; id?: string },
  allTasks: ReleaseTask[]
): Promise<{ newLog: ReleaseTaskTimeLog; updatedTask: ReleaseTask }> {
  const roundedHours = Math.round(Number(input.hours_added) * 100) / 100
  const dateStr = input.date || new Date().toISOString().split('T')[0]
  const timestamp = input.logged_at || new Date().toISOString()

  const newLog: ReleaseTaskTimeLog = {
    id: generateUUID(),
    task_id: input.task_id,
    release_task_id: input.release_task_id,
    user_name: input.user_name || currentUser.name || 'QA Tester',
    user_id: input.user_id || currentUser.id || null,
    hours_added: roundedHours,
    comment: input.comment || '',
    date: dateStr,
    logged_at: timestamp,
    created_at: new Date().toISOString()
  }

  // Update localStorage time logs
  const existingLogs = await fetchReleaseTimeLogs()
  const nextLogs = [newLog, ...existingLogs.filter(l => l.id !== newLog.id)]
  try {
    localStorage.setItem(LOCAL_STORAGE_TIMELOGS_KEY, JSON.stringify(nextLogs))
  } catch { /* ignore */ }

  // Recalculate cumulative actual hours for the target task
  const taskLogs = nextLogs.filter(
    l => l.task_id === input.task_id || (input.release_task_id && l.release_task_id === input.release_task_id)
  )
  const cumulativeActual = Math.round(
    taskLogs.reduce((acc, l) => acc + (Number(l.hours_added) || 0), 0) * 100
  ) / 100

  // Update target task record
  const targetTask = allTasks.find(
    t => t.task_id === input.task_id || t.id === input.release_task_id
  )

  let updatedTask: ReleaseTask
  if (targetTask) {
    const est = Number(targetTask.estimated_hours) || 0
    const effort = calculateEffort(est, cumulativeActual)

    updatedTask = {
      ...targetTask,
      actual_hours: cumulativeActual,
      remaining_hours: effort.remainingHrs,
      overrun_hours: effort.overrunHrs,
      updated_at: new Date().toISOString()
    }

    const updatedTasks = allTasks.map(t => (t.id === updatedTask.id ? updatedTask : t))
    try {
      localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(updatedTasks))
    } catch { /* ignore */ }

    // Audit history for time added (Requirement 19: e.g. "Ameen added +3 Hrs to REL-102 | Release 4.2 | 08 Oct 2026, 10:32 AM")
    logReleaseHistoryEvent({
      task_id: targetTask.task_id,
      product_name: targetTask.product_name,
      release_version: targetTask.release_version,
      user_name: currentUser.name,
      user_id: currentUser.id,
      action: 'Time Added',
      field: 'Work Hours Logged',
      old_value: `${targetTask.actual_hours} Hrs`,
      new_value: `+${roundedHours} Hrs (Total: ${cumulativeActual} Hrs)${input.comment ? ` - "${input.comment}"` : ''}`
    })

    // Persist actual_hours update to Supabase
    try {
      await supabase
        .from('release_tasks')
        .update({
          actual_hours: cumulativeActual,
          updated_at: updatedTask.updated_at
        })
        .eq('id', updatedTask.id)
    } catch (err) {
      console.warn('[releaseTrackerService] update actual_hours error:', err)
    }
  } else {
    throw new Error(`Release task with ID ${input.task_id} not found`)
  }

  // Persist time log to Supabase
  try {
    const payload: any = {
      task_id: newLog.task_id,
      user_name: newLog.user_name,
      hours_added: newLog.hours_added,
      comment: newLog.comment,
      logged_at: newLog.logged_at
    }
    if (newLog.release_task_id && isUUID(newLog.release_task_id)) {
      payload.release_task_id = newLog.release_task_id
    }
    if (newLog.user_id && isUUID(newLog.user_id)) {
      payload.user_id = newLog.user_id
    }
    await supabase.from('release_task_time_logs').insert(payload)
  } catch (err) {
    console.warn('[releaseTrackerService] supabase time log insert error:', err)
  }

  return { newLog, updatedTask }
}

/**
 * Remove a time log entry and recalculate task cumulative actual hours.
 */
export async function deleteReleaseTimeLog(
  logId: string,
  currentUser: { name: string; id?: string },
  allTasks: ReleaseTask[]
): Promise<{ deletedLogId: string; updatedTask: ReleaseTask }> {
  const existingLogs = await fetchReleaseTimeLogs()
  const targetLog = existingLogs.find(l => l.id === logId)
  const nextLogs = existingLogs.filter(l => l.id !== logId)

  try {
    localStorage.setItem(LOCAL_STORAGE_TIMELOGS_KEY, JSON.stringify(nextLogs))
  } catch { /* ignore */ }

  if (!targetLog) {
    throw new Error('Time log entry not found')
  }

  // Recalculate task actual hours
  const taskLogs = nextLogs.filter(
    l => l.task_id === targetLog.task_id || (targetLog.release_task_id && l.release_task_id === targetLog.release_task_id)
  )
  const cumulativeActual = Math.round(
    taskLogs.reduce((acc, l) => acc + (Number(l.hours_added) || 0), 0) * 100
  ) / 100

  const targetTask = allTasks.find(
    t => t.task_id === targetLog.task_id || t.id === targetLog.release_task_id
  )

  let updatedTask: ReleaseTask
  if (targetTask) {
    const est = Number(targetTask.estimated_hours) || 0
    const effort = calculateEffort(est, cumulativeActual)

    updatedTask = {
      ...targetTask,
      actual_hours: cumulativeActual,
      remaining_hours: effort.remainingHrs,
      overrun_hours: effort.overrunHrs,
      updated_at: new Date().toISOString()
    }

    const updatedTasks = allTasks.map(t => (t.id === updatedTask.id ? updatedTask : t))
    try {
      localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(updatedTasks))
    } catch { /* ignore */ }

    logReleaseHistoryEvent({
      task_id: targetTask.task_id,
      product_name: targetTask.product_name,
      release_version: targetTask.release_version,
      user_name: currentUser.name,
      user_id: currentUser.id,
      action: 'Time Log Removed',
      field: 'Work Hours',
      old_value: `${targetLog.hours_added} Hrs logged by ${targetLog.user_name}`,
      new_value: `Removed (Total: ${cumulativeActual} Hrs)`
    })

    try {
      await supabase
        .from('release_tasks')
        .update({
          actual_hours: cumulativeActual,
          updated_at: updatedTask.updated_at
        })
        .eq('id', updatedTask.id)
    } catch (err) {
      console.warn('[releaseTrackerService] update task after log deletion error:', err)
    }
  } else {
    throw new Error(`Task for log ${logId} not found`)
  }

  // Remove from Supabase (works for both UUID and legacy log-timestamp ids)
  try {
    await supabase.from('release_task_time_logs').delete().eq('id', logId)
  } catch (err) {
    console.warn('[releaseTrackerService] delete log from supabase error:', err)
  }

  return { deletedLogId: logId, updatedTask }
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. AUDIT HISTORY / RECENT ACTIVITY (Requirements 19 & 20)
// ══════════════════════════════════════════════════════════════════════════════

function deduplicateHistory(records: ReleaseTaskHistoryRecord[]): ReleaseTaskHistoryRecord[] {
  const seen = new Set<string>()
  const result: ReleaseTaskHistoryRecord[] = []
  for (const r of records) {
    const key = `${r.task_id}_${r.action}_${r.field || ''}_${r.timestamp}`
    if (seen.has(key)) continue
    seen.add(key)
    result.push(r)
  }
  return result
}

export async function fetchReleaseHistory(): Promise<ReleaseTaskHistoryRecord[]> {
  try {
    const { data, error } = await supabase
      .from('release_task_history')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(200)

    if (!error && data && data.length > 0) {
      const mapped: ReleaseTaskHistoryRecord[] = data.map((d: any) => ({
        id: d.id,
        task_id: d.task_id,
        product_name: d.product_name,
        release_version: d.release_version,
        user_name: d.user_name,
        user_id: d.user_id,
        action: d.action,
        field: d.field,
        old_value: d.old_value,
        new_value: d.new_value,
        timestamp: formatTimestampDisplay(d.timestamp)
      }))
      const deduplicated = deduplicateHistory(mapped)
      try {
        localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(deduplicated))
      } catch { /* ignore */ }
      return deduplicated
    }
  } catch (err) {
    console.warn('[releaseTrackerService] supabase fetchReleaseHistory error:', err)
  }

  const cached = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (Array.isArray(parsed)) return deduplicateHistory(parsed)
    } catch { /* ignore */ }
  }

  return []
}

export function logReleaseHistoryEvent(event: {
  task_id: string
  product_name: string
  release_version: string
  user_name: string
  user_id?: string | null
  action: ReleaseTaskHistoryRecord['action']
  field?: string
  old_value?: string | null
  new_value?: string | null
}): void {
  const newRecord: ReleaseTaskHistoryRecord = {
    id: generateUUID(),
    task_id: event.task_id,
    product_name: event.product_name,
    release_version: event.release_version,
    user_name: event.user_name || 'QA System',
    user_id: event.user_id || null,
    action: event.action,
    field: event.field,
    old_value: event.old_value ?? null,
    new_value: event.new_value ?? null,
    timestamp: formatTimestampDisplay(new Date())
  }

  // Update LocalStorage history
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_HISTORY_KEY)
    const existing: ReleaseTaskHistoryRecord[] = raw ? JSON.parse(raw) : []
    const updated = deduplicateHistory([newRecord, ...existing]).slice(0, 300)
    localStorage.setItem(LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(updated))
  } catch { /* ignore */ }

  // Supabase persist
  try {
    const payload: any = {
      task_id: event.task_id,
      product_name: event.product_name,
      release_version: event.release_version,
      user_name: event.user_name || 'QA System',
      action: event.action,
      field: event.field || null,
      old_value: event.old_value || null,
      new_value: event.new_value || null,
      timestamp: new Date().toISOString()
    }
    if (event.user_id && isUUID(event.user_id)) {
      payload.user_id = event.user_id
    }
    supabase.from('release_task_history').insert(payload).then()
  } catch { /* ignore */ }
}

// ══════════════════════════════════════════════════════════════════════════════
// 6. CONFIGURABLE DROPDOWNS (Requirements 2, 3, 4, 12)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Synchronize registered active user profiles to populated assigned_to options
 */
export async function syncReleaseAssigneesFromProfiles(): Promise<ReleaseDropdownOption[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, avatar_url, status')
      .order('full_name', { ascending: true })

    if (!error && data && data.length > 0) {
      return data.map((p, idx) => {
        const name = p.full_name?.trim() || p.email?.split('@')[0] || 'Unknown User'
        return {
          id: p.id || `profile-${idx}`,
          category: 'assigned_to' as const,
          label: name,
          value: p.id || `profile-${idx}`,
          user_id: p.id,
          email: p.email,
          is_active: p.status !== 'suspended' && p.status !== 'inactive',
          sort_order: idx + 1
        }
      })
    }
  } catch (err) {
    console.warn('[releaseTrackerService] syncReleaseAssigneesFromProfiles error:', err)
  }
  return DEFAULT_ASSIGNED_TO_OPTIONS
}

export async function fetchReleaseDropdownConfigs(): Promise<{
  task_status: ReleaseDropdownOption[]
  priority: ReleaseDropdownOption[]
  assigned_to: ReleaseDropdownOption[]
}> {
  try {
    const { data, error } = await supabase
      .from('release_task_dropdown_configs')
      .select('*')
      .order('sort_order', { ascending: true })

    if (!error && data && data.length > 0) {
      const statuses = data.filter((d: any) => d.category === 'task_status')
      const priorities = data.filter((d: any) => d.category === 'priority')
      const assigned = data.filter((d: any) => d.category === 'assigned_to')

      const configs = {
        task_status: statuses.map((s: any) => ({
          id: s.id,
          category: 'task_status' as const,
          label: s.label,
          value: s.value,
          color: s.color,
          is_active: s.is_active,
          sort_order: s.sort_order
        })),
        priority: priorities.map((p: any) => ({
          id: p.id,
          category: 'priority' as const,
          label: p.label,
          value: p.value,
          color: p.color,
          is_active: p.is_active,
          sort_order: p.sort_order
        })),
        assigned_to: assigned.length > 0
          ? assigned.map((a: any) => ({
              id: a.id,
              category: 'assigned_to' as const,
              label: a.label,
              value: a.value,
              color: a.color,
              is_active: a.is_active,
              sort_order: a.sort_order
            }))
          : DEFAULT_ASSIGNED_TO_OPTIONS
      }

      try {
        localStorage.setItem(LOCAL_STORAGE_DROPDOWNS_KEY, JSON.stringify(configs))
      } catch { /* ignore */ }
      return configs
    }
  } catch (err) {
    console.warn('[releaseTrackerService] fetchReleaseDropdownConfigs error:', err)
  }

  // LocalStorage check or default fallback
  const cached = localStorage.getItem(LOCAL_STORAGE_DROPDOWNS_KEY)
  if (cached) {
    try {
      const parsed = JSON.parse(cached)
      if (parsed.task_status && parsed.priority) {
        return {
          task_status: parsed.task_status,
          priority: parsed.priority,
          assigned_to: parsed.assigned_to && parsed.assigned_to.length > 0 ? parsed.assigned_to : DEFAULT_ASSIGNED_TO_OPTIONS
        }
      }
    } catch { /* ignore */ }
  }

  // Seed default configs
  const defaultConfigs = {
    task_status: DEFAULT_TASK_STATUSES.map((s, idx) => ({
      id: `stat-${idx}`,
      category: 'task_status' as const,
      label: s.label,
      value: s.value,
      color: s.color,
      is_active: true,
      sort_order: idx + 1
    })),
    priority: DEFAULT_PRIORITIES.map((p, idx) => ({
      id: `prio-${idx}`,
      category: 'priority' as const,
      label: p.label,
      value: p.value,
      color: p.color,
      is_active: true,
      sort_order: idx + 1
    })),
    assigned_to: DEFAULT_ASSIGNED_TO_OPTIONS
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_DROPDOWNS_KEY, JSON.stringify(defaultConfigs))
  } catch { /* ignore */ }

  return defaultConfigs
}

export async function saveReleaseDropdownConfigs(
  configs: {
    task_status: ReleaseDropdownOption[]
    priority: ReleaseDropdownOption[]
    assigned_to: ReleaseDropdownOption[]
  },
  currentUser: { name: string; id?: string }
): Promise<void> {
  try {
    localStorage.setItem(LOCAL_STORAGE_DROPDOWNS_KEY, JSON.stringify(configs))
  } catch { /* ignore */ }

  logReleaseHistoryEvent({
    task_id: 'CONFIG',
    product_name: 'System',
    release_version: 'Global',
    user_name: currentUser.name,
    user_id: currentUser.id,
    action: 'Dropdown Configuration Change',
    field: 'Dropdown Master Options',
    old_value: 'Previous options',
    new_value: `Updated dropdown configuration (${configs.task_status.length} statuses, ${configs.priority.length} priorities, ${configs.assigned_to.length} assignees)`
  })

  try {
    const allOptions = [
      ...configs.task_status,
      ...configs.priority,
      ...configs.assigned_to
    ].map((opt, index) => ({
      category: opt.category,
      label: opt.label.trim(),
      value: opt.value.trim(),
      color: opt.color || null,
      is_active: opt.is_active,
      sort_order: opt.sort_order || index + 1
    }))

    for (const opt of allOptions) {
      await supabase
        .from('release_task_dropdown_configs')
        .upsert(opt, { onConflict: 'category,value' })
    }
  } catch (err) {
    console.warn('[releaseTrackerService] supabase dropdown save error:', err)
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 7. EXPORT (Excel / CSV) - Requirement 22
// ══════════════════════════════════════════════════════════════════════════════

export function exportReleaseTasksToExcel(tasks: ReleaseTask[], filename?: string): void {
  const rows = tasks.map((t, idx) => ({
    'Sl. No.': idx + 1,
    'Product': t.product_name,
    'Product Code': t.product_code || '—',
    'Release': t.release_version,
    'Release Task ID': t.task_id,
    'Task Description': t.description,
    'Priority': t.priority,
    'Start Date': t.start_date || '—',
    'Target Date': t.target_date || '—',
    'Finish Date': t.finish_date || '—',
    "Who's Testing": t.assigned_to_name,
    'Estimated Hrs': t.estimated_hours,
    'Estimation Status': t.estimated_hours_locked ? 'Locked' : 'Unlocked',
    'Actual Hrs': t.actual_hours,
    'Remaining Hrs': t.remaining_hours,
    'Overrun Hrs': t.overrun_hours,
    'Task Status': t.task_status,
    'Comments': t.comments || '—'
  }))

  const worksheet = XLSX.utils.json_to_sheet(rows)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Release Tasks')

  // Auto column widths
  const colWidths = [
    { wch: 8 },  // Sl. No.
    { wch: 25 }, // Product
    { wch: 14 }, // Product Code
    { wch: 16 }, // Release
    { wch: 16 }, // Task ID
    { wch: 45 }, // Description
    { wch: 12 }, // Priority
    { wch: 14 }, // Start Date
    { wch: 14 }, // Target Date
    { wch: 14 }, // Finish Date
    { wch: 20 }, // Who's Testing
    { wch: 15 }, // Estimated Hrs
    { wch: 16 }, // Estimation Status
    { wch: 14 }, // Actual Hrs
    { wch: 15 }, // Remaining Hrs
    { wch: 14 }, // Overrun Hrs
    { wch: 16 }, // Task Status
    { wch: 35 }  // Comments
  ]
  worksheet['!cols'] = colWidths

  const outName = filename || `Release_Tasks_Export_${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(workbook, outName)
}

export function exportReleaseTasksToCSV(tasks: ReleaseTask[], filename?: string): void {
  const headers = [
    'Sl. No.',
    'Product',
    'Product Code',
    'Release',
    'Release Task ID',
    'Task Description',
    'Priority',
    'Start Date',
    'Target Date',
    'Finish Date',
    "Who's Testing",
    'Estimated Hrs',
    'Estimation Status',
    'Actual Hrs',
    'Remaining Hrs',
    'Overrun Hrs',
    'Task Status',
    'Comments'
  ]

  const escapeCSV = (val: any) => {
    if (val === null || val === undefined) return '""'
    const str = String(val).replace(/"/g, '""')
    return `"${str}"`
  }

  const csvRows = [headers.join(',')]

  tasks.forEach((t, idx) => {
    const row = [
      escapeCSV(idx + 1),
      escapeCSV(t.product_name),
      escapeCSV(t.product_code || ''),
      escapeCSV(t.release_version),
      escapeCSV(t.task_id),
      escapeCSV(t.description),
      escapeCSV(t.priority),
      escapeCSV(t.start_date || ''),
      escapeCSV(t.target_date || ''),
      escapeCSV(t.finish_date || ''),
      escapeCSV(t.assigned_to_name),
      escapeCSV(t.estimated_hours),
      escapeCSV(t.estimated_hours_locked ? 'Locked' : 'Unlocked'),
      escapeCSV(t.actual_hours),
      escapeCSV(t.remaining_hours),
      escapeCSV(t.overrun_hours),
      escapeCSV(t.task_status),
      escapeCSV(t.comments || '')
    ]
    csvRows.push(row.join(','))
  })

  const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvRows.join('\n'))
  const link = document.createElement('a')
  link.setAttribute('href', csvContent)
  link.setAttribute('download', filename || `Release_Tasks_Export_${new Date().toISOString().split('T')[0]}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
