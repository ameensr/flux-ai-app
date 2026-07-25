// Shared helpers for Support / Release log column visibility, custom-field
// ids ("Create New" from Import from DUP), and display order.

import type { MappingEntry } from './dupImportMapping'

export const CF_PREFIX = 'cf:'

export function customColId(internalKey: string) {
  return `${CF_PREFIX}${internalKey}`
}

export function isCustomColId(id: string) {
  return id.startsWith(CF_PREFIX)
}

export function customInternalKey(id: string) {
  return id.slice(CF_PREFIX.length)
}

export type StdColDef = { id: string; label: string; defaultVisible?: boolean }

export type OrderedCol = {
  id: string
  label: string
  kind: 'standard' | 'custom'
  internalKey?: string
}

/** Build the table column list (standard + Create New), ordered by saved import order. */
export function buildOrderedColumns(
  standard: StdColDef[],
  customKeys: string[],
  customLabels: Record<string, string>,
  order: string[] | undefined,
): OrderedCol[] {
  const byId = new Map<string, OrderedCol>()
  for (const c of standard) {
    byId.set(c.id, { id: c.id, label: c.label, kind: 'standard' })
  }
  for (const key of customKeys) {
    byId.set(customColId(key), {
      id: customColId(key),
      label: customLabels[key] || key,
      kind: 'custom',
      internalKey: key,
    })
  }

  const result: OrderedCol[] = []
  const seen = new Set<string>()
  for (const id of order || []) {
    const col = byId.get(id)
    if (col && !seen.has(id)) {
      result.push(col)
      seen.add(id)
    }
  }
  for (const col of byId.values()) {
    if (!seen.has(col.id)) {
      result.push(col)
      seen.add(col.id)
    }
  }
  return result
}

/** Derive QA-report column order from the mapping modal row order. */
export function buildOrderFromMappingEntries(entries: MappingEntry[], standardIds: string[]): string[] {
  const order: string[] = []
  const seen = new Set<string>()
  for (const e of entries) {
    if (e.action === 'skip') continue
    if (e.action === 'create_new' && e.internalKey) {
      const id = customColId(e.internalKey)
      if (!seen.has(id)) {
        order.push(id)
        seen.add(id)
      }
    } else if (e.action === 'map_existing' && e.targetField) {
      if (!seen.has(e.targetField)) {
        order.push(e.targetField)
        seen.add(e.targetField)
      }
    }
  }
  for (const id of standardIds) {
    if (!seen.has(id)) {
      order.push(id)
      seen.add(id)
    }
  }
  return order
}

export function isColVisible(
  visibility: Record<string, boolean> | undefined,
  colId: string,
  defaultVisible = true,
): boolean {
  if (!visibility || visibility[colId] === undefined) return defaultVisible
  return !!visibility[colId]
}
