// src/modules/TicketBowl/SyncProgressIndicator.tsx
// Minimal premium sync progress indicator
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, X } from 'lucide-react'
import type { TicketBowlSyncProgress } from './types'
import { getSyncProgressPercent } from './syncProgress'

interface SyncProgressIndicatorProps {
  progress: TicketBowlSyncProgress | null
  syncing: boolean
  onCancel?: () => void
}

export function SyncProgressIndicator({ progress, syncing, onCancel }: SyncProgressIndicatorProps) {
  if (!syncing || !progress) return null

  const percent = getSyncProgressPercent(progress)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent/5 px-3 py-1.5"
        role="status"
        aria-label={`Sync progress, approximately ${percent} percent. ${progress.message}`}
      >
        <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin" />
        
        <div className="flex min-w-[145px] items-center gap-2">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-border/40" role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Estimated overall sync progress">
            <motion.div
              className="h-full bg-gradient-to-r from-accent to-accent/70 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${percent}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <span className="w-9 text-right text-xs font-semibold tabular-nums text-accent" title="Estimated overall progress">
            {percent}%
          </span>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            type="button"
            aria-label="Cancel sync"
            className="rounded-md p-1 text-text-muted/60 transition-colors hover:bg-border/30 hover:text-text-muted"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
