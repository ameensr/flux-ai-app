import React, { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useQAReportStore } from '../store'
import type { ReleaseItem } from '../types'
import { useDailyReportStore } from '@/modules/DailyUpdateReport/store'
import type { ReleaseTestingRecord } from '@/modules/DailyUpdateReport/types'
import { toast } from '@/hooks/use-toast'
import { Plus, Trash2, Copy, Download, Upload } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  'Not Started': 'text-text-muted', 'In Progress': 'text-yellow-400',
  'Pass': 'text-green-400', 'Fail': 'text-red-400', 'Blocked': 'text-orange-400',
}
const PRIORITY_COLORS: Record<string, string> = {
  'Critical': 'text-red-500', 'High': 'text-orange-400', 'Medium': 'text-yellow-400', 'Low': 'text-green-400',
}

const newItem = (): ReleaseItem => ({
  id: crypto.randomUUID(), taskId: '', featureName: '', assignee: '',
  status: 'Not Started', priority: 'Medium', remarks: '',
})

const sel = 'bg-transparent border-none focus:outline-none text-sm text-white w-full'
const cell = 'px-3 py-2 border-b border-white/5'

const mapDailyReleaseToQA = (rows: ReleaseTestingRecord[]): ReleaseItem[] => rows.map(row => ({
  id: crypto.randomUUID(),
  taskId: row.task_id || '',
  featureName: [row.description, row.scope_of_testing_for_smoke ? `Smoke Scope: ${row.scope_of_testing_for_smoke}` : '', row.overall_scope_of_testing ? `Overall Scope: ${row.overall_scope_of_testing}` : ''].filter(Boolean).join(' | '),
  assignee: row.qa || '',
  status: (() => {
    // Preserve exact status from Daily Report if it matches QA Report options
    const dailyStatus = row.smoke_testing_status || ''
    const qaStatusOptions = ['Not Started', 'In Progress', 'Pass', 'Fail', 'Blocked']

    // Check if the daily status matches any QA status (case-insensitive)
    const matchedStatus = qaStatusOptions.find(
      qaStatus => qaStatus.toLowerCase() === dailyStatus.toLowerCase()
    )

    if (matchedStatus) return matchedStatus

    // Fallback: Use keyword matching only if no exact match
    const normalized = dailyStatus.toLowerCase()
    if (['passed', 'pass', 'completed', 'success'].some(v => normalized.includes(v))) return 'Pass'
    if (['blocked', 'blocker'].some(v => normalized.includes(v))) return 'Blocked'
    if (['fail', 'failed', 'failure'].some(v => normalized.includes(v))) return 'Fail'
    if (['in progress', 'progress', 'ongoing', 'working'].some(v => normalized.includes(v))) return 'In Progress'
    return 'Not Started'
  })(),
  priority: 'Medium',
  remarks: [row.scope_of_testing_for_smoke ? `Smoke Scope: ${row.scope_of_testing_for_smoke}` : '', row.overall_scope_of_testing ? `Overall Scope: ${row.overall_scope_of_testing}` : '', row.initial_round_estimation_hrs ? `Initial Est: ${row.initial_round_estimation_hrs}` : '', row.smoke_testing_estimation_hrs ? `Smoke Est: ${row.smoke_testing_estimation_hrs}` : '', row.overall_estimation_hrs ? `Overall Est: ${row.overall_estimation_hrs}` : ''].filter(Boolean).join(' | '),
}))

