import React, { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useQAReportStore } from '../store'
import type { ReleaseItem } from '../types'
import { Plus, Trash2, Copy } from 'lucide-react'
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

export const ReleaseTable: React.FC = () => {
  const { form, setForm } = useQAReportStore()
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
