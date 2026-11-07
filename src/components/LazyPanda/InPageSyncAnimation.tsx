// src/components/LazyPanda/InPageSyncAnimation.tsx
// Premium in-page synchronization animation with glassmorphic design
// Shows within page content, not as overlay - non-blocking UI

import { useEffect, useState } from 'react'
import { Loader2, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface InPageSyncAnimationProps {
  isVisible: boolean
  phase: string
  current: number
  total: number
  message?: string
  onCancel?: () => void
  isCompleted?: boolean
  isError?: boolean
  errorMessage?: string
}

export function InPageSyncAnimation({
  isVisible,
  phase,
  current,
  total,
  message,
  onCancel,
  isCompleted = false,
  isError = false,
  errorMessage,
}: InPageSyncAnimationProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true)
    }
  }, [isVisible])

  if (!isVisible && !isCompleted && !isError) return null

  const progress = total > 0 ? (current / total) * 100 : 0
  const isActive = isVisible && !isCompleted && !isError

  // Phase labels for better UX
  const phaseLabels: Record<string, string> = {
    'fetching-tickets': 'Fetching Tickets',
    'saving-snapshots': 'Saving Snapshots',
    'fetching-activities': 'Analyzing History',
    'saving-history': 'Saving History',
    'recalculating-counts': 'Recalculating Counts',
    'complete': 'Complete',
  }

  const phaseLabel = phaseLabels[phase] || phase

  return (
    <div
      className={`
        w-full rounded-xl border border-border/50 bg-gradient-to-br from-background/95 to-background/80
        backdrop-blur-xl shadow-2xl overflow-hidden
        transition-all duration-500 ease-out
        ${isAnimating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
      `}
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)',
        backdropFilter: 'blur(20px)',
        boxShadow: '0 8px 32px 0 rgba(0,0,0,0.12), inset 0 1px 1px 0 rgba(255,255,255,0.1)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          {isCompleted ? (
            <CheckCircle2 className="h-5 w-5 text-green-500" />
          ) : isError ? (
            <AlertCircle className="h-5 w-5 text-red-500" />
          ) : (
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
          )}
          <div>
            <h3 className="font-semibold text-sm">
              {isCompleted
                ? 'Sync Complete'
                : isError
                  ? 'Sync Failed'
                  : 'Synchronizing OpenProject'}
            </h3>
            <p className="text-xs text-muted-foreground">
              {isCompleted
                ? 'Data has been updated successfully'
                : isError
                  ? errorMessage || 'An error occurred during synchronization'
                  : message || `${phaseLabel}...`}
            </p>
          </div>
        </div>

        {isActive && onCancel && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
            title="Cancel synchronization"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Progress Section */}
      {isActive && (
        <div className="px-6 py-4 space-y-3">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{phaseLabel}</span>
              <span className="font-medium text-foreground">
                {current.toLocaleString()} / {total.toLocaleString()}
              </span>
            </div>
            {/* Custom Progress Bar */}
            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{progress.toFixed(1)}% complete</span>
            </div>
          </div>

          {/* Phase Indicators */}
          <div className="flex items-center gap-2 flex-wrap">
            {['fetching-tickets', 'saving-snapshots', 'fetching-activities', 'saving-history', 'recalculating-counts'].map((p) => {
              const isCurrentPhase = phase === p
              const phases = ['fetching-tickets', 'saving-snapshots', 'fetching-activities', 'saving-history', 'recalculating-counts']
              const currentIndex = phases.indexOf(phase)
              const pIndex = phases.indexOf(p)
              const isPast = pIndex < currentIndex

              return (
                <div
                  key={p}
                  className={`
                    px-2 py-1 rounded text-xs font-medium transition-all duration-300
                    ${isCurrentPhase
                      ? 'bg-primary/20 text-primary border border-primary/30'
                      : isPast
                        ? 'bg-green-500/10 text-green-600 border border-green-500/20'
                        : 'bg-muted/50 text-muted-foreground border border-border/30'
                    }
                  `}
                >
                  {phaseLabels[p]}
                </div>
              )
            })}
          </div>

          {/* Cancel Button */}
          {onCancel && (
            <div className="pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onCancel}
                className="w-full text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel Synchronization
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Completion/Error Footer */}
      {(isCompleted || isError) && (
        <div className="px-6 py-4 bg-muted/30">
          {isCompleted && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              <span>
                Successfully synced {current.toLocaleString()} tickets
              </span>
            </div>
          )}
          {isError && (
            <div className="flex items-center gap-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4" />
              <span>{errorMessage || 'Synchronization failed'}</span>
            </div>
          )}
        </div>
      )}

      {/* Glassmorphic Shine Effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%, rgba(255,255,255,0.05) 100%)',
          animation: isActive ? 'shine 3s ease-in-out infinite' : 'none',
        }}
      />

      <style>{`
        @keyframes shine {
          0%, 100% {
            transform: translateX(-100%);
            opacity: 0;
          }
          50% {
            transform: translateX(100%);
            opacity: 0.3;
          }
        }
      `}</style>
    </div>
  )
}
