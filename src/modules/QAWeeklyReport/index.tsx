import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePermissions } from '@/hooks/usePermissions'
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
import { DashboardSectionToggles } from './components/DashboardSectionToggles'
import { DefectAnalysis, HistoricalProgress, NextPriorities } from './components/Metrics'
import { DashboardWidgets, DefectChart, ReportHistory } from './components/Widgets'
import { toast } from '@/hooks/use-toast'
import { FileText, RefreshCw, RotateCcw, AlertCircle, Plus, Trash, History as HistoryIcon, Settings, Eye, Lock } from 'lucide-react'
import type { QAReportForm, TimelineNode } from './types'
import { ROUTES } from '@/lib/routes'
import { calculateQAScore } from './utils/qualityCalculator'

function buildMarkdown(f: QAReportForm): string {
  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const na = 'No updates available for this week.'

  const lwTotal = f.lastWeek.support
  const mtdTotal = f.monthToDate.support

  const passCount = f.releaseItems.filter(i => i.status === 'Pass').length
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
  if (f.releaseItems.length) lines.push(`- Release test pass rate: **${passRate}%** (${passCount}/${f.releaseItems.length} items passed)`)

  // KPI Summary
  lines.push('\n## Weekly KPI Summary')
  lines.push('| Metric | Value |')
  lines.push('|---|---|')
  lines.push(`| Support Emails | **${f.supportEmails}** |`)
  lines.push(`| New Features | **${f.newFeatures}** |`)
  lines.push(`| Code Fixes Testing | **${f.codeFixes}** |`)
  lines.push(`| QA Quality Score | **${calculateQAScore(f).score}% (${calculateQAScore(f).label})** |`)

  // Production Issues
  lines.push('\n## Production Issue Analysis')
  lines.push('\n### Last Week')
  lines.push('| Category | Count |')
  lines.push('|---|---|')
  lines.push(`| Escaped Issue | ${f.lastWeek.escapedIssue} |`)
  lines.push(`| Support Fix | ${f.lastWeek.supportFix} |`)
  lines.push(`| Change Request | ${f.lastWeek.changeRequest} |`)
  lines.push(`| Data Issue | ${f.lastWeek.dataIssue} |`)
  lines.push(`| Backend Updation | ${f.lastWeek.backendUpdation} |`)
  lines.push(`| **Total (Support Mails)** | **${lwTotal}** |`)

  lines.push('\n### Month To Date')
  lines.push('| Category | Count |')
  lines.push('|---|---|')
  lines.push(`| Escaped Issue | ${f.monthToDate.escapedIssue} |`)
  lines.push(`| Support Fix | ${f.monthToDate.supportFix} |`)
  lines.push(`| Change Request | ${f.monthToDate.changeRequest} |`)
  lines.push(`| Completed CR | ${f.monthToDate.completedCR ?? 0} |`)
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

  // Support Log
  lines.push('\n## Support & Exception Log')
  if (!f.supportTickets.length) { lines.push(na) } else {
    lines.push('| Task ID | Description | Assigned QA | Status | Priority | Remarks |')
    lines.push('|---|---|---|---|---|---|')
    f.supportTickets.forEach(t => lines.push(`| ${t.taskId} | ${t.description} | ${t.assignedQA} | ${t.status} | ${t.priority} | ${t.remarks} |`))
  }

  // Release Testing
  lines.push('\n## Release Testing Status')
  if (!f.releaseItems.length) { lines.push(na) } else {
    lines.push(`**Pass Rate: ${passRate}% (${passCount}/${f.releaseItems.length})**`)
    lines.push('\n| Task ID | Feature | Assignee | Status | Priority | Remarks |')
    lines.push('|---|---|---|---|---|---|')
    f.releaseItems.forEach(i => lines.push(`| ${i.taskId} | ${i.featureName} | ${i.assignee} | ${i.status} | ${i.priority} | ${i.remarks} |`))
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
      lines.push(`| Completed (Closed/Verified) | ${m.completedBugs} (${m.closurePercentage}%) |`)
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
      const currPassCount = h.form.releaseItems.filter((item: any) => item?.status === 'Pass').length
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
    <div className="p-6 rounded-3xl border glass-panel flex flex-col gap-4 text-left">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-bold text-white">Customize QA Progress Timeline</h3>
          <p className="text-[11px] text-text-muted">Add custom timeline nodes or load them automatically from history.</p>
        </div>
        <button
          type="button"
          onClick={handleAutoPopulate}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#d4af37]/10 border border-[#d4af37]/20 text-accent-gold text-xs font-bold hover:bg-[#d4af37]/20 transition-all"
        >
          <HistoryIcon className="w-3.5 h-3.5" /> Auto-populate from History
        </button>
      </div>

      <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
        {timeline.map((node, index) => (
          <div key={node.id} className="p-4 rounded-2xl border border-white/5 bg-white/[0.01] flex flex-col gap-3 relative group text-left">
            <button
              type="button"
              onClick={() => deleteNode(node.id)}
              className="absolute top-4 right-4 p-1.5 rounded-lg bg-red-500/10 text-red-400 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 transition-all"
              title="Delete node"
            >
              <Trash className="w-3.5 h-3.5" />
            </button>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-8">
              <div>
                <label className="text-[10px] text-text-muted block font-semibold uppercase tracking-wider mb-1">Week / Cycle Label</label>
                <input
                  type="text"
                  value={node.week}
                  onChange={(e) => updateNode(node.id, { week: e.target.value })}
                  placeholder="e.g. Week 1 or Sprint 1"
                  className="field-input h-9 text-xs bg-black/45 border-white/10"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block font-semibold uppercase tracking-wider mb-1">Health Index (%)</label>
                <input
                  type="number"
                  value={node.healthScore}
                  onChange={(e) => updateNode(node.id, { healthScore: Number(e.target.value) })}
                  placeholder="e.g. 95"
                  className="field-input h-9 text-xs bg-black/45 border-white/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div>
                <label className="text-[10px] text-text-muted block font-semibold uppercase tracking-wider mb-1">Emails</label>
                <input
                  type="number"
                  value={node.emails}
                  onChange={(e) => updateNode(node.id, { emails: Number(e.target.value) })}
                  className="field-input h-9 text-xs bg-black/45 border-white/10"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block font-semibold uppercase tracking-wider mb-1">Features</label>
                <input
                  type="number"
                  value={node.features}
                  onChange={(e) => updateNode(node.id, { features: Number(e.target.value) })}
                  className="field-input h-9 text-xs bg-black/45 border-white/10"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block font-semibold uppercase tracking-wider mb-1">Fixes</label>
                <input
                  type="number"
                  value={node.fixes}
                  onChange={(e) => updateNode(node.id, { fixes: Number(e.target.value) })}
                  className="field-input h-9 text-xs bg-black/45 border-white/10"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block font-semibold uppercase tracking-wider mb-1">Open Bugs</label>
                <input
                  type="number"
                  value={node.openDefects}
                  onChange={(e) => updateNode(node.id, { openDefects: Number(e.target.value) })}
                  className="field-input h-9 text-xs text-red-400 bg-black/45 border-white/10"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-muted block font-semibold uppercase tracking-wider mb-1">Closed Bugs</label>
                <input
                  type="number"
                  value={node.closedDefects}
                  onChange={(e) => updateNode(node.id, { closedDefects: Number(e.target.value) })}
                  className="field-input h-9 text-xs text-green-400 bg-black/45 border-white/10"
                />
              </div>
            </div>
          </div>
        ))}

        {timeline.length === 0 && (
          <div className="text-center py-6 border border-dashed border-white/10 rounded-2xl">
            <p className="text-xs text-text-muted">No custom timeline entries. Bypassing customization will render automatic history.</p>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={addNode}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-dashed border-white/10 hover:border-white/20 text-xs font-bold text-text-secondary hover:text-white transition-all bg-white/[0.01] hover:bg-white/[0.02]"
      >
        <Plus className="w-4 h-4" /> Add Timeline Entry
      </button>
    </div>
  )
}

// Helper to create a form snapshot (excluding dashboard sections which are display-only preferences)
function createFormSnapshot(form: QAReportForm): string {
  const snapshot = { ...form }
  delete (snapshot as any).dashboardSections // Exclude display preferences
  delete (snapshot as any).showAIInsights
  delete (snapshot as any).showAISummary
  delete (snapshot as any).showHistoricalAnalytics
  delete (snapshot as any).showTimeline
  return JSON.stringify(snapshot)
}

export const QAWeeklyReport: React.FC = () => {
  const { form, setForm, setGeneratedReport, generatedReport, resetForm, fetchReports, fetchProjects, savedReports } = useQAReportStore()
  const { can } = usePermissions()
  const navigate = useNavigate()
  const isAuthorizedToConfig = can('qa-report', 'can_configure')
  const canCreate = can('qa-report', 'can_create')
  const canDelete = can('qa-report', 'can_delete')
  const canExport = can('qa-report', 'can_export')
  const canGenerateAI = can('qa-report', 'can_generate_ai')
  const [errors, setErrors] = useState<string[]>([])
  const [isLaunching, setIsLaunching] = useState(false)
  const [launchMessage, setLaunchMessage] = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [isPreviewed, setIsPreviewed] = useState(false)
  const [isSaved, setIsSaved] = useState(false)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string>('')
  const [loadedFromHistory, setLoadedFromHistory] = useState(false)
  const [hasChangedSinceLoad, setHasChangedSinceLoad] = useState(false)

  React.useEffect(() => {
    fetchProjects(true).then(() => {
      const activeProjects = useQAReportStore.getState().projects
      const savedId = localStorage.getItem('last-selected-project-id')
      const matched = activeProjects.find(p => p.id === savedId)

      if (matched) {
        setForm({ projectId: matched.id, projectName: matched.projectName })
        fetchReports(matched.id)
      } else if (activeProjects.length > 0) {
        setForm({ projectId: activeProjects[0].id, projectName: activeProjects[0].projectName })
        fetchReports(activeProjects[0].id)
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
    if (errs.length) return

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
    if (errs.length) return

    // Save to local storage for the dashboard preview tab to pick up
    localStorage.setItem('current-qa-report-data', JSON.stringify(form))

    // Start premium animation experience
    setIsLaunching(true)
    setLaunchMessage('Preparing Executive Dashboard...')

    // Switch message halfway
    setTimeout(() => {
      setLaunchMessage('Loading KPIs, Analytics & Historical Insights...')
    }, 450)

    // Complete transition and open new tab
    setTimeout(() => {
      const url = `${window.location.origin}${ROUTES.reportPreview}`
      window.open(url, '_blank', 'noopener')
      setIsLaunching(false)
      toast({ title: 'Dashboard Launched!', description: 'Opening the Executive Dashboard in a new tab.' })
    }, 900)
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


        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_480px] gap-6 xl:gap-8 items-start">
        {/* ── Left Panel: Input Forms ────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <HeaderSection />
          <DashboardSectionToggles />
          <TimelineBuilder />
          <KPICards />
          <ProductionIssues />
          <TeamAllocation />
          <SupportLog />
          <ReleaseTable />
          <ReleaseBugStatus
            analytics={form.releaseBugStatus}
            onChange={(data) => setForm({ releaseBugStatus: data })}
          />
          <TeamCapacityUpload
            capacityData={form.teamCapacity}
            onChange={(data) => setForm({ teamCapacity: data })}
          />
          <DefectAnalysis />
          <HistoricalProgress />
          <NextPriorities />

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
        <div className="flex flex-col gap-6">
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

      {/* ── Premium Launch Animation Overlay ── */}
      <AnimatePresence>
        {isLaunching && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center overflow-hidden pointer-events-auto launch-overlay"
          >
            {/* Soft expanding glowing background orb */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: [0.8, 1.4, 1.2], opacity: [0, 0.4, 0.25] }}
              transition={{ duration: 0.9, ease: 'easeOut' }}
              className="absolute w-[450px] h-[450px] rounded-full bg-accent-gold/20 blur-[100px] pointer-events-none"
            />

            {/* Light streaks/particles moving upward */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
              {Array.from({ length: 6 }).map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ y: '100%', x: `${15 + i * 15}%`, opacity: 0, scaleY: 0.5 }}
                  animate={{ y: '-20%', opacity: [0, 1, 0], scaleY: [0.5, 1.5, 0.5] }}
                  transition={{
                    duration: 0.8,
                    ease: 'easeOut',
                    delay: i * 0.05
                  }}
                  className="absolute w-[1px] h-32 bg-gradient-to-t from-transparent via-accent-gold to-transparent"
                />
              ))}
            </div>

            {/* Dashboard Icon & Animation */}
            <div className="relative flex items-center justify-center mb-8">
              {/* Ripple circles */}
              <motion.div
                initial={{ scale: 0.9, opacity: 0.6 }}
                animate={{ scale: 2.2, opacity: 0 }}
                transition={{ duration: 0.75, ease: 'easeOut' }}
                className="absolute w-24 h-24 rounded-full border border-accent-gold/30"
              />
              <motion.div
                initial={{ scale: 0.9, opacity: 0.5 }}
                animate={{ scale: 1.6, opacity: 0 }}
                transition={{ duration: 0.75, ease: 'easeOut', delay: 0.15 }}
                className="absolute w-24 h-24 rounded-full border border-accent-gold/20"
              />

              {/* Glowing core wrapper */}
              <motion.div
                animate={{
                  rotate: [0, 3, -3, 0],
                  scale: [1, 1.1, 1.05, 1],
                  boxShadow: [
                    '0 0 20px rgba(212,175,55,0.1)',
                    '0 0 40px rgba(212,175,55,0.3)',
                    '0 0 20px rgba(212,175,55,0.1)'
                  ]
                }}
                transition={{ duration: 0.9, ease: 'easeInOut' }}
                className="w-20 h-20 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center z-10 backdrop-blur-md"
              >
                <FileText className="w-10 h-10 text-accent-gold" />
              </motion.div>
            </div>

            {/* Messages */}
            <div className="z-10 text-center flex flex-col gap-2.5 px-6 max-w-sm">
              <motion.h4
                key={launchMessage}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="text-base font-extrabold text-white tracking-wide min-h-[48px] flex items-center justify-center"
              >
                {launchMessage}
              </motion.h4>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 0.4 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="text-xs text-white/50 font-medium"
              >
                QA Executive Analytics Suite
              </motion.p>

              {/* Premium Progress Bar */}
              <div className="w-48 h-1 bg-white/10 rounded-full overflow-hidden mt-4 mx-auto">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.9, ease: 'easeInOut' }}
                  className="h-full bg-accent-gold shadow-[0_0_8px_#d4af37]"
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}
