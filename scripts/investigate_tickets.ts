// scripts/investigate_tickets.ts
// Investigation script for regression tickets 17140, 17003, 16758
// Purpose: Verify Testing Status transition history and date-range filter accuracy

import { createClient } from '@supabase/supabase-js'
import {
  fetchWorkPackageById,
  fetchWorkPackageActivities,
  type OpenProjectConfig,
} from '../src/services/openproject'
import {
  inspectWorkPackageActivities,
  EXACT_FORWARDED_TARGET_VALUE,
} from '../src/services/ticketbowl-service'

// Tickets to investigate (reported missing from October 30, 2026 filter)
const REGRESSION_TICKET_IDS = [17140, 17003, 16758]

// Date range filter being tested
const TARGET_DATE = '2026-10-30'
const TARGET_DATE_FROM = `${TARGET_DATE} 00:00:00`
const TARGET_DATE_TO = `${TARGET_DATE} 23:59:59.999`

interface InvestigationReport {
  ticketId: number
  existsInOpenProject: boolean
  currentTestingStatus: string | null
  forwardingTransitions: {
    activityId: number | null
    changedAt: string
    changedBy: string
    previousStatus: string | null
    newStatus: string
  }[]
  transitionsOnTargetDate: number
  historyVerificationStatus: string
  existsInSupabase: boolean
  supabaseForwardingCount: number
  supabaseHistoryStatus: string | null
  supabaseLastSyncedAt: string | null
  matchesDateFilter: boolean
  issues: string[]
}

