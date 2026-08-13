// src/modules/QAWeeklyReport/utils/reportExport.ts
//
// Export builders for the /report-preview dashboard: a complete Markdown file
// and a complete self-contained HTML page, plus a browser-safe download helper.
//
// Both builders read the same QAReportForm the dashboard renders, so an export
// contains every section that is on screen rather than a stub.

import type { QAReportForm } from '../types'
import {
  isPassStatus,
  isFailStatus,
  isBlockedStatus,
  isResolvedSupportStatus,
} from '../types'
import { calculateQAScore } from './qualityCalculator'
import {
  calculateCapacityStats,
  getMembersWithUtilization,
  type TeamCapacityData,
} from '../types/teamCapacity'

export interface ReportExportMeta {
  generatedDate?: string
  status?: 'Draft' | 'Final'
  createdBy?: string
}

// ── shared helpers ──────────────────────────────────────────────────────────

export function slugifyName(value: string): string {
  const slug = String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'qa-report'
}

function formatDate(value?: string): string {
  if (!value) return '—'
  try {
    const d = new Date(value.includes('T') ? value : `${value}T00:00:00`)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
  } catch {
    return value
  }
}

function formatDateTime(value?: string): string {
  if (!value) return '—'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return value
  }
}

/** Escape for HTML text/attribute content. */
export function escapeHtml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string
  ))
}

/** Escape pipes / newlines so a value cannot break a Markdown table row. */
function escapeMd(value: unknown): string {
  return String(value ?? '')
    .replace(/\|/g, '\\|')
    .replace(/\r?\n/g, ' ')
    .trim()
}

/**
 * Download text content as a file. Appends the anchor to the DOM (Firefox will
 * not honour a programmatic click on a detached node) and defers the object-URL
 * revoke (Safari aborts an in-flight download if the URL is revoked at once).
 */
