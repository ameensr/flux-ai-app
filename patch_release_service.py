import re

path = '/home/u1519/ASR/Flux-APP/flux-ai-app/src/modules/ReleaseTaskTracker/releaseTrackerService.ts'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add computeTotalEstimation to the import from types
content = content.replace(
    "import {\n  DEFAULT_TASK_STATUSES,\n  DEFAULT_PRIORITIES,\n  DEFAULT_ASSIGNED_TO_OPTIONS,\n  calculateEffort\n} from './types'",
    "import {\n  DEFAULT_TASK_STATUSES,\n  DEFAULT_PRIORITIES,\n  DEFAULT_ASSIGNED_TO_OPTIONS,\n  calculateEffort,\n  computeTotalEstimation\n} from './types'"
)

# 2. In fetchReleaseTasks DB mapping, add new fields
OLD_MAPPING = """          actual_hours: act,
          remaining_hours: effort.remainingHrs,
          overrun_hours: effort.overrunHrs,
          task_status: (d.task_status as TaskStatusType) || 'Not Started',
          comments: d.comments || '',
          is_deleted: d.is_deleted || false,
          created_by: d.created_by || null,
          created_at: d.created_at || new Date().toISOString(),
          updated_at: d.updated_at || new Date().toISOString()
        }"""

NEW_MAPPING = """          actual_hours: act,
          remaining_hours: effort.remainingHrs,
          overrun_hours: effort.overrunHrs,
          task_status: (d.task_status as TaskStatusType) || 'Not Started',
          comments: d.comments || '',
          received_date_time: d.received_date_time || null,
          actual_end_date: d.actual_end_date || null,
          test_design_est_hrs: Number(d.test_design_est_hrs) || 0,
          data_prep_est_hrs: Number(d.data_prep_est_hrs) || 0,
          functional_testing_est_hrs: Number(d.functional_testing_est_hrs) || 0,
          retesting_est_hrs: Number(d.retesting_est_hrs) || 0,
          total_estimation_hrs: computeTotalEstimation({
            test_design_est_hrs: Number(d.test_design_est_hrs) || 0,
            data_prep_est_hrs: Number(d.data_prep_est_hrs) || 0,
            functional_testing_est_hrs: Number(d.functional_testing_est_hrs) || 0,
            retesting_est_hrs: Number(d.retesting_est_hrs) || 0
          }),
          is_deleted: d.is_deleted || false,
          created_by: d.created_by || null,
          created_at: d.created_at || new Date().toISOString(),
          updated_at: d.updated_at || new Date().toISOString()
        }"""

content = content.replace(OLD_MAPPING, NEW_MAPPING)

# 3. In saveReleaseTask, compute total from components
OLD_EST_CALC = "  const isEdit = Boolean(taskInput.id && allTasks.some(t => t.id === taskInput.id))\n  const est = Math.max(0, Number(taskInput.estimated_hours) || 0)"
NEW_EST_CALC = """  const isEdit = Boolean(taskInput.id && allTasks.some(t => t.id === taskInput.id))
  const testDesign = Math.max(0, Number((taskInput as any).test_design_est_hrs) || 0)
  const dataPrep   = Math.max(0, Number((taskInput as any).data_prep_est_hrs) || 0)
  const funcTest   = Math.max(0, Number((taskInput as any).functional_testing_est_hrs) || 0)
  const retesting  = Math.max(0, Number((taskInput as any).retesting_est_hrs) || 0)
  const totalEst   = Math.round((testDesign + dataPrep + funcTest + retesting) * 100) / 100
  // est mirrors totalEst for backward compat with calculateEffort
  const est = totalEst"""
content = content.replace(OLD_EST_CALC, NEW_EST_CALC)

