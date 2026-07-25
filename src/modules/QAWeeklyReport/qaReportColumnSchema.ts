// Unified column schema for QA Report Support / Release tables.
// Source of truth shared by Import-from-DUP mapping, table render, Columns
// show/hide, preview, and save — so Create New / Map to Existing never
// produce duplicate or orphaned columns.

import type { ColumnConfig, DailyReportTableKey } from '@/modules/DailyUpdateReport/types'
import { QA_RELEASE_FIELDS, QA_SUPPORT_FIELDS, qaReportEligibleColumns, type MappingEntry } from './dupImportMapping'

export type QAReportColumnKind = 'builtin' | 'custom'

export interface QAReportTableColumn {
  /** Stable id: builtin field key (taskId, …) OR DUP internal_key for Create New */
  id: string
  label: string
  kind: QAReportColumnKind
  /** DUP column_type for Create New (text/date/dropdown/…); builtins use their fixed controls */
  columnType?: string
  visible: boolean
  order: number
}

export const DEFAULT_SUPPORT_COLUMNS: QAReportTableColumn[] = QA_SUPPORT_FIELDS.map((f, i) => ({
  id: f.key,
  label: f.label,
  kind: 'builtin' as const,
  visible: true,
  order: i,
}))

export const DEFAULT_RELEASE_COLUMNS: QAReportTableColumn[] = QA_RELEASE_FIELDS.map((f, i) => ({
  id: f.key,
  label: f.label,
  kind: 'builtin' as const,
  visible: true,
  order: i,
}))

export function defaultSchemaForTable(tableKey: DailyReportTableKey): QAReportTableColumn[] {
  return tableKey === 'support' ? DEFAULT_SUPPORT_COLUMNS.map(c => ({ ...c })) : DEFAULT_RELEASE_COLUMNS.map(c => ({ ...c }))
}

export function builtinLabel(tableKey: DailyReportTableKey, fieldKey: string): string {
  const fields = tableKey === 'support' ? QA_SUPPORT_FIELDS : QA_RELEASE_FIELDS
  return fields.find(f => f.key === fieldKey)?.label || fieldKey
}

/** Destination columns implied by the current mapping (skips ignored). Deduped by destination id. */
export function buildDestinationColumnsFromMapping(
  tableKey: DailyReportTableKey,
  columns: ColumnConfig[],
  mapping: MappingEntry[] | Record<string, MappingEntry>,
  destinationOrder?: string[],
): QAReportTableColumn[] {
  const eligible = qaReportEligibleColumns(columns)
  const entries = Array.isArray(mapping) ? mapping : Object.values(mapping)
  const byId = new Map(eligible.map(c => [c.id, c]))

  const destinations = new Map<string, QAReportTableColumn>()

  for (const entry of entries) {
    if (!entry || entry.action === 'skip') continue
    const col = byId.get(entry.dupColumnId)
    if (!col) continue

    if (entry.action === 'map_existing' && entry.targetField) {
      const id = entry.targetField
      if (!destinations.has(id)) {
        destinations.set(id, {
          id,
          label: builtinLabel(tableKey, id),
          kind: 'builtin',
          visible: true,
          order: destinations.size,
        })
      }
    } else if (entry.action === 'create_new') {
      const id = col.internal_key
      destinations.set(id, {
        id,
        label: (entry.targetField || col.display_name || id).trim() || id,
        kind: 'custom',
        columnType: col.column_type,
        visible: true,
        order: destinations.size,
      })
    }
  }

  let list = Array.from(destinations.values())

  if (destinationOrder && destinationOrder.length > 0) {
    const orderIndex = new Map(destinationOrder.map((id, i) => [id, i]))
    list = list
      .slice()
      .sort((a, b) => {
        const ai = orderIndex.has(a.id) ? orderIndex.get(a.id)! : 9999
        const bi = orderIndex.has(b.id) ? orderIndex.get(b.id)! : 9999
        return ai - bi
      })
  }

  return list.map((c, i) => ({ ...c, order: i }))
}

