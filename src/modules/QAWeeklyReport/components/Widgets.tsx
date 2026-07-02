import React, { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useQAReportStore } from '../store'
import { Trash2, ExternalLink, Search, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'

// ── Pie Chart ─────────────────────────────────────────────────────────────────

interface PieSlice { label: string; value: number; color: string; hex: string }

function PieChart({ slices }: { slices: PieSlice[] }) {
  const total = slices.reduce((s, x) => s + x.value, 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center w-full h-full">
        <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="18" />
      </div>
    )
  }

  const [hovered, setHovered] = useState<number | null>(null)
  let angle = -90
  const paths = slices.map((slice, i) => {
    const deg = (slice.value / total) * 360
    const start = angle
    angle += deg
    const r = 38
    const cx = 50, cy = 50
    const a1 = (start * Math.PI) / 180
    const a2 = ((start + deg) * Math.PI) / 180
    const x1 = cx + r * Math.cos(a1)
    const y1 = cy + r * Math.sin(a1)
    const x2 = cx + r * Math.cos(a2)
    const y2 = cy + r * Math.sin(a2)
    const large = deg > 180 ? 1 : 0
    // midpoint for tooltip
    const midA = ((start + deg / 2) * Math.PI) / 180
    const tx = cx + (r * 0.65) * Math.cos(midA)
    const ty = cy + (r * 0.65) * Math.sin(midA)
    const isHovered = hovered === i
    const scale = isHovered ? 1.06 : 1
    return (
      <g key={slice.label}
        style={{ transformOrigin: '50px 50px', transform: `scale(${scale})`, transition: 'transform 0.2s' }}
        onMouseEnter={() => setHovered(i)}
        onMouseLeave={() => setHovered(null)}
      >
        <path
          d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`}
          fill={slice.hex}
          opacity={hovered !== null && !isHovered ? 0.45 : 0.9}
          style={{ transition: 'opacity 0.2s' }}
        />
        {isHovered && (
          <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle"
            fontSize="6" fontWeight="bold" fill="white" style={{ pointerEvents: 'none' }}>
            {Math.round((slice.value / total) * 100)}%
          </text>
        )}
      </g>
    )
  })

  const active = hovered !== null ? slices[hovered] : null

  return (
    <div className="relative flex items-center justify-center">
      <svg viewBox="0 0 100 100" className="w-36 h-36 drop-shadow-lg">
        {paths}
        <circle cx="50" cy="50" r="18" fill="rgba(15,15,20,0.85)" />
        {active ? (
          <>
            <text x="50" y="47" textAnchor="middle" fontSize="8" fontWeight="bold" fill="white">{active.value}</text>
            <text x="50" y="56" textAnchor="middle" fontSize="4.5" fill="rgba(255,255,255,0.55)">{active.label.split(' ')[0]}</text>
          </>
        ) : (
          <>
            <text x="50" y="47" textAnchor="middle" fontSize="9" fontWeight="bold" fill="white">{total}</text>
            <text x="50" y="56" textAnchor="middle" fontSize="4.5" fill="rgba(255,255,255,0.5)">Total</text>
          </>
        )}
      </svg>
    </div>
  )
}

// ── Dashboard Widgets ─────────────────────────────────────────────────────────

export const DashboardWidgets: React.FC = () => {
  const { form } = useQAReportStore()
  const { defectsLastWeek: d, releaseItems } = form
  const total = d.reported || 1
  const closedPct = Math.round((d.closed / total) * 100)
  const passCount = releaseItems.filter(i => i.status === 'Pass').length

  const slices: PieSlice[] = [
    { label: 'Support Tickets', value: form.supportEmails, color: 'bg-blue-400',   hex: '#60a5fa' },
    { label: 'New Features',    value: form.newFeatures,   color: 'bg-yellow-400', hex: '#facc15' },
    { label: 'Code Fixes',      value: form.codeFixes,     color: 'bg-purple-400', hex: '#c084fc' },
    { label: 'Reported',        value: d.reported,         color: 'bg-red-400',    hex: '#f87171' },
    { label: 'Open Defects',    value: d.open,             color: 'bg-orange-400', hex: '#fb923c' },
    { label: 'Closed Defects',  value: d.closed,           color: 'bg-green-400',  hex: '#4ade80' },
  ]

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="label-xs">Weekly Metrics</span>
        <span className="text-[11px] font-bold text-green-400">{closedPct}% closure rate</span>
      </div>

      <div className="flex items-center gap-4">
        <PieChart slices={slices} />
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          {slices.map(s => (
            <div key={s.label} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <span className={cn('w-2 h-2 rounded-full shrink-0', s.color)} />
                <span className="text-[11px] text-text-muted truncate">{s.label}</span>
              </div>
              <span className="text-xs font-bold text-white shrink-0">{s.value}</span>
            </div>
          ))}
        </div>
      </div>

      {releaseItems.length > 0 && (
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] text-text-muted">Release Pass Rate</span>
            <span className="text-sm font-bold text-green-400">{passCount}/{releaseItems.length}</span>
          </div>
          <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full transition-all duration-700"
              style={{ width: `${releaseItems.length ? Math.round((passCount / releaseItems.length) * 100) : 0}%` }} />
          </div>
        </div>
      )}
    </GlassCard>
  )
}

// ── Mini Bar Chart ────────────────────────────────────────────────────────────

export const DefectChart: React.FC = () => {
  const { form } = useQAReportStore()
  const { defectsLastWeek: lw, defectsMTD: mtd } = form

  const bars = [
    { label: 'Rep', lw: lw.reported, mtd: mtd.reported },
    { label: 'Open', lw: lw.open, mtd: mtd.open },
    { label: 'Fix', lw: lw.fixed, mtd: mtd.fixed },
    { label: 'Cls', lw: lw.closed, mtd: mtd.closed },
  ]
  const maxVal = Math.max(...bars.flatMap(b => [b.lw, b.mtd]), 1)

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="label-xs">Defect Distribution</span>
        <div className="flex items-center gap-3 text-[10px]">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-accent-gold inline-block" /> Last Wk</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-blue-400 inline-block" /> MTD</span>
        </div>
      </div>
      <div className="flex items-end gap-4 h-28">
        {bars.map(b => (
          <div key={b.label} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex items-end gap-1 h-20">
              <div className="flex-1 bg-accent-gold/70 rounded-t-sm transition-all duration-700" style={{ height: `${(b.lw / maxVal) * 100}%` }} />
              <div className="flex-1 bg-blue-400/70 rounded-t-sm transition-all duration-700" style={{ height: `${(b.mtd / maxVal) * 100}%` }} />
            </div>
            <span className="text-[10px] text-text-muted">{b.label}</span>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}

// ── Report History ────────────────────────────────────────────────────────────

export const ReportHistory: React.FC = () => {
  const { savedReports, deleteReport, setGeneratedReport, setForm, historySearch, setHistorySearch } = useQAReportStore()
  const [page, setPage] = useState(1)
  const PER_PAGE = 5

  const filtered = savedReports.filter(r =>
    [r.project, r.week, r.createdBy].some(v => v?.toLowerCase().includes(historySearch.toLowerCase()))
  )
  const pages = Math.ceil(filtered.length / PER_PAGE)
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const open = (r: typeof savedReports[0]) => {
    setGeneratedReport(r.markdown)
    setForm(r.form)
    toast({ title: 'Report Loaded', description: `${r.project} — ${r.week}` })
  }

  const duplicate = (r: typeof savedReports[0]) => {
    const newR = { ...r, id: crypto.randomUUID(), generatedDate: new Date().toISOString() }
    useQAReportStore.getState().saveReport(newR)
    toast({ title: 'Duplicated', description: 'Report duplicated in history.' })
  }

  if (savedReports.length === 0) return null

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="label-xs">Report History ({savedReports.length})</span>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
          <Search className="w-3 h-3 text-text-muted" />
          <input className="bg-transparent text-xs text-white focus:outline-none w-28 placeholder:text-text-muted" placeholder="Search..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {visible.length === 0 && <p className="text-xs text-text-muted">No results.</p>}
        {visible.map(r => (
          <div key={r.id} className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all group">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">{r.project}</p>
              <p className="text-[11px] text-text-muted">{r.week} · {new Date(r.generatedDate).toLocaleDateString()}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => open(r)} className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-accent-gold transition-all" title="Open"><ExternalLink className="w-3.5 h-3.5" /></button>
              <button onClick={() => duplicate(r)} className="p-1.5 rounded-lg hover:bg-white/10 text-text-muted hover:text-white transition-all" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
              <button onClick={() => deleteReport(r.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ))}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} className={cn('w-7 h-7 rounded-lg text-xs font-bold transition-all', page === i + 1 ? 'bg-accent-gold text-background' : 'bg-white/5 text-text-muted hover:text-white')}>
              {i + 1}
            </button>
          ))}
        </div>
      )}
    </GlassCard>
  )
}
