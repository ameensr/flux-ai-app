// scripts/investigate_single_ticket.ts
// Quick diagnostic script to investigate why a specific ticket is missing from Ticket Bowl

import { createClient } from '@supabase/supabase-js'
import {
  fetchWorkPackageById,
  fetchWorkPackageActivities,
  formatWorkPackage,
  type OpenProjectConfig,
} from '../src/services/openproject'

// Configuration - set via environment variables
const TICKET_ID = process.env.TICKET_ID || '17006'
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const OPENPROJECT_URL = process.env.OPENPROJECT_URL
const OPENPROJECT_API_KEY = process.env.OPENPROJECT_API_KEY
const PROJECT_ID = process.env.PROJECT_ID

async function investigateTicket() {
  console.log('\n' + '='.repeat(80))
  console.log(`INVESTIGATING TICKET #${TICKET_ID}`)
  console.log('='.repeat(80))

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing Supabase credentials')
    console.error('Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  if (!OPENPROJECT_URL || !OPENPROJECT_API_KEY) {
    console.error('❌ Missing OpenProject credentials')
    console.error('Set OPENPROJECT_URL and OPENPROJECT_API_KEY')
    process.exit(1)
  }

  if (!PROJECT_ID) {
    console.error('❌ Missing PROJECT_ID')
    console.error('Set the Qaly project UUID')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
  const opConfig: OpenProjectConfig = {
    openproject_url: OPENPROJECT_URL,
    openproject_api_key: OPENPROJECT_API_KEY,
  }

  // STEP 1: Check if ticket exists in OpenProject
  console.log('\n📡 Step 1: Checking OpenProject...')
  let opTicket: any = null
  let opError: string | null = null

  try {
    opTicket = await fetchWorkPackageById(opConfig, TICKET_ID)
    if (!opTicket) {
      console.log(`❌ Ticket #${TICKET_ID} NOT FOUND in OpenProject`)
      opError = 'Ticket does not exist in OpenProject'
    } else {
      console.log(`✅ Ticket #${TICKET_ID} EXISTS in OpenProject`)
      
      const formatted = formatWorkPackage(opTicket)
      console.log(`   Subject: ${formatted.subject}`)
      console.log(`   Type: ${formatted.type}`)
      console.log(`   Status: ${formatted.status}`)
      console.log(`   Project: ${formatted.project}`)
      console.log(`   Testing Status: ${formatted.testingStatus || 'None'}`)
      console.log(`   Created: ${formatted.createdAt}`)
      console.log(`   Updated: ${formatted.updatedAt}`)
      
      // Check if it's a closed/archived status that might be filtered
      const statusLower = formatted.status.toLowerCase()
      if (statusLower.includes('closed') || statusLower.includes('archived') || statusLower.includes('rejected')) {
        console.log(`   ⚠️  Status is "${formatted.status}" - may be excluded from sync`)
      }
    }
  } catch (err) {
    console.log(`❌ Error fetching from OpenProject: ${err}`)
    opError = err instanceof Error ? err.message : 'Unknown error'
  }

  // STEP 2: Check if ticket exists in Supabase
  console.log('\n💾 Step 2: Checking Supabase database...')
  try {
    const { data: dbTicket, error: dbError } = await supabase
      .from('ticket_bowl_work_packages')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .eq('work_package_id', TICKET_ID)
      .maybeSingle()

    if (dbError) {
      console.log(`❌ Database query error: ${dbError.message}`)
    } else if (!dbTicket) {
      console.log(`❌ Ticket #${TICKET_ID} NOT FOUND in Supabase`)
      console.log(`   This ticket has never been synced to the database`)
    } else {
      console.log(`✅ Ticket #${TICKET_ID} EXISTS in Supabase`)
      console.log(`   Subject: ${dbTicket.subject}`)
      console.log(`   Type: ${dbTicket.type_name}`)
      console.log(`   Status: ${dbTicket.status_name}`)
      console.log(`   Testing Status: ${dbTicket.testing_status || 'None'}`)
      console.log(`   Sync Status: ${dbTicket.sync_status}`)
      console.log(`   History Status: ${dbTicket.history_verification_status}`)
      console.log(`   Last Synced: ${dbTicket.last_synced_at}`)
      console.log(`   Forwarding Count: ${dbTicket.forwarding_count}`)
      
      if (dbTicket.history_error) {
        console.log(`   ⚠️  History Error: ${dbTicket.history_error}`)
      }
    }
  } catch (err) {
    console.log(`❌ Database check failed: ${err}`)
  }

  // STEP 3: Check last sync status
  console.log('\n🔄 Step 3: Checking last sync status...')
  try {
    const { data: syncStatus, error: syncError } = await supabase
      .from('ticket_bowl_sync_status')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('started_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (syncError) {
      console.log(`❌ Sync status query error: ${syncError.message}`)
    } else if (!syncStatus) {
      console.log(`⚠️  No sync has been performed for this project yet`)
    } else {
      console.log(`Last Sync:`)
      console.log(`   Status: ${syncStatus.sync_status}`)
      console.log(`   Started: ${syncStatus.started_at}`)
      console.log(`   Completed: ${syncStatus.completed_at || 'N/A'}`)
      console.log(`   Total Fetched: ${syncStatus.total_fetched || 0}`)
      console.log(`   Total Inserted: ${syncStatus.total_inserted || 0}`)
      console.log(`   Total Updated: ${syncStatus.total_updated || 0}`)
      console.log(`   Errors: ${syncStatus.errors_count || 0}`)
      
      if (syncStatus.error_details) {
        console.log(`   ⚠️  Error Details: ${syncStatus.error_details}`)
      }
    }
  } catch (err) {
    console.log(`❌ Sync status check failed: ${err}`)
  }

  // STEP 4: Check reconciliation data
  console.log('\n🔍 Step 4: Checking reconciliation data...')
  try {
    const { data: syncStatus, error } = await supabase
      .from('ticket_bowl_sync_status')
      .select('missing_ticket_ids, openproject_total, supabase_total, missing_count, reconciliation_status')
      .eq('project_id', PROJECT_ID)
      .order('last_reconciliation_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!error && syncStatus) {
      console.log(`Reconciliation Status: ${syncStatus.reconciliation_status || 'Not reconciled'}`)
      console.log(`OpenProject Total: ${syncStatus.openproject_total || 'Unknown'}`)
      console.log(`Supabase Total: ${syncStatus.supabase_total || 'Unknown'}`)
      console.log(`Missing Count: ${syncStatus.missing_count || 'Unknown'}`)
      
      if (syncStatus.missing_ticket_ids && Array.isArray(syncStatus.missing_ticket_ids)) {
        const isMissing = syncStatus.missing_ticket_ids.includes(Number(TICKET_ID))
        if (isMissing) {
          console.log(`✅ Ticket #${TICKET_ID} IS in the missing tickets list`)
        } else {
          console.log(`   Ticket #${TICKET_ID} is NOT in the missing tickets list`)
        }
      }
    }
  } catch (err) {
    console.log(`⚠️  Reconciliation data not available`)
  }

  // STEP 5: Fetch activity history if ticket exists in OP
  if (opTicket) {
    console.log('\n📜 Step 5: Checking activity history...')
    try {
      const activities = await fetchWorkPackageActivities(opConfig, TICKET_ID)
      console.log(`✅ Retrieved ${activities.length} activity entries`)
      
      if (activities.length > 0) {
        console.log(`   First activity: ${activities[0].createdAt}`)
        console.log(`   Last activity: ${activities[activities.length - 1].createdAt}`)
        
        // Check for Testing Status changes
        let testingStatusChanges = 0
        for (const activity of activities) {
          for (const detail of activity.details) {
            const prop = (detail.propertyName || detail.property || '').toLowerCase()
            if (prop.includes('testing') || prop.includes('customfield14') || prop.includes('cf_14')) {
              testingStatusChanges++
            }
          }
        }
        console.log(`   Testing Status changes: ${testingStatusChanges}`)
      } else {
        console.log(`   ⚠️  No activity history available`)
      }
    } catch (err) {
      console.log(`❌ Failed to fetch activity history: ${err}`)
    }
  }

  // FINAL DIAGNOSIS
  console.log('\n' + '='.repeat(80))
  console.log('📋 DIAGNOSIS')
  console.log('='.repeat(80))

  if (!opTicket) {
    console.log(`\n🔴 ROOT CAUSE: Ticket does not exist in OpenProject`)
    console.log(`   • Check if ticket ID ${TICKET_ID} is correct`)
    console.log(`   • Verify OpenProject credentials and project access`)
  } else {
    const { data: dbTicket } = await supabase
      .from('ticket_bowl_work_packages')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .eq('work_package_id', TICKET_ID)
      .maybeSingle()

    if (!dbTicket) {
      console.log(`\n🟠 ROOT CAUSE: Ticket exists in OpenProject but NOT synced to Supabase`)
      console.log(`\nPossible reasons:`)
      console.log(`   1. Pagination bug (FIXED in latest code)`)
      console.log(`   2. Sync never completed successfully`)
      console.log(`   3. Ticket was created after last sync`)
      console.log(`   4. Project filter excludes this ticket's OpenProject project`)
      console.log(`   5. API fetch failed for this specific ticket`)
      
      const formatted = formatWorkPackage(opTicket)
      console.log(`\n💡 RECOMMENDED ACTION:`)
      console.log(`   1. Run a full sync: syncTicketBowlData()`)
      console.log(`   2. Run reconciliation: reconcileProjectData()`)
      console.log(`   3. Check sync logs for errors`)
      console.log(`   4. Verify OpenProject project ID matches: ${formatted.project}`)
    } else {
      console.log(`\n🟢 Ticket exists in both OpenProject and Supabase`)
      console.log(`   Last synced: ${dbTicket.last_synced_at}`)
      console.log(`\n💡 If not appearing in Ticket Bowl UI:`)
      console.log(`   1. Check if filters are excluding it`)
      console.log(`   2. Verify Testing Status: ${dbTicket.testing_status || 'None'}`)
      console.log(`   3. Check forwarding date range filter`)
      console.log(`   4. Verify project selection in UI`)
    }
  }

  console.log('\n' + '='.repeat(80))
}

investigateTicket().catch(console.error)
