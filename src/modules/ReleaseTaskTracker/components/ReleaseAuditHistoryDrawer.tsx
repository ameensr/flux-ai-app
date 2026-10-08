// src/modules/ReleaseTaskTracker/components/ReleaseAuditHistoryDrawer.tsx
// Slide-over drawer displaying complete audit trails with filtering.

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, History, Search, Filter, Calendar, User, CheckSquare
} from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useReleaseTrackerStore } from '../store'

interface Props {
  isOpen: boolean
  targetTaskId: string | null
  onClose: () => void
}

export function ReleaseAuditHistoryDrawer({
  isOpen,
  targetTaskId,
  onClose
}: Props) {
  useBodyScrollLock(isOpen)
  const { history } = useReleaseTrackerStore()
  const [search, setSearch] = useState('')
  const [selectedAction, setSelectedAction] = useState('all')

  const filteredHistory = useMemo(() => {
    return history.filter((h) => {
      if (targetTaskId && h.task_id !== targetTaskId) return false
      if (selectedAction !== 'all' && h.action !== selectedAction) return false
      if (search.trim()) {
        const q = search.toLowerCase()
        const matches =
          h.task_id.toLowerCase().includes(q) ||
          h.product_name.toLowerCase().includes(q) ||
          h.release_version.toLowerCase().includes(q) ||
          h.user_name.toLowerCase().includes(q) ||
          h.action.toLowerCase().includes(q) ||
          (h.field && h.field.toLowerCase().includes(q))
        if (!matches) return false
      }
      return true
    })
  }, [history, targetTaskId, selectedAction, search])

  const actionTypes = useMemo(() => {
    return Array.from(new Set(history.map(h => h.action))).sort()
  }, [history])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
        />

        <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="w-screen max-w-lg bg-surface border-l border-white/10 shadow-2xl flex flex-col"
          >
            {/* Header */}
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-surface-elevated/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-text-primary">
                    Release Audit History
                  </h3>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    {targetTaskId ? `Audit trails for ${targetTaskId}` : 'Full release change logs & activities'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Filter controls */}
            <div className="p-4 bg-surface-elevated/30 border-b border-white/10 space-y-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Filter by Task ID, user, product..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-8 pl-8 pr-3 text-xs bg-surface border border-white/10 rounded-lg text-text-primary focus:outline-none focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="w-full h-8 bg-surface border border-white/10 rounded-lg px-2 text-xs text-text-primary focus:outline-none"
                >
                  <option value="all">All Actions ({history.length})</option>
                  {actionTypes.map(act => (
                    <option key={act} value={act}>{act}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* History List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {filteredHistory.length === 0 ? (
                <div className="py-20 text-center text-text-muted text-xs">
                  <History className="w-8 h-8 text-text-muted/30 mx-auto mb-2" />
                  No audit history records found.
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div
                    key={item.id}
                    className="p-3.5 rounded-xl border border-white/10 bg-surface-elevated/50 space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-accent px-1.5 py-0.5 rounded bg-accent/15 border border-accent/25">
                          {item.task_id}
                        </span>
                        <span className="font-bold text-text-primary">
                          {item.action}
                        </span>
                      </div>
                      <span className="text-[10px] text-text-muted">
                        {item.timestamp}
                      </span>
                    </div>

                    <div className="text-[11px] text-text-muted flex items-center gap-2">
                      <span>{item.product_name}</span>
                      <span>•</span>
                      <span className="font-mono">{item.release_version}</span>
                      <span>•</span>
                      <span className="text-text-secondary font-medium">By {item.user_name}</span>
                    </div>

                    {item.field && (
                      <div className="text-[11px] pt-1 border-t border-white/5">
                        <span className="text-text-muted mr-1.5">{item.field}:</span>
                        {item.old_value && (
                          <span className="line-through text-rose-400 mr-2">
                            {item.old_value}
                          </span>
                        )}
                        {item.new_value && (
                          <span className="text-emerald-400 font-medium">
                            {item.new_value}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-white/10 bg-surface-elevated/70 flex items-center justify-between text-xs text-text-muted">
              <span>{filteredHistory.length} audit records</span>
              <button
                type="button"
                onClick={onClose}
                className="h-8 px-4 rounded-xl border border-white/10 hover:bg-white/5 text-text-primary"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}
