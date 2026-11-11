// src/services/ticketbowl-service.ts
// Core business engine and database integration service for Ticket Bowl

import { supabase } from '@/lib/supabase'
import { emitSyncEvent } from '@/lib/syncReminderEvents'
import {
  fetchAllWorkPackages,
  fetchWorkPackageActivities,
  formatWorkPackage,
  resolveAllCustomFieldIds,
  type OpenProjectConfig,
  type OpenProjectWorkPackage,
  type FormattedWorkPackage,
  type WorkPackageActivity,
} from './openproject'
import {
  getActivitySyncCursor,
  fetchActivitiesIncremental,
  shouldReinspectActivities,
} from './openproject-incremental-sync'
import {
  isSyncJobActive,
  commitSyncData,
  cleanupStagingData,
} from './syncJobService'
import type {
  TicketBowlWorkPackage,
  TicketBowlForwardingEvent,
  TicketBowlSyncStatus,
  TicketBowlFilters,
  TicketBowlDashboardStats,
  TicketBowlSyncProgress,
  TicketBowlQueryResult,
  ForwardingHistoryVerification,
  QuickSearchResult,
  QuickSearchProgress,
} from '@/modules/TicketBowl/types'

// STRICT BUSINESS RULE: Exact target value required for QA handoff
export const EXACT_FORWARDED_TARGET_VALUE = 'Forwarded to the Testing Team'

/**
 * Normalizes and extracts the exact display string from an OpenProject custom field value.
 */
export function extractCustomFieldValue(val: unknown): string {
  if (val === null || val === undefined) return ''
  if (typeof val === 'string') {
    return val.replace(/<[^>]*>/g, '').replace(/\.+$/, '').trim()
  }
  if (typeof val === 'number') return String(val)
  if (Array.isArray(val)) {
    return val.map(v => extractCustomFieldValue(v)).filter(Boolean).join(', ')
  }
  if (typeof val === 'object') {
    const obj = val as Record<string, unknown>
    if (typeof obj.title === 'string') return extractCustomFieldValue(obj.title)
    if (typeof obj.name === 'string') return extractCustomFieldValue(obj.name)
    if (typeof obj.value === 'string') return extractCustomFieldValue(obj.value)
    if (typeof obj.raw === 'string') return extractCustomFieldValue(obj.raw)
  }
  return String(val).replace(/<[^>]*>/g, '').replace(/\.+$/, '').trim()
}

export interface VerifiedTransition {
  workPackageId: number
  activityId: number | null
  previousTestingStatus: string | null
  newTestingStatus: string
  changedAt: string
  changedById: number | null
  changedByName: string
  verificationStatus: 'verified' | 'unverified'
  isForwardingEvent: boolean
}

export interface ActivityInspectionResult {
  // All Testing Status (customField14) changes — complete history
  allTestingStatusChanges: VerifiedTransition[]
  // Subset: only transitions to exact target value
  transitions: VerifiedTransition[]
  historyStatus: ForwardingHistoryVerification
  error?: string
}

/**
 * Inspects work package activity history to capture:
 * 1. ALL Testing Status (customField14) changes — complete history.
 * 2. Forwarding events — transitions where newValue === EXACT target (case-sensitive).
 *
 * NON-NEGOTIABLE RULES:
 * - Exact case-sensitive match for forwarding detection.
 * - Never match the standard work package Status field.
 * - Actor extracted from the SAME journal entry only.
 * - All Testing Status changes preserved, not just forwarding events.
 */
export function inspectWorkPackageActivities(
  workPackageId: number,
  activities: WorkPackageActivity[] | null,
  fetchError?: string | null
): ActivityInspectionResult {
  if (fetchError || activities === null) {
    return {
      allTestingStatusChanges: [],
      transitions: [],
      historyStatus: 'unavailable',
      error: fetchError || 'Historical activity journal inaccessible or missing',
    }
  }

  if (!Array.isArray(activities) || activities.length === 0) {
    return {
      allTestingStatusChanges: [],
      transitions: [],
      historyStatus: 'no_matching_event',
    }
  }

  const allChanges: VerifiedTransition[] = []
  const forwardingTransitions: VerifiedTransition[] = []

  for (const activity of activities) {
    const rawDetails = activity.details || (activity as any)._embedded?.details || []
    if (!Array.isArray(rawDetails)) continue

    for (const detail of rawDetails) {
      const anyDetail = detail as any
      const prop = (
        detail.propertyName ||
        detail.property ||
        anyDetail._links?.property?.title ||
        anyDetail._links?.property?.href ||
        anyDetail._links?.schema?.title ||
        ''
      ).trim().toLowerCase()

      // Hard-exclude the standard work package Status field
      if (prop === 'status') continue

      const rawText = (detail.raw || anyDetail.html || '').trim()
      const cleanRaw = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

      // Identify Testing Status field (customField14)
      const isTestingStatusField =
        prop === 'testing status' ||
        prop === 'customfield14' ||
        prop === 'cf_14' ||
        prop === 'cf14' ||
        prop === 'custom_field_14' ||
        prop === 'custom_field14' ||
        prop.includes('customfield14') ||
        prop.includes('custom_field_14') ||
        prop.includes('custom_field14') ||
        prop.includes('cf_14') ||
        prop.includes('cf14') ||
        prop.includes('custom_fields/14') ||
        prop.endsWith('/14') ||
        cleanRaw.includes('testing status') ||
        cleanRaw.includes('customfield14') ||
        cleanRaw.includes('custom_field_14') ||
        cleanRaw.includes('cf_14')

      if (!isTestingStatusField) continue

      let extractedNewValue =
        extractCustomFieldValue(detail.newValue) ||
        extractCustomFieldValue(anyDetail._links?.newValue) ||
        extractCustomFieldValue(anyDetail._links?.new_value) ||
        extractCustomFieldValue(anyDetail._links?.value)

      let extractedOldValue =
        extractCustomFieldValue(detail.oldValue) ||
        extractCustomFieldValue(anyDetail._links?.oldValue) ||
        extractCustomFieldValue(anyDetail._links?.old_value)

      // Fallback: parse from raw text
      if (!extractedNewValue && cleanRaw) {
        const changedMatch = cleanRaw.match(/(?:testing\s+status|customfield14|custom_field_14|cf_14)\s+changed\s+from\s+(.+?)\s+to\s+(.+)/i)
        if (changedMatch) {
          extractedOldValue = changedMatch[1].replace(/<[^>]*>/g, '').replace(/\.+$/, '').trim()
          extractedNewValue = changedMatch[2].replace(/<[^>]*>/g, '').replace(/\.+$/, '').trim()
        } else {
          const setMatch = cleanRaw.match(/(?:testing\s+status|customfield14|custom_field_14|cf_14)\s+set\s+to\s+(.+)/i)
          if (setMatch) {
            extractedNewValue = setMatch[1].replace(/<[^>]*>/g, '').replace(/\.+$/, '').trim()
          }
        }
      }

      if (!extractedNewValue) continue

      const actorName = activity.user?.name?.trim() || 'Unknown'
      const actorId = activity.user?.id || null

      // EXACT case-sensitive match for forwarding detection (business rule)
      const isForwarding = extractedNewValue === EXACT_FORWARDED_TARGET_VALUE

      const transition: VerifiedTransition = {
        workPackageId,
        activityId: activity.id || null,
        previousTestingStatus: extractedOldValue || null,
        newTestingStatus: extractedNewValue,
        changedAt: activity.createdAt,
        changedById: actorId,
        changedByName: actorName,
        verificationStatus: 'verified',
        isForwardingEvent: isForwarding,
      }

      allChanges.push(transition)
      if (isForwarding) forwardingTransitions.push(transition)
    }
  }

  // Sort newest first
  const sortDesc = (a: VerifiedTransition, b: VerifiedTransition) =>
    new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime()
  allChanges.sort(sortDesc)
  forwardingTransitions.sort(sortDesc)

  const historyStatus: ForwardingHistoryVerification =
    forwardingTransitions.length > 0 ? 'verified' : 'no_matching_event'

  return {
    allTestingStatusChanges: allChanges,
    transitions: forwardingTransitions,
    historyStatus,
  }
}

