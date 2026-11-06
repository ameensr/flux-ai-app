// src/modules/BugStatus/bugStatusPivotExport.ts
// Generates a pivot-style formatted Excel report:
//   Task Name | Status | <Sev1> | <Sev2> | ... | Grand Total
// with dark-purple headers, merged Task Name cells, bold grand-total rows.

import type { BugStatusAnalytics, BugStatusRecord } from './bugStatusTypes'

// ─── Palette ────────────────────────────────────────────────────────────────
const HEADER_BG  = '4B0082'   // dark purple
const HEADER_FG  = 'FFFFFF'
const TOTAL_BG   = '4B0082'
const TOTAL_FG   = 'FFFFFF'
const PARENT_BG  = 'EDE7F6'   // light lavender for parent subtotal rows
const PARENT_FG  = '1A0033'
const DATA_BG    = 'FFFFFF'
const DATA_FG    = '1A1A2E'
const BORDER_CLR = '000000'

// ─── Helpers ────────────────────────────────────────────────────────────────
function col(n: number): string {
  // 0-based column index → Excel letter (A, B, … Z, AA …)
  let s = ''
  n++
  while (n > 0) {
    n--
    s = String.fromCharCode(65 + (n % 26)) + s
    n = Math.floor(n / 26)
  }
  return s
}

function cellRef(r: number, c: number): string {
  return `${col(c)}${r + 1}`
}

function thinBorder() {
  const side = { style: 'thin', color: { rgb: BORDER_CLR } }
  return { top: side, bottom: side, left: side, right: side }
}

function makeCell(
  value: string | number,
  opts: {
    bold?: boolean
    bg?: string
    fg?: string
    hAlign?: 'left' | 'center' | 'right'
    vAlign?: 'top' | 'center' | 'bottom'
    wrap?: boolean
    italic?: boolean
    fontSize?: number
  } = {},
) {
  const isNum = typeof value === 'number'
  return {
    v: value,
    t: isNum ? 'n' : 's',
    s: {
      font: {
        bold: opts.bold ?? false,
        italic: opts.italic ?? false,
        color: { rgb: opts.fg ?? DATA_FG },
        sz: opts.fontSize ?? 10,
      },
      fill: { fgColor: { rgb: opts.bg ?? DATA_BG } },
      alignment: {
        horizontal: opts.hAlign ?? (isNum ? 'center' : 'left'),
        vertical: opts.vAlign ?? 'center',
        wrapText: opts.wrap ?? false,
      },
      border: thinBorder(),
    },
  }
}

