/**
 * ATOMIC SYNC ENHANCEMENT PATCH
 * 
 * This file documents the changes needed to implement atomic data commitment
 * in ticketbowl-service.ts for non-blocking background synchronization.
 * 
 * KEY CHANGES:
 * 1. Accept optional jobId parameter
 * 2. Add cancellation checks between phases
 * 3. Write to staging tables (_staging suffix) instead of production
 * 4. Call commit_sync_data() on success
 * 5. Call cleanup_staging_data() on failure/cancellation
 * 
 * IMPLEMENTATION GUIDE:
 * Apply these changes to src/services/ticketbowl-service.ts
 */

import { isSyncJobActive, commitSyncData, cleanupStagingData } from './syncJobService'

/**
 * CHANGE 1: Update function signature to accept optional jobId
 * 
 * BEFORE:
 * export async function syncTicketBowlData(
 *   config: OpenProjectConfig,
 *   projectId: string,
 *   opProjectId?: number | null,
 *   opProjectName?: string | null,
 *   onProgress?: (progress: TicketBowlSyncProgress) => void,
 *   options?: { useIncrementalActivities?: boolean; forceFullActivityResync?: boolean }
 * ): Promise<{ success: boolean; message: string; totalSynced: number; eventsFound: number }>
 * 
 * AFTER:
 * export async function syncTicketBowlData(
 *   config: OpenProjectConfig,
 *   projectId: string,
 *   opProjectId?: number | null,
 *   opProjectName?: string | null,
 *   onProgress?: (progress: TicketBowlSyncProgress) => void,
 *   options?: { 
 *     useIncrementalActivities?: boolean
 *     forceFullActivityResync?: boolean
 *     jobId?: string  // ADD THIS - enables atomic commits and cancellation
 *   }
 * ): Promise<{ success: boolean; message: string; totalSynced: number; eventsFound: number }>
 */

/**
 * CHANGE 2: Add cancellation check helper function at top of syncTicketBowlData
 * 
 * ADD THIS INSIDE THE FUNCTION:
 */
const checkCancellation = async (phase: string): Promise<void> => {
  if (!options?.jobId) return // No job tracking, skip check
  
  const isActive = await isSyncJobActive(options.jobId)
  if (!isActive) {
    console.log(`[Ticket Bowl] Sync cancelled during phase: ${phase}`)
    throw new Error(`SYNC_CANCELLED: Sync was cancelled during ${phase}`)
  }
}

/**
 * CHANGE 3: Add cancellation checks between major phases
 * 
 * ADD THESE CALLS:
 * - After Phase 1 (fetching work packages)
 * - After Phase 2 (saving snapshots)
 * - After Phase 3 (activity inspection)
 * - After Phase 4 (saving history)
 * 
 * Example placement:
 * 
 * // After fetching work packages
 * const wpResult = await fetchAllWorkPackages(...)
 * await checkCancellation('fetching-tickets') // ADD THIS
 * 
 * // After saving snapshots
 * for (let i = 0; i < initialSnapshots.length; i += UPSERT_CHUNK) { ... }
 * await checkCancellation('saving-snapshots') // ADD THIS
 * 
 * // After activity inspection
 * const batchResults = await Promise.all(batchPromises)
 * await checkCancellation('fetching-activities') // ADD THIS
 * 
 * // After saving history
 * if (statusHistoryRows.length > 0) { ... }
 * await checkCancellation('saving-history') // ADD THIS
 */

/**
 * CHANGE 4: Replace production table names with staging tables
 * 
 * FIND AND REPLACE (only in upsert/insert operations, NOT in SELECT queries for existing data):
 * 
 * Line ~496: Initial snapshot upsert
 * BEFORE:
 *   .from('ticket_bowl_work_packages')
 *   .upsert(chunk, { onConflict: 'project_id,work_package_id' })
 * 
 * AFTER:
 *   .from(options?.jobId ? 'ticket_bowl_work_packages_staging' : 'ticket_bowl_work_packages')
 *   .upsert(
 *     options?.jobId ? chunk.map(row => ({ ...row, job_id: options.jobId })) : chunk,
 *     { onConflict: options?.jobId ? 'job_id,project_id,work_package_id' : 'project_id,work_package_id' }
 *   )
 * 
 * Line ~707: Forwarding history upsert
 * BEFORE:
 *   .from('ticket_bowl_forwarding_history')
 *   .upsert(chunk, { onConflict: 'project_id,work_package_id,activity_id,changed_at', ignoreDuplicates: true })
 * 
 * AFTER:
 *   .from(options?.jobId ? 'ticket_bowl_forwarding_history_staging' : 'ticket_bowl_forwarding_history')
 *   .upsert(
 *     options?.jobId ? chunk.map(row => ({ ...row, job_id: options.jobId })) : chunk,
 *     { 
 *       onConflict: options?.jobId 
 *         ? 'job_id,project_id,work_package_id,activity_id,changed_at' 
 *         : 'project_id,work_package_id,activity_id,changed_at',
 *       ignoreDuplicates: true 
 *     }
 *   )
 * 
 * Line ~735: Testing status history upsert
 * BEFORE:
 *   .from('ticket_bowl_testing_status_history')
 *   .upsert(chunk, { onConflict: 'project_id,work_package_id,activity_id,changed_at', ignoreDuplicates: true })
 * 
 * AFTER:
 *   .from(options?.jobId ? 'ticket_bowl_testing_status_history_staging' : 'ticket_bowl_testing_status_history')
 *   .upsert(
 *     options?.jobId ? chunk.map(row => ({ ...row, job_id: options.jobId })) : chunk,
 *     { 
 *       onConflict: options?.jobId 
 *         ? 'job_id,project_id,work_package_id,activity_id,changed_at' 
 *         : 'project_id,work_package_id,activity_id,changed_at',
 *       ignoreDuplicates: true 
 *     }
 *   )
 * 
 * Line ~839: Final count updates
 * BEFORE:
 *   .from('ticket_bowl_work_packages')
 *   .upsert(chunk, { onConflict: 'project_id,work_package_id' })
 * 
 * AFTER:
 *   .from(options?.jobId ? 'ticket_bowl_work_packages_staging' : 'ticket_bowl_work_packages')
 *   .upsert(
 *     options?.jobId ? chunk.map(row => ({ ...row, job_id: options.jobId })) : chunk,
 *     { onConflict: options?.jobId ? 'job_id,project_id,work_package_id' : 'project_id,work_package_id' }
 *   )
 */

