import React, { useState, useEffect, useMemo } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useQAReportStore } from '../store'
import { usePermissions } from '@/hooks/usePermissions'
import { Trash2, ExternalLink, Search, Copy, Pencil } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import { createFormSnapshot, getReportDisplayName, isPassStatus } from '../types'
import { SaveReportNameModal, type SaveReportConfirmPayload } from './SaveReportNameModal'

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
  const passCount = releaseItems.filter(i => isPassStatus(i.status)).length

  const slices: PieSlice[] = [
    { label: 'Support Tickets', value: form.supportEmails, color: 'bg-blue-400', hex: '#60a5fa' },
    { label: 'New Features', value: form.newFeatures, color: 'bg-yellow-400', hex: '#facc15' },
    { label: 'Code Fixes', value: form.codeFixes, color: 'bg-purple-400', hex: '#c084fc' },
    { label: 'Reported', value: d.reported, color: 'bg-red-400', hex: '#f87171' },
    { label: 'Open Defects', value: d.open, color: 'bg-orange-400', hex: '#fb923c' },
    { label: 'Closed Defects', value: d.closed, color: 'bg-green-400', hex: '#4ade80' },
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

export const ReportHistory: React.FC<{ onReportLoaded?: (snapshot: string) => void }> = ({ onReportLoaded }) => {
  const { savedReports, deleteReport, saveReport, setGeneratedReport, setForm, historySearch, setHistorySearch, projects, form, fetchReports } = useQAReportStore()
  const { can } = usePermissions()
  const canDelete = can('qa-report', 'can_delete')
  const [page, setPage] = useState(1)
  const PER_PAGE = 5

  const [searchProject, setSearchProject] = useState(form.projectId || '')
  const [localSearchText, setLocalSearchText] = useState(historySearch)
  const [renaming, setRenaming] = useState<typeof savedReports[0] | null>(null)

  useEffect(() => {
    if (form.projectId) {
      setSearchProject(form.projectId)
    }
  }, [form.projectId])

  const filtered = savedReports.filter(r => {
    if (searchProject && r.projectId !== searchProject) return false

    if (historySearch) {
      const q = historySearch.toLowerCase()
      const matchText = [getReportDisplayName(r), r.project, r.week, r.createdBy, r.status].some(v =>
        v?.toLowerCase().includes(q),
      )
      if (!matchText) return false
    }

    return true
  })

  const pages = Math.ceil(filtered.length / PER_PAGE)
  const visible = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  const renameExistingNames = useMemo(() => {
    if (!renaming) return []
    return savedReports
      .filter(r => r.projectId === renaming.projectId && r.id !== renaming.id)
      .map(r => getReportDisplayName(r))
  }, [renaming, savedReports])

  const renameRecentNames = useMemo(() => {
    if (!renaming) return []
    const seen = new Set<string>()
    const names: string[] = []
    for (const r of [...savedReports]
      .filter(r => r.projectId === renaming.projectId)
      .sort((a, b) => new Date(b.generatedDate).getTime() - new Date(a.generatedDate).getTime())) {
      const n = getReportDisplayName(r).trim()
      const key = n.toLowerCase()
      if (!n || seen.has(key)) continue
      seen.add(key)
      names.push(n)
      if (names.length >= 12) break
    }
    return names
  }, [renaming, savedReports])

  // Reset to last valid page if current page exceeds available pages
  useEffect(() => {
    if (page > pages && pages > 0) {
      setPage(pages)
    } else if (pages === 0) {
      setPage(1)
    }
  }, [filtered.length, page, pages])

  const open = (r: typeof savedReports[0]) => {
    setGeneratedReport(r.markdown)
    setForm(r.form)
    toast({ title: 'Report Loaded', description: getReportDisplayName(r) })
    if (onReportLoaded) {
      onReportLoaded(createFormSnapshot(r.form))
    }
  }

  const duplicate = async (r: typeof savedReports[0]) => {
    const base = getReportDisplayName(r)
    const newR = {
      ...r,
      id: crypto.randomUUID(),
      name: `${base} (Copy)`,
      generatedDate: new Date().toISOString(),
    }
    try {
      await saveReport(newR)
      toast({ title: 'Duplicated', description: `Saved as “${newR.name}”.` })
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Duplicate Failed',
        description: e instanceof Error ? e.message : 'Could not duplicate the report.',
      })
    }
  }

  const handleRenameConfirm = async (payload: SaveReportConfirmPayload) => {
    if (!renaming) return
    const target = renaming
    const statusChanged = target.status !== payload.status
    setRenaming(null)
    try {
      await saveReport({ ...target, name: payload.name, status: payload.status })
      toast({
        title: statusChanged ? 'Report Updated' : 'Report Renamed',
        description: statusChanged
          ? `“${payload.name}” marked as ${payload.status}.`
          : `Updated to “${payload.name}”.`,
      })
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: e instanceof Error ? e.message : 'Could not update the report.',
      })
    }
  }

  const handleDelete = async (r: typeof savedReports[0]) => {
    try {
      await deleteReport(r.id)
      toast({ title: 'Report Deleted', description: `“${getReportDisplayName(r)}” removed from history.` })
    } catch (e) {
      toast({
        variant: 'destructive',
        title: 'Delete Failed',
        description: e instanceof Error ? e.message : 'Could not delete the report. Please try again.',
      })
    }
  }

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-4">
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <span className="label-xs">Report History ({savedReports.length})</span>
        </div>

        <div className="flex flex-col gap-2.5">
          {/* Project dropdown */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[10px] text-text-muted font-bold uppercase">Project</label>
            <select
              value={searchProject}
              onChange={e => {
                const val = e.target.value
                setSearchProject(val)
                fetchReports(val || undefined)
              }}
              className="bg-hover border border-border rounded-xl px-3 py-2 text-xs text-text-primary focus:outline-none focus:border-accent/40 w-full"
            >
              <option value="" className="bg-surface text-text-primary">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-surface text-text-primary">{p.projectName}</option>
              ))}
            </select>
          </div>

          {/* Search box + button */}
          <div className="flex flex-col gap-1 text-left">
            <label className="text-[10px] text-text-muted font-bold uppercase">Search</label>
            <div className="flex items-center gap-1.5 w-full">
              <div className="flex items-center gap-1.5 px-3 py-2 bg-hover rounded-xl border border-border flex-1 focus-within:border-accent/40">
                <Search className="w-3.5 h-3.5 text-text-muted" />
                <input
                  className="bg-transparent text-xs text-text-primary focus:outline-none w-full placeholder:text-text-muted"
                  placeholder="Search by name, project, week..."
                  value={localSearchText}
                  onChange={e => setLocalSearchText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      setHistorySearch(localSearchText)
                    }
                  }}
                />
              </div>
              <button
                onClick={() => setHistorySearch(localSearchText)}
                className="px-3.5 py-2 rounded-xl bg-accent-gold text-black text-xs font-bold hover:opacity-90 transition-all shrink-0"
              >
                Search
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {visible.length === 0 && <p className="text-xs text-text-muted">No results.</p>}
        {visible.map(r => {
          const displayName = getReportDisplayName(r)
          const isDraft = r.status === 'Draft'
          return (
            <div key={r.id} className="flex items-center justify-between gap-2 p-3 rounded-2xl bg-hover/20 border border-border hover:border-accent/20 transition-all group">
              <div className="min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <p className="text-sm font-bold text-text-primary truncate" title={displayName}>{displayName}</p>
                  <span
                    className={cn(
                      'shrink-0 px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider',
                      isDraft
                        ? 'bg-amber-500/15 text-amber-500'
                        : 'bg-green-500/15 text-green-500',
                    )}
                  >
                    {r.status}
                  </span>
                </div>
                <p className="text-[11px] text-text-muted truncate">
                  {r.project}
                  {r.week && r.name ? ` · ${r.week}` : ''}
                  {' · '}
                  {new Date(r.generatedDate).toLocaleDateString()} at {new Date(r.generatedDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => open(r)} className="p-1.5 rounded-lg hover:bg-hover text-text-muted hover:text-accent-gold transition-all" title="Open"><ExternalLink className="w-3.5 h-3.5" /></button>
                <button onClick={() => setRenaming(r)} className="p-1.5 rounded-lg hover:bg-hover text-text-muted hover:text-text-primary transition-all" title="Edit name & status"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => duplicate(r)} className="p-1.5 rounded-lg hover:bg-hover text-text-muted hover:text-text-primary transition-all" title="Duplicate"><Copy className="w-3.5 h-3.5" /></button>
                {canDelete && <button onClick={() => handleDelete(r)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
          )
        })}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: pages }, (_, i) => (
            <button key={i} onClick={() => setPage(i + 1)} className={cn('w-7 h-7 rounded-lg text-xs font-bold transition-all', page === i + 1 ? 'bg-accent-gold text-background' : 'bg-hover text-text-muted hover:text-text-primary')}>
              {i + 1}
            </button>
          ))}
        </div>
      )}

      <SaveReportNameModal
        open={!!renaming}
        mode="rename"
        initialName={renaming ? getReportDisplayName(renaming) : ''}
        initialStatus={renaming?.status || 'Final'}
        existingNames={renameExistingNames}
        recentNames={renameRecentNames}
        ignoreName={renaming ? getReportDisplayName(renaming) : undefined}
        confirmLabel="Save changes"
        title="Edit report"
        description="Update the name or change Draft / Final status."
        onCancel={() => setRenaming(null)}
        onConfirm={handleRenameConfirm}
      />
    </GlassCard>
  )
}
