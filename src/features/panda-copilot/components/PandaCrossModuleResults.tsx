// src/features/panda-copilot/components/PandaCrossModuleResults.tsx
// Renders grouped cross-module search results.

import React from 'react'
import { ExternalLink, ChevronRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import type { CrossModuleGroup } from '../types/pandaTypes'

const MODULE_ICONS: Record<string, string> = {
  'support-tracker': '🎫',
  'release-tracker': '🚀',
  'qa-report': '📊',
  'project-hub': '📁',
}

interface Props {
  groups: CrossModuleGroup[]
  onNavigate?: () => void
}

export function PandaCrossModuleResults({ groups, onNavigate }: Props) {
  const navigate = useNavigate()

  return (
    <div className="space-y-3">
      {groups.map(group => (
        <div key={group.moduleKey}>
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm">{MODULE_ICONS[group.moduleKey] || '📋'}</span>
              <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-primary)' }}>
                {group.module}
              </span>
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full border"
                style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--surface-elevated)' }}
              >
                {group.count}
              </span>
            </div>
            <button
              onClick={() => { navigate(group.route); onNavigate?.() }}
              className="flex items-center gap-1 text-[10px] font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              Open <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="space-y-1">
            {group.items.map(item => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors hover:border-[var(--accent)]/40"
                style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
                onClick={() => { navigate(item.route || group.route); onNavigate?.() }}
              >
                <div className="min-w-0 flex-1">
                  <span className="text-[11px] font-semibold" style={{ color: 'var(--accent)' }}>{item.title}</span>
                  {item.status && (
                    <span
                      className="ml-2 text-[10px] px-1.5 py-0.5 rounded border"
                      style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--surface-elevated)' }}
                    >
                      {item.status}
                    </span>
                  )}
                  <p className="text-[10px] line-clamp-1 mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {item.subtitle}
                  </p>
                </div>
                <ExternalLink className="w-3 h-3 shrink-0" style={{ color: 'var(--text-muted)' }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