# 4. In saveReleaseTask edit branch, add new fields to savedTask
OLD_EDIT_TASK = """      estimated_hours: existing?.estimated_hours_locked ? Number(existing.estimated_hours) : est,
      estimated_hours_locked: existing?.estimated_hours_locked ?? false,
      estimated_hours_locked_by: existing?.estimated_hours_locked_by ?? null,
      estimated_hours_locked_at: existing?.estimated_hours_locked_at ?? null,
      actual_hours: act,
      remaining_hours: effort.remainingHrs,
      overrun_hours: effort.overrunHrs,
      task_status: taskInput.task_status || existing.task_status,
      comments: taskInput.comments !== undefined ? taskInput.comments : existing.comments,
      updated_at: new Date().toISOString()
    }"""
NEW_EDIT_TASK = """      test_design_est_hrs: existing?.estimated_hours_locked ? Number(existing.test_design_est_hrs) : testDesign,
      data_prep_est_hrs: existing?.estimated_hours_locked ? Number(existing.data_prep_est_hrs) : dataPrep,
      functional_testing_est_hrs: existing?.estimated_hours_locked ? Number(existing.functional_testing_est_hrs) : funcTest,
      retesting_est_hrs: existing?.estimated_hours_locked ? Number(existing.retesting_est_hrs) : retesting,
      total_estimation_hrs: existing?.estimated_hours_locked ? Number(existing.total_estimation_hrs) : totalEst,
      estimated_hours: existing?.estimated_hours_locked ? Number(existing.estimated_hours) : totalEst,
      estimated_hours_locked: existing?.estimated_hours_locked ?? false,
      estimated_hours_locked_by: existing?.estimated_hours_locked_by ?? null,
      estimated_hours_locked_at: existing?.estimated_hours_locked_at ?? null,
      actual_hours: act,
      remaining_hours: effort.remainingHrs,
      overrun_hours: effort.overrunHrs,
      received_date_time: (taskInput as any).received_date_time !== undefined ? (taskInput as any).received_date_time : existing.received_date_time,
      actual_end_date: (taskInput as any).actual_end_date !== undefined ? (taskInput as any).actual_end_date : existing.actual_end_date,
      task_status: taskInput.task_status || existing.task_status,
      comments: taskInput.comments !== undefined ? taskInput.comments : existing.comments,
      updated_at: new Date().toISOString()
    }"""
content = content.replace(OLD_EDIT_TASK, NEW_EDIT_TASK)

# 5. In saveReleaseTask create branch, add new fields
OLD_CREATE_TASK = """      estimated_hours: est,
      estimated_hours_locked: false,
      estimated_hours_locked_by: null,
      estimated_hours_locked_at: null,
      actual_hours: act,
      remaining_hours: effort.remainingHrs,
      overrun_hours: effort.overrunHrs,
      task_status: taskInput.task_status || 'Not Started',
      comments: taskInput.comments || '',
      is_deleted: false,"""
NEW_CREATE_TASK = """      test_design_est_hrs: testDesign,
      data_prep_est_hrs: dataPrep,
      functional_testing_est_hrs: funcTest,
      retesting_est_hrs: retesting,
      total_estimation_hrs: totalEst,
      estimated_hours: totalEst,
      estimated_hours_locked: false,
      estimated_hours_locked_by: null,
      estimated_hours_locked_at: null,
      actual_hours: act,
      remaining_hours: effort.remainingHrs,
      overrun_hours: effort.overrunHrs,
      received_date_time: (taskInput as any).received_date_time || null,
      actual_end_date: (taskInput as any).actual_end_date || null,
      task_status: taskInput.task_status || 'Not Started',
      comments: taskInput.comments || '',
      is_deleted: false,"""
content = content.replace(OLD_CREATE_TASK, NEW_CREATE_TASK)

# 6. In Supabase payload for save, add new fields
OLD_PAYLOAD = """      task_status: savedTask.task_status,
      comments: savedTask.comments,
      is_deleted: false,
      updated_at: savedTask.updated_at"""
NEW_PAYLOAD = """      task_status: savedTask.task_status,
      comments: savedTask.comments,
      received_date_time: (savedTask as any).received_date_time || null,
      actual_end_date: (savedTask as any).actual_end_date || null,
      test_design_est_hrs: (savedTask as any).test_design_est_hrs ?? 0,
      data_prep_est_hrs: (savedTask as any).data_prep_est_hrs ?? 0,
      functional_testing_est_hrs: (savedTask as any).functional_testing_est_hrs ?? 0,
      retesting_est_hrs: (savedTask as any).retesting_est_hrs ?? 0,
      is_deleted: false,
      updated_at: savedTask.updated_at"""
