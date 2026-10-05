import React, { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useQAReportStore } from '../store'
import type { ProductionIssueBlock } from '../types'

const inp = 'field-input py-2'
const lbl = 'label-xs block'

const FIELDS: { key: keyof ProductionIssueBlock; label: string; tooltip: string }[] = [
  { key: 'productionIssues',   label: 'Total Production Issues', tooltip: 'Total support/issues received from production' },
  { key: 'fixesForValidation', label: 'Fixes for Validation',    tooltip: 'Code fixes received from dev team for QA/testing' },
  { key: 'escapedDefects',     label: 'Escaped Defects',         tooltip: 'Defects/issues that escaped QA and reached production' },
]

function FieldTooltip({ text }: { text: string }) {
  return (
    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 z-50 pointer-events-none">
      <div className="px-2.5 py-1.5 rounded-lg bg-[#1a1a1a] border border-white/10 shadow-xl w-48">
        <p className="text-[11px] text-white/80 leading-relaxed">{text}</p>
      </div>
      <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px]">
        <div className="w-2 h-2 rotate-45 bg-[#1a1a1a] border-l border-b border-white/10" />
      </div>
    </div>
  )
}

function IssueBlock({
  title, value, onChange,
}: {
  title: string
  value: ProductionIssueBlock
  onChange: (patch: Partial<ProductionIssueBlock>) => void
}) {
  const [hoveredKey, setHoveredKey] = useState<string | null>(null)

  const handleFieldChange = (key: keyof ProductionIssueBlock, val: number) => {
    const updated = { ...value, [key]: val }
    const support =
      (Number(updated.productionIssues) || 0) +
      (Number(updated.fixesForValidation) || 0) +
      (Number(updated.escapedDefects) || 0)
    onChange({ [key]: val, support })
  }

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="label-xs font-bold">{title}</span>
        <span className="text-[10px] text-text-muted font-medium">(Manual Input)</span>
      </div>
      {FIELDS.map(({ key, label, tooltip }) => (
        <div key={key} className="flex items-center justify-between gap-3">
          <div
            className="relative flex items-center gap-1 cursor-default"
            onMouseEnter={() => setHoveredKey(key)}
            onMouseLeave={() => setHoveredKey(null)}
          >
            {hoveredKey === key && <FieldTooltip text={tooltip} />}
            <label className={`${lbl} cursor-default`}>{label}</label>
            <span className="text-[10px] text-text-muted/50 select-none">ⓘ</span>
          </div>
          <input
            type="number" min={0}
            className={`${inp} w-24 text-right`}
            value={value[key] ?? 0}
            onChange={e => handleFieldChange(key, Number(e.target.value))}
          />
        </div>
      ))}
    </GlassCard>
  )
}

export const ProductionIssues: React.FC = () => {
  const { form, setForm } = useQAReportStore()
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-start">
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
