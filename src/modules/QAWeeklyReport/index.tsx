import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'
import { useAIAccess } from '@/hooks/useAIAccess'
import { motion, AnimatePresence } from 'framer-motion'
import { CinematicHeading } from '@/components/ui/CinematicHeading'
import { FloatingButton } from '@/components/ui/FloatingButton'
import { useQAReportStore } from './store'
import { HeaderSection, KPICards } from './components/HeaderSection'
import { ProductionIssues } from './components/ProductionIssues'
import { TeamAllocation } from './components/TeamAllocation'
import { SupportLog } from './components/SupportLog'
import { ReportPreviewDrawer } from './components/ReportPreviewDrawer'
import { ReleaseTable } from './components/ReleaseTable'
import { ReleaseBugStatus } from './components/ReleaseBugStatus'
import { TeamCapacityUpload } from './components/TeamCapacity'
import { DashboardSectionToggles, getSectionVisibility } from './components/DashboardSectionToggles'
import { DisabledSectionWrapper } from './components/DisabledSectionWrapper'
import { DefectAnalysis, HistoricalProgress, NextPriorities, HistoricalDefectOptimization } from './components/Metrics'
import { DashboardWidgets, DefectChart, ReportHistory } from './components/Widgets'
import { toast } from '@/hooks/use-toast'
import { FileText, RefreshCw, RotateCcw, AlertCircle, Plus, Trash, History as HistoryIcon, Settings, Eye, Lock } from 'lucide-react'
import type { QAReportForm, TimelineNode } from './types'
import { createFormSnapshot, isPassStatus } from './types'
import { ROUTES } from '@/lib/routes'
import { calculateQAScore } from './utils/qualityCalculator'
import { useColumnConfigStore } from '@/modules/DailyUpdateReport/columnConfigStore'
import {
  hydrateSchemaFromLegacy,
  orderedVisibleColumns,
  type QAReportTableColumn,
} from './qaReportColumnSchema'

function collectCustomFieldLabels(
  rows: Array<{ customFields?: Record<string, string> }>,
  dupColumns: Array<{ internal_key: string; display_name: string }>,
  schema?: QAReportTableColumn[],
): Record<string, string> {
  const labels: Record<string, string> = {}
  for (const row of rows) {
    if (!row.customFields) continue
    for (const key of Object.keys(row.customFields)) {
      if (labels[key]) continue
      labels[key] = dupColumns.find(c => c.internal_key === key)?.display_name || key
    }
  }
  for (const col of schema || []) {
    if (col.kind === 'custom') labels[col.id] = col.label
  }
  return labels
}

function cellValueForColumn(
  row: Record<string, any>,
  col: QAReportTableColumn,
): string {
  if (col.kind === 'custom') return String(row.customFields?.[col.id] ?? '')
  return String(row[col.id] ?? '')
}