export function detectExactForwardingTransitions(
  workPackageId: number,
  activities: WorkPackageActivity[]
): VerifiedTransition[] {
  return inspectWorkPackageActivities(workPackageId, activities).transitions
}

/**
 * Fetch all available OpenProject work package types dynamically.
 */
export async function fetchAllOpenProjectTypes(
  config: OpenProjectConfig
): Promise<Array<{ id: number; name: string }>> {
  const { openproject_url, openproject_api_key } = config
  if (!openproject_url || !openproject_api_key) return []

  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
    const isDev = import.meta.env.DEV
    const cleanUrl = openproject_url.replace(/\/$/, '')

    let res: Response
    if (!isDev) {
      const proxyUrl = `${supabaseUrl}/functions/v1/openproject-proxy?path=${encodeURIComponent('/api/v3/types')}`
      res = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          openproject_url: cleanUrl,
          openproject_api_key,
        }),
      })
    } else {
      const baseUrl = isDev && cleanUrl.includes('tms.ktu.edu.in') ? '/openproject-api' : cleanUrl
      res = await fetch(`${baseUrl}/api/v3/types`, {
        headers: { Authorization: `Basic ${btoa(`apikey:${openproject_api_key}`)}` },
      })
    }

    if (!res.ok) return []
    const data = await res.json()
    const elements = data._embedded?.elements || []
    return elements.map((el: { id: number; name: string }) => ({
      id: el.id,
      name: el.name,
    }))
  } catch (err) {
    // Expected when OpenProject is not configured - suppress verbose error
    console.debug('[Ticket Bowl] Could not fetch types (OpenProject not configured or unreachable):', err instanceof Error ? err.message : 'Network error')
    return []
  }
}

/**
 * High-performance, multi-phase synchronization with data completeness safeguards:
 * Phase 1: Fetch and save all work package snapshots immediately (makes tickets instantly available in UI).
 * Phase 2: Selectively inspect activity journals for tickets needing history verification (incremental & retry-aware).
 * Phase 3: Upsert verified forwarding events with deduplication.
 * Phase 4: Recalculate forwarding counts and history verification status.
 * Phase 5: Update sync tracking status.
 */
