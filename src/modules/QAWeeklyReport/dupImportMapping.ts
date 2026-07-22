// src/modules/QAWeeklyReport/dupImportMapping.ts
// Column-aware "Import from DUP" mapping engine.
//
// Replaces the previously hardcoded mapDailySupportToQA / mapDailyReleaseToQA
// field-by-field mappers. Instead of hardcoded column names, this reads the
// QA Daily Update module's *dynamic* column configuration (support/release)
// and maps each DUP column — referenced by its stable internal_key, never by
// its editable display_name — to either:
//   - an existing QA Report field ("map_existing")
//   - a brand new QA Report column, stored under `customFields` ("create_new")
//   - nothing ("skip")
//
// Mapping choices are persisted per project (falling back to an organization
// default) in `daily_report_column_mappings`, so returning users don't have
// to re-map every time they import.

import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import type { ColumnConfig, DailyReportTableKey } from '@/modules/DailyUpdateReport/types'
import type { SupportLogRecord, ReleaseTestingRecord } from '@/modules/DailyUpdateReport/types'
import type { SupportTicket, ReleaseItem, SupportStatus, ReleaseStatus } from './types'

export type MappingAction = 'map_existing' | 'create_new' | 'skip'

export interface MappingEntry {
  dupColumnId: string
  internalKey: string // kept for convenience/debugging; matching is always done via dupColumnId
  action: MappingAction
  targetField?: string // existing QA Report field key (map_existing) or new column label (create_new)
}

export interface QAReportFieldOption {
  key: string
  label: string
}

export const QA_SUPPORT_FIELDS: QAReportFieldOption[] = [
  { key: 'taskId', label: 'Task ID' },
  { key: 'description', label: 'Description' },
  { key: 'assignedQA', label: 'Assigned QA' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'remarks', label: 'Remarks' },
]

export const QA_RELEASE_FIELDS: QAReportFieldOption[] = [
  { key: 'taskId', label: 'Task ID' },
  { key: 'featureName', label: 'Feature' },
  { key: 'assignee', label: 'Assignee' },
  { key: 'status', label: 'Status' },
  { key: 'priority', label: 'Priority' },
  { key: 'remarks', label: 'Remarks' },
]

export function qaFieldsForTable(tableKey: DailyReportTableKey): QAReportFieldOption[] {
  return tableKey === 'support' ? QA_SUPPORT_FIELDS : QA_RELEASE_FIELDS
}

// Columns with "Include in QA Report" turned off (include_in_qa_report ===
// false) are excluded entirely from the Import from DUP workflow — they
// won't appear in the mapping modal, won't get a default mapping entry, and
// their values are never carried into the QA Report, regardless of what
// mapping.action might otherwise say for them. Columns default to eligible
// (include_in_qa_report === true / undefined) so existing configs created
// before this flag existed keep behaving exactly as before.
export function qaReportEligibleColumns(columns: ColumnConfig[]): ColumnConfig[] {
  return columns.filter(c => c.include_in_qa_report !== false)
}

// Heuristic auto-mapping used only to pre-fill the mapping modal the first
// time a project imports (no saved preference yet). Users can change any of
// these before confirming — this never silently overrides a saved mapping.
function guessDefaultAction(col: ColumnConfig, tableKey: DailyReportTableKey): MappingEntry {
  const key = col.internal_key
  const fields = qaFieldsForTable(tableKey)
  const has = (f: string) => fields.some(x => x.key === f)

  const guesses: Record<string, string> = tableKey === 'support'
    ? {
      support_id: 'taskId', description: 'description', qa: 'assignedQA',
      testing_status: 'status', comments: 'remarks',
    }
    : {
      task_id: 'taskId', description: 'description', qa: 'assignee',
      testing_status: 'status', smoke_testing_status: 'status',
    }

  const guessed = guesses[key]
  if (guessed && has(guessed)) {
    return { dupColumnId: col.id, internalKey: key, action: 'map_existing', targetField: guessed }
  }
  if (!col.is_system) {
    return { dupColumnId: col.id, internalKey: key, action: 'create_new', targetField: col.display_name }
  }
  return { dupColumnId: col.id, internalKey: key, action: 'skip' }
}

export function buildDefaultMapping(columns: ColumnConfig[], tableKey: DailyReportTableKey): MappingEntry[] {
  return qaReportEligibleColumns(columns).map(c => guessDefaultAction(c, tableKey))
}