function buildMarkdown(f: QAReportForm): string {
  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const na = 'No updates available for this week.'

  const lwTotal = f.lastWeek.support
  const mtdTotal = f.monthToDate.support

  const passCount = f.releaseItems.filter(i => isPassStatus(i.status)).length
  const passRate = f.releaseItems.length ? Math.round((passCount / f.releaseItems.length) * 100) : 0

  const lines: string[] = []

  // Title
  const cleanTitle = (f.reportTitle || '').replace(/Weekly QA Status Report/i, 'Weekly QA Status Report').trim()
  lines.push(`# ${cleanTitle || 'Weekly QA Status Report'}`)
  lines.push(`**Project:** ${f.projectName || '—'}  |  **Period:** ${fmt(f.weekStart)} – ${fmt(f.weekEnd)}`)
  if (f.subtitle) lines.push(`\n> ${f.subtitle}`)
  lines.push('\n---')

  // Executive Summary
  lines.push('\n## Executive Summary')
  lines.push(`This report covers QA activities for **${f.projectName || 'the project'}** during the week of **${fmt(f.weekStart)}** to **${fmt(f.weekEnd)}**.`)
  lines.push(`- Support Emails handled: **${f.supportEmails}**`)
  lines.push(`- New Features tested: **${f.newFeatures}**`)
  lines.push(`- Code Fixes tested: **${f.codeFixes}**`)
  lines.push(`- QA Quality Score: **${calculateQAScore(f).score}% (${calculateQAScore(f).label})**`)
  if (f.releaseItems.length) lines.push(`- Release Pass Rate: **${passRate}%** (${passCount}/${f.releaseItems.length} items passed)`)

  // KPI Summary
  lines.push('\n## Weekly KPI Summary')
  lines.push('| Metric | Value |')
  lines.push('|---|---|')
  lines.push(`| Support Emails | **${f.supportEmails}** |`)
  lines.push(`| New Features | **${f.newFeatures}** |`)
  lines.push(`| Support Fix Testing | **${f.codeFixes}** |`)
  lines.push(`| QA Quality Score | **${calculateQAScore(f).score}% (${calculateQAScore(f).label})** |`)

  // Production Issues
  lines.push('\n## Production Issue Analysis')
  lines.push('\n### Last Week')
  lines.push('| Category | Count |')
  lines.push('|---|---|')
  lines.push(`| Escaped Issue | ${f.lastWeek.escapedIssue} |`)
  lines.push(`| Support | ${f.lastWeek.supportFix} |`)
  lines.push(`| Change Request | ${f.lastWeek.changeRequest} |`)
  lines.push(`| Data Issue | ${f.lastWeek.dataIssue} |`)
  lines.push(`| Backend Updation | ${f.lastWeek.backendUpdation} |`)
  lines.push(`| **Total (Support Mails)** | **${lwTotal}** |`)

  lines.push('\n### Month To Date')
  lines.push('| Category | Count |')
  lines.push('|---|---|')
  lines.push(`| Escaped Issue | ${f.monthToDate.escapedIssue} |`)
  lines.push(`| Support | ${f.monthToDate.supportFix} |`)
  lines.push(`| Change Request | ${f.monthToDate.changeRequest} |`)
  lines.push(`| Data Issue | ${f.monthToDate.dataIssue} |`)
  lines.push(`| Backend Updation | ${f.monthToDate.backendUpdation} |`)
  lines.push(`| **Total (Support Mails)** | **${mtdTotal}** |`)

  // Team Allocation
  lines.push('\n## Team Resource Allocation')
  const hasTeam = f.newFeatureTeam.length || f.supportTeam.length || f.automationTeam.length
  if (!hasTeam) { lines.push(na) } else {
    if (f.newFeatureTeam.length) lines.push(`- **New Feature Testing:** ${f.newFeatureTeam.join(', ')}`)
    if (f.supportTeam.length) lines.push(`- **Support Team:** ${f.supportTeam.join(', ')}`)
    if (f.automationTeam.length) lines.push(`- **Automation Team:** ${f.automationTeam.join(', ')}`)
  }

  // Support Log — same schema order/visibility as SupportLog.tsx
  lines.push('\n## Support & Exception Log')
  if (!f.supportTickets.length) { lines.push(na) } else {
    const dupSupportColumns = useColumnConfigStore.getState().getColumns('support')
    const supportSchema = hydrateSchemaFromLegacy(
      'support',
      f.supportColumnSchema,
      f.visibleSupportColumns,
      collectCustomFieldLabels(f.supportTickets, dupSupportColumns, f.supportColumnSchema),
    )
    const visibleSupportColumnsList = orderedVisibleColumns(supportSchema)

    const header = visibleSupportColumnsList.map(col => col.label).join(' | ')
    const separator = visibleSupportColumnsList.map(() => '---').join('|')
    lines.push(`| ${header} |`)
    lines.push(`|${separator}|`)

    f.supportTickets.forEach(t => {
      const values = visibleSupportColumnsList.map(col => cellValueForColumn(t, col))
      lines.push(`| ${values.join(' | ')} |`)
    })
  }

  // Release Testing — same schema order/visibility as ReleaseTable.tsx
  lines.push('\n## Release Testing Status')
  if (!f.releaseItems.length) { lines.push(na) } else {
    const dupReleaseColumns = useColumnConfigStore.getState().getColumns('release')
    const releaseSchema = hydrateSchemaFromLegacy(
      'release',
      f.releaseColumnSchema,
      f.visibleReleaseColumns,
      collectCustomFieldLabels(f.releaseItems, dupReleaseColumns, f.releaseColumnSchema),
    )
    const visibleReleaseColumnsList = orderedVisibleColumns(releaseSchema)
    const statusVisible = visibleReleaseColumnsList.some(c => c.id === 'status')

    if (statusVisible) {
      lines.push(`**Pass Rate: ${passRate}% (${passCount}/${f.releaseItems.length})**`)
    }

    const header = visibleReleaseColumnsList.map(col => col.label).join(' | ')
    const separator = visibleReleaseColumnsList.map(() => '---').join('|')
    lines.push(`\n| ${header} |`)
    lines.push(`|${separator}|`)

    f.releaseItems.forEach(i => {
      const values = visibleReleaseColumnsList.map(col => cellValueForColumn(i, col))
      lines.push(`| ${values.join(' | ')} |`)
    })
  }

  // Release Bug Status
  if (f.releaseBugStatus) {
    const rbs = f.releaseBugStatus
    lines.push('\n## Release Bug Status')
    if (rbs.uploadedFileName) lines.push(`**Source:** ${rbs.uploadedFileName}`)
    if (rbs.metrics) {
      const m = rbs.metrics
      lines.push(`\n**Release Health:** ${rbs.releaseHealth?.emoji || ''} ${rbs.releaseHealth?.label || 'N/A'} (Score: ${rbs.releaseHealth?.score ?? '—'}%)`)
      lines.push('\n| Metric | Value |')
      lines.push('|---|---|')
      lines.push(`| Total Bugs | **${m.totalBugs}** |`)
      lines.push(`| Closed | ${m.completedBugs} (${m.closurePercentage}%) |`)
      lines.push(`| Resolved (Ready for QA) | ${m.resolvedBugs} |`)
      lines.push(`| Active (Open/In Progress) | ${m.activeBugs} (${m.activePercentage}%) |`)
      lines.push(`| Deferred | ${m.deferredBugs} (${m.deferredPercentage}%) |`)
      lines.push(`| Invalid/Rejected | ${m.invalidBugs} (${m.invalidPercentage}%) |`)
    }
    if (rbs.severityDistribution?.length) {
      lines.push('\n### Severity Distribution')
      lines.push('| Severity | Count |')
      lines.push('|---|---|')
      rbs.severityDistribution.forEach((s: any) => lines.push(`| ${s.severity} | ${s.count} |`))
    }
    if (rbs.priorityDistribution?.length) {
      lines.push('\n### Priority Distribution')
      lines.push('| Priority | Count |')
      lines.push('|---|---|')
      rbs.priorityDistribution.forEach((p: any) => lines.push(`| ${p.priority} | ${p.count} |`))
    }
    if (rbs.statusDistribution?.length) {
      lines.push('\n### Bug Status Distribution')
      lines.push('| Status | Count |')
      lines.push('|---|---|')
      rbs.statusDistribution.forEach((s: any) => lines.push(`| ${s.status} | ${s.count} |`))
    }
    if (rbs.aiSummary) {
      lines.push('\n### AI Analysis')
      lines.push(rbs.aiSummary)
    }
  }

  // Defect Analysis
  lines.push('\n## Internal Defect Analysis')
  lines.push('| Metric | Last Week | Month To Date |')
  lines.push('|---|---|---|')
  lines.push(`| Reported | **${f.defectsLastWeek.reported}** | **${f.defectsMTD.reported}** |`)
  lines.push(`| Open | ${f.defectsLastWeek.open} | ${f.defectsMTD.open} |`)
  lines.push(`| Fixed | ${f.defectsLastWeek.fixed} | ${f.defectsMTD.fixed} |`)
  lines.push(`| Closed | ${f.defectsLastWeek.closed} | ${f.defectsMTD.closed} |`)

  // Historical Defect Optimization
  if (f.historicalDefectOptimization?.executiveSummary) {
    lines.push('\n## Historical Defect Optimization')
    lines.push(`**Previous Fixed Bug Count:** ${f.historicalDefectOptimization.previousFixedBugCount}`)
    lines.push(`**Latest Fixed Bug Count:** ${f.historicalDefectOptimization.latestFixedBugCount}`)
    if (f.historicalDefectOptimization.trackingSince) {
      lines.push(`**Tracking Since:** ${fmt(f.historicalDefectOptimization.trackingSince)}`)
    }
    lines.push(`\n**Reduced Bugs:** ${f.historicalDefectOptimization.reducedBugs}`)
    lines.push(`**Improvement Percentage:** ${f.historicalDefectOptimization.improvementPercentage}%`)
    lines.push(`\n${f.historicalDefectOptimization.executiveSummary}`)
  }

  // Historical Progress
  lines.push('\n## Historical Defect Progress')
  if (!f.historicalDefects.length) { lines.push(na) } else {
    lines.push('| Metric | Previous | Latest | Diff | Change | Trend |')
    lines.push('|---|---|---|---|---|---|')
    f.historicalDefects.forEach(h => {
      const diff = h.latest - h.previous
      const pct = h.previous !== 0 ? Math.abs(Math.round((diff / h.previous) * 100)) : 0
      const trend = diff < 0 ? '🟢 ▲ Improved' : diff > 0 ? '🔴 ▼ Increased' : '⚪ — No Change'
      lines.push(`| ${h.metric} | ${h.previous} | ${h.latest} | ${diff > 0 ? '+' : ''}${diff} | ${pct}% | ${trend} |`)
    })
  }

  // Next Week Priorities
  lines.push('\n## Next Week Priorities')
  if (!f.nextPriorities.length) { lines.push(na) } else {
    f.nextPriorities.forEach((p, i) => {
      lines.push(`\n### ${i + 1}. ${p.title}`)
      if (p.description) lines.push(p.description)
      const meta: string[] = []
      if (p.owner) meta.push(`**Owner:** ${p.owner}`)
      if (p.dueDate) meta.push(`**Due:** ${fmt(p.dueDate)}`)
      if (meta.length) lines.push(meta.join('  |  '))
    })
  }

  lines.push('\n---')
  lines.push(`*Report generated on ${new Date().toLocaleString()} by Qaly AI Engine*`)

  return lines.join('\n')
}

