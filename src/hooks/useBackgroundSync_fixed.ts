// Fixed import - copy this to useBackgroundSync.ts

import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import type { OpenProjectConfig } from '@/services/openproject'
import {
  syncTicketBowlData,
  fetchTicketBowlSyncStatus,
} from '@/services/ticketbowl-service'
import type { 
  TicketBowlSyncStatus,
  TicketBowlSyncProgress 
} from '@/modules/TicketBowl/types'
import {
  createSyncJob,
  getActiveSyncJob,
  updateSyncJob,
  startSyncJob,
  completeSyncJob,
  failSyncJob,
  cancelSyncJob,
  subscribeSyncJob,
  type SyncJob,
} from '@/services/syncJobService'
import { emitSyncEvent } from '@/lib/syncReminderEvents'
import { setLastSyncTimestamp } from '@/lib/syncReminderConfig'
import { useAppStore } from '@/store/useAppStore'

// Remove: progressToJobUpdate (doesn't exist)
// Move: TicketBowlSyncStatus, TicketBowlSyncProgress to types import

// In completeSyncJob call, change from:
// await completeSyncJob(jobId, result.totalSynced, result.eventsFound)
// To:
// await completeSyncJob(jobId, { totalSynced: result.totalSynced, eventsFound: result.eventsFound })

// In updateSyncJob calls, change from:
// await updateSyncJob(jobId, progressToJobUpdate(progress))
// To:
// await updateSyncJob(jobId, {
//   phase: progress.phase,
//   progress_current: progress.current,
//   progress_total: progress.total,
//   progress_message: progress.message || null,
// })
