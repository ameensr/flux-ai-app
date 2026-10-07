// src/modules/SupportIssueTracker/components/AuditHistoryDrawer.tsx
// Audit History viewer: Complete immutable audit trail of changes.
// Permission-controlled: Requires 'can_view_history' permission.

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, History, Search, Filter, Shield, Calendar, User, ArrowRight,
  Clock, FileText, AlertCircle
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { useSupportTrackerStore } from '../store'
import type { SupportIssueHistoryRecord } from '../types'

interface Props {
  isOpen: boolean
  targetIssueId?: string | null
  onClose: () => void
}

export function AuditHistoryDrawer({ isOpen, targetIssueId, onClose }: Props) {
  const { history } = useSupportTrackerStore()

  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('all')

  const filteredHistory = useMemo(() => {
    return history.filter((item) => {
      // If drawer was opened for a specific issue
      if (targetIssueId && item.issue_id !== targetIssueId) {
        return false
      }

      // Action type filter
      if (actionFilter !== 'all' && item.action !== actionFilter) {
        return false
      }

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase().trim()
        const match =
          item.issue_id.toLowerCase().includes(q) ||
          item.product_name.toLowerCase().includes(q) ||
          item.user_name.toLowerCase().includes(q) ||
          item.action.toLowerCase().includes(q) ||
          (item.field && item.field.toLowerCase().includes(q)) ||
          (item.old_value && item.old_value.toLowerCase().includes(q)) ||
          (item.new_value && item.new_value.toLowerCase().includes(q))
        if (!match) return false
      }

      return true
    })
  }, [history, targetIssueId, actionFilter, search])

  // Unique actions for filter dropdown
  const uniqueActions = useMemo(() => {
    return Array.from(new Set(history.map(h => h.action)))
  }, [history])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, x: 100 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 100 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="w-full max-w-2xl h-full"
        >
          <div className="h-full bg-surface-elevated/95 border-l border-white/10 dark:border-white/5 shadow-2xl flex flex-col p-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-text-primary">
                      Audit History Log
                    </h3>
                    <Badge variant="outline" className="text-[10px] text-cyan-400 border-cyan-500/30 bg-cyan-500/10">
                      Read-Only
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted">
                    {targetIssueId
                      ? `Audit trail for issue ${targetIssueId}`
                      : 'Complete activity trail across all support issues'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-4 border-b border-white/5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search user, action, field, values..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-2.5 text-xs bg-surface border border-white/15 rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                />
              </div>

              <div>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className="w-full h-8 bg-surface border border-white/15 rounded-lg px-2.5 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="all">All Actions ({uniqueActions.length})</option>
                  {uniqueActions.map((act) => (
                    <option key={act} value={act}>
                      {act}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Timeline Stream */}
            <div className="flex-1 overflow-y-auto py-4 space-y-3.5 pr-1">
              {filteredHistory.map((record) => (
                <div
                  key={record.id}
                  className="p-3.5 rounded-xl border border-white/10 bg-surface/70 hover:bg-surface transition-colors space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-xs text-text-primary">
                        {record.user_name}
                      </span>
                      <span className="text-[11px] text-text-muted font-normal">
                        performed
                      </span>
                      <Badge variant="outline" className="text-[10px] font-semibold text-accent border-accent/30 bg-accent/5">
                        {record.action}
                      </Badge>
                    </div>

                    <span className="text-[10px] text-text-muted font-mono whitespace-nowrap">
                      {record.timestamp}
                    </span>
                  </div>

                  {/* Field diff */}
                  {record.field && (
                    <div className="p-2.5 rounded-lg bg-surface-elevated/80 border border-white/5 text-xs space-y-1">
                      <div className="text-[10px] uppercase font-semibold text-text-muted tracking-wider">
                        Changed Field: <span className="text-text-primary">{record.field}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-rose-400 line-through font-mono">
                          {record.old_value || '(None)'}
                        </span>
                        <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
                        <span className="text-emerald-400 font-bold font-mono">
                          {record.new_value || '(None)'}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Issue & Product metadata */}
                  <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-white/5">
                    <span className="font-mono text-accent font-semibold">
                      {record.issue_id}
                    </span>
                    <span>{record.product_name}</span>
                  </div>
                </div>
              ))}

              {filteredHistory.length === 0 && (
                <div className="text-center py-12 text-xs text-text-muted">
                  <AlertCircle className="w-6 h-6 mx-auto mb-2 text-text-muted/40" />
                  <p>No audit events match the current filter.</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs text-text-muted">
              <span>Total recorded: {history.length} logs</span>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-white/5 text-text-primary border border-white/10 transition-colors"
              >
                Close Audit Viewer
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