export async function syncTicketBowlData(
  config: OpenProjectConfig,
  projectId: string,
  opProjectId?: number | null,
  opProjectName?: string | null,
  onProgress?: (progress: TicketBowlSyncProgress) => void,
  options?: {
    useIncrementalActivities?: boolean
    forceFullActivityResync?: boolean
    jobId?: string // Enable atomic commits and cancellation support
  }
): Promise<{ success: boolean; message: string; totalSynced: number; eventsFound: number }> {
  const startTime = Date.now()
  const startedAtIso = new Date().toISOString()
  const errors: string[] = []
  const useIncremental = options?.useIncrementalActivities ?? true
  const forceFullResync = options?.forceFullActivityResync ?? false

  // Cancellation check helper - throws if job was cancelled
  const checkCancellation = async (phase: string): Promise<void> => {
    if (!options?.jobId) return // No job tracking, skip check

    const isActive = await isSyncJobActive(options.jobId)
    if (!isActive) {
      console.log(`[Ticket Bowl] Sync cancelled during phase: ${phase}`)
      throw new Error(`SYNC_CANCELLED: Sync was cancelled during ${phase}`)
    }
  }

  emitSyncEvent('sync:start')

  try {
    // ------------------------------------------------------------------------
    // PHASE 0: Resolve Custom Field IDs Dynamically
    // ------------------------------------------------------------------------
    onProgress?.({
      phase: 'fetching-tickets',
      current: 0,
      total: 0,
      message: 'Resolving custom field configuration...',
    })

    const customFieldIds = await resolveAllCustomFieldIds(config)
    console.log('[Ticket Bowl] Resolved custom field IDs:', customFieldIds)

    // ------------------------------------------------------------------------
    // PHASE 1: Fetch Work Packages from OpenProject (All Types)
    // ------------------------------------------------------------------------
    onProgress?.({
      phase: 'fetching-tickets',
      current: 0,
      total: 0,
      message: 'Fetching all work packages from OpenProject...',
    })

    const configWithProject: OpenProjectConfig = {
      ...config,
      openproject_project_id: opProjectId?.toString() || undefined,
    }

    const wpResult = await fetchAllWorkPackages(configWithProject, {
      pageSize: 150,
      concurrency: 4,
      sortBy: '[["updatedAt","desc"]]',
      includeAllStatuses: true, // Include closed/done/rejected tickets
      onProgress: (current, total) => {
        onProgress?.({
          phase: 'fetching-tickets',
          current,
          total,
          message: `Fetching tickets: ${current.toLocaleString()} / ${total.toLocaleString()}`,
        })
      },
    })

    const rawWorkPackages: OpenProjectWorkPackage[] = wpResult.items
    const reportedTotal = wpResult.total

    // DATA COMPLETENESS CHECK: Validate fetched count vs OpenProject's reported total
    const fetchedCount = rawWorkPackages.length
    const countMismatch = Math.abs(fetchedCount - reportedTotal)
    const mismatchPercentage = reportedTotal > 0 ? (countMismatch / reportedTotal) * 100 : 0

    if (mismatchPercentage > 5) {
      const warning = `Data completeness warning: OpenProject reported ${reportedTotal} tickets, but only ${fetchedCount} were fetched (${mismatchPercentage.toFixed(1)}% mismatch)`
      console.warn(`[Ticket Bowl] ${warning}`)
      errors.push(warning)
    }

    if (rawWorkPackages.length === 0) {
      await updateSyncStatusRecord(projectId, opProjectId || null, opProjectName || null, {
        sync_status: 'completed',
        started_at: startedAtIso,
        completed_at: new Date().toISOString(),
        total_fetched: 0,
        total_inserted: 0,
        total_updated: 0,
        forwarding_events_found: 0,
        history_verified_count: 0,
        history_unavailable_count: 0,
        history_unverified_count: 0,
        errors_count: 0,
        last_successful_sync_at: new Date().toISOString(),
        error_details: null,
      })
      emitSyncEvent('sync:success')
      return { success: true, message: 'No tickets found in the selected project.', totalSynced: 0, eventsFound: 0 }
    }

    const formattedWPs: FormattedWorkPackage[] = rawWorkPackages.map(wp => formatWorkPackage(wp))

    // Cancellation check after fetching work packages
    await checkCancellation('fetching-tickets')

    // ------------------------------------------------------------------------
    // Check existing ticket cache to enable incremental history skipping
    // ------------------------------------------------------------------------
    const { data: existingWpRows } = await supabase
      .from('ticket_bowl_work_packages')
      .select('work_package_id, updated_at_op, history_verification_status, history_checked_at, forwarding_count, latest_forwarded_at, latest_forwarded_by_name')
      .eq('project_id', projectId)

    const existingWpMap = new Map<number, {
      updated_at_op: string | null
      history_verification_status: ForwardingHistoryVerification
      history_checked_at: string | null
      forwarding_count: number
      latest_forwarded_at: string | null
      latest_forwarded_by_name: string | null
    }>()

    if (existingWpRows) {
      for (const row of existingWpRows) {
        existingWpMap.set(Number(row.work_package_id), {
          updated_at_op: row.updated_at_op,
          history_verification_status: row.history_verification_status as ForwardingHistoryVerification,
          history_checked_at: row.history_checked_at,
          forwarding_count: row.forwarding_count || 0,
          latest_forwarded_at: row.latest_forwarded_at,
          latest_forwarded_by_name: row.latest_forwarded_by_name,
        })
      }
    }

    // ------------------------------------------------------------------------
    // PHASE 2: Save Initial Snapshots Immediately (Makes Tickets Instantly Available)
    // ------------------------------------------------------------------------
    onProgress?.({
      phase: 'saving-snapshots',
      current: 0,
      total: formattedWPs.length,
      message: 'Saving ticket snapshots to database...',
    })

    const today = new Date().toISOString().split('T')[0]
    const UPSERT_CHUNK = 250

    const initialSnapshots = formattedWPs.map(wp => {
      const existing = existingWpMap.get(wp.id)
      const isOverdue = wp.dueDate
        ? wp.dueDate < today &&
        !['closed', 'done', 'rejected'].some(s => wp.status.toLowerCase().includes(s)) &&
        (wp.percentageDone || 0) < 100
        : false

      // Default history status for the snapshot upsert:
      // - If ticket is currently forwarded and we have no prior record: mark unavailable
      //   (history needs to be fetched before we can confirm).
      // - If we have a prior record: preserve it.
      // - Otherwise: mark unavailable so it will be inspected.
      // NEVER pre-assign 'no_matching_event' here — that can only be set after
      // a successful activity inspection that found no qualifying transition.
      const defaultStatus: ForwardingHistoryVerification = 'unavailable'

      return {
        project_id: projectId,
        op_project_id: opProjectId || null,
        op_project_name: opProjectName || wp.project || null,
        work_package_id: wp.id,
        subject: wp.subject,
        description: wp.description || null,
        type_id: null,
        type_name: wp.type,
        status_id: null,
        status_name: wp.status,
        priority_id: null,
        priority_name: wp.priority,
        author_id: null,
        author_name: wp.author || null,
        assignee_id: null,
        assignee_name: wp.assignee || null,
        responsible_id: null,
        responsible_name: wp.responsible || null,
        testing_status: wp.testingStatus || null,
        is_qa_missed: wp.isQAMissed ?? null,
        qa_confirmation: wp.qaConfirmation || null,
        release_tag: wp.release || null,
        version_name: wp.version || null,
        percentage_done: wp.percentageDone || 0,
        estimated_time: wp.estimatedTime || null,
        spent_time: wp.spentTime || null,
        story_points: wp.storyPoints || null,
        start_date: wp.startDate || null,
        due_date: wp.dueDate || null,
        is_overdue: isOverdue,
        created_at_op: wp.createdAt || null,
        updated_at_op: wp.updatedAt || null,
        // Preserve prior verification if ticket was already verified
        latest_forwarded_at: existing?.latest_forwarded_at || null,
        latest_forwarded_by_id: null,
        latest_forwarded_by_name: existing?.latest_forwarded_by_name || null,
        forwarding_count: existing?.forwarding_count || 0,
        sync_status: 'synced',
        history_verification_status: existing?.history_verification_status || defaultStatus,
        history_checked_at: existing?.history_checked_at || null,
        history_error: null,
        last_synced_at: new Date().toISOString(),
      }
    })

    let snapshotsSaved = 0
    const targetTable = options?.jobId ? 'ticket_bowl_work_packages_staging' : 'ticket_bowl_work_packages'
    const conflictKeys = options?.jobId ? 'job_id,project_id,work_package_id' : 'project_id,work_package_id'

    for (let i = 0; i < initialSnapshots.length; i += UPSERT_CHUNK) {
      const chunk = initialSnapshots.slice(i, i + UPSERT_CHUNK)
      // Add job_id to each row if using staging tables
      const chunkWithJobId = options?.jobId
        ? chunk.map(row => ({ ...row, job_id: options.jobId }))
        : chunk

      const { error } = await supabase
        .from(targetTable)
        .upsert(chunkWithJobId, { onConflict: conflictKeys })

      if (error) {
        errors.push(`Snapshot upsert failed: ${error.message}`)
      } else {
        snapshotsSaved += chunk.length
      }

      onProgress?.({
        phase: 'saving-snapshots',
        current: Math.min(i + UPSERT_CHUNK, initialSnapshots.length),
        total: initialSnapshots.length,
        message: `Saved ${Math.min(i + UPSERT_CHUNK, initialSnapshots.length)} / ${initialSnapshots.length} ticket snapshots`,
        ticketsSaved: snapshotsSaved,
      })
    }

    // Cancellation check after saving snapshots
    await checkCancellation('saving-snapshots')

    // ------------------------------------------------------------------------
    // PHASE 3: Selective & Incremental Activity Journal Inspection
    // ------------------------------------------------------------------------
    // Enhanced logic: uses activity cursors and re-inspects old unverified tickets
    // A ticket is skipped ONLY when ALL of the following are true:
    //   1. It already exists in the DB with a confirmed result.
    //   2. Its history_verification_status is 'verified' OR 'no_matching_event'.
    //   3. Its OpenProject updatedAt has NOT advanced past the last history check.
    //
    // CRITICAL: 'no_matching_event' is NOT a permanent terminal state.
    // A ticket may have been forwarded historically even if its current Testing
    // Status is no longer the target value. It must be re-inspected whenever
    // OpenProject reports it was updated after the last check.
    // Only skip 'no_matching_event' tickets when updatedAt confirms no change.
    const ticketsToInspect: typeof formattedWPs = []

    for (const wp of formattedWPs) {
      const existing = existingWpMap.get(wp.id)

      if (forceFullResync) {
        ticketsToInspect.push(wp)
        continue
      }

      if (!existing) {
        // New ticket - always inspect
        ticketsToInspect.push(wp)
        continue
      }

      // Always retry tickets with fetch errors or unconfirmed state
      if (
        existing.history_verification_status === 'unavailable' ||
        existing.history_verification_status === 'unverified'
      ) {
        ticketsToInspect.push(wp)
        continue
      }

      // Always inspect if currently forwarded but no verified event stored yet
      if (
        wp.testingStatus === EXACT_FORWARDED_TARGET_VALUE &&
        existing.forwarding_count === 0
      ) {
        ticketsToInspect.push(wp)
        continue
      }

      // Use smart inspection logic with cursor awareness
      if (useIncremental) {
        const cursor = await getActivitySyncCursor(projectId, wp.id)
        const shouldInspect = shouldReinspectActivities(
          cursor,
          wp.updatedAt,
          existing.history_verification_status,
          wp.testingStatus || '',
          EXACT_FORWARDED_TARGET_VALUE
        )
        if (shouldInspect) {
          ticketsToInspect.push(wp)
        }
      } else {
        // For both 'verified' and 'no_matching_event': only skip if the ticket
        // has not been updated in OpenProject since the last history check.
        // If updatedAt is unknown on either side, always inspect to be safe.
        if (wp.updatedAt && existing.history_checked_at) {
          if (new Date(wp.updatedAt).getTime() > new Date(existing.history_checked_at).getTime()) {
            ticketsToInspect.push(wp)
          }
        } else {
          // updatedAt or history_checked_at is missing — inspect to be safe
          ticketsToInspect.push(wp)
        }
      }
    }

    onProgress?.({
      phase: 'fetching-activities',
      current: 0,
      total: ticketsToInspect.length,
      message: `Inspecting journals for ${ticketsToInspect.length} tickets (${formattedWPs.length - ticketsToInspect.length} unchanged tickets skipped)...`,
    })

    const allDiscoveredTransitions: VerifiedTransition[] = []
    const allDiscoveredStatusChanges: VerifiedTransition[] = []
    const inspectionResultsMap = new Map<number, ActivityInspectionResult>()

    const ACTIVITY_BATCH_SIZE = 8
    let incrementalHits = 0
    let incrementalSkips = 0

    for (let i = 0; i < ticketsToInspect.length; i += ACTIVITY_BATCH_SIZE) {
      const slice = ticketsToInspect.slice(i, i + ACTIVITY_BATCH_SIZE)
      const batchPromises = slice.map(async wp => {
        try {
          let activities: WorkPackageActivity[]
          let newActivitiesCount = 0

          // Use incremental fetching if enabled
          if (useIncremental && !forceFullResync) {
            const incrementalResult = await fetchActivitiesIncremental(
              configWithProject,
              projectId,
              wp.id
            )
            activities = incrementalResult.activities
            newActivitiesCount = incrementalResult.newActivitiesCount

            if (newActivitiesCount === 0) {
              incrementalSkips++
              // No new activities - use cached inspection result if verified
              const existing = existingWpMap.get(wp.id)
              if (existing && existing.history_verification_status === 'verified') {
                return { wpId: wp.id, result: { allTestingStatusChanges: [], transitions: [], historyStatus: 'verified' as const }, skipped: true }
              }
            } else {
              incrementalHits++
            }
          } else {
            activities = await fetchWorkPackageActivities(configWithProject, wp.id)
          }

          const result = inspectWorkPackageActivities(wp.id, activities, null)
          return { wpId: wp.id, result, skipped: false }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : 'Network failure fetching activities'
          const result = inspectWorkPackageActivities(wp.id, null, errMsg)
          return { wpId: wp.id, result, skipped: false }
        }
      })

      const results = await Promise.all(batchPromises)
      for (const res of results) {
        if (!res.skipped) {
          inspectionResultsMap.set(res.wpId, res.result as ActivityInspectionResult)
          if (res.result.transitions.length > 0) {
            allDiscoveredTransitions.push(...res.result.transitions)
          }
        }
        if (res.result.allTestingStatusChanges && res.result.allTestingStatusChanges.length > 0) {
          allDiscoveredStatusChanges.push(...res.result.allTestingStatusChanges)
        }
      }

      const progressCount = Math.min(i + ACTIVITY_BATCH_SIZE, ticketsToInspect.length)
      const incrementalMsg = useIncremental
        ? ` (${incrementalHits} new activities, ${incrementalSkips} cached)`
        : ''
      onProgress?.({
        phase: 'fetching-activities',
        current: progressCount,
        total: ticketsToInspect.length,
        message: `Inspecting activities: ${progressCount} / ${ticketsToInspect.length}${incrementalMsg} (${allDiscoveredTransitions.length} events found)`,
        eventsFound: allDiscoveredTransitions.length,
      })
    }

    if (useIncremental) {
      console.log(`[Ticket Bowl] Incremental sync: ${incrementalHits} tickets with new activities, ${incrementalSkips} skipped (cached)`)
    }

    // Cancellation check after activity inspection
    await checkCancellation('fetching-activities')

    // ------------------------------------------------------------------------
    // PHASE 4: Persist History
    // 4a. Forwarding events → ticket_bowl_forwarding_history
    // 4b. All Testing Status changes → ticket_bowl_testing_status_history
    // Deduplication constraints prevent duplicates on re-sync.
    // ------------------------------------------------------------------------
    onProgress?.({
      phase: 'saving-history',
      current: 0,
      total: allDiscoveredTransitions.length,
      message: 'Persisting verified forwarding events and complete Testing Status history...',
    })

    // 4a. Forwarding events
    const historyRows = allDiscoveredTransitions.map(t => ({
      project_id: projectId,
      op_project_id: opProjectId || null,
      work_package_id: t.workPackageId,
      activity_id: t.activityId,
      previous_testing_status: t.previousTestingStatus,
      new_testing_status: t.newTestingStatus,
      changed_at: t.changedAt,
      changed_by_id: t.changedById,
      changed_by_name: t.changedByName,
      verification_status: t.verificationStatus,
      source: 'sync',
    }))

    const fwdHistoryTable = options?.jobId ? 'ticket_bowl_forwarding_history_staging' : 'ticket_bowl_forwarding_history'
    const fwdConflictKeys = options?.jobId
      ? 'job_id,project_id,work_package_id,activity_id,changed_at'
      : 'project_id,work_package_id,activity_id,changed_at'

    if (historyRows.length > 0) {
      for (let i = 0; i < historyRows.length; i += UPSERT_CHUNK) {
        const chunk = historyRows.slice(i, i + UPSERT_CHUNK)
        const chunkWithJobId = options?.jobId
          ? chunk.map(row => ({ ...row, job_id: options.jobId }))
          : chunk

        const { error } = await supabase
          .from(fwdHistoryTable)
          .upsert(chunkWithJobId, {
            onConflict: fwdConflictKeys,
            ignoreDuplicates: true,
          })
        if (error) errors.push(`Forwarding history upsert failed: ${error.message}`)
      }
    }

    // 4b. Complete Testing Status history (all customField14 changes)
    const statusHistoryRows = allDiscoveredStatusChanges.map(t => ({
      project_id: projectId,
      op_project_id: opProjectId || null,
      work_package_id: t.workPackageId,
      activity_id: t.activityId,
      previous_testing_status: t.previousTestingStatus,
      new_testing_status: t.newTestingStatus,
      changed_at: t.changedAt,
      changed_by_id: t.changedById,
      changed_by_name: t.changedByName,
      is_forwarding_event: t.isForwardingEvent,
      source: 'sync',
    }))

    const statusHistoryTable = options?.jobId ? 'ticket_bowl_testing_status_history_staging' : 'ticket_bowl_testing_status_history'
    const statusConflictKeys = options?.jobId
      ? 'job_id,project_id,work_package_id,activity_id,changed_at'
      : 'project_id,work_package_id,activity_id,changed_at'

    if (statusHistoryRows.length > 0) {
      for (let i = 0; i < statusHistoryRows.length; i += UPSERT_CHUNK) {
        const chunk = statusHistoryRows.slice(i, i + UPSERT_CHUNK)
        const chunkWithJobId = options?.jobId
          ? chunk.map(row => ({ ...row, job_id: options.jobId }))
          : chunk

        const { error } = await supabase
          .from(statusHistoryTable)
          .upsert(chunkWithJobId, {
            onConflict: statusConflictKeys,
            ignoreDuplicates: true,
          })
        if (error) errors.push(`Testing status history upsert failed: ${error.message}`)
      }
    }

    // Cancellation check after saving history
    await checkCancellation('saving-history')

    // ------------------------------------------------------------------------
    // PHASE 5: Recalculate Forwarding Counts & History Status on Work Packages
    // ------------------------------------------------------------------------
    onProgress?.({
      phase: 'recalculating-counts',
      current: 0,
      total: formattedWPs.length,
      message: 'Recalculating verified forwarding counts and verification statuses...',
    })

    let verifiedCountTotal = 0
    let unavailableCountTotal = 0
    let unverifiedCountTotal = 0

    const updateUpdates = formattedWPs.map(wp => {
      const inspection = inspectionResultsMap.get(wp.id)
      const existing = existingWpMap.get(wp.id)

      // Default: preserve existing status if we didn't inspect this ticket.
      // If no existing record, mark unavailable (not no_matching_event) so it
      // gets inspected on the next sync.
      let finalHistoryStatus: ForwardingHistoryVerification = existing?.history_verification_status || 'unavailable'
      let finalCount = existing?.forwarding_count || 0
      let latestAt: string | null = existing?.latest_forwarded_at || null
      let latestBy: string | null = existing?.latest_forwarded_by_name || null
      let historyError: string | null = null

      if (inspection) {
        historyError = inspection.error || null

        if (inspection.transitions.length > 0) {
          finalHistoryStatus = 'verified'
          latestAt = inspection.transitions[0].changedAt
          latestBy = inspection.transitions[0].changedByName
        } else if (inspection.historyStatus === 'unverified') {
          finalHistoryStatus = 'unverified'
        } else if (inspection.historyStatus === 'unavailable') {
          // Fetch error — keep as unavailable so it retries next sync
          finalHistoryStatus = 'unavailable'
        } else {
          // Activity was successfully fetched and inspected; no forwarding transition found.
          // Only now is it safe to mark as no_matching_event.
          finalHistoryStatus = 'no_matching_event'
          finalCount = 0
          latestAt = null
          latestBy = null
        }
      }

      if (finalHistoryStatus === 'verified') verifiedCountTotal++
      else if (finalHistoryStatus === 'unavailable') unavailableCountTotal++
      else if (finalHistoryStatus === 'unverified') unverifiedCountTotal++

      return {
        project_id: projectId,
        work_package_id: wp.id,
        forwarding_count: finalCount,
        latest_forwarded_at: latestAt,
        latest_forwarded_by_name: latestBy,
        history_verification_status: finalHistoryStatus,
        history_checked_at: new Date().toISOString(),
        history_error: historyError,
      }
    })

    // Recalculate forwarding_count from the history table (authoritative source)
    // This prevents count from being overwritten by a partial sync run.
    const { data: dbCounts } = await supabase
      .from('ticket_bowl_forwarding_history')
      .select('work_package_id')
      .eq('project_id', projectId)

    const dbCountMap = new Map<number, number>()
    if (dbCounts) {
      for (const row of dbCounts) {
        const id = Number(row.work_package_id)
        dbCountMap.set(id, (dbCountMap.get(id) || 0) + 1)
      }
    }

    // Apply DB-authoritative counts to the update payload
    for (const upd of updateUpdates) {
      const dbCount = dbCountMap.get(Number(upd.work_package_id))
      if (dbCount !== undefined) {
        upd.forwarding_count = dbCount
        if (upd.history_verification_status === 'no_matching_event' && dbCount > 0) {
          upd.history_verification_status = 'verified'
        }
      }
    }

    // Batch update the verification fields
    const updateTable = options?.jobId ? 'ticket_bowl_work_packages_staging' : 'ticket_bowl_work_packages'
    const updateConflictKeys = options?.jobId ? 'job_id,project_id,work_package_id' : 'project_id,work_package_id'

    for (let i = 0; i < updateUpdates.length; i += UPSERT_CHUNK) {
      const chunk = updateUpdates.slice(i, i + UPSERT_CHUNK)
      const chunkWithJobId = options?.jobId
        ? chunk.map(row => ({ ...row, job_id: options.jobId }))
        : chunk

      await supabase
        .from(updateTable)
        .upsert(chunkWithJobId, { onConflict: updateConflictKeys })
    }

    // Cancellation check after count recalculation
    await checkCancellation('recalculating-counts')

    // ------------------------------------------------------------------------
    // PHASE 6: Update Synchronization Status Record
    // ------------------------------------------------------------------------
    const finalSyncStatus = errors.length > 0 ? 'completed_with_errors' : 'completed'
    await updateSyncStatusRecord(projectId, opProjectId || null, opProjectName || null, {
      sync_status: finalSyncStatus,
      started_at: startedAtIso,
      completed_at: new Date().toISOString(),
      total_fetched: rawWorkPackages.length,
      total_inserted: snapshotsSaved,
      total_updated: snapshotsSaved,
      forwarding_events_found: allDiscoveredTransitions.length,
      history_verified_count: verifiedCountTotal,
      history_unavailable_count: unavailableCountTotal,
      history_unverified_count: unverifiedCountTotal,
      errors_count: errors.length,
      last_successful_sync_at: new Date().toISOString(),
      error_details: errors.length > 0 ? errors.join('; ') : null,
    })

    onProgress?.({
      phase: 'complete',
      current: snapshotsSaved,
      total: rawWorkPackages.length,
      message: `Sync complete: ${snapshotsSaved} tickets saved (${verifiedCountTotal} verified, ${unavailableCountTotal} with incomplete/unavailable history).`,
      ticketsSaved: snapshotsSaved,
      eventsFound: allDiscoveredTransitions.length,
      verifiedCount: verifiedCountTotal,
      unavailableCount: unavailableCountTotal,
    })

    // ------------------------------------------------------------------------
    // ATOMIC COMMIT: Move staging data to production tables
    // ------------------------------------------------------------------------
    if (options?.jobId) {
      console.log('[Ticket Bowl] Committing staged data to production tables...')
      try {
        const commitResult = await commitSyncData(options.jobId, projectId)
        console.log('[Ticket Bowl] Atomic commit successful:', commitResult)
      } catch (commitError) {
        console.error('[Ticket Bowl] Failed to commit staged data:', commitError)
        // Clean up staging data on commit failure
        await cleanupStagingData(options.jobId)
        const commitErrMsg = commitError instanceof Error ? commitError.message : String(commitError)
        throw new Error(`Sync completed but failed to commit data: ${commitErrMsg}`)
      }
    }

    emitSyncEvent('sync:success')
    return {
      success: true,
      message: `Synchronized ${snapshotsSaved} tickets (${verifiedCountTotal} verified handoffs, ${unavailableCountTotal} with incomplete history).`,
      totalSynced: snapshotsSaved,
      eventsFound: allDiscoveredTransitions.length,
    }
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Unknown synchronization failure'
    console.error('[Ticket Bowl] Sync fatal error:', err)

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
      emitSyncEvent('sync:fail')

      await updateSyncStatusRecord(projectId, opProjectId || null, opProjectName || null, {
        sync_status: 'failed',
        started_at: startedAtIso,
        completed_at: new Date().toISOString(),
        total_fetched: 0,
        total_inserted: 0,
        total_updated: 0,
        forwarding_events_found: 0,
        history_verified_count: 0,
        history_unavailable_count: 0,
        history_unverified_count: 0,
        errors_count: 1,
        error_details: 'Synchronization was cancelled by user',
      })

      return {
        success: false,
        message: 'Synchronization was cancelled',
        totalSynced: 0,
        eventsFound: 0
      }
    }

    errors.push(errorMsg)

    await updateSyncStatusRecord(projectId, opProjectId || null, opProjectName || null, {
      sync_status: 'failed',
      started_at: startedAtIso,
      completed_at: new Date().toISOString(),
      total_fetched: 0,
      total_inserted: 0,
      total_updated: 0,
      forwarding_events_found: 0,
      history_verified_count: 0,
      history_unavailable_count: 0,
      history_unverified_count: 0,
      errors_count: errors.length,
      last_successful_sync_at: null,
      error_details: errorMsg,
    })

    onProgress?.({
      phase: 'error',
      current: 0,
      total: 0,
      message: `Synchronization failed: ${errorMsg}`,
    })

    emitSyncEvent('sync:fail')
    return {
      success: false,
      message: errorMsg,
      totalSynced: 0,
      eventsFound: 0,
    }
  }
}

