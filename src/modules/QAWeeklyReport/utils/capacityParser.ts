// src/modules/QAWeeklyReport/utils/capacityParser.ts
// Parse team capacity Excel: Employee Name, Logged Hours, Leave Hours,
// Effective Work, Available, Utilization Percentage

import type { TeamMemberCapacity, TeamCapacityData } from '../types/teamCapacity'
import {
  getMemberStatus,
  calculateCapacityStats,
  inferDefaultAvailableHours,
} from '../types/teamCapacity'

const NAME_ALIASES = [
  'employee name',
  'employee',
  'full name',
  'team member',
  'member name',
  'resource name',
  'resource',
  'user name',
  'username',
  'member',
  'name',
]

const LOGGED_ALIASES = [
  'logged hours',
  'hours logged',
  'time logged',
  'logged',
  'worked hours',
  'hours worked',
  'work hours',
  'working hours',
  'billable hours',
  'total logged',
]

// Do NOT put "capacity hours" / bare "hours" here — those match Available.
const AVAILABLE_ALIASES = [
  'available hours',
  'available capacity',
  'capacity hours',
  'planned hours',
  'planned capacity',
  'standard hours',
  'expected hours',
  'available',
  'capacity',
]

const LEAVE_ALIASES = [
  'leave hours',
  'on leave',
  'leave',
  'pto',
  'time off',
  'absence',
]

const EFFECTIVE_ALIASES = [
  'effective work',
  'effective work hours',
  'effective hours',
  'effective',
  'net hours',
  'productive hours',
]

const UTILIZATION_ALIASES = [
  'utilization percentage',
  'utilisation percentage',
  'utilization %',
  'utilisation %',
  'utilization percent',
  'utilisation percent',
  'utilization',
  'utilisation',
  'util %',
  'util%',
  'util',
]

// Optional stable identifier column. Never required — when absent, employees
// are matched by name (the app has no central employee registry).
const ID_ALIASES = [
  'employee id',
  'employee code',
  'employee number',
  'emp id',
  'emp code',
  'emp no',
  'emp number',
  'staff id',
  'resource id',
  'member id',
  'user id',
  'id',
]

