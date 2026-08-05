import type { SuiteNotes, TestCase } from '@/modules/testArchitect/parseTestSuite'
import { TEST_CASE_COUNT_LABELS, type TestCaseCount } from '@/ai/prompts/testCasePrompt'

export interface ExcelExportInput {
  testCases: TestCase[]
  notes: SuiteNotes
  requirementSummary: string
  coverageSummary: string
  targetCount: TestCaseCount
}

const HEADER_STYLE = {
  font: { name: 'Calibri', sz: 11, bold: true, color: { rgb: '1E293B' } },
  fill: { fgColor: { rgb: 'E2E8F0' } },
  alignment: { horizontal: 'left', vertical: 'center', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: 'CBD5E1' } },
    bottom: { style: 'medium', color: { rgb: '94A3B8' } },
    left: { style: 'thin', color: { rgb: 'CBD5E1' } },
    right: { style: 'thin', color: { rgb: 'CBD5E1' } },
  },
}

const CELL_STYLE = {
  font: { name: 'Calibri', sz: 11, color: { rgb: '334155' } },
  alignment: { horizontal: 'left', vertical: 'top', wrapText: true },
  border: {
    top: { style: 'thin', color: { rgb: 'F1F5F9' } },
    bottom: { style: 'thin', color: { rgb: 'F1F5F9' } },
    left: { style: 'thin', color: { rgb: 'F1F5F9' } },
    right: { style: 'thin', color: { rgb: 'F1F5F9' } },
  },
}

function styleSheet(ws: any, headerRows = 1) {
  for (const key of Object.keys(ws)) {
    if (key.startsWith('!')) continue
    const row = parseInt(key.replace(/[A-Z]/g, ''), 10)
    ws[key].s = row <= headerRows ? HEADER_STYLE : CELL_STYLE
  }
}

function listSheet(XLSX: any, title: string, items: string[]) {
  const aoa: (string | number)[][] = [['#', title]]
  items.forEach((item, i) => {
    aoa.push([i + 1, item])
  })
  if (items.length === 0) {
    aoa.push(['', '(none)'])
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = [{ wch: 6 }, { wch: 80 }]
  ws['!views'] = [{ state: 'frozen', ySplit: 1 }]
  styleSheet(ws)
  return ws
}

function safeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]]/g, '').slice(0, 31)
}

/** Download the suite as a multi-sheet .xlsx file for easy Excel copy/paste. */
export async function downloadTestSuiteExcel(input: ExcelExportInput): Promise<void> {
  const mod = await import('xlsx')
  const XLSX: any = (mod as any).default ?? mod
  const wb = XLSX.utils.book_new()

  // ── Test Cases ────────────────────────────────────────────────────────────
  const caseRows: (string | number)[][] = [
    ['ID', 'Category', 'Title', 'Priority', 'Status', 'Steps'],
  ]
  input.testCases.forEach((tc, idx) => {
    caseRows.push([
      `TC-${1000 + idx}`,
      tc.category || 'Functional',
      tc.title,
      tc.priority,
      tc.status,
      tc.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'),
    ])
  })
  const casesWs = XLSX.utils.aoa_to_sheet(caseRows)
  casesWs['!cols'] = [
    { wch: 10 },
    { wch: 14 },
    { wch: 55 },
    { wch: 12 },
    { wch: 12 },
    { wch: 60 },
  ]
  casesWs['!views'] = [{ state: 'frozen', ySplit: 1 }]
  // Reasonable row heights for wrapped steps
  casesWs['!rows'] = caseRows.map((_, i) => (i === 0 ? { hpt: 22 } : { hpt: 48 }))
  styleSheet(casesWs)
  XLSX.utils.book_append_sheet(wb, casesWs, safeSheetName('Test Cases'))

  // ── Summary ───────────────────────────────────────────────────────────────
  const summaryAoa: (string | number)[][] = [
    ['Field', 'Value'],
    ['Target Count', TEST_CASE_COUNT_LABELS[input.targetCount]],
    ['Total Test Cases', input.testCases.length],
    ['Requirement Summary', input.requirementSummary || '(not generated)'],
    ['Coverage Summary', input.coverageSummary || '(not generated)'],
    ['Exported At', new Date().toLocaleString()],
  ]
  const summaryWs = XLSX.utils.aoa_to_sheet(summaryAoa)
  summaryWs['!cols'] = [{ wch: 22 }, { wch: 90 }]
  summaryWs['!views'] = [{ state: 'frozen', ySplit: 1 }]
  styleSheet(summaryWs)
  XLSX.utils.book_append_sheet(wb, summaryWs, safeSheetName('Summary'))

  // ── Analysis lists ────────────────────────────────────────────────────────
  XLSX.utils.book_append_sheet(
    wb,
    listSheet(XLSX, 'Requirement Gap', input.notes.gaps),
    safeSheetName('Requirement Gaps'),
  )
  XLSX.utils.book_append_sheet(
    wb,
    listSheet(XLSX, 'Clarification Question', input.notes.clarificationQuestions),
    safeSheetName('Clarification Questions'),
  )
  XLSX.utils.book_append_sheet(
    wb,
    listSheet(XLSX, 'Assumption', input.notes.assumptions),
    safeSheetName('Assumptions'),
  )
  XLSX.utils.book_append_sheet(
    wb,
    listSheet(XLSX, 'Risk', input.notes.risks),
    safeSheetName('Risks'),
  )

  const stamp = new Date().toISOString().slice(0, 10)
  const filename = `test-suite-${TEST_CASE_COUNT_LABELS[input.targetCount]}-${stamp}.xlsx`

  try {
    const XLSXStyle = (await import('xlsx-js-style')).default
    XLSXStyle.writeFile(wb, filename)
  } catch {
    XLSX.writeFile(wb, filename)
  }
}
