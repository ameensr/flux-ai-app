// src/modules/DailyUpdateReport/useDynamicColumns.ts
// Shared hook that resolves the active column configuration for a QA Daily
// Update table (Support & Exception Log or Release Testing Log), and manages
// read/write of custom (metadata-driven) column values for rows that already
// have a persisted (non-temp) database id.
//
// System columns continue to read/write directly on the row object exactly
// as before (no behavior change, no data loss). Custom columns are stored in
// `daily_report_custom_field_values`, keyed by row id + column id.

import { useEffect, useRef, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useColumnConfigStore } from './columnConfigStore'
import type { ColumnConfig, DailyReportTableKey } from './types'

export interface CustomValuesMap {
  // rowId -> internal_key -> value
  [rowId: string]: Record<string, any>
}

export function useDynamicColumns(tableKey: DailyReportTableKey, projectId: string) {
  const { getColumns, getScope, fetchColumnConfigs, loading } = useColumnConfigStore()
  const [customValues, setCustomValues] = useState<CustomValuesMap>({})
  const loadedRowIds = useRef<Set<string>>(new Set())

  useEffect(() => {
    fetchColumnConfigs(tableKey, projectId || null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableKey, projectId])

  const columns = getColumns(tableKey)
  const customColumns = columns.filter(c => !c.is_system)
  // Which column configuration is actually active for the table right now:
  // 'project' = this project has its own saved column configuration;
  // 'organization' = falling back to the shared Organization Default preset
  // (either because the project has none of its own, or no project is
  // selected). Surfaced in the table UI so users know which preset is loaded.
  const scope = getScope(tableKey)

  // Load custom field values for a given set of row ids (skips rows already loaded)
  const loadCustomValuesForRows = useCallback(async (rowIds: string[]) => {
    const realIds = rowIds.filter(id => !id.startsWith('temp-') && !loadedRowIds.current.has(id))
    if (realIds.length === 0) return
    realIds.forEach(id => loadedRowIds.current.add(id))

    try {
      const { data, error } = await supabase
        .from('daily_report_custom_field_values')
        .select('row_id, column_id, value')
        .eq('table_key', tableKey)
        .in('row_id', realIds)

      if (error) throw error

      const currentColumns = getColumns(tableKey)
      setCustomValues(prev => {
        const next = { ...prev }
        for (const row of (data || []) as { row_id: string; column_id: string; value: any }[]) {
          const col = currentColumns.find(c => c.id === row.column_id)
          if (!col) continue
          next[row.row_id] = { ...(next[row.row_id] || {}), [col.internal_key]: row.value }
        }
        return next
      })
    } catch (e) {
      console.warn('[useDynamicColumns] Failed to load custom field values', e)
    }
  }, [tableKey, getColumns])

  // Persist a single custom field value immediately (rows must have a real id)
  const setCustomValue = useCallback(async (rowId: string, column: ColumnConfig, value: any) => {
    setCustomValues(prev => ({ ...prev, [rowId]: { ...(prev[rowId] || {}), [column.internal_key]: value } }))

    if (rowId.startsWith('temp-')) {
      // Row not yet persisted — value stays in local state only until the row
      // is saved. It will not survive a page refresh before that point; this
      // mirrors the existing debounced-autosave latency for system columns.
      return
    }

    try {
      const { error } = await supabase
        .from('daily_report_custom_field_values')
        .upsert({ row_id: rowId, table_key: tableKey, column_id: column.id, value }, { onConflict: 'row_id,column_id' })
      if (error) throw error
    } catch (e) {
      console.error('[useDynamicColumns] Failed to save custom field value', e)
    }
  }, [tableKey])

  // Remove all custom values tied to a set of deleted rows (best-effort, RLS/cascade also covers row deletion)
  const clearCustomValuesForRows = useCallback((rowIds: string[]) => {
    setCustomValues(prev => {
      const next = { ...prev }
      rowIds.forEach(id => delete next[id])
      return next
    })
  }, [])

  const getCellValue = useCallback((row: any, col: ColumnConfig): any => {
    if (col.is_system) return row[col.internal_key]
    return customValues[row.id]?.[col.internal_key] ?? col.default_value ?? ''
  }, [customValues])

  // Required-field validation across both system and custom columns.
  // Returns human-readable messages, e.g. "Description is required."
  const validateRow = useCallback((row: any): string[] => {
    const errors: string[] = []
    for (const col of columns) {
      if (!col.is_required) continue
      const val = getCellValue(row, col)
      if (val === undefined || val === null || val === '') {
        errors.push(`${col.display_name} is required.`)
      }
    }
    return errors
  }, [columns, getCellValue])

  return {
    columns,
    customColumns,
    scope,
    loading,
    customValues,
    setCustomValue,
    getCellValue,
    loadCustomValuesForRows,
    clearCustomValuesForRows,
    validateRow,
  }
}