/**
 * Updates or creates the synchronization status record.
 */
async function updateSyncStatusRecord(
  projectId: string,
  opProjectId: number | null,
  opProjectName: string | null,
  statusData: Partial<TicketBowlSyncStatus>
): Promise<void> {
  try {
    const record = {
      project_id: projectId,
      op_project_id: opProjectId,
      op_project_name: opProjectName,
      ...statusData,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('ticket_bowl_sync_status')
      .upsert(record, { onConflict: 'project_id,op_project_id' })

    if (error) {
      console.error('[Ticket Bowl] Failed to update sync status record:', error)
    }
  } catch (e) {
    console.error('[Ticket Bowl] Exception updating sync status:', e)
  }
}

/**
 * Fetch synchronization status for a project.
 */
export async function fetchTicketBowlSyncStatus(
  projectId: string,
  opProjectId?: number | null
): Promise<TicketBowlSyncStatus | null> {
  try {
    let query = supabase
      .from('ticket_bowl_sync_status')
      .select('*')
      .eq('project_id', projectId)

    if (opProjectId !== undefined && opProjectId !== null) {
      query = query.eq('op_project_id', opProjectId)
    }

    const { data, error } = await query.order('updated_at', { ascending: false }).limit(1).maybeSingle()
    if (error) return null
    return data as TicketBowlSyncStatus | null
  } catch {
    return null
  }
}

/**
 * Converts calendar date strings (YYYY-MM-DD) into inclusive UTC ISO strings.
 * Covers both local client timezone day boundaries and UTC day boundaries
 * so timezone discrepancies never clip events at the start or end of the day.
 */
export function convertDateFilterToIsoRange(
  fromStr?: string | null,
  toStr?: string | null
): { fromIso: string | null; toIso: string | null } {
  let fromIso: string | null = null
  let toIso: string | null = null

  if (fromStr) {
    const [y, m, d] = fromStr.split('-').map(Number)
    const localStart = new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
    const utcStart = Date.UTC(y, m - 1, d, 0, 0, 0, 0)
    // Earliest start between local day start and UTC day start
    fromIso = new Date(Math.min(localStart, utcStart)).toISOString()
  }

  if (toStr) {
    const [y, m, d] = toStr.split('-').map(Number)
    const localEnd = new Date(y, m - 1, d, 23, 59, 59, 999).getTime()
    const utcEnd = Date.UTC(y, m - 1, d, 23, 59, 59, 999)
    // Latest end between local day end and UTC day end
    toIso = new Date(Math.max(localEnd, utcEnd)).toISOString()
  }

  return { fromIso, toIso }
}

/**
 * Server-side paginated query for Ticket Bowl work packages.
 * Automatically handles date filtering with verified transitions only.
 */
export async function queryTicketBowlWorkPackages(
  filters: TicketBowlFilters,
  abortSignal?: AbortSignal
): Promise<TicketBowlQueryResult> {
  const {
    projectId,
    opProjectId,
    forwardedFrom,
    forwardedTo,
    typeName,
    statusName,
    priorityName,
    testingStatus,
    isQAMissed,
    authorName,
    assigneeName,
    historyVerificationStatus,
    search,
    pageSize = 25,
    page = 1,
  } = filters

  // Guard against empty projectId
  if (!projectId || projectId.trim() === '') {
    return {
      items: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    }
  }

  const offset = (page - 1) * pageSize

  // Convert calendar date strings to safe inclusive boundary range
  const { fromIso, toIso } = convertDateFilterToIsoRange(forwardedFrom, forwardedTo)

  try {
    // 1. Primary path: stored procedure get_ticket_bowl_work_packages
    const { data, error } = await supabase.rpc('get_ticket_bowl_work_packages', {
      p_project_id: projectId,
      p_op_project_id: opProjectId || null,
      p_forwarded_from: fromIso,
      p_forwarded_to: toIso,
      p_type_name: typeName || null,
      p_status_name: statusName || null,
      p_priority_name: priorityName || null,
      p_testing_status: testingStatus || null,
      p_is_qa_missed: isQAMissed || null,
      p_author_name: authorName || null,
      p_assignee_name: assigneeName || null,
      p_history_verification_status: historyVerificationStatus || null,
      p_search: search || null,
      p_limit: pageSize,
      p_offset: offset,
    })

    if (!error && Array.isArray(data)) {
      const total = data.length > 0 ? Number(data[0].total_matching_count || 0) : 0
      const totalPages = Math.ceil(total / pageSize) || 1
      return {
        items: data as TicketBowlWorkPackage[],
        total,
        pageSize,
        page,
        totalPages,
      }
    }

    if (error) {
      console.warn('[Ticket Bowl] RPC get_ticket_bowl_work_packages error, falling back to direct table query:', error)
    }
  } catch (rpcErr) {
    console.warn('[Ticket Bowl] RPC exception, falling back to direct query:', rpcErr)
  }

  // 2. Fallback direct table query
  return fallbackQueryTicketBowl(filters, fromIso, toIso, offset)
}

/**
 * Direct table query fallback.
 * Uses ticket_bowl_forwarding_history for date filtering — same as the RPC.
 */
async function fallbackQueryTicketBowl(
  filters: TicketBowlFilters,
  fromIso: string | null,
  toIso: string | null,
  offset: number
): Promise<TicketBowlQueryResult> {
  const {
    projectId,
    opProjectId,
    typeName,
    statusName,
    priorityName,
    testingStatus,
    isQAMissed,
    authorName,
    assigneeName,
    historyVerificationStatus,
    search,
    pageSize = 25,
    page = 1,
  } = filters

  const isDateFiltered = Boolean(fromIso || toIso)

  // Step 1: If date filter active, get qualifying work_package_ids from history table
  let qualifyingWpIds: number[] | null = null
  if (isDateFiltered) {
    let histQuery = supabase
      .from('ticket_bowl_forwarding_history')
      .select('work_package_id')
      .eq('project_id', projectId)
    if (fromIso) histQuery = histQuery.gte('changed_at', fromIso)
    if (toIso) histQuery = histQuery.lte('changed_at', toIso)

    const { data: histData } = await histQuery
    if (!histData || histData.length === 0) {
      return { items: [], total: 0, pageSize, page, totalPages: 1 }
    }
    qualifyingWpIds = [...new Set(histData.map(r => Number(r.work_package_id)))]
  }

  // Step 2: Query work packages
  let query = supabase
    .from('ticket_bowl_work_packages')
    .select('*', { count: 'exact' })
    .eq('project_id', projectId)

  if (opProjectId) query = query.eq('op_project_id', opProjectId)
  if (typeName) query = query.eq('type_name', typeName)
  if (statusName) query = query.eq('status_name', statusName)
  if (priorityName) query = query.eq('priority_name', priorityName)
  if (testingStatus) query = query.eq('testing_status', testingStatus)
  if (isQAMissed) query = query.eq('is_qa_missed', isQAMissed)
  if (historyVerificationStatus) query = query.eq('history_verification_status', historyVerificationStatus)
  if (authorName) query = query.ilike('author_name', `%${authorName}%`)
  if (assigneeName) query = query.ilike('assignee_name', `%${assigneeName}%`)
  if (search) query = query.or(`subject.ilike.%${search}%,work_package_id.eq.${!isNaN(Number(search)) ? search : 0}`)
  if (qualifyingWpIds) query = query.in('work_package_id', qualifyingWpIds)

  query = query
    .order('latest_forwarded_at', { ascending: false, nullsFirst: false })
    .order('updated_at_op', { ascending: false, nullsFirst: false })
    .range(offset, offset + pageSize - 1)

  const { data, count, error } = await query
  if (error) {
    console.error('[Ticket Bowl] Direct query error:', error)
    return { items: [], total: 0, pageSize, page, totalPages: 1 }
  }

  const items = (data || []).map(row => ({
    ...row,
    matched_forwarded_at: row.latest_forwarded_at,
    matched_forwarded_by: row.latest_forwarded_by_name,
  }))

  const total = count || 0
  return {
    items: items as TicketBowlWorkPackage[],
    total,
    pageSize,
    page,
    totalPages: Math.ceil(total / pageSize) || 1,
  }
}

/**
 * Fetch complete verified forwarding history for a work package.
 */
export async function fetchTicketForwardingHistory(
  projectId: string,
  workPackageId: number
): Promise<TicketBowlForwardingEvent[]> {
  try {
    const { data, error } = await supabase
      .from('ticket_bowl_forwarding_history')
      .select('*')
      .eq('project_id', projectId)
      .eq('work_package_id', workPackageId)
      .order('changed_at', { ascending: false })

    if (error) {
      console.error('[Ticket Bowl] Failed to fetch forwarding history:', error)
      return []
    }
    return (data || []) as TicketBowlForwardingEvent[]
  } catch (err) {
    console.error('[Ticket Bowl] History exception:', err)
    return []
  }
}

/**
 * Fetch complete Testing Status history for a work package (all customField14 changes).
 * Falls back to the forwarding history table if the complete history table is unavailable.
 */
export async function fetchTicketTestingStatusHistory(
  projectId: string,
  workPackageId: number
): Promise<import('@/modules/TicketBowl/types').TicketBowlTestingStatusEvent[]> {
  try {
    // Try the complete history table first (via RPC)
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'get_ticket_testing_status_history',
      { p_project_id: projectId, p_work_package_id: workPackageId }
    )

    if (!rpcError && Array.isArray(rpcData) && rpcData.length > 0) {
      return rpcData as import('@/modules/TicketBowl/types').TicketBowlTestingStatusEvent[]
    }

    // Fallback: direct table query
    const { data, error } = await supabase
      .from('ticket_bowl_testing_status_history')
      .select('id, activity_id, previous_testing_status, new_testing_status, changed_at, changed_by_name, is_forwarding_event')
      .eq('project_id', projectId)
      .eq('work_package_id', workPackageId)
      .order('changed_at', { ascending: false })

    if (!error && data && data.length > 0) {
      return data as import('@/modules/TicketBowl/types').TicketBowlTestingStatusEvent[]
    }

    // Last resort: synthesize from forwarding history table
    const { data: fwdData } = await supabase
      .from('ticket_bowl_forwarding_history')
      .select('id, activity_id, previous_testing_status, new_testing_status, changed_at, changed_by_name')
      .eq('project_id', projectId)
      .eq('work_package_id', workPackageId)
      .order('changed_at', { ascending: false })

    return (fwdData || []).map(r => ({
      ...r,
      is_forwarding_event: true,
    })) as import('@/modules/TicketBowl/types').TicketBowlTestingStatusEvent[]
  } catch (err) {
    console.error('[Ticket Bowl] Testing status history exception:', err)
    return []
  }
}

