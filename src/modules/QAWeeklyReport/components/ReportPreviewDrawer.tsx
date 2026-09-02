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
    text-align: justify;
    hyphens: auto;
  }
  .drw-h1 {
    font-size: 1.4rem;
    font-weight: 800;
    color: var(--text-primary);
    margin: 1.2rem 0 0.6rem;
    line-height: 1.25;
    letter-spacing: -0.02em;
  }
  .drw-h2 {
    font-size: 1.05rem;
    font-weight: 700;
    color: var(--accent);
    margin: 1.4rem 0 0.5rem;
    padding-bottom: 0.4rem;
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
    margin: 0.8rem 0;
    font-size: 0.78rem;
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border);
  }
  .drw-th {
    padding: 0.5rem 0.7rem;
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
    padding: 0.45rem 0.7rem;
    border-bottom: 1px solid var(--divider);
    color: var(--text-primary);
    vertical-align: top;
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

      await useQAReportStore.getState().fetchReports(form.projectId)

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
      width={580}
      labelledBy="report-preview-title"
      className="flex flex-col shadow-2xl"
      style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
    >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 shrink-0 pl-7"
              style={{ borderBottom: '1px solid var(--border)' }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}
                >
                  <Eye className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <h2 id="report-preview-title" className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Report Preview</h2>
                  <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Review and save before launching</p>
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

            {/* Zoom Controls */}
            <div
              className="flex items-center justify-between px-6 py-2.5 shrink-0"
              style={{ borderBottom: '1px solid var(--border)', background: 'rgba(0,0,0,0.15)' }}
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
            <div className="flex-1 overflow-y-auto px-6 py-5">
              <style>{drawerStyles}</style>
              <div
                className="drw-content"
                style={{ fontSize: `${zoomLevel}%` }}
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(mdToHtml(markdown)) }}
              />
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
