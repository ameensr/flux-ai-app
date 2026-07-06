// src/modules/QAWeeklyReport/utils/capacityParser.ts
// Simplified parser for team capacity Excel files

import * as XLSX from 'xlsx'
import type { TeamMemberCapacity, TeamCapacityData } from '../types/teamCapacity'
import { getMemberStatus, calculateCapacityStats } from '../types/teamCapacity'

interface ParsedRow {
  name: string
  logged: number
  leave: number
}

export async function parseTeamCapacityExcel(file: File): Promise<TeamCapacityData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as any[][]

        // Find header row (search first 5 rows)
        let headerRowIndex = -1
        let nameColIndex = -1
        let loggedColIndex = -1
        let leaveColIndex = -1

        for (let i = 0; i < Math.min(5, jsonData.length); i++) {
          const row = jsonData[i]
          if (!row) continue

          for (let j = 0; j < row.length; j++) {
            const cell = String(row[j] || '').toLowerCase()

            if (cell.includes('employee') || cell.includes('name') || cell.includes('member')) {
              nameColIndex = j
            }
            if (cell.includes('logged') || cell.includes('total') || cell.includes('work')) {
              loggedColIndex = j
            }
            if (cell.includes('leave')) {
              leaveColIndex = j
            }
          }

          if (nameColIndex >= 0 && loggedColIndex >= 0) {
            headerRowIndex = i
            break
          }
        }

        if (headerRowIndex === -1 || nameColIndex === -1 || loggedColIndex === -1) {
          throw new Error('Could not find required columns (Employee Name, Logged Hours)')
        }

        // Parse data rows
        const members: TeamMemberCapacity[] = []

        for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          const name = String(row[nameColIndex] || '').trim()
          if (!name) continue

          const logged = parseFloat(String(row[loggedColIndex] || '0')) || 0
          const leave = leaveColIndex >= 0 ? (parseFloat(String(row[leaveColIndex] || '0')) || 0) : 0

          const status = getMemberStatus(logged, leave)

          members.push({
            id: crypto.randomUUID(),
            name,
            logged_hours: logged,
            leave_hours: leave,
            status
          })
        }

        if (members.length === 0) {
          throw new Error('No valid employee data found in Excel file')
        }

        const stats = calculateCapacityStats(members)

        // Try to extract period from filename
        const periodMatch = file.name.match(/(\d{4}[-_]\d{2}[-_]\d{2})|(\w+\s+\d{4})/i)

        resolve({
          file_name: file.name,
          period_start: periodMatch ? periodMatch[0] : undefined,
          members,
          stats
        })

      } catch (error: any) {
        reject(new Error(`Failed to parse Excel: ${error.message}`))
      }
    }

    reader.onerror = () => {
      reject(new Error('Failed to read file'))
    }

    reader.readAsBinaryString(file)
  })
}

export function validateCapacityData(data: TeamCapacityData): { valid: boolean; errors: string[] } {
  const errors: string[] = []

  if (!data.members || data.members.length === 0) {
    errors.push('No team members found in the data')
  }

  if (data.members.length > 0) {
    const invalidMembers = data.members.filter(m => !m.name || m.name.trim() === '')
    if (invalidMembers.length > 0) {
      errors.push(`${invalidMembers.length} member(s) have missing names`)
    }

    const negativeHours = data.members.filter(m => m.logged_hours < 0 || m.leave_hours < 0)
    if (negativeHours.length > 0) {
      errors.push(`${negativeHours.length} member(s) have negative hours`)
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}
