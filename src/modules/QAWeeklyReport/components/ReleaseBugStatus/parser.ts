// src/modules/QAWeeklyReport/components/ReleaseBugStatus/parser.ts
// Intelligent Excel/CSV parser for bug tracking spreadsheets.
// Auto-detects column headers from Jira, Azure DevOps, Redmine, Bugzilla, etc.

import type {
  ReleaseBugAnalytics,
  BugStatusEntry,
  BugSeverityEntry,
  BugPriorityEntry,
  ReleaseBugMetrics,
  ReleaseHealthResult,
  ReleaseHealthStatus,
} from './types'
import {
  STATUS_GROUPS,
  STATUS_COLUMN_ALIASES,
  SEVERITY_COLUMN_ALIASES,
  PRIORITY_COLUMN_ALIASES,
} from './types'

// ── Header Detection ──────────────────────────────────────────────────────────

function findColumn(headers: string[], aliases: string[]): number {
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

// ── Status Classification ─────────────────────────────────────────────────────

function classifyStatus(status: string): keyof typeof STATUS_GROUPS | 'other' {
  const s = status.toLowerCase().trim()
  for (const [group, values] of Object.entries(STATUS_GROUPS)) {
    if ((values as readonly string[]).some(v => s === v || s.includes(v))) {
      return group as keyof typeof STATUS_GROUPS
    }
  }
  return 'other'
}

// ── Release Health Calculation ────────────────────────────────────────────────

function calculateReleaseHealth(metrics: ReleaseBugMetrics, statusDist: BugStatusEntry[]): ReleaseHealthResult {
  const { closurePercentage, activeBugs, totalBugs } = metrics

  // Check for critical/high open bugs
  const criticalStatuses = statusDist.filter(s => {
    const cls = classifyStatus(s.status)
    return cls === 'active'
  })
  const activeCriticalCount = criticalStatuses.reduce((sum, s) => sum + s.count, 0)

  let score = closurePercentage
  // Penalize for active bugs
  if (totalBugs > 0) {
    score -= (activeCriticalCount / totalBugs) * 30
  }

  score = Math.max(0, Math.min(100, score))

  let status: ReleaseHealthStatus
  let label: string
  let emoji: string
  let color: string

  if (score >= 90 && activeBugs <= 2) {
    status = 'ready'
    label = 'Ready for Release'
    emoji = '🟢'
    color = 'text-green-400'
  } else if (score >= 70) {
    status = 'needs_review'
    label = 'Needs Review'
    emoji = '🟡'
    color = 'text-amber-400'
  } else {
    status = 'not_ready'
    label = 'Not Ready'
    emoji = '🔴'
    color = 'text-red-400'
  }

  return { status, label, emoji, color, score: Math.round(score) }
}

// ── AI Summary Generation (local, no API needed) ──────────────────────────────

function generateAISummary(metrics: ReleaseBugMetrics, statusDist: BugStatusEntry[], severityDist: BugSeverityEntry[], health: ReleaseHealthResult): string {
  const { totalBugs, completedBugs, activeBugs, deferredBugs, closurePercentage } = metrics

  const topSeverity = severityDist.length > 0 ? severityDist[0].severity : 'N/A'
  const topStatus = statusDist.length > 0 ? statusDist[0].status : 'N/A'

  let summary = `A total of ${totalBugs} defects were analyzed. `
  summary += `${completedBugs} defects have been closed/verified. `
  summary += `The closure rate is ${closurePercentage.toFixed(1)}%. `

  if (activeBugs === 0) {
    summary += `No active Open or In Progress defects remain. `
  } else {
    summary += `${activeBugs} defect${activeBugs > 1 ? 's' : ''} remain actively in progress. `
  }

  if (deferredBugs > 0) {
    summary += `${deferredBugs} defect${deferredBugs > 1 ? 's are' : ' is'} deferred. `
  }

  summary += `Most defects are ${topSeverity} severity. `

  if (health.status === 'ready') {
    summary += `Overall release health is Good and the release is suitable for deployment.`
  } else if (health.status === 'needs_review') {
    summary += `Release requires review before deployment — monitoring active defects recommended.`
  } else {
    summary += `Release is NOT ready — active critical defects must be resolved before deployment.`
  }

  return summary
}

// ── Main Parser ───────────────────────────────────────────────────────────────

export async function parseReleaseBugFile(file: File): Promise<ReleaseBugAnalytics> {
  // Loaded on demand (not at module load) to keep the ~860KB xlsx parser out
  // of this route's chunk until a user actually uploads a file.
  const XLSX = await import('xlsx')

  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })

        // Use first sheet
        const sheetName = workbook.SheetNames[0]
        if (!sheetName) throw new Error('No sheets found in the uploaded file.')

        const sheet = workbook.Sheets[sheetName]
        const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 })

        if (rows.length < 2) throw new Error('The spreadsheet appears to be empty or has no data rows.')

        // Detect headers (first row)
        const headers = (rows[0] || []).map(h => String(h || ''))
        const statusCol = findColumn(headers, STATUS_COLUMN_ALIASES)
        const severityCol = findColumn(headers, SEVERITY_COLUMN_ALIASES)
        const priorityCol = findColumn(headers, PRIORITY_COLUMN_ALIASES)

        if (statusCol === -1) {
          throw new Error('Could not find a "Status" column. Please ensure your spreadsheet has a Status column.')
        }

        // Parse data rows
        const dataRows = rows.slice(1).filter(row => row && row.length > 0 && row[statusCol])

        if (dataRows.length === 0) throw new Error('No valid data rows found after the header.')

        // Count statuses
        const statusMap = new Map<string, number>()
        const severityMap = new Map<string, number>()
        const priorityMap = new Map<string, number>()

        for (const row of dataRows) {
          // Status
          const status = String(row[statusCol] || '').trim()
          if (status) statusMap.set(status, (statusMap.get(status) || 0) + 1)

          // Severity
          if (severityCol !== -1) {
            const severity = String(row[severityCol] || '').trim()
            if (severity) severityMap.set(severity, (severityMap.get(severity) || 0) + 1)
          }

          // Priority
          if (priorityCol !== -1) {
            const priority = String(row[priorityCol] || '').trim()
            if (priority) priorityMap.set(priority, (priorityMap.get(priority) || 0) + 1)
          }
        }

        // Build distributions (sorted by count desc)
        const statusDistribution: BugStatusEntry[] = [...statusMap.entries()]
          .map(([status, count]) => ({ status, count }))
          .sort((a, b) => b.count - a.count)

        const severityDistribution: BugSeverityEntry[] = [...severityMap.entries()]
          .map(([severity, count]) => ({ severity, count }))
          .sort((a, b) => b.count - a.count)

        const priorityDistribution: BugPriorityEntry[] = [...priorityMap.entries()]
          .map(([priority, count]) => ({ priority, count }))
          .sort((a, b) => b.count - a.count)

        // Calculate metrics using classification
        const totalBugs = dataRows.length
        let completedBugs = 0
        let resolvedBugs = 0
        let activeBugs = 0
        let deferredBugs = 0
        let invalidBugs = 0

        for (const [status, count] of statusMap) {
          const group = classifyStatus(status)
          switch (group) {
            case 'completed': completedBugs += count; break
            case 'resolved': resolvedBugs += count; break
            case 'active': activeBugs += count; break
            case 'deferred': deferredBugs += count; break
            case 'invalid': invalidBugs += count; break
            default: activeBugs += count; break // unknown statuses treated as active
          }
        }

        const closurePercentage = totalBugs > 0 ? ((completedBugs + resolvedBugs) / totalBugs) * 100 : 0
        const activePercentage = totalBugs > 0 ? (activeBugs / totalBugs) * 100 : 0
        const deferredPercentage = totalBugs > 0 ? (deferredBugs / totalBugs) * 100 : 0
        const invalidPercentage = totalBugs > 0 ? (invalidBugs / totalBugs) * 100 : 0

        const metrics: ReleaseBugMetrics = {
          totalBugs,
          completedBugs,
          resolvedBugs,
          activeBugs,
          deferredBugs,
          invalidBugs,
          closurePercentage,
          activePercentage,
          deferredPercentage,
          invalidPercentage,
        }

        const releaseHealth = calculateReleaseHealth(metrics, statusDistribution)
        const aiSummary = generateAISummary(metrics, statusDistribution, severityDistribution, releaseHealth)

        resolve({
          uploadedFileName: file.name,
          uploadedAt: new Date().toISOString(),
          metrics,
          statusDistribution,
          severityDistribution,
          priorityDistribution,
          releaseHealth,
          aiSummary,
          rawRowCount: dataRows.length,
        })
      } catch (err: any) {
        reject(new Error(err.message || 'Failed to parse the uploaded file.'))
      }
    }

    reader.onerror = () => reject(new Error('Failed to read the file.'))
    reader.readAsArrayBuffer(file)
  })
}
