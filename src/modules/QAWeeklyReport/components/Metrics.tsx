import React, { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useQAReportStore } from '../store'
import type { DefectMetrics, HistoricalDefect, NextPriority } from '../types'
import { Plus, Trash2, TrendingUp, TrendingDown, Minus, Calculator, Lock, Unlock } from 'lucide-react'

const inp = 'field-input py-2'
const lbl = 'label-xs mb-1 block'

// ── Defect Analysis ──────────────────────────────────────────────────────────

function DefectBlock({ title, value, onChange }: { title: string; value: DefectMetrics; onChange: (p: Partial<DefectMetrics>) => void }) {
  const isReportedZero = value.reported === 0
  const [editedFields, setEditedFields] = useState<('open' | 'fixed' | 'closed')[]>([])

  useEffect(() => {
    if (value.reported === 0) {
      setEditedFields([])
    }
  }, [value.reported])

  // Determine computed field when exactly 2 fields are edited
  let computedField: 'open' | 'fixed' | 'closed' | null = null
  if (editedFields.length === 2 && value.reported > 0) {
    const allFields: ('open' | 'fixed' | 'closed')[] = ['open', 'fixed', 'closed']
    computedField = allFields.find(f => !editedFields.includes(f)) || null
  }

  // Reactive balancer calculation
  useEffect(() => {
    if (computedField && value.reported > 0) {
      const [fieldA, fieldB] = editedFields
      const calculatedVal = Math.max(value.reported - (value[fieldA] + value[fieldB]), 0)
      if (value[computedField] !== calculatedVal) {
        onChange({ [computedField]: calculatedVal })
      }
    }
  }, [value.reported, value.open, value.fixed, value.closed, computedField, editedFields])

  const handleFieldChange = (field: 'open' | 'fixed' | 'closed', val: number) => {
    setEditedFields(prev => {
      const filtered = prev.filter(f => f !== field)
      const next = [...filtered, field]
      if (next.length > 2) {
        return next.slice(-2)
      }
      return next
    })
    onChange({ [field]: val })
  }

  const handleUnlock = (field: 'open' | 'fixed' | 'closed') => {
    setEditedFields(prev => prev.filter(f => f !== prev[0]))
  }

  const handleReportedChange = (val: number) => {
    if (val <= 0) {
      onChange({ reported: 0, open: 0, fixed: 0, closed: 0 })
    } else {
      onChange({ reported: val })
    }
  }

  const totalStatuses = value.open + value.fixed + value.closed
  const remaining = value.reported - totalStatuses
  const isOverLimit = totalStatuses > value.reported

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-3">
      <span className="label-xs">{title}</span>
      <div className="grid grid-cols-2 gap-3">
        {/* Reported */}
        <div className="flex flex-col gap-1 col-span-2">
          <label className={`${lbl} text-blue-400`}>Reported Defects</label>
          <input
            type="number"
            min={0}
            className={inp}
            value={value.reported}
            onChange={e => handleReportedChange(Number(e.target.value))}
          />
        </div>

        {/* Sub Statuses */}
        {(['open', 'fixed', 'closed'] as const).map(k => {
          const isComputed = computedField === k
          const colorClass = k === 'open' ? 'text-red-400' : k === 'fixed' ? 'text-yellow-400' : 'text-green-400'
          const labelText = k.charAt(0).toUpperCase() + k.slice(1)

          return (
            <div key={k} className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <label className={`${lbl} ${colorClass} flex items-center gap-1`}>
                  {isComputed ? <Calculator className="w-3 h-3 text-yellow-400" /> : null}
                  {labelText}
                </label>

                {isComputed ? (
                  <button
                    onClick={() => handleUnlock(k)}
                    className="flex items-center gap-0.5 text-[8px] font-black text-yellow-400 bg-yellow-400/10 hover:bg-yellow-400/20 border border-yellow-400/20 px-1.5 py-0.5 rounded uppercase tracking-wider transition-all"
                    title="Unlock field to edit"
                  >
                    <Lock className="w-2.5 h-2.5" /> Auto
                  </button>
                ) : null}
              </div>
              <input
                type="number"
                min={0}
                className={`${inp} ${isReportedZero ? 'opacity-30 cursor-not-allowed' : ''} ${isComputed ? 'bg-white/[0.02] border-white/5 text-white/40 cursor-not-allowed' : ''}`}
                value={value[k]}
                disabled={isReportedZero || isComputed}
                onChange={e => handleFieldChange(k, Math.max(Number(e.target.value), 0))}
              />
            </div>
          )
        })}
      </div>

      {/* Live Balance count & validation error */}
      {value.reported > 0 && (
        <div className="flex flex-col gap-1.5 pt-2 border-t border-white/5">
          <div className="flex justify-between items-center text-xs">
            <span className="text-text-muted">Remaining Balance:</span>
            <span className={`font-black ${isOverLimit ? 'text-red-400 font-extrabold' : remaining === 0 ? 'text-green-400' : 'text-accent-gold'}`}>
              {remaining}
            </span>
          </div>

          {isOverLimit && (
            <div className="text-[10px] text-red-400 bg-red-400/10 border border-red-500/20 px-3 py-2 rounded-xl font-bold flex gap-1 items-center">
              <span>⚠️ Total defect statuses cannot exceed Reported defects.</span>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  )
}

export const DefectAnalysis: React.FC = () => {
  const { form, setForm } = useQAReportStore()
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <DefectBlock title="Defects — Last Week" value={form.defectsLastWeek} onChange={p => setForm({ defectsLastWeek: { ...form.defectsLastWeek, ...p } })} />
      <DefectBlock title="Defects — Month To Date" value={form.defectsMTD} onChange={p => setForm({ defectsMTD: { ...form.defectsMTD, ...p } })} />
    </div>
  )
}

// ── Historical Defect Progress ────────────────────────────────────────────────

export const HistoricalProgress: React.FC = () => {
  const { form, setForm } = useQAReportStore()
  const items = form.historicalDefects

  const update = (id: string, patch: Partial<HistoricalDefect>) =>
    setForm({ historicalDefects: items.map(i => i.id === id ? { ...i, ...patch } : i) })

  const add = () => setForm({ historicalDefects: [...items, { id: crypto.randomUUID(), metric: '', previous: 0, latest: 0 }] })
  const remove = (id: string) => setForm({ historicalDefects: items.filter(i => i.id !== id) })

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="label-xs">Historical Defect Progress</span>
        <button onClick={add} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent-gold/10 border border-accent-gold/20 text-xs font-bold text-accent-gold hover:bg-accent-gold/20 transition-all">
          <Plus className="w-3 h-3" /> Add Metric
        </button>
      </div>
      {items.length === 0 && <p className="text-xs text-text-muted">No metrics added yet.</p>}
      {items.map(item => {
        const diff = item.latest - item.previous
        const pct = item.previous !== 0 ? Math.abs(Math.round((diff / item.previous) * 100)) : 0
        const improved = diff < 0
        const neutral = diff === 0
        return (
          <div key={item.id} className="grid grid-cols-[1fr_80px_80px_80px_80px_32px] gap-2 items-center">
            <input className={inp} placeholder="Metric (e.g. Open Defects)" value={item.metric} onChange={e => update(item.id, { metric: e.target.value })} />
            <input type="number" className={`${inp} text-center`} value={item.previous} onChange={e => update(item.id, { previous: Number(e.target.value) })} />
            <input type="number" className={`${inp} text-center`} value={item.latest} onChange={e => update(item.id, { latest: Number(e.target.value) })} />
            <div className="flex flex-col items-center justify-center">
              <span className={`text-sm font-bold ${diff > 0 ? 'text-red-400' : diff < 0 ? 'text-green-400' : 'text-text-muted'}`}>{diff > 0 ? '+' : ''}{diff}</span>
              <span className="label-xs">Diff</span>
            </div>
            <div className="flex flex-col items-center justify-center gap-0.5">
              {neutral ? <Minus className="w-4 h-4 text-text-muted" /> : improved ? <TrendingUp className="w-4 h-4 text-green-400" /> : <TrendingDown className="w-4 h-4 text-red-400" />}
              <span className={`text-xs font-bold ${improved ? 'text-green-400' : neutral ? 'text-text-muted' : 'text-red-400'}`}>{pct}%</span>
            </div>
            <button onClick={() => remove(item.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )
      })}
      {items.length > 0 && (
        <div className="grid grid-cols-[1fr_80px_80px_80px_80px_32px] gap-2 pt-2 border-t border-white/10">
          <span className="label-xs text-accent-gold">Labels →</span>
          <span className="label-xs text-center">Previous</span>
          <span className="label-xs text-center">Latest</span>
          <span className="label-xs text-center">Diff</span>
          <span className="label-xs text-center">Trend</span>
          <span />
        </div>
      )}
    </GlassCard>
  )
}

// ── Next Week Priorities ──────────────────────────────────────────────────────

export const NextPriorities: React.FC = () => {
  const { form, setForm } = useQAReportStore()
  const items = form.nextPriorities

  const update = (id: string, patch: Partial<NextPriority>) =>
    setForm({ nextPriorities: items.map(i => i.id === id ? { ...i, ...patch } : i) })

  const add = () => setForm({ nextPriorities: [...items, { id: crypto.randomUUID(), title: '', description: '', owner: '', dueDate: '' }] })
  const remove = (id: string) => setForm({ nextPriorities: items.filter(i => i.id !== id) })

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="label-xs">Next Week Priorities</span>
        <button onClick={add} className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-accent-gold/10 border border-accent-gold/20 text-xs font-bold text-accent-gold hover:bg-accent-gold/20 transition-all">
          <Plus className="w-3 h-3" /> Add Priority
        </button>
      </div>
      {items.length === 0 && <p className="text-xs text-text-muted">No priorities added yet.</p>}
      {items.map((item, idx) => (
        <div key={item.id} className="flex gap-3 items-start p-3 rounded-2xl bg-white/[0.02] border border-white/5">
          <div className="w-6 h-6 rounded-full bg-accent-gold/10 border border-accent-gold/20 flex items-center justify-center text-[10px] font-bold text-accent-gold shrink-0 mt-0.5">{idx + 1}</div>
          <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input className="field-input py-2" placeholder="Priority Title *" value={item.title} onChange={e => update(item.id, { title: e.target.value })} />
            <div className="flex gap-2">
              <input className="field-input py-2 flex-1" placeholder="Owner (optional)" value={item.owner} onChange={e => update(item.id, { owner: e.target.value })} />
              <input type="date" className="field-input py-2 w-36" value={item.dueDate} onChange={e => update(item.id, { dueDate: e.target.value })} />
            </div>
            <textarea rows={2} className="field-input resize-none sm:col-span-2 py-2" placeholder="Description..." value={item.description} onChange={e => update(item.id, { description: e.target.value })} />
          </div>
          <button onClick={() => remove(item.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all mt-0.5">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </GlassCard>
  )
}
