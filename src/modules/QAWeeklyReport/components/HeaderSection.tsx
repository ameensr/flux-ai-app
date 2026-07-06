import React, { useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useQAReportStore } from '../store'
import { Mail, Zap, Wrench } from 'lucide-react'

const inp = 'field-input'
const lbl = 'label-xs mb-1.5 block'

export const HeaderSection: React.FC = () => {
  const { form, setForm, resetForm, projects, fetchProjects } = useQAReportStore()

  useEffect(() => {
    fetchProjects(true)
  }, [])

  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-4">
      <span className="label-xs">Report Header</span>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={lbl}>Project Name <span className="text-red-400">*</span></label>
          <select
            className={`${inp} text-xs text-text-primary`}
            value={form.projectId || ''}
            onChange={e => {
              const selectedId = e.target.value
              const selectedProj = projects.find(p => p.id === selectedId)
              if (selectedProj) {
                resetForm(selectedProj.id, selectedProj.projectName)
                useQAReportStore.getState().fetchReports(selectedProj.id || '')
                localStorage.setItem('last-selected-project-id', selectedProj.id || '')
              } else {
                resetForm('', '')
              }
            }}
          >
            <option value="">-- Select Project --</option>
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.projectName} ({p.projectCode})</option>
            ))}
          </select>
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

  // Auto-populate functions
  const autoPopulateNewFeatures = () => {
    const count = form.releaseItems?.length || 0
    setForm({ newFeatures: count })
  }

  const autoPopulateCodeFixes = () => {
    const count = form.supportTickets?.length || 0
    setForm({ codeFixes: count })
  }

  const kpis = [
    { key: 'supportEmails' as const, label: 'Support Emails', icon: Mail, color: 'text-blue-400', hasAuto: false },
    { key: 'newFeatures' as const, label: 'New Features', icon: Zap, color: 'text-accent-gold', hasAuto: true, autoFn: autoPopulateNewFeatures, autoTooltip: 'Auto-populate from Release Testing Status' },
    { key: 'codeFixes' as const, label: 'Code Fixes Testing', icon: Wrench, color: 'text-green-400', hasAuto: true, autoFn: autoPopulateCodeFixes, autoTooltip: 'Auto-populate from Support & Exception Log' },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {kpis.map(({ key, label, icon: Icon, color, hasAuto, autoFn, autoTooltip }) => (
        <GlassCard key={key} hoverEffect={false} className="p-4 flex flex-col gap-2 relative">
          <div className="flex items-center justify-between">
            <Icon className={`w-4 h-4 ${color}`} />
            {hasAuto && autoFn && (
              <button
                onClick={autoFn}
                title={autoTooltip}
                className="px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider bg-accent-gold/10 hover:bg-accent-gold/20 text-accent-gold border border-accent-gold/20 hover:border-accent-gold/40 transition-all"
              >
                Auto
              </button>
            )}
          </div>
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
