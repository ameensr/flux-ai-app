// src/services/storypot-cache.ts
// StoryPot Cache Service - Syncs OpenProject data to Supabase for instant filtering

import { supabase } from '@/lib/supabase'
import {
  fetchAllWorkPackages,
  fetchTestingStatusChanges,
  formatWorkPackage,
  type OpenProjectConfig,
  type OpenProjectWorkPackage,
  type FormattedWorkPackage,
  type TestingStatusChange,
} from './openproject'

// Types for cached work packages
export interface CachedWorkPackage {
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

export interface SyncProgress {
  phase: 'fetching' | 'processing' | 'syncing-activities' | 'saving' | 'complete' | 'error'
  current: number
  total: number
  message: string
}

export interface SyncResult {
  success: boolean
  totalSynced: number
  withForwardingDate: number
  errors: string[]
  duration: number
}

export interface StoryPotQueryFilters {
  projectId: string
  opProjectId?: number | null
  forwardedFrom?: string | null
  forwardedTo?: string | null
  type?: string | null
  status?: string | null
  priority?: string | null
  releaseTag?: string | null
  testingStatus?: string | null
  isQAMissed?: string | null
  author?: string | null
  assignee?: string | null
  search?: string | null
  limit?: number
  offset?: number
  noLimit?: boolean  // when true, fetch all matching rows (ignores limit/offset)
}

export interface StoryPotQueryResult {
  items: CachedWorkPackage[]
  total: number
  hasMore: boolean
}

/**
 * Sync OpenProject work packages to Supabase cache
 * This fetches all work packages and their activity history, then stores them locally
 */
export async function syncWorkPackagesToCache(
  config: OpenProjectConfig,
  projectId: string,
  opProjectId?: number | null,
  opProjectName?: string | null,
  onProgress?: (progress: SyncProgress) => void
): Promise<SyncResult> {
  const startTime = Date.now()
  const errors: string[] = []
  
  try {
    // Phase 1: Fetch all work packages from OpenProject
    onProgress?.({
      phase: 'fetching',
      current: 0,
      total: 0,
      message: 'Fetching work packages from OpenProject...'
    })

    const configWithProject: OpenProjectConfig = {
      ...config,
      openproject_project_id: opProjectId?.toString() || undefined,
    }

    let fetchedCount = 0
    const wpResult = await fetchAllWorkPackages(configWithProject, {
      pageSize: 200,
      concurrency: 5,
      sortBy: '[[\"updatedAt\",\"desc\"]]',
      onProgress: (current, total) => {
        fetchedCount = current
        onProgress?.({
          phase: 'fetching',
          current,
          total,
          message: `Fetching work packages: ${current.toLocaleString()} / ${total.toLocaleString()}`
        })
      }
    })

    const workPackages = wpResult.items
    
    if (workPackages.length === 0) {
      return {
        success: true,
        totalSynced: 0,
        withForwardingDate: 0,
        errors: [],
        duration: Date.now() - startTime
      }
    }

    // Phase 2: Process and format work packages
    onProgress?.({
      phase: 'processing',
      current: 0,
      total: workPackages.length,
      message: 'Processing work packages...'
    })

    const formattedWPs: FormattedWorkPackage[] = workPackages.map((wp, idx) => {
      if (idx % 100 === 0) {
        onProgress?.({
          phase: 'processing',
          current: idx,
          total: workPackages.length,
          message: `Processing: ${idx} / ${workPackages.length}`
        })
      }
      return formatWorkPackage(wp)
    })

    // Phase 3: Fetch activity history for ALL work packages.
    // Must check every ticket — not just those currently showing a testing status —
    // because a ticket may have been forwarded and then had its testing status changed.
    onProgress?.({
      phase: 'syncing-activities',
      current: 0,
      total: formattedWPs.length,
      message: `Fetching activity history for ${formattedWPs.length} work packages...`
    })

    let activityMap = new Map<number, TestingStatusChange[]>()

    if (formattedWPs.length > 0) {
      try {
        const candidates = formattedWPs.map(wp => ({
          id: wp.id,
          createdAt: wp.createdAt,
          author: wp.author,
          updatedAt: wp.updatedAt
        }))

        activityMap = await fetchTestingStatusChanges(
          configWithProject,
          candidates,
          'Forwarded to the Testing Team',
          (current, found) => {
            onProgress?.({
              phase: 'syncing-activities',
              current,
              total: formattedWPs.length,
              message: `Fetching activity history: ${current} / ${formattedWPs.length} (${found} with forwarding dates)`
            })
          }
        )
      } catch (e) {
        console.warn('[StoryPot Cache] Failed to fetch activity history:', e)
        errors.push(`Activity history fetch failed: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }

    // Phase 4: Prepare data for Supabase upsert
    onProgress?.({
      phase: 'saving',
      current: 0,
      total: formattedWPs.length,
      message: 'Saving to cache...'
    })

    const cacheData = formattedWPs.map(wp => {
      const events = activityMap.get(wp.id) || []
      // events[] is sorted newest-first (from findAllTestingStatusChanges).
      // Store the LATEST (most recent) forwarding event — events[0] — so that
      // date-range filters match the last time the ticket was forwarded to QA.
      const latest = events.length > 0 ? events[0] : null

      const today = new Date().toISOString().split('T')[0]
      const isOverdue = wp.dueDate
        ? wp.dueDate < today &&
          !['closed', 'done', 'rejected'].some(s => wp.status.toLowerCase().includes(s)) &&
          (wp.percentageDone || 0) < 100
        : false

      // Preserve the exact isQAMissed value from formatWorkPackage:
      //   'N/A'     → Bug ticket (customField21 absent by design)
      //   'Yes'/'No'→ Support Issue with a value
      //   'Unknown' → Support Issue where the field was absent
      //   null      → should not occur after the fix, but guard anyway
      const isQAMissedValue = wp.isQAMissed ?? null

      return {
        id: wp.id,
        project_id: projectId,
        op_project_id: opProjectId || null,
        op_project_name: opProjectName || wp.project || null,
        subject: wp.subject,
        description: wp.description || null,
        type: wp.type,
        status: wp.status,
        priority: wp.priority,
        author: wp.author || null,
        assignee: wp.assignee || null,
        responsible: wp.responsible || null,
        release_tag: wp.release || null,
        testing_status: wp.testingStatus || null,
        is_qa_missed: isQAMissedValue,
        qa_confirmation: wp.qaConfirmation || null,
        // Store the LATEST forwarding event for date-range filtering.
        // When a ticket is forwarded multiple times, the most recent handoff is
        // what matters for "who last sent this to QA and when".
        // All events are preserved in openproject_forwarding_history.
        forwarded_to_testing_at: latest?.changedAt ?? null,
        forwarded_to_testing_by: latest?.changedBy ?? null,
        handoff_verified: events.length > 0,
        handoff_count: events.length,
        start_date: wp.startDate || null,
        due_date: wp.dueDate || null,
        created_at: wp.createdAt || null,
        updated_at: wp.updatedAt || null,
        percentage_done: wp.percentageDone || 0,
        estimated_time: wp.estimatedTime || null,
        spent_time: wp.spentTime || null,
        story_points: wp.storyPoints || null,
        is_overdue: isOverdue,
        version_name: wp.version || null,
        last_synced_at: new Date().toISOString(),
      }
    })
    
    // Batch upsert to Supabase (in chunks of 500)
    const BATCH_SIZE = 500
    let savedCount = 0

    for (let i = 0; i < cacheData.length; i += BATCH_SIZE) {
      const batch = cacheData.slice(i, i + BATCH_SIZE)

      const { error } = await supabase
        .from('openproject_work_packages_cache')
        .upsert(batch, { onConflict: 'id', ignoreDuplicates: false })

      if (error) {
        errors.push(`Batch ${Math.floor(i / BATCH_SIZE) + 1} failed: ${error.message}`)
      } else {
        savedCount += batch.length
      }

      onProgress?.({
        phase: 'saving',
        current: Math.min(i + BATCH_SIZE, cacheData.length),
        total: cacheData.length,
        message: `Saving to cache: ${Math.min(i + BATCH_SIZE, cacheData.length)} / ${cacheData.length}`
      })
    }

    // Persist ALL forwarding events to the history table.
    // UNIQUE(wp_id, changed_at) prevents duplicates on re-sync.
    const historyRows: {
      wp_id: number
      project_id: string
      op_project_id: number | null
      changed_at: string
      changed_by: string
      old_value: string | null
      new_value: string
    }[] = []

    activityMap.forEach((events, wpId) => {
      for (const ev of events) {
        historyRows.push({
          wp_id: wpId,
          project_id: projectId,
          op_project_id: opProjectId || null,
          changed_at: ev.changedAt,
          changed_by: ev.changedBy,
          old_value: ev.oldValue ?? null,
          new_value: ev.newValue,
        })
      }
    })

    if (historyRows.length > 0) {
      for (let i = 0; i < historyRows.length; i += BATCH_SIZE) {
        const batch = historyRows.slice(i, i + BATCH_SIZE)
        const { error } = await supabase
          .from('openproject_forwarding_history')
          .upsert(batch, { onConflict: 'wp_id,changed_at', ignoreDuplicates: true })
        if (error) {
          errors.push(`History batch failed: ${error.message}`)
        }
      }
    }

    const itemsWithForwardingDate = cacheData.filter(d => d.forwarded_to_testing_at).length
    const syncStatus = errors.length > 0 ? 'completed_with_errors' : 'completed'
    await updateSyncStatus(projectId, opProjectId || null, {
      last_full_sync_at: new Date().toISOString(),
      last_sync_status: syncStatus,
      last_sync_error: errors.length > 0 ? errors.join('; ') : null,
      total_work_packages: savedCount,
      work_packages_with_forwarding_date: itemsWithForwardingDate
    })

    const failedCount = cacheData.length - savedCount
    const completionMsg = [
      `Sync complete! ${savedCount.toLocaleString()} tickets synced`,
      `${itemsWithForwardingDate.toLocaleString()} with forwarding dates`,
      failedCount > 0 ? `${failedCount} failed` : null,
    ].filter(Boolean).join(' • ')

    onProgress?.({
      phase: 'complete',
      current: savedCount,
      total: cacheData.length,
      message: completionMsg
    })

    return {
      success: true,
      totalSynced: savedCount,
      withForwardingDate: itemsWithForwardingDate,
      errors,
      duration: Date.now() - startTime
    }

  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error'
    errors.push(errorMsg)
    
    onProgress?.({
      phase: 'error',
      current: 0,
      total: 0,
      message: `Sync failed: ${errorMsg}`
    })

    await updateSyncStatus(projectId, opProjectId || null, {
      last_sync_status: 'failed',
      last_sync_error: errorMsg
    })

    return {
      success: false,
      totalSynced: 0,
      withForwardingDate: 0,
      errors,
      duration: Date.now() - startTime
    }
  }
}

/**
 * Query cached work packages with filters (instant!)
 */
export async function queryCachedWorkPackages(
  filters: StoryPotQueryFilters
): Promise<StoryPotQueryResult> {
  const {
    projectId,
    opProjectId,
    forwardedFrom,
    forwardedTo,
    type,
    status,
    priority,
    releaseTag,
    testingStatus,
    isQAMissed,
    author,
    assignee,
    search,
    limit = 50,
    offset = 0,
    noLimit = false,
  } = filters

  // Build query
  let query = supabase
    .from('openproject_work_packages_cache')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)

  if (opProjectId) query = query.eq('op_project_id', opProjectId)

  // Date filter: forwarded_to_testing_at is stored in UTC.
  // new Date("YYYY-MM-DD") parses as UTC midnight, not local midnight.
  // Split manually so the Date is constructed in local time, then set
  // the boundary hours so the full local calendar day is covered.
  if (forwardedFrom) {
    const [y, m, d] = forwardedFrom.split('-').map(Number)
    const fromDate = new Date(y, m - 1, d, 0, 0, 0, 0)
    query = query.gte('forwarded_to_testing_at', fromDate.toISOString())
  }
  if (forwardedTo) {
    const [y, m, d] = forwardedTo.split('-').map(Number)
    const toDate = new Date(y, m - 1, d, 23, 59, 59, 999)
    query = query.lte('forwarded_to_testing_at', toDate.toISOString())
  }

  if (type) query = query.eq('type', type)
  if (releaseTag) query = query.eq('release_tag', releaseTag)
  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)
  if (testingStatus) query = query.ilike('testing_status', testingStatus)
  // isQAMissed: explicit filter only — no implicit default
  if (isQAMissed) query = query.ilike('is_qa_missed', isQAMissed)
  if (author) query = query.eq('author', author)
  if (assignee) query = query.eq('assignee', assignee)
  if (search) {
    query = query.or(`subject.ilike.%${search}%,id.eq.${parseInt(search) || 0}`)
  }

  // Ordering: Forwarded date ascending, then updated date
  query = query
    .order('forwarded_to_testing_at', { ascending: true, nullsFirst: false })
    .order('updated_at', { ascending: false })

  // Pagination — when noLimit, use a large explicit range to bypass Supabase's
  // default 1000-row hard cap. Without this, filtered results >1000 are silently truncated.
  if (noLimit) {
    query = query.range(0, 99999)
  } else {
    query = query.range(offset, offset + limit - 1)
  }

  const { data, error, count } = await query

  if (error) {
    console.error('[StoryPot Cache] Query error:', error)
    throw new Error(`Failed to query cache: ${error.message}`)
  }

  // Debug: Log result count
  console.log(`[StoryPot Query] Found ${count} items (showing ${data?.length || 0})`)

  return {
    items: (data || []) as CachedWorkPackage[],
    total: count || 0,
    hasMore: noLimit ? false : (count || 0) > offset + limit
  }
}

/**
 * Get aggregated stats from cache (global, unfiltered — used for total counts)
 */
export async function getCachedStats(
  projectId: string,
  opProjectId?: number | null
): Promise<{
  total: number
  withForwardingDate: number
  overdue: number
  unassigned: number
  byStatus: Record<string, number>
  byType: Record<string, number>
  byPriority: Record<string, number>
  byTestingStatus: Record<string, number>
  qaMissedYes: number
  qaMissedNo: number
  qaMissedNa: number
  qaMissedUnknown: number
}> {
  let query = supabase
    .from('openproject_work_packages_cache')
    .select('status, type, priority, testing_status, is_overdue, assignee, forwarded_to_testing_at, is_qa_missed')
    .eq('project_id', projectId)

  if (opProjectId) query = query.eq('op_project_id', opProjectId)

  const { data, error } = await query
  if (error) throw new Error(`Failed to get stats: ${error.message}`)

  const items = data || []
  const byStatus: Record<string, number> = {}
  const byType: Record<string, number> = {}
  const byPriority: Record<string, number> = {}
  const byTestingStatus: Record<string, number> = {}
  let overdue = 0, unassigned = 0, withForwardingDate = 0
  let qaMissedYes = 0, qaMissedNo = 0, qaMissedNa = 0, qaMissedUnknown = 0

  items.forEach(item => {
    if (item.status) byStatus[item.status] = (byStatus[item.status] || 0) + 1
    if (item.type) byType[item.type] = (byType[item.type] || 0) + 1
    if (item.priority) byPriority[item.priority] = (byPriority[item.priority] || 0) + 1
    if (item.testing_status) byTestingStatus[item.testing_status] = (byTestingStatus[item.testing_status] || 0) + 1
    if (item.is_overdue) overdue++
    if (!item.assignee || item.assignee === 'Unassigned') unassigned++
    if (item.forwarded_to_testing_at) withForwardingDate++
    const qm = (item as Record<string, unknown>).is_qa_missed as string | null
    const qmLower = qm?.toLowerCase() ?? ''
    if (qmLower === 'yes') qaMissedYes++
    else if (qmLower === 'no') qaMissedNo++
    else if (qmLower === 'n/a') qaMissedNa++
    else qaMissedUnknown++
  })

  return { total: items.length, withForwardingDate, overdue, unassigned, byStatus, byType, byPriority, byTestingStatus, qaMissedYes, qaMissedNo, qaMissedNa, qaMissedUnknown }
}

/**
 * Get QA Missed counts for the currently filtered result set.
 */
export async function getFilteredQaMissedCounts(
  filters: Omit<StoryPotQueryFilters, 'limit' | 'offset' | 'noLimit'>
): Promise<{ yes: number; no: number; na: number; unknown: number; total: number }> {
  let query = supabase
    .from('openproject_work_packages_cache')
    .select('is_qa_missed')
    .eq('project_id', filters.projectId)

  if (filters.opProjectId) query = query.eq('op_project_id', filters.opProjectId)
  if (filters.forwardedFrom) {
    const [y, m, d] = filters.forwardedFrom.split('-').map(Number)
    const fromDate = new Date(y, m - 1, d, 0, 0, 0, 0)
    query = query.gte('forwarded_to_testing_at', fromDate.toISOString())
  }
  if (filters.forwardedTo) {
    const [y, m, d] = filters.forwardedTo.split('-').map(Number)
    const toDate = new Date(y, m - 1, d, 23, 59, 59, 999)
    query = query.lte('forwarded_to_testing_at', toDate.toISOString())
  }
  if (filters.type) query = query.eq('type', filters.type)
  if (filters.releaseTag) query = query.eq('release_tag', filters.releaseTag)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.testingStatus) query = query.ilike('testing_status', filters.testingStatus)
  if (filters.isQAMissed) query = query.ilike('is_qa_missed', filters.isQAMissed)
  if (filters.author) query = query.eq('author', filters.author)
  if (filters.assignee) query = query.eq('assignee', filters.assignee)
  if (filters.search) {
    query = query.or(`subject.ilike.%${filters.search}%,id.eq.${parseInt(filters.search) || 0}`)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to get filtered QA missed counts: ${error.message}`)

  let yes = 0, no = 0, na = 0, unknown = 0
  for (const item of data || []) {
    const qm = (item as Record<string, unknown>).is_qa_missed as string | null
    const qmLower = qm?.toLowerCase() ?? ''
    if (qmLower === 'yes') yes++
    else if (qmLower === 'no') no++
    else if (qmLower === 'n/a') na++
    else unknown++
  }
  return { yes, no, na, unknown, total: yes + no + na + unknown }
}

/**
 * Get sync status for a project
 */
/**
 * Get testing_status counts for the currently filtered result set.
 * Applies the same filters as queryCachedWorkPackages but fetches all rows (no pagination).
 */
export async function getFilteredTestingStatusCounts(
  filters: Omit<StoryPotQueryFilters, 'limit' | 'offset' | 'noLimit'>
): Promise<Record<string, number>> {
  let query = supabase
    .from('openproject_work_packages_cache')
    .select('testing_status')
    .eq('project_id', filters.projectId)

  if (filters.opProjectId) query = query.eq('op_project_id', filters.opProjectId)
  if (filters.forwardedFrom) {
    const [y, m, d] = filters.forwardedFrom.split('-').map(Number)
    const fromDate = new Date(y, m - 1, d, 0, 0, 0, 0)
    query = query.gte('forwarded_to_testing_at', fromDate.toISOString())
  }
  if (filters.forwardedTo) {
    const [y, m, d] = filters.forwardedTo.split('-').map(Number)
    const toDate = new Date(y, m - 1, d, 23, 59, 59, 999)
    query = query.lte('forwarded_to_testing_at', toDate.toISOString())
  }
  if (filters.type) query = query.eq('type', filters.type)
  if (filters.releaseTag) query = query.eq('release_tag', filters.releaseTag)
  if (filters.status) query = query.eq('status', filters.status)
  if (filters.priority) query = query.eq('priority', filters.priority)
  if (filters.testingStatus) query = query.ilike('testing_status', filters.testingStatus)
  if (filters.isQAMissed) query = query.ilike('is_qa_missed', filters.isQAMissed)
  if (filters.author) query = query.eq('author', filters.author)
  if (filters.assignee) query = query.eq('assignee', filters.assignee)
  if (filters.search) {
    query = query.or(`subject.ilike.%${filters.search}%,id.eq.${parseInt(filters.search) || 0}`)
  }

  const { data, error } = await query
  if (error) throw new Error(`Failed to get filtered testing status counts: ${error.message}`)

  const counts: Record<string, number> = {}
  for (const item of data || []) {
    if (item.testing_status) {
      counts[item.testing_status] = (counts[item.testing_status] || 0) + 1
    }
  }
  return counts
}

export async function getSyncStatus(
  projectId: string,
  opProjectId?: number | null
): Promise<{
  lastSyncAt: string | null
  status: string
  totalWorkPackages: number
  withForwardingDate: number
  error: string | null
} | null> {
  let query = supabase
    .from('openproject_sync_status')
    .select('*')
    .eq('project_id', projectId)

  if (opProjectId) {
    query = query.eq('op_project_id', opProjectId)
  } else {
    query = query.is('op_project_id', null)
  }

  // Use maybeSingle + manual sort instead of .single() so duplicate rows
  // (from the old broken upsert) don't throw PGRST116 and return null.
  const { data: rows, error } = await query.order('updated_at', { ascending: false })

  if (error || !rows || rows.length === 0) {
    return null
  }

  // Pick the most recently updated row (first after DESC sort)
  const data = rows[0]

  return {
    lastSyncAt: data.last_full_sync_at || data.last_incremental_sync_at,
    status: data.last_sync_status,
    totalWorkPackages: data.total_work_packages,
    withForwardingDate: data.work_packages_with_forwarding_date,
    error: data.last_sync_error
  }
}

/**
 * Update sync status
 */
async function updateSyncStatus(
  projectId: string,
  opProjectId: number | null,
  updates: {
    last_full_sync_at?: string
    last_incremental_sync_at?: string
    last_sync_status?: string
    last_sync_error?: string | null
    total_work_packages?: number
    work_packages_with_forwarding_date?: number
  }
): Promise<void> {
  // Postgres NULL != NULL in UNIQUE constraints, so upsert with onConflict never
  // matches when op_project_id is NULL — it inserts a new row every time.
  // Fix: explicitly find the existing row and UPDATE by PK, or INSERT if missing.
  let existingQuery = supabase
    .from('openproject_sync_status')
    .select('id')
    .eq('project_id', projectId)

  if (opProjectId !== null && opProjectId !== undefined) {
    existingQuery = existingQuery.eq('op_project_id', opProjectId)
  } else {
    existingQuery = existingQuery.is('op_project_id', null)
  }

  const { data: existing } = await existingQuery.maybeSingle()

  if (existing?.id) {
    const { error } = await supabase
      .from('openproject_sync_status')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
    if (error) console.error('[StoryPot Cache] Failed to update sync status:', error)
  } else {
    const { error } = await supabase
      .from('openproject_sync_status')
      .insert({
        project_id: projectId,
        op_project_id: opProjectId,
        ...updates,
        updated_at: new Date().toISOString(),
      })
    if (error) console.error('[StoryPot Cache] Failed to insert sync status:', error)
  }
}

/**
 * Get distinct filter options from cache
 */
export async function getCachedFilterOptions(
  projectId: string,
  opProjectId?: number | null
): Promise<{
  types: string[]
  statuses: string[]
  priorities: string[]
  releases: string[]
  testingStatuses: string[]
  authors: string[]
  assignees: string[]
}> {
  let query = supabase
    .from('openproject_work_packages_cache')
    .select('type, status, priority, release_tag, testing_status, author, assignee')
    .eq('project_id', projectId)

  if (opProjectId) {
    query = query.eq('op_project_id', opProjectId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[StoryPot Cache] Filter options query error:', error)
    return {
      types: [],
      statuses: [],
      priorities: [],
      releases: [],
      testingStatuses: [],
      authors: [],
      assignees: []
    }
  }

  const items = data || []
  
  const types = new Set<string>()
  const statuses = new Set<string>()
  const priorities = new Set<string>()
  const releases = new Set<string>()
  const testingStatuses = new Set<string>()
  const authors = new Set<string>()
  const assignees = new Set<string>()

  items.forEach(item => {
    if (item.type) types.add(item.type)
    if (item.status) statuses.add(item.status)
    if (item.priority) priorities.add(item.priority)
    if (item.release_tag) releases.add(item.release_tag)
    if (item.testing_status) testingStatuses.add(item.testing_status)
    if (item.author && item.author !== 'Unassigned') authors.add(item.author)
    if (item.assignee && item.assignee !== 'Unassigned') assignees.add(item.assignee)
  })

  return {
    types: Array.from(types).sort(),
    statuses: Array.from(statuses).sort(),
    priorities: Array.from(priorities).sort(),
    releases: Array.from(releases).sort(),
    testingStatuses: Array.from(testingStatuses).sort(),
    authors: Array.from(authors).sort(),
    assignees: Array.from(assignees).sort()
  }
}

/**
 * Delete cached data for a project
 */
export async function clearCache(
  projectId: string,
  opProjectId?: number | null
): Promise<void> {
  let query = supabase
    .from('openproject_work_packages_cache')
    .delete()
    .eq('project_id', projectId)

  if (opProjectId) {
    query = query.eq('op_project_id', opProjectId)
  }

  const { error } = await query

  if (error) {
    console.error('[StoryPot Cache] Failed to clear cache:', error)
    throw new Error(`Failed to clear cache: ${error.message}`)
  }
}

/**
 * Check if cache exists and is fresh
 */
export async function isCacheFresh(
  projectId: string,
  opProjectId?: number | null,
  maxAgeMinutes: number = 30
): Promise<boolean> {
  const status = await getSyncStatus(projectId, opProjectId)
  
  if (!status || !status.lastSyncAt) {
    return false
  }

  const lastSync = new Date(status.lastSyncAt)
  const now = new Date()
  const ageMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60)

  return ageMinutes < maxAgeMinutes
}
