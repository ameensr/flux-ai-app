// src/modules/DailyUpdateReport/useDynamicColumns.ts
// Shared hook that resolves the active column configuration for a QA Daily
// Update table (Support & Exception Log or Release Testing Log), and manages
// read/write of custom (metadata-driven) column values for rows that already
// have a persisted (non-temp) database id.
//
// System columns continue to read/write directly on the row object exactly
// as before (no behavior change, no data loss). Custom columns are stored in
// `daily_report_custom_field_values`, keyed by row id + column id.
//
// ⚠️ `customValues` lives in the shared `columnConfigStore` (Zustand), NOT in
// local React state. Every caller of this hook — index.tsx (KPI cards),
// SupportExceptionLog.tsx, and ReleaseTestingStatus.tsx — creates its OWN
// instance of this hook. If custom-field values were kept in per-instance
// `useState`, editing a custom-column cell in the table would update that
// table's own copy instantly but leave index.tsx's separate copy stale until
// a full page reload — which is exactly why the KPI cards used to lag behind
// row edits for any dashboard-role column that happened to be a custom
// column. Routing reads/writes through the shared store means every instance
// observes the same data and re-renders the moment any of them changes it.
import { useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useColumnConfigStore, type CustomValuesMap } from './columnConfigStore'
import type { ColumnConfig, DailyReportTableKey } from './types'

export type { CustomValuesMap }

// Tracks which row ids already had their custom values fetched, per
// table+project — module-level (not a ref) so it's shared across every
// hook instance too, preventing duplicate fetches regardless of which
// component's `loadCustomValuesForRows` call happens to run first.
const loadedRowIdsByKey = new Map<string, Set<string>>()
function cacheKey(tableKey: DailyReportTableKey, projectId: string): string {
  return `${tableKey}:${projectId || ''}`
}

// ⚠️ Stable shared reference for "no custom values yet" — the selector below
// MUST return the exact same object instance across renders when a
// table+project key hasn't been populated, instead of a fresh `{}` literal.
// Zustand's `useSyncExternalStore` compares snapshots with `Object.is`; a
// brand-new object every call looks like "the store changed" even though
// nothing did, which reintroduces the following render loop forever:
// selector returns new {} -> React re-renders -> selector runs again ->
// returns another new {} -> ... ("Maximum update depth exceeded").
const EMPTY_CUSTOM_VALUES: CustomValuesMap = {}

export function useDynamicColumns(tableKey: DailyReportTableKey, projectId: string) {
  const {
    getColumns, getScope, fetchColumnConfigs, loading,
    mergeCustomFieldValues, setCustomFieldValue: setCustomFieldValueInStore,
    clearCustomFieldValuesForRows: clearCustomFieldValuesForRowsInStore,
  } = useColumnConfigStore()
  const customValues = useColumnConfigStore(state => state.customFieldValues[cacheKey(tableKey, projectId)] ?? EMPTY_CUSTOM_VALUES)

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
    const key = cacheKey(tableKey, projectId)
    let loadedSet = loadedRowIdsByKey.get(key)
    if (!loadedSet) {
      loadedSet = new Set()
      loadedRowIdsByKey.set(key, loadedSet)
    }
    const realIds = rowIds.filter(id => !id.startsWith('temp-') && !loadedSet!.has(id))
    if (realIds.length === 0) return
    realIds.forEach(id => loadedSet!.add(id))

    try {
      const { data, error } = await supabase
        .from('daily_report_custom_field_values')
        .select('row_id, column_id, value')
        .eq('table_key', tableKey)
        .in('row_id', realIds)

      if (error) throw error

      const currentColumns = getColumns(tableKey)
      const merged: CustomValuesMap = {}
      for (const row of (data || []) as { row_id: string; column_id: string; value: any }[]) {
        const col = currentColumns.find(c => c.id === row.column_id)
        if (!col) continue
        merged[row.row_id] = { ...(merged[row.row_id] || {}), [col.internal_key]: row.value }
      }
      mergeCustomFieldValues(tableKey, projectId, merged)
    } catch (e) {
      console.warn('[useDynamicColumns] Failed to load custom field values', e)
    }
  }, [tableKey, projectId, getColumns, mergeCustomFieldValues])

  // Persist a single custom field value immediately (rows must have a real id)
  const setCustomValue = useCallback(async (rowId: string, column: ColumnConfig, value: any) => {
    setCustomFieldValueInStore(tableKey, projectId, rowId, column.internal_key, value)

    if (rowId.startsWith('temp-')) {
      // Row not yet persisted — value stays in shared state only until the
      // row is saved. It will not survive a page refresh before that point;
      // this mirrors the existing debounced-autosave latency for system columns.
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
  }, [tableKey, projectId, setCustomFieldValueInStore])

  // Remove all custom values tied to a set of deleted rows (best-effort, RLS/cascade also covers row deletion)
  const clearCustomValuesForRows = useCallback((rowIds: string[]) => {
    clearCustomFieldValuesForRowsInStore(tableKey, projectId, rowIds)
  }, [tableKey, projectId, clearCustomFieldValuesForRowsInStore])

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