function validate(form: QAReportForm): string[] {
  const errors: string[] = []
  if (!form.projectId) errors.push('Please select a Project')
  if (!form.weekStart) errors.push('Week Start date is required')
  if (!form.weekEnd) errors.push('Week End date is required')
  if (form.weekStart && form.weekEnd && form.weekStart > form.weekEnd) errors.push('Week Start must be before Week End')
  return errors
}

// ReportDisplayToggles replaced by DashboardSectionToggles component

function TimelineBuilder() {
  const { form, setForm, savedReports } = useQAReportStore()

  if (!form.showTimeline) return null

  const timeline = form.customTimeline || []

  const updateNode = (id: string, patch: Partial<TimelineNode>) => {
    const next = timeline.map(n => n.id === id ? { ...n, ...patch } : n)
    setForm({ customTimeline: next })
  }

  const addNode = () => {
    const newNode: TimelineNode = {
      id: crypto.randomUUID(),
      week: `Week ${timeline.length + 1}`,
      healthScore: 100,
      emails: 0,
      features: 0,
      fixes: 0,
      openDefects: 0,
      closedDefects: 0,
      emailChange: '➜'
    }
    setForm({ customTimeline: [...timeline, newNode] })
  }

  const deleteNode = (id: string) => {
    setForm({ customTimeline: timeline.filter(n => n.id !== id) })
  }

  const handleAutoPopulate = () => {
    const activeHistory = savedReports
      .filter(r => r.projectId === form.projectId && r.status === 'Final')
      .sort((a, b) => new Date(a.generatedDate).getTime() - new Date(b.generatedDate).getTime())
      .slice(-5)

    if (activeHistory.length === 0) {
      toast({ variant: 'destructive', title: 'No History Found', description: `No saved final reports found for project "${form.projectName || 'unnamed'}"` })
      return
    }

    const populated = activeHistory.map((h, i, arr) => {
      const currPassCount = h.form.releaseItems.filter((item: any) => isPassStatus(item?.status)).length
      const currPassRate = h.form.releaseItems.length ? Math.round((currPassCount / h.form.releaseItems.length) * 100) : 0

      let emailChange = '➜'
      if (i > 0) {
        const prev = arr[i - 1].form.supportEmails
        const diff = h.form.supportEmails - prev
        if (diff > 0) emailChange = `▲ +${Math.round((diff / (prev || 1)) * 100)}%`
        else if (diff < 0) emailChange = `▼ ${Math.round((diff / (prev || 1)) * 100)}%`
      }

      return {
        id: crypto.randomUUID(),
        week: h.week || `${h.form.weekStart} – ${h.form.weekEnd}`,
        emails: h.form.supportEmails,
        features: h.form.newFeatures,
        fixes: h.form.codeFixes,
        openDefects: h.form.defectsLastWeek.open,
        closedDefects: h.form.defectsLastWeek.closed,
        healthScore: currPassRate,
        emailChange
      }
    })

    setForm({ customTimeline: populated })
    toast({ title: 'Timeline Populated', description: `Loaded ${populated.length} weeks from historical reports.` })
  }

  return (
    <div className="p-6 rounded-3xl glass-panel flex flex-col gap-4 text-left">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Customize QA Progress Timeline</h3>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Add custom timeline nodes or load them automatically from history.</p>
        </div>
        <button
          type="button"
          onClick={handleAutoPopulate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-accent-gold text-xs font-bold transition-all"
          style={{ background: 'rgba(212,175,55,0.10)', border: '1px solid rgba(212,175,55,0.22)' }}
        >
          <HistoryIcon className="w-3.5 h-3.5" /> Auto-populate from History
        </button>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {timeline.map((node) => (
          <div
            key={node.id}
            className="p-4 rounded-2xl flex flex-col gap-3 relative group text-left"
            style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}
          >
            <button
              type="button"
              onClick={() => deleteNode(node.id)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
              title="Delete node"
            >
              <Trash className="w-3.5 h-3.5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
              <div>
                <label className="text-[10px] block font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Week / Cycle Label</label>
                <input
                  type="text"
                  value={node.week}
                  onChange={(e) => updateNode(node.id, { week: e.target.value })}
                  placeholder="e.g. Week 1 or Sprint 1"
                  className="field-input h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] block font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Health Index (%)</label>
                <input
                  type="number"
                  value={node.healthScore}
                  onChange={(e) => updateNode(node.id, { healthScore: Number(e.target.value) })}
                  placeholder="e.g. 95"
                  className="field-input h-9 text-xs"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="text-[10px] block font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Emails</label>
                <input
                  type="number"
                  value={node.emails}
                  onChange={(e) => updateNode(node.id, { emails: Number(e.target.value) })}
                  className="field-input h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] block font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Features</label>
                <input
                  type="number"
                  value={node.features}
                  onChange={(e) => updateNode(node.id, { features: Number(e.target.value) })}
                  className="field-input h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] block font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Fixes</label>
                <input
                  type="number"
                  value={node.fixes}
                  onChange={(e) => updateNode(node.id, { fixes: Number(e.target.value) })}
                  className="field-input h-9 text-xs"
                />
              </div>
              <div>
                <label className="text-[10px] block font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Open Bugs</label>
                <input
                  type="number"
                  value={node.openDefects}
                  onChange={(e) => updateNode(node.id, { openDefects: Number(e.target.value) })}
                  className="field-input h-9 text-xs text-red-500"
                />
              </div>
              <div>
                <label className="text-[10px] block font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>Closed Bugs</label>
                <input
                  type="number"
                  value={node.closedDefects}
                  onChange={(e) => updateNode(node.id, { closedDefects: Number(e.target.value) })}
                  className="field-input h-9 text-xs text-green-600"
                />
              </div>
            </div>
          </div>
        ))}

        {timeline.length === 0 && (
          <div className="text-center py-6 border border-dashed rounded-2xl" style={{ borderColor: 'var(--border)' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No custom timeline entries. Bypassing customization will render automatic history.</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={addNode}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed text-xs font-bold transition-all"
        style={{ borderColor: 'var(--border)', color: 'var(--text-secondary)', background: 'var(--hover)' }}
        onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
        onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-secondary)' }}
      >
        <Plus className="w-4 h-4" /> Add Timeline Entry
      </button>
    </div>
  )
}

export const QAWeeklyReport: React.FC = () => {
  const { form, setForm, setGeneratedReport, generatedReport, resetForm, fetchReports, fetchProjects, savedReports } = useQAReportStore()
  const { can } = usePermissions()
  const navigate = useNavigate()
  const isAuthorizedToConfig = can('qa-report', 'can_configure')
  const canCreate = can('qa-report', 'can_create')
  const canDelete = can('qa-report', 'can_delete')
  const canExport = can('qa-report', 'can_export')
  const { canGenerate } = useAIAccess()
  const canGenerateAI = canGenerate('qa-report')
  const [errors, setErrors] = useState<string[]>([])
  const [isLaunching, setIsLaunching] = useState(false)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isPreviewed, setIsPreviewed] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>('')
  const [loadedFromHistory, setLoadedFromHistory] = useState(false)
  const [hasChangedSinceLoad, setHasChangedSinceLoad] = useState(false)

  // Reset tracking states when project ID changes to prevent false "Changes Detected" state
  // Use a ref to skip the reset on initial mount (when projectId is set during init)
  const prevProjectIdRef = React.useRef<string | undefined>(undefined)
  React.useEffect(() => {
    // Skip reset on first render (initial project selection during mount)
    if (prevProjectIdRef.current === undefined) {
      prevProjectIdRef.current = form.projectId
      return
    }
    // Only reset if the user actively switched projects
    if (prevProjectIdRef.current !== form.projectId) {
      prevProjectIdRef.current = form.projectId
      setIsSaved(false)
      setLastSavedSnapshot('')
      setLoadedFromHistory(false)
      setHasChangedSinceLoad(false)
    }
  }, [form.projectId])

  React.useEffect(() => {
    fetchProjects(true).then(() => {
      const activeProjects = useQAReportStore.getState().projects
      const savedId = localStorage.getItem('last-selected-project-id')
      const matched = activeProjects.find(p => p.id === savedId)

      const projectId = matched?.id ?? activeProjects[0]?.id
      const projectName = matched?.projectName ?? activeProjects[0]?.projectName

      if (projectId) {
        setForm({ projectId, projectName })
        fetchReports(projectId).then(() => {
          // After reports load, check if current form snapshot matches any saved report
          // This restores isSaved=true after a page refresh
          const { savedReports, form: currentForm } = useQAReportStore.getState()
          const currentSnapshot = createFormSnapshot(currentForm)
          const match = savedReports.find(r => createFormSnapshot(r.form) === currentSnapshot)
          if (match) {
            handleReportLoadedFromHistory(currentSnapshot)
          }
        })
      } else {
        fetchReports()
      }
    })
  }, [])

  // Check if current form matches a saved report in history
  React.useEffect(() => {
    if (!lastSavedSnapshot) return
    const currentSnapshot = createFormSnapshot(form)
    if (currentSnapshot === lastSavedSnapshot) {
      setIsSaved(true)
      if (loadedFromHistory) setHasChangedSinceLoad(false)
    } else {
      setIsSaved(false)
      if (loadedFromHistory) setHasChangedSinceLoad(true)
    }
  }, [form, lastSavedSnapshot, loadedFromHistory])

  const handlePreview = () => {
    const errs = validate(form)
    setErrors(errs)
    if (errs.length) {
      toast({
        variant: 'destructive',
        title: 'Validation Errors',
        description: 'Please fix the errors before previewing the report.',
      })
      return
    }

    // Validate project selection
    if (!form.projectId) {
      toast({
        variant: 'destructive',
        title: 'Missing Project',
        description: 'Please select a project before previewing the report.',
      })
      setErrors([...errs, 'Project selection is required'])
      return
    }

    // Generate markdown for the preview drawer
    const md = buildMarkdown(form)
    setGeneratedReport(md)
    setIsPreviewed(true)
    setDrawerOpen(true)
  }

  const handleDrawerSaved = () => {
    const currentSnapshot = createFormSnapshot(form)
    setIsSaved(true)
    setLastSavedSnapshot(currentSnapshot)
    setLoadedFromHistory(true)
    setHasChangedSinceLoad(false)
    toast({
      title: 'Report Saved Successfully!',
      description: 'You can now launch the Executive Dashboard. The report has been added to History.',
    })
  }

  const handleDrawerClose = () => {
    setDrawerOpen(false)
    // If user closes without saving and form doesn't match history, they need to preview again
    if (!isSaved) {
      setIsPreviewed(false)
    }
  }

  const handleReportLoadedFromHistory = (snapshot: string) => {
    setLoadedFromHistory(true)
    setHasChangedSinceLoad(false)
    setLastSavedSnapshot(snapshot)
    setIsSaved(true)
  }

  // Get section visibility for graying out disabled sections
  const sectionVisibility = getSectionVisibility(form)

  const handleGenerate = () => {
    if (!isSaved) {
      toast({
        variant: 'destructive',
        title: 'Preview & Save Required',
        description: 'Please preview and save your report before launching the Executive Dashboard.',
      })
      return
    }

    const errs = validate(form)
    setErrors(errs)
    if (errs.length) {
      toast({
        variant: 'destructive',
        title: 'Validation Errors',
        description: 'Please fix the validation errors before launching the dashboard.',
      })
      return
    }

    // Validate critical fields before launch
    if (!form.projectId) {
      toast({
        variant: 'destructive',
        title: 'Missing Project',
        description: 'Please select a project before launching the dashboard.',
      })
      return
    }

    try {
      // Save to local storage for the dashboard preview tab to pick up
      localStorage.setItem('current-qa-report-data', JSON.stringify(form))

      // Verify localStorage write succeeded
      const verification = localStorage.getItem('current-qa-report-data')
      if (!verification) {
        throw new Error('Failed to save report data to browser storage')
      }

      // Find the saved report id that matches the current form
      const { savedReports: reports } = useQAReportStore.getState()
      const currentSnapshot = createFormSnapshot(form)
      const matchedReport = reports.find(r => createFormSnapshot(r.form) === currentSnapshot)
      const reportId = matchedReport?.id ?? ''
      // `launch=1` tells the new tab to play qaly.ai / RELEASE TRIAGE before revealing the dashboard
      const params = new URLSearchParams()
      if (reportId) params.set('reportId', reportId)
      params.set('launch', '1')
      const url = `${window.location.origin}${ROUTES.reportPreview}?${params.toString()}`

      setIsLaunching(true)
      const newWindow = window.open(url, '_blank')
      setIsLaunching(false)

      if (!newWindow) {
        toast({
          variant: 'destructive',
          title: 'Popup Blocked',
          description: 'Please allow popups for this site to launch the dashboard.',
        })
        return
      }

      toast({
        title: 'Dashboard Launching',
        description: 'Opening Executive Dashboard — analysis runs in the new tab.',
      })
    } catch (error) {
      console.error('Launch error:', error)
      setIsLaunching(false)
      toast({
        variant: 'destructive',
        title: 'Launch Failed',
        description: error instanceof Error ? error.message : 'Could not launch dashboard. Please try again.',
      })
    }
  }

  const handleReset = () => {
    if (!confirm('Reset all form data?')) return
    resetForm(form.projectId, form.projectName)
    setErrors([])
    setIsPreviewed(false)
    setIsSaved(false)
    setLastSavedSnapshot('')
    setLoadedFromHistory(false)
    setHasChangedSinceLoad(false)
    localStorage.removeItem('current-qa-report-data')
    toast({ title: 'Form Reset', description: 'All fields have been cleared (project preserved).' })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-6 sm:py-10">
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8 sm:mb-12">
        <div className="flex-1 min-w-0">
          <CinematicHeading
            title="QA Weekly Report"
            subtitle="Fill in the weekly QA data and generate a professional executive-level report instantly."
            align="left"
            className="mb-0 sm:mb-0"
          />
        </div>
        <div className="flex items-center gap-2 text-xs shrink-0 self-start sm:self-center mt-2 sm:mt-0">
          {/* New Report Button */}
          <button
            onClick={() => {
              const isFormEmpty =
                !form.weekStart &&
                !form.weekEnd &&
                !form.subtitle &&
                form.supportEmails === 0 &&
                form.newFeatures === 0 &&
                form.codeFixes === 0 &&
                form.releaseItems.length === 0 &&
                form.supportTickets.length === 0 &&
                form.defectsLastWeek.reported === 0 &&
                form.defectsLastWeek.open === 0 &&
                form.defectsLastWeek.closed === 0

              const executeReset = () => {
                resetForm(form.projectId, form.projectName)
                setErrors([])
                setIsPreviewed(false)
                setIsSaved(false)
                localStorage.removeItem('current-qa-report-data')
                toast({ title: 'New Report Initialized', description: 'Form fields have been reset, project preserved.' })
              }

              if (isFormEmpty) {
                executeReset()
              } else if (confirm('Create a new report? This will clear current fields.')) {
                executeReset()
              }
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-hover border border-border text-text-secondary hover:text-text-primary transition-all font-black uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5" />
            New Report
          </button>

          {/* Dropdown Configuration button (RBAC protected) — manages the
              Testing Status / Priority master dropdown lists used by the
              Support Log and Release Testing tables below. */}
          {isAuthorizedToConfig && (
            <button
              onClick={() => navigate(ROUTES.qaReportDropdownConfig)}
              title="Manage Testing Status / Priority dropdown values"
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-hover border border-border text-text-secondary hover:text-text-primary transition-all font-black uppercase tracking-wider"
            >
              <Settings className="w-3.5 h-3.5" />
              Dropdown Config
            </button>
          )}

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] xl:grid-cols-[1fr_380px] 2xl:grid-cols-[1fr_420px] gap-6 xl:gap-8 items-start">
        {/* ── Left Panel: Input Forms ────────────────────────────────────── */}
        <div className="flex flex-col gap-6 min-w-0">
          <HeaderSection />
          <DashboardSectionToggles />
          <TimelineBuilder />

          <DisabledSectionWrapper isEnabled={sectionVisibility.show_kpiCards !== false} sectionName="KPI Scorecards">
            <KPICards />
          </DisabledSectionWrapper>

          <DisabledSectionWrapper isEnabled={sectionVisibility.show_productionIssues !== false} sectionName="Production Issues">
            <ProductionIssues />
          </DisabledSectionWrapper>

          <DisabledSectionWrapper isEnabled={sectionVisibility.show_teamAllocation !== false} sectionName="Team Allocation">
            <TeamAllocation />
          </DisabledSectionWrapper>

          <DisabledSectionWrapper isEnabled={sectionVisibility.show_supportLog !== false} sectionName="Support & Exception Log">
            <SupportLog />
          </DisabledSectionWrapper>

          <DisabledSectionWrapper isEnabled={sectionVisibility.show_releaseTable !== false} sectionName="Release Testing Table">
            <ReleaseTable />
          </DisabledSectionWrapper>

          <DisabledSectionWrapper isEnabled={sectionVisibility.show_releaseBugStatus !== false} sectionName="Release Bug Status">
            <ReleaseBugStatus
              analytics={form.releaseBugStatus}
              onChange={(data) => setForm({ releaseBugStatus: data })}
            />
          </DisabledSectionWrapper>

          <DisabledSectionWrapper isEnabled={sectionVisibility.show_teamCapacity !== false} sectionName="Team Capacity Overview">
            <TeamCapacityUpload
              capacityData={form.teamCapacity}
              onChange={(data) => setForm({ teamCapacity: data })}
            />
          </DisabledSectionWrapper>

          <DisabledSectionWrapper isEnabled={sectionVisibility.show_defectAnalysis !== false} sectionName="Defect Analysis">
            <DefectAnalysis />
          </DisabledSectionWrapper>

          <DisabledSectionWrapper isEnabled={sectionVisibility.show_historicalDefectOptimization !== false} sectionName="Historical Defect Optimization">
            <HistoricalDefectOptimization />
          </DisabledSectionWrapper>

          <DisabledSectionWrapper isEnabled={sectionVisibility.showHistoricalAnalytics !== false} sectionName="Historical Defect Progress">
            <HistoricalProgress />
          </DisabledSectionWrapper>

          <DisabledSectionWrapper isEnabled={sectionVisibility.show_nextPriorities !== false} sectionName="Next Week Priorities">
            <NextPriorities />
          </DisabledSectionWrapper>

          {/* Validation errors */}
          <AnimatePresence>
            {errors.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex flex-col gap-2 p-4 rounded-2xl bg-red-500/10 border border-red-500/20"
              >
                {errors.map(e => (
                  <div key={e} className="flex items-center gap-2 text-xs text-red-400">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {e}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Sticky action bar */}
          <div className="sticky bottom-4 z-20 flex items-center gap-3 p-4 rounded-3xl glass-panel border border-white/10 shadow-2xl">
            {/* Preview Button */}
            <button
              onClick={handlePreview}
              className="flex items-center gap-2 px-5 py-3 rounded-full bg-white/5 border border-accent-gold/30 text-sm font-bold text-accent-gold hover:bg-accent-gold/10 transition-all active:scale-[0.97]"
            >
              <Eye className="w-4 h-4" /> Preview
            </button>

            {/* Launch Button - disabled until saved */}
            <div className="flex-1 relative group">
              <FloatingButton
                onClick={handleGenerate}
                className="w-full"
                disabled={isLaunching || !isSaved}
              >
                {isLaunching ? (
                  <span className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                    Launching...
                  </span>
                ) : !isSaved ? (
                  <><Lock className="w-4 h-4 mr-2 opacity-60" /> Launch Executive Dashboard</>
                ) : (
                  <><FileText className="w-4 h-4 mr-2" /> Launch Executive Dashboard</>
                )}
              </FloatingButton>
              {!isSaved && (
                <div className="absolute -top-12 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg bg-black/95 border border-white/10 text-[11px] text-white/90 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-xl z-10">
                  Save report first (or check if already in History)
                </div>
              )}
            </div>

            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-text-secondary hover:text-white hover:bg-white/10 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        {/* ── Right Panel: Widgets + History ────────────────────────────── */}
        <div className="flex flex-col gap-6 min-w-0">
          <DashboardWidgets />
          <DefectChart />

          {/* Info card about preview workflow */}
          {/* Smart Workflow Status Card */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-start justify-start text-left p-6 glass-panel border gap-4"
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-gold/10 flex items-center justify-center shrink-0">
                <Eye className="w-5 h-5 text-accent-gold" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white mb-1">Workflow Status</h3>
                <p className="text-text-muted text-xs leading-relaxed">Current report status and next steps</p>
              </div>
            </div>

            {/* Contextual Status Messages */}
            <AnimatePresence mode="wait">
              {loadedFromHistory && !hasChangedSinceLoad && isSaved ? (
                // Report loaded from history and no changes
                <motion.div
                  key="ready-to-launch"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="w-full p-4 rounded-xl bg-green-500/10 border-2 border-green-500/30"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-green-400">Ready to Launch</h4>
                  </div>
                  <p className="text-xs text-green-300/90 leading-relaxed mb-3">
                    This report was loaded from History and is ready to launch immediately.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-green-400/70">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="font-semibold">Click "Launch Executive Dashboard" to view</span>
                  </div>
                </motion.div>
              ) : loadedFromHistory && hasChangedSinceLoad ? (
                // Report was loaded but has been modified
                <motion.div
                  key="changes-detected"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="w-full p-4 rounded-xl bg-orange-500/10 border-2 border-orange-500/30"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-orange-400">Changes Detected</h4>
                  </div>
                  <p className="text-xs text-orange-300/90 leading-relaxed mb-3">
                    You've modified the report data. Preview and save to update.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-orange-400/70 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-[10px] font-bold">1</span>
                      Preview
                    </span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-[10px] font-bold">2</span>
                      Save
                    </span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 text-[10px] font-bold">3</span>
                      Launch
                    </span>
                  </div>
                </motion.div>
              ) : isSaved ? (
                // Newly created and saved report
                <motion.div
                  key="saved-ready"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="w-full p-4 rounded-xl bg-green-500/10 border-2 border-green-500/30"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-green-400">Report Saved</h4>
                  </div>
                  <p className="text-xs text-green-300/90 leading-relaxed mb-3">
                    Your report has been saved successfully and is ready to launch.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-green-400/70">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="font-semibold">Click "Launch Executive Dashboard" to view</span>
                  </div>
                </motion.div>
              ) : (
                // New report or needs save
                <motion.div
                  key="needs-save"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="w-full p-4 rounded-xl bg-blue-500/10 border-2 border-blue-500/30"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <h4 className="text-sm font-bold text-blue-400">Save Required</h4>
                  </div>
                  <p className="text-xs text-blue-300/90 leading-relaxed mb-3">
                    Preview and save your report before launching the dashboard.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-blue-400/70 font-semibold">
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-[10px] font-bold">1</span>
                      Preview
                    </span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-[10px] font-bold">2</span>
                      Save
                    </span>
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                    <span className="flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-[10px] font-bold">3</span>
                      Launch
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Info box about display toggles */}
            <div className="w-full px-3 py-2.5 rounded-lg bg-white/5 border border-white/10">
              <p className="text-[11px] text-text-muted leading-relaxed">
                <strong className="text-text-secondary font-semibold">Smart Save:</strong> Display toggle changes don't require re-saving. Only data changes need a new save.
              </p>
            </div>
          </motion.div>

          <ReportHistory onReportLoaded={handleReportLoadedFromHistory} />
        </div>
      </div>

      {/* ── Report Preview Drawer ── */}
      <ReportPreviewDrawer
        open={drawerOpen}
        onClose={handleDrawerClose}
        markdown={generatedReport}
        onSaved={handleDrawerSaved}
      />

    </motion.div>
  )
}
