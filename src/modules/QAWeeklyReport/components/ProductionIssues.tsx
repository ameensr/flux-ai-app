import React from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useQAReportStore } from '../store'
import type { ProductionIssueBlock } from '../types'

const inp = 'field-input py-2'
const lbl = 'label-xs mb-1 block'

type BlockKey = keyof ProductionIssueBlock

function IssueBlock({
  title, value, onChange, showCR = false,
}: {
  title: string
  value: ProductionIssueBlock
  onChange: (patch: Partial<ProductionIssueBlock>) => void
  showCR?: boolean
}) {
  const fields: { key: BlockKey; label: string }[] = [
    { key: 'codeFix', label: 'Code Fix' },
    { key: 'support', label: 'Support' },
    { key: 'changeRequest', label: 'Change Request' },
    ...(showCR ? [{ key: 'completedCR' as BlockKey, label: 'Completed CR' }] : []),
    { key: 'dataIssue', label: 'Data Issue' },
    { key: 'backendUpdation', label: 'Backend Updation' },
  ]
  const total = fields.reduce((s, f) => s + (Number(value[f.key]) || 0), 0)

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-3">
      <span className="label-xs">{title}</span>
      {fields.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <label className={lbl}>{label}</label>
          <input
            type="number" min={0}
            className={`${inp} w-24 text-right`}
            value={value[key] ?? 0}
            onChange={e => onChange({ [key]: Number(e.target.value) })}
          />
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-1">
        <span className="label-xs text-accent-gold">Total</span>
        <span className="text-xl font-bold text-accent-gold">{total}</span>
      </div>
    </GlassCard>
  )
}

export const ProductionIssues: React.FC = () => {
  const { form, setForm } = useQAReportStore()
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <IssueBlock
        title="Last Week"
        value={form.lastWeek}
        onChange={patch => setForm({ lastWeek: { ...form.lastWeek, ...patch } })}
      />
      <IssueBlock
        title="Month To Date"
        value={form.monthToDate}
        onChange={patch => setForm({ monthToDate: { ...form.monthToDate, ...patch } })}
        showCR
      />
    </div>
  )
}
