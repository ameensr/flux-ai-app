import { supabase } from '@/lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export type SyncJobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface SyncJob {
  id: string
  project_id: string
  op_project_id: number | null
  op_project_name: string | null
  status: SyncJobStatus
  phase: string | null
  progress_current: number
  progress_total: number
  progress_message: string | null
  started_at: string | null
  completed_at: string | null
  error_message: string | null
  result_summary: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface SyncJobProgress {
  phase: string
  current: number
  total: number
  message?: string
}

export interface CreateSyncJobParams {
  projectId: string
  opProjectId?: number | null
  opProjectName?: string | null
}

export interface UpdateSyncJobParams {
  status?: SyncJobStatus
  phase?: string | null
  progress_current?: number
  progress_total?: number
  progress_message?: string | null
  error_message?: string | null
  result_summary?: Record<string, any> | null
  started_at?: string | null
  completed_at?: string | null
}

/**
 * Creates a new sync job record
 */
export async function createSyncJob(params: CreateSyncJobParams): Promise<SyncJob | null> {
  const { projectId, opProjectId, opProjectName } = params

  try {
    // First, check if there's already an active job and clean it up if stuck
    const existingJob = await getActiveSyncJob(projectId)
    if (existingJob) {
      // Check if the job is stuck (running for more than 30 minutes)
      const jobAge = Date.now() - new Date(existingJob.created_at).getTime()
      const thirtyMinutes = 30 * 60 * 1000
      
      if (jobAge > thirtyMinutes) {
        // Mark stuck job as failed
        await supabase
          .from('sync_jobs')
          .update({
            status: 'failed',
            error_message: 'Job timed out (stuck for more than 30 minutes)',
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingJob.id)
        console.log('[SyncJobService] Cleaned up stuck job:', existingJob.id)
      } else {
        // Job is still active, return it instead of creating a new one
        console.log('[SyncJobService] Active job already exists:', existingJob.id)
        return existingJob
      }
    }

    const { data, error } = await supabase
      .from('sync_jobs')
      .insert({
        project_id: projectId,
        op_project_id: opProjectId,
        op_project_name: opProjectName,
        status: 'pending',
        phase: null,
        progress_current: 0,
        progress_total: 0,
        progress_message: null,
      })
      .select()
      .single()

    if (error) {
      // Handle duplicate key error gracefully
      if (error.code === '23505') {
        console.warn('[SyncJobService] Sync job already exists for this project')
        // Try to get the existing active job
        const activeJob = await getActiveSyncJob(projectId)
        return activeJob
      }
      console.error('[SyncJobService] Failed to create sync job:', error)
      return null
    }

    return data as SyncJob
  } catch (err) {
    console.error('[SyncJobService] Exception creating sync job:', err)
    return null
  }
}

/**
 * Gets a sync job by ID
 */
export async function getSyncJob(jobId: string): Promise<SyncJob | null> {
  if (!jobId || jobId.trim() === '') {
    console.warn('[SyncJobService] getSyncJob called with empty jobId')
    return null
  }

  const { data, error } = await supabase
    .from('sync_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('[SyncJobService] Failed to get sync job:', error)
    throw new Error(`Failed to get sync job: ${error.message}`)
  }

  return data as SyncJob
}

/**
 * Gets the active sync job for a project (if any)
 */
export async function getActiveSyncJob(projectId: string): Promise<SyncJob | null> {
  // Guard against empty projectId
  if (!projectId || projectId.trim() === '') {
    console.debug('[SyncJobService] getActiveSyncJob called with empty projectId - skipping')
    return null
  }

  try {
    // Try RPC first
    const { data: rpcData, error: rpcError } = await supabase.rpc('get_active_sync_job', {
      p_project_id: projectId,
    })

    if (!rpcError && rpcData) {
      // RPC returns an array, get the first item
      const job = Array.isArray(rpcData) ? rpcData[0] : rpcData
      return job as SyncJob | null
    }

    // If RPC fails, fall back to direct query
    if (rpcError) {
      console.warn('[SyncJobService] RPC get_active_sync_job failed, using direct query:', rpcError.message)
    }

    // Fallback: direct table query
    const { data, error } = await supabase
      .from('sync_jobs')
      .select('*')
      .eq('project_id', projectId)
      .in('status', ['pending', 'running'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('[SyncJobService] Failed to get active sync job:', error)
      return null
    }

    return data as SyncJob | null
  } catch (err) {
    console.error('[SyncJobService] Exception calling getActiveSyncJob:', err)
    return null
  }
}

/**
 * Updates a sync job
 */
export async function updateSyncJob(
  jobId: string,
  updates: UpdateSyncJobParams
): Promise<void> {
  const { error } = await supabase
    .from('sync_jobs')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('id', jobId)

  if (error) {
    console.error('[SyncJobService] Failed to update sync job:', error)
    throw new Error(`Failed to update sync job: ${error.message}`)
  }
}

/**
 * Marks a sync job as running
 */
export async function startSyncJob(jobId: string): Promise<void> {
  await updateSyncJob(jobId, {
    status: 'running',
    started_at: new Date().toISOString(),
  })
}

/**
 * Marks a sync job as completed
 */
export async function completeSyncJob(
  jobId: string,
  resultSummary?: Record<string, any>
): Promise<void> {
  await updateSyncJob(jobId, {
    status: 'completed',
    completed_at: new Date().toISOString(),
    result_summary: resultSummary,
  })
}

/**
 * Marks a sync job as failed
 */
export async function failSyncJob(jobId: string, errorMessage: string): Promise<void> {
  await updateSyncJob(jobId, {
    status: 'failed',
    completed_at: new Date().toISOString(),
    error_message: errorMessage,
  })
}

/**
 * Cancels a sync job
 */
export async function cancelSyncJob(jobId: string): Promise<boolean> {
  try {
    // Try RPC first
    const { data, error } = await supabase.rpc('cancel_sync_job', {
      p_job_id: jobId,
    })

    if (!error && data?.success === true) {
      return true
    }

    // If RPC fails, fall back to direct update
    if (error) {
      console.warn('[SyncJobService] RPC cancel_sync_job failed, using direct update:', error.message)
    }

    // Fallback: direct table update
    const { error: updateError } = await supabase
      .from('sync_jobs')
      .update({
        status: 'cancelled',
        completed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        error_message: 'Cancelled by user',
      })
      .eq('id', jobId)
      .in('status', ['pending', 'running'])

    if (updateError) {
      console.error('[SyncJobService] Failed to cancel sync job via direct update:', updateError)
      return false
    }

    return true
  } catch (err) {
    console.error('[SyncJobService] Exception cancelling sync job:', err)
    return false
  }
}

/**
 * Updates sync job progress
 */
export async function updateSyncJobProgress(
  jobId: string,
  progress: SyncJobProgress
): Promise<void> {
  await updateSyncJob(jobId, {
    phase: progress.phase,
    progress_current: progress.current,
    progress_total: progress.total,
    progress_message: progress.message || null,
  })
}

/**
 * Subscribes to real-time sync job updates
 */
export function subscribeSyncJob(
  jobId: string,
  callback: (job: SyncJob) => void
): RealtimeChannel {
  const channel = supabase
    .channel(`sync_job_${jobId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sync_jobs',
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        callback(payload.new as SyncJob)
      }
    )
    .subscribe()

  return channel
}

/**
 * Unsubscribes from sync job updates
 */
export function unsubscribeSyncJob(channel: RealtimeChannel): void {
  supabase.removeChannel(channel)
}

/**
 * Checks if a job is still running (not cancelled/failed/completed)
 */
export async function isSyncJobActive(jobId: string): Promise<boolean> {
  const job = await getSyncJob(jobId)
  if (!job) return false
  return job.status === 'running' || job.status === 'pending'
}

/**
 * Commits staging data to production tables (atomic operation)
 */
export async function commitSyncData(
  jobId: string,
  projectId: string
): Promise<{
  success: boolean
  message: string
  wp_inserted: number
  wp_updated: number
  fwd_inserted: number
  status_inserted: number
}> {
  const { data, error } = await supabase.rpc('commit_sync_data', {
    p_job_id: jobId,
    p_project_id: projectId,
  })

  if (error) {
    console.error('[SyncJobService] Failed to commit sync data:', error)
    throw new Error(`Failed to commit sync data: ${error.message}`)
  }

  return data as {
    success: boolean
    message: string
    wp_inserted: number
    wp_updated: number
    fwd_inserted: number
    status_inserted: number
  }
}

/**
 * Cleans up staging data for a job (used on failure/cancellation)
 */
export async function cleanupStagingData(jobId: string): Promise<{
  success: boolean
  message: string
  wp_deleted: number
  fwd_deleted: number
  status_deleted: number
}> {
  const { data, error } = await supabase.rpc('cleanup_staging_data', {
    p_job_id: jobId,
  })

  if (error) {
    console.error('[SyncJobService] Failed to cleanup staging data:', error)
    throw new Error(`Failed to cleanup staging data: ${error.message}`)
  }

  return data as {
    success: boolean
    message: string
    wp_deleted: number
    fwd_deleted: number
    status_deleted: number
  }
}

/**
 * Converts TicketBowlSyncProgress to UpdateSyncJobParams
 */
export function progressToJobUpdate(progress: {
  phase: string
  current: number
  total: number
  message?: string
}): UpdateSyncJobParams {
  return {
    phase: progress.phase,
    progress_current: progress.current,
    progress_total: progress.total,
    progress_message: progress.message || null,
  }
}
