import React, { useState, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { GlassCard } from '@/components/ui/GlassCard'
import { FloatingButton } from '@/components/ui/FloatingButton'
import { useQAReportStore } from '../store'
import { useAppStore } from '@/store/useAppStore'
import { toast } from '@/hooks/use-toast'
import type { QAReportForm } from '../types'
import {
  Printer, Maximize2, Minimize2,
  Code, Save, CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Minimal markdown → HTML renderer (no external dep)
function mdToHtml(md: string): string {
  const lines = md.split('\n')
  const out: string[] = []
  let inTable = false

  for (const raw of lines) {
    const line = raw

    // Headings
    if (/^### /.test(line)) { inTable = false; out.push(`<h3 class="md-h3">${line.slice(4)}</h3>`); continue }
    if (/^## /.test(line))  { inTable = false; out.push(`<h2 class="md-h2">${line.slice(3)}</h2>`); continue }
    if (/^# /.test(line))   { inTable = false; out.push(`<h1 class="md-h1">${line.slice(2)}</h1>`); continue }

    // HR
    if (/^---$/.test(line)) { inTable = false; out.push('<hr class="md-hr" />'); continue }

    // Table rows
    if (/^\|/.test(line)) {
      const cells = line.split('|').slice(1, -1)
      if (cells.every(c => /^[-: ]+$/.test(c.trim()))) continue // separator row
      const row = '<tr>' + cells.map(c => `<td class="md-td">${applyInline(c.trim())}</td>`).join('') + '</tr>'
      if (!inTable) { out.push('<table class="md-table"><tbody>'); inTable = true }
      out.push(row)
      continue
    }
    if (inTable) { out.push('</tbody></table>'); inTable = false }

    // List items
    if (/^[*-] /.test(line)) { out.push(`<li class="md-li">${applyInline(line.slice(2))}</li>`); continue }
    if (/^\d+\. /.test(line)) { out.push(`<li class="md-li">${applyInline(line.replace(/^\d+\. /, ''))}</li>`); continue }

    // Blank line
    if (!line.trim()) continue

    // Paragraph
    out.push(`<p class="md-p">${applyInline(line)}</p>`)
  }

  if (inTable) out.push('</tbody></table>')
  return out.join('\n')
}

function applyInline(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
}

const mdStyles = `
  .md-h1{font-size:1.6rem;font-weight:800;color:var(--text-primary);margin:1.2rem 0 0.6rem;line-height:1.2}
  .md-h2{font-size:1.2rem;font-weight:700;color:var(--accent);margin:1.2rem 0 0.4rem;padding-bottom:0.3rem;border-bottom:1px solid var(--border)}
  .md-h3{font-size:1rem;font-weight:700;color:var(--text-primary);margin:0.8rem 0 0.3rem}
  .md-p{color:var(--text-secondary);line-height:1.7;margin:0.4rem 0}
  .md-hr{border:none;border-top:1px solid var(--divider);margin:1rem 0}
  .md-table{width:100%;border-collapse:collapse;margin:0.8rem 0;font-size:0.85rem}
  .md-td{padding:0.5rem 0.75rem;border:1px solid var(--border);color:var(--text-primary)}
  .md-ul{list-style:none;padding:0;margin:0.4rem 0}
  .md-li{padding:0.2rem 0 0.2rem 1.2rem;color:var(--text-secondary);position:relative}
  .md-li::before{content:"•";position:absolute;left:0.3rem;color:var(--accent)}
  strong{color:var(--text-primary);font-weight:700}
  em{color:var(--text-secondary);font-style:italic}
`

function downloadBlob(content: string, name: string, type: string) {
  const blob = new Blob([content], { type })
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click()
  URL.revokeObjectURL(a.href)
}

interface ChartSlice { label: string; value: number; hex: string }

function buildPieSVG(slices: ChartSlice[]): string {
  const total = slices.reduce((s, x) => s + x.value, 0)
  const cx = 110, cy = 110, r = 90, ir = 42

  if (total === 0) {
    return `<svg viewBox="0 0 220 220" width="220" height="220" xmlns="http://www.w3.org/2000/svg">
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="40"/>
      <circle cx="${cx}" cy="${cy}" r="${ir}" fill="#111"/>
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="middle" font-size="13" fill="rgba(255,255,255,0.3)">No data</text>
    </svg>`
  }

  let angle = -90
  const paths = slices.filter(s => s.value > 0).map(slice => {
    const deg = (slice.value / total) * 360
    const safe = Math.min(deg, 359.99)
    const a1 = (angle * Math.PI) / 180
    const a2 = ((angle + safe) * Math.PI) / 180
    const x1 = cx + r * Math.cos(a1), y1 = cy + r * Math.sin(a1)
    const x2 = cx + r * Math.cos(a2), y2 = cy + r * Math.sin(a2)
    const large = safe > 180 ? 1 : 0
    const path = `M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large},1 ${x2.toFixed(2)},${y2.toFixed(2)} Z`
    angle += deg
    return `<path d="${path}" fill="${slice.hex}" opacity="0.88"/>`
  }).join('')

  return `<svg viewBox="0 0 220 220" width="220" height="220" xmlns="http://www.w3.org/2000/svg">
    ${paths}
    <circle cx="${cx}" cy="${cy}" r="${ir}" fill="#0f0f14"/>
    <text x="${cx}" y="${cy - 7}" text-anchor="middle" dominant-baseline="middle" font-size="16" font-weight="bold" fill="white">${total}</text>
    <text x="${cx}" y="${cy + 10}" text-anchor="middle" dominant-baseline="middle" font-size="9" fill="rgba(255,255,255,0.45)">Total</text>
  </svg>`
}

function buildMetricsSection(form: QAReportForm): string {
  const d = form.defectsLastWeek
  const slices: ChartSlice[] = [
    { label: 'Support Tickets', value: form.supportEmails, hex: '#60a5fa' },
    { label: 'New Features',    value: form.newFeatures,   hex: '#facc15' },
    { label: 'Code Fixes',      value: form.codeFixes,     hex: '#c084fc' },
    { label: 'Reported',        value: d.reported,         hex: '#f87171' },
    { label: 'Open Defects',    value: d.open,             hex: '#fb923c' },
    { label: 'Closed Defects',  value: d.closed,           hex: '#4ade80' },
  ]
  const total = slices.reduce((s, x) => s + x.value, 0) || 1
  const legend = slices.map(s => `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;padding:4px 0">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="width:10px;height:10px;border-radius:50%;background:${s.hex};flex-shrink:0;display:inline-block"></span>
        <span style="font-size:12px;color:#8B8B8B">${s.label}</span>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:12px;font-weight:700;color:#fff">${s.value}</span>
        <span style="font-size:10px;color:#555;min-width:32px;text-align:right">${Math.round((s.value / total) * 100)}%</span>
      </div>
    </div>`).join('')

  const closedPct = Math.round((d.closed / (d.reported || 1)) * 100)
  const passCount = form.releaseItems.filter(i => i.status === 'Pass').length
  const passTotal = form.releaseItems.length

  return `
  <div style="page-break-inside:avoid;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin:24px 0">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px">
      <span style="font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#D4AF37">Weekly Metrics</span>
      <span style="font-size:11px;font-weight:700;color:#4ade80">${closedPct}% closure rate</span>
    </div>
    <div style="display:flex;align-items:center;gap:28px;flex-wrap:wrap">
      <div style="flex-shrink:0">${buildPieSVG(slices)}</div>
      <div style="flex:1;min-width:180px">${legend}</div>
    </div>
    ${passTotal > 0 ? `
    <div style="margin-top:16px;padding-top:16px;border-top:1px solid rgba(255,255,255,0.08)">
      <div style="display:flex;justify-content:space-between;margin-bottom:6px">
        <span style="font-size:11px;color:#8B8B8B">Release Pass Rate</span>
        <span style="font-size:12px;font-weight:700;color:#4ade80">${passCount}/${passTotal}</span>
      </div>
      <div style="height:6px;background:rgba(255,255,255,0.1);border-radius:4px;overflow:hidden">
        <div style="height:100%;width:${Math.round((passCount / passTotal) * 100)}%;background:#4ade80;border-radius:4px"></div>
      </div>
    </div>` : ''}
  </div>`
}

function buildDefectDistributionSection(form: QAReportForm): string {
  const lw = form.defectsLastWeek
  const mtd = form.defectsMTD
  const bars = [
    { label: 'Reported', lw: lw.reported, mtd: mtd.reported },
    { label: 'Open',     lw: lw.open,     mtd: mtd.open     },
    { label: 'Fixed',    lw: lw.fixed,    mtd: mtd.fixed    },
    { label: 'Closed',   lw: lw.closed,   mtd: mtd.closed   },
  ]
  const maxVal = Math.max(...bars.flatMap(b => [b.lw, b.mtd]), 1)
  const W = 540, H = 200, PAD_L = 36, PAD_B = 32, PAD_T = 16, PAD_R = 16
  const chartW = W - PAD_L - PAD_R
  const chartH = H - PAD_T - PAD_B
  const groupW = chartW / bars.length
  const bw = Math.min(groupW * 0.28, 28)
  const gap = bw * 0.4

  // y-axis labels (5 ticks)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map(t => {
    const val = Math.round(t * maxVal)
    const y = PAD_T + chartH - t * chartH
    return `<line x1="${PAD_L}" y1="${y.toFixed(1)}" x2="${W - PAD_R}" y2="${y.toFixed(1)}" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>
            <text x="${PAD_L - 6}" y="${y.toFixed(1)}" text-anchor="end" dominant-baseline="middle" font-size="8" fill="rgba(255,255,255,0.3)">${val}</text>`
  }).join('')

  let svgBars = ''
  bars.forEach((b, i) => {
    const cx = PAD_L + i * groupW + groupW / 2
    const x1 = cx - gap / 2 - bw
    const x2 = cx + gap / 2
    const h1 = (b.lw / maxVal) * chartH
    const h2 = (b.mtd / maxVal) * chartH
    const y1 = PAD_T + chartH - h1
    const y2 = PAD_T + chartH - h2
    const animId1 = `bar-lw-${i}`
    const animId2 = `bar-mtd-${i}`
    const delay1 = (i * 0.12).toFixed(2)
    const delay2 = (i * 0.12 + 0.08).toFixed(2)

    svgBars += `
      <rect id="${animId1}" x="${x1.toFixed(1)}" y="${(PAD_T + chartH).toFixed(1)}" width="${bw.toFixed(1)}" height="0" rx="3" fill="#facc15" opacity="0.85">
        <animate attributeName="height" from="0" to="${h1.toFixed(1)}" dur="0.7s" begin="${delay1}s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1"/>
        <animate attributeName="y" from="${(PAD_T + chartH).toFixed(1)}" to="${y1.toFixed(1)}" dur="0.7s" begin="${delay1}s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1"/>
      </rect>
      ${b.lw > 0 ? `<text x="${(x1 + bw / 2).toFixed(1)}" y="${(y1 - 5).toFixed(1)}" text-anchor="middle" font-size="8" fill="#facc15" opacity="0">${b.lw}<animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="${(+delay1 + 0.6).toFixed(2)}s" fill="freeze"/></text>` : ''}
      <rect id="${animId2}" x="${x2.toFixed(1)}" y="${(PAD_T + chartH).toFixed(1)}" width="${bw.toFixed(1)}" height="0" rx="3" fill="#60a5fa" opacity="0.85">
        <animate attributeName="height" from="0" to="${h2.toFixed(1)}" dur="0.7s" begin="${delay2}s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1"/>
        <animate attributeName="y" from="${(PAD_T + chartH).toFixed(1)}" to="${y2.toFixed(1)}" dur="0.7s" begin="${delay2}s" fill="freeze" calcMode="spline" keySplines="0.4 0 0.2 1" keyTimes="0;1"/>
      </rect>
      ${b.mtd > 0 ? `<text x="${(x2 + bw / 2).toFixed(1)}" y="${(y2 - 5).toFixed(1)}" text-anchor="middle" font-size="8" fill="#60a5fa" opacity="0">${b.mtd}<animate attributeName="opacity" from="0" to="1" dur="0.3s" begin="${(+delay2 + 0.6).toFixed(2)}s" fill="freeze"/></text>` : ''}
      <text x="${cx.toFixed(1)}" y="${(PAD_T + chartH + 14).toFixed(1)}" text-anchor="middle" font-size="9" fill="rgba(255,255,255,0.45)">${b.label}</text>
    `
  })

  const svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="max-width:${W}px" xmlns="http://www.w3.org/2000/svg">
    ${ticks}
    <line x1="${PAD_L}" y1="${PAD_T}" x2="${PAD_L}" y2="${PAD_T + chartH}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    <line x1="${PAD_L}" y1="${PAD_T + chartH}" x2="${W - PAD_R}" y2="${PAD_T + chartH}" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
    ${svgBars}
  </svg>`

  return `
  <div style="page-break-inside:avoid;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:24px;margin:24px 0">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;flex-wrap:wrap;gap:8px">
      <span style="font-size:11px;font-weight:700;letter-spacing:.15em;text-transform:uppercase;color:#D4AF37">Defect Distribution</span>
      <div style="display:flex;align-items:center;gap:16px">
        <span style="display:flex;align-items:center;gap:6px;font-size:11px;color:#8B8B8B">
          <span style="width:10px;height:10px;border-radius:2px;background:#facc15;display:inline-block"></span>Last Week
        </span>
        <span style="display:flex;align-items:center;gap:6px;font-size:11px;color:#8B8B8B">
          <span style="width:10px;height:10px;border-radius:2px;background:#60a5fa;display:inline-block"></span>Month to Date
        </span>
      </div>
    </div>
    ${svg}
  </div>`
}

function buildFullHTML(bodyContent: string, styles: string, metricsHTML: string, defectHTML: string, title: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title>
<style>
  *{box-sizing:border-box}
  body{background:#0B0B0B;font-family:system-ui,sans-serif;padding:2rem;max-width:960px;margin:auto;color:#F5F5F5}
  @media(max-width:600px){body{padding:1rem}}
  ${styles}
</style></head><body>
${metricsHTML}
${defectHTML}
${bodyContent}
</body></html>`
}

export const ReportPreview: React.FC = () => {
  const { generatedReport, form, saveReport } = useQAReportStore()
  const { profile } = useAppStore()
  const [fullscreen, setFullscreen] = useState(false)
  const [viewRaw, setViewRaw] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (fullscreen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [fullscreen])

  const handlePrint = () => {
    const win = window.open('', '_blank')!
    win.document.write(buildFullHTML(mdToHtml(generatedReport), mdStyles, buildMetricsSection(form), buildDefectDistributionSection(form), form.projectName || 'QA Report'))
    win.document.close(); win.print()
  }

  const handleSave = () => {
    const id = crypto.randomUUID()
    saveReport({
      id, markdown: generatedReport, form,
      week: `${form.weekStart} – ${form.weekEnd}`,
      project: form.projectName,
      projectId: form.projectId,
      generatedDate: new Date().toISOString(),
      createdBy: profile?.full_name || profile?.email || 'Unknown',
      status: 'Final',
    })
    setSaved(true)
    toast({ title: 'Saved!', description: 'Report saved to history.' })
    setTimeout(() => setSaved(false), 3000)
  }

  if (!generatedReport) return null

  const previewContent = (
    <div className={cn('flex flex-col gap-4', fullscreen && 'fixed inset-0 z-50 bg-background p-6 overflow-y-auto')}>
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-green-500/10 border border-green-500/20 text-[10px] font-bold text-green-500 uppercase tracking-widest">Report Ready</div>
          <button onClick={() => setViewRaw(!viewRaw)} className={cn('flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all', viewRaw ? 'bg-accent/10 border-accent/20 text-accent' : 'bg-input border-border text-text-secondary hover:text-text-primary hover:bg-hover')}>
            <Code className="w-3 h-3" /> Raw
          </button>
          <button onClick={() => setFullscreen(!fullscreen)} className="p-2 rounded-xl bg-input border border-border text-text-secondary hover:text-text-primary hover:bg-hover transition-all">
            {fullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handlePrint} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-input border border-border text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-hover transition-all"><Printer className="w-3 h-3" /> Print</button>
          <button onClick={handleSave} className={cn('flex items-center gap-1 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all', saved ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-accent/10 border-accent/20 text-accent hover:bg-accent/20')}>
            {saved ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />} {saved ? 'Saved' : 'Save'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <GlassCard hoverEffect={false} className="min-h-[500px]">
        {viewRaw ? (
          <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono leading-relaxed overflow-auto">{generatedReport}</pre>
        ) : (
          <>
            <style>{mdStyles}</style>
            <div dangerouslySetInnerHTML={{ __html: mdToHtml(generatedReport) }} />
          </>
        )}
      </GlassCard>
    </div>
  )

  if (fullscreen) {
    return createPortal(previewContent, document.body)
  }

  return previewContent
}