async function investigateTicket(
  ticketId: number,
  config: OpenProjectConfig,
  supabase: ReturnType<typeof createClient>,
  projectId: string
): Promise<InvestigationReport> {
  const report: InvestigationReport = {
    ticketId,
    existsInOpenProject: false,
    currentTestingStatus: null,
    forwardingTransitions: [],
    transitionsOnTargetDate: 0,
    historyVerificationStatus: 'unavailable',
    existsInSupabase: false,
    supabaseForwardingCount: 0,
    supabaseHistoryStatus: null,
    supabaseLastSyncedAt: null,
    matchesDateFilter: false,
    issues: [],
  }

  console.log(`\n${'='.repeat(80)}`)
  console.log(`Investigating Ticket #${ticketId}`)
  console.log('='.repeat(80))

  // Step 1: Fetch ticket from OpenProject
  try {
    const ticket = await fetchWorkPackageById(config, ticketId)
    if (!ticket) {
      report.issues.push('Ticket not found in OpenProject')
      console.log(`❌ Ticket #${ticketId} NOT FOUND in OpenProject`)
      return report
    }

    report.existsInOpenProject = true
    
    // Extract current Testing Status
    const testingStatus =
      (ticket._links as any)?.customField14?.title ||
      (ticket._links as any)?.cf_14?.title ||
      (ticket as any).customField14 ||
      (ticket as any).cf_14 ||
      null
    
    report.currentTestingStatus = testingStatus
    console.log(`✓ Ticket exists in OpenProject`)
    console.log(`  Current Testing Status: ${testingStatus || 'None'}`)
  } catch (err) {
    report.issues.push(`Failed to fetch from OpenProject: ${err}`)
    console.log(`❌ Error fetching ticket: ${err}`)
    return report
  }

  // Step 2: Fetch and inspect activity history
  try {
    console.log(`\nFetching activity history...`)
    const activities = await fetchWorkPackageActivities(config, ticketId)
    console.log(`✓ Retrieved ${activities.length} activity entries`)

    const inspection = inspectWorkPackageActivities(ticketId, activities, null)
    report.historyVerificationStatus = inspection.historyStatus
    report.forwardingTransitions = inspection.transitions.map(t => ({
      activityId: t.activityId,
      changedAt: t.changedAt,
      changedBy: t.changedByName,
      previousStatus: t.previousTestingStatus,
      newStatus: t.newTestingStatus,
    }))

    console.log(`\n📊 Historical Testing Status Transitions:`)
    console.log(`   Verification Status: ${inspection.historyStatus}`)
    console.log(`   Total Forwarding Transitions: ${inspection.transitions.length}`)

    if (inspection.transitions.length === 0) {
      console.log(`   ⚠️  NO transitions to "${EXACT_FORWARDED_TARGET_VALUE}" found`)
    } else {
      console.log(`\n   Detailed Transitions:`)
      inspection.transitions.forEach((t, idx) => {
        const timestamp = new Date(t.changedAt)
        const isOnTargetDate = t.changedAt.startsWith(TARGET_DATE)
        
        console.log(`   ${idx + 1}. ${timestamp.toISOString()}`)
        console.log(`      Changed By: ${t.changedByName}`)
        console.log(`      Previous: ${t.previousTestingStatus || 'None'}`)
        console.log(`      New: ${t.newTestingStatus}`)
        console.log(`      Activity ID: ${t.activityId}`)
        console.log(`      On Target Date (${TARGET_DATE}): ${isOnTargetDate ? '✓ YES' : '✗ NO'}`)

        if (isOnTargetDate) {
          report.transitionsOnTargetDate++
          report.matchesDateFilter = true
        }
      })
    }

    if (inspection.error) {
      report.issues.push(`History inspection error: ${inspection.error}`)
    }
  } catch (err) {
    report.issues.push(`Failed to fetch activities: ${err}`)
    console.log(`❌ Error fetching activities: ${err}`)
  }

  // Step 3: Check Supabase database
  try {
    console.log(`\nChecking Supabase database...`)
    const { data: dbTicket } = await supabase
      .from('ticket_bowl_work_packages')
      .select('*')
      .eq('project_id', projectId)
      .eq('work_package_id', ticketId)
      .maybeSingle()

    if (dbTicket) {
      report.existsInSupabase = true
      report.supabaseForwardingCount = dbTicket.forwarding_count || 0
      report.supabaseHistoryStatus = dbTicket.history_verification_status
      report.supabaseLastSyncedAt = dbTicket.last_synced_at

      console.log(`✓ Ticket exists in Supabase`)
      console.log(`  Forwarding Count: ${dbTicket.forwarding_count}`)
      console.log(`  History Status: ${dbTicket.history_verification_status}`)
      console.log(`  Latest Forwarded At: ${dbTicket.latest_forwarded_at || 'None'}`)
      console.log(`  Latest Forwarded By: ${dbTicket.latest_forwarded_by_name || 'None'}`)
      console.log(`  Last Synced At: ${dbTicket.last_synced_at}`)
    } else {
      console.log(`❌ Ticket NOT FOUND in Supabase`)
      report.issues.push('Ticket missing from Supabase database')
    }

    // Check forwarding history table
    const { data: historyRows, count } = await supabase
      .from('ticket_bowl_forwarding_history')
      .select('*', { count: 'exact' })
      .eq('project_id', projectId)
      .eq('work_package_id', ticketId)
      .order('changed_at', { ascending: false })

    if (count && count > 0) {
      console.log(`\n✓ Found ${count} forwarding event(s) in history table:`)
      historyRows?.forEach((row, idx) => {
        const isOnTargetDate = row.changed_at.startsWith(TARGET_DATE)
        console.log(`   ${idx + 1}. ${row.changed_at}`)
        console.log(`      Changed By: ${row.changed_by_name}`)
        console.log(`      Activity ID: ${row.activity_id}`)
        console.log(`      On Target Date: ${isOnTargetDate ? '✓ YES' : '✗ NO'}`)
      })
    } else {
      console.log(`⚠️  No forwarding history entries found in database`)
    }
  } catch (err) {
    report.issues.push(`Failed to query Supabase: ${err}`)
    console.log(`❌ Error querying Supabase: ${err}`)
  }

  // Step 4: Test RPC query with date filter
  try {
    console.log(`\nTesting RPC query with date filter...`)
    const fromIso = `${TARGET_DATE}T00:00:00.000Z`
    const toIso = `${TARGET_DATE}T23:59:59.999Z`

    const { data: rpcResult, error: rpcError } = await supabase.rpc('get_ticket_bowl_work_packages', {
      p_project_id: projectId,
      p_op_project_id: null,
      p_forwarded_from: fromIso,
      p_forwarded_to: toIso,
      p_limit: 100,
      p_offset: 0,
    })

    if (rpcError) {
      console.log(`❌ RPC Error: ${rpcError.message}`)
      report.issues.push(`RPC query failed: ${rpcError.message}`)
    } else {
      const foundInRpc = rpcResult?.some((row: any) => Number(row.work_package_id) === ticketId)
      console.log(`RPC Query Result: ${foundInRpc ? '✓ FOUND' : '✗ NOT FOUND'}`)
      
      if (!foundInRpc && report.matchesDateFilter) {
        report.issues.push('Ticket has transition on target date but RPC query did not return it')
      }
      
      if (foundInRpc) {
        const rpcRow = rpcResult.find((row: any) => Number(row.work_package_id) === ticketId)
        console.log(`  Matched Forwarded At: ${rpcRow?.matched_forwarded_at || 'None'}`)
        console.log(`  Matched Forwarded By: ${rpcRow?.matched_forwarded_by || 'None'}`)
      }
    }
  } catch (err) {
    report.issues.push(`Failed to test RPC: ${err}`)
    console.log(`❌ Error testing RPC: ${err}`)
  }

  // Summary
  console.log(`\n📋 Summary:`)
  console.log(`   Exists in OpenProject: ${report.existsInOpenProject ? 'YES' : 'NO'}`)
  console.log(`   Exists in Supabase: ${report.existsInSupabase ? 'YES' : 'NO'}`)
  console.log(`   Forwarding Transitions Found: ${report.forwardingTransitions.length}`)
  console.log(`   Transitions on ${TARGET_DATE}: ${report.transitionsOnTargetDate}`)
  console.log(`   Should Match Date Filter: ${report.matchesDateFilter ? 'YES' : 'NO'}`)
  console.log(`   Issues: ${report.issues.length}`)
  
  if (report.issues.length > 0) {
    console.log(`\n⚠️  Issues Detected:`)
    report.issues.forEach((issue, idx) => {
      console.log(`   ${idx + 1}. ${issue}`)
    })
  }

  return report
}

