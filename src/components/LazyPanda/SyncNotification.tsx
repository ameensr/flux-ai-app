// src/components/LazyPanda/SyncNotification.tsx
// Success and failure notifications for background sync

import React, { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, XCircle, X, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/ThemeContext'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

export type SyncNotificationType = 'success' | 'error'

export interface SyncNotificationProps {
  type: SyncNotificationType
  isVisible: boolean
  onDismiss: () => void
  onRetry?: () => void
  totalSynced?: number
  eventsFound?: number
  errorMessage?: string
  autoHideDelay?: number // milliseconds
  className?: string
}

export const SyncNotification: React.FC<SyncNotificationProps> = ({
  type,
  isVisible,
  onDismiss,
  onRetry,
  totalSynced = 0,
  eventsFound = 0,
  errorMessage,
  autoHideDelay = 8000, // 8 seconds default
  className,
}) => {
  const { isDark } = useTheme()
  const prefersReducedMotion = usePrefersReducedMotion()

  // Auto-dismiss on success
  useEffect(() => {
    if (isVisible && type === 'success' && autoHideDelay > 0) {
      const timer = setTimeout(() => {
        onDismiss()
      }, autoHideDelay)

      return () => clearTimeout(timer)
    }
  }, [isVisible, type, autoHideDelay, onDismiss])

  if (!isVisible) return null

  const positionClass = 'bottom-6 right-6 sm:right-8'
  const isSuccess = type === 'success'

  return (
    <AnimatePresence>
      <motion.div
        initial={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 20, scale: 0.95 }}
        animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.97 }}
        transition={prefersReducedMotion ? { duration: 0.15 } : { duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        className={`fixed ${positionClass} z-[99999] ${className || ''}`}
        role="alert"
        aria-live="polite"
      >
        <div
          className="rounded-2xl px-6 py-5 max-w-[380px] sm:max-w-[420px] backdrop-blur-2xl shadow-2xl"
          style={{
            background: isDark
              ? isSuccess
                ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.08) 0%, rgba(16, 185, 129, 0.06) 100%), rgba(30, 41, 59, 0.95)'
                : 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(220, 38, 38, 0.06) 100%), rgba(30, 41, 59, 0.95)'
              : isSuccess
              ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.04) 0%, rgba(16, 185, 129, 0.03) 100%), rgba(255, 255, 255, 0.98)'
              : 'linear-gradient(135deg, rgba(239, 68, 68, 0.04) 0%, rgba(220, 38, 38, 0.03) 100%), rgba(255, 255, 255, 0.98)',
            border: `1px solid ${isSuccess 
              ? isDark ? 'rgba(34, 197, 94, 0.2)' : 'rgba(34, 197, 94, 0.15)' 
              : isDark ? 'rgba(239, 68, 68, 0.2)' : 'rgba(239, 68, 68, 0.15)'}`,
            boxShadow: isDark
              ? isSuccess
                ? '0 20px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(34, 197, 94, 0.1), 0 0 30px rgba(34, 197, 94, 0.08)'
                : '0 20px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(239, 68, 68, 0.1), 0 0 30px rgba(239, 68, 68, 0.08)'
              : isSuccess
              ? '0 20px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(34, 197, 94, 0.12), 0 0 25px rgba(34, 197, 94, 0.06)'
              : '0 20px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(239, 68, 68, 0.12), 0 0 25px rgba(239, 68, 68, 0.06)',
          }}
        >
          {/* Close Button */}
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-3 right-3 p-1.5 rounded-lg transition-all hover:scale-110"
            style={{
              background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              color: 'var(--text-muted)',
            }}
            aria-label="Dismiss notification"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Content */}
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: isSuccess
                  ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.15) 0%, rgba(16, 185, 129, 0.1) 100%)'
                  : 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(220, 38, 38, 0.1) 100%)',
                border: `1px solid ${isSuccess 
                  ? isDark ? 'rgba(34, 197, 94, 0.25)' : 'rgba(34, 197, 94, 0.2)' 
                  : isDark ? 'rgba(239, 68, 68, 0.25)' : 'rgba(239, 68, 68, 0.2)'}`,
              }}
            >
              {isSuccess ? (
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              ) : (
                <XCircle className="w-5 h-5 text-red-500" />
              )}
            </div>

            {/* Message */}
            <div className="flex-1 pr-6">
              {isSuccess ? (
                <>
                  <h3
                    className="text-base font-bold mb-1.5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    🐼 All Caught Up!
                  </h3>
                  <p
                    className="text-sm leading-relaxed mb-2"
                    style={{ color: 'var(--text-primary)', opacity: 0.9 }}
                  >
                    Your OpenProject data has been successfully synchronized.
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'var(--text-primary)', opacity: 0.8 }}
                  >
                    Your Ticket Bowl is now up to date.
                  </p>
                  {(totalSynced > 0 || eventsFound > 0) && (
                    <div
                      className="mt-3 py-2 px-3 rounded-lg text-xs"
                      style={{
                        background: isDark ? 'rgba(34, 197, 94, 0.08)' : 'rgba(34, 197, 94, 0.06)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <strong>{totalSynced.toLocaleString()}</strong> tickets synced
                      {eventsFound > 0 && (
                        <>, <strong>{eventsFound.toLocaleString()}</strong> forwarding events found</>
                      )}
                    </div>
                  )}
                  <p
                    className="text-xs mt-2"
                    style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}
                  >
                    Synchronization completed successfully.
                  </p>
                </>
              ) : (
                <>
                  <h3
                    className="text-base font-bold mb-1.5"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Sync Interrupted
                  </h3>
                  <p
                    className="text-sm leading-relaxed mb-2"
                    style={{ color: 'var(--text-primary)', opacity: 0.9 }}
                  >
                    We couldn't complete your OpenProject synchronization.
                  </p>
                  {errorMessage && (
                    <div
                      className="mt-2 py-2 px-3 rounded-lg text-xs"
                      style={{
                        background: isDark ? 'rgba(239, 68, 68, 0.08)' : 'rgba(239, 68, 68, 0.06)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {errorMessage}
                    </div>
                  )}
                  <p
                    className="text-xs mt-2"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Your previous synchronized data remains available.
                  </p>
                  
                  {/* Retry Button */}
                  {onRetry && (
                    <div className="mt-4 flex gap-2">
                      <Button
                        onClick={onRetry}
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                        Retry Sync
                      </Button>
                      <Button
                        onClick={onDismiss}
                        size="sm"
                        variant="outline"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        }}
                      >
                        Dismiss
                      </Button>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

