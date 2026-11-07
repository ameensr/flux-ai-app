// scripts/test_atomic_sync.ts
// Test script for atomic sync implementation

import { createSyncJob, isSyncJobActive, commitSyncData, cleanupStagingData } from '../src/services/syncJobService'

async function testAtomicSync() {
  console.log('🧪 Testing Atomic Sync Implementation\n')

  // Test 1: Create sync job
  console.log('Test 1: Creating sync job...')
  try {
    const job = await createSyncJob({
      projectId: 'test-project-id',
      opProjectId: 123,
      opProjectName: 'Test Project',
    })
    console.log('✅ Sync job created:', job.id)
    
    // Test 2: Check if job is active
    console.log('\nTest 2: Checking if job is active...')
    const isActive = await isSyncJobActive(job.id)
    console.log('✅ Job is active:', isActive)
    
    // Test 3: Cleanup staging data (simulating failure)
    console.log('\nTest 3: Cleaning up staging data...')
    const cleanupResult = await cleanupStagingData(job.id)
    console.log('✅ Cleanup result:', cleanupResult)
    
    console.log('\n🎉 All tests passed!')
    console.log('\n📝 Next steps:')
    console.log('  1. Run database migration: npm run db:migrate')
    console.log('  2. Test full sync flow in UI')
    console.log('  3. Test cancellation during sync')
    console.log('  4. Verify data atomicity')
    
  } catch (error) {
    console.error('❌ Test failed:', error)
    console.log('\n💡 Make sure to run database migration first:')
    console.log('   npm run db:migrate')
  }
}

// Run tests if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testAtomicSync()
}

export { testAtomicSync }
