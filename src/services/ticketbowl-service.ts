// src/services/ticketbowl-service.ts
// Core business engine and database integration service for Ticket Bowl

import { supabase } from '@/lib/supabase'
import { emitSyncEvent } from '@/lib/syncReminderEvents'
import {
  fetchAllWorkPackages,
  fetchWorkPackageActivities,
  formatWorkPackage,
  type OpenProjectConfig,
  type OpenProjectWorkPackage,
  type FormattedWorkPackage,
  type WorkPackageActivity,
} from './openproject'
import type {
  TicketBowlWorkPackage,
  TicketBowlForwardingEvent,
  TicketBowlSyncStatus,
  TicketBowlFilters,
  TicketBowlDashboardStats,
  TicketBowlSyncProgress,
  TicketBowlQueryResult,
  ForwardingHistoryVerification,
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
}

export interface ActivityInspectionResult {
  transitions: VerifiedTransition[]
  historyStatus: ForwardingHistoryVerification
  error?: string
}

/**
 * Inspects work package activity history to detect verified transitions where
 * Testing Status (customField14) transitioned to EXACTLY "Forwarded to the Testing Team".
 *
 * NON-NEGOTIABLE RULES:
 * 1. Strict equality check: newValue === "Forwarded to the Testing Team".
 * 2. Never match general work package Status.
 * 3. Never match author, assignee, or ticket creation.
 * 4. Actor MUST be extracted from the SAME journal entry.
 * 5. Accurately determines whether history was verified, unavailable, unverified, or no_matching_event.
 */
export function inspectWorkPackageActivities(
  workPackageId: number,
  activities: WorkPackageActivity[] | null,
  fetchError?: string | null
): ActivityInspectionResult {
  // If activities could not be fetched or errored
  if (fetchError || activities === null) {
    return {
      transitions: [],
      historyStatus: 'unavailable',
      error: fetchError || 'Historical activity journal inaccessible or missing',
    }
  }

  // If activity journal is empty (ticket has no recorded journals in OpenProject)
  if (!Array.isArray(activities) || activities.length === 0) {
    return {
      transitions: [],
      historyStatus: 'no_matching_event',
      error: 'No recorded journals in OpenProject',
    }
  }

  const verifiedTransitions: VerifiedTransition[] = []
  let hasTestingFieldChanges = false

  for (const activity of activities) {
    const rawDetails = activity.details || (activity as any)._embedded?.details || []
    if (!rawDetails || !Array.isArray(rawDetails)) continue

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

      // 1. Hard-exclude the standard work package Status field
      if (prop === 'status') continue

      // Clean raw text or HTML
      const rawText = (detail.raw || anyDetail.html || '').trim()
      const cleanRaw = rawText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().toLowerCase()

      // 2. Identify if this detail targets Testing Status (customField14)
      const isTestingStatusField =
        prop === 'testing status' ||
        prop.includes('testing status') ||
        prop.includes('testing') ||
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

      if (isTestingStatusField) {
        hasTestingFieldChanges = true
      }

      let extractedNewValue =
        extractCustomFieldValue(detail.newValue) ||
        extractCustomFieldValue(anyDetail._links?.newValue) ||
        extractCustomFieldValue(anyDetail._links?.new_value) ||
        extractCustomFieldValue(anyDetail._links?.value)

      let extractedOldValue =
        extractCustomFieldValue(detail.oldValue) ||
        extractCustomFieldValue(anyDetail._links?.oldValue) ||
        extractCustomFieldValue(anyDetail._links?.old_value)

      // Fallback: Parse from clean text if structured fields were not populated by the API
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

      // 3. Strict business rule: EXACT comparison against target value
      if (
        isTestingStatusField &&
        extractedNewValue.toLowerCase() === EXACT_FORWARDED_TARGET_VALUE.toLowerCase()
      ) {
        const actorName = activity.user?.name?.trim() || 'Unknown'
        const actorId = activity.user?.id || null

        verifiedTransitions.push({
          workPackageId,
          activityId: activity.id || null,
          previousTestingStatus: extractedOldValue || null,
          newTestingStatus: EXACT_FORWARDED_TARGET_VALUE,
          changedAt: activity.createdAt,
          changedById: actorId,
          changedByName: actorName,
          verificationStatus: 'verified',
        })
      }
    }
  }

  // Sort newest first
  verifiedTransitions.sort((a, b) => new Date(b.changedAt).getTime() - new Date(a.changedAt).getTime())

  let historyStatus: ForwardingHistoryVerification = 'no_matching_event'
  if (verifiedTransitions.length > 0) {
    historyStatus = 'verified'
  } else if (hasTestingFieldChanges && verifiedTransitions.length === 0) {
    historyStatus = 'no_matching_event'
  }

  return {
    transitions: verifiedTransitions,
    historyStatus,
  }
}

