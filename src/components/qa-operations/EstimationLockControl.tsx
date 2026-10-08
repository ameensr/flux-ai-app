// src/components/qa-operations/EstimationLockControl.tsx
// Reusable Estimation Hours Lock & Unlock Control for QA Operations Hub
// Used in both Support Issue Tracker and Release Task Tracker.
// Strictly enforces per-task independent locking with tooltips and permission gates.

import React, { useState } from 'react'
import { Lock, Unlock, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EstimationLockControlProps {
  isLocked?: boolean
  canLock: boolean
  canUnlock: boolean
  onToggleLock: (shouldLock: boolean) => Promise<void> | void
  disabled?: boolean
  lockedBy?: string | null
  lockedAt?: string | null
  size?: 'xs' | 'sm' | 'md'
  showBadge?: boolean
  className?: string
}

export const EstimationLockControl: React.FC<EstimationLockControlProps> = ({
  isLocked = false,
  canLock,
  canUnlock,
  onToggleLock,
  disabled = false,
  lockedBy,
  lockedAt,
  size = 'sm',
  showBadge = false,
  className
}) => {
  const [loading, setLoading] = useState(false)

  const isPermittedToAct = isLocked ? canUnlock : canLock
  const canInteract = !disabled && isPermittedToAct && !loading

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()
    if (!canInteract) return

    try {
      setLoading(true)
      await onToggleLock(!isLocked)
    } finally {
      setLoading(false)
    }
  }

  // Format tooltip text
  const tooltipText = isLocked
    ? `Estimated Hours Locked${lockedBy ? ` by ${lockedBy}` : ''}${lockedAt ? ` (${lockedAt})` : ''}.${
        canUnlock ? ' Click to Unlock Estimation.' : ' Requires Unlock Estimated Hours permission.'
      }`
    : canLock
    ? 'Lock Estimated Hours to prevent modifications'
    : 'Estimated Hours Unlocked'

  const iconSizes = {
    xs: 'w-3 h-3',
    sm: 'w-3.5 h-3.5',
    md: 'w-4 h-4'
  }

  const containerPaddings = {
    xs: 'p-1',
    sm: 'p-1.5',
    md: 'p-2'
  }

  return (
    <div className={cn('inline-flex items-center gap-1.5 select-none', className)}>
      <button
        type="button"
        onClick={handleClick}
        disabled={!canInteract}
        title={tooltipText}
        aria-label={tooltipText}
        className={cn(
          'relative rounded-lg transition-all duration-200 flex items-center justify-center group',
          containerPaddings[size],
          isLocked
            ? 'bg-amber-500/15 border border-amber-500/30 text-amber-400 hover:bg-amber-500/25'
            : 'bg-white/5 border border-white/10 text-slate-400 hover:bg-white/10 hover:text-text-primary',
          !canInteract && 'opacity-60 cursor-not-allowed hover:bg-transparent',
          canInteract && 'cursor-pointer active:scale-95'
        )}
      >
        {loading ? (
          <Loader2 className={cn('animate-spin text-accent', iconSizes[size])} />
        ) : isLocked ? (
          <Lock className={cn('text-amber-400 transition-transform group-hover:scale-105', iconSizes[size])} />
        ) : (
          <Unlock className={cn('transition-transform group-hover:scale-105', iconSizes[size])} />
        )}
      </button>

      {showBadge && (
        <span
          className={cn(
            'text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border',
            isLocked
              ? 'bg-amber-500/15 border-amber-500/30 text-amber-400'
              : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'
          )}
        >
          {isLocked ? 'Locked' : 'Unlocked'}
        </span>
      )}
    </div>
  )
}
