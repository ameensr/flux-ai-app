// src/services/openproject-reconciliation.ts
// OpenProject Data Reconciliation Engine
// Compares OpenProject API data vs Supabase database to detect missing tickets,
// incomplete historical activities, and synchronization accuracy issues.

import { supabase } from '@/lib/supabase'
import { fetchAllWorkPackages, type OpenProjectConfig } from './openproject'

export interface ReconciliationResult {
  projectId: string
  opProjectId: number | null
  reconciledAt: string
  
  // Ticket counts
  openProjectTotal: number
  supabaseTotal: number
  missingCount: number
  duplicateCount: number
  
  // Missing ticket IDs (in OpenProject but not in Supabase)
  missingTicketIds: number[]
  
  // Duplicate ticket IDs (multiple rows for same work_package_id)
  duplicateTicketIds: number[]
  
  // History verification breakdown
  verifiedCount: number
  unavailableCount: number
  unverifiedCount: number
  noMatchingEventCount: number
  
  // Forwarding events
  forwardingEventsInDb: number
  ticketsWithForwardingEvents: number
  
  // Overall status
  status: 'healthy' | 'minor_issues' | 'data_mismatch' | 'critical_mismatch'
  issues: string[]
}

export interface TicketSyncDetail {
  workPackageId: number
  inOpenProject: boolean
  inSupabase: boolean
  historyVerificationStatus: string | null
  forwardingCount: number
  lastSyncedAt: string | null
  syncStatus: string | null
  historyError: string | null
}

/**
 * Performs complete reconciliation between OpenProject API and Supabase database.
 * Identifies missing tickets, duplicates, and incomplete historical data.
 */
export async function reconcileProjectData(
  projectId: string,
  opConfig: OpenProjectConfig,
  opProjectId?: number | null,
  opProjectName?: string | null
): Promise<ReconciliationResult> {
  const reconciledAt = new Date().toISOString()
  const issues: string[] = []

  // Step 1: Fetch all work packages from OpenProject
  console.log('[Reconciliation] Fetching work packages from OpenProject...')
  const wpResult = await fetchAllWorkPackages(
    { ...opConfig, openproject_project_id: opProjectId?.toString() },
    { pageSize: 200, concurrency: 4 }
  )
  
  const openProjectTickets = wpResult.items
  const openProjectTotal = openProjectTickets.length
  const openProjectIds = new Set(openProjectTickets.map(wp => wp.id))

  // Step 2: Fetch all work packages from Supabase
  console.log('[Reconciliation] Fetching work packages from Supabase...')
  let supabaseQuery = supabase
    .from('ticket_bowl_work_packages')
    .select('work_package_id, history_verification_status, forwarding_count')
    .eq('project_id', projectId)

  if (opProjectId !== undefined && opProjectId !== null) {
    supabaseQuery = supabaseQuery.eq('op_project_id', opProjectId)
  }

  const { data: supabaseTickets, error: supabaseError } = await supabaseQuery

  if (supabaseError) {
    console.error('[Reconciliation] Failed to fetch Supabase tickets:', supabaseError)
    return {
      projectId,
      opProjectId: opProjectId || null,
      reconciledAt,
      openProjectTotal,
      supabaseTotal: 0,
      missingCount: openProjectTotal,
      duplicateCount: 0,
      missingTicketIds: Array.from(openProjectIds),
      duplicateTicketIds: [],
      verifiedCount: 0,
      unavailableCount: 0,
      unverifiedCount: 0,
      noMatchingEventCount: 0,
      forwardingEventsInDb: 0,
      ticketsWithForwardingEvents: 0,
      status: 'critical_mismatch',
      issues: ['Failed to query Supabase database'],
    }
  }

  const supabaseTotal = supabaseTickets?.length || 0
  const supabaseIds = new Map<number, { historyStatus: string; forwardingCount: number }>()
  const duplicateIds: number[] = []

  // Detect duplicates
  for (const ticket of supabaseTickets || []) {
    const wpId = Number(ticket.work_package_id)
    if (supabaseIds.has(wpId)) {
      duplicateIds.push(wpId)
    } else {
      supabaseIds.set(wpId, {
        historyStatus: ticket.history_verification_status || 'unavailable',
        forwardingCount: ticket.forwarding_count || 0,
      })
    }
  }

  // Step 3: Identify missing tickets (in OpenProject but not in Supabase)
  const missingTicketIds: number[] = []
  for (const opId of openProjectIds) {
    if (!supabaseIds.has(opId)) {
      missingTicketIds.push(opId)
    }
  }

  // Step 4: Count history verification statuses
  let verifiedCount = 0
  let unavailableCount = 0
  let unverifiedCount = 0
  let noMatchingEventCount = 0

  for (const [, ticket] of supabaseIds) {
    switch (ticket.historyStatus) {
      case 'verified':
        verifiedCount++
        break
      case 'unavailable':
        unavailableCount++
        break
      case 'unverified':
        unverifiedCount++
        break
      case 'no_matching_event':
        noMatchingEventCount++
        break
    }
  }

  // Step 5: Count forwarding events in database
  let forwardingQuery = supabase
    .from('ticket_bowl_forwarding_history')
    .select('work_package_id', { count: 'exact', head: false })
    .eq('project_id', projectId)

  if (opProjectId !== undefined && opProjectId !== null) {
    forwardingQuery = forwardingQuery.eq('op_project_id', opProjectId)
  }

  const { data: forwardingData, count: forwardingEventsInDb } = await forwardingQuery

  const uniqueTicketsWithEvents = new Set(
    (forwardingData || []).map(row => Number(row.work_package_id))
  ).size

  // Step 6: Determine overall status and issues
  const missingPercentage = openProjectTotal > 0 ? (missingTicketIds.length / openProjectTotal) * 100 : 0
  const duplicatePercentage = supabaseTotal > 0 ? (duplicateIds.length / supabaseTotal) * 100 : 0
  const unavailablePercentage = supabaseTotal > 0 ? (unavailableCount / supabaseTotal) * 100 : 0

  let status: ReconciliationResult['status'] = 'healthy'

  if (missingPercentage > 10) {
    issues.push(`${missingPercentage.toFixed(1)}% of OpenProject tickets are missing from database`)
    status = 'critical_mismatch'
  } else if (missingPercentage > 3) {
    issues.push(`${missingPercentage.toFixed(1)}% of tickets are missing`)
    if (status === 'healthy') status = 'data_mismatch'
  } else if (missingTicketIds.length > 0) {
    issues.push(`${missingTicketIds.length} tickets are missing`)
    if (status === 'healthy') status = 'minor_issues'
  }

  if (duplicateIds.length > 0) {
    issues.push(`${duplicateIds.length} duplicate ticket IDs detected in database`)
    if (status === 'healthy') status = 'data_mismatch'
  }

  if (unavailablePercentage > 30) {
    issues.push(`${unavailablePercentage.toFixed(1)}% of tickets have unavailable history`)
    if (status === 'healthy') status = 'minor_issues'
  }

  if (openProjectTotal > 0 && supabaseTotal === 0) {
    issues.push('No tickets synced to database')
    status = 'critical_mismatch'
  }

  if (issues.length === 0) {
    issues.push('All data reconciled successfully')
  }

  const result: ReconciliationResult = {
    projectId,
    opProjectId: opProjectId || null,
    reconciledAt,
    openProjectTotal,
    supabaseTotal,
    missingCount: missingTicketIds.length,
    duplicateCount: duplicateIds.length,
    missingTicketIds: missingTicketIds.sort((a, b) => b - a), // Newest first
    duplicateTicketIds: duplicateIds.sort((a, b) => b - a),
    verifiedCount,
    unavailableCount,
    unverifiedCount,
    noMatchingEventCount,
    forwardingEventsInDb: forwardingEventsInDb || 0,
    ticketsWithForwardingEvents: uniqueTicketsWithEvents,
    status,
    issues,
  }

  // Step 7: Optionally persist reconciliation result to database
  await persistReconciliationResult(result, opProjectName)

  return result
}

