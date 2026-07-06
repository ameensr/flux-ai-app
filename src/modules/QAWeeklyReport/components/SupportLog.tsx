import React, { useRef, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useQAReportStore } from '../store'
import type { SupportTicket } from '../types'
import { useDailyReportStore } from '@/modules/DailyUpdateReport/store'
import type { SupportLogRecord } from '@/modules/DailyUpdateReport/types'
import { toast } from '@/hooks/use-toast'
import { Plus, Trash2, Copy, Download, Upload, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  'Open': 'text-red-400 border-red-400/30 bg-red-400/10',
  'In Progress': 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10',
  'Resolved': 'text-blue-400 border-blue-400/30 bg-blue-400/10',
  'Closed': 'text-green-400 border-green-400/30 bg-green-400/10',
}
const PRIORITY_COLORS: Record<string, string> = {
  'Critical': 'text-red-500', 'High': 'text-orange-400', 'Medium': 'text-yellow-400', 'Low': 'text-green-400',
}

const newTicket = (): SupportTicket => ({
  id: crypto.randomUUID(), taskId: '', description: '', assignedQA: '',
  status: 'Open', priority: 'Medium', remarks: '',
})

const sel = 'bg-transparent border-none focus:outline-none text-sm text-white w-full'
const cell = 'px-3 py-2 border-b border-white/5'

const mapDailySupportToQA = (rows: SupportLogRecord[]): SupportTicket[] => rows.map(row => ({
  id: crypto.randomUUID(),
  taskId: row.support_id || '',
  description: [row.description, row.bug_id ? `Bug ID: ${row.bug_id}` : '', row.branch ? `Branch: ${row.branch}` : '', row.received_date ? `Received: ${row.received_date}` : ''].filter(Boolean).join(' | '),
  assignedQA: row.qa || '',
  status: (() => {
    // Preserve exact status from Daily Report if it matches QA Report options
    const dailyStatus = row.status || ''
    const qaStatusOptions = ['Open', 'In Progress', 'Resolved', 'Closed']

    // Check if the daily status matches any QA status (case-insensitive)
    const matchedStatus = qaStatusOptions.find(
      qaStatus => qaStatus.toLowerCase() === dailyStatus.toLowerCase()
    )

    if (matchedStatus) return matchedStatus

    // Fallback: Use keyword matching only if no exact match
    const normalized = dailyStatus.toLowerCase()
    if (['resolved', 'closed', 'passed', 'completed', 'done'].some(v => normalized.includes(v))) return 'Resolved'
    if (['in progress', 'progress', 'working', 'ongoing'].some(v => normalized.includes(v))) return 'In Progress'
    return 'Open'
  })(),
  priority: 'Medium',
  remarks: [row.comments, row.retesting_status ? `Retesting: ${row.retesting_status}` : '', row.blocked_hours ? `Blocked Hours: ${row.blocked_hours}` : '', row.estimation_hrs ? `Estimation: ${row.estimation_hrs}` : ''].filter(Boolean).join(' | '),
}))