export const ReleaseTable: React.FC = () => {
  const { form, setForm } = useQAReportStore()
  const { releaseRows: dailyReleaseRows } = useDailyReportStore()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const items = form.releaseItems

  const update = (id: string, patch: Partial<ReleaseItem>) =>
    setForm({ releaseItems: items.map(i => i.id === id ? { ...i, ...patch } : i) })

  const addRow = () => setForm({ releaseItems: [...items, newItem()] })

  const deleteSelected = () => {
    const next = selected.size ? items.filter(i => !selected.has(i.id)) : items.slice(0, -1)
    setForm({ releaseItems: next }); setSelected(new Set())
  }

  const duplicate = () => {
    const dupes = items.filter(i => selected.has(i.id)).map(i => ({ ...i, id: crypto.randomUUID() }))
    setForm({ releaseItems: [...items, ...dupes] })
  }

  const importFromDailyReport = () => {
    if (!dailyReleaseRows.length) {
      toast({ title: 'No daily report data', description: 'Release Testing Status in Daily Update Report is empty.' })
      return
    }

    const imported = mapDailyReleaseToQA(dailyReleaseRows)
    setForm({ releaseItems: [...items, ...imported] })
    toast({ title: 'Imported from Daily Report', description: `${imported.length} row${imported.length === 1 ? '' : 's'} added to Release Testing Status.` })
  }

  const downloadTemplate = () => {
    const content = 'Task ID,Feature Name,Assignee,Status,Priority,Remarks\nRT-001,Feature Name,Alice,Not Started,Medium,Initial validation pending\n'
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'qa-release-template.csv'; a.click()
  }

  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  const passRate = items.length ? Math.round(items.filter(i => i.status === 'Pass').length / items.length * 100) : 0

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="label-xs">Release Testing Status</span>
          {items.length > 0 && (
            <span className="text-[10px] font-bold text-green-400">{passRate}% Pass Rate</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={addRow} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent-gold/10 border border-accent-gold/20 text-xs font-bold text-accent-gold hover:bg-accent-gold/20 transition-all">
            <Plus className="w-3 h-3" /> Add
          </button>
          <button onClick={deleteSelected} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 hover:bg-red-500/20 transition-all">
            <Trash2 className="w-3 h-3" /> Delete
          </button>
          <button onClick={duplicate} disabled={selected.size === 0} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-text-secondary hover:text-white transition-all disabled:opacity-30">
            <Copy className="w-3 h-3" /> Dupe
          </button>
          <button onClick={importFromDailyReport} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-text-secondary hover:text-white transition-all">
            <Upload className="w-3 h-3" /> Import
          </button>
          <button onClick={downloadTemplate} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-text-secondary hover:text-white transition-all">
            <Download className="w-3 h-3" /> Template
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="bg-white/5 text-left">
              <th className="px-3 py-2 w-8"><input type="checkbox" className="accent-accent-gold" onChange={e => setSelected(e.target.checked ? new Set(items.map(i => i.id)) : new Set())} /></th>
              {['Task ID', 'Feature Name', 'Assignee', 'Status', 'Priority', 'Remarks'].map(h => (
                <th key={h} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-text-muted text-xs">No items. Click Add to create one.</td></tr>
            )}
            {items.map(item => (
              <tr key={item.id} className={cn('hover:bg-white/[0.02] transition-colors', selected.has(item.id) && 'bg-accent-gold/5')}>
                <td className={cell}><input type="checkbox" className="accent-accent-gold" checked={selected.has(item.id)} onChange={() => toggleSelect(item.id)} /></td>
                <td className={cell}><input className={sel} value={item.taskId} onChange={e => update(item.id, { taskId: e.target.value })} placeholder="RT-001" /></td>
                <td className={cell}><input className={sel} value={item.featureName} onChange={e => update(item.id, { featureName: e.target.value })} placeholder="Feature name" /></td>
                <td className={cell}><input className={sel} value={item.assignee} onChange={e => update(item.id, { assignee: e.target.value })} placeholder="Name" /></td>
                <td className={cell}>
                  <select className={`${sel} field-input py-0.5 px-1 text-xs ${STATUS_COLORS[item.status]}`} value={item.status} onChange={e => update(item.id, { status: e.target.value as any })}>
                    {['Not Started', 'In Progress', 'Pass', 'Fail', 'Blocked'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className={cell}>
                  <select className={`${sel} field-input py-0.5 px-1 text-xs ${PRIORITY_COLORS[item.priority]}`} value={item.priority} onChange={e => update(item.id, { priority: e.target.value as any })}>
                    {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </td>
                <td className={cell}><input className={sel} value={item.remarks} onChange={e => update(item.id, { remarks: e.target.value })} placeholder="Remarks" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-text-muted">{items.length} item{items.length !== 1 ? 's' : ''}</p>
    </GlassCard>
  )
}
