import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CinematicHeading } from '@/components/ui/CinematicHeading'
import { FloatingButton } from '@/components/ui/FloatingButton'
import { useQAReportStore } from './store'
import { HeaderSection, KPICards } from './components/HeaderSection'
import { ProductionIssues } from './components/ProductionIssues'
import { TeamAllocation } from './components/TeamAllocation'
import { SupportLog } from './components/SupportLog'
import { ReleaseTable } from './components/ReleaseTable'
import { DefectAnalysis, HistoricalProgress, NextPriorities } from './components/Metrics'
import { ReportPreview } from './components/ReportPreview'
import { DashboardWidgets, DefectChart, ReportHistory } from './components/Widgets'
import { toast } from '@/hooks/use-toast'
import { FileText, RefreshCw, RotateCcw, AlertCircle } from 'lucide-react'
import type { QAReportForm } from './types'
import { ROUTES } from '@/lib/routes'

function buildMarkdown(f: QAReportForm): string {
  const fmt = (d: string) => d ? new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
  const na = 'No updates available for this week.'

  const lwTotal = f.lastWeek.codeFix + f.lastWeek.support + f.lastWeek.changeRequest + f.lastWeek.dataIssue + f.lastWeek.backendUpdation
  const mtdTotal = f.monthToDate.codeFix + f.monthToDate.support + f.monthToDate.changeRequest + (f.monthToDate.completedCR ?? 0) + f.monthToDate.dataIssue + f.monthToDate.backendUpdation

  const passCount = f.releaseItems.filter(i => i.status === 'Pass').length
  const passRate = f.releaseItems.length ? Math.round((passCount / f.releaseItems.length) * 100) : 0

  const lines: string[] = []

  // Title
  lines.push(`# ${f.reportTitle || 'Weekly QA Status Report'}`)
  lines.push(`**Project:** ${f.projectName || '—'}  |  **Period:** ${fmt(f.weekStart)} – ${fmt(f.weekEnd)}`)
  if (f.subtitle) lines.push(`\n> ${f.subtitle}`)
  lines.push('\n---')

  // Executive Summary
  lines.push('\n## Executive Summary')
  lines.push(`This report covers QA activities for **${f.projectName || 'the project'}** during the week of **${fmt(f.weekStart)}** to **${fmt(f.weekEnd)}**.`)
  lines.push(`- Support Emails handled: **${f.supportEmails}**`)
  lines.push(`- New Features tested: **${f.newFeatures}**`)
  lines.push(`- Code Fixes tested: **${f.codeFixes}**`)
  if (f.releaseItems.length) lines.push(`- Release test pass rate: **${passRate}%** (${passCount}/${f.releaseItems.length} items passed)`)

  // KPI Summary
  lines.push('\n## Weekly KPI Summary')
  lines.push('| Metric | Value |')
  lines.push('|---|---|')
  lines.push(`| Support Emails | **${f.supportEmails}** |`)
  lines.push(`| New Features | **${f.newFeatures}** |`)
  lines.push(`| Code Fixes Testing | **${f.codeFixes}** |`)

  // Production Issues
  lines.push('\n## Production Issue Analysis')
  lines.push('\n### Last Week')
  lines.push('| Category | Count |')
  lines.push('|---|---|')
  lines.push(`| Code Fix | ${f.lastWeek.codeFix} |`)
  lines.push(`| Support | ${f.lastWeek.support} |`)
  lines.push(`| Change Request | ${f.lastWeek.changeRequest} |`)
  lines.push(`| Data Issue | ${f.lastWeek.dataIssue} |`)
  lines.push(`| Backend Updation | ${f.lastWeek.backendUpdation} |`)
  lines.push(`| **Total** | **${lwTotal}** |`)

  lines.push('\n### Month To Date')
  lines.push('| Category | Count |')
  lines.push('|---|---|')
  lines.push(`| Code Fix | ${f.monthToDate.codeFix} |`)
  lines.push(`| Support | ${f.monthToDate.support} |`)
  lines.push(`| Change Request | ${f.monthToDate.changeRequest} |`)
  lines.push(`| Completed CR | ${f.monthToDate.completedCR ?? 0} |`)
  lines.push(`| Data Issue | ${f.monthToDate.dataIssue} |`)
  lines.push(`| Backend Updation | ${f.monthToDate.backendUpdation} |`)
  lines.push(`| **Total** | **${mtdTotal}** |`)

  // Team Allocation
  lines.push('\n## Team Resource Allocation')
  const hasTeam = f.newFeatureTeam.length || f.supportTeam.length || f.automationTeam.length
  if (!hasTeam) { lines.push(na) } else {
    if (f.newFeatureTeam.length) lines.push(`- **New Feature Testing:** ${f.newFeatureTeam.join(', ')}`)
    if (f.supportTeam.length)    lines.push(`- **Support Team:** ${f.supportTeam.join(', ')}`)
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
  lines.push(`*Report generated on ${new Date().toLocaleString()} by Flux QA*`)

  return lines.join('\n')
}

function validate(form: QAReportForm): string[] {
  const errors: string[] = []
  if (!form.projectName.trim()) errors.push('Project Name is required')
  if (!form.weekStart) errors.push('Week Start date is required')
  if (!form.weekEnd) errors.push('Week End date is required')
  if (form.weekStart && form.weekEnd && form.weekStart > form.weekEnd) errors.push('Week Start must be before Week End')
  return errors
}

export const QAWeeklyReport: React.FC = () => {
  const { form, setGeneratedReport, generatedReport, resetForm, fetchReports } = useQAReportStore()
  const [errors, setErrors] = useState<string[]>([])

  React.useEffect(() => {
    fetchReports()
  }, [])

  const handleGenerate = () => {
    const errs = validate(form)
    setErrors(errs)
    if (errs.length) return
    
    // Save to local storage for the dashboard preview tab to pick up
    localStorage.setItem('current-qa-report-data', JSON.stringify(form))
    setGeneratedReport(buildMarkdown(form))
    
    // Open in a new tab
    window.open(ROUTES.reportPreview, '_blank')
    toast({ title: 'Dashboard Launched!', description: 'Opening the Executive Dashboard in a new tab.' })
  }

  const handleReset = () => {
    if (!confirm('Reset all form data?')) return
    resetForm()
    setErrors([])
    localStorage.removeItem('current-qa-report-data')
    toast({ title: 'Form Reset', description: 'All fields have been cleared.' })
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-6 sm:py-10">
      <CinematicHeading
        title="QA Weekly Report"
        subtitle="Fill in the weekly QA data and generate a professional executive-level report instantly."
        align="left"
      />

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_480px] gap-6 xl:gap-8 items-start">
        {/* ── Left Panel: Input Forms ────────────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <HeaderSection />
          <KPICards />
          <ProductionIssues />
          <TeamAllocation />
          <SupportLog />
          <ReleaseTable />
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
            <FloatingButton onClick={handleGenerate} className="flex-1">
              <FileText className="w-4 h-4 mr-2" /> Launch Executive Dashboard
            </FloatingButton>
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-4 py-3 rounded-full bg-white/5 border border-white/10 text-xs font-bold text-text-secondary hover:text-white hover:bg-white/10 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> Reset
            </button>
          </div>
        </div>

        {/* ── Right Panel: Preview + Widgets ────────────────────────────── */}
        <div className="flex flex-col gap-6">
          <DashboardWidgets />
          <DefectChart />

          {/* Preview placeholder / live preview */}
          <AnimatePresence mode="wait">
            {!generatedReport ? (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center text-center p-12 glass-panel border-dashed min-h-[240px]"
              >
                <div className="w-14 h-14 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <FileText className="w-7 h-7 text-text-muted" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Report Preview</h3>
                <p className="text-text-secondary text-sm">Fill in the form and click Generate Report.</p>
              </motion.div>
            ) : (
              <motion.div key="preview" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <ReportPreview />
              </motion.div>
            )}
          </AnimatePresence>

          <ReportHistory />
        </div>
      </div>
    </motion.div>
  )
}
