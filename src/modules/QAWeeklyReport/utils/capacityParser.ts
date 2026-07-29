// src/modules/QAWeeklyReport/utils/capacityParser.ts
// Simplified parser for team capacity Excel files

import type { TeamMemberCapacity, TeamCapacityData } from '../types/teamCapacity'
import { getMemberStatus, calculateCapacityStats } from '../types/teamCapacity'

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
  'capacity hours',
  'total hours',
  'total logged',
  'hours',
  'total',
  'work',
]

const LEAVE_ALIASES = [
  'leave hours',
  'on leave',
  'leave',
  'pto',
  'time off',
  'absence',
]

const SUMMARY_NAME_RE = /^(total|grand total|sum|average|avg|subtotal|overall)$/i

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .toLowerCase()
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
  // Loaded on demand (not at module load) to keep the ~860KB xlsx parser out
  // of this route's chunk until a user actually uploads a file.
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

        // Match Release Bug Status / Daily Update: ArrayBuffer + type 'array'
        // (readAsBinaryString is deprecated and fails in some environments)
        const workbook = read(new Uint8Array(buffer as ArrayBuffer), { type: 'array' })
        const sheetName = workbook.SheetNames?.[0]
        if (!sheetName) throw new Error('No sheets found in the uploaded file.')

        const firstSheet = workbook.Sheets[sheetName]
        if (!firstSheet) throw new Error('Could not open the first sheet in the file.')

        const jsonData = utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][]
        if (!jsonData.length) throw new Error('The spreadsheet appears to be empty.')

        // Find header row (search first 10 rows; reset indices each row)
        let headerRowIndex = -1
        let nameColIndex = -1
        let loggedColIndex = -1
        let leaveColIndex = -1

        for (let i = 0; i < Math.min(10, jsonData.length); i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          const headers = row.map(normalizeHeader)
          // Skip title rows with almost no header-like cells
          const nonEmpty = headers.filter(Boolean).length
          if (nonEmpty === 0) continue

          const nameIdx = findColumn(headers, NAME_ALIASES)
          const loggedIdx = findColumn(headers, LOGGED_ALIASES)
          const leaveIdx = findColumn(headers, LEAVE_ALIASES)

          // Don't treat "Total Leave Hours" as the logged-hours column when a leave col exists
          let resolvedLogged = loggedIdx
          if (resolvedLogged !== -1 && leaveIdx !== -1 && resolvedLogged === leaveIdx) {
            const headersWithoutLeave = headers.map((h, idx) => (idx === leaveIdx ? '' : h))
            resolvedLogged = findColumn(headersWithoutLeave, LOGGED_ALIASES)
          }

          if (nameIdx >= 0 && resolvedLogged >= 0) {
            headerRowIndex = i
            nameColIndex = nameIdx
            loggedColIndex = resolvedLogged
            leaveColIndex = leaveIdx
            break
          }
        }

        if (headerRowIndex === -1 || nameColIndex === -1 || loggedColIndex === -1) {
          throw new Error(
            'Could not find required columns (Employee Name, Logged Hours). Expected headers like "Employee Name" / "Name" and "Logged Hours" / "Hours".'
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
          const status = getMemberStatus(logged, leave)

          members.push({
            id: newMemberId(),
            name,
            logged_hours: logged,
            leave_hours: leave,
            status,
          })
        }

        if (members.length === 0) {
          throw new Error('No valid employee data found in Excel file')
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
      m => Number(m?.logged_hours) < 0 || Number(m?.leave_hours) < 0
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
