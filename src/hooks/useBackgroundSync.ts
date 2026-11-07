// src/hooks/useBackgroundSync.ts
// Hook for managing background synchronization with non-blocking UI

import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import type { OpenProjectConfig } from '@/services/openproject'
import {
  syncTicketBowlData,
  fetchTicketBowlSyncStatus,
} from '@/services/ticketbowl-service'
import type {
  TicketBowlSyncStatus,
  TicketBowlSyncProgress,
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
  progressToJobUpdate,
  type SyncJob,
} from '@/services/syncJobService'
import { emitSyncEvent } from '@/lib/syncReminderEvents'
import { setLastSyncTimestamp } from '@/lib/syncReminderConfig'
import { useAppStore } from '@/store/useAppStore'

export interface UseBackgroundSyncOptions {
  projectId: string
  opProjectId?: number | null
  opProjectName?: string | null
  config?: OpenProjectConfig | null
  autoRestoreJob?: boolean
}

export interface BackgroundSyncState {
  isSyncing: boolean
  syncProgress: TicketBowlSyncProgress | null
  showProgressIndicator: boolean
  showSuccessNotification: boolean
  showErrorNotification: boolean
  syncResult: {
    totalSynced: number
    eventsFound: number
    errorMessage?: string
  } | null
  currentJob: SyncJob | null
}

