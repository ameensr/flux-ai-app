// scripts/run_sync.ts
// Quick script to run a full sync and fetch missing tickets

import { syncTicketBowlData } from '../src/services/ticketbowl-service'
import type { OpenProjectConfig } from '../src/services/openproject'

// Configuration - set via environment variables
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
const OPENPROJECT_URL = process.env.OPENPROJECT_URL
const OPENPROJECT_API_KEY = process.env.OPENPROJECT_API_KEY
const PROJECT_ID = 'b7312e63-a565-4d7e-99e9-95617f183b7f' // Your project UUID

async function runSync() {
  console.log('\n' + '='.repeat(80))
  console.log('RUNNING FULL SYNC - FETCHING MISSING TICKETS')
  console.log('='.repeat(80))

  if (!OPENPROJECT_URL || !OPENPROJECT_API_KEY) {
    console.error('❌ Missing OpenProject credentials')
    console.error('Set OPENPROJECT_URL and OPENPROJECT_API_KEY environment variables')
    process.exit(1)
  }

  const opConfig: OpenProjectConfig = {
    openproject_url: OPENPROJECT_URL,
    openproject_api_key: OPENPROJECT_API_KEY,
  }

  console.log('\n📡 Starting sync...')
  console.log(`Project ID: ${PROJECT_ID}`)
  console.log(`OpenProject URL: ${OPENPROJECT_URL}`)

  try {
    const result = await syncTicketBowlData(
      opConfig,
      PROJECT_ID,
      null, // Sync all OpenProject projects
      null,
      (progress) => {
        // Log progress
        const phase = progress.phase.replace(/-/g, ' ').toUpperCase()
        const pct = progress.total > 0 
          ? `${Math.round((progress.current / progress.total) * 100)}%` 
          : 'N/A'
        
        console.log(`[${phase}] ${progress.current}/${progress.total} (${pct}) - ${progress.message}`)
        
        if (progress.ticketsSaved) {
          console.log(`   Tickets saved: ${progress.ticketsSaved}`)
        }
        if (progress.eventsFound) {
          console.log(`   Events found: ${progress.eventsFound}`)
        }
      }
    )

    console.log('\n' + '='.repeat(80))
    if (result.success) {
      console.log('✅ SYNC COMPLETED SUCCESSFULLY')
      console.log(`   Total synced: ${result.totalSynced}`)
      console.log(`   Events found: ${result.eventsFound}`)
      console.log(`   Message: ${result.message}`)
    } else {
      console.log('❌ SYNC FAILED')
      console.log(`   Message: ${result.message}`)
    }
    console.log('='.repeat(80))

    console.log('\n📊 Verification:')
    console.log('Run this SQL query to verify tickets 17006, 17007, 17008 now exist:')
    console.log('')
    console.log('SELECT work_package_id, subject, status_name, last_synced_at')
    console.log('FROM ticket_bowl_work_packages')
    console.log(`WHERE project_id = '${PROJECT_ID}'`)
    console.log('  AND work_package_id IN (17006, 17007, 17008)')
    console.log('ORDER BY work_package_id;')
    console.log('')
    console.log('Expected: 3 rows returned')

  } catch (err) {
    console.error('\n❌ Sync error:', err)
    if (err instanceof Error) {
      console.error('Error message:', err.message)
      console.error('Stack trace:', err.stack)
    }
    process.exit(1)
  }
}

runSync()