/**
 * Quick Search: Fetch tickets forwarded to testing within a date range.
 * 
 * SIMPLIFIED & RELIABLE APPROACH:
 * 1. First, query LOCAL DATABASE for already-synced forwarding history in date range (instant)
 * 2. If no local data, fetch tickets from OpenProject updated in date range, then filter
 */
export async function quickFetchByForwardedDate(
  config: OpenProjectConfig,
  fromDate: string, // YYYY-MM-DD
  toDate: string,   // YYYY-MM-DD
  opProjectId?: number | null,
  onProgress?: (progress: QuickSearchProgress) => void,
  projectId?: string // Optional: for local DB query
): Promise<{ results: QuickSearchResult[]; totalInspected: number; source: 'local' | 'api' }> {
  if (!fromDate || !toDate) {
    throw new Error('Both From and To dates are required for Quick Search')
  }

  const fromIso = new Date(`${fromDate}T00:00:00.000Z`).toISOString()
  const toIso = new Date(`${toDate}T23:59:59.999Z`).toISOString()

  // ============================================================
  // STEP 1: Try LOCAL DATABASE first (instant results if synced)
  // ============================================================
  if (projectId) {
    onProgress?.({
      phase: 'fetching',
      current: 0,
      total: 0,
      message: 'Checking local database...',
    })

    try {
      const localResults = await queryLocalForwardingHistorySimple(projectId, fromIso, toIso, opProjectId)
      
      if (localResults.length > 0) {
        onProgress?.({
          phase: 'complete',
          current: localResults.length,
          total: localResults.length,
          message: `Found ${localResults.length} tickets from local database (instant)`,
          foundCount: localResults.length,
        })
        return { results: localResults, totalInspected: localResults.length, source: 'local' }
      }
    } catch (err) {
      console.warn('[Quick Search] Local DB query failed, falling back to API:', err)
    }
  }

  // ============================================================
  // STEP 2: Query OpenProject API
  // ============================================================
  if (!config.openproject_url || !config.openproject_api_key) {
    onProgress?.({
      phase: 'complete',
      current: 0,
      total: 0,
      message: 'No local data found. Please run a Full Sync first, or configure OpenProject.',
      foundCount: 0,
    })
    return { results: [], totalInspected: 0, source: 'api' }
  }

  onProgress?.({
    phase: 'fetching',
    current: 0,
    total: 0,
    message: 'Fetching tickets from OpenProject...',
  })

  const configWithProject: OpenProjectConfig = {
    ...config,
    openproject_project_id: opProjectId?.toString() || config.openproject_project_id,
  }

  // Fetch tickets updated in the date range
  const { items: candidates } = await fetchAllWorkPackages(configWithProject, {
    pageSize: 200,
    concurrency: 5,
    includeAllStatuses: true,
    sortBy: '[["updatedAt","desc"]]',
    onProgress: (current, total) => {
      onProgress?.({
        phase: 'fetching',
        current,
        total,
        message: `Fetching tickets: ${current} / ${total}`,
      })
    },
  })

  // Filter to only tickets updated within the date range
  const fromTime = new Date(fromIso).getTime()
  const toTime = new Date(toIso).getTime()
  
  const filteredCandidates = candidates.filter(wp => {
    if (!wp.updatedAt) return false
    const updatedTime = new Date(wp.updatedAt).getTime()
    return updatedTime >= fromTime && updatedTime <= toTime
  })

  if (filteredCandidates.length === 0) {
    onProgress?.({
      phase: 'complete',
      current: 0,
      total: 0,
      message: 'No tickets updated in the selected date range.',
      foundCount: 0,
    })
    return { results: [], totalInspected: 0, source: 'api' }
  }

  // Further filter to only tickets with Testing Status = "Forwarded to Testing Team"
  const forwardedCandidates = filteredCandidates.filter(wp => {
    const formatted = formatWorkPackage(wp)
    return formatted.testingStatus === EXACT_FORWARDED_TARGET_VALUE
  })

  if (forwardedCandidates.length === 0) {
    onProgress?.({
      phase: 'complete',
      current: 0,
      total: filteredCandidates.length,
      message: `Checked ${filteredCandidates.length} tickets - none have "Forwarded to Testing Team" status.`,
      foundCount: 0,
    })
    return { results: [], totalInspected: filteredCandidates.length, source: 'api' }
  }

  onProgress?.({
    phase: 'inspecting',
    current: 0,
    total: forwardedCandidates.length,
    message: `Verifying ${forwardedCandidates.length} forwarded tickets...`,
  })

  // ============================================================
  // STEP 3: Inspect activities to find exact forwarding date
  // ============================================================
  const results: QuickSearchResult[] = []
  const BATCH_SIZE = 10
  let inspected = 0

  for (let i = 0; i < forwardedCandidates.length; i += BATCH_SIZE) {
    const batch = forwardedCandidates.slice(i, i + BATCH_SIZE)
    
    const batchPromises = batch.map(async (wp) => {
      try {
        const activities = await fetchWorkPackageActivities(configWithProject, wp.id)
        const inspection = inspectWorkPackageActivities(wp.id, activities, null)
        
        // Find forwarding events within the date range
        const matchingEvents = inspection.transitions.filter(t => {
          const changedAt = new Date(t.changedAt).getTime()
          return changedAt >= fromTime && changedAt <= toTime
        })

        if (matchingEvents.length > 0) {
          const latestEvent = matchingEvents[0]
          const formatted = formatWorkPackage(wp)
          
          return {
            workPackageId: wp.id,
            subject: formatted.subject,
            typeName: formatted.type,
            statusName: formatted.status,
            priorityName: formatted.priority,
            testingStatus: formatted.testingStatus,
            assigneeName: formatted.assignee,
            authorName: formatted.author,
            forwardedAt: latestEvent.changedAt,
            forwardedBy: latestEvent.changedByName,
            updatedAt: formatted.updatedAt,
          } as QuickSearchResult
        }
        return null
      } catch (err) {
        console.warn(`[Quick Search] Failed to inspect WP#${wp.id}:`, err)
        return null
      }
    })

    const batchResults = await Promise.all(batchPromises)
    batchResults.forEach(r => { if (r) results.push(r) })

    inspected += batch.length
    onProgress?.({
      phase: 'inspecting',
      current: inspected,
      total: forwardedCandidates.length,
      message: `Verifying: ${inspected} / ${forwardedCandidates.length} (${results.length} confirmed)`,
      foundCount: results.length,
    })
  }

  results.sort((a, b) => new Date(b.forwardedAt).getTime() - new Date(a.forwardedAt).getTime())

  onProgress?.({
    phase: 'complete',
    current: inspected,
    total: forwardedCandidates.length,
    message: `Found ${results.length} tickets forwarded between ${fromDate} and ${toDate}`,
    foundCount: results.length,
  })

  return { results, totalInspected: inspected, source: 'api' }
}

