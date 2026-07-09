import React from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useQAReportStore } from '../store'
import type { ProductionIssueBlock } from '../types'

const inp = 'field-input py-2'
const lbl = 'label-xs mb-1 block'

type BlockKey = keyof ProductionIssueBlock

function IssueBlock({
  title, value, onChange,
}: {
  title: string
  value: ProductionIssueBlock
  onChange: (patch: Partial<ProductionIssueBlock>) => void
}) {
  const fields: { key: BlockKey; label: string }[] = [
    { key: 'escapedIssue', label: 'Escaped Issue' },
    { key: 'supportFix', label: 'Support' },
    { key: 'changeRequest', label: 'Change Request' },
    { key: 'dataIssue', label: 'Data Issue' },
    { key: 'backendUpdation', label: 'Backend Updation' },
  ]

  const total = fields.reduce((s, f) => s + (Number(value[f.key]) || 0), 0)

  const handleFieldChange = (key: BlockKey, val: number) => {
    const updatedValue = { ...value, [key]: val }
    const supportSum =
      (Number(updatedValue.escapedIssue) || 0) +
      (Number(updatedValue.supportFix) || 0) +
      (Number(updatedValue.changeRequest) || 0) +
      (Number(updatedValue.dataIssue) || 0) +
      (Number(updatedValue.backendUpdation) || 0)

    onChange({ [key]: val, support: supportSum })
  }

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="label-xs font-bold">{title}</span>
        <span className="text-[10px] text-text-muted font-medium">(Manual Input)</span>
      </div>
      {fields.map(({ key, label }) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <label className={lbl}>{label}</label>
          <input
            type="number" min={0}
            className={`${inp} w-24 text-right`}
            value={value[key] ?? 0}
            onChange={e => handleFieldChange(key, Number(e.target.value))}
          />
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-white/10 pt-3 mt-1">
        <div className="flex flex-col text-left">
          <span className="label-xs text-accent-gold font-bold">Total</span>
          <span className="text-[10px] text-text-muted mt-0.5">(Support Mails)</span>
        </div>
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
      />
    </div>
  )
}
