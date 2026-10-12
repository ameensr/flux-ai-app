// src/features/panda-copilot/components/PandaQuickActions.tsx
// Quick action buttons for the Copilot home screen.

import React from 'react'
import { BarChart2, AlertCircle, Zap, FileText, Rocket, User, FolderOpen, Search } from 'lucide-react'

export interface QuickAction {
  label: string
  icon: React.ElementType
  query: string
  color: string
}

export const QUICK_ACTIONS: QuickAction[] = [
  { label: "Today's Summary", icon: BarChart2, query: "today's summary", color: 'text-blue-400' },
  { label: 'Open Support Issues', icon: AlertCircle, query: 'show open support issues', color: 'text-amber-400' },
  { label: 'Critical Issues', icon: Zap, query: 'show critical and blocked issues', color: 'text-red-400' },
  { label: 'Latest QA Report', icon: FileText, query: 'show latest QA report', color: 'text-purple-400' },
  { label: 'Pending Releases', icon: Rocket, query: 'show pending release tasks', color: 'text-cyan-400' },
  { label: 'My Tasks', icon: User, query: 'show my tasks', color: 'text-emerald-400' },
  { label: 'Project Overview', icon: FolderOpen, query: 'show active projects', color: 'text-indigo-400' },
  { label: 'Search All', icon: Search, query: 'search across all modules', color: 'text-slate-400' },
]

interface Props {
  onSelect: (query: string) => void
}

export function PandaQuickActions({ onSelect }: Props) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {QUICK_ACTIONS.map(action => (
        <button
          key={action.label}
          onClick={() => onSelect(action.query)}
          className="flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all hover:border-[var(--accent)]/40 hover:bg-[var(--hover)] active:scale-[0.98]"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
        >
          <action.icon className={`w-3.5 h-3.5 shrink-0 ${action.color}`} />
          <span className="text-[11px] font-medium leading-tight" style={{ color: 'var(--text-secondary)' }}>
            {action.label}
          </span>
        </button>
      ))}
    </div>
  )
}
