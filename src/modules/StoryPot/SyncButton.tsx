// src/modules/StoryPot/SyncButton.tsx
import React from 'react'
import { RefreshCw, Database, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { SyncProgress } from '@/services/storypot-cache'

interface SyncButtonProps {
  onSync: () => void
  isSyncing: boolean
  syncProgress: SyncProgress | null
  lastSyncAt: string | null
  hasData: boolean
  disabled?: boolean
}

export function SyncButton({
  onSync,
  isSyncing,
  syncProgress,
  lastSyncAt,
  hasData,
  disabled
}: SyncButtonProps) {
  const getButtonContent = () => {
    if (isSyncing && syncProgress) {
      const percent = syncProgress.total > 0 
        ? Math.round((syncProgress.current / syncProgress.total) * 100) 
        : 0
      return (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="hidden sm:inline">
            {syncProgress.phase === 'fetching' && `Fetching ${percent}%`}
            {syncProgress.phase === 'processing' && `Processing ${percent}%`}
            {syncProgress.phase === 'syncing-activities' && `Activities ${percent}%`}
            {syncProgress.phase === 'saving' && `Saving ${percent}%`}
          </span>
        </>
      )
    }
    
    if (!hasData) {
      return (
        <>
          <Database className="w-4 h-4" />
          <span>Sync Data</span>
        </>
      )
    }
    
    return (
      <>
        <RefreshCw className="w-4 h-4" />
        <span>Re-sync</span>
      </>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        onClick={onSync}
        disabled={disabled || isSyncing}
        className="gap-2"
        style={{
          background: isSyncing ? undefined : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          color: 'white',
        }}
      >
        {getButtonContent()}
      </Button>
      
      {lastSyncAt && !isSyncing && (
        <div className="flex items-center gap-1.5 text-xs text-green-500">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>
            Synced {new Date(lastSyncAt).toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit' 
            })}
          </span>
        </div>
      )}
    </div>
  )
}

export function SyncProgressBar({ progress }: { progress: SyncProgress }) {
  const percent = progress.total > 0 
    ? Math.round((progress.current / progress.total) * 100) 
    : 0

  return (
    <div className="w-full space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span style={{ color: 'var(--text-muted)' }}>{progress.message}</span>
        <span style={{ color: 'var(--text-primary)' }}>{percent}%</span>
      </div>
      <div 
        className="h-2 rounded-full overflow-hidden"
        style={{ background: 'rgba(59, 130, 246, 0.1)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${percent}%`,
            background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)'
          }}
        />
      </div>
    </div>
  )
}
