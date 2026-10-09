// src/modules/ReleaseTaskTracker/index.tsx

import React, { useEffect, useRef, useState } from 'react'
import {
  Rocket, Plus, Sliders, History, Download, Upload, RefreshCw, Shield
} from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/useAppStore'
import { useReleaseTrackerStore } from './store'
import { ReleaseManagerDashboard } from './components/ReleaseManagerDashboard'
import { ReleaseTaskTable } from './components/ReleaseTaskTable'
import { AddEditReleaseTaskModal } from './components/AddEditReleaseTaskModal'
import { ViewReleaseTaskModal } from './components/ViewReleaseTaskModal'
import { AddReleaseTimeLogModal } from './components/AddReleaseTimeLogModal'
import { ReleaseTimeLogDrawer } from './components/ReleaseTimeLogDrawer'
import { ReleaseAuditHistoryDrawer } from './components/ReleaseAuditHistoryDrawer'
import { ReleaseConfigurableDropdownsModal } from './components/ReleaseConfigurableDropdownsModal'
import { ReleaseExportImportModal } from './components/ReleaseExportImportModal'
import { ReleasePermissionsInfoModal } from './components/ReleasePermissionsInfoModal'
import type { ReleaseTask } from './types'

export function ReleaseTaskTracker() {
  const { toast } = useToast()
  const confirm = useConfirm()
  const { can, canView, permissionsLoaded } = usePermissions()
  const { user, profile } = useAppStore()

  // Granular Permissions
  const canViewDashboard      = can('release-tracker', 'can_view_dashboard')
  const canCreate             = can('release-tracker', 'can_create')
  const canDelete             = can('release-tracker', 'can_delete')
  const canExport             = can('release-tracker', 'can_export')
  const canImport             = can('release-tracker', 'can_import')
  const canViewHistory        = can('release-tracker', 'can_view_history')
  const canConfigureDropdowns = can('release-tracker', 'can_configure_dropdowns')

  const currentUser = {
    name: (profile?.full_name || user?.user_metadata?.full_name || user?.email || 'QA Engineer') as string,
    id: user?.id
  }

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen]             = useState(false)
  const [taskToEdit, setTaskToEdit]                   = useState<ReleaseTask | null>(null)
  const [isViewTaskOpen, setIsViewTaskOpen]           = useState(false)
  const [taskToView, setTaskToView]                   = useState<ReleaseTask | null>(null)
  const [isTimeLogModalOpen, setIsTimeLogModalOpen]   = useState(false)
  const [targetTimeLogTask, setTargetTimeLogTask]     = useState<ReleaseTask | null>(null)
  const [isTimeLogDrawerOpen, setIsTimeLogDrawerOpen] = useState(false)
  const [targetDrawerTask, setTargetDrawerTask]       = useState<ReleaseTask | null>(null)
  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false)
  const [targetHistoryTaskId, setTargetHistoryTaskId] = useState<string | null>(null)
  const [isDropdownsOpen, setIsDropdownsOpen]         = useState(false)
  const [isExportOpen, setIsExportOpen]               = useState(false)
  const [isImportOpen, setIsImportOpen]               = useState(false)
  const [isPermsInfoOpen, setIsPermsInfoOpen]         = useState(false)

  const { fetchInitialData, refreshData, loading, isRefreshing, deleteTask, bulkDeleteTasks, tasks } = useReleaseTrackerStore()

  // Fetch on mount. The store's loading flag prevents duplicate in-flight fetches.
  // hasFetched ref prevents double-invoke in React StrictMode dev.
  const hasFetched = useRef(false)
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchInitialData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBulkDelete = async (ids: string[]) => {
    if (!canDelete) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to delete these records.' })
      return
    }
    const ok = await confirm({
      title: 'Delete Selected Release Tasks?',
      description: `You are about to delete ${ids.length} selected release ${ids.length === 1 ? 'task' : 'tasks'}. This action may affect related time logs and records. Please confirm before proceeding.`,
      confirmLabel: `Delete ${ids.length} ${ids.length === 1 ? 'Task' : 'Tasks'}`,
      cancelLabel: 'Cancel',
      tone: 'danger'
    })
    if (!ok) return
    try {
      const result = await bulkDeleteTasks(ids, currentUser)
      if (result.failed.length === 0) {
        toast({ title: 'Bulk Delete Complete', description: `Successfully deleted ${result.deleted.length} release ${result.deleted.length === 1 ? 'task' : 'tasks'}.` })
      } else if (result.deleted.length > 0) {
        toast({ variant: 'destructive', title: 'Partial Delete', description: `Deleted ${result.deleted.length}, failed ${result.failed.length}. Review and try again.` })
      } else {
        toast({ variant: 'destructive', title: 'Delete Failed', description: 'Unable to delete the selected records. Please try again.' })
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: err.message || 'Unable to delete the selected records.' })
    }
  }

  const handleViewTask    = (task: ReleaseTask) => { setTaskToView(task); setIsViewTaskOpen(true) }
  const handleEditTask    = (task: ReleaseTask) => { setTaskToEdit(task); setIsAddEditOpen(true) }
  const handleLogHours    = (task: ReleaseTask) => { setTargetTimeLogTask(task); setIsTimeLogModalOpen(true) }
  const handleViewTimeLogs = (task: ReleaseTask) => { setTargetDrawerTask(task); setIsTimeLogDrawerOpen(true) }
  const handleViewHistory  = (taskId?: string)  => { setTargetHistoryTaskId(taskId || null); setIsHistoryDrawerOpen(true) }

  const handleDeleteTask = async (task: ReleaseTask) => {
    const ok = await confirm({
      title: `Delete Release Task ${task.task_id}?`,
      description: `Delete "${task.description.slice(0, 40)}..." for ${task.product_name} (${task.release_version})? This will be recorded in audit history.`,
      confirmLabel: 'Delete Task', cancelLabel: 'Cancel', tone: 'danger'
    })
    if (!ok) return
    try {
      await deleteTask(task.id, currentUser)
      toast({ title: 'Task Deleted', description: `Removed ${task.task_id}` })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: err.message || 'Could not delete task' })
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        <p className="text-xs text-text-muted">Loading Release Task Tracker...</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-[1680px] mx-auto">
      {/* ── Minimal Single-Row Enterprise Header ── */}
      <div className="rounded-xl border border-border/50 bg-surface/80 backdrop-blur-md px-3.5 sm:px-4 py-2 sm:py-2.5 shadow-xs flex flex-wrap lg:flex-nowrap items-center justify-between gap-2.5 sm:gap-3">
        {/* Left: Minimal Icon, Title & Badge */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center text-accent shrink-0">
            <Rocket className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-text-primary whitespace-nowrap">
              Release Task Tracker
            </h1>
            <span className="text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-secondary/70 text-text-muted border border-border/40 whitespace-nowrap">
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </span>
          </div>
        </div>

        {/* Right: Minimal Toolbar (Single-row icons & compact buttons) */}
        <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 ml-auto">
          <button
            type="button"
            onClick={refreshData}
            disabled={isRefreshing}
            title="Refresh Data & Sync Project Hub"
            className="h-7.5 w-7.5 rounded-lg border border-border/50 text-text-muted hover:text-text-primary hover:bg-surface-elevated/80 transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsPermsInfoOpen(true)}
            title="Permissions Info"
            className="h-7.5 px-2 sm:px-2.5 rounded-lg border border-border/50 text-xs font-medium text-text-muted hover:text-text-primary hover:bg-surface-elevated/80 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Shield className="w-3.5 h-3.5 text-accent" />
            <span className="hidden md:inline">Permissions</span>
          </button>

          {permissionsLoaded && canViewHistory && (
            <button
              type="button"
              onClick={() => handleViewHistory()}
              title="Audit History"
              className="h-7.5 px-2 sm:px-2.5 rounded-lg border border-border/50 text-xs font-medium text-text-muted hover:text-cyan-400 hover:bg-surface-elevated/80 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden md:inline">History</span>
            </button>
          )}

          {permissionsLoaded && canConfigureDropdowns && (
            <button
              type="button"
              onClick={() => setIsDropdownsOpen(true)}
              title="Configure Dropdowns"
              className="h-7.5 px-2 sm:px-2.5 rounded-lg border border-border/50 text-xs font-medium text-text-muted hover:text-purple-400 hover:bg-surface-elevated/80 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden lg:inline">Dropdowns</span>
            </button>
          )}

          {permissionsLoaded && canExport && (
            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              title="Export Release Tasks CSV"
              className="h-7.5 px-2 sm:px-2.5 rounded-lg border border-border/50 text-xs font-medium text-text-muted hover:text-emerald-400 hover:bg-surface-elevated/80 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export</span>
            </button>
          )}

          {permissionsLoaded && canImport && (
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              title="Import Tasks CSV"
              className="h-7.5 px-2 sm:px-2.5 rounded-lg border border-border/50 text-xs font-medium text-text-muted hover:text-blue-400 hover:bg-surface-elevated/80 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Import</span>
            </button>
          )}

          {permissionsLoaded && canCreate && (
            <button
              type="button"
              onClick={() => { setTaskToEdit(null); setIsAddEditOpen(true) }}
              className="h-7.5 px-2.5 sm:px-3 rounded-lg text-xs font-semibold bg-accent hover:bg-accent-hover text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Task</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Manager Dashboard ── */}
      {canViewDashboard ? (
        <section aria-label="Manager Release Dashboard">
          <ReleaseManagerDashboard />
        </section>
      ) : (
        <div className="p-4 rounded-xl border border-border/50 bg-surface/60 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-text-muted" />
            <span>Manager Release Dashboard requires <strong>View Release Task Dashboard</strong> permission.</span>
          </div>
          <button
            type="button"
            onClick={() => setIsPermsInfoOpen(true)}
            className="text-accent hover:underline text-xs font-medium cursor-pointer"
          >
            Check Permissions
          </button>
        </div>
      )}

      {/* ── Main Task Register Section ── */}
      <section aria-label="Release Task Register" className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text-primary tracking-tight">Release Task Register</h2>
              <Badge variant="outline" className="text-[10px] font-medium tracking-wide px-2 py-0.5 bg-surface-secondary/70 text-text-muted border-border/50">
                QA Velocity
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Live release tasks with unique Task IDs, schedule dates, cumulative work hours, and effort indicators
            </p>
          </div>
        </div>

        <ReleaseTaskTable
          onViewTask={handleViewTask}
          onEditTask={handleEditTask}
          onDeleteTask={handleDeleteTask}
          onLogHours={handleLogHours}
          onViewTimeLogs={handleViewTimeLogs}
          onViewHistory={(task) => handleViewHistory(task.task_id)}
          onBulkDelete={handleBulkDelete}
        />
      </section>

      {/* ── Modals & Drawers ── */}
      <AddEditReleaseTaskModal
        isOpen={isAddEditOpen} taskToEdit={taskToEdit}
        onClose={() => setIsAddEditOpen(false)}
        onOpenTimeLog={(task) => { setIsAddEditOpen(false); handleLogHours(task) }}
      />

      <ViewReleaseTaskModal
        isOpen={isViewTaskOpen} task={taskToView}
        onClose={() => { setIsViewTaskOpen(false); setTaskToView(null) }}
        onLogHours={(task) => { setIsViewTaskOpen(false); handleLogHours(task) }}
        onEditTask={(task) => { setIsViewTaskOpen(false); handleEditTask(task) }}
      />

      <AddReleaseTimeLogModal
        isOpen={isTimeLogModalOpen} task={targetTimeLogTask}
        onClose={() => { setIsTimeLogModalOpen(false); setTargetTimeLogTask(null) }}
      />

      <ReleaseTimeLogDrawer
        isOpen={isTimeLogDrawerOpen} task={targetDrawerTask}
        onClose={() => { setIsTimeLogDrawerOpen(false); setTargetDrawerTask(null) }}
        onAddHours={(task) => { setTargetTimeLogTask(task); setIsTimeLogModalOpen(true) }}
      />

      <ReleaseAuditHistoryDrawer
        isOpen={isHistoryDrawerOpen} targetTaskId={targetHistoryTaskId}
        onClose={() => setIsHistoryDrawerOpen(false)}
      />

      <ReleaseConfigurableDropdownsModal isOpen={isDropdownsOpen} onClose={() => setIsDropdownsOpen(false)} />

      <ReleaseExportImportModal key="release-export" isOpen={isExportOpen} initialTab="export" onClose={() => setIsExportOpen(false)} />
      <ReleaseExportImportModal key="release-import" isOpen={isImportOpen} initialTab="import" onClose={() => setIsImportOpen(false)} />

      <ReleasePermissionsInfoModal isOpen={isPermsInfoOpen} onClose={() => setIsPermsInfoOpen(false)} />
    </div>
  )
}
export default ReleaseTaskTracker