// ─── Main export function ────────────────────────────────────────────────────
export async function exportPivotExcel(
  analytics: BugStatusAnalytics,
  selectedParents: string[],
): Promise<void> {
  const XLSXmod = await import('xlsx-js-style')
  const XLSX = (XLSXmod as any).default ?? XLSXmod

  const { allRecords, parentColumn, statusColumn, severityColumn, uniqueSeverities } = analytics

  if (!parentColumn || !statusColumn) {
    throw new Error('Parent or Status column not detected. Cannot generate pivot report.')
  }

  // Severity columns: use detected severities, fallback to ['Critical','Major','Minor']
  const sevCols: string[] =
    uniqueSeverities.length > 0
      ? uniqueSeverities
      : ['Critical', 'Major', 'Minor']

  // ── Build pivot data ──────────────────────────────────────────────────────
  // Map: parent → status → severity → count
  type SevMap    = Map<string, number>
  type StatusMap = Map<string, SevMap>
  type ParentMap = Map<string, StatusMap>

  const pivot: ParentMap = new Map()

  for (const record of allRecords) {
    const parent = String(record[parentColumn] ?? '').trim() || 'No Parent Assigned'
    if (!selectedParents.includes(parent)) continue

    const status = String(record[statusColumn] ?? '').trim()
    if (!status) continue

    const sev = severityColumn
      ? String(record[severityColumn] ?? '').trim() || '(None)'
      : '(None)'

    if (!pivot.has(parent)) pivot.set(parent, new Map())
    const sm = pivot.get(parent)!
    if (!sm.has(status)) sm.set(status, new Map())
    const sevm = sm.get(status)!
    sevm.set(sev, (sevm.get(sev) || 0) + 1)
  }

  // ── Build worksheet cells ─────────────────────────────────────────────────
  const ws: Record<string, any> = {}
  const merges: { s: { r: number; c: number }; e: { r: number; c: number } }[] = []

  // Column layout: [Task Name, Status, ...sevCols, Grand Total]
  const COL_TASK   = 0
  const COL_STATUS = 1
  const COL_SEV0   = 2
  const COL_TOTAL  = COL_SEV0 + sevCols.length
  const TOTAL_COLS = COL_TOTAL + 1

  let row = 0

  // ── Header row ────────────────────────────────────────────────────────────
  const headerCells = ['Task Name', 'Status', ...sevCols, 'Grand Total']
  headerCells.forEach((h, c) => {
    ws[cellRef(row, c)] = makeCell(h, {
      bold: true, bg: HEADER_BG, fg: HEADER_FG,
      hAlign: c >= COL_SEV0 ? 'center' : 'left',
      wrap: true,
    })
  })
  row++

  // ── Grand totals accumulator ──────────────────────────────────────────────
  const grandSevTotals: Record<string, number> = {}
  sevCols.forEach(s => { grandSevTotals[s] = 0 })
  let grandTotal = 0

  // ── Per-parent rows ───────────────────────────────────────────────────────
  for (const parent of selectedParents) {
    const statusMap = pivot.get(parent)
    if (!statusMap || statusMap.size === 0) continue

    const statuses = [...statusMap.keys()]
    const parentStartRow = row

    // Per-parent severity totals
    const parentSevTotals: Record<string, number> = {}
    sevCols.forEach(s => { parentSevTotals[s] = 0 })
    let parentTotal = 0

    for (const status of statuses) {
      const sevMap = statusMap.get(status)!

      // Task Name cell — written only on first status row; merged later
      ws[cellRef(row, COL_TASK)] = makeCell(parent, {
        bold: false, bg: DATA_BG, fg: DATA_FG,
        wrap: true, vAlign: 'center',
      })

      // Status cell
      ws[cellRef(row, COL_STATUS)] = makeCell(status, {
        bg: DATA_BG, fg: DATA_FG,
      })

      // Severity counts
      let rowTotal = 0
      sevCols.forEach((sev, si) => {
        const count = sevMap.get(sev) || 0
        ws[cellRef(row, COL_SEV0 + si)] = makeCell(count, { bg: DATA_BG, fg: DATA_FG })
        parentSevTotals[sev] = (parentSevTotals[sev] || 0) + count
        rowTotal += count
      })

      // Row grand total
      ws[cellRef(row, COL_TOTAL)] = makeCell(rowTotal, { bold: true, bg: DATA_BG, fg: DATA_FG })
      parentTotal += rowTotal

      row++
    }

    // Merge Task Name cells vertically across all status rows for this parent
    if (statuses.length > 1) {
      merges.push({
        s: { r: parentStartRow, c: COL_TASK },
        e: { r: row - 1,        c: COL_TASK },
      })
    }

    // Parent subtotal row
    ws[cellRef(row, COL_TASK)] = makeCell('Grand Total', {
      bold: true, bg: PARENT_BG, fg: PARENT_FG, italic: true,
    })
    ws[cellRef(row, COL_STATUS)] = makeCell('', { bg: PARENT_BG, fg: PARENT_FG })
    sevCols.forEach((sev, si) => {
      ws[cellRef(row, COL_SEV0 + si)] = makeCell(parentSevTotals[sev] || 0, {
        bold: true, bg: PARENT_BG, fg: PARENT_FG,
      })
      grandSevTotals[sev] = (grandSevTotals[sev] || 0) + (parentSevTotals[sev] || 0)
    })
    ws[cellRef(row, COL_TOTAL)] = makeCell(parentTotal, { bold: true, bg: PARENT_BG, fg: PARENT_FG })
    grandTotal += parentTotal
    row++
  }

  // ── Final Grand Total row ─────────────────────────────────────────────────
  ws[cellRef(row, COL_TASK)] = makeCell('Grand Total', {
    bold: true, bg: TOTAL_BG, fg: TOTAL_FG, fontSize: 11,
  })
  ws[cellRef(row, COL_STATUS)] = makeCell('', { bold: true, bg: TOTAL_BG, fg: TOTAL_FG })
  sevCols.forEach((sev, si) => {
    ws[cellRef(row, COL_SEV0 + si)] = makeCell(grandSevTotals[sev] || 0, {
      bold: true, bg: TOTAL_BG, fg: TOTAL_FG, fontSize: 11,
    })
  })
  ws[cellRef(row, COL_TOTAL)] = makeCell(grandTotal, {
    bold: true, bg: TOTAL_BG, fg: TOTAL_FG, fontSize: 11,
  })
  row++

  // ── Worksheet metadata ────────────────────────────────────────────────────
  ws['!ref'] = `A1:${col(COL_TOTAL)}${row}`
  ws['!merges'] = merges

  // Column widths
  ws['!cols'] = [
    { wch: 55 },  // Task Name
    { wch: 22 },  // Status
    ...sevCols.map(() => ({ wch: 12 })),
    { wch: 14 },  // Grand Total
  ]

  // Freeze header row
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activeCell: 'A2', sqref: 'A2' }

  // ── Write file ────────────────────────────────────────────────────────────
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Bug Status Report')

  const date = new Date().toISOString().split('T')[0]
  XLSX.writeFile(wb, `bug-status-pivot-${date}.xlsx`)
}
