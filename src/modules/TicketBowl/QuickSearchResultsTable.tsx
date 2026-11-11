// src/modules/TicketBowl/QuickSearchResultsTable.tsx
// Displays results from Quick Search (direct OpenProject fetch by date range)

import React from 'react'
import { ExternalLink, Zap, Calendar, User, AlertCircle } from 'lucide-react'
import type { QuickSearchResult } from './types'

interface QuickSearchResultsTableProps {
  results: QuickSearchResult[]
  loading: boolean
  error: string | null
  openprojectUrl?: string
  onClearResults: () => void
}

export function QuickSearchResultsTable({
  results,
  loading,
  error,
  openprojectUrl,
  onClearResults,
}: QuickSearchResultsTableProps) {
  if (error) {
    return (
      <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-rose-600 dark:text-rose-400">Quick Search Failed</p>
          <p className="text-xs text-rose-500 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  if (results.length === 0 && !loading) {
    return (
      <div className="rounded-xl border border-border/70 bg-surface/50 p-8 text-center">
        <Zap className="w-10 h-10 text-emerald-500/50 mx-auto mb-3" />
        <p className="text-sm font-medium text-text-primary">No Quick Search Results</p>
        <p className="text-xs text-text-muted mt-1">
          Select a date range and click "Fetch Now" to search for tickets forwarded in that period.
        </p>
      </div>
    )
  }

  const formatDate = (isoDate: string) => {
    return new Date(isoDate).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <div className="rounded-xl border border-emerald-500/30 bg-surface/70 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-emerald-500" />
          <span className="text-sm font-semibold text-text-primary">
            Quick Search Results
          </span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
            {results.length} tickets found
          </span>
        </div>
        <button
          onClick={onClearResults}
          className="text-xs text-text-muted hover:text-text-primary underline"
        >
          Clear Results
        </button>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-surface/80 border-b border-border/50">
            <tr>
              <th className="px-3 py-2 text-left font-semibold text-text-muted">Ticket ID</th>
              <th className="px-3 py-2 text-left font-semibold text-text-muted">Subject</th>
              <th className="px-3 py-2 text-left font-semibold text-text-muted">Type</th>
              <th className="px-3 py-2 text-left font-semibold text-text-muted">Status</th>
              <th className="px-3 py-2 text-left font-semibold text-text-muted">Testing Status</th>
              <th className="px-3 py-2 text-left font-semibold text-text-muted">Forwarded At</th>
              <th className="px-3 py-2 text-left font-semibold text-text-muted">Forwarded By</th>
              <th className="px-3 py-2 text-left font-semibold text-text-muted">Assignee</th>
              <th className="px-3 py-2 text-center font-semibold text-text-muted">Link</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {results.map((result) => (
              <tr key={result.workPackageId} className="hover:bg-surface/50 transition-colors">
                <td className="px-3 py-2.5">
                  <span className="font-mono font-medium text-accent">
                    #{result.workPackageId}
                  </span>
                </td>
                <td className="px-3 py-2.5 max-w-[250px]">
                  <span className="text-text-primary truncate block" title={result.subject}>
                    {result.subject}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 text-[10px] font-medium">
                    {result.typeName}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-text-secondary">{result.statusName}</span>
                </td>
                <td className="px-3 py-2.5">
                  {result.testingStatus ? (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                      result.testingStatus === 'Forwarded to the Testing Team'
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                        : 'bg-gray-500/10 text-gray-600 dark:text-gray-400'
                    }`}>
                      {result.testingStatus}
                    </span>
                  ) : (
                    <span className="text-text-muted">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                    <Calendar className="w-3 h-3" />
                    <span>{formatDate(result.forwardedAt)}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-1 text-text-secondary">
                    <User className="w-3 h-3" />
                    <span>{result.forwardedBy}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5">
                  <span className="text-text-secondary">
                    {result.assigneeName || '—'}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-center">
                  {openprojectUrl && (
                    <a
                      href={`${openprojectUrl}/work_packages/${result.workPackageId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center p-1 rounded hover:bg-accent/10 text-accent"
                      title="Open in OpenProject"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-surface/50 border-t border-border/30 text-[10px] text-text-muted">
        These results are fetched directly from OpenProject and are not stored locally.
        Use "Sync Data" for persistent storage and full analytics.
      </div>
    </div>
  )
}
