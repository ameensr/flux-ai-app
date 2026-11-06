// src/modules/TicketBowl/TicketBowlTable.tsx
import React from 'react'
import {
  ExternalLink,
  History,
  Flame,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  ShieldCheck,
  FileQuestion,
  HelpCircle,
} from 'lucide-react'
import type { TicketBowlWorkPackage } from './types'

interface TicketBowlTableProps {
  tickets: TicketBowlWorkPackage[]
  loading: boolean
  openprojectUrl?: string | null
  onOpenHistory: (ticket: TicketBowlWorkPackage) => void
  selectedIds: Set<number>
  onToggleSelect: (id: number) => void
  onSelectAllCurrentPage: () => void
  onClearSelection: () => void
  canViewHistory: boolean
}

export function TicketBowlTable({
  tickets,
  loading,
  openprojectUrl,
  onOpenHistory,
  selectedIds,
  onToggleSelect,
  onSelectAllCurrentPage,
  onClearSelection,
  canViewHistory,
}: TicketBowlTableProps) {
  const allPageSelected = tickets.length > 0 && tickets.every(t => selectedIds.has(t.work_package_id))

  const formatDateTime = (timestamp?: string | null) => {
    if (!timestamp) return { date: '—', time: '' }
    try {
      const d = new Date(timestamp)
      const date = d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
      const time = d.toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
      return { date, time }
    } catch {
      return { date: 'Invalid', time: '' }
    }
  }

  const getPriorityBadgeClass = (priority: string) => {
    const p = (priority || '').toLowerCase()
    if (p.includes('immediate') || p.includes('urgent')) return 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
    if (p.includes('high')) return 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/30'
    if (p.includes('low')) return 'bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/30'
    return 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30'
  }

  const getQaMissedBadge = (val?: string | null) => {
    if (val === 'Yes') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30">
          <AlertCircle className="w-3 h-3" /> Yes
        </span>
      )
    }
    if (val === 'No') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
          No
        </span>
      )
    }
    if (val === 'N/A') {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-normal bg-surface text-text-muted border border-border/50">
          N/A
        </span>
      )
    }
    return (
      <span className="px-2 py-0.5 rounded text-[11px] font-normal bg-surface text-text-muted/60 border border-border/40">
        Unknown
      </span>
    )
  }

  return (
    <div className="rounded-xl border border-border/70 bg-surface shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-text-primary">
          <thead className="bg-surface-elevated/70 border-b border-border text-[11px] text-text-muted uppercase tracking-wider select-none font-semibold">
            <tr>
              {/* Checkbox */}
              <th className="py-3 px-3 w-8">
                <input
                  type="checkbox"
                  checked={allPageSelected}
                  onChange={() => (allPageSelected ? onClearSelection() : onSelectAllCurrentPage())}
                  className="rounded border-border text-accent focus:ring-accent cursor-pointer"
                />
              </th>
              <th className="py-3 px-3">Ticket ID</th>
              <th className="py-3 px-4 min-w-[240px]">Subject</th>
              <th className="py-3 px-3">Type</th>
              <th className="py-3 px-3">Priority</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3 min-w-[150px]">Testing Status</th>
              <th className="py-3 px-3">QA Missed</th>
              <th className="py-3 px-3 min-w-[130px]">Forwarded Date &amp; Time</th>
              <th className="py-3 px-3 min-w-[120px]">Forwarded By</th>
              <th className="py-3 px-3 text-center">Fwd Count</th>
              <th className="py-3 px-3">Author</th>
              <th className="py-3 px-3">Assignee</th>
              {canViewHistory && <th className="py-3 px-3 text-center">History</th>}
            </tr>
          </thead>

          <tbody className="divide-y divide-border/50">
            {loading ? (
              // Progressive Loading Skeleton Rows
              Array.from({ length: 5 }).map((_, idx) => (
                <tr key={idx} className="animate-pulse">
                  <td className="py-3 px-3"><div className="w-4 h-4 bg-surface-elevated rounded" /></td>
                  <td className="py-3 px-3"><div className="w-16 h-4 bg-surface-elevated rounded" /></td>
                  <td className="py-3 px-4"><div className="w-48 h-4 bg-surface-elevated rounded" /></td>
                  <td className="py-3 px-3"><div className="w-14 h-4 bg-surface-elevated rounded" /></td>
                  <td className="py-3 px-3"><div className="w-12 h-4 bg-surface-elevated rounded" /></td>
                  <td className="py-3 px-3"><div className="w-14 h-4 bg-surface-elevated rounded" /></td>
                  <td className="py-3 px-3"><div className="w-24 h-4 bg-surface-elevated rounded" /></td>
                  <td className="py-3 px-3"><div className="w-10 h-4 bg-surface-elevated rounded" /></td>
                  <td className="py-3 px-3"><div className="w-20 h-4 bg-surface-elevated rounded" /></td>
                  <td className="py-3 px-3"><div className="w-16 h-4 bg-surface-elevated rounded" /></td>
                  <td className="py-3 px-3"><div className="w-8 h-4 bg-surface-elevated rounded mx-auto" /></td>
                  <td className="py-3 px-3"><div className="w-16 h-4 bg-surface-elevated rounded" /></td>
                  <td className="py-3 px-3"><div className="w-16 h-4 bg-surface-elevated rounded" /></td>
                  {canViewHistory && <td className="py-3 px-3"><div className="w-6 h-4 bg-surface-elevated rounded mx-auto" /></td>}
                </tr>
              ))
            ) : tickets.length === 0 ? (
              <tr>
                <td colSpan={14} className="py-12 text-center text-text-muted">
                  <p className="text-sm font-medium">No tickets found matching the criteria.</p>
                  <p className="text-xs text-text-muted mt-1">
                    Try adjusting your filters, selecting a different project, or clicking &quot;Sync Data&quot;.
                  </p>
                </td>
              </tr>
            ) : (
              tickets.map(t => {
                const isSelected = selectedIds.has(t.work_package_id)
                const isRepeat = (t.forwarding_count || 0) > 1
                const isUnavailable = t.history_verification_status === 'unavailable'
                const isUnverified = t.history_verification_status === 'unverified'
                const isVerified = t.history_verification_status === 'verified'

                const fwdDateTime = formatDateTime(t.matched_forwarded_at || t.latest_forwarded_at)

                const opTicketUrl = openprojectUrl
                  ? `${openprojectUrl.replace(/\/$/, '')}/work_packages/${t.work_package_id}`
                  : null

                return (
                  <tr
                    key={t.work_package_id}
                    className={`hover:bg-surface-elevated/50 transition-colors ${
                      isSelected ? 'bg-accent/5' : ''
                    }`}
                  >
                    {/* Select Checkbox */}
                    <td className="py-2.5 px-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelect(t.work_package_id)}
                        className="rounded border-border text-accent focus:ring-accent cursor-pointer"
                      />
                    </td>

                    {/* Ticket ID & OP Link */}
                    <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
                      {opTicketUrl ? (
                        <a
                          href={opTicketUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-accent hover:underline"
                          title="Open in OpenProject"
                        >
                          <span>#{t.work_package_id}</span>
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </a>
                      ) : (
                        <span>#{t.work_package_id}</span>
                      )}
                    </td>

                    {/* Subject */}
                    <td className="py-2.5 px-4 font-medium text-text-primary">
                      <div className="line-clamp-2" title={t.subject}>
                        {t.subject}
                      </div>
                    </td>

                    {/* Type */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 rounded-md font-medium text-[11px] bg-surface-elevated border border-border">
                        {t.type_name}
                      </span>
                    </td>

                    {/* Priority */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded-md font-medium text-[11px] border ${getPriorityBadgeClass(
                          t.priority_name
                        )}`}
                      >
                        {t.priority_name}
                      </span>
                    </td>

                    {/* Status */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-text-muted">
                      {t.status_name}
                    </td>

                    {/* Current Testing Status (Latest customField14) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {t.testing_status ? (
                        <span
                          className="inline-block px-2 py-0.5 rounded-md font-medium text-[11px] bg-accent/10 text-accent border border-accent/20 max-w-[180px] truncate"
                          title={t.testing_status}
                        >
                          {t.testing_status}
                        </span>
                      ) : (
                        <span className="text-text-muted/60">—</span>
                      )}
                    </td>

                    {/* Is QA Missed */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {getQaMissedBadge(t.is_qa_missed)}
                    </td>

                    {/* Forwarded Date & Time */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isVerified && fwdDateTime.date !== '—' ? (
                        <div className="flex flex-col">
                          <span className="font-medium text-text-primary">{fwdDateTime.date}</span>
                          <span className="text-[10px] text-text-muted">{fwdDateTime.time}</span>
                        </div>
                      ) : isUnavailable ? (
                        <span
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20"
                          title="OpenProject activity history is incomplete or inaccessible for this ticket. Forwarding date could not be verified."
                        >
                          <HelpCircle className="w-3 h-3" /> Unavailable
                        </span>
                      ) : isUnverified ? (
                        <span className="text-[10px] text-amber-500 font-medium">Unverified</span>
                      ) : (
                        <span className="text-text-muted/60">—</span>
                      )}
                    </td>

                    {/* Forwarded By (Actor from journal) */}
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      {isVerified ? (
                        <div className="flex items-center gap-1.5" title={t.matched_forwarded_by || t.latest_forwarded_by_name || 'Unknown'}>
                          <User className="w-3 h-3 text-text-muted shrink-0" />
                          <span className="truncate max-w-[110px]">
                            {t.matched_forwarded_by || t.latest_forwarded_by_name || 'Unknown'}
                          </span>
                        </div>
                      ) : isUnavailable ? (
                        <span className="text-[11px] text-text-muted italic">Unavailable</span>
                      ) : (
                        <span className="text-text-muted/60">—</span>
                      )}
                    </td>

                    {/* Forwarding Count with Repeat Indicator */}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onOpenHistory(t)}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold transition-transform hover:scale-105 cursor-pointer ${
                          isRepeat
                            ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                            : isUnavailable
                            ? 'bg-slate-500/10 text-slate-500 border border-slate-500/20'
                            : 'bg-surface-elevated text-text-muted border border-border'
                        }`}
                        title={
                          isUnavailable
                            ? 'Incomplete history — click to view'
                            : 'Click to view full forwarding history'
                        }
                      >
                        {isRepeat && <Flame className="w-3 h-3 text-amber-500" />}
                        <span>{t.forwarding_count || 0}</span>
                      </button>
                    </td>

                    {/* Author */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-text-muted">
                      <span className="truncate max-w-[100px] block" title={t.author_name || 'Unknown'}>
                        {t.author_name || '—'}
                      </span>
                    </td>

                    {/* Assignee */}
                    <td className="py-2.5 px-3 whitespace-nowrap text-text-muted">
                      <span className="truncate max-w-[100px] block" title={t.assignee_name || 'Unassigned'}>
                        {t.assignee_name || 'Unassigned'}
                      </span>
                    </td>

                    {/* History Action */}
                    {canViewHistory && (
                      <td className="py-2.5 px-3 text-center whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onOpenHistory(t)}
                          className="p-1.5 rounded-md text-text-muted hover:text-accent hover:bg-accent/10 transition-colors"
                          title="View Transition Journal"
                        >
                          <History className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
