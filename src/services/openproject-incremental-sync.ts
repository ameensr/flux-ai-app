// src/services/openproject-incremental-sync.ts
// Incremental Activity Syncing with Cursor Management
// Fetches only new activities since last sync to reduce API load and improve performance.

import { supabase } from '@/lib/supabase'
import {
  fetchWorkPackageActivities,
  type OpenProjectConfig,
  type WorkPackageActivity,
} from './openproject'

export interface ActivitySyncCursor {
  projectId: string
  workPackageId: number
  lastActivityId: number
  lastActivitySyncedAt: string
  totalActivitiesFetched: number
  lastSyncAt: string
}

/**
 * Fetches the activity sync cursor for a work package.
 * Returns null if no cursor exists (first-time sync).
 */
export async function getActivitySyncCursor(
  projectId: string,
  workPackageId: number
): Promise<ActivitySyncCursor | null> {
  try {
    const { data, error } = await supabase
      .from('ticket_bowl_activity_sync_cursor')
      .select('*')
      .eq('project_id', projectId)
      .eq('work_package_id', workPackageId)
      .maybeSingle()

    if (error || !data) return null

    return {
      projectId: data.project_id,
      workPackageId: Number(data.work_package_id),
      lastActivityId: Number(data.last_activity_id),
      lastActivitySyncedAt: data.last_activity_synced_at,
      totalActivitiesFetched: data.total_activities_fetched || 0,
      lastSyncAt: data.last_sync_at,
    }
  } catch {
    return null
  }
}

/**
 * Updates or creates the activity sync cursor for a work package.
 */
export async function updateActivitySyncCursor(
  projectId: string,
  workPackageId: number,
  lastActivityId: number,
  lastActivitySyncedAt: string,
  totalActivitiesFetched: number
): Promise<void> {
  try {
    await supabase.from('ticket_bowl_activity_sync_cursor').upsert(
      {
        project_id: projectId,
        work_package_id: workPackageId,
        last_activity_id: lastActivityId,
        last_activity_synced_at: lastActivitySyncedAt,
        total_activities_fetched: totalActivitiesFetched,
        last_sync_at: new Date().toISOString(),
      },
      { onConflict: 'project_id,work_package_id' }
    )
  } catch (err) {
    console.error(`[Incremental Sync] Failed to update cursor for WP#${workPackageId}:`, err)
  }
}

/**
 * Fetches activities incrementally using cursor.
 * Returns only activities with ID > lastActivityId.
 * If no cursor exists, fetches all activities.
 */
export async function fetchActivitiesIncremental(
  config: OpenProjectConfig,
  projectId: string,
  workPackageId: number
): Promise<{
  activities: WorkPackageActivity[]
  newActivitiesCount: number
  lastActivityId: number | null
  lastActivitySyncedAt: string | null
}> {
  // Get existing cursor
  const cursor = await getActivitySyncCursor(projectId, workPackageId)

  // Fetch all activities
  const allActivities = await fetchWorkPackageActivities(config, workPackageId)

  if (allActivities.length === 0) {
    return {
      activities: [],
      newActivitiesCount: 0,
      lastActivityId: cursor?.lastActivityId || null,
      lastActivitySyncedAt: cursor?.lastActivitySyncedAt || null,
    }
  }

  // Filter to only new activities (ID > cursor)
  const newActivities = cursor
    ? allActivities.filter(a => a.id > cursor.lastActivityId)
    : allActivities

  // Find highest activity ID and timestamp
  const sortedByIdDesc = [...allActivities].sort((a, b) => b.id - a.id)
  const highestActivity = sortedByIdDesc[0]
  const lastActivityId = highestActivity?.id || null
  const lastActivitySyncedAt = highestActivity?.createdAt || null

  // Update cursor if we have new activities
  if (newActivities.length > 0 && lastActivityId && lastActivitySyncedAt) {
    const totalFetched = (cursor?.totalActivitiesFetched || 0) + newActivities.length
    await updateActivitySyncCursor(
      projectId,
      workPackageId,
      lastActivityId,
      lastActivitySyncedAt,
      totalFetched
    )
  }

  return {
    activities: newActivities,
    newActivitiesCount: newActivities.length,
    lastActivityId,
    lastActivitySyncedAt,
  }
}