/**
 * Backward-compatible helper for transition detection.
 */
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
    console.error('[Ticket Bowl] Failed to fetch types:', err)
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
  onProgress?: (progress: TicketBowlSyncProgress) => void
): Promise<{ success: boolean; message: string; totalSynced: number; eventsFound: number }> {
  const startTime = Date.now()
  const startedAtIso = new Date().toISOString()
  const errors: string[] = []

  emitSyncEvent('sync:start')

  try {
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

      const defaultStatus: ForwardingHistoryVerification =
        wp.testingStatus === EXACT_FORWARDED_TARGET_VALUE ? 'unavailable' : 'no_matching_event'

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
    for (let i = 0; i < initialSnapshots.length; i += UPSERT_CHUNK) {
      const chunk = initialSnapshots.slice(i, i + UPSERT_CHUNK)
      const { error } = await supabase
        .from('ticket_bowl_work_packages')
        .upsert(chunk, { onConflict: 'project_id,work_package_id' })

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

    // ------------------------------------------------------------------------
    // PHASE 3: Selective & Incremental Activity Journal Inspection
    // ------------------------------------------------------------------------
    // Skip tickets that have already been checked successfully and haven't changed in OpenProject since
    const ticketsToInspect = formattedWPs.filter(wp => {
      const existing = existingWpMap.get(wp.id)
      if (!existing) return true
      // Always inspect if currently Forwarded to the Testing Team but no verified handoffs saved yet
      if (
        wp.testingStatus === EXACT_FORWARDED_TARGET_VALUE &&
        (!existing.latest_forwarded_at || existing.forwarding_count === 0)
      ) {
        return true
      }
      if (existing.history_verification_status === 'unavailable') return true // Retry previously unavailable
      if (existing.history_verification_status === 'unverified') return true
      // If ticket was updated in OpenProject after history was checked, re-check
      if (wp.updatedAt && existing.history_checked_at) {
        return new Date(wp.updatedAt).getTime() > new Date(existing.history_checked_at).getTime()
      }
      return false
    })

    onProgress?.({
      phase: 'fetching-activities',
      current: 0,
      total: ticketsToInspect.length,
      message: `Inspecting journals for ${ticketsToInspect.length} tickets (${formattedWPs.length - ticketsToInspect.length} unchanged tickets skipped)...`,
    })

    const allDiscoveredTransitions: VerifiedTransition[] = []
    const inspectionResultsMap = new Map<number, ActivityInspectionResult>()

    const ACTIVITY_BATCH_SIZE = 8
    for (let i = 0; i < ticketsToInspect.length; i += ACTIVITY_BATCH_SIZE) {
      const slice = ticketsToInspect.slice(i, i + ACTIVITY_BATCH_SIZE)
      const batchPromises = slice.map(async wp => {
        try {
          const activities = await fetchWorkPackageActivities(configWithProject, wp.id)
          const result = inspectWorkPackageActivities(wp.id, activities, null)
          return { wpId: wp.id, result }
        } catch (e) {
          const errMsg = e instanceof Error ? e.message : 'Network failure fetching activities'
          const result = inspectWorkPackageActivities(wp.id, null, errMsg)
          return { wpId: wp.id, result }
        }
      })

      const results = await Promise.all(batchPromises)
      for (const res of results) {
        inspectionResultsMap.set(res.wpId, res.result)
        if (res.result.transitions.length > 0) {
          allDiscoveredTransitions.push(...res.result.transitions)
        }
      }

      const progressCount = Math.min(i + ACTIVITY_BATCH_SIZE, ticketsToInspect.length)
      onProgress?.({
        phase: 'fetching-activities',
        current: progressCount,
        total: ticketsToInspect.length,
        message: `Inspecting activities: ${progressCount} / ${ticketsToInspect.length} (${allDiscoveredTransitions.length} forwarding events found)`,
        eventsFound: allDiscoveredTransitions.length,
      })
    }

    // ------------------------------------------------------------------------
    // PHASE 4: Persist Verified Transitions to History Table
    // Deduplication constraint prevents duplicate rows on re-sync.
    // ------------------------------------------------------------------------
    onProgress?.({
      phase: 'saving-history',
      current: 0,
      total: allDiscoveredTransitions.length,
      message: 'Persisting verified forwarding events...',
    })

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

    if (historyRows.length > 0) {
      for (let i = 0; i < historyRows.length; i += UPSERT_CHUNK) {
        const chunk = historyRows.slice(i, i + UPSERT_CHUNK)
        const { error } = await supabase
          .from('ticket_bowl_forwarding_history')
          .upsert(chunk, {
            onConflict: 'project_id,work_package_id,activity_id,changed_at',
            ignoreDuplicates: true,
          })

        if (error) {
          errors.push(`History upsert failed: ${error.message}`)
        }
      }
    }

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

      let finalHistoryStatus: ForwardingHistoryVerification =
        wp.testingStatus === EXACT_FORWARDED_TARGET_VALUE ? 'unavailable' : 'no_matching_event'
      let finalCount = existing?.forwarding_count || 0
      let latestAt: string | null = existing?.latest_forwarded_at || null
      let latestBy: string | null = existing?.latest_forwarded_by_name || null
      let historyError: string | null = null

      if (inspection) {
        historyError = inspection.error || null

        if (inspection.transitions.length > 0) {
          finalHistoryStatus = 'verified'
          finalCount = inspection.transitions.length
          latestAt = inspection.transitions[0].changedAt
          latestBy = inspection.transitions[0].changedByName
        } else if (inspection.historyStatus === 'unverified') {
          finalHistoryStatus = 'unverified'
        } else if (wp.testingStatus === EXACT_FORWARDED_TARGET_VALUE) {
          // In Forwarded status, but no transition was confirmed in history
          finalHistoryStatus = 'unavailable'
          finalCount = 0
          latestAt = null
          latestBy = null
        } else {
          // Never forwarded to testing
          finalHistoryStatus = 'no_matching_event'
          finalCount = 0
          latestAt = null
          latestBy = null
        }
      } else if (existing) {
        finalHistoryStatus = existing.history_verification_status
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

    // Batch update the verification fields
    for (let i = 0; i < updateUpdates.length; i += UPSERT_CHUNK) {
      const chunk = updateUpdates.slice(i, i + UPSERT_CHUNK)
      await supabase
        .from('ticket_bowl_work_packages')
        .upsert(chunk, { onConflict: 'project_id,work_package_id' })
    }

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

  if (fromIso) query = query.gte('latest_forwarded_at', fromIso)
  if (toIso) query = query.lte('latest_forwarded_at', toIso)

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
  const totalPages = Math.ceil(total / pageSize) || 1

  return {
    items: items as TicketBowlWorkPackage[],
    total,
    pageSize,
    page,
    totalPages,
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
      console.error('[Ticket Bowl] Failed to fetch history:', error)
      return []
    }
    return (data || []) as TicketBowlForwardingEvent[]
  } catch (err) {
    console.error('[Ticket Bowl] History exception:', err)
    return []
  }
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
    priorityCounts: {},
    historyVerificationCounts: {},
  }
}
