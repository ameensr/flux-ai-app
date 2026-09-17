// src/modules/QAWeeklyReport/components/ReleaseBugStatus/taskWiseParser.ts
// Parser for Task-Wise Status - preserves exact Excel field names

import type {
  TaskWiseAnalytics,
  TaskWiseRecord,
  ParentStatusSummary,
  OverallStatusSummary,
} from './taskWiseTypes'
import {
  PARENT_COLUMN_ALIASES,
  TASK_STATUS_COLUMN_ALIASES,
} from './taskWiseTypes'

// ── Header Detection ──────────────────────────────────────────────────────────

function findColumnIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map(h => h?.toString().toLowerCase().trim() || '')
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias)
    if (idx !== -1) return idx
  }
  // Fuzzy: check if any header contains the alias
  for (const alias of aliases) {
    const idx = normalized.findIndex(h => h.includes(alias))
    if (idx !== -1) return idx
  }
  return -1
}

// ── Main Parser ───────────────────────────────────────────────────────────────

export async function parseTaskWiseFile(file: File): Promise<TaskWiseAnalytics> {
  const XLSX = await import('xlsx')

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        const sheetName = workbook.SheetNames[0]
        if (!sheetName) throw new Error('No sheets found in the uploaded file.')

        const sheet = workbook.Sheets[sheetName]
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

        if (rows.length < 2) throw new Error('The spreadsheet appears to be empty or has no data rows.')

        // Get exact headers from first row (preserve original names)
        const headers = (rows[0] || []).map(h => String(h || '').trim())
        const detectedColumns = headers.filter(h => h.length > 0)

        // Find Parent and Status columns
        const parentColIdx = findColumnIndex(headers, PARENT_COLUMN_ALIASES)
        const statusColIdx = findColumnIndex(headers, TASK_STATUS_COLUMN_ALIASES)

        if (statusColIdx === -1) {
          throw new Error('Could not find a "Status" column. Please ensure your spreadsheet has a Status column.')
        }

        const parentColumn = parentColIdx !== -1 ? headers[parentColIdx] : null
        const statusColumn = headers[statusColIdx]

        // Parse all data rows into records with exact field names
        const allRecords: TaskWiseRecord[] = []
        const dataRows = rows.slice(1).filter(row => row && row.length > 0)

        for (const row of dataRows) {
          const record: TaskWiseRecord = {}
          headers.forEach((header, idx) => {
            if (header) {
              record[header] = row[idx] !== undefined && row[idx] !== null 
                ? String(row[idx]).trim() 
                : ''
            }
          })
          // Only include rows that have a status value
          if (record[statusColumn]) {
            allRecords.push(record)
          }
        }

        if (allRecords.length === 0) throw new Error('No valid data rows found after the header.')

        // Calculate Overall Status Summary
        const statusMap = new Map<string, number>()
        for (const record of allRecords) {
          const status = record[statusColumn] || ''
          if (status) {
            statusMap.set(status, (statusMap.get(status) || 0) + 1)
          }
        }

        const overallStatus: OverallStatusSummary[] = [...statusMap.entries()]
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count)

        const uniqueStatuses = [...statusMap.keys()]

        // Calculate Parent-Wise Status Summary
        const parentWiseStatus: ParentStatusSummary[] = []
        let blankParentCount = 0

        if (parentColumn) {
          const parentMap = new Map<string, Map<string, number>>()

          for (const record of allRecords) {
            let parent = record[parentColumn] || ''
            if (!parent || parent.trim() === '') {
              parent = 'No Parent Assigned'
              blankParentCount++
            }
            
            const status = record[statusColumn] || ''
            
            if (!parentMap.has(parent)) {
              parentMap.set(parent, new Map())
            }
            const statusCounts = parentMap.get(parent)!
            statusCounts.set(status, (statusCounts.get(status) || 0) + 1)
          }

          for (const [parent, statusCounts] of parentMap) {
            const total = [...statusCounts.values()].reduce((sum, c) => sum + c, 0)
            const countsObj: Record<string, number> = {}
            for (const [status, count] of statusCounts) {
              countsObj[status] = count
            }
            parentWiseStatus.push({ parent, total, statusCounts: countsObj })
          }

          // Sort by total descending
          parentWiseStatus.sort((a, b) => b.total - a.total)
        }

        // Validation
        const parentWiseTotal = parentWiseStatus.reduce((sum, p) => sum + p.total, 0)
        const overallStatusTotal = overallStatus.reduce((sum, s) => sum + s.count, 0)

        const validation = {
          totalRecordsMatch: allRecords.length === overallStatusTotal,
          parentWiseTotalMatch: parentColumn ? parentWiseTotal === allRecords.length : true,
          overallStatusTotalMatch: overallStatusTotal === allRecords.length,
          missingFields: [] as string[],
          blankParentCount,
        }

        if (!parentColumn) validation.missingFields.push('Parent')

        resolve({
          uploadedFileName: file.name,
          uploadedAt: new Date().toISOString(),
          rawRowCount: allRecords.length,
          detectedColumns,
          parentColumn,
          statusColumn,
          allRecords,
          parentWiseStatus,
          overallStatus,
          uniqueParents: parentWiseStatus.length,
          uniqueStatuses,
          validation,
        })
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to parse the uploaded file.'))
      }
    }

    reader.onerror = () => reject(new Error('Failed to read the file.'))
    reader.readAsArrayBuffer(file)
  })
}