content = content.replace(OLD_PAYLOAD, NEW_PAYLOAD)

# 7. Add editReleaseTimeLog function before the Audit History section
EDIT_TIMELOG_FUNC = '''
// ══════════════════════════════════════════════════════════════════════════════
// 4b. EDIT TIME LOG (Correct mistakenly logged hours)
// ══════════════════════════════════════════════════════════════════════════════

export async function editReleaseTimeLog(
  logId: string,
  updates: { hours_added: number; comment: string; correction_reason: string },
  currentUser: { name: string; id?: string },
  allTasks: ReleaseTask[]
): Promise<{ updatedLog: ReleaseTaskTimeLog; updatedTask: ReleaseTask }> {
  if (updates.hours_added <= 0) throw new Error('Corrected hours must be greater than zero.')
  if (!updates.correction_reason.trim()) throw new Error('A reason for correction is required.')

  const existingLogs = await fetchReleaseTimeLogs()
  const targetLog = existingLogs.find(l => l.id === logId)
  if (!targetLog) throw new Error(`Time log ${logId} not found.`)

  const oldHours = targetLog.hours_added
  const roundedNew = Math.round(Number(updates.hours_added) * 100) / 100

  const updatedLog: ReleaseTaskTimeLog = { ...targetLog, hours_added: roundedNew, comment: updates.comment.trim() }
  const nextLogs = existingLogs.map(l => l.id === logId ? updatedLog : l)
  try { localStorage.setItem(LOCAL_STORAGE_TIMELOGS_KEY, JSON.stringify(nextLogs)) } catch { /* ignore */ }

  try {
    await supabase.from('release_task_time_logs').update({
      hours_added: roundedNew,
      comment: updates.comment.trim()
    }).eq('id', logId)
  } catch (err) { console.warn('[releaseTrackerService] supabase edit time log error:', err) }

  const targetTask = allTasks.find(
    t => t.task_id === targetLog.task_id || t.id === targetLog.release_task_id
  )
  if (!targetTask) throw new Error(`Parent task for log ${logId} not found.`)

  const taskLogs = nextLogs.filter(
    l => l.task_id === targetTask.task_id || (targetTask.id && l.release_task_id === targetTask.id)
  )
  const cumulativeActual = Math.round(taskLogs.reduce((acc, l) => acc + Number(l.hours_added), 0) * 100) / 100
  const est = Number(targetTask.total_estimation_hrs || targetTask.estimated_hours) || 0
  const effort = calculateEffort(est, cumulativeActual)

  const updatedTask: ReleaseTask = {
    ...targetTask,
    actual_hours: cumulativeActual,
    remaining_hours: effort.remainingHrs,
    overrun_hours: effort.overrunHrs,
    updated_at: new Date().toISOString()
  }

  try {
    await supabase.from('release_tasks').update({
      actual_hours: cumulativeActual,
      updated_at: updatedTask.updated_at
    }).eq('id', targetTask.id)
  } catch (err) { console.warn('[releaseTrackerService] supabase update actual_hours error:', err) }

  const updatedTasks = allTasks.map(t => t.id === updatedTask.id ? updatedTask : t)
  try { localStorage.setItem(LOCAL_STORAGE_TASKS_KEY, JSON.stringify(updatedTasks)) } catch { /* ignore */ }

  const diff = Math.round((roundedNew - oldHours) * 100) / 100
  logReleaseHistoryEvent({
    task_id: targetTask.task_id,
    product_name: targetTask.product_name,
    release_version: targetTask.release_version,
    user_name: currentUser.name,
    user_id: currentUser.id,
    action: 'Time Log Corrected',
    field: 'Time Log Corrected',
    old_value: `${oldHours} hrs — "${targetLog.comment}"`,
    new_value: `${roundedNew} hrs (${diff >= 0 ? '+' : ''}${diff} hrs) — "${updates.comment}" | Reason: ${updates.correction_reason}`
  })

  return { updatedLog, updatedTask }
}

'''