/**
 * Fetches detailed sync status for all tickets (both in OpenProject and Supabase).
 */
export async function getDetailedTicketSyncStatus(
  projectId: string,
  opConfig: OpenProjectConfig,
  opProjectId?: number | null
): Promise<TicketSyncDetail[]> {
  // Fetch OpenProject tickets
  const wpResult = await fetchAllWorkPackages(
    { ...opConfig, openproject_project_id: opProjectId?.toString() },
    { pageSize: 200, concurrency: 4 }
  )
  const openProjectIds = new Set(wpResult.items.map(wp => wp.id))

  // Fetch Supabase tickets
  let supabaseQuery = supabase
    .from('ticket_bowl_work_packages')
    .select('work_package_id, history_verification_status, forwarding_count, last_synced_at, sync_status, history_error')
    .eq('project_id', projectId)

  if (opProjectId !== undefined && opProjectId !== null) {
    supabaseQuery = supabaseQuery.eq('op_project_id', opProjectId)
  }

  const { data: supabaseTickets } = await supabaseQuery

  const supabaseMap = new Map<number, any>()
  for (const ticket of supabaseTickets || []) {
    supabaseMap.set(Number(ticket.work_package_id), ticket)
  }

  const details: TicketSyncDetail[] = []

  // Add all OpenProject tickets
  for (const opId of openProjectIds) {
    const supabaseTicket = supabaseMap.get(opId)
    details.push({
      workPackageId: opId,
      inOpenProject: true,
      inSupabase: !!supabaseTicket,
      historyVerificationStatus: supabaseTicket?.history_verification_status || null,
      forwardingCount: supabaseTicket?.forwarding_count || 0,
      lastSyncedAt: supabaseTicket?.last_synced_at || null,
      syncStatus: supabaseTicket?.sync_status || null,
      historyError: supabaseTicket?.history_error || null,
    })
  }

  // Add Supabase-only tickets (should not exist, but include for completeness)
  for (const [wpId, ticket] of supabaseMap) {
    if (!openProjectIds.has(wpId)) {
      details.push({
        workPackageId: wpId,
        inOpenProject: false,
        inSupabase: true,
        historyVerificationStatus: ticket.history_verification_status,
        forwardingCount: ticket.forwarding_count || 0,
        lastSyncedAt: ticket.last_synced_at,
        syncStatus: ticket.sync_status,
        historyError: ticket.history_error,
      })
    }
  }

  return details.sort((a, b) => b.workPackageId - a.workPackageId)
}

