// Shared helpers so Template / Import / Export always follow the active
// Customize Columns configuration (system + custom, renamed labels, order).

import type { ColumnConfig, DailyReportTableKey } from './types'
import { isOptionBasedType } from './columnConfigStore'

export function normalizeHeader(raw: string): string {
  return (raw || '').toString().trim().toLowerCase().replace(/\s+/g, ' ')
}

/** Match file headers to columns by display_name (and fallbacks). */
export function buildHeaderColumnMap(columns: ColumnConfig[]): Map<string, ColumnConfig> {
  const map = new Map<string, ColumnConfig>()
  for (const col of columns) {
    const keys = [
      normalizeHeader(col.display_name),
      normalizeHeader(col.internal_key),
      normalizeHeader(col.internal_key.replace(/_/g, ' ')),
    ]
    for (const k of keys) {
      if (k && !map.has(k)) map.set(k, col)
    }
  }
  return map
}

export function columnsForExport(columns: ColumnConfig[]): ColumnConfig[] {
  return columns.filter(c => c.is_visible && c.include_in_export !== false)
}

export function columnsForTemplate(columns: ColumnConfig[]): ColumnConfig[] {
  return columns.filter(c => c.is_visible)
}

/** Visible columns in table order — used for positional paste. */
export function columnsForPaste(columns: ColumnConfig[]): ColumnConfig[] {
  return columns.filter(c => c.is_visible)
}

export function parseCellRaw(col: ColumnConfig, raw: string | undefined | null): { value: any; error?: string } {
  let val = raw !== undefined && raw !== null ? raw.toString().trim() : ''
  if (val.startsWith("'")) val = val.substring(1)

  if (col.column_type === 'number' || col.column_type === 'percentage') {
    if (val === '') return { value: '' }
    const parsed = parseFloat(val)
    if (isNaN(parsed)) return { value: '', error: `${col.display_name} must be a number (got: '${val}')` }
    return { value: parsed }
  }

  if (col.column_type === 'date') {
    if (val === '') return { value: '' }
    const numVal = parseFloat(val)
    let dateObj: Date
    if (!isNaN(numVal) && numVal > 100 && numVal < 100000) {
      const excelEpoch = new Date(1899, 11, 30)
      dateObj = new Date(excelEpoch.getTime() + numVal * 86400000)
    } else {
      dateObj = new Date(val)
    }
    if (isNaN(dateObj.getTime())) {
      return { value: '', error: `${col.display_name} must be a valid date YYYY-MM-DD (got: '${val}')` }
    }
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    return { value: `${year}-${month}-${day}` }
  }

  if (col.column_type === 'boolean') {
    if (val === '') return { value: '' }
    const lower = val.toLowerCase()
    if (['yes', 'true', '1', 'y'].includes(lower)) return { value: 'Yes' }
    if (['no', 'false', '0', 'n'].includes(lower)) return { value: 'No' }
    return { value: val }
  }

  if (isOptionBasedType(col.column_type) && val) {
    const options = (col.dropdown_options || []).map(o => o.label)
    if (options.length > 0) {
      const match = options.find(o => o.toLowerCase() === val.toLowerCase())
      if (!match) {
        return {
          value: val,
          error: `${col.display_name} '${val}' is not configured.`,
        }
      }
      return { value: match }
    }
  }

  return { value: val }
}

export function emptySupportSystemFields(): Record<string, any> {
  return {
    support_id: '',
    bug_id: '',
    branch: '',
    description: '',
    received_date: '',
    qa: '',
    tc_count: '',
    estimation_hrs: '',
    actual_start_date: '',
    planned_end_date: '',
    actual_end_date: '',
    testing_status: '',
    issue_source: '',
    comments: '',
    blocked_hours: '',
    retesting_status: '',
    retesting_estimation_hrs: '',
  }
}

export function emptyReleaseSystemFields(): Record<string, any> {
  return {
    task_id: '',
    description: '',
    qa: '',
    initial_round_estimation_hrs: '',
    testing_status: '',
    smoke_testing_status: '',
    scope_of_testing_for_smoke: '',
    smoke_testing_estimation_hrs: '',
    overall_scope_of_testing: '',
    overall_estimation_hrs: '',
  }
}

export function emptySystemFields(tableKey: DailyReportTableKey): Record<string, any> {
  return tableKey === 'support' ? emptySupportSystemFields() : emptyReleaseSystemFields()
}

export interface ParsedImportRow {
  /** System-column fields only (written on the row object). */
  systemFields: Record<string, any>
  /** Custom-column values keyed by internal_key (written via setCustomValue). */
  customFields: Record<string, any>
  errors: string[]
}