AUDIT_ANCHOR = '// ══════════════════════════════════════════════════════════════════════════════\n// 5. AUDIT HISTORY'
content = content.replace(AUDIT_ANCHOR, EDIT_TIMELOG_FUNC + AUDIT_ANCHOR)

# 8. Update export to use new column spec
OLD_EXPORT_ROWS = """  const rows = tasks.map((t, idx) => ({
    'Sl. No.': idx + 1,
    'Product': t.product_name,
    'Product Code': t.product_code || '—',
    'Release': t.release_version,
    'Release Task ID': t.task_id,
    'Task Description': t.description,
    'Priority': t.priority,
    'Start Date': t.start_date || '—',
    'Target Date': t.target_date || '—',
    'Finish Date': t.finish_date || '—',
    \"Who's Testing\": t.assigned_to_name,
    'Estimated Hrs': t.estimated_hours,
    'Estimation Status': t.estimated_hours_locked ? 'Locked' : 'Unlocked',
    'Actual Hrs': t.actual_hours,
    'Remaining Hrs': t.remaining_hours,
    'Overrun Hrs': t.overrun_hours,
    'Task Status': t.task_status,
    'Comments': t.comments || '—'
  }))"""

NEW_EXPORT_ROWS = """  const rows = tasks.map((t, idx) => {
    const total = computeTotalEstimation(t as any)
    const act = Number(t.actual_hours) || 0
    const remaining = act > total ? `Overrun ${Math.round((act - total) * 100) / 100} Hrs` : Math.round((total - act) * 100) / 100
    return {
      'Sl. No.': idx + 1,
      'Product': t.product_name,
      'Release': t.release_version,
      'Task ID': t.task_id,
      'Description': t.description,
      'QA Engineer': t.assigned_to_name,
      'Received Date/Time': (t as any).received_date_time || '',
      'Status': t.task_status,
      'Test Design Estimation (Hrs)': (t as any).test_design_est_hrs ?? 0,
      'Data Preparation Estimation (Hrs)': (t as any).data_prep_est_hrs ?? 0,
      'Functional Testing Estimation (Hrs)': (t as any).functional_testing_est_hrs ?? 0,
      'Retesting Estimation (Hrs)': (t as any).retesting_est_hrs ?? 0,
      'Total Estimation (Hrs)': total,
      'Actual Start Date': t.start_date || '',
      'Actual / Effort (Hrs)': act,
      'Remaining Hrs': remaining,
      'Actual End Date': (t as any).actual_end_date || '',
      'Comments': t.comments || ''
    }
  })"""
content = content.replace(OLD_EXPORT_ROWS, NEW_EXPORT_ROWS)

# 9. Update Excel column widths to match 18 export columns
OLD_COL_WIDTHS = """  const colWidths = [
    { wch: 8 },  // Sl. No.
    { wch: 25 }, // Product
    { wch: 14 }, // Product Code
    { wch: 16 }, // Release
    { wch: 16 }, // Task ID
    { wch: 45 }, // Description
    { wch: 12 }, // Priority
    { wch: 14 }, // Start Date
    { wch: 14 }, // Target Date
    { wch: 14 }, // Finish Date
    { wch: 20 }, // Who's Testing
    { wch: 15 }, // Estimated Hrs
    { wch: 16 }, // Estimation Status
    { wch: 14 }, // Actual Hrs
    { wch: 15 }, // Remaining Hrs
    { wch: 14 }, // Overrun Hrs
    { wch: 16 }, // Task Status
    { wch: 35 }  // Comments
  ]"""
NEW_COL_WIDTHS = """  const colWidths = [
    { wch: 8 },  // Sl. No.
    { wch: 24 }, // Product
    { wch: 16 }, // Release
    { wch: 14 }, // Task ID
    { wch: 45 }, // Description
    { wch: 20 }, // QA Engineer
    { wch: 20 }, // Received Date/Time
    { wch: 16 }, // Status
    { wch: 26 }, // Test Design Est
    { wch: 30 }, // Data Prep Est
    { wch: 30 }, // Functional Testing Est
    { wch: 24 }, // Retesting Est
    { wch: 22 }, // Total Estimation
    { wch: 16 }, // Actual Start Date
    { wch: 18 }, // Actual / Effort
    { wch: 18 }, // Remaining Hrs
    { wch: 16 }, // Actual End Date
    { wch: 35 }  // Comments
  ]"""