async function main() {
  // Load configuration from environment
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
  const openProjectUrl = process.env.OPENPROJECT_URL
  const openProjectApiKey = process.env.OPENPROJECT_API_KEY
  const projectId = process.env.PROJECT_ID // Qaly project UUID

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  if (!openProjectUrl || !openProjectApiKey) {
    console.error('❌ Missing OpenProject credentials. Set OPENPROJECT_URL and OPENPROJECT_API_KEY')
    process.exit(1)
  }

  if (!projectId) {
    console.error('❌ Missing PROJECT_ID. Set the Qaly project UUID')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseKey)
  const opConfig: OpenProjectConfig = {
    openproject_url: openProjectUrl,
    openproject_api_key: openProjectApiKey,
  }

  console.log('\n' + '='.repeat(80))
  console.log('OPENPROJECT TICKET INVESTIGATION SCRIPT')
  console.log('Regression Tickets: 17140, 17003, 16758')
  console.log(`Target Date Filter: ${TARGET_DATE}`)
  console.log('='.repeat(80))

  const reports: InvestigationReport[] = []

  for (const ticketId of REGRESSION_TICKET_IDS) {
    const report = await investigateTicket(ticketId, opConfig, supabase, projectId)
    reports.push(report)
    await new Promise(resolve => setTimeout(resolve, 1000)) // Rate limit protection
  }

  // Final Summary
  console.log('\n\n' + '='.repeat(80))
  console.log('INVESTIGATION COMPLETE - FINAL SUMMARY')
  console.log('='.repeat(80))

  const totalIssues = reports.reduce((sum, r) => sum + r.issues.length, 0)
  const ticketsInOpenProject = reports.filter(r => r.existsInOpenProject).length
  const ticketsInSupabase = reports.filter(r => r.existsInSupabase).length
  const ticketsWithTransitions = reports.filter(r => r.forwardingTransitions.length > 0).length
  const ticketsMatchingDate = reports.filter(r => r.matchesDateFilter).length

  console.log(`\nTickets Investigated: ${REGRESSION_TICKET_IDS.length}`)
  console.log(`Tickets in OpenProject: ${ticketsInOpenProject}`)
  console.log(`Tickets in Supabase: ${ticketsInSupabase}`)
  console.log(`Tickets with Forwarding Transitions: ${ticketsWithTransitions}`)
  console.log(`Tickets Matching Date Filter (${TARGET_DATE}): ${ticketsMatchingDate}`)
  console.log(`Total Issues Found: ${totalIssues}`)

  console.log(`\n📊 Per-Ticket Results:`)
  reports.forEach(r => {
    console.log(`\n  Ticket #${r.ticketId}:`)
    console.log(`    In OpenProject: ${r.existsInOpenProject ? 'YES' : 'NO'}`)
    console.log(`    In Supabase: ${r.existsInSupabase ? 'YES' : 'NO'}`)
    console.log(`    Forwarding Transitions: ${r.forwardingTransitions.length}`)
    console.log(`    Transitions on Target Date: ${r.transitionsOnTargetDate}`)
    console.log(`    Matches Date Filter: ${r.matchesDateFilter ? 'YES' : 'NO'}`)
    console.log(`    Issues: ${r.issues.length}`)
  })

  console.log(`\n${'='.repeat(80)}`)
  console.log('Investigation script completed.')
  console.log('='.repeat(80)}\n`)

  // Export results to JSON
  const fs = await import('fs')
  const outputPath = './ticket_investigation_results.json'
  fs.writeFileSync(outputPath, JSON.stringify(reports, null, 2))
  console.log(`\n✓ Results exported to ${outputPath}`)
}

main().catch(console.error)
