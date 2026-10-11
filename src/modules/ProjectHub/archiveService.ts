// src/modules/ProjectHub/archiveService.ts
// Service layer for Project Data Archive feature.
// Handles: record counts, archive job lifecycle, Excel export, safe deletion.

import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'

// Use the app store user first (already resolved, no lock needed).
// Falls back to getSession() which reads from storage without acquiring
// the Navigator LockManager lock that getUser() requires.
async function getAuthUser(): Promise<{ id: string; email?: string }> {
  const storeUser = useAppStore.getState().user
  if (storeUser) return storeUser
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user
  if (!user) throw new Error('Not authenticated')
  return user
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type ArchiveJobStatus =
  | 'pending'
  | 'exporting'
  | 'awaiting_download_confirmation'
  | 'ready_for_deletion'
  | 'deleting'
  | 'completed'
  | 'failed'

export interface ArchiveJob {
  id: string
  project_id: string
  initiated_by: string
  status: ArchiveJobStatus
  export_started_at: string | null
  export_completed_at: string | null
  export_status: string | null
  support_logs_count: number
  release_logs_count: number
  daily_support_count: number
  daily_release_count: number
  weekly_reports_count: number
  total_records_count: number
  exported_support_ids: string[]
  exported_release_ids: string[]
  exported_daily_support_ids: string[]
  exported_daily_release_ids: string[]
  exported_report_ids: string[]
  deletion_started_at: string | null
  deletion_completed_at: string | null
  deletion_status: string | null
  deleted_support_count: number | null
  deleted_release_count: number | null
  deleted_daily_support_count: number | null
  deleted_daily_release_count: number | null
  deleted_report_count: number | null
  total_deleted_count: number | null
  failure_details: string | null
  created_at: string
  updated_at: string
}

export interface ArchiveRecordCounts {
  support_logs: number
  release_logs: number
  daily_support_logs: number
  daily_release_logs: number
  weekly_reports: number
  total: number
}

// ── Record count queries ──────────────────────────────────────────────────────

export async function fetchArchiveRecordCounts(projectId: string): Promise<ArchiveRecordCounts> {
  const [supportRes, releaseRes, dailySupportRes, dailyReleaseRes, reportsRes] = await Promise.all([
    supabase.from('support_issues').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('release_tasks').select('id', { count: 'exact', head: true }).eq('project_id', projectId).eq('is_deleted', false),
    supabase.from('daily_support_logs').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('daily_release_testing_status').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
    supabase.from('weekly_reports').select('id', { count: 'exact', head: true }).eq('project_id', projectId),
  ])

  if (supportRes.error) throw new Error(`Failed to count support issues: ${supportRes.error.message}`)
  if (releaseRes.error) throw new Error(`Failed to count release tasks: ${releaseRes.error.message}`)
  if (dailySupportRes.error) throw new Error(`Failed to count daily support logs: ${dailySupportRes.error.message}`)
  if (dailyReleaseRes.error) throw new Error(`Failed to count daily release logs: ${dailyReleaseRes.error.message}`)
  if (reportsRes.error) throw new Error(`Failed to count weekly reports: ${reportsRes.error.message}`)

  const support_logs = supportRes.count ?? 0
  const release_logs = releaseRes.count ?? 0
  const daily_support_logs = dailySupportRes.count ?? 0
  const daily_release_logs = dailyReleaseRes.count ?? 0
  const weekly_reports = reportsRes.count ?? 0

  return {
    support_logs,
    release_logs,
    daily_support_logs,
    daily_release_logs,
    weekly_reports,
    total: support_logs + release_logs + daily_support_logs + daily_release_logs + weekly_reports,
  }
}

// ── Fetch latest archive job for a project ────────────────────────────────────

export async function fetchLatestArchiveJob(projectId: string): Promise<ArchiveJob | null> {
  const { data, error } = await supabase
    .from('project_archive_jobs')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch archive job: ${error.message}`)
  return data as ArchiveJob | null
}

export async function fetchArchiveJobById(jobId: string): Promise<ArchiveJob> {
  const { data, error } = await supabase
    .from('project_archive_jobs')
    .select('*')
    .eq('id', jobId)
    .single()

  if (error) throw new Error(`Failed to fetch archive job: ${error.message}`)
  if (!data) throw new Error('Archive job not found')
  return data as ArchiveJob
}

// ── Job lifecycle helpers ─────────────────────────────────────────────────────

async function updateJob(jobId: string, patch: Partial<ArchiveJob>): Promise<ArchiveJob> {
  const { data, error } = await supabase
    .from('project_archive_jobs')
    .update(patch)
    .eq('id', jobId)
    .select()
    .single()

  if (error) throw new Error(`Failed to update archive job: ${error.message}`)
  return data as ArchiveJob
}

// ── Create archive job ────────────────────────────────────────────────────────

export async function createArchiveJob(projectId: string): Promise<ArchiveJob> {
  const user = await getAuthUser()

  const role = useAppStore.getState().role
  const isAdmin = role === 'admin' || role === 'super_admin'

  if (!isAdmin) {
    const { data: membership } = await supabase
      .from('project_members')
      .select('project_role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) throw new Error('You do not have access to this project')
  }

  const { data, error } = await supabase
    .from('project_archive_jobs')
    .insert({ project_id: projectId, initiated_by: user.id, status: 'pending' })
    .select()
    .single()

  if (error) throw new Error(`Failed to create archive job: ${error.message}`)
  return data as ArchiveJob
}

// ── Fetch all records for export ──────────────────────────────────────────────

// QA Operations Hub — Support Issue Tracker (support_issues table)
async function fetchSupportIssues(projectId: string) {
  const { data, error } = await supabase
    .from('support_issues')
    .select('*')
    .eq('project_id', projectId)
    .order('sl_no', { ascending: true })

  if (error) throw new Error(`Failed to fetch support issues: ${error.message}`)
  return data || []
}

// QA Operations Hub — Release Task Tracker (release_tasks table, exclude soft-deleted)
async function fetchReleaseTasks(projectId: string) {
  const { data, error } = await supabase
    .from('release_tasks')
    .select('*')
    .eq('project_id', projectId)
    .eq('is_deleted', false)
    .order('sl_no', { ascending: true })

  if (error) throw new Error(`Failed to fetch release tasks: ${error.message}`)
  return data || []
}

// Daily Update Report — Support & Exception Log (daily_support_logs table)
async function fetchDailySupportLogs(projectId: string) {
  const { data, error } = await supabase
    .from('daily_support_logs')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to fetch daily support logs: ${error.message}`)
  return data || []
}