const SUMMARY_NAME_RE = /^(total|grand total|sum|average|avg|subtotal|overall)$/i

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[%]+/g, ' %')
    .replace(/[_/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Prefer exact alias match, then "starts with", then "includes". */
function findColumn(headers: string[], aliases: string[]): number {
  for (const alias of aliases) {
    const exact = headers.findIndex(h => h === alias)
    if (exact !== -1) return exact
  }
  for (const alias of aliases) {
    const starts = headers.findIndex(h => h.startsWith(alias))
    if (starts !== -1) return starts
  }
  for (const alias of aliases) {
    const includes = headers.findIndex(h => h.includes(alias))
    if (includes !== -1) return includes
  }
  return -1
}

/**
 * Stricter lookup for the optional ID column: exact match, then "starts with".
 * The loose "includes" pass is deliberately skipped so a header such as
 * "Valid Hours" can never be mistaken for an "id" column.
 */
function findIdColumn(headers: string[], excluded: number[]): number {
  const isUsable = (idx: number) => idx !== -1 && !excluded.includes(idx)

  for (const alias of ID_ALIASES) {
    const exact = headers.findIndex((h, idx) => h === alias && !excluded.includes(idx))
    if (isUsable(exact)) return exact
  }
  for (const alias of ID_ALIASES) {
    if (alias === 'id') continue // bare "id" only ever matches exactly
    const starts = headers.findIndex((h, idx) => h.startsWith(alias) && !excluded.includes(idx))
    if (isUsable(starts)) return starts
  }
  return -1
}

function parseHours(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  const raw = String(value ?? '')
    .replace(/,/g, '')
    .replace(/h(ours?)?$/i, '')
    .trim()
  if (!raw) return 0
  const n = parseFloat(raw)
  return Number.isFinite(n) ? n : 0
}

/** Excel may store 101.3, "101.3%", or 1.013 as a fraction. */
function parseUtilizationPercent(value: unknown): number | undefined {
  if (value === null || value === undefined || value === '') return undefined

  if (typeof value === 'number' && Number.isFinite(value)) {
    // Sheet fraction like 0.9 → 90%; already-percent like 90 / 101.3 kept as-is
    if (value > 0 && value <= 1.5) return Number((value * 100).toFixed(1))
    return Number(value.toFixed(1))
  }

  const raw = String(value).replace(/,/g, '').trim()
  if (!raw) return undefined
  const hasPercent = raw.includes('%')
  const n = parseFloat(raw.replace(/%/g, '').trim())
  if (!Number.isFinite(n)) return undefined
  if (!hasPercent && n > 0 && n <= 1.5) return Number((n * 100).toFixed(1))
  return Number(n.toFixed(1))
}

function newMemberId(): string {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    /* ignore */
  }
  return `cap-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export async function parseTeamCapacityExcel(file: File): Promise<TeamCapacityData> {
  const XLSX = await import('xlsx')
  const read = XLSX.read ?? (XLSX as any).default?.read
  const utils = XLSX.utils ?? (XLSX as any).default?.utils
  if (typeof read !== 'function' || !utils) {
    throw new Error('Excel parser failed to load. Please refresh and try again.')
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const buffer = e.target?.result
        if (!buffer) throw new Error('Could not read file contents.')

        const workbook = read(new Uint8Array(buffer as ArrayBuffer), { type: 'array' })
        const sheetName = workbook.SheetNames?.[0]
        if (!sheetName) throw new Error('No sheets found in the uploaded file.')

        const firstSheet = workbook.Sheets[sheetName]
        if (!firstSheet) throw new Error('Could not open the first sheet in the file.')

        const jsonData = utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][]
        if (!jsonData.length) throw new Error('The spreadsheet appears to be empty.')

        let headerRowIndex = -1
        let nameColIndex = -1
        let idColIndex = -1
        let loggedColIndex = -1
        let leaveColIndex = -1
        let availableColIndex = -1
        let effectiveColIndex = -1
        let utilizationColIndex = -1

        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          const headers = row.map(normalizeHeader)
          if (headers.filter(Boolean).length === 0) continue

          const nameIdx = findColumn(headers, NAME_ALIASES)
          const leaveIdx = findColumn(headers, LEAVE_ALIASES)
          const availableIdx = findColumn(headers, AVAILABLE_ALIASES)
          const effectiveIdx = findColumn(headers, EFFECTIVE_ALIASES)
          const utilIdx = findColumn(headers, UTILIZATION_ALIASES)

          // Mask non-logged columns so "hours" aliases don't steal Available / Leave / Effective
          const headersForLogged = headers.map((h, idx) =>
            idx === leaveIdx || idx === availableIdx || idx === effectiveIdx || idx === utilIdx
              ? ''
              : h,
          )
          const loggedIdx = findColumn(headersForLogged, LOGGED_ALIASES)

          if (nameIdx >= 0 && loggedIdx >= 0) {
            headerRowIndex = i
            nameColIndex = nameIdx
            loggedColIndex = loggedIdx
            leaveColIndex = leaveIdx
            availableColIndex = availableIdx
            effectiveColIndex = effectiveIdx
            utilizationColIndex = utilIdx
            // Optional — resolved last so it can never steal a required column.
            idColIndex = findIdColumn(headers, [
              nameIdx,
              loggedIdx,
              leaveIdx,
              availableIdx,
              effectiveIdx,
              utilIdx,
            ])
            break
          }
        }

        if (headerRowIndex === -1 || nameColIndex === -1 || loggedColIndex === -1) {
          throw new Error(
            'Could not find required columns (Employee Name, Logged Hours). Expected headers like "Employee Name", "Logged Hours", "Leave Hours", "Available", "Utilization Percentage".',
          )
        }

        const members: TeamMemberCapacity[] = []

        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          const name = String(row[nameColIndex] ?? '').trim()
          if (!name) continue
          if (SUMMARY_NAME_RE.test(name)) continue

          const logged = parseHours(row[loggedColIndex])
          const leave = leaveColIndex >= 0 ? parseHours(row[leaveColIndex]) : 0
          const availableRaw = availableColIndex >= 0 ? parseHours(row[availableColIndex]) : NaN
          const available =
            Number.isFinite(availableRaw) && availableRaw > 0 ? availableRaw : undefined

          const effectiveRaw = effectiveColIndex >= 0 ? parseHours(row[effectiveColIndex]) : NaN
          const effective =
            effectiveColIndex >= 0 && Number.isFinite(effectiveRaw)
              ? effectiveRaw
              : undefined

          const utilRaw =
            utilizationColIndex >= 0
              ? parseUtilizationPercent(row[utilizationColIndex])
              : undefined

          const status = getMemberStatus(logged, leave, available)

          const employeeId =
            idColIndex >= 0 ? String(row[idColIndex] ?? '').replace(/\s+/g, ' ').trim() : ''

          members.push({
            id: newMemberId(),
            name,
            ...(employeeId ? { employee_id: employeeId } : {}),
            logged_hours: logged,
            leave_hours: leave,
            ...(available !== undefined ? { available_hours: available } : {}),
            ...(effective !== undefined ? { effective_work: effective } : {}),
            ...(utilRaw !== undefined ? { utilization_percent: utilRaw } : {}),
            status,
          })
        }

        if (members.length === 0) {
          throw new Error('No valid employee data found in Excel file')
        }

        // Sheets with no "Available" column: re-bucket every row against the
        // sheet-level planned hours (40 for weekly sheets, 176 for monthly)
        // now that all rows are known, instead of the per-row 40h fallback.
        const inferredAvailable = inferDefaultAvailableHours(members)
        for (const member of members) {
          member.status = getMemberStatus(
            member.logged_hours,
            member.leave_hours,
            member.available_hours ?? inferredAvailable,
          )
        }

        const stats = calculateCapacityStats(members)
        const periodMatch = file.name.match(/(\d{4}[-_]\d{2}[-_]\d{2})|(\w+\s+\d{4})/i)

        resolve({
          file_name: file.name,
          period_start: periodMatch ? periodMatch[0] : undefined,
          members,
          stats,
        })
      } catch (error: any) {
        reject(new Error(`Failed to parse Excel: ${error?.message || String(error)}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsArrayBuffer(file)
  })
}

export function validateCapacityData(data: TeamCapacityData): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  const members = Array.isArray(data?.members) ? data.members : []

  if (members.length === 0) {
    errors.push('No team members found in the data')
  } else {
    const invalidMembers = members.filter(m => !m?.name || String(m.name).trim() === '')
    if (invalidMembers.length > 0) {
      errors.push(`${invalidMembers.length} member(s) have missing names`)
    }

    const negativeHours = members.filter(
      m => Number(m?.logged_hours) < 0 || Number(m?.leave_hours) < 0,
    )
    if (negativeHours.length > 0) {
      errors.push(`${negativeHours.length} member(s) have negative hours`)
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
