// src/modules/TicketBowl/SyncProgressModal.tsx
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, CheckCircle2, AlertTriangle, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { TicketBowlSyncProgress } from './types'

interface SyncProgressModalProps {
  progress: TicketBowlSyncProgress | null
  syncing: boolean
  onClose: () => void
}

const STAGES = [
  { id: 'fetching-tickets', label: 'Fetching Work Packages' },
  { id: 'processing-data', label: 'Processing Ticket Data' },
  { id: 'fetching-activities', label: 'Fetching Activity History' },
  { id: 'saving-database', label: 'Saving Database Records' },
  { id: 'complete', label: 'Synchronization Complete' },
]

export function SyncProgressModal({ progress, syncing, onClose }: SyncProgressModalProps) {
  if (!progress && !syncing) return null

  const isComplete = progress?.phase === 'complete'
  const isError = progress?.phase === 'error'

  const currentStageIndex = STAGES.findIndex(s => s.id === progress?.phase)
  const effectiveIndex = currentStageIndex >= 0 ? currentStageIndex : 0
  const percent = progress?.total && progress.total > 0
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : 0

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md bg-surface border border-border/80 rounded-2xl shadow-xl overflow-hidden p-5 space-y-4"
        >
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div
                className={`p-2 rounded-xl ${
                  isError
                    ? 'bg-rose-500/15 text-rose-500'
                    : isComplete
                    ? 'bg-emerald-500/15 text-emerald-500'
                    : 'bg-accent/15 text-accent'
                }`}
              >
                {isError ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : isComplete ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : (
                  <RefreshCw className="w-5 h-5 animate-spin" />
                )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  {isError
                    ? 'Synchronization Failed'
                    : isComplete
                    ? 'Sync Complete'
                    : 'Synchronizing Ticket Bowl'}
                </h3>
                <p className="text-[11px] text-text-muted">
                  {isError
                    ? 'An error occurred during sync'
                    : isComplete
                    ? 'Database updated successfully'
                    : 'Fetching tickets & journal activities'}
                </p>
              </div>
            </div>

            {(isComplete || isError) && (
              <button
                type="button"
                onClick={onClose}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Progress Bar */}
          {!isError && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-medium text-text-muted">
                <span>{progress?.message || 'Processing...'}</span>
                {percent > 0 && <span>{percent}%</span>}
              </div>
              <div className="h-2 w-full rounded-full bg-border/50 overflow-hidden">
                <div
                  style={{ width: `${isComplete ? 100 : Math.max(percent, 10)}%` }}
                  className={`h-full transition-all duration-300 rounded-full ${
                    isComplete ? 'bg-emerald-500' : 'bg-accent'
                  }`}
                />
              </div>
            </div>
          )}

          {/* Stages List */}
          <div className="space-y-2 py-1">
            {STAGES.map((stage, idx) => {
              const isPast = effectiveIndex > idx || isComplete
              const isCurrent = effectiveIndex === idx && !isComplete && !isError

              return (
                <div
                  key={stage.id}
                  className={`flex items-center gap-2 text-xs transition-colors ${
                    isPast
                      ? 'text-text-primary font-medium'
                      : isCurrent
                      ? 'text-accent font-semibold'
                      : 'text-text-muted/60'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] ${
                      isPast
                        ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold'
                        : isCurrent
                        ? 'bg-accent/20 text-accent font-bold'
                        : 'bg-border/60 text-text-muted'
                    }`}
                  >
                    {isPast ? '✓' : idx + 1}
                  </div>
                  <span>{stage.label}</span>
                </div>
              )
            })}
          </div>

          {/* Footer Action */}
          {(isComplete || isError) && (
            <div className="pt-2 flex justify-end">
              <Button size="sm" onClick={onClose}>
                Dismiss
              </Button>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

