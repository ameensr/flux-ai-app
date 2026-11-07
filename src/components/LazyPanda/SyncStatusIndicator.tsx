// src/components/LazyPanda/SyncStatusIndicator.tsx
// Non-blocking background sync progress indicator — bottom-right corner

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/ThemeContext'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import type { TicketBowlSyncProgress } from '@/modules/TicketBowl/types'

interface SyncStatusIndicatorProps {
  progress: TicketBowlSyncProgress | null
  isVisible: boolean
  onCancel?: () => void
  className?: string
}

export const SyncStatusIndicator: React.FC<SyncStatusIndicatorProps> = ({
  progress,
  isVisible,
  onCancel,
  className,
}) => {
  const { isDark } = useTheme()
  const prefersReducedMotion = usePrefersReducedMotion()

  if (!isVisible || !progress) return null

  const positionClass = 'bottom-6 right-6 sm:right-8'

  // Calculate progress percentage (if available)
  const progressPercent = progress.total > 0
    ? Math.min(100, Math.round((progress.current / progress.total) * 100))
    : null

  return (
    <AnimatePresence>
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
        transition={prefersReducedMotion ? { duration: 0.15 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed ${positionClass} z-[99998] ${className || ''}`}
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div
          className="rounded-2xl px-5 py-4 max-w-[340px] sm:max-w-[380px] backdrop-blur-2xl shadow-xl"
          style={{
            background: isDark
              ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(37, 99, 235, 0.06) 100%), rgba(30, 41, 59, 0.95)'
              : 'linear-gradient(135deg, rgba(59, 130, 246, 0.04) 0%, rgba(37, 99, 235, 0.03) 100%), rgba(255, 255, 255, 0.98)',
            border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.2)' : 'rgba(59, 130, 246, 0.15)'}`,
            boxShadow: isDark
              ? '0 16px 40px -8px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(59, 130, 246, 0.1)'
              : '0 16px 40px -8px rgba(0, 0, 0, 0.2), 0 0 0 1px rgba(59, 130, 246, 0.12)',
          }}
        >
          {/* Header */}
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(37, 99, 235, 0.1) 100%)',
                border: `1px solid ${isDark ? 'rgba(59, 130, 246, 0.25)' : 'rgba(59, 130, 246, 0.2)'}`,
              }}
            >
              <span className="text-xl">🐼</span>
            </div>
            <div className="flex-1">
              <h3
                className="text-sm font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                QUB Sync Engine
              </h3>
              <p
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                Synchronizing OpenProject data...
              </p>
            </div>
            {/* Cancel Button */}
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="p-1.5 rounded-lg transition-all hover:scale-110"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                  color: 'var(--text-muted)',
                }}
                title="Cancel synchronization"
                aria-label="Cancel synchronization"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Progress Message */}
          <div className="mb-3">
            <p
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)', opacity: 0.9 }}
            >
              {progress.message || 'Processing...'}
            </p>
          </div>

          {/* Progress Bar (if we have total count) */}
          {progressPercent !== null && (
            <div className="mb-3">
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
                }}
              >
                <motion.div
                  className="h-full rounded-full"
                  style={{
                    background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
                    width: `${progressPercent}%`,
                  }}
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                />
              </div>
              <p
                className="text-xs mt-1.5 text-center font-medium"
                style={{ color: 'var(--text-muted)' }}
              >
                {progress.current.toLocaleString()} / {progress.total.toLocaleString()} ({progressPercent}%)
              </p>
            </div>
          )}

          {/* Status Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Loader2
                className={`w-4 h-4 text-blue-500 ${prefersReducedMotion ? '' : 'animate-spin'}`}
              />
              <span
                className="text-xs font-semibold"
                style={{ color: '#3b82f6' }}
              >
                Status: In Progress
              </span>
            </div>
            {onCancel && (
              <Button
                onClick={onCancel}
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                }}
              >
                Cancel
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