export async function fetchSavedMapping(tableKey: DailyReportTableKey, projectId: string | null): Promise<Record<string, MappingEntry> | null> {
  try {
    let rows: any[] = []
    if (projectId) {
      const { data } = await supabase
        .from('daily_report_column_mappings')
        .select('*')
        .eq('table_key', tableKey)
        .eq('project_id', projectId)
      if (data && data.length > 0) rows = data
    }
    if (rows.length === 0) {
      const { data } = await supabase
        .from('daily_report_column_mappings')
        .select('*')
        .eq('table_key', tableKey)
        .is('project_id', null)
      if (data) rows = data
    }
    if (rows.length === 0) return null

    const map: Record<string, MappingEntry> = {}
    for (const r of rows) {
      map[r.dup_column_id] = {
        dupColumnId: r.dup_column_id,
        internalKey: '',
        action: r.action,
        targetField: r.target_field || undefined,
      }
    }
    return map
  } catch (e) {
    console.warn('[dupImportMapping] Failed to fetch saved mapping', e)
    return null
  }
}

export async function saveMapping(tableKey: DailyReportTableKey, projectId: string | null, entries: MappingEntry[]): Promise<void> {
  const user = useAppStore.getState().user
  const validEntries = entries.filter(e => !e.dupColumnId.startsWith('fallback-'))
  if (validEntries.length === 0) return

  // Note: daily_report_column_mappings enforces uniqueness via *partial*
  // unique indexes (one scoped to project_id IS NULL, one to IS NOT NULL).
  // Postgres' ON CONFLICT target must match a partial index's predicate to
  // use it as an arbiter, which the Supabase JS client's `onConflict` option
  // cannot express — so a plain upsert() here would fail with "no unique or
  // exclusion constraint matching the ON CONFLICT specification". Doing an
  // explicit existence check + insert/update avoids relying on that arbiter.
  try {
    let existingQuery = supabase
      .from('daily_report_column_mappings')
      .select('id, dup_column_id')
      .eq('table_key', tableKey)
      .in('dup_column_id', validEntries.map(e => e.dupColumnId))

    existingQuery = projectId ? existingQuery.eq('project_id', projectId) : existingQuery.is('project_id', null)

    const { data: existing, error: fetchError } = await existingQuery
    if (fetchError) throw fetchError

    const existingByColumnId = new Map((existing || []).map((r: any) => [r.dup_column_id, r.id]))

    const toInsert = validEntries
      .filter(e => !existingByColumnId.has(e.dupColumnId))
      .map(e => ({
        project_id: projectId,
        table_key: tableKey,
        dup_column_id: e.dupColumnId,
        action: e.action,
        target_field: e.targetField || null,
        created_by: user?.id,
      }))

    const toUpdate = validEntries.filter(e => existingByColumnId.has(e.dupColumnId))

    if (toInsert.length > 0) {
      const { error } = await supabase.from('daily_report_column_mappings').insert(toInsert)
      if (error) throw error
    }

    for (const e of toUpdate) {
      const { error } = await supabase
        .from('daily_report_column_mappings')
        .update({ action: e.action, target_field: e.targetField || null })
        .eq('id', existingByColumnId.get(e.dupColumnId))
      if (error) throw error
    }
  } catch (e) {
    console.error('[dupImportMapping] Failed to save mapping preferences', e)
  }
}

// Loads custom (metadata-driven) field values for a set of persisted row ids.
async function loadCustomValues(tableKey: DailyReportTableKey, rowIds: string[]): Promise<Record<string, Record<string, any>>> {
  const realIds = rowIds.filter(id => !id.startsWith('temp-'))
  if (realIds.length === 0) return {}
  try {
    const { data, error } = await supabase
      .from('daily_report_custom_field_values')
      .select('row_id, column_id, value')
      .eq('table_key', tableKey)
      .in('row_id', realIds)
    if (error) throw error
    const out: Record<string, Record<string, any>> = {}
    for (const row of (data || []) as { row_id: string; column_id: string; value: any }[]) {
      out[row.row_id] = { ...(out[row.row_id] || {}), [row.column_id]: row.value }
    }
    return out
  } catch (e) {
    console.warn('[dupImportMapping] Failed to load custom field values for import', e)
    return {}
  }
}