/** Merge import destinations into the current schema (preserve visibility of existing ids). */
export function mergeColumnSchemas(
  existing: QAReportTableColumn[] | undefined,
  incoming: QAReportTableColumn[],
): QAReportTableColumn[] {
  const prev = existing && existing.length > 0 ? existing : []
  const byId = new Map(prev.map(c => [c.id, c]))

  // Incoming order is authoritative for columns present in this import.
  const merged: QAReportTableColumn[] = incoming.map((c, i) => {
    const old = byId.get(c.id)
    return {
      ...c,
      visible: old?.visible !== false,
      order: i,
      label: c.label || old?.label || c.id,
    }
  })

  // Keep any prior columns that still matter (manual edits / prior imports)
  // but were not in this mapping — append after ordered destinations.
  for (const old of prev) {
    if (!merged.some(c => c.id === old.id)) {
      merged.push({ ...old, order: merged.length })
    }
  }

  return merged.map((c, i) => ({ ...c, order: i }))
}

export function normalizeColumnSchema(
  schema: QAReportTableColumn[] | undefined | null,
  tableKey: DailyReportTableKey,
): QAReportTableColumn[] {
  if (!Array.isArray(schema) || schema.length === 0) {
    return defaultSchemaForTable(tableKey)
  }
  return schema
    .filter(Boolean)
    .map((c, i) => ({
      id: String(c.id || ''),
      label: String(c.label || c.id || ''),
      kind: c.kind === 'custom' ? 'custom' as const : 'builtin' as const,
      columnType: c.columnType,
      visible: c.visible !== false,
      order: typeof c.order === 'number' ? c.order : i,
    }))
    .filter(c => c.id)
    .sort((a, b) => a.order - b.order)
    .map((c, i) => ({ ...c, order: i }))
}

export function orderedVisibleColumns(schema: QAReportTableColumn[]): QAReportTableColumn[] {
  return schema.filter(c => c.visible !== false).sort((a, b) => a.order - b.order)
}

export function visibilityMapFromSchema(schema: QAReportTableColumn[]): Record<string, boolean> {
  return schema.reduce((acc, c) => {
    acc[c.id] = c.visible !== false
    return acc
  }, {} as Record<string, boolean>)
}

export function applyVisibilityToSchema(
  schema: QAReportTableColumn[],
  colId: string,
): QAReportTableColumn[] {
  return schema.map(c => (c.id === colId ? { ...c, visible: !c.visible } : c))
}

export function customFieldLabelsFromSchema(schema: QAReportTableColumn[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const c of schema) {
    if (c.kind === 'custom') out[c.id] = c.label
  }
  return out
}

/**
 * Hydrate schema for older saved reports that only had visibleSupportColumns /
 * visibleReleaseColumns + ad-hoc customFields on rows (no unified schema yet).
 */
export function hydrateSchemaFromLegacy(
  tableKey: DailyReportTableKey,
  stored: QAReportTableColumn[] | undefined,
  legacyVisibility: Record<string, boolean> | undefined,
  customKeysWithLabels: Record<string, string>,
): QAReportTableColumn[] {
  if (Array.isArray(stored) && stored.length > 0) {
    // Ensure any custom keys present on rows are registered even if missing from stored schema
    const base = normalizeColumnSchema(stored, tableKey)
    const missing = Object.entries(customKeysWithLabels)
      .filter(([id]) => !base.some(c => c.id === id))
      .map(([id, label], i) => ({
        id,
        label,
        kind: 'custom' as const,
        visible: true,
        order: base.length + i,
      }))
    return missing.length ? [...base, ...missing].map((c, i) => ({ ...c, order: i })) : base
  }

  const defaults = defaultSchemaForTable(tableKey).map(c => ({
    ...c,
    visible: legacyVisibility?.[c.id] !== false,
  }))
  const customs = Object.entries(customKeysWithLabels).map(([id, label], i) => ({
    id,
    label,
    kind: 'custom' as const,
    visible: legacyVisibility?.[id] !== false,
    order: defaults.length + i,
  }))
  return [...defaults, ...customs].map((c, i) => ({ ...c, order: i }))
}
