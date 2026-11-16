import React, { useMemo, useState } from 'react'
import DOMPurify from 'dompurify'
import { useQAReportStore } from '../store'
import { useAppStore } from '@/store/useAppStore'
import { toast } from '@/hooks/use-toast'
import { X, Save, CheckCircle2, Eye, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { GestureSheet } from '@/components/ui/GestureSheet'
import { defaultReportName, findMatchingWeekReport, getReportDisplayName } from '../types'
import { SaveReportNameModal, type SaveReportConfirmPayload } from './SaveReportNameModal'

// Minimal markdown → HTML for the drawer preview
function mdToHtml(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let inTable = false

  for (const raw of lines) {
    const line = raw
    if (/^### /.test(line)) { inTable = false; out.push(`<h3 class="drw-h3">${line.slice(4)}</h3>`); continue }
    if (/^## /.test(line)) { inTable = false; out.push(`<h2 class="drw-h2">${line.slice(3)}</h2>`); continue }
    if (/^# /.test(line)) { inTable = false; out.push(`<h1 class="drw-h1">${line.slice(2)}</h1>`); continue }
    if (/^---$/.test(line)) { inTable = false; out.push('<hr class="drw-hr" />'); continue }
    if (/^\|/.test(line)) {
      const cells = line.split('|').slice(1, -1)
      if (cells.every(c => /^[-: ]+$/.test(c.trim()))) continue
      const isFirstDataRow = !inTable
      const tag = isFirstDataRow ? 'th' : 'td'
      const row = '<tr>' + cells.map(c => `<${tag} class="drw-${tag}">${applyInline(c.trim())}</${tag}>`).join('') + '</tr>'
      if (!inTable) { out.push('<table class="drw-table"><thead>'); inTable = true; out.push(row); out.push('</thead><tbody>'); continue }
      out.push(row)
      continue
    }
    if (inTable) { out.push('</tbody></table>'); inTable = false }
    if (/^[*-] /.test(line)) { out.push(`<li class="drw-li">${applyInline(line.slice(2))}</li>`); continue }
    if (/^\d+\. /.test(line)) { out.push(`<li class="drw-li">${applyInline(line.replace(/^\d+\. /, ''))}</li>`); continue }
    if (/^> /.test(line)) { out.push(`<blockquote class="drw-bq">${applyInline(line.slice(2))}</blockquote>`); continue }
    if (!line.trim()) continue
    out.push(`<p class="drw-p">${applyInline(line)}</p>`)
  }
  if (inTable) out.push('</tbody></table>')
  return out.join('\n')
}

function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong class="drw-strong">$1</strong>')
    .replace(/\*(.+?)\*/g, '<em class="drw-em">$1</em>')
}

// Theme-aware styles using CSS variables
const drawerStyles = `
  .drw-content {
    font-family: system-ui, -apple-system, sans-serif;
    line-height: 1.6;
    text-align: left;
    overflow-wrap: anywhere;
  }
  .drw-h1 {
    font-size: 1.8rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 0 0 0.8rem;
    line-height: 1.25;
    letter-spacing: -0.02em;
  }
  .drw-h2 {
    font-size: 1.1rem;
    font-weight: 700;
    color: var(--accent);
    margin: 2rem 0 0.8rem;
    padding: 0.5rem 0 0.75rem;
    border-bottom: 1px solid var(--border);
  }
  .drw-h3 {
    font-size: 0.92rem;
    font-weight: 700;
    color: var(--text-primary);
    margin: 1rem 0 0.3rem;
  }
  .drw-p {
    color: var(--text-secondary);
    line-height: 1.7;
    margin: 0.4rem 0;
    font-size: 0.84rem;
  }
  .drw-bq {
    border-left: 3px solid var(--accent);
    padding: 0.4rem 0.8rem;
    margin: 0.6rem 0;
    color: var(--text-secondary);
    font-size: 0.84rem;
    font-style: italic;
    background: var(--hover);
    border-radius: 0 6px 6px 0;
  }
  .drw-hr {
    border: none;
    border-top: 1px solid var(--divider);
    margin: 1rem 0;
  }
  .drw-table {
    width: 100%;
    border-collapse: collapse;
    margin: 1rem 0 1.5rem;
    font-size: 0.78rem;
    display: block;
    overflow-x: auto;
    border: 1px solid var(--border);
  }
  .drw-th {
    padding: 0.7rem 0.85rem;
    text-align: left;
    font-weight: 700;
    font-size: 0.72rem;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--text-muted);
    background: var(--hover);
    border-bottom: 1px solid var(--border);
  }
  .drw-td {
    padding: 0.65rem 0.85rem;
    border-bottom: 1px solid var(--divider);
    color: var(--text-primary);
    vertical-align: top;
    max-width: 22rem;
  }
  .drw-table tbody tr:last-child .drw-td {
    border-bottom: none;
  }
  .drw-table tbody tr:hover {
    background: var(--hover);
  }
  .drw-li {
    padding: 0.2rem 0 0.2rem 1.2rem;
    color: var(--text-secondary);
    position: relative;
    font-size: 0.84rem;
    line-height: 1.6;
  }
  .drw-li::before {
    content: "";
    position: absolute;
    left: 0.3rem;
    top: 0.7rem;
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: var(--accent);
  }
  .drw-strong {
    color: var(--text-primary);
    font-weight: 700;
  }
  .drw-em {
    color: var(--text-muted);
    font-style: italic;
  }
  .drw-content > :first-child { margin-top: 0; }
`

interface ReportPreviewDrawerProps {
  open: boolean
  onClose: () => void
  markdown: string
  onSaved: () => void
}

export const ReportPreviewDrawer: React.FC<ReportPreviewDrawerProps> = ({
  open,
  onClose,
  markdown,
  onSaved,
}) => {
  const { form, saveReport, savedReports } = useQAReportStore()
  const { profile } = useAppStore()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedName, setSavedName] = useState<string | null>(null)
  const [nameModalOpen, setNameModalOpen] = useState(false)
  const [zoomLevel, setZoomLevel] = useState(100)
  const [recordPage, setRecordPage] = useState(0)
  const previewHtml = useMemo(() => open ? DOMPurify.sanitize(mdToHtml(markdown)) : '', [open, markdown])
  const taskRecords: Record<string, unknown>[] = Array.isArray(form.taskWiseStatus?.allRecords) ? form.taskWiseStatus.allRecords : []
  const taskRecordColumns = useMemo(() => {
    const detected: string[] = Array.isArray(form.taskWiseStatus?.detectedColumns) ? form.taskWiseStatus.detectedColumns : []
    return [...new Set([...detected, ...taskRecords.flatMap(row => Object.keys(row || {}))])]
  }, [form.taskWiseStatus])
  const recordPageCount = Math.max(1, Math.ceil(taskRecords.length / 50))
  const currentRecordPage = Math.min(recordPage, recordPageCount - 1)

  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 10, 150))
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 10, 70))
  const handleZoomReset = () => setZoomLevel(100)

  const suggestedName = useMemo(
    () => defaultReportName(form),
    [form.projectName, form.reportTitle, form.weekStart, form.weekEnd],
  )

  const projectReports = useMemo(
    () => savedReports.filter(r => r.projectId === form.projectId),
    [savedReports, form.projectId],
  )

  const existingNames = useMemo(
    () => projectReports.map(r => getReportDisplayName(r)).filter(Boolean),
    [projectReports],
  )

  const recentNames = useMemo(() => {
    const seen = new Set<string>()
    const names: string[] = []
    for (const r of [...projectReports].sort(
      (a, b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime(),
    )) {
      const n = getReportDisplayName(r).trim()
      const key = n.toLowerCase()
      if (!n || seen.has(key)) continue
      seen.add(key)
      names.push(n)
      if (names.length >= 12) break
    }
    return names
  }, [projectReports])

  const matchingExisting = useMemo(() => {
    const match = findMatchingWeekReport(savedReports, form.projectId, form.weekStart, form.weekEnd)
    if (!match) return null
    return {
      id: match.id,
      name: getReportDisplayName(match),
      status: match.status,
      week: match.week,
      generatedDate: match.generatedDate,
    }
  }, [savedReports, form.projectId, form.weekStart, form.weekEnd])

  const handleConfirmName = async (payload: SaveReportConfirmPayload) => {
    setNameModalOpen(false)
    setSaving(true)
    try {
      const isUpdate = payload.saveMode === 'update' && !!payload.existingId
      const id = isUpdate ? payload.existingId! : crypto.randomUUID()
      await saveReport({
        id,
        name: payload.name,
        markdown,
        form,
        week: `${form.weekStart} – ${form.weekEnd}`,
        project: form.projectName,
        projectId: form.projectId,
        generatedDate: new Date().toISOString(),
        createdBy: profile?.full_name || profile?.email || 'Unknown',
        status: payload.status,
      })

      setSaved(true)
      setSavedName(payload.name)
      onSaved()
      toast({
        title: isUpdate ? 'Report Updated' : payload.status === 'Draft' ? 'Draft Saved' : 'Report Saved Successfully',
        description: isUpdate
          ? `Updated “${payload.name}” as ${payload.status}.`
          : `Saved as “${payload.name}” (${payload.status}).${payload.status === 'Final' ? ' Ready to launch the dashboard.' : ''}`,
      })
    } catch (error) {
      console.error('Save error:', error)
      const errorMessage = error instanceof Error ? error.message : 'Could not save report. Please try again.'
      toast({
        variant: 'destructive',
        title: 'Save Failed',
        description: errorMessage
      })
    } finally {
      setSaving(false)
    }
  }

  const handleClose = () => {
    setSaved(false)
    setSavedName(null)
    setNameModalOpen(false)
    onClose()
  }

  const drawerContent = (
    <GestureSheet
      open={open}
      onClose={handleClose}
      width={760}
      labelledBy="report-preview-title"
      className="flex flex-col shadow-2xl"
      style={{ background: 'var(--surface-secondary)', borderLeft: '1px solid var(--border)' }}
    >
            {/* Header */}
            <div
              className="relative shrink-0 overflow-hidden px-6 py-5 sm:px-8"
              style={{ borderBottom: '1px solid var(--border)', background: 'linear-gradient(125deg, color-mix(in srgb, var(--accent) 13%, var(--surface)) 0%, var(--surface) 70%)' }}
            >
              <div className="pointer-events-none absolute -right-12 -top-24 h-56 w-56 rounded-full blur-3xl" style={{ background: 'color-mix(in srgb, var(--accent) 18%, transparent)' }} />
              <div className="relative flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm"
                  style={{ background: 'color-mix(in srgb, var(--accent) 16%, var(--surface))', border: '1px solid color-mix(in srgb, var(--accent) 30%, var(--border))' }}
                >
                  <Eye className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.2em]" style={{ color: 'var(--accent)' }}>QA weekly report</p>
                  <h2 id="report-preview-title" className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)' }}>Report Preview</h2>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Verify the complete report before saving</p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 rounded-xl pressable"
                style={{
                  background: 'var(--hover)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-muted)',
                }}
                aria-label="Close preview"
              >
                <X className="w-4 h-4" />
              </button>
              </div>
              <div className="relative mt-5 flex flex-wrap gap-2 text-[11px] font-semibold">
                <span className="rounded-full px-3 py-1.5" style={{ background: 'var(--hover)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>{form.projectName || 'Project not selected'}</span>
                <span className="rounded-full px-3 py-1.5" style={{ background: 'var(--hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>{form.weekStart || 'Start date'} → {form.weekEnd || 'End date'}</span>
                <span className="rounded-full px-3 py-1.5" style={{ background: saved ? 'rgba(34,197,94,0.12)' : 'var(--hover)', color: saved ? '#22c55e' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>{saved ? 'Saved' : 'Ready to verify'}</span>
              </div>
            </div>

            {/* Zoom Controls */}
            <div
              className="flex items-center justify-between px-6 py-2.5 shrink-0"
              style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}
            >
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Font Size
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleZoomOut}
                  disabled={zoomLevel <= 70}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
                  style={{ 
                    background: 'var(--hover)', 
                    border: '1px solid var(--border)',
                    cursor: zoomLevel <= 70 ? 'not-allowed' : 'pointer'
                  }}
                  aria-label="Decrease font size"
                >
                  <ZoomOut className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </button>
                <div
                  className="px-3 py-1.5 rounded-lg text-xs font-bold min-w-[3.5rem] text-center"
                  style={{ 
                    background: 'var(--hover)', 
                    border: '1px solid var(--border)',
                    color: 'var(--text-primary)' 
                  }}
                >
                  {zoomLevel}%
                </div>
                <button
                  onClick={handleZoomIn}
                  disabled={zoomLevel >= 150}
                  className="w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:scale-105"
                  style={{ 
                    background: 'var(--hover)', 
                    border: '1px solid var(--border)',
                    cursor: zoomLevel >= 150 ? 'not-allowed' : 'pointer'
                  }}
                  aria-label="Increase font size"
                >
                  <ZoomIn className="w-4 h-4" style={{ color: 'var(--text-secondary)' }} />
                </button>
                {zoomLevel !== 100 && (
                  <button
                    onClick={handleZoomReset}
                    className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:scale-105 ml-1"
                    style={{ 
                      background: 'rgba(99, 102, 241, 0.15)', 
                      border: '1px solid rgba(99, 102, 241, 0.3)' 
                    }}
                    aria-label="Reset to default size"
                  >
                    <RotateCcw className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </button>
                )}
              </div>
            </div>

            {/* Content - scrollable */}
            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-7">
              <style>{drawerStyles}</style>
              <div
                className="drw-content mx-auto max-w-3xl rounded-2xl border p-5 shadow-sm sm:p-8"
                style={{ fontSize: `${zoomLevel}%`, background: 'var(--surface)', borderColor: 'var(--border)' }}
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
              {taskRecords.length > 0 && (
                <details className="mx-auto mt-4 max-w-3xl rounded-2xl border p-5 shadow-sm" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
                  <summary className="cursor-pointer text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    Inspect imported task records ({taskRecords.length})
                  </summary>
                  <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>All uploaded task rows are available here, 50 at a time.</p>
                  <div className="mt-4 overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border)' }}>
                    <table className="min-w-full text-xs" style={{ color: 'var(--text-primary)' }}>
                      <thead style={{ background: 'var(--hover)' }}><tr>{taskRecordColumns.map(column => <th key={column} className="whitespace-nowrap px-3 py-2 text-left font-bold">{column}</th>)}</tr></thead>
                      <tbody>{taskRecords.slice(currentRecordPage * 50, (currentRecordPage + 1) * 50).map((row, index) => (
                        <tr key={currentRecordPage * 50 + index} className="border-t" style={{ borderColor: 'var(--divider)' }}>
                          {taskRecordColumns.map(column => <td key={column} className="max-w-72 px-3 py-2 align-top">{String(row?.[column] ?? '')}</td>)}
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                  {recordPageCount > 1 && (
                    <div className="mt-3 flex items-center justify-between gap-3 text-xs" style={{ color: 'var(--text-muted)' }}>
                      <button type="button" onClick={() => setRecordPage(Math.max(0, currentRecordPage - 1))} disabled={currentRecordPage === 0} className="rounded-lg border px-3 py-1.5 disabled:opacity-40" style={{ borderColor: 'var(--border)' }}>Previous</button>
                      <span>Page {currentRecordPage + 1} of {recordPageCount}</span>
                      <button type="button" onClick={() => setRecordPage(Math.min(recordPageCount - 1, currentRecordPage + 1))} disabled={currentRecordPage >= recordPageCount - 1} className="rounded-lg border px-3 py-1.5 disabled:opacity-40" style={{ borderColor: 'var(--border)' }}>Next</button>
                    </div>
                  )}
                </details>
              )}
            </div>

            {/* Footer Actions */}
            <div
              className="shrink-0 px-6 py-4 flex flex-col gap-3"
              style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-secondary)' }}
            >
              {saved && (
                <div className="px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                  <p className="text-xs font-bold text-green-500 mb-1">✓ Report Saved to History</p>
                  {savedName && (
                    <p className="text-[11px] font-semibold text-green-500/90 mb-0.5 truncate" title={savedName}>
                      {savedName}
                    </p>
                  )}
                  <p className="text-[10px] text-green-500/70">You can now close this and launch the Executive Dashboard</p>
                </div>
              )}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setNameModalOpen(true)}
                  disabled={saving || saved}
                  className={cn(
                    'flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold transition-all',
                    saved && 'cursor-not-allowed opacity-50',
                    saving && 'opacity-60 cursor-wait'
                  )}
                  style={{
                    background: saved ? 'rgba(34,197,94,0.1)' : 'var(--accent)',
                    border: saved ? '1px solid rgba(34,197,94,0.3)' : '1px solid var(--accent)',
                    color: saved ? '#22c55e' : '#000',
                  }}
                >
                  {saved ? (
                    <><CheckCircle2 className="w-4 h-4" /> Saved</>
                  ) : saving ? (
                    <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: '#000' }} /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Save Report</>
                  )}
                </button>
                <button
                  onClick={handleClose}
                  className="px-5 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: 'var(--hover)',
                    border: '1px solid var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Close
                </button>
              </div>
            </div>
    </GestureSheet>
  )

  return (
    <>
      {drawerContent}
      <SaveReportNameModal
        open={nameModalOpen}
        mode="save"
        initialName={suggestedName}
        existingNames={existingNames}
        recentNames={recentNames}
        matchingExisting={matchingExisting}
        onCancel={() => setNameModalOpen(false)}
        onConfirm={handleConfirmName}
      />
    </>
  )
}
