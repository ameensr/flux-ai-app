// src/services/storypot-cache.ts
// StoryPot Cache Service - Syncs OpenProject data to Supabase for instant filtering

import { supabase } from '@/lib/supabase'
import {
  fetchAllWorkPackages,
  fetchTestingStatusChanges,
  formatWorkPackage,
  type OpenProjectConfig,
  type OpenProjectWorkPackage,
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
  author?: string | null
  assignee?: string | null
  search?: string | null
  limit?: number
  offset?: number
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

    const formattedWPs = workPackages.map((wp, idx) => {
      if (idx % 100 === 0) {
        onProgress?.({
          phase: 'processing',
          current: idx,
          total: workPackages.length,
          message: `Processing: ${idx} / ${workPackages.length}`
        })
      }
      const formatted = formatWorkPackage(wp)
      
      // Debug: Log first 10 items to find one with "Forward" in any custom field
      if (idx < 10) {
        const customFieldsWithValues: Record<string, string> = {}
        Object.entries(wp._links || {}).forEach(([key, value]) => {
          if (key.startsWith('customField') || key.startsWith('cf_')) {
            const link = value as { title?: string; href?: string }
            if (link?.title) {
              customFieldsWithValues[key] = link.title
            }
          }
        })
        // Check if any value contains "forward"
        const hasForward = Object.values(customFieldsWithValues).some(v => 
          v.toLowerCase().includes('forward')
        )
        if (hasForward || idx === 0) {
          console.log(`[StoryPot Sync] WP #${formatted.id} Custom Fields:`, customFieldsWithValues)
        }
      }
      
      return formatted
    })
    
    // Log summary of all unique custom field values found
    const allTestingStatuses = new Set<string>()
    formattedWPs.forEach(wp => {
      if (wp.testingStatus) allTestingStatuses.add(wp.testingStatus)
    })
    console.log('[StoryPot Sync] All unique testingStatus values found:', Array.from(allTestingStatuses))
    
    // Also collect all unique values from each custom field to identify Testing Status field
    const customFieldValues: Record<string, Set<string>> = {}
    workPackages.slice(0, 50).forEach(wp => {
      Object.entries(wp._links || {}).forEach(([key, value]) => {
        if (key.startsWith('customField')) {
          const link = value as { title?: string }
          if (link?.title) {
            if (!customFieldValues[key]) customFieldValues[key] = new Set()
            customFieldValues[key].add(link.title)
          }
        }
      })
    })
    console.log('[StoryPot Sync] Custom field unique values (first 50 WPs):')
    Object.entries(customFieldValues).forEach(([field, values]) => {
      console.log(`  ${field}:`, Array.from(values).slice(0, 10))
    })

    // Phase 3: For items WITH a testing status, use updatedAt as forwarding date
    // (since this project doesn't have "Forwarded to Testing Team" status)
    const itemsWithTestingStatus = formattedWPs.filter(wp => wp.testingStatus)
    
    console.log(`[StoryPot Sync] Items with testingStatus: ${itemsWithTestingStatus.length} / ${formattedWPs.length}`)

    onProgress?.({
      phase: 'syncing-activities',
      current: 0,
      total: itemsWithTestingStatus.length,
      message: `Processing ${itemsWithTestingStatus.length} items with testing status...`
    })

    // For items with testing status, we'll use updatedAt as the forwarding date
    // Activity history fetch is optional - only for items with "forward" in status
    const forwardedCandidates = formattedWPs.filter(wp =>
      wp.testingStatus && wp.testingStatus.toLowerCase().includes('forward')
    )

    onProgress?.({
      phase: 'syncing-activities',
      current: 0,
      total: forwardedCandidates.length,
      message: `Fetching activity history for ${forwardedCandidates.length} forwarded items...`
    })

    let activityMap = new Map<number, { changedAt: string; changedBy: string }>()
    
    if (forwardedCandidates.length > 0) {
      try {
        const candidatesWithFallback = forwardedCandidates.map(wp => ({
          id: wp.id,
          createdAt: wp.createdAt,
          author: wp.author,
          updatedAt: wp.updatedAt
        }))

        activityMap = await fetchTestingStatusChanges(
          configWithProject,
          candidatesWithFallback,
          'Forwarded to the Testing Team',
          (current, found) => {
            onProgress?.({
              phase: 'syncing-activities',
              current,
              total: forwardedCandidates.length,
              message: `Fetching activity history: ${current} / ${forwardedCandidates.length} (${found} with dates)`
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
      const activity = activityMap.get(wp.id)
      
      // Compute is_overdue
      const today = new Date().toISOString().split('T')[0]
      const isOverdue = wp.dueDate 
        ? wp.dueDate < today && 
          !['closed', 'done', 'rejected'].some(s => wp.status.toLowerCase().includes(s)) &&
          (wp.percentageDone || 0) < 100
        : false
      
      // Determine forwarding date and user:
      // ONLY use activity data from the journal where Testing Status was set to
      // "Forwarded to the Testing Team". NO FALLBACKS.
      // - If activity exists: use the journal entry's date and user
      // - If no activity: forwarded_to_testing_at and forwarded_to_testing_by remain null
      //   (ticket will be excluded from "Received for Testing Date" filter)
      let forwardedAt: string | null = null
      let forwardedBy: string | null = null
      
      if (activity?.changedAt) {
        forwardedAt = activity.changedAt
        forwardedBy = activity.changedBy
      }
      // NO FALLBACK: Do not use updatedAt, createdAt, or author as fallback
      // If Testing Status was never set to "Forwarded to the Testing Team" in the journal,
      // the ticket should not have forwarding info and should be excluded from date filter
      
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
        is_qa_missed: wp.isQAMissed || null,
        qa_confirmation: wp.qaConfirmation || null,
        forwarded_to_testing_at: forwardedAt,
        forwarded_to_testing_by: forwardedBy,
        handoff_verified: !!activity,
        handoff_count: activity ? 1 : 0,
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
    
    // Debug: Show sample of forwarding dates
    const withDates = cacheData.filter(d => d.forwarded_to_testing_at)
    console.log(`[StoryPot Sync] Items with forwarding dates: ${withDates.length}`)
    if (withDates.length > 0) {
      console.log('[StoryPot Sync] Sample forwarding dates:')
      withDates.slice(0, 5).forEach(d => {
        console.log(`  WP #${d.id}: testing_status="${d.testing_status}", forwarded_at="${d.forwarded_to_testing_at}"`)
      })
    }

    // Batch upsert to Supabase (in chunks of 500)
    const BATCH_SIZE = 500
    let savedCount = 0
    
    for (let i = 0; i < cacheData.length; i += BATCH_SIZE) {
      const batch = cacheData.slice(i, i + BATCH_SIZE)
      
      const { error } = await supabase
        .from('openproject_work_packages_cache')
        .upsert(batch, { 
          onConflict: 'id',
          ignoreDuplicates: false 
        })

      if (error) {
        console.error('[StoryPot Cache] Upsert error:', error)
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

    // Update sync status
    const itemsWithForwardingDate = cacheData.filter(d => d.forwarded_to_testing_at).length
    await updateSyncStatus(projectId, opProjectId || null, {
      last_full_sync_at: new Date().toISOString(),
      last_sync_status: errors.length > 0 ? 'completed_with_errors' : 'completed',
      last_sync_error: errors.length > 0 ? errors.join('; ') : null,
      total_work_packages: savedCount,
      work_packages_with_forwarding_date: itemsWithForwardingDate
    })

    onProgress?.({
      phase: 'complete',
      current: savedCount,
      total: savedCount,
      message: `Sync complete! ${savedCount} work packages cached, ${itemsWithForwardingDate} with testing dates.`
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
    author,
    assignee,
    search,
    limit = 50,
    offset = 0
  } = filters

  // Debug: Log active filters
  const activeFilters = Object.entries(filters).filter(([k, v]) => v && k !== 'projectId' && k !== 'limit' && k !== 'offset')
  if (activeFilters.length > 0) {
    console.log('[StoryPot Query] Active filters:', Object.fromEntries(activeFilters))
  }

  // Build query
  let query = supabase
    .from('openproject_work_packages_cache')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)

  // Apply filters
  if (opProjectId) {
    query = query.eq('op_project_id', opProjectId)
  }

  // PRIME FEATURE: Filter by forwarded to testing date
  // Only show items where Testing Status was set to "Forwarded to the Testing Team"
  // in the journal, within the specified date range.
  // Items without a verified forwarding date are excluded.
  if (forwardedFrom) {
    query = query.gte('forwarded_to_testing_at', forwardedFrom + 'T00:00:00.000Z')
  }
  if (forwardedTo) {
    query = query.lte('forwarded_to_testing_at', forwardedTo + 'T23:59:59.999Z')
  }

  // Type filter
  if (type) {
    query = query.eq('type', type)
  }

  // Release filter (typically used with Bug type)
  if (releaseTag) {
    query = query.eq('release_tag', releaseTag)
  }

  // Status filter
  if (status) {
    query = query.eq('status', status)
  }

  // Priority filter
  if (priority) {
    query = query.eq('priority', priority)
  }

  // Testing status filter (exact match from dropdown)
  if (testingStatus) {
    query = query.eq('testing_status', testingStatus)
  }

  // Author filter (exact match from dropdown)
  if (author) {
    query = query.eq('author', author)
  }

  // Assignee filter (exact match from dropdown)
  if (assignee) {
    query = query.eq('assignee', assignee)
  }

  // Search filter (subject or ID)
  if (search) {
    query = query.or(`subject.ilike.%${search}%,id.eq.${parseInt(search) || 0}`)
  }

  // Ordering: Forwarded date first (most recent), then updated date
  query = query
    .order('forwarded_to_testing_at', { ascending: false, nullsFirst: false })
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1)

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
    hasMore: (count || 0) > offset + limit
  }
}

/**
 * Get aggregated stats from cache
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
}> {
  let query = supabase
    .from('openproject_work_packages_cache')
    .select('status, type, priority, testing_status, is_overdue, assignee, forwarded_to_testing_at')
    .eq('project_id', projectId)

  if (opProjectId) {
    query = query.eq('op_project_id', opProjectId)
  }

  const { data, error } = await query

  if (error) {
    console.error('[StoryPot Cache] Stats query error:', error)
    throw new Error(`Failed to get stats: ${error.message}`)
  }

  const items = data || []
  
  const byStatus: Record<string, number> = {}
  const byType: Record<string, number> = {}
  const byPriority: Record<string, number> = {}
  const byTestingStatus: Record<string, number> = {}
  
  let overdue = 0
  let unassigned = 0
  let withForwardingDate = 0

  items.forEach(item => {
    // Count by status
    if (item.status) {
      byStatus[item.status] = (byStatus[item.status] || 0) + 1
    }
    // Count by type
    if (item.type) {
      byType[item.type] = (byType[item.type] || 0) + 1
    }
    // Count by priority
    if (item.priority) {
      byPriority[item.priority] = (byPriority[item.priority] || 0) + 1
    }
    // Count by testing status
    if (item.testing_status) {
      byTestingStatus[item.testing_status] = (byTestingStatus[item.testing_status] || 0) + 1
    }
    // Count overdue
    if (item.is_overdue) {
      overdue++
    }
    // Count unassigned
    if (!item.assignee || item.assignee === 'Unassigned') {
      unassigned++
    }
    // Count with forwarding date
    if (item.forwarded_to_testing_at) {
      withForwardingDate++
    }
  })

  return {
    total: items.length,
    withForwardingDate,
    overdue,
    unassigned,
    byStatus,
    byType,
    byPriority,
    byTestingStatus
  }
}

/**
 * Get sync status for a project
 */
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

  const { data, error } = await query.single()

  if (error || !data) {
    return null
  }

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
  const { error } = await supabase
    .from('openproject_sync_status')
    .upsert({
      project_id: projectId,
      op_project_id: opProjectId,
      ...updates,
      updated_at: new Date().toISOString()
    }, {
      onConflict: 'project_id,op_project_id'
    })

  if (error) {
    console.error('[StoryPot Cache] Failed to update sync status:', error)
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
