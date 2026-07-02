import React from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useQAReportStore } from '../store'
import { Mail, Zap, Wrench } from 'lucide-react'

const inp = 'field-input'
const lbl = 'label-xs mb-1.5 block'

export const HeaderSection: React.FC = () => {
  const { form, setForm } = useQAReportStore()
  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-4">
      <span className="label-xs">Report Header</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Project Name <span className="text-red-400">*</span></label>
          <input className={inp} value={form.projectName} onChange={e => setForm({ projectName: e.target.value })} placeholder="e.g. Phoenix Platform" />
        </div>
        <div>
          <label className={lbl}>Report Title</label>
          <input className={inp} value={form.reportTitle} onChange={e => setForm({ reportTitle: e.target.value })} />
        </div>
        <div>
          <label className={lbl}>Week Start <span className="text-red-400">*</span></label>
          <input type="date" className={inp} value={form.weekStart} onChange={e => setForm({ weekStart: e.target.value })} />
        </div>
        <div>
          <label className={lbl}>Week End <span className="text-red-400">*</span></label>
          <input type="date" className={inp} value={form.weekEnd} onChange={e => setForm({ weekEnd: e.target.value })} />
        </div>
      </div>
      <div>
        <label className={lbl}>Subtitle / Notes</label>
        <textarea rows={2} className={`${inp} resize-none`} value={form.subtitle} onChange={e => setForm({ subtitle: e.target.value })} placeholder="Optional context for this week..." />
      </div>
    </GlassCard>
  )
}

export const KPICards: React.FC = () => {
  const { form, setForm } = useQAReportStore()
  const kpis = [
    { key: 'supportEmails' as const, label: 'Support Emails', icon: Mail, color: 'text-blue-400' },
    { key: 'newFeatures' as const, label: 'New Features', icon: Zap, color: 'text-accent-gold' },
    { key: 'codeFixes' as const, label: 'Code Fixes Testing', icon: Wrench, color: 'text-green-400' },
  ]
  return (
    <div className="grid grid-cols-3 gap-3">
      {kpis.map(({ key, label, icon: Icon, color }) => (
        <GlassCard key={key} hoverEffect={false} className="p-4 flex flex-col gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <input
            type="number" min={0}
            className="bg-transparent text-2xl font-bold text-white w-full focus:outline-none"
            value={form[key]}
            onChange={e => setForm({ [key]: Number(e.target.value) })}
          />
          <span className="label-xs">{label}</span>
        </GlassCard>
      ))}
    </div>
  )
}
