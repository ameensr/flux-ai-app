import { AlertTriangle, CheckCircle2, Clock3, Download, FolderKanban, LifeBuoy, RefreshCw, Rocket, Ticket } from 'lucide-react'
import { SyncProgressIndicator } from './SyncProgressIndicator'
import type { TicketBowlSyncStatus, TicketBowlSyncProgress } from './types'

interface TicketBowlHeaderProps {
  projects: Array<{ id: string; name: string; metadata?: Record<string, unknown> }>
  selectedProjectId: string
  onSelectProject: (id: string) => void
  opProjects: Array<{ id: number; name: string }>
  showOpProjectSelector: boolean
  opProjectsLoading: boolean
  onOpenOpProjects: () => void
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

const toolbarButton = 'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border border-border/60 bg-surface px-2.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-elevated hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent'

export function TicketBowlHeader({
  projects, selectedProjectId, onSelectProject, opProjects, showOpProjectSelector,
  opProjectsLoading, onOpenOpProjects, selectedOpProjectId,
  onSelectOpProject, syncStatus, syncing, syncProgress, onSync, onCancelSync,
  selectedCount, onExportRelease, onExportSupport, onExportCsv, canSync, canExport,
}: TicketBowlHeaderProps) {
  const lastSync = syncStatus?.last_successful_sync_at || syncStatus?.completed_at
  const lastSyncLabel = lastSync && !Number.isNaN(new Date(lastSync).getTime())
    ? new Date(lastSync).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Never'

  return (
    <header className="overflow-hidden rounded-xl border border-border/60 bg-surface/80 shadow-xs backdrop-blur-md">
      <div className="flex flex-col gap-4 px-4 py-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-accent/20 bg-accent/10 text-accent">
            <Ticket className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-base font-bold tracking-tight text-text-primary sm:text-lg">Ticket Bowl</h1>
              <span className="rounded-md border border-border/50 bg-surface-secondary/70 px-2 py-0.5 text-[10px] font-medium text-text-muted">QA handoffs</span>
            </div>
            <p className="mt-0.5 text-xs text-text-muted">Track forwarded tickets, testing progress, and handoff history.</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <label className="flex h-8 min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-surface px-2.5 text-xs text-text-muted">
            <FolderKanban className="h-3.5 w-3.5 shrink-0 text-accent" />
            <span className="sr-only">Project</span>
            <select value={selectedProjectId} onChange={e => onSelectProject(e.target.value)} className="max-w-[175px] cursor-pointer truncate bg-transparent font-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent">
              {projects.map(project => <option key={project.id} value={project.id} className="bg-surface">{project.name}</option>)}
            </select>
          </label>
          {showOpProjectSelector && (
            <label className="flex h-8 min-w-0 items-center gap-2 rounded-lg border border-border/60 bg-surface px-2.5 text-xs text-text-muted">
              <span>OpenProject</span>
              <select value={selectedOpProjectId ?? ''} onFocus={onOpenOpProjects} onChange={e => onSelectOpProject(e.target.value ? Number(e.target.value) : null)} className="max-w-[165px] cursor-pointer truncate bg-transparent font-medium text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-accent">
                <option value="" className="bg-surface">All projects</option>
                {selectedOpProjectId && !opProjects.some(project => project.id === selectedOpProjectId) && (
                  <option value={selectedOpProjectId} className="bg-surface">Project #{selectedOpProjectId}</option>
                )}
                {opProjectsLoading && <option disabled className="bg-surface">Loading projects...</option>}
                {opProjects.map(project => <option key={project.id} value={project.id} className="bg-surface">{project.name}</option>)}
              </select>
            </label>
          )}
          {canSync && (syncing ? (
            <SyncProgressIndicator progress={syncProgress || null} syncing={syncing} onCancel={onCancelSync} />
          ) : (
            <button type="button" onClick={onSync} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-accent px-3 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2">
              <RefreshCw className="h-3.5 w-3.5" /> Sync Data
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-border/50 bg-surface-secondary/25 px-4 py-2.5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-text-muted">
          <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" /> Last synced <span className="font-semibold text-text-secondary">{lastSyncLabel}</span></span>
          {syncStatus?.sync_status === 'completed' && <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3.5 w-3.5" /> Up to date</span>}
          {syncStatus?.sync_status === 'completed_with_errors' && <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400"><AlertTriangle className="h-3.5 w-3.5" /> Partial warnings</span>}
        </div>
        {canExport && (
          <div className="flex flex-wrap items-center gap-1.5">
            {selectedCount > 0 && <span className="mr-1 rounded-md bg-accent/10 px-2 py-1 text-[11px] font-semibold text-accent">{selectedCount} selected</span>}
            <button type="button" onClick={onExportRelease} className={toolbarButton}><Rocket className="h-3.5 w-3.5 text-accent" /> Release Tracker</button>
            <button type="button" onClick={onExportSupport} className={toolbarButton}><LifeBuoy className="h-3.5 w-3.5 text-sky-500" /> Support Tracker</button>
            <button type="button" onClick={onExportCsv} className={toolbarButton}><Download className="h-3.5 w-3.5" /> CSV</button>
          </div>
        )}
      </div>
    </header>
  )
}