content = content.replace(OLD_COL_WIDTHS, NEW_COL_WIDTHS)

# 10. Update CSV export headers
OLD_CSV_HEADERS = """  const headers = [
    'Sl. No.',
    'Product',
    'Product Code',
    'Release',
    'Release Task ID',
    'Task Description',
    'Priority',
    'Start Date',
    'Target Date',
    'Finish Date',
    \"Who's Testing\",
    'Estimated Hrs',
    'Estimation Status',
    'Actual Hrs',
    'Remaining Hrs',
    'Overrun Hrs',
    'Task Status',
    'Comments'
  ]"""
NEW_CSV_HEADERS = """  const headers = [
    'Sl. No.',
    'Product',
    'Release',
    'Task ID',
    'Description',
    'QA Engineer',
    'Received Date/Time',
    'Status',
    'Test Design Estimation (Hrs)',
    'Data Preparation Estimation (Hrs)',
    'Functional Testing Estimation (Hrs)',
    'Retesting Estimation (Hrs)',
    'Total Estimation (Hrs)',
    'Actual Start Date',
    'Actual / Effort (Hrs)',
    'Remaining Hrs',
    'Actual End Date',
    'Comments'
  ]"""
content = content.replace(OLD_CSV_HEADERS, NEW_CSV_HEADERS)

# 11. Update CSV row builder
OLD_CSV_ROWS = """  tasks.forEach((t, idx) => {
    const row = [
      escapeCSV(idx + 1),
      escapeCSV(t.product_name),
      escapeCSV(t.product_code || ''),
      escapeCSV(t.release_version),
      escapeCSV(t.task_id),
      escapeCSV(t.description),
      escapeCSV(t.priority),
      escapeCSV(t.start_date || ''),
      escapeCSV(t.target_date || ''),
      escapeCSV(t.finish_date || ''),
      escapeCSV(t.assigned_to_name),
      escapeCSV(t.estimated_hours),
      escapeCSV(t.estimated_hours_locked ? 'Locked' : 'Unlocked'),
      escapeCSV(t.actual_hours),
      escapeCSV(t.remaining_hours),
      escapeCSV(t.overrun_hours),
      escapeCSV(t.task_status),
      escapeCSV(t.comments || '')
    ]
    csvRows.push(row.join(','))
  })"""
NEW_CSV_ROWS = """  tasks.forEach((t, idx) => {
    const total = computeTotalEstimation(t as any)
    const act = Number(t.actual_hours) || 0
    const remaining = act > total ? `Overrun ${Math.round((act - total) * 100) / 100} Hrs` : Math.round((total - act) * 100) / 100
    const row = [
      escapeCSV(idx + 1),
      escapeCSV(t.product_name),
      escapeCSV(t.release_version),
      escapeCSV(t.task_id),
      escapeCSV(t.description),
      escapeCSV(t.assigned_to_name),
      escapeCSV((t as any).received_date_time || ''),
      escapeCSV(t.task_status),
      escapeCSV((t as any).test_design_est_hrs ?? 0),
      escapeCSV((t as any).data_prep_est_hrs ?? 0),
      escapeCSV((t as any).functional_testing_est_hrs ?? 0),
      escapeCSV((t as any).retesting_est_hrs ?? 0),
      escapeCSV(total),
      escapeCSV(t.start_date || ''),
      escapeCSV(act),
      escapeCSV(remaining),
      escapeCSV((t as any).actual_end_date || ''),
      escapeCSV(t.comments || '')
    ]
    csvRows.push(row.join(','))
  })"""
content = content.replace(OLD_CSV_ROWS, NEW_CSV_ROWS)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("releaseTrackerService.ts patched")