export function useBackgroundSync({
  projectId,
  opProjectId,
  opProjectName,
  config,
  autoRestoreJob = true,
}: UseBackgroundSyncOptions) {
  const { toast } = useToast()
  const user = useAppStore(s => s.user)

  const [state, setState] = useState<BackgroundSyncState>({
    isSyncing: false,
    syncProgress: null,
    showProgressIndicator: false,
    showSuccessNotification: false,
    showErrorNotification: false,
    syncResult: null,
    currentJob: null,
  })

  const currentJobIdRef = useRef<string | null>(null)
  const unsubscribeRef = useRef<(() => void) | null>(null)

  // Load sync status
  const [syncStatus, setSyncStatus] = useState<TicketBowlSyncStatus | null>(null)

  const loadSyncStatus = useCallback(async () => {
    if (!projectId) return // Guard against empty projectId
    const status = await fetchTicketBowlSyncStatus(projectId, opProjectId)
    setSyncStatus(status)
  }, [projectId, opProjectId])

  // Check for existing active job on mount
  useEffect(() => {
    if (!autoRestoreJob || !projectId) return

    const checkActiveJob = async () => {
      const activeJob = await getActiveSyncJob(projectId)

      if (activeJob && (activeJob.status === 'running' || activeJob.status === 'pending')) {
        // Restore active job state
        currentJobIdRef.current = activeJob.id

        setState(prev => ({
          ...prev,
          isSyncing: true,
          showProgressIndicator: true,
          currentJob: activeJob,
          syncProgress: {
            phase: (activeJob.phase || 'fetching-tickets') as TicketBowlSyncProgress['phase'],
            current: activeJob.progress_current,
            total: activeJob.progress_total,
            message: activeJob.progress_message || 'Synchronizing...',
          },
        }))

        // Subscribe to job updates
        subscribeToJob(activeJob.id)
      }
    }

    checkActiveJob()
  }, [autoRestoreJob, projectId])

  // Subscribe to sync job updates
  const subscribeToJob = useCallback((jobId: string) => {
    // Unsubscribe from previous job if any
    if (unsubscribeRef.current) {
      unsubscribeRef.current()
    }

    const channel = subscribeSyncJob(jobId, (updatedJob) => {
      // Extract totals from result_summary if available
      const totalSynced = updatedJob.result_summary?.totalSynced ?? 0
      const eventsFound = updatedJob.result_summary?.eventsFound ?? 0

      setState(prev => ({
        ...prev,
        currentJob: updatedJob,
        syncProgress: updatedJob.status === 'running' ? {
          phase: (updatedJob.phase || 'fetching-tickets') as TicketBowlSyncProgress['phase'],
          current: updatedJob.progress_current,
          total: updatedJob.progress_total,
          message: updatedJob.progress_message || 'Synchronizing...',
          ticketsSaved: totalSynced,
          eventsFound: eventsFound,
        } : null,
      }))

      // Handle job completion
      if (updatedJob.status === 'completed') {
        handleSyncSuccess(totalSynced, eventsFound)
      } else if (updatedJob.status === 'failed') {
        handleSyncError(updatedJob.error_message || 'Synchronization failed')
      }
    })
  }, [])

  // Cleanup subscription on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current()
      }
    }
  }, [])

  // Handle sync success
  const handleSyncSuccess = useCallback((totalSynced: number, eventsFound: number) => {
    setState(prev => ({
      ...prev,
      isSyncing: false,
      showProgressIndicator: false,
      showSuccessNotification: true,
      syncResult: { totalSynced, eventsFound },
    }))

    // Update last sync timestamp
    if (user?.id) {
      setLastSyncTimestamp(user.id, new Date().toISOString())
    }

    // Emit success event
    emitSyncEvent('sync:success')

    // Refresh sync status
    loadSyncStatus()

    // Clear job reference
    currentJobIdRef.current = null
  }, [user, loadSyncStatus])

  // Handle sync error
  const handleSyncError = useCallback((errorMessage: string) => {
    setState(prev => ({
      ...prev,
      isSyncing: false,
      showProgressIndicator: false,
      showErrorNotification: true,
      syncResult: { totalSynced: 0, eventsFound: 0, errorMessage },
    }))

    // Emit failure event
    emitSyncEvent('sync:fail')

    // Clear job reference
    currentJobIdRef.current = null
  }, [])

  // Start background synchronization
  const startSync = useCallback(async () => {
    if (!config?.openproject_url || !config?.openproject_api_key) {
      toast({
        title: 'OpenProject Not Configured',
        description: 'Please configure your OpenProject API credentials in Project Hub first.',
        variant: 'destructive',
      })
      return
    }

    // Check if already syncing
    if (state.isSyncing || currentJobIdRef.current) {
      toast({
        title: 'Sync Already Running',
        description: 'A synchronization is already in progress for this project.',
      })
      return
    }

    // Create sync job
    const job = await createSyncJob({
      projectId,
      opProjectId,
      opProjectName,
    })

    if (!job) {
      toast({
        title: 'Failed to Start Sync',
        description: 'Could not create synchronization job. Please try again.',
        variant: 'destructive',
      })
      return
    }

    currentJobIdRef.current = job.id

    setState(prev => ({
      ...prev,
      isSyncing: true,
      showProgressIndicator: true,
      currentJob: job,
      syncProgress: {
        phase: 'fetching-tickets',
        current: 0,
        total: 0,
        message: 'Starting Ticket Bowl synchronization...',
      },
    }))

    // Subscribe to job updates
    subscribeToJob(job.id)

    // Emit sync start event
    emitSyncEvent('sync:start')

    // Start actual synchronization in background
    performSync(job.id, config)
  }, [config, projectId, opProjectId, opProjectName, state.isSyncing, toast, subscribeToJob])

  // Perform actual synchronization
  const performSync = async (
    jobId: string,
    syncConfig: OpenProjectConfig
  ) => {
    try {
      // Mark job as started
      await startSyncJob(jobId)

      // Perform sync with progress updates
      const result = await syncTicketBowlData(
        syncConfig,
        projectId,
        opProjectId,
        opProjectName,
        async (progress) => {
          // Update job progress in database
          await updateSyncJob(jobId, {
            phase: progress.phase,
            progress_current: progress.current,
            progress_total: progress.total,
            progress_message: progress.message || null,
          })
        },
        {
          useIncrementalActivities: true,
          jobId: jobId // Pass job ID for atomic commits and cancellation
        }
      )

      if (result.success) {
        // Mark job as completed
        await completeSyncJob(jobId, {
          totalSynced: result.totalSynced,
          eventsFound: result.eventsFound,
        })
      } else {
        // Mark job as failed
        await failSyncJob(jobId, result.message)
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Synchronization failed'
      await failSyncJob(jobId, errorMsg)
    }
  }

  // Dismiss notifications
  const dismissSuccessNotification = useCallback(() => {
    setState(prev => ({
      ...prev,
      showSuccessNotification: false,
      syncResult: null,
    }))
  }, [])

  const dismissErrorNotification = useCallback(() => {
    setState(prev => ({
      ...prev,
      showErrorNotification: false,
      syncResult: null,
    }))
  }, [])

  // Retry sync after error
  const retrySync = useCallback(() => {
    dismissErrorNotification()
    startSync()
  }, [dismissErrorNotification, startSync])

  // Cancel an active sync job
  const cancelSync = useCallback(async () => {
    // Get job ID from ref or state
    const jobId = currentJobIdRef.current || state.currentJob?.id
    
    if (!jobId) {
      console.warn('[useBackgroundSync] No active job to cancel')
      // Still reset the UI state
      setState(prev => ({
        ...prev,
        isSyncing: false,
        showProgressIndicator: false,
        syncProgress: null,
        currentJob: null,
      }))
      return
    }

    // Confirm cancellation
    const confirmed = window.confirm(
      'Are you sure you want to cancel the synchronization?\n\nThe sync will stop and any progress will be lost.'
    )

    if (!confirmed) return

    const success = await cancelSyncJob(jobId)

    // Always reset UI state on cancel attempt
    setState(prev => ({
      ...prev,
      isSyncing: false,
      showProgressIndicator: false,
      syncProgress: null,
      currentJob: null,
    }))

    currentJobIdRef.current = null

    if (success) {
      toast({
        title: 'Sync Cancelled',
        description: 'The synchronization has been cancelled successfully.',
      })

      // Emit cancel event
      emitSyncEvent('sync:fail')
    } else {
      toast({
        title: 'Sync Stopped',
        description: 'The synchronization has been stopped. It may have already completed or failed.',
      })
    }
  }, [toast, state.currentJob])

  return {
    // State
    isSyncing: state.isSyncing,
    syncProgress: state.syncProgress,
    showProgressIndicator: state.showProgressIndicator,
    showSuccessNotification: state.showSuccessNotification,
    showErrorNotification: state.showErrorNotification,
    syncResult: state.syncResult,
    currentJob: state.currentJob,
    syncStatus,

    // Actions
    startSync,
    cancelSync,
    retrySync,
    dismissSuccessNotification,
    dismissErrorNotification,
    loadSyncStatus,
  }
}

