// src/modules/TicketBowl/TicketBowlHeader.tsx
import React from 'react'
import {
  Ticket,
  RefreshCw,
  Download,
  Rocket,
  LifeBuoy,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FolderKanban,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { SyncProgressIndicator } from './SyncProgressIndicator'
import type { TicketBowlSyncStatus, TicketBowlSyncProgress } from './types'

interface TicketBowlHeaderProps {
  projects: Array<{ id: string; name: string; metadata?: Record<string, unknown> }>
  selectedProjectId: string
  onSelectProject: (id: string) => void
  opProjects: Array<{ id: number; name: string }>
  selectedOpProjectId?: number | null
  onSelectOpProject: (id: number | null) => void
  syncStatus: TicketBowlSyncStatus | null
  syncing: boolean
  syncProgress?: TicketBowlSyncProgress | null
  onSync: () => void
  onCancelSync?: () => void
  selectedCount: number
  onExportRelease: () => void
  onExportSupport: () => void
  onExportCsv: () => void
  canSync: boolean
  canExport: boolean
}

export function TicketBowlHeader({
  projects,
  selectedProjectId,
  onSelectProject,
  opProjects,
  selectedOpProjectId,
  onSelectOpProject,
  syncStatus,
  syncing,
  syncProgress,
  onSync,
  onCancelSync,
  selectedCount,
  onExportRelease,
  onExportSupport,
  onExportCsv,
  canSync,
  canExport,
}: TicketBowlHeaderProps) {
  const formatSyncTime = (timestamp?: string | null) => {
    if (!timestamp) return 'Never'
    try {
      const date = new Date(timestamp)
      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return 'Unknown'
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-4 border-b border-border/60">
      {/* Top row: Title, Project Selector, Sync Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Module Title */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-accent/15 border border-accent/30 text-accent shadow-sm">
            <Ticket className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-text-primary">Ticket Bowl</h1>
              <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-accent/20 text-accent">
                QA Handoffs
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Verified handoffs to QA with exact forwarding history and Testing Status tracking
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Qaly Project Selector */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-surface text-xs shadow-xs">
            <FolderKanban className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <select
              value={selectedProjectId}
              onChange={e => onSelectProject(e.target.value)}
              className="bg-transparent font-medium text-text-primary focus:outline-none cursor-pointer max-w-[180px] truncate"
            >
              {projects.map(p => (
                <option key={p.id} value={p.id} className="bg-surface text-text-primary">
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* OpenProject Sub-Project Filter (if configured) */}
          {opProjects.length > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/70 bg-surface text-xs shadow-xs">
              <span className="text-text-muted font-normal">OP:</span>
              <select
                value={selectedOpProjectId || ''}
                onChange={e => onSelectOpProject(e.target.value ? Number(e.target.value) : null)}
                className="bg-transparent font-medium text-text-primary focus:outline-none cursor-pointer max-w-[160px] truncate"
              >
                <option value="" className="bg-surface text-text-primary">
                  All OpenProjects
                </option>
                {opProjects.map(op => (
                  <option key={op.id} value={op.id} className="bg-surface text-text-primary">
                    {op.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Sync Button + Progress */}
          {canSync && (
            syncing ? (
              <SyncProgressIndicator
                progress={syncProgress || null}
                syncing={syncing}
                onCancel={onCancelSync}
              />
            ) : (
              <Button
                type="button"
                onClick={onSync}
                size="sm"
                className="gap-2 bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sync Data</span>
              </Button>
            )
          )}
        </div>
      </div>

      {/* Bottom Sub-row: Sync Status Metadata & Export Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Sync Info */}
        <div className="flex items-center gap-2 text-text-muted">
          <Clock className="w-3.5 h-3.5 shrink-0" />
          <span>Last Synced:</span>
          <span className="font-medium text-text-primary">
            {formatSyncTime(syncStatus?.last_successful_sync_at || syncStatus?.completed_at)}
          </span>

          {syncStatus?.sync_status === 'completed' && (
            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium ml-1">
              <CheckCircle2 className="w-3 h-3" /> Up to date
            </span>
          )}
          {syncStatus?.sync_status === 'completed_with_errors' && (
            <span className="inline-flex items-center gap-1 text-[11px] text-amber-500 font-medium ml-1">
              <AlertTriangle className="w-3 h-3" /> Partial warnings
            </span>
          )}
        </div>

        {/* Export Controls */}
        {canExport && (
          <div className="flex items-center gap-2">
            {selectedCount > 0 && (
              <span className="text-[11px] text-accent font-semibold px-2 py-0.5 rounded-md bg-accent/10">
                {selectedCount} selected
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onExportRelease}
              className="h-8 text-xs gap-1.5"
            >
              <Rocket className="w-3.5 h-3.5 text-accent" />
              <span>Release Tracker</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={onExportSupport}
              className="h-8 text-xs gap-1.5"
            >
              <LifeBuoy className="w-3.5 h-3.5 text-sky-500" />
              <span>Support Tracker</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onExportCsv}
              className="h-8 text-xs gap-1.5 text-text-muted hover:text-text-primary"
            >
              <Download className="w-3.5 h-3.5" />
              <span>CSV</span>
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

