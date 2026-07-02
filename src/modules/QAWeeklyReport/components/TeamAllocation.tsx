import React, { useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useQAReportStore } from '../store'
import { X, Plus } from 'lucide-react'

function TagInput({ label, tags, onChange }: { label: string; tags: string[]; onChange: (t: string[]) => void }) {
  const [input, setInput] = useState('')

  const add = () => {
    const v = input.trim()
    if (v && !tags.includes(v)) onChange([...tags, v])
    setInput('')
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="label-xs">{label}</span>
      <div className="flex flex-wrap gap-2 min-h-[36px] p-2 bg-white/5 border border-white/10 rounded-xl">
        {tags.map(t => (
          <span key={t} className="flex items-center gap-1 px-2 py-1 rounded-lg bg-accent-gold/10 border border-accent-gold/20 text-xs text-accent-gold font-bold">
            {t}
            <button onClick={() => onChange(tags.filter(x => x !== t))}><X className="w-3 h-3" /></button>
          </span>
        ))}
        <input
          className="bg-transparent text-sm text-white focus:outline-none flex-1 min-w-[120px] placeholder:text-text-muted"
          placeholder="Type name, press Enter"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add() } }}
        />
      </div>
    </div>
  )
}

export const TeamAllocation: React.FC = () => {
  const { form, setForm } = useQAReportStore()
  return (
    <GlassCard hoverEffect={false} className="flex flex-col gap-4">
      <span className="label-xs">Team Resource Allocation</span>
      <TagInput label="New Feature Testing" tags={form.newFeatureTeam} onChange={v => setForm({ newFeatureTeam: v })} />
      <TagInput label="Support Team" tags={form.supportTeam} onChange={v => setForm({ supportTeam: v })} />
      <TagInput label="Automation Team" tags={form.automationTeam} onChange={v => setForm({ automationTeam: v })} />
    </GlassCard>
  )
}