/**
 * Parse one spreadsheet data row against the active column config.
 * Headers are matched to columns by current display names (renames work).
 */
export function parseImportRow(
  tableKey: DailyReportTableKey,
  headers: string[],
  rowData: string[],
  columns: ColumnConfig[],
): ParsedImportRow {
  const headerMap = buildHeaderColumnMap(columns)
  const systemFields = emptySystemFields(tableKey)
  const customFields: Record<string, any> = {}
  const errors: string[] = []

  headers.forEach((h, idx) => {
    const col = headerMap.get(normalizeHeader(h))
    if (!col) return
    const raw = rowData[idx]
    const { value, error } = parseCellRaw(col, raw)
    if (error) errors.push(error)
    if (col.is_system) {
      systemFields[col.internal_key] = value
    } else {
      customFields[col.internal_key] = value
    }
  })

  // Required columns from active config
  for (const col of columns) {
    if (!col.is_required) continue
    const val = col.is_system
      ? systemFields[col.internal_key]
      : customFields[col.internal_key]
    if (val === undefined || val === null || val === '') {
      errors.push(`${col.display_name} is required.`)
    }
  }

  return { systemFields, customFields, errors }
}

export function sampleValueForColumn(col: ColumnConfig, getOption: (internalKey: string) => string[]): string | number {
  if (!col.is_system) {
    switch (col.column_type) {
      case 'number':
      case 'percentage':
        return 0
      case 'date':
        return new Date().toISOString().split('T')[0]
      case 'datetime':
        return new Date().toISOString()
      case 'dropdown':
      case 'status':
        return col.dropdown_options[0]?.label || ''
      case 'multiselect':
        return col.dropdown_options.slice(0, 2).map(o => o.label).join(', ')
      case 'boolean':
        return 'Yes'
      case 'user':
        return 'Team Member'
      case 'url':
        return 'https://example.com'
      case 'long_text':
        return 'Sample description...'
      default:
        return ''
    }
  }

  switch (col.internal_key) {
    case 'support_id':
      return '100/101'
    case 'bug_id':
      return 'BUG-999'
    case 'branch':
      return getOption('branch')[0] || 'main'
    case 'description':
      return col.table_key === 'release'
        ? 'Smoke test of login page.'
        : 'Initial investigation of exception trace.'
    case 'received_date':
    case 'actual_start_date':
    case 'planned_end_date':
    case 'actual_end_date':
      return new Date().toISOString().split('T')[0]
    case 'qa':
      return getOption('qa')[0] || 'Sarah Jenkins'
    case 'tc_count':
      return 5
    case 'estimation_hrs':
    case 'retesting_estimation_hrs':
    case 'initial_round_estimation_hrs':
    case 'smoke_testing_estimation_hrs':
    case 'overall_estimation_hrs':
      return 2
    case 'testing_status':
      return getOption('testing_status')[0] || 'In Progress'
    case 'smoke_testing_status':
      return getOption('smoke_testing_status')[0] || 'Pass'
    case 'issue_source':
      return getOption('issue_source')[0] || 'Internal Testing'
    case 'comments':
      return 'Sample comment.'
    case 'blocked_hours':
      return 0
    case 'retesting_status':
      return getOption('retesting_status')[0] || 'Open'
    case 'task_id':
      return 'TASK-001'
    case 'scope_of_testing_for_smoke':
      return 'Verify standard login and MFA flow.'
    case 'overall_scope_of_testing':
      return 'Check standard and admin users.'
    default:
      return ''
  }
}

/** Build a config-reference sheet from every option-based column. */
export function buildConfigRefAOA(columns: ColumnConfig[]): string[][] {
  const optionCols = columns.filter(c => isOptionBasedType(c.column_type) && (c.dropdown_options?.length || 0) > 0)
  if (optionCols.length === 0) return [['(No dropdown options configured)']]

  const headers = optionCols.map(c => c.display_name)
  const maxLen = Math.max(...optionCols.map(c => c.dropdown_options.length), 0)
  const rows: string[][] = [headers]
  for (let i = 0; i < maxLen; i++) {
    rows.push(optionCols.map(c => c.dropdown_options[i]?.label || ''))
  }
  return rows
}

export function escapeCsvCell(val: any): string {
  return `"${(val ?? '').toString().replace(/"/g, '""')}"`
}

export function formatExportCell(col: ColumnConfig, val: any): string {
  if (col.column_type === 'date' && val) {
    // Force text in Excel so narrow columns don't show ###
    return `"'${val.toString().replace(/"/g, '""')}"`
  }
  return escapeCsvCell(val)
}