/**
 * Identifies tickets with incomplete or failed historical activity fetching.
 */
export async function findTicketsWithIncompleteHistory(
  projectId: string,
  opProjectId?: number | null
): Promise<{
  workPackageId: number
  historyVerificationStatus: string
  historyError: string | null
  lastCheckedAt: string | null
  forwardingCount: number
}[]> {
  let query = supabase
    .from('ticket_bowl_work_packages')
    .select('work_package_id, history_verification_status, history_error, history_checked_at, forwarding_count')
    .eq('project_id', projectId)
    .in('history_verification_status', ['unavailable', 'unverified'])

  if (opProjectId !== undefined && opProjectId !== null) {
    query = query.eq('op_project_id', opProjectId)
  }

  const { data } = await query

  return (data || []).map(row => ({
    workPackageId: Number(row.work_package_id),
    historyVerificationStatus: row.history_verification_status,
    historyError: row.history_error,
    lastCheckedAt: row.history_checked_at,
    forwardingCount: row.forwarding_count || 0,
  }))
}

/**
 * Persists reconciliation result to database for historical tracking.
 */
async function persistReconciliationResult(
  result: ReconciliationResult,
  opProjectName: string | null
): Promise<void> {
  try {
    const record = {
      project_id: result.projectId,
      op_project_id: result.opProjectId,
      op_project_name: opProjectName,
      reconciliation_status: result.status,
      openproject_total: result.openProjectTotal,
      supabase_total: result.supabaseTotal,
      missing_count: result.missingCount,
      missing_ticket_ids: result.missingTicketIds,
      duplicate_count: result.duplicateCount,
      duplicate_ticket_ids: result.duplicateTicketIds,
      verified_count: result.verifiedCount,
      unavailable_count: result.unavailableCount,
      unverified_count: result.unverifiedCount,
      forwarding_events_count: result.forwardingEventsInDb,
      issues: result.issues,
      reconciled_at: result.reconciledAt,
    }

    // Update sync status with reconciliation data
    await supabase
      .from('ticket_bowl_sync_status')
      .upsert(
        {
          project_id: result.projectId,
          op_project_id: result.opProjectId,
          reconciliation_status: result.status,
          last_reconciliation_at: result.reconciledAt,
          missing_ticket_ids: result.missingTicketIds,
          duplicate_ticket_ids: result.duplicateTicketIds,
          updated_at: result.reconciledAt,
        },
        { onConflict: 'project_id,op_project_id' }
      )

    console.log('[Reconciliation] Result persisted to database')
  } catch (err) {
    console.error('[Reconciliation] Failed to persist result:', err)
  }
}

/**
 * Fetches reconciliation history for a project.
 */
export async function getReconciliationHistory(
  projectId: string,
  opProjectId?: number | null
): Promise<ReconciliationResult | null> {
  try {
    let query = supabase
      .from('ticket_bowl_sync_status')
      .select('*')
      .eq('project_id', projectId)
      .not('last_reconciliation_at', 'is', null)

    if (opProjectId !== undefined && opProjectId !== null) {
      query = query.eq('op_project_id', opProjectId)
    }

    const { data } = await query.order('last_reconciliation_at', { ascending: false }).limit(1).maybeSingle()

    if (!data || !data.last_reconciliation_at) return null

    return {
      projectId: data.project_id,
      opProjectId: data.op_project_id,
      reconciledAt: data.last_reconciliation_at,
      openProjectTotal: data.openproject_total || 0,
      supabaseTotal: data.supabase_total || 0,
      missingCount: data.missing_count || 0,
      duplicateCount: data.duplicate_count || 0,
      missingTicketIds: data.missing_ticket_ids || [],
      duplicateTicketIds: data.duplicate_ticket_ids || [],
      verifiedCount: data.verified_count || data.history_verified_count || 0,
      unavailableCount: data.unavailable_count || data.history_unavailable_count || 0,
      unverifiedCount: data.unverified_count || data.history_unverified_count || 0,
      noMatchingEventCount: 0,
      forwardingEventsInDb: data.forwarding_events_count || data.forwarding_events_found || 0,
      ticketsWithForwardingEvents: 0,
      status: data.reconciliation_status || 'healthy',
      issues: data.issues || [],
    }
  } catch {
    return null
  }
}