/**
 * Simple local database query for forwarding history (no complex joins)
 */
async function queryLocalForwardingHistorySimple(
  projectId: string,
  fromIso: string,
  toIso: string,
  opProjectId?: number | null
): Promise<QuickSearchResult[]> {
  // Step 1: Get forwarding events in date range
  let historyQuery = supabase
    .from('ticket_bowl_forwarding_history')
    .select('work_package_id, changed_at, changed_by_name')
    .eq('project_id', projectId)
    .gte('changed_at', fromIso)
    .lte('changed_at', toIso)
    .order('changed_at', { ascending: false })

  if (opProjectId) {
    historyQuery = historyQuery.eq('op_project_id', opProjectId)
  }

  const { data: historyData, error: historyError } = await historyQuery

  if (historyError || !historyData || historyData.length === 0) {
    return []
  }

  // Deduplicate by work_package_id (keep first = latest)
  const uniqueWpIds = new Map<number, { changed_at: string; changed_by_name: string }>()
  for (const row of historyData) {
    if (!uniqueWpIds.has(row.work_package_id)) {
      uniqueWpIds.set(row.work_package_id, {
        changed_at: row.changed_at,
        changed_by_name: row.changed_by_name,
      })
    }
  }

  if (uniqueWpIds.size === 0) {
    return []
  }

  // Step 2: Get work package details
  const wpIds = Array.from(uniqueWpIds.keys())
  const { data: wpData, error: wpError } = await supabase
    .from('ticket_bowl_work_packages')
    .select('work_package_id, subject, type_name, status_name, priority_name, testing_status, assignee_name, author_name, updated_at_op')
    .eq('project_id', projectId)
    .in('work_package_id', wpIds)

  if (wpError || !wpData) {
    return []
  }

  // Step 3: Combine data
  const wpMap = new Map(wpData.map(wp => [wp.work_package_id, wp]))
  
  const results: QuickSearchResult[] = []
  for (const [wpId, historyInfo] of uniqueWpIds) {
    const wp = wpMap.get(wpId)
    if (wp) {
      results.push({
        workPackageId: wpId,
        subject: wp.subject || '',
        typeName: wp.type_name || '',
        statusName: wp.status_name || '',
        priorityName: wp.priority_name || '',
        testingStatus: wp.testing_status || null,
        assigneeName: wp.assignee_name || null,
        authorName: wp.author_name || null,
        forwardedAt: historyInfo.changed_at,
        forwardedBy: historyInfo.changed_by_name,
        updatedAt: wp.updated_at_op || null,
      })
    }
  }

  // Sort by forwarded date (newest first)
  results.sort((a, b) => new Date(b.forwardedAt).getTime() - new Date(a.forwardedAt).getTime())

  return results
}