/**
 * Determines if a work package needs activity re-inspection based on cursor and ticket state.
 */
export function shouldReinspectActivities(
  cursor: ActivitySyncCursor | null,
  ticketUpdatedAt: string | null,
  historyVerificationStatus: string,
  currentTestingStatus: string,
  exactForwardedTargetValue: string
): boolean {
  // Always inspect if no cursor exists (first-time)
  if (!cursor) return true

  // Retry if history is unavailable or unverified
  if (historyVerificationStatus === 'unavailable') return true
  if (historyVerificationStatus === 'unverified') return true

  // Re-inspect if currently in forwarded status but no verified events recorded
  if (
    currentTestingStatus === exactForwardedTargetValue &&
    historyVerificationStatus === 'no_matching_event'
  ) {
    return true
  }

  // Re-inspect if ticket was updated in OpenProject after last activity sync
  if (ticketUpdatedAt && cursor.lastSyncAt) {
    const ticketTime = new Date(ticketUpdatedAt).getTime()
    const cursorTime = new Date(cursor.lastSyncAt).getTime()
    if (ticketTime > cursorTime) return true
  }

  // Re-inspect if no matching event and last check was > 7 days ago
  if (historyVerificationStatus === 'no_matching_event' && cursor.lastSyncAt) {
    const daysSinceCheck = (Date.now() - new Date(cursor.lastSyncAt).getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceCheck > 7) return true
  }

  // Otherwise, skip inspection (already verified or confirmed no events)
  return false
}

/**
 * Resets the activity sync cursor for a work package.
 * Used when forcing a full re-sync of activities.
 */
export async function resetActivitySyncCursor(
  projectId: string,
  workPackageId: number
): Promise<void> {
  try {
    await supabase
      .from('ticket_bowl_activity_sync_cursor')
      .delete()
      .eq('project_id', projectId)
      .eq('work_package_id', workPackageId)

    console.log(`[Incremental Sync] Reset cursor for WP#${workPackageId}`)
  } catch (err) {
    console.error(`[Incremental Sync] Failed to reset cursor for WP#${workPackageId}:`, err)
  }
}

/**
 * Bulk resets activity sync cursors for all work packages in a project.
 * Used when forcing a complete re-sync.
 */
export async function resetAllActivitySyncCursors(projectId: string): Promise<number> {
  try {
    const { count, error } = await supabase
      .from('ticket_bowl_activity_sync_cursor')
      .delete({ count: 'exact' })
      .eq('project_id', projectId)

    if (error) {
      console.error('[Incremental Sync] Failed to reset all cursors:', error)
      return 0
    }

    console.log(`[Incremental Sync] Reset ${count || 0} activity cursors for project`)
    return count || 0
  } catch (err) {
    console.error('[Incremental Sync] Exception resetting cursors:', err)
    return 0
  }
}

/**
 * Gets statistics about activity sync cursors for a project.
 */
export async function getActivitySyncStats(
  projectId: string
): Promise<{
  totalCursors: number
  totalActivitiesFetched: number
  oldestCursor: string | null
  newestCursor: string | null
}> {
  try {
    const { data, count } = await supabase
      .from('ticket_bowl_activity_sync_cursor')
      .select('total_activities_fetched, last_sync_at', { count: 'exact' })
      .eq('project_id', projectId)
      .order('last_sync_at', { ascending: false })

    const totalActivities = (data || []).reduce((sum, row) => sum + (row.total_activities_fetched || 0), 0)
    const newest = data?.[0]?.last_sync_at || null
    const oldest = data?.[data.length - 1]?.last_sync_at || null

    return {
      totalCursors: count || 0,
      totalActivitiesFetched: totalActivities,
      oldestCursor: oldest,
      newestCursor: newest,
    }
  } catch {
    return {
      totalCursors: 0,
      totalActivitiesFetched: 0,
      oldestCursor: null,
      newestCursor: null,
    }
  }
}