// Daily Update Report — Release Testing Log (daily_release_testing_status table)
async function fetchDailyReleaseLogs(projectId: string) {
  const { data, error } = await supabase
    .from('daily_release_testing_status')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) throw new Error(`Failed to fetch daily release logs: ${error.message}`)
  return data || []
}

// Daily Update Report — QA Weekly Reports (weekly_reports table)
async function fetchWeeklyReports(projectId: string) {
  const { data, error } = await supabase
    .from('weekly_reports')
    .select('id, user_id, week, project, project_id, generated_date, created_by, status, created_at')
    .eq('project_id', projectId)
    .order('generated_date', { ascending: false })

  if (error) throw new Error(`Failed to fetch weekly reports: ${error.message}`)
  return data || []
}

// ── Excel export ──────────────────────────────────────────────────────────────

function safeVal(v: unknown): string | number {
  if (v === null || v === undefined) return ''
  if (typeof v === 'boolean') return v ? 'Yes' : 'No'
  if (typeof v === 'object') return JSON.stringify(v)
  return v as string | number
}

// QA Operations Hub — Support Issue Tracker sheet
function buildSupportSheet(XLSX: any, rows: any[]) {
  if (rows.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([['No support issues found for this project']])
    return ws
  }
  const headers = [
    'ID', 'Sl. No.', 'Issue ID', 'Product Name', 'Description',
    'Received Date', 'Received Time', 'QA Engineer', 'Is QA Miss?',
    'Test Case Count', 'Estimation (Hrs)', 'Actual Hours', 'Remaining Hrs',
    'Actual Start Date', 'Planned End Date', 'Actual End Date',
    'Blocked Hours', 'Testing Status', 'Comments',
    'Retesting Status', 'Retesting Est. Hrs',
    'Est. Locked', 'Est. Locked By', 'Est. Locked At',
    'Project ID', 'Created By', 'Created At', 'Updated At',
  ]
  const dataRows = rows.map(r => [
    safeVal(r.id), safeVal(r.sl_no), safeVal(r.issue_id), safeVal(r.product_name),
    safeVal(r.description), safeVal(r.received_date), safeVal(r.received_time),
    safeVal(r.tester_name), safeVal(r.is_qa_miss), safeVal(r.test_case_count),
    safeVal(r.estimated_hours), safeVal(r.actual_hours), safeVal(r.remaining_hours),
    safeVal(r.start_date), safeVal(r.planned_end_date), safeVal(r.actual_end_date),
    safeVal(r.blocked_hours), safeVal(r.testing_status), safeVal(r.comments),
    safeVal(r.retesting_status), safeVal(r.retesting_estimation_hrs),
    safeVal(r.estimated_hours_locked), safeVal(r.estimated_hours_locked_by), safeVal(r.estimated_hours_locked_at),
    safeVal(r.project_id), safeVal(r.created_by), safeVal(r.created_at), safeVal(r.updated_at),
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
  ws['!cols'] = headers.map((_, i) => ({ wch: i === 4 ? 45 : i === 3 ? 24 : 18 }))
  ws['!views'] = [{ state: 'frozen', ySplit: 1 }]
  return ws
}

// QA Operations Hub — Release Task Tracker sheet
function buildReleaseSheet(XLSX: any, rows: any[]) {
  if (rows.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([['No release tasks found for this project']])
    return ws
  }
  const headers = [
    'ID', 'Sl. No.', 'Task ID', 'Product Name', 'Release Version', 'Description',
    'Priority', 'Assigned To', 'Task Status',
    'Received Date/Time', 'Actual Start Date', 'Target Date', 'Actual End Date',
    'Test Design Est (Hrs)', 'Data Prep Est (Hrs)', 'Functional Testing Est (Hrs)',
    'Retesting Est (Hrs)', 'Total Estimation (Hrs)', 'Actual Hours',
    'Remaining Hrs', 'Comments',
    'Est. Locked', 'Est. Locked By',
    'Project ID', 'Created By', 'Created At', 'Updated At',
  ]
  const dataRows = rows.map(r => [
    safeVal(r.id), safeVal(r.sl_no), safeVal(r.task_id), safeVal(r.product_name),
    safeVal(r.release_version), safeVal(r.description),
    safeVal(r.priority), safeVal(r.assigned_to_name), safeVal(r.task_status),
    safeVal(r.received_date_time), safeVal(r.start_date), safeVal(r.target_date), safeVal(r.actual_end_date),
    safeVal(r.test_design_est_hrs), safeVal(r.data_prep_est_hrs),
    safeVal(r.functional_testing_est_hrs), safeVal(r.retesting_est_hrs),
    safeVal(r.total_estimation_hrs ?? r.estimated_hours), safeVal(r.actual_hours),
    safeVal(r.remaining_hours), safeVal(r.comments),
    safeVal(r.estimated_hours_locked), safeVal(r.estimated_hours_locked_by),
    safeVal(r.project_id), safeVal(r.created_by), safeVal(r.created_at), safeVal(r.updated_at),
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
  ws['!cols'] = headers.map((_, i) => ({ wch: i === 5 ? 45 : i === 3 ? 24 : 18 }))
  ws['!views'] = [{ state: 'frozen', ySplit: 1 }]
  return ws
}

// Daily Update Report — Support & Exception Log sheet
function buildDailySupportSheet(XLSX: any, rows: any[]) {
  if (rows.length === 0) {
    return XLSX.utils.aoa_to_sheet([['No daily support log records found for this project']])
  }
  const headers = [
    'ID', 'Support ID', 'Bug ID', 'Branch', 'Description',
    'Received Date', 'QA', 'TC Count', 'Estimation (Hrs)',
    'Actual Start Date', 'Planned End Date', 'Actual End Date',
    'Testing Status', 'Issue Source', 'Comments',
    'Blocked Hours', 'Retesting Status', 'Retesting Est. Hrs',
    'Sort Order', 'Project ID', 'User ID', 'Created At', 'Updated At',
  ]
  const dataRows = rows.map(r => [
    safeVal(r.id), safeVal(r.support_id), safeVal(r.bug_id), safeVal(r.branch),
    safeVal(r.description), safeVal(r.received_date), safeVal(r.qa),
    safeVal(r.tc_count), safeVal(r.estimation_hrs),
    safeVal(r.actual_start_date), safeVal(r.planned_end_date), safeVal(r.actual_end_date),
    safeVal(r.testing_status), safeVal(r.issue_source), safeVal(r.comments),
    safeVal(r.blocked_hours), safeVal(r.retesting_status), safeVal(r.retesting_estimation_hrs),
    safeVal(r.sort_order), safeVal(r.project_id), safeVal(r.user_id),
    safeVal(r.created_at), safeVal(r.updated_at),
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
  ws['!cols'] = headers.map((_, i) => ({ wch: i === 4 ? 45 : 18 }))
  ws['!views'] = [{ state: 'frozen', ySplit: 1 }]
  return ws
}

// Daily Update Report — Release Testing Log sheet
function buildDailyReleaseSheet(XLSX: any, rows: any[]) {
  if (rows.length === 0) {
    return XLSX.utils.aoa_to_sheet([['No daily release testing records found for this project']])
  }
  const headers = [
    'ID', 'Task ID', 'Description', 'QA',
    'Initial Round Est. (Hrs)', 'Testing Status',
    'Smoke Testing Status', 'Scope of Testing (Smoke)',
    'Smoke Testing Est. (Hrs)', 'Overall Scope of Testing',
    'Overall Est. (Hrs)', 'Sort Order',
    'Project ID', 'User ID', 'Created At', 'Updated At',
  ]
  const dataRows = rows.map(r => [
    safeVal(r.id), safeVal(r.task_id), safeVal(r.description), safeVal(r.qa),
    safeVal(r.initial_round_estimation_hrs), safeVal(r.testing_status),
    safeVal(r.smoke_testing_status), safeVal(r.scope_of_testing_for_smoke),
    safeVal(r.smoke_testing_estimation_hrs), safeVal(r.overall_scope_of_testing),
    safeVal(r.overall_estimation_hrs), safeVal(r.sort_order),
    safeVal(r.project_id), safeVal(r.user_id), safeVal(r.created_at), safeVal(r.updated_at),
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
  ws['!cols'] = headers.map((_, i) => ({ wch: i === 2 ? 45 : 22 }))
  ws['!views'] = [{ state: 'frozen', ySplit: 1 }]
  return ws
}

function buildReportsSheet(XLSX: any, rows: any[]) {
  if (rows.length === 0) {
    const ws = XLSX.utils.aoa_to_sheet([['No records found for this project']])
    return ws
  }
  const headers = [
    'ID', 'Week', 'Project Name', 'Project ID', 'Generated Date',
    'Created By', 'Status', 'User ID', 'Created At',
  ]
  const dataRows = rows.map(r => [
    safeVal(r.id), safeVal(r.week), safeVal(r.project), safeVal(r.project_id),
    safeVal(r.generated_date), safeVal(r.created_by), safeVal(r.status),
    safeVal(r.user_id), safeVal(r.created_at),
  ])
  const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows])
  ws['!cols'] = headers.map(() => ({ wch: 22 }))
  ws['!views'] = [{ state: 'frozen', ySplit: 1 }]
  return ws
}

function buildSummarySheet(XLSX: any, opts: {
  projectName: string
  projectId: string
  jobId: string
  initiatorEmail: string
  supportCount: number
  releaseCount: number
  dailySupportCount: number
  dailyReleaseCount: number
  reportsCount: number
  exportedAt: string
}) {
  const rows = [
    ['Field', 'Value'],
    ['Archive Job ID', opts.jobId],
    ['Project Name', opts.projectName],
    ['Project ID', opts.projectId],
    ['Export Timestamp', opts.exportedAt],
    ['Initiated By', opts.initiatorEmail],
    ['', ''],
    ['Module', 'Records Exported'],
    ['QA Operations Hub — Support Issue Tracker', opts.supportCount],
    ['QA Operations Hub — Release Task Tracker', opts.releaseCount],
    ['Daily Update Report — Support & Exception Log', opts.dailySupportCount],
    ['Daily Update Report — Release Testing Log', opts.dailyReleaseCount],
    ['Daily Update Report — QA Weekly Reports', opts.reportsCount],
    ['Total Records', opts.supportCount + opts.releaseCount + opts.dailySupportCount + opts.dailyReleaseCount + opts.reportsCount],
    ['', ''],
    ['Export Format', 'Excel (.xlsx)'],
    ['Export Status', 'Success'],
  ]
  const ws = XLSX.utils.aoa_to_sheet(rows)
  ws['!cols'] = [{ wch: 50 }, { wch: 40 }]
  return ws
}

export interface ExportResult {
  job: ArchiveJob
  supportRows: any[]
  releaseRows: any[]
  dailySupportRows: any[]
  dailyReleaseRows: any[]
  reportRows: any[]
}

export async function runExport(
  jobId: string,
  projectId: string,
  projectName: string,
): Promise<ExportResult> {
  const user = await getAuthUser()

  // Transition to exporting
  await updateJob(jobId, {
    status: 'exporting',
    export_started_at: new Date().toISOString(),
  } as any)

  let supportRows: any[] = []
  let releaseRows: any[] = []
  let dailySupportRows: any[] = []
  let dailyReleaseRows: any[] = []
  let reportRows: any[] = []

  try {
    ;[supportRows, releaseRows, dailySupportRows, dailyReleaseRows, reportRows] = await Promise.all([
      fetchSupportIssues(projectId),
      fetchReleaseTasks(projectId),
      fetchDailySupportLogs(projectId),
      fetchDailyReleaseLogs(projectId),
      fetchWeeklyReports(projectId),
    ])
  } catch (err: any) {
    await updateJob(jobId, {
      status: 'failed',
      export_status: 'failed',
      failure_details: err.message,
    } as any)
    throw err
  }

  const supportIds = supportRows.map((r: any) => r.id)
  const releaseIds = releaseRows.map((r: any) => r.id)
  const dailySupportIds = dailySupportRows.map((r: any) => r.id)
  const dailyReleaseIds = dailyReleaseRows.map((r: any) => r.id)
  const reportIds = reportRows.map((r: any) => r.id)

  // Build and download workbook
  try {
    const mod = await import('xlsx')
    const XLSX: any = (mod as any).default ?? mod
    const wb = XLSX.utils.book_new()

    const exportedAt = new Date().toISOString()
    const initiatorEmail =
      user.email ??
      useAppStore.getState().profile?.email ??
      user.id

    XLSX.utils.book_append_sheet(
      wb,
      buildSummarySheet(XLSX, {
        projectName,
        projectId,
        jobId,
        initiatorEmail,
        supportCount: supportRows.length,
        releaseCount: releaseRows.length,
        dailySupportCount: dailySupportRows.length,
        dailyReleaseCount: dailyReleaseRows.length,
        reportsCount: reportRows.length,
        exportedAt,
      }),
      'Archive Summary',
    )
    XLSX.utils.book_append_sheet(wb, buildSupportSheet(XLSX, supportRows), 'Support Issue Tracker')
    XLSX.utils.book_append_sheet(wb, buildReleaseSheet(XLSX, releaseRows), 'Release Task Tracker')
    XLSX.utils.book_append_sheet(wb, buildDailySupportSheet(XLSX, dailySupportRows), 'DUR - Support Log')
    XLSX.utils.book_append_sheet(wb, buildDailyReleaseSheet(XLSX, dailyReleaseRows), 'DUR - Release Testing')
    XLSX.utils.book_append_sheet(wb, buildReportsSheet(XLSX, reportRows), 'QA Weekly Reports')

    const requiredSheets = ['Archive Summary', 'Support Issue Tracker', 'Release Task Tracker', 'DUR - Support Log', 'DUR - Release Testing', 'QA Weekly Reports']
    for (const name of requiredSheets) {
      if (!wb.SheetNames.includes(name)) {
        throw new Error(`Workbook validation failed: missing sheet "${name}"`)
      }
    }

    const stamp = new Date().toISOString().slice(0, 10)
    const safeName = projectName.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 40)
    const filename = `project-archive_${safeName}_${stamp}.xlsx`

    try {
      const XLSXStyle = (await import('xlsx-js-style')).default
      XLSXStyle.writeFile(wb, filename)
    } catch {
      XLSX.writeFile(wb, filename)
    }
  } catch (err: any) {
    await updateJob(jobId, {
      status: 'failed',
      export_status: 'failed',
      failure_details: `Workbook generation failed: ${err.message}`,
    } as any)
    throw new Error(`Export failed: ${err.message}`)
  }

  // Mark export complete, awaiting download confirmation
  const updatedJob = await updateJob(jobId, {
    status: 'awaiting_download_confirmation',
    export_status: 'success',
    export_completed_at: new Date().toISOString(),
    support_logs_count: supportRows.length,
    release_logs_count: releaseRows.length,
    daily_support_count: dailySupportRows.length,
    daily_release_count: dailyReleaseRows.length,
    weekly_reports_count: reportRows.length,
    total_records_count: supportRows.length + releaseRows.length + dailySupportRows.length + dailyReleaseRows.length + reportRows.length,
    exported_support_ids: supportIds,
    exported_release_ids: releaseIds,
    exported_daily_support_ids: dailySupportIds,
    exported_daily_release_ids: dailyReleaseIds,
    exported_report_ids: reportIds,
  } as any)

  return { job: updatedJob, supportRows, releaseRows, dailySupportRows, dailyReleaseRows, reportRows }
}

// ── Confirm download ──────────────────────────────────────────────────────────

export async function confirmDownload(jobId: string): Promise<ArchiveJob> {
  const job = await fetchArchiveJobById(jobId)
  if (job.status !== 'awaiting_download_confirmation') {
    throw new Error(`Cannot confirm download: job is in status "${job.status}"`)
  }
  return updateJob(jobId, { status: 'ready_for_deletion' } as any)
}

// ── Safe deletion ─────────────────────────────────────────────────────────────

export async function runDeletion(jobId: string): Promise<ArchiveJob> {
  const user = await getAuthUser()
  const job = await fetchArchiveJobById(jobId)

  if (job.status !== 'ready_for_deletion') {
    throw new Error(`Cannot delete: job is in status "${job.status}"`)
  }

  const role = useAppStore.getState().role
  const isAdmin = role === 'admin' || role === 'super_admin'
  if (!isAdmin) {
    const { data: membership } = await supabase
      .from('project_members')
      .select('project_role')
      .eq('project_id', job.project_id)
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) throw new Error('You no longer have access to this project')
  }

  // Guard: export must have succeeded
  if (job.export_status !== 'success') {
    throw new Error('Cannot delete: export did not complete successfully')
  }

  // Guard: must have record IDs to delete
  if (
    job.exported_support_ids.length === 0 &&
    job.exported_release_ids.length === 0 &&
    job.exported_daily_support_ids.length === 0 &&
    job.exported_daily_release_ids.length === 0 &&
    job.exported_report_ids.length === 0
  ) {
    // Nothing to delete — mark completed
    return updateJob(jobId, {
      status: 'completed',
      deletion_started_at: new Date().toISOString(),
      deletion_completed_at: new Date().toISOString(),
      deletion_status: 'success',
      deleted_support_count: 0,
      deleted_release_count: 0,
      deleted_daily_support_count: 0,
      deleted_daily_release_count: 0,
      deleted_report_count: 0,
      total_deleted_count: 0,
    } as any)
  }

  // Detect records created/modified after export — exclude them from deletion
  const exportedAt = job.export_completed_at!

  await updateJob(jobId, {
    status: 'deleting',
    deletion_started_at: new Date().toISOString(),
  } as any)

  let deletedSupport = 0
  let deletedRelease = 0
  let deletedDailySupport = 0
  let deletedDailyRelease = 0
  let deletedReports = 0
  const errors: string[] = []

  // Delete support issues
  if (job.exported_support_ids.length > 0) {
    const { error, count } = await supabase
      .from('support_issues')
      .delete({ count: 'exact' })
      .eq('project_id', job.project_id)
      .in('id', job.exported_support_ids)
      .lte('updated_at', exportedAt)
    if (error) errors.push(`Support issues deletion failed: ${error.message}`)
    else deletedSupport = count ?? 0
  }

  // Delete release tasks
  if (job.exported_release_ids.length > 0) {
    const { error, count } = await supabase
      .from('release_tasks')
      .delete({ count: 'exact' })
      .eq('project_id', job.project_id)
      .in('id', job.exported_release_ids)
      .lte('updated_at', exportedAt)
    if (error) errors.push(`Release tasks deletion failed: ${error.message}`)
    else deletedRelease = count ?? 0
  }

  // Delete daily support logs
  if (job.exported_daily_support_ids.length > 0) {
    const { error, count } = await supabase
      .from('daily_support_logs')
      .delete({ count: 'exact' })
      .eq('project_id', job.project_id)
      .in('id', job.exported_daily_support_ids)
      .lte('updated_at', exportedAt)
    if (error) errors.push(`Daily support logs deletion failed: ${error.message}`)
    else deletedDailySupport = count ?? 0
  }

  // Delete daily release testing status
  if (job.exported_daily_release_ids.length > 0) {
    const { error, count } = await supabase
      .from('daily_release_testing_status')
      .delete({ count: 'exact' })
      .eq('project_id', job.project_id)
      .in('id', job.exported_daily_release_ids)
      .lte('updated_at', exportedAt)
    if (error) errors.push(`Daily release logs deletion failed: ${error.message}`)
    else deletedDailyRelease = count ?? 0
  }

  // Delete weekly reports — scoped to snapshot IDs created before export
  if (job.exported_report_ids.length > 0) {
    const { error, count } = await supabase
      .from('weekly_reports')
      .delete({ count: 'exact' })
      .eq('project_id', job.project_id)
      .in('id', job.exported_report_ids)
      .lte('created_at', exportedAt)
    if (error) errors.push(`Weekly reports deletion failed: ${error.message}`)
    else deletedReports = count ?? 0
  }

  const totalDeleted = deletedSupport + deletedRelease + deletedDailySupport + deletedDailyRelease + deletedReports
  const hasErrors = errors.length > 0

  return updateJob(jobId, {
    status: hasErrors ? 'failed' : 'completed',
    deletion_completed_at: new Date().toISOString(),
    deletion_status: hasErrors ? (totalDeleted > 0 ? 'partial' : 'failed') : 'success',
    deleted_support_count: deletedSupport,
    deleted_release_count: deletedRelease,
    deleted_daily_support_count: deletedDailySupport,
    deleted_daily_release_count: deletedDailyRelease,
    deleted_report_count: deletedReports,
    total_deleted_count: totalDeleted,
    failure_details: hasErrors ? errors.join('; ') : null,
  } as any)
}