/**
 * Fetch complete dashboard analytics over the entire filtered dataset.
 */
export async function fetchTicketBowlDashboardStats(
  filters: TicketBowlFilters
): Promise<TicketBowlDashboardStats> {
  const {
    projectId,
    opProjectId,
    forwardedFrom,
    forwardedTo,
    typeName,
    statusName,
    priorityName,
    testingStatus,
    isQAMissed,
    authorName,
    assigneeName,
    historyVerificationStatus,
    search,
  } = filters

  // Guard against empty projectId
  if (!projectId || projectId.trim() === '') {
    return {
      totalUniqueTickets: 0,
      totalForwardingEvents: 0,
      repeatForwardedTickets: 0,
      unavailableHistoryTickets: 0,
      currentTestingStatusCounts: {},
      qaMissedCounts: {},
      typeCounts: {},
      statusCounts: {},
      priorityCounts: {},
      historyVerificationCounts: {},
    }
  }

  const { fromIso, toIso } = convertDateFilterToIsoRange(forwardedFrom, forwardedTo)

  try {
    const { data, error } = await supabase.rpc('get_ticket_bowl_dashboard_stats', {
      p_project_id: projectId,
      p_op_project_id: opProjectId || null,
      p_forwarded_from: fromIso,
      p_forwarded_to: toIso,
      p_type_name: typeName || null,
      p_status_name: statusName || null,
      p_priority_name: priorityName || null,
      p_testing_status: testingStatus || null,
      p_is_qa_missed: isQAMissed || null,
      p_author_name: authorName || null,
      p_assignee_name: assigneeName || null,
      p_history_verification_status: historyVerificationStatus || null,
      p_search: search || null,
    })

    if (!error && Array.isArray(data) && data.length > 0) {
      const row = data[0]
      return {
        totalUniqueTickets: Number(row.total_unique_tickets || 0),
        totalForwardingEvents: Number(row.total_forwarding_events || 0),
        repeatForwardedTickets: Number(row.repeat_forwarded_tickets || 0),
        unavailableHistoryTickets: Number(row.unavailable_history_tickets || 0),
        currentTestingStatusCounts: (row.current_testing_status_counts || {}) as Record<string, number>,
        qaMissedCounts: (row.qa_missed_counts || {}) as Record<string, number>,
        typeCounts: (row.type_counts || {}) as Record<string, number>,
        statusCounts: (row.status_counts || {}) as Record<string, number>,
        priorityCounts: (row.priority_counts || {}) as Record<string, number>,
        historyVerificationCounts: (row.history_verification_counts || {}) as Record<string, number>,
      }
    }
  } catch (e) {
    console.warn('[Ticket Bowl] Stats RPC failed, using client aggregation:', e)
  }

  // Fallback
  return {
    totalUniqueTickets: 0,
    totalForwardingEvents: 0,
    repeatForwardedTickets: 0,
    unavailableHistoryTickets: 0,
    currentTestingStatusCounts: {},
    qaMissedCounts: {},
    typeCounts: {},
    statusCounts: {},
    priorityCounts: {},
    historyVerificationCounts: {},
  }
}