export function downloadTextFile(filename: string, mimeType: string, contents: string): void {
  const blob = new Blob([contents], { type: `${mimeType};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  window.setTimeout(() => {
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, 4000)
}

// ── derived section data (shared by both builders) ──────────────────────────

interface ReleaseSummary {
  total: number
  passed: number
  failed: number
  blocked: number
  passRate: number
}

function releaseSummary(data: QAReportForm): ReleaseSummary {
  const items = Array.isArray(data.releaseItems) ? data.releaseItems : []
  const total = items.length
  const passed = items.filter(i => isPassStatus(i?.status)).length
  const failed = items.filter(i => isFailStatus(i?.status)).length
  const blocked = items.filter(i => isBlockedStatus(i?.status)).length
  return {
    total,
    passed,
    failed,
    blocked,
    passRate: total > 0 ? Math.round((passed / total) * 100) : 0,
  }
}

const PRODUCTION_ROWS: { label: string; key: keyof QAReportForm['lastWeek'] }[] = [
  { label: 'Escaped Issue', key: 'escapedIssue' },
  { label: 'Support Fix', key: 'supportFix' },
  { label: 'Change Request', key: 'changeRequest' },
  { label: 'Data Issue', key: 'dataIssue' },
  { label: 'Backend Update', key: 'backendUpdation' },
]

const ALLOCATION_GROUPS: { label: string; key: 'newFeatureTeam' | 'supportTeam' | 'automationTeam' }[] = [
  { label: 'New Feature Testing', key: 'newFeatureTeam' },
  { label: 'Support Team', key: 'supportTeam' },
  { label: 'Automation Team', key: 'automationTeam' },
]

function capacityRows(data: QAReportForm) {
  const capacity = data.teamCapacity as TeamCapacityData | null | undefined
  if (!capacity || !Array.isArray(capacity.members) || capacity.members.length === 0) return null
  return {
    stats: calculateCapacityStats(capacity.members),
    members: getMembersWithUtilization(capacity.members),
    fileName: capacity.file_name,
  }
}

// ── Markdown ────────────────────────────────────────────────────────────────

export function buildReportMarkdown(data: QAReportForm, meta: ReportExportMeta = {}): string {
  const quality = calculateQAScore(data)
  const release = releaseSummary(data)
  const capacity = capacityRows(data)
  const none = '_No data recorded for this week._'
  const L: string[] = []

  L.push(`# ${data.reportTitle || 'Weekly QA Status Report'}`)
  L.push('')
  L.push(`**Project:** ${data.projectName || '—'}  `)
  L.push(`**Reporting Period:** ${formatDate(data.weekStart)} – ${formatDate(data.weekEnd)}  `)
  if (meta.generatedDate) L.push(`**Generated:** ${formatDateTime(meta.generatedDate)}  `)
  if (meta.createdBy) L.push(`**Prepared By:** ${meta.createdBy}  `)
  if (meta.status) L.push(`**Status:** ${meta.status}  `)
  if (data.subtitle) { L.push(''); L.push(data.subtitle) }

  L.push('')
  L.push('## Executive Summary')
  L.push('')
  L.push('| Metric | Value |')
  L.push('|---|---|')
  L.push(`| Support Emails | ${data.supportEmails ?? 0} |`)
  L.push(`| New Release Features | ${data.newFeatures ?? 0} |`)
  L.push(`| Code Fixes Testing | ${data.codeFixes ?? 0} |`)
  L.push(`| Release Pass Rate | ${release.passRate}% (${release.passed}/${release.total}) |`)
  L.push(`| Executive Quality Score | ${quality.score}% (${quality.label}) |`)

  L.push('')
  L.push('## Production Issues')
  L.push('')
  L.push('| Category | Last Week | Month to Date |')
  L.push('|---|---|---|')
  PRODUCTION_ROWS.forEach(row => {
    L.push(`| ${row.label} | ${data.lastWeek?.[row.key] ?? 0} | ${data.monthToDate?.[row.key] ?? 0} |`)
  })
  L.push(`| **Total** | **${data.lastWeek?.support ?? 0}** | **${data.monthToDate?.support ?? 0}** |`)

  L.push('')
  L.push('## Team Resource Allocation')
  L.push('')
  const hasAllocation = ALLOCATION_GROUPS.some(g => (data[g.key] || []).length > 0)
  if (!hasAllocation) {
    L.push(none)
  } else {
    ALLOCATION_GROUPS.forEach(g => {
      const members = data[g.key] || []
      L.push(`- **${g.label}** (${members.length}): ${members.length ? members.join(', ') : '—'}`)
    })
  }

  L.push('')
  L.push('## Support & Exception Log')
  L.push('')
  const tickets = Array.isArray(data.supportTickets) ? data.supportTickets : []
  if (!tickets.length) {
    L.push(none)
  } else {
    const resolved = tickets.filter(t => isResolvedSupportStatus(t?.status)).length
    L.push(`**${tickets.length} ticket(s) · ${resolved} resolved**`)
    L.push('')
    L.push('| Task ID | Description | Assigned QA | Status | Priority | Remarks |')
    L.push('|---|---|---|---|---|---|')
    tickets.forEach(t => {
      L.push(`| ${escapeMd(t.taskId)} | ${escapeMd(t.description)} | ${escapeMd(t.assignedQA)} | ${escapeMd(t.status)} | ${escapeMd(t.priority)} | ${escapeMd(t.remarks)} |`)
    })
  }

  L.push('')
  L.push('## Release Testing Status')
  L.push('')
  if (!release.total) {
    L.push(none)
  } else {
    L.push(`**Pass Rate: ${release.passRate}% (${release.passed}/${release.total}) · ${release.failed} failed · ${release.blocked} blocked**`)
    L.push('')
    L.push('| Task ID | Feature | Assignee | Status | Priority | Remarks |')
    L.push('|---|---|---|---|---|---|')
    ;(data.releaseItems || []).forEach(i => {
      L.push(`| ${escapeMd(i.taskId)} | ${escapeMd(i.featureName)} | ${escapeMd(i.assignee)} | ${escapeMd(i.status)} | ${escapeMd(i.priority)} | ${escapeMd(i.remarks)} |`)
    })
  }

  const bugMetrics = data.releaseBugStatus?.metrics
  if (bugMetrics) {
    L.push('')
    L.push('## Release Bug Status')
    L.push('')
    L.push('| Metric | Count |')
    L.push('|---|---|')
    L.push(`| Total Bugs | ${bugMetrics.totalBugs ?? 0} |`)
    L.push(`| Open | ${bugMetrics.openBugs ?? 0} |`)
    L.push(`| Resolved (Ready for QA) | ${bugMetrics.resolvedBugs ?? 0} |`)
    L.push(`| Completed | ${bugMetrics.completedBugs ?? 0} |`)
    if (bugMetrics.deferredBugs) L.push(`| Deferred | ${bugMetrics.deferredBugs} |`)
    if (bugMetrics.invalidBugs) L.push(`| Invalid / Won't Fix | ${bugMetrics.invalidBugs} |`)
    if (bugMetrics.closurePercentage !== undefined) {
      L.push(`| Closure Rate | ${Number(bugMetrics.closurePercentage).toFixed(1)}% |`)
    }
  }

  L.push('')
  L.push('## Defect Analysis')
  L.push('')
  L.push('| Metric | Last Week | Month to Date |')
  L.push('|---|---|---|')
  ;(['reported', 'open', 'fixed', 'closed'] as const).forEach(k => {
    const label = k.charAt(0).toUpperCase() + k.slice(1)
    L.push(`| ${label} | ${data.defectsLastWeek?.[k] ?? 0} | ${data.defectsMTD?.[k] ?? 0} |`)
  })

  const opt = data.historicalDefectOptimization
  if (opt) {
    L.push('')
    L.push('## Historical Defect Optimization')
    L.push('')
    L.push(`- Previous fixed bug count: ${opt.previousFixedBugCount ?? 0}`)
    L.push(`- Latest fixed bug count: ${opt.latestFixedBugCount ?? 0}`)
    if (opt.trackingSince) L.push(`- Tracking since: ${opt.trackingSince}`)
    if (opt.reducedBugs !== undefined) L.push(`- Reduced bugs: ${opt.reducedBugs}`)
    if (opt.improvementPercentage !== undefined) L.push(`- Improvement: ${opt.improvementPercentage}%`)
    if (opt.executiveSummary) { L.push(''); L.push(opt.executiveSummary) }
  }

  if (capacity) {
    L.push('')
    L.push('## Team Capacity Overview')
    L.push('')
    L.push(`**${capacity.stats.total_members} member(s) · Avg utilization ${capacity.stats.average_utilization_percent}% · ${capacity.stats.total_logged_hours}h logged of ${capacity.stats.total_available_hours}h available**`)
    L.push('')
    L.push('| Employee | Logged | Leave | Effective | Available | Utilization |')
    L.push('|---|---|---|---|---|---|')
    capacity.members.forEach(m => {
      L.push(`| ${escapeMd(m.name)} | ${m.logged_hours}h | ${m.leave_hours}h | ${m.effective_work}h | ${m.available_hours}h | ${m.utilization_percent}% |`)
    })
  }

  L.push('')
  L.push('## Next Week Priorities')
  L.push('')
  const priorities = Array.isArray(data.nextPriorities) ? data.nextPriorities : []
  if (!priorities.length) {
    L.push(none)
  } else {
    priorities.forEach((p, idx) => {
      L.push(`${idx + 1}. **${escapeMd(p.title) || 'Untitled priority'}**`)
      const bits: string[] = []
      if (p.owner) bits.push(`Owner: ${escapeMd(p.owner)}`)
      if (p.dueDate) bits.push(`Due: ${escapeMd(p.dueDate)}`)
      if (bits.length) L.push(`   _${bits.join(' · ')}_`)
      if (p.description) L.push(`   ${escapeMd(p.description)}`)
    })
  }

  L.push('')
  L.push('---')
  L.push(`_Generated by Qaly.ai${meta.generatedDate ? ` · ${formatDateTime(meta.generatedDate)}` : ''}_`)
  L.push('')

  return L.join('\n')
}

// ── HTML ────────────────────────────────────────────────────────────────────

function htmlTable(headers: string[], rows: (string | number)[][]): string {
  const head = headers.map(h => `<th>${escapeHtml(h)}</th>`).join('')
  const body = rows
    .map(r => `<tr>${r.map(c => `<td>${escapeHtml(c)}</td>`).join('')}</tr>`)
    .join('')
  return `<table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`
}

function htmlSection(title: string, inner: string): string {
  return `<section><h2>${escapeHtml(title)}</h2>${inner}</section>`
}

const EMPTY_HTML = '<p class="empty">No data recorded for this week.</p>'

/**
 * A standalone, dependency-free HTML document: opens in any browser, prints
 * cleanly to A4, and carries every section of the report.
 */
export function buildReportHTML(data: QAReportForm, meta: ReportExportMeta = {}): string {
  const quality = calculateQAScore(data)
  const release = releaseSummary(data)
  const capacity = capacityRows(data)
  const tickets = Array.isArray(data.supportTickets) ? data.supportTickets : []
  const priorities = Array.isArray(data.nextPriorities) ? data.nextPriorities : []
  const bugMetrics = data.releaseBugStatus?.metrics
  const opt = data.historicalDefectOptimization

  const title = `${data.reportTitle || 'Weekly QA Status Report'} — ${data.projectName || 'Project'}`

  const metaRows = [
    ['Project', data.projectName || '—'],
    ['Reporting Period', `${formatDate(data.weekStart)} – ${formatDate(data.weekEnd)}`],
    ...(meta.generatedDate ? [['Generated', formatDateTime(meta.generatedDate)]] : []),
    ...(meta.createdBy ? [['Prepared By', meta.createdBy]] : []),
    ...(meta.status ? [['Status', meta.status]] : []),
  ]

  const kpis = [
    { label: 'Support Emails', value: data.supportEmails ?? 0 },
    { label: 'New Release Features', value: data.newFeatures ?? 0 },
    { label: 'Code Fixes Testing', value: data.codeFixes ?? 0 },
    { label: 'Release Pass Rate', value: `${release.passRate}%` },
    { label: 'Quality Score', value: `${quality.score}%` },
  ]

  const sections: string[] = []

  sections.push(htmlSection('Executive Summary', `
    <div class="kpis">
      ${kpis.map(k => `<div class="kpi"><span class="kpi-label">${escapeHtml(k.label)}</span><span class="kpi-value">${escapeHtml(k.value)}</span></div>`).join('')}
    </div>
    <p class="note">Quality score: <strong>${escapeHtml(quality.score)}%</strong> (${escapeHtml(quality.label)}) · Release testing: ${escapeHtml(release.passed)} passed, ${escapeHtml(release.failed)} failed, ${escapeHtml(release.blocked)} blocked of ${escapeHtml(release.total)}.</p>
    ${data.subtitle ? `<p class="note">${escapeHtml(data.subtitle)}</p>` : ''}
  `))

  sections.push(htmlSection('Production Issues', htmlTable(
    ['Category', 'Last Week', 'Month to Date'],
    [
      ...PRODUCTION_ROWS.map(r => [r.label, data.lastWeek?.[r.key] ?? 0, data.monthToDate?.[r.key] ?? 0]),
      ['Total', data.lastWeek?.support ?? 0, data.monthToDate?.support ?? 0],
    ],
  )))

  const allocationHasAny = ALLOCATION_GROUPS.some(g => (data[g.key] || []).length > 0)
  sections.push(htmlSection('Team Resource Allocation', allocationHasAny
    ? `<div class="cards">${ALLOCATION_GROUPS.map(g => {
        const members = data[g.key] || []
        return `<div class="card">
          <span class="card-title">${escapeHtml(g.label)}</span>
          <span class="card-count">${members.length} member${members.length === 1 ? '' : 's'}</span>
          ${members.length ? `<ul>${members.map(m => `<li>${escapeHtml(m)}</li>`).join('')}</ul>` : '<p class="empty">No resources assigned</p>'}
        </div>`
      }).join('')}</div>`
    : EMPTY_HTML))

  sections.push(htmlSection('Support & Exception Log', tickets.length
    ? `<p class="note">${tickets.length} ticket(s) · ${tickets.filter(t => isResolvedSupportStatus(t?.status)).length} resolved</p>` +
      htmlTable(
        ['Task ID', 'Description', 'Assigned QA', 'Status', 'Priority', 'Remarks'],
        tickets.map(t => [t.taskId || '', t.description || '', t.assignedQA || '', t.status || '', t.priority || '', t.remarks || '']),
      )
    : EMPTY_HTML))

  sections.push(htmlSection('Release Testing Status', release.total
    ? `<p class="note">Pass rate ${release.passRate}% (${release.passed}/${release.total}) · ${release.failed} failed · ${release.blocked} blocked</p>` +
      htmlTable(
        ['Task ID', 'Feature', 'Assignee', 'Status', 'Priority', 'Remarks'],
        (data.releaseItems || []).map(i => [i.taskId || '', i.featureName || '', i.assignee || '', i.status || '', i.priority || '', i.remarks || '']),
      )
    : EMPTY_HTML))

  if (bugMetrics) {
    sections.push(htmlSection('Release Bug Status', htmlTable(
      ['Metric', 'Count'],
      [
        ['Total Bugs', bugMetrics.totalBugs ?? 0],
        ['Open', bugMetrics.openBugs ?? 0],
        ['Resolved (Ready for QA)', bugMetrics.resolvedBugs ?? 0],
        ['Completed', bugMetrics.completedBugs ?? 0],
        ...(bugMetrics.deferredBugs ? [['Deferred', bugMetrics.deferredBugs]] : []),
        ...(bugMetrics.invalidBugs ? [["Invalid / Won't Fix", bugMetrics.invalidBugs]] : []),
        ...(bugMetrics.closurePercentage !== undefined
          ? [['Closure Rate', `${Number(bugMetrics.closurePercentage).toFixed(1)}%`]]
          : []),
      ],
    )))
  }

  sections.push(htmlSection('Defect Analysis', htmlTable(
    ['Metric', 'Last Week', 'Month to Date'],
    (['reported', 'open', 'fixed', 'closed'] as const).map(k => [
      k.charAt(0).toUpperCase() + k.slice(1),
      data.defectsLastWeek?.[k] ?? 0,
      data.defectsMTD?.[k] ?? 0,
    ]),
  )))

  if (opt) {
    sections.push(htmlSection('Historical Defect Optimization',
      htmlTable(
        ['Metric', 'Value'],
        [
          ['Previous Fixed Bug Count', opt.previousFixedBugCount ?? 0],
          ['Latest Fixed Bug Count', opt.latestFixedBugCount ?? 0],
          ...(opt.trackingSince ? [['Tracking Since', opt.trackingSince]] : []),
          ...(opt.reducedBugs !== undefined ? [['Reduced Bugs', opt.reducedBugs]] : []),
          ...(opt.improvementPercentage !== undefined ? [['Improvement', `${opt.improvementPercentage}%`]] : []),
        ],
      ) + (opt.executiveSummary ? `<p class="note">${escapeHtml(opt.executiveSummary)}</p>` : '')))
  }

  if (capacity) {
    sections.push(htmlSection('Team Capacity Overview',
      `<p class="note">${capacity.stats.total_members} member(s) · Avg utilization ${capacity.stats.average_utilization_percent}% · ${capacity.stats.total_logged_hours}h logged of ${capacity.stats.total_available_hours}h available${capacity.fileName ? ` · Source: ${escapeHtml(capacity.fileName)}` : ''}</p>` +
      htmlTable(
        ['Employee', 'Logged', 'Leave', 'Effective', 'Available', 'Utilization'],
        capacity.members.map(m => [
          m.name, `${m.logged_hours}h`, `${m.leave_hours}h`,
          `${m.effective_work}h`, `${m.available_hours}h`, `${m.utilization_percent}%`,
        ]),
      )))
  }

  sections.push(htmlSection('Next Week Priorities', priorities.length
    ? `<div class="cards">${priorities.map((p, idx) => `<div class="card">
        <span class="card-count">P${String(idx + 1).padStart(2, '0')}</span>
        <span class="card-title">${escapeHtml(p.title || 'Untitled priority')}</span>
        ${p.description ? `<p>${escapeHtml(p.description)}</p>` : ''}
        <p class="meta-line">${[p.owner ? `Owner: ${escapeHtml(p.owner)}` : '', p.dueDate ? `Due: ${escapeHtml(p.dueDate)}` : ''].filter(Boolean).join(' · ') || '—'}</p>
      </div>`).join('')}</div>`
    : EMPTY_HTML))

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root { --ink:#0f172a; --muted:#64748b; --line:#e2e8f0; --accent:#6366f1; --bg:#f8fafc; }
  * { box-sizing: border-box; }
  body { margin:0; padding:32px; background:var(--bg); color:var(--ink);
         font:14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif; }
  .sheet { max-width:1100px; margin:0 auto; background:#fff; border:1px solid var(--line);
           border-radius:14px; padding:36px 40px; box-shadow:0 8px 28px rgba(15,23,42,.06); }
  h1 { font-size:26px; margin:0 0 4px; letter-spacing:-.02em; }
  .subtitle { color:var(--muted); font-size:13px; margin:0 0 22px; }
  h2 { font-size:15px; text-transform:uppercase; letter-spacing:.09em; margin:34px 0 12px;
       padding-bottom:7px; border-bottom:2px solid var(--line); }
  section:first-of-type h2 { margin-top:8px; }
  table { width:100%; border-collapse:collapse; margin:10px 0 4px; font-size:12.5px; }
  th,td { border:1px solid var(--line); padding:7px 10px; text-align:left; vertical-align:top; }
  th { background:#f1f5f9; font-size:10.5px; text-transform:uppercase; letter-spacing:.06em; color:#475569; }
  tbody tr:nth-child(even) td { background:#fbfcfe; }
  .meta-table { width:auto; margin:0 0 20px; }
  .meta-table td { border:none; padding:2px 18px 2px 0; font-size:13px; }
  .meta-table td:first-child { color:var(--muted); text-transform:uppercase; font-size:10.5px;
                               letter-spacing:.07em; white-space:nowrap; }
  .kpis { display:flex; flex-wrap:wrap; gap:10px; margin:4px 0 10px; }
  .kpi { flex:1 1 150px; border:1px solid var(--line); border-radius:10px; padding:12px 14px; background:#fbfcfe; }
  .kpi-label { display:block; font-size:10px; text-transform:uppercase; letter-spacing:.09em; color:var(--muted); }
  .kpi-value { display:block; font-size:26px; font-weight:800; margin-top:4px; letter-spacing:-.02em; }
  .cards { display:flex; flex-wrap:wrap; gap:12px; }
  .card { flex:1 1 260px; border:1px solid var(--line); border-radius:10px; padding:14px 16px; background:#fbfcfe; }
  .card-title { display:block; font-weight:700; font-size:14px; }
  .card-count { display:block; font-size:10px; text-transform:uppercase; letter-spacing:.09em; color:var(--accent); font-weight:700; }
  .card ul { margin:8px 0 0; padding-left:18px; }
  .card li { margin:2px 0; }
  .card p { margin:6px 0 0; font-size:12.5px; color:#334155; }
  .meta-line { color:var(--muted); font-size:11.5px; }
  .note { color:#334155; font-size:12.5px; margin:6px 0 2px; }
  .empty { color:var(--muted); font-style:italic; font-size:12.5px; }
  footer { margin-top:34px; padding-top:14px; border-top:1px solid var(--line);
           color:var(--muted); font-size:11px; display:flex; justify-content:space-between; gap:12px; }
  .toolbar { max-width:1100px; margin:0 auto 14px; text-align:right; }
  .toolbar button { font:inherit; font-size:12px; font-weight:700; cursor:pointer; padding:8px 16px;
                    border-radius:9px; border:1px solid var(--accent); background:var(--accent); color:#fff; }
  @media print {
    @page { size:A4 portrait; margin:12mm; }
    body { padding:0; background:#fff; }
    .sheet { max-width:none; border:none; border-radius:0; padding:0; box-shadow:none; }
    .no-print { display:none !important; }
    section, table, tr, .card, .kpi { break-inside:avoid; page-break-inside:avoid; }
    h2 { break-after:avoid; page-break-after:avoid; }
    th { background:#f1f5f9 !important; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  }
</style>
</head>
<body>
<div class="toolbar no-print"><button onclick="window.print()">Print / Save as PDF</button></div>
<div class="sheet">
  <h1>${escapeHtml(data.reportTitle || 'Weekly QA Status Report')}</h1>
  <p class="subtitle">${escapeHtml(data.projectName || 'Project')} · ${escapeHtml(formatDate(data.weekStart))} – ${escapeHtml(formatDate(data.weekEnd))}</p>
  <table class="meta-table"><tbody>
    ${metaRows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join('')}
  </tbody></table>
  ${sections.join('\n')}
  <footer>
    <span>${escapeHtml(data.projectName || 'Project')} — ${escapeHtml(formatDate(data.weekStart))} to ${escapeHtml(formatDate(data.weekEnd))}</span>
    <span>Generated by Qaly.ai${meta.generatedDate ? ` · ${escapeHtml(formatDateTime(meta.generatedDate))}` : ''}</span>
  </footer>
</div>
</body>
</html>`
}