export const SupportLog: React.FC = () => {
  const { form, setForm } = useQAReportStore()
  const { supportRows: dailySupportRows } = useDailyReportStore()
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const fileRef = useRef<HTMLInputElement>(null)

  const tickets = form.supportTickets
  const filtered = tickets.filter(t =>
    [t.taskId, t.description, t.assignedQA, t.remarks].some(v => v.toLowerCase().includes(search.toLowerCase()))
  )

  const update = (id: string, patch: Partial<SupportTicket>) =>
    setForm({ supportTickets: tickets.map(t => t.id === id ? { ...t, ...patch } : t) })

  const addRow = () => setForm({ supportTickets: [...tickets, newTicket()] })

  const deleteSelected = () => {
    const next = selected.size ? tickets.filter(t => !selected.has(t.id)) : tickets.slice(0, -1)
    setForm({ supportTickets: next })
    setSelected(new Set())
  }

  const duplicate = () => {
    const dupes = tickets.filter(t => selected.has(t.id)).map(t => ({ ...t, id: crypto.randomUUID() }))
    setForm({ supportTickets: [...tickets, ...dupes] })
  }

  const exportCSV = () => {
    const header = 'Task ID,Description,Assigned QA,Status,Priority,Remarks'
    const rows = tickets.map(t => `"${t.taskId}","${t.description}","${t.assignedQA}","${t.status}","${t.priority}","${t.remarks}"`)
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'support-log.csv'; a.click()
  }

  const importFromDailyReport = () => {
    if (!dailySupportRows.length) {
      toast({ title: 'No daily report data', description: 'Support & Exception Log in Daily Update Report is empty.' })
      return
    }

    const imported = mapDailySupportToQA(dailySupportRows)
    setForm({ supportTickets: [...tickets, ...imported] })
    toast({ title: 'Imported from Daily Report', description: `${imported.length} row${imported.length === 1 ? '' : 's'} added to Support & Exception Log.` })
  }

  const downloadTemplate = () => {
    const content = 'Task ID,Description,Assigned QA,Status,Priority,Remarks\nTK-001,Issue description,Alex,Open,Medium,Retest pending\n'
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'qa-support-template.csv'; a.click()
  }

  const importCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const lines = (ev.target?.result as string).split('\n').slice(1)
      const imported: SupportTicket[] = lines.filter(Boolean).map(line => {
        const [taskId, description, assignedQA, status, priority, remarks] = line.split(',').map(v => v.replace(/^"|"$/g, ''))
        return { id: crypto.randomUUID(), taskId, description, assignedQA, status: status as any, priority: priority as any, remarks }
      })
      setForm({ supportTickets: [...tickets, ...imported] })
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const toggleSelect = (id: string) => setSelected(prev => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next
  })

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <span className="label-xs">Support & Exception Log</span>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10">
            <Search className="w-3 h-3 text-text-muted" />
            <input className="bg-transparent text-xs text-white focus:outline-none w-32 placeholder:text-text-muted" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          </div>
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
          <button onClick={() => fileRef.current?.click()} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-text-secondary hover:text-white transition-all">
            <Upload className="w-3 h-3" /> CSV
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-text-secondary hover:text-white transition-all">
            <Download className="w-3 h-3" /> Export
          </button>
          <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={importCSV} />
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full text-sm min-w-[700px]">
          <thead>
            <tr className="bg-white/5 text-left">
              <th className="px-3 py-2 w-8"><input type="checkbox" className="accent-accent-gold" onChange={e => setSelected(e.target.checked ? new Set(tickets.map(t => t.id)) : new Set())} /></th>
              {['Task ID', 'Description', 'Assigned QA', 'Status', 'Priority', 'Remarks'].map(h => (
                <th key={h} className="px-3 py-2 text-[10px] font-black uppercase tracking-widest text-text-muted font-bold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={7} className="text-center py-8 text-text-muted text-xs">No tickets. Click Add to create one.</td></tr>
            )}
            {filtered.map(t => (
              <tr key={t.id} className={cn('hover:bg-white/[0.02] transition-colors', selected.has(t.id) && 'bg-accent-gold/5')}>
                <td className={cell}><input type="checkbox" className="accent-accent-gold" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)} /></td>
                <td className={cell}><input className={sel} value={t.taskId} onChange={e => update(t.id, { taskId: e.target.value })} placeholder="TK-001" /></td>
                <td className={cell}><input className={sel} value={t.description} onChange={e => update(t.id, { description: e.target.value })} placeholder="Issue description" /></td>
                <td className={cell}><input className={sel} value={t.assignedQA} onChange={e => update(t.id, { assignedQA: e.target.value })} placeholder="Name" /></td>
                <td className={cell}>
                  <select className={`${sel} field-input py-0.5 px-1 text-xs`} value={t.status} onChange={e => update(t.id, { status: e.target.value as any })}>
                    {['Open', 'In Progress', 'Resolved', 'Closed'].map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className={`${cell}`}>
                  <select className={`${sel} field-input py-0.5 px-1 text-xs ${PRIORITY_COLORS[t.priority]}`} value={t.priority} onChange={e => update(t.id, { priority: e.target.value as any })}>
                    {['Critical', 'High', 'Medium', 'Low'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </td>
                <td className={cell}><input className={sel} value={t.remarks} onChange={e => update(t.id, { remarks: e.target.value })} placeholder="Remarks" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-text-muted">{tickets.length} ticket{tickets.length !== 1 ? 's' : ''}</p>
    </GlassCard>
  )
}
