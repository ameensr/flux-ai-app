// src/modules/StoryPot/WorkPackageRow.tsx
import React from 'react'
import {
  Bug, FileText, Zap, CheckCircle2, User, Calendar,
  Users, Tag, History, Square, CheckSquare, Clock, ArrowRight,
} from 'lucide-react'
import type { CachedWorkPackage } from '@/services/storypot-cache'

interface WorkPackageRowProps {
  wp: CachedWorkPackage
  openprojectUrl: string
  isDark: boolean
  isSelected: boolean
  onToggleSelect?: (id: number, e: React.MouseEvent) => void
  showCheckbox?: boolean
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

// Format a UTC timestamp for display using the browser's local timezone
function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: '2-digit', month: 'short', year: 'numeric',
  })
}
function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: '2-digit', minute: '2-digit',
  })
}

export function WorkPackageRow({
  wp,
  openprojectUrl,
  isDark,
  isSelected,
  onToggleSelect,
  showCheckbox = true,
}: WorkPackageRowProps) {
  const hasHandoff = !!wp.forwarded_to_testing_at && wp.handoff_verified

  return (
    <div
      className="flex items-start gap-2 p-4 hover:bg-black/5 dark:hover:bg-white/5"
      style={{
        background: isSelected
          ? (isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)')
          : undefined,
      }}
    >
      {/* Checkbox */}
      {showCheckbox && onToggleSelect && (
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
      )}

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
            color: 'var(--text-secondary)',
          }}
        >
          {getTypeIcon(wp.type)}
        </div>

        <div className="flex-1 min-w-0">
          {/* Badges row */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              #{wp.id}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
              style={{ background: `${getStatusColor(wp.status)}20`, color: getStatusColor(wp.status) }}
            >
              {wp.status}
            </span>
            <span
              className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
              style={{
                background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                color: 'var(--text-secondary)',
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
            {/* Current Testing Status badge */}
            {wp.testing_status && (
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}
                title="Current Testing Status (customField14)"
              >
                {wp.testing_status}
              </span>
            )}
            {/* Is QA Missed badge — only render when value is meaningful */}
            {wp.is_qa_missed && wp.is_qa_missed.toLowerCase() === 'yes' && (
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-500"
                title="QA Missed: Yes (customField21)"
              >
                QA Missed
              </span>
            )}
            {wp.is_qa_missed && wp.is_qa_missed.toLowerCase() === 'no' && (
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                style={{ background: 'rgba(34,197,94,0.15)', color: '#22c55e' }}
                title="QA Missed: No (customField21)"
              >
                QA OK
              </span>
            )}
            {wp.is_qa_missed && wp.is_qa_missed.toLowerCase() === 'n/a' && (
              <span
                className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                style={{ background: 'rgba(100,116,139,0.15)', color: '#64748b' }}
                title="QA Missed: N/A — Bug tickets do not have this field"
              >
                N/A
              </span>
            )}
          </div>

          {/* Subject */}
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
            {wp.subject}
          </p>

          {/* Meta row */}
          <div className="flex items-center gap-4 text-xs flex-wrap mb-2" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: getPriorityColor(wp.priority) }} />
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
            {wp.percentage_done > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />{wp.percentage_done}%
              </span>
            )}
            {/* Is QA Missed inline label — only show Yes and N/A; No is the default/noise */}
            {wp.is_qa_missed && wp.is_qa_missed.toLowerCase() !== 'no' && (
              <span
                className="flex items-center gap-1 font-medium"
                style={{
                  color:
                    wp.is_qa_missed.toLowerCase() === 'yes' ? '#ef4444' : '#64748b',
                }}
                title={`Is QA Missed: ${wp.is_qa_missed}`}
              >
                QA Missed: {wp.is_qa_missed}
              </span>
            )}
          </div>

          {/* Handoff event block — shown when a verified transition exists */}
          {hasHandoff && (
            <div
              className="inline-flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2 rounded-lg text-xs"
              style={{
                background: isDark ? 'rgba(59, 130, 246, 0.12)' : 'rgba(59, 130, 246, 0.07)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
              }}
            >
              {/* Icon + label — clarify "First" when forwarded multiple times */}
              <span className="flex items-center gap-1.5 font-semibold shrink-0" style={{ color: '#3b82f6' }}>
                <History className="w-3.5 h-3.5" />
                {wp.handoff_count > 1 ? 'Latest Forwarded to the Testing Team' : 'Forwarded to the Testing Team'}
              </span>

              {/* Date Status Changed */}
              <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Calendar className="w-3 h-3" style={{ color: '#3b82f6' }} />
                <span style={{ color: 'var(--text-muted)' }}>Date:</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {fmtDate(wp.forwarded_to_testing_at!)}
                </strong>
              </span>

              {/* Time Status Changed */}
              <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                <Clock className="w-3 h-3" style={{ color: '#3b82f6' }} />
                <span style={{ color: 'var(--text-muted)' }}>Time:</span>
                <strong style={{ color: 'var(--text-primary)' }}>
                  {fmtTime(wp.forwarded_to_testing_at!)}
                </strong>
              </span>

              {/* Changed By */}
              {wp.forwarded_to_testing_by && (
                <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                  <User className="w-3 h-3" style={{ color: '#3b82f6' }} />
                  <span style={{ color: 'var(--text-muted)' }}>By:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{wp.forwarded_to_testing_by}</strong>
                </span>
              )}

              {/* Current Testing Status (may differ from the matched transition) */}
              {wp.testing_status && wp.testing_status !== 'Forwarded to the Testing Team' && (
                <span className="flex items-center gap-1" style={{ color: 'var(--text-secondary)' }}>
                  <ArrowRight className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                  <span style={{ color: 'var(--text-muted)' }}>Now:</span>
                  <strong style={{ color: 'var(--text-primary)' }}>{wp.testing_status}</strong>
                </span>
              )}

              {/* Multiple forwarding events indicator */}
              {wp.handoff_count > 1 && (
                <span
                  className="px-1.5 py-0.5 rounded text-[10px] font-bold"
                  style={{ background: 'rgba(59,130,246,0.2)', color: '#3b82f6' }}
                  title={`Forwarded ${wp.handoff_count} times total`}
                >
                  ×{wp.handoff_count}
                </span>
              )}
            </div>
          )}

          {/* Unverified indicator — forwarded_to_testing_at present but not verified */}
          {wp.forwarded_to_testing_at && !wp.handoff_verified && (
            <div
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs mt-1"
              style={{
                background: isDark ? 'rgba(245,158,11,0.1)' : 'rgba(245,158,11,0.07)',
                border: '1px solid rgba(245,158,11,0.25)',
                color: '#f59e0b',
              }}
            >
              <History className="w-3 h-3" />
              Transition date unavailable
            </div>
          )}
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
                  background: wp.percentage_done === 100 ? '#22c55e' : '#3b82f6',
                }}
              />
            </div>
          </div>
        )}
      </a>
    </div>
  )
}
