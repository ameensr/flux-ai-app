// src/modules/TicketBowl/SyncProgressIndicator.tsx
// Minimal premium sync progress indicator
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { RefreshCw, X } from 'lucide-react'
import type { TicketBowlSyncProgress } from './types'

interface SyncProgressIndicatorProps {
  progress: TicketBowlSyncProgress | null
  syncing: boolean
  onCancel?: () => void
}

export function SyncProgressIndicator({ progress, syncing, onCancel }: SyncProgressIndicatorProps) {
  if (!syncing || !progress) return null

  const percent = progress.total > 0
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : 0

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        className="flex items-center gap-3 px-4 py-2 rounded-xl bg-accent/5 border border-accent/20 backdrop-blur-sm"
      >
        <RefreshCw className="w-3.5 h-3.5 text-accent animate-spin" />
        
        <div className="flex items-center gap-3 min-w-[180px]">
          <div className="flex-1 h-1.5 rounded-full bg-border/40 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-accent to-accent/70 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${Math.max(percent, 5)}%` }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            />
          </div>
          <span className="text-xs font-semibold text-accent tabular-nums w-10 text-right">
            {percent}%
          </span>
        </div>

        {onCancel && (
          <button
            onClick={onCancel}
            className="p-1 rounded-md text-text-muted/60 hover:text-text-muted hover:bg-border/30 transition-colors"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
