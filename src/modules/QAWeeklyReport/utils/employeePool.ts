// src/modules/QAWeeklyReport/utils/employeePool.ts
//
// Bridges Team Capacity Overview (uploaded Excel) → Team Resource Allocation.
//
// Source of truth notes (traced, not assumed):
// - There is no centralised employees / qa_engineers table in this app. Team
//   Resource Allocation stores plain display names in three string[] fields on
//   the QA report form, and Team Capacity Overview rows only carry a per-upload
//   ephemeral `id` (crypto.randomUUID()) plus the employee name.
// - So the only join key that survives a re-upload is the employee name, unless
//   the uploaded sheet itself provides an Employee ID column — in which case
//   `TeamMemberCapacity.employee_id` is populated by the parser and is preferred
//   for de-duplicating rows.
// - Project / team isolation comes for free: this module only ever reads the
//   capacity data of the *current* report (`form.teamCapacity`), which the store
//   clears via resetForm() whenever the user switches project.

import type { MemberStatus, TeamCapacityData, TeamMemberCapacity } from '../types/teamCapacity'

/** Allocation buckets, driven by the fields that already exist on QAReportForm. */
export type AllocationFieldKey = 'newFeatureTeam' | 'supportTeam' | 'automationTeam'

export interface AllocationCategory {
  key: AllocationFieldKey
  label: string
}

/**
 * Single source of truth for the Team Resource Allocation buckets.
 * Labels intentionally match the existing form + markdown output exactly.
 * Adding a category here wires up its input, drop target and assign menu.
 */
export const ALLOCATION_CATEGORIES: AllocationCategory[] = [
  { key: 'newFeatureTeam', label: 'New Feature Testing' },
  { key: 'supportTeam', label: 'Support Team' },
  { key: 'automationTeam', label: 'Automation Team' },
]

export type AllocationAssignments = Record<AllocationFieldKey, string[]>

/** Read the current allocation arrays off the report form, defensively. */
export function readAllocationAssignments(form: any): AllocationAssignments {
  const out = {} as AllocationAssignments
  for (const cat of ALLOCATION_CATEGORIES) {
    const value = form?.[cat.key]
    out[cat.key] = Array.isArray(value) ? value.filter(Boolean).map((v: any) => String(v)) : []
  }
  return out
}

function stripDiacritics(value: string): string {
  try {
    return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  } catch {
    return value
  }
}

/**
 * Comparison key for employee names — absorbs the *safe* formatting
 * differences only (case, accents, extra spaces, punctuation, trailing
 * qualifiers like "(QA)", and "Last, First" ordering). Deliberately not fuzzy:
 * two genuinely different names never collapse into one.
 */
export function employeeMatchKey(value: string | null | undefined): string {
  let s = stripDiacritics(String(value ?? '')).toLowerCase()
  s = s.replace(/\([^)]*\)/g, ' ')

  const commaParts = s.split(',')
  if (commaParts.length === 2 && commaParts[0].trim() && commaParts[1].trim()) {
    s = `${commaParts[1]} ${commaParts[0]}`
  }

  return s
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Trimmed display name, collapsing internal whitespace runs. */
export function cleanEmployeeName(value: string | null | undefined): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim()
}

/**
 * Append a name to an allocation bucket unless the same employee is already
 * there. Returns the original array when nothing changed, so callers can skip
 * a store write (and therefore avoid a spurious "unsaved changes" state).
 */
export function addEmployeeUnique(list: string[], name: string): string[] {
  const clean = cleanEmployeeName(name)
  const key = employeeMatchKey(clean)
  if (!clean || !key) return list
  const current = Array.isArray(list) ? list : []
  if (current.some(existing => employeeMatchKey(existing) === key)) return current
  return [...current, clean]
}

export type EmployeeSource = 'capacity' | 'manual'

export interface PoolEmployee {
  /** Stable within a render — id-based when the sheet provides one, else name-based. */
  key: string
  name: string
  employeeId?: string
  source: EmployeeSource
  status?: MemberStatus
  /** Allocation buckets this employee currently sits in (may be empty). */
  assignedTo: AllocationFieldKey[]
}

/**
 * Merge the uploaded Team Capacity Overview roster with whatever is already
 * assigned manually, without duplicates and without dropping anyone:
 *
 * - Every capacity row is included (file order). No filtering on status,
 *   utilization, zero hours, or "already assigned". The only exclusions are the
 *   ones the existing parser already applies (blank names and Total/Average
 *   style summary rows) — see utils/capacityParser.ts.
 * - Manually typed names that are not in the file are appended so nothing the
 *   user entered by hand disappears from view.
 */
export function buildEmployeePool(
  capacity: TeamCapacityData | null | undefined,
  assignments: AllocationAssignments,
): PoolEmployee[] {
  // Index current assignments by comparison key → buckets.
  const assignedByKey = new Map<string, AllocationFieldKey[]>()
  const manualOrder: { key: string; name: string }[] = []

  for (const cat of ALLOCATION_CATEGORIES) {
    for (const raw of assignments[cat.key] || []) {
      const name = cleanEmployeeName(raw)
      const key = employeeMatchKey(name)
      if (!key) continue
      const buckets = assignedByKey.get(key)
      if (buckets) {
        if (!buckets.includes(cat.key)) buckets.push(cat.key)
      } else {
        assignedByKey.set(key, [cat.key])
        manualOrder.push({ key, name })
      }
    }
  }

  const pool: PoolEmployee[] = []
  const seen = new Set<string>()

  const members: TeamMemberCapacity[] = Array.isArray(capacity?.members)
    ? (capacity!.members as TeamMemberCapacity[])
    : []

  for (const member of members) {
    const name = cleanEmployeeName(member?.name)
    const nameKey = employeeMatchKey(name)
    if (!name || !nameKey) continue

    const employeeId = cleanEmployeeName((member as any)?.employee_id)
    const idKey = employeeId ? `id:${employeeId.toLowerCase()}` : ''
    const nameIdentity = `name:${nameKey}`

    // Prefer the stable sheet ID when present; still guard on name so the same
    // person listed twice with different IDs cannot appear twice.
    if ((idKey && seen.has(idKey)) || seen.has(nameIdentity)) continue
    if (idKey) seen.add(idKey)
    seen.add(nameIdentity)

    pool.push({
      key: idKey || nameIdentity,
      name,
      ...(employeeId ? { employeeId } : {}),
      source: 'capacity',
      status: member?.status,
      assignedTo: assignedByKey.get(nameKey) ?? [],
    })
  }

  for (const entry of manualOrder) {
    const nameIdentity = `name:${entry.key}`
    if (seen.has(nameIdentity)) continue
    seen.add(nameIdentity)
    pool.push({
      key: nameIdentity,
      name: entry.name,
      source: 'manual',
      assignedTo: assignedByKey.get(entry.key) ?? [],
    })
  }

  return pool
}

/** MIME type used for pool → bucket drag & drop. */
export const EMPLOYEE_DRAG_TYPE = 'application/x-qaly-employee'

/** Read a dragged employee name, falling back to text/plain for Safari. */
export function readDraggedEmployeeName(dataTransfer: DataTransfer | null): string {
  if (!dataTransfer) return ''
  let value = ''
  try {
    value = dataTransfer.getData(EMPLOYEE_DRAG_TYPE) || ''
  } catch {
    value = ''
  }
  if (!value) {
    try {
      value = dataTransfer.getData('text/plain') || ''
    } catch {
      value = ''
    }
  }
  return cleanEmployeeName(value)
}