function normalizeStatus(rawStatus: string, options: SupportStatus[] | ReleaseStatus[]): string {
  const matched = (options as string[]).find(o => o.toLowerCase() === rawStatus.toLowerCase())
  if (matched) return matched
  const normalized = rawStatus.toLowerCase()
  if (['resolved', 'closed', 'passed', 'pass', 'completed', 'done', 'success'].some(v => normalized.includes(v))) {
    return (options as string[]).find(o => ['resolved', 'pass'].includes(o.toLowerCase())) || options[0]
  }
  if (['blocked'].some(v => normalized.includes(v))) {
    return (options as string[]).find(o => o.toLowerCase() === 'blocked') || options[0]
  }
  if (['in progress', 'progress', 'working', 'ongoing'].some(v => normalized.includes(v))) {
    return (options as string[]).find(o => o.toLowerCase().includes('progress')) || options[0]
  }
  if (['fail', 'failed', 'failure'].some(v => normalized.includes(v))) {
    return (options as string[]).find(o => o.toLowerCase().includes('fail')) || options[0]
  }
  return options[0]
}

export interface ImportResult<T> {
  items: T[]
  // internal_key -> display label, for any columns mapped to "create_new" so
  // callers can render an extra dynamic column with a stable heading.
  customFieldLabels: Record<string, string>
}

export async function applySupportMapping(
  rows: SupportLogRecord[],
  columns: ColumnConfig[],
  mapping: Record<string, MappingEntry>,
): Promise<ImportResult<SupportTicket>> {
  const customValuesByRow = await loadCustomValues('support', rows.map(r => r.id))
  const customFieldLabels: Record<string, string> = {}

  const items: SupportTicket[] = rows.map(row => {
    const ticket: SupportTicket = {
      id: crypto.randomUUID(),
      taskId: '', description: '', assignedQA: '', status: 'Open', priority: 'Medium', remarks: '', customFields: {},
    }
    const remarkParts: string[] = []

    for (const col of qaReportEligibleColumns(columns)) {
      const entry = mapping[col.id]
      if (!entry || entry.action === 'skip') continue

      const value = col.is_system ? (row as any)[col.internal_key] : customValuesByRow[row.id]?.[col.id]
      if (value === undefined || value === null || value === '') continue

      if (entry.action === 'map_existing' && entry.targetField) {
        if (entry.targetField === 'status') {
          ticket.status = normalizeStatus(String(value), ['Open', 'In Progress', 'Resolved', 'Closed']) as SupportStatus
        } else if (entry.targetField === 'remarks') {
          remarkParts.push(`${col.display_name}: ${value}`)
        } else {
          (ticket as any)[entry.targetField] = value
        }
      } else if (entry.action === 'create_new') {
        ticket.customFields![col.internal_key] = value
        customFieldLabels[col.internal_key] = entry.targetField || col.display_name
      }
    }

    if (remarkParts.length > 0) {
      ticket.remarks = [ticket.remarks, ...remarkParts].filter(Boolean).join(' | ')
    }
    if (!ticket.taskId) ticket.taskId = row.support_id || ''
    return ticket
  })

  return { items, customFieldLabels }
}

export async function applyReleaseMapping(
  rows: ReleaseTestingRecord[],
  columns: ColumnConfig[],
  mapping: Record<string, MappingEntry>,
): Promise<ImportResult<ReleaseItem>> {
  const customValuesByRow = await loadCustomValues('release', rows.map(r => r.id))
  const customFieldLabels: Record<string, string> = {}

  const items: ReleaseItem[] = rows.map(row => {
    const item: ReleaseItem = {
      id: crypto.randomUUID(),
      taskId: '', featureName: '', assignee: '', status: 'Not Started', priority: 'Medium', remarks: '', customFields: {},
    }
    const remarkParts: string[] = []

    for (const col of qaReportEligibleColumns(columns)) {
      const entry = mapping[col.id]
      if (!entry || entry.action === 'skip') continue

      const value = col.is_system ? (row as any)[col.internal_key] : customValuesByRow[row.id]?.[col.id]
      if (value === undefined || value === null || value === '') continue

      if (entry.action === 'map_existing' && entry.targetField) {
        if (entry.targetField === 'status') {
          item.status = normalizeStatus(String(value), ['Not Started', 'In Progress', 'Pass', 'Fail', 'Blocked']) as ReleaseStatus
        } else if (entry.targetField === 'remarks') {
          remarkParts.push(`${col.display_name}: ${value}`)
        } else {
          (item as any)[entry.targetField] = value
        }
      } else if (entry.action === 'create_new') {
        item.customFields![col.internal_key] = value
        customFieldLabels[col.internal_key] = entry.targetField || col.display_name
      }
    }

    if (remarkParts.length > 0) {
      item.remarks = [item.remarks, ...remarkParts].filter(Boolean).join(' | ')
    }
    if (!item.taskId) item.taskId = row.task_id || ''
    return item
  })

  return { items, customFieldLabels }
}
