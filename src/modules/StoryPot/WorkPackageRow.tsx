// src/modules/StoryPot/WorkPackageRow.tsx
import React from 'react'
import {
  Bug, FileText, Zap, CheckCircle2, User, Calendar, Clock,
  Users, Tag, History, Square, CheckSquare
} from 'lucide-react'
import type { CachedWorkPackage } from '@/services/storypot-cache'

interface WorkPackageRowProps {
  wp: CachedWorkPackage
  openprojectUrl: string
  isDark: boolean
  isSelected: boolean
  onToggleSelect: (id: number, e: React.MouseEvent) => void
}

const getTypeIcon = (type: string) => {
  const t = type.toLowerCase()
  if (t.includes('bug')) return <Bug className="w-4 h-4" />
  if (t.includes('feature') || t.includes('user story')) return <Zap className="w-4 h-4" />
  if (t.includes('task')) return <CheckCircle2 className="w-4 h-4" />
  return <FileText className="w-4 h-4" />
}

const getPriorityColor = (p: string) => {
  const pl = p.toLowerCase()
  if (pl.includes('immediate') || pl.includes('urgent')) return '#ef4444'
  if (pl.includes('high')) return '#f97316'
  if (pl.includes('normal') || pl.includes('medium')) return '#3b82f6'
  return '#22c55e'
}

const getStatusColor = (s: string) => {
  const sl = s.toLowerCase()
  if (sl.includes('closed') || sl.includes('done')) return '#22c55e'
  if (sl.includes('progress') || sl.includes('review')) return '#3b82f6'
  if (sl.includes('new') || sl.includes('open')) return '#a855f7'
  return 'var(--text-muted)'
}

export function WorkPackageRow({
  wp,
  openprojectUrl,
  isDark,
  isSelected,
  onToggleSelect
}: WorkPackageRowProps) {
  return (
    <div
      className="flex items-start gap-2 p-4 hover:bg-black/5 dark:hover:bg-white/5"
      style={{
        background: isSelected
          ? (isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)')
          : undefined
      }}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={(e) => onToggleSelect(wp.id, e)}
        className="mt-1 shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10"
      >
        {isSelected
          ? <CheckSquare className="w-5 h-5 text-green-500" />
          : <Square className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />
        }
      </button>

      {/* Content */}
      <a
        href={`${openprojectUrl}/work_packages/${wp.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-start gap-4"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{
            background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            color: 'var(--text-secondary)'
          }}
        >
          {getTypeIcon(wp.type)}
        </div>

        <div className="flex-1 min-w-0">
          {/* Badges */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              #{wp.id}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
              style={{
                background: `${getStatusColor(wp.status)}20`,
                color: getStatusColor(wp.status)
              }}
            >
              {wp.status}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
              style={{
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                color: 'var(--text-secondary)'
              }}
            >
              {wp.type}
            </span>
            {wp.release_tag && (
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}
              >
                <Tag className="w-3 h-3 inline mr-1" />{wp.release_tag}
              </span>
            )}
            {wp.is_overdue && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-500">
                Overdue
              </span>
            )}
            {wp.testing_status && (
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}
              >
                {wp.testing_status}
              </span>
            )}
          </div>

          {/* Subject */}
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            {wp.subject}
          </p>

          {/* Meta info */}
          <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1">
              <span
                className="w-2 h-2 rounded-full"
                style={{ background: getPriorityColor(wp.priority) }}
              />
              {wp.priority}
            </span>
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />Author: {wp.author || 'Unknown'}
            </span>
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />{wp.assignee || 'Unassigned'}
            </span>
            {wp.created_at && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(wp.created_at).toLocaleDateString()}
              </span>
            )}
            {/* PRIME FEATURE: Show forwarded date prominently */}
            {wp.forwarded_to_testing_at && (
              <span
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-medium"
                style={{
                  background: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(59, 130, 246, 0.08)',
                  color: '#3b82f6',
                  border: '1px solid rgba(59, 130, 246, 0.25)'
                }}
              >
                <History className="w-3.5 h-3.5" />
                <span>
                  Forwarded: <strong>{new Date(wp.forwarded_to_testing_at).toLocaleDateString()}</strong>
                  {' at '}
                  <strong>{new Date(wp.forwarded_to_testing_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</strong>
                </span>
                {wp.forwarded_to_testing_by && (
                  <span className="ml-0.5">
                    by <span className="font-semibold">{wp.forwarded_to_testing_by}</span>
                  </span>
                )}
              </span>
            )}
            {wp.percentage_done > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />{wp.percentage_done}%
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {wp.percentage_done > 0 && (
          <div className="w-20 shrink-0">
            <div className="text-right text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>
              {wp.percentage_done}%
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
            >
              <div
                className="h-full rounded-full"
                style={{
                  width: `${wp.percentage_done}%`,
                  background: wp.percentage_done === 100 ? '#22c55e' : '#3b82f6'
                }}
              />
            </div>
          </div>
        )}
      </a>
    </div>
  )
}