/**
 * CHANGE 5: Add atomic commit at the end of successful sync
 * 
 * FIND THIS (around line 870):
 *   // Update sync tracking
 *   await updateSyncStatusRecord(projectId, ...)
 *   emitSyncEvent('sync:success')
 *   return { success: true, message: '...', totalSynced: ..., eventsFound: ... }
 * 
 * ADD THIS BEFORE THE RETURN:
 */
// If using job tracking with staging tables, commit data atomically
if (options?.jobId) {
  console.log('[Ticket Bowl] Committing staged data to production tables...')
  try {
    const commitResult = await commitSyncData(options.jobId, projectId)
    console.log('[Ticket Bowl] Atomic commit successful:', commitResult)
  } catch (commitError) {
    console.error('[Ticket Bowl] Failed to commit staged data:', commitError)
    // Clean up staging data on commit failure
    await cleanupStagingData(options.jobId)
    throw new Error(`Sync completed but failed to commit data: ${commitError.message}`)
  }
}

/**
 * CHANGE 6: Add cleanup in error handlers
 * 
 * FIND THE CATCH BLOCK (around line 880):
 *   } catch (error) {
 *     const errorMsg = error instanceof Error ? error.message : String(error)
 *     console.error('[Ticket Bowl] Sync failed:', errorMsg, error)
 *     ...
 *     return { success: false, message: errorMsg, totalSynced: 0, eventsFound: 0 }
 *   }
 * 
 * ADD THIS AT THE START OF THE CATCH BLOCK:
 */
// Clean up staging data on error
if (options?.jobId) {
  try {
    await cleanupStagingData(options.jobId)
    console.log('[Ticket Bowl] Staging data cleaned up after error')
  } catch (cleanupError) {
    console.error('[Ticket Bowl] Failed to cleanup staging data:', cleanupError)
  }
}

// Check if cancellation was the cause
const isCancelled = errorMsg.includes('SYNC_CANCELLED')
if (isCancelled) {
  console.log('[Ticket Bowl] Sync was cancelled by user')
  emitSyncEvent('sync:cancelled')
  return { 
    success: false, 
    message: 'Synchronization was cancelled', 
    totalSynced: 0, 
    eventsFound: 0 
  }
}

/**
 * CHANGE 7: Update useBackgroundSync.ts to pass jobId
 * 
 * In src/hooks/useBackgroundSync.ts, find the syncTicketBowlData call:
 * 
 * BEFORE:
 *   const result = await syncTicketBowlData(
 *     syncConfig,
 *     projectId,
 *     opProjectId,
 *     opProjectName,
 *     handleProgress,
 *     { useIncrementalActivities: true }
 *   )
 * 
 * AFTER:
 *   const result = await syncTicketBowlData(
 *     syncConfig,
 *     projectId,
 *     opProjectId,
 *     opProjectName,
 *     handleProgress,
 *     { 
 *       useIncrementalActivities: true,
 *       jobId: activeJobId  // Pass the job ID for atomic commits
 *     }
 *   )
 */

export const ATOMIC_SYNC_IMPLEMENTATION_GUIDE = `
SUMMARY OF CHANGES:
===================
1. ✅ Add jobId to options parameter
2. ✅ Add checkCancellation() helper function
3. ✅ Insert cancellation checks between phases
4. ✅ Conditionally use staging tables when jobId is provided
5. ✅ Add job_id field to staging table inserts
6. ✅ Call commitSyncData() on successful completion
7. ✅ Call cleanupStagingData() on error/cancellation
8. ✅ Update useBackgroundSync to pass jobId

BENEFITS:
=========
- Data only appears after successful sync (atomic commit)
- Cancelled syncs don't affect user-visible data
- Failed syncs automatically clean up staging tables
- Backwards compatible (works without jobId for manual syncs)
- Process can be stopped mid-execution via cancellation checks
`

console.log(ATOMIC_SYNC_IMPLEMENTATION_GUIDE)
