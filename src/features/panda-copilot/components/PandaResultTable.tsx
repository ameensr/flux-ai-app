// src/features/panda-copilot/components/PandaResultTable.tsx
// Renders structured data tables for support issues, release tasks, QA reports, and projects.

import React from 'react'
import { ExternalLink, Clock, User, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNavigate } from 'react-router-dom'
import type { SupportIssueRow, ReleaseTaskRow, QAReportRow, ProjectRow } from '../types/pandaTypes'

// ── Status Badge ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  'Not Started': 'bg-slate-500/15 text-slate-400 border-slate-500/30',
  'Assigned': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
  'In Testing': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  'In Progress': 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  'Blocked': 'bg-red-500/15 text-red-400 border-red-500/30',
  'Retesting': 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  'In Review': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Completed': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'Cancelled': 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
  'Draft': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  'Final': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'active': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  'archived': 'bg-zinc-500/15 text-zinc-400 border-zinc-500/30',
}

function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_COLORS[status] || 'bg-slate-500/15 text-slate-400 border-slate-500/30'
  return (
    <span className={cn('inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold border', cls)}>
      {status}
    </span>
  )
}

// ── Support Issues Table ──────────────────────────────────────────────────────

export function SupportIssuesTable({ issues, onNavigate }: { issues: SupportIssueRow[]; onNavigate?: () => void }) {
  const navigate = useNavigate()

  return (
    <div className="space-y-1.5">
      {issues.map(issue => (
        <div
          key={issue.id}
          className="rounded-lg border px-3 py-2.5 cursor-pointer transition-colors hover:border-[var(--accent)]/40"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          onClick={() => { navigate('/support-tracker'); onNavigate?.() }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>{issue.issue_id}</span>
                <StatusBadge status={issue.testing_status} />
              </div>
              <p className="text-[11px] leading-snug line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                {issue.description}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <Tag className="w-2.5 h-2.5" />{issue.product_name}
                </span>
                {issue.tester_name && issue.tester_name !== 'Unassigned' && (
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <User className="w-2.5 h-2.5" />{issue.tester_name}
                  </span>
                )}
                <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <Clock className="w-2.5 h-2.5" />{issue.received_date}
                </span>
              </div>
            </div>
            <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Release Tasks Table ───────────────────────────────────────────────────────

export function ReleaseTasksTable({ tasks, onNavigate }: { tasks: ReleaseTaskRow[]; onNavigate?: () => void }) {
  const navigate = useNavigate()

  return (
    <div className="space-y-1.5">
      {tasks.map(task => (
        <div
          key={task.id}
          className="rounded-lg border px-3 py-2.5 cursor-pointer transition-colors hover:border-[var(--accent)]/40"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          onClick={() => { navigate('/release-tracker'); onNavigate?.() }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-bold" style={{ color: 'var(--accent)' }}>{task.task_id}</span>
                <StatusBadge status={task.task_status} />
                <span className="text-[10px] px-1.5 py-0.5 rounded border" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--surface-elevated)' }}>
                  {task.release_version}
                </span>
              </div>
              <p className="text-[11px] leading-snug line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                {task.description}
              </p>
              <div className="flex items-center gap-3 mt-1.5">
                <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  <Tag className="w-2.5 h-2.5" />{task.product_name}
                </span>
                {task.assigned_to_name && task.assigned_to_name !== 'Unassigned' && (
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <User className="w-2.5 h-2.5" />{task.assigned_to_name}
                  </span>
                )}
                {task.target_date && (
                  <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    <Clock className="w-2.5 h-2.5" />Due {task.target_date}
                  </span>
                )}
              </div>
            </div>
            <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── QA Reports Table ──────────────────────────────────────────────────────────

export function QAReportsTable({ reports, onNavigate }: { reports: QAReportRow[]; onNavigate?: () => void }) {
  const navigate = useNavigate()

  return (
    <div className="space-y-1.5">
      {reports.map(report => (
        <div
          key={report.id}
          className="rounded-lg border px-3 py-2.5 cursor-pointer transition-colors hover:border-[var(--accent)]/40"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          onClick={() => { navigate('/qa-report'); onNavigate?.() }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                  {report.name || report.project}
                </span>
                <StatusBadge status={report.status} />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Week: {report.week}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{report.generatedDate}</span>
              </div>
            </div>
            <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Projects Table ────────────────────────────────────────────────────────────

export function ProjectsTable({ projects, onNavigate }: { projects: ProjectRow[]; onNavigate?: () => void }) {
  const navigate = useNavigate()

  return (
    <div className="space-y-1.5">
      {projects.map(project => (
        <div
          key={project.id}
          className="rounded-lg border px-3 py-2.5 cursor-pointer transition-colors hover:border-[var(--accent)]/40"
          style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
          onClick={() => { navigate('/project-hub'); onNavigate?.() }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-semibold" style={{ color: 'var(--text-primary)' }}>{project.name}</span>
                {project.project_code && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded border" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)', background: 'var(--surface-elevated)' }}>
                    {project.project_code}
                  </span>
                )}
                <StatusBadge status={project.status} />
              </div>
              {project.description && (
                <p className="text-[10px] line-clamp-1" style={{ color: 'var(--text-muted)' }}>{project.description}</p>
              )}
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{project.member_count} members</span>
            </div>
            <ExternalLink className="w-3 h-3 shrink-0 mt-0.5" style={{ color: 'var(--text-muted)' }} />
          </div>
        </div>
      ))}
    </div>
  )
}
