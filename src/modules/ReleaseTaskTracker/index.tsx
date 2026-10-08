// src/modules/ReleaseTaskTracker/index.tsx
// Main entry point for Release Task Tracker Module under QA Operations Hub.
// Completely permission-controlled enterprise QA release tracking with Manager Dashboard,
// cumulative time logs, effort calculation, and Project Hub integration.

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Rocket, Plus, Sliders, History, Download, Upload, RefreshCw,
  Shield, Layers, FolderKanban, CheckSquare, Clock
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
  const { can, canView } = usePermissions()

  // Granular Permissions
  const canViewTracker = canView('release-tracker')
  const canViewDashboard = can('release-tracker', 'can_view_dashboard')
  const canCreate = can('release-tracker', 'can_create')
  const canEdit = can('release-tracker', 'can_edit')
  const canDelete = can('release-tracker', 'can_delete')
  const canExport = can('release-tracker', 'can_export')
  const canImport = can('release-tracker', 'can_import')
  const canViewHistory = can('release-tracker', 'can_view_history')
  const canConfigureDropdowns = can('release-tracker', 'can_configure_dropdowns')
  const canManagePermissions = can('release-tracker', 'can_manage_permissions')

  const { user, profile } = useAppStore()
  const currentUser = {
    name: (profile?.full_name || user?.user_metadata?.full_name || user?.email || 'QA Engineer') as string,
    id: user?.id
  }

  // Modals & Drawers state
  const [isAddEditOpen, setIsAddEditOpen] = useState(false)
  const [taskToEdit, setTaskToEdit] = useState<ReleaseTask | null>(null)
  const [isViewTaskOpen, setIsViewTaskOpen] = useState(false)
  const [taskToView, setTaskToView] = useState<ReleaseTask | null>(null)

  const [isTimeLogModalOpen, setIsTimeLogModalOpen] = useState(false)
  const [targetTimeLogTask, setTargetTimeLogTask] = useState<ReleaseTask | null>(null)

  const [isTimeLogDrawerOpen, setIsTimeLogDrawerOpen] = useState(false)
  const [targetDrawerTask, setTargetDrawerTask] = useState<ReleaseTask | null>(null)

  const [isHistoryDrawerOpen, setIsHistoryDrawerOpen] = useState(false)
  const [targetHistoryTaskId, setTargetHistoryTaskId] = useState<string | null>(null)

  const [isDropdownsOpen, setIsDropdownsOpen] = useState(false)
  const [isExportImportOpen, setIsExportImportOpen] = useState(false)
  const [exportImportTab, setExportImportTab] = useState<'export' | 'import'>('export')
  const [isPermsInfoOpen, setIsPermsInfoOpen] = useState(false)

  const {
    fetchInitialData,
    refreshData,
    loading,
    isRefreshing,
    deleteTask
  } = useReleaseTrackerStore()

  // Guard mount fetch to avoid double-invocation
  const hasFetched = useRef(false)
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchInitialData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handlers
  const handleViewTask = (task: ReleaseTask) => {
    setTaskToView(task)
    setIsViewTaskOpen(true)
  }

  const handleEditTask = (task: ReleaseTask) => {
    setTaskToEdit(task)
    setIsAddEditOpen(true)
  }

  const handleDeleteTask = async (task: ReleaseTask) => {
    const isConfirmed = await confirm({
      title: `Delete Release Task ${task.task_id}?`,
      description: `Are you sure you want to delete task "${task.description.slice(0, 40)}..." for ${task.product_name} (${task.release_version})? This action will be recorded in the audit history.`,
      confirmLabel: 'Delete Task',
      cancelLabel: 'Cancel',
      tone: 'danger'
    })

    if (isConfirmed) {
      try {
        await deleteTask(task.id, currentUser)
        toast({
          title: 'Task Deleted',
          description: `Successfully removed ${task.task_id}`
        })
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Delete Failed',
          description: err.message || 'Could not delete release task'
        })
      }
    }
  }

  const handleLogHours = (task: ReleaseTask) => {
    setTargetTimeLogTask(task)
    setIsTimeLogModalOpen(true)
  }

  const handleViewTimeLogs = (task: ReleaseTask) => {
    setTargetDrawerTask(task)
    setIsTimeLogDrawerOpen(true)
  }

  const handleViewHistory = (taskId?: string) => {
    setTargetHistoryTaskId(taskId || null)
    setIsHistoryDrawerOpen(true)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        <p className="text-xs text-text-muted">Loading Release Task Tracker from Project Hub...</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* ── Page Header & Top Toolbar ───────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent shadow-sm">
              <Rocket className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                  Release Task Tracker
                </h1>
                <Badge variant="outline" className="text-[10px] uppercase font-semibold tracking-wider bg-accent/10 text-accent border-accent/20">
                  QA Operations Hub
                </Badge>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Release task velocity, schedule tracking, and cumulative effort logs integrated with Project Hub
              </p>
            </div>
          </div>
        </div>

        {/* Toolbar Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Refresh button */}
          <button
            type="button"
            onClick={refreshData}
            disabled={isRefreshing}
            title="Refresh Data & Sync Project Hub"
            className="p-2.5 rounded-xl border border-white/10 bg-surface-elevated hover:bg-surface text-text-muted hover:text-text-primary transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
          </button>

          {/* Permissions Info */}
          <button
            type="button"
            onClick={() => setIsPermsInfoOpen(true)}
            className="h-9 px-3 rounded-xl border border-white/10 bg-surface-elevated hover:bg-surface text-xs font-semibold text-text-muted hover:text-text-primary transition-all flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5 text-accent" />
            Permissions
          </button>

          {/* Audit History (Requirement 20) */}
          {canViewHistory && (
            <button
              type="button"
              onClick={() => handleViewHistory()}
              className="h-9 px-3 rounded-xl border border-white/10 bg-surface-elevated hover:bg-surface text-xs font-semibold text-text-muted hover:text-cyan-400 transition-all flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              Audit History
            </button>
          )}

          {/* Configure Dropdowns (Requirements 13 & 14) */}
          {canConfigureDropdowns && (
            <button
              type="button"
              onClick={() => setIsDropdownsOpen(true)}
              className="h-9 px-3 rounded-xl border border-white/10 bg-surface-elevated hover:bg-surface text-xs font-semibold text-text-muted hover:text-purple-400 transition-all flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              Configure Dropdowns
            </button>
          )}

          {/* Export / Import (Requirement 22) */}
          {(canExport || canImport) && (
            <div className="flex items-center gap-1 border border-white/10 rounded-xl p-0.5 bg-surface-elevated">
              {canExport && (
                <button
                  type="button"
                  onClick={() => {
                    setExportImportTab('export')
                    setIsExportImportOpen(true)
                  }}
                  className="h-8 px-2.5 rounded-lg hover:bg-surface text-xs font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  Export
                </button>
              )}
              {canImport && (
                <button
                  type="button"
                  onClick={() => {
                    setExportImportTab('import')
                    setIsExportImportOpen(true)
                  }}
                  className="h-8 px-2.5 rounded-lg hover:bg-surface text-xs font-medium text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-400" />
                  Import
                </button>
              )}
            </div>
          )}

          {/* Add Release Task (Requirement 9) */}
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setTaskToEdit(null)
                setIsAddEditOpen(true)
              }}
              className="h-9 px-4 rounded-xl text-xs font-bold bg-accent hover:bg-accent-hover text-white transition-all shadow-md shadow-accent/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              + Add Release Task
            </button>
          )}
        </div>
      </div>

      {/* ── Section 1: MANAGER LIVE DASHBOARD ──────────────────────────────── */}
      {/* Requirement 3: Dedicated permission 'View Release Task Dashboard' */}
      {canViewDashboard ? (
        <section aria-label="Manager Release Dashboard">
          <ReleaseManagerDashboard />
        </section>
      ) : (
        <div className="p-4 rounded-xl border border-white/10 bg-surface/50 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-text-muted" />
            <span>
              Manager Release Dashboard is hidden for your current role. (Requires <strong>View Release Task Dashboard</strong> permission).
            </span>
          </div>
          <button
            type="button"
            onClick={() => setIsPermsInfoOpen(true)}
            className="text-accent hover:underline text-xs"
          >
            Check Permissions
          </button>
        </div>
      )}

      {/* ── Section 2: MAIN RELEASE TASK TABLE ───────────────────────────────── */}
      <section aria-label="Release Task Register" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              Release Task Register
            </h2>
            <p className="text-xs text-text-muted">
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
        />
      </section>

      {/* ── Modals & Drawers ────────────────────────────────────────────────── */}
      {/* Add / Edit Task Modal */}
      <AddEditReleaseTaskModal
        isOpen={isAddEditOpen}
        taskToEdit={taskToEdit}
        onClose={() => setIsAddEditOpen(false)}
        onOpenTimeLog={(task) => {
          setIsAddEditOpen(false)
          handleLogHours(task)
        }}
      />

      {/* View Task Modal */}
      <ViewReleaseTaskModal
        isOpen={isViewTaskOpen}
        task={taskToView}
        onClose={() => {
          setIsViewTaskOpen(false)
          setTaskToView(null)
        }}
        onLogHours={(task) => {
          setIsViewTaskOpen(false)
          handleLogHours(task)
        }}
        onEditTask={(task) => {
          setIsViewTaskOpen(false)
          handleEditTask(task)
        }}
      />

      {/* Add Time Log Modal */}
      <AddReleaseTimeLogModal
        isOpen={isTimeLogModalOpen}
        task={targetTimeLogTask}
        onClose={() => {
          setIsTimeLogModalOpen(false)
          setTargetTimeLogTask(null)
        }}
      />

      {/* Time Log Drawer */}
      <ReleaseTimeLogDrawer
        isOpen={isTimeLogDrawerOpen}
        task={targetDrawerTask}
        onClose={() => {
          setIsTimeLogDrawerOpen(false)
          setTargetDrawerTask(null)
        }}
        onAddHours={(task) => {
          setTargetTimeLogTask(task)
          setIsTimeLogModalOpen(true)
        }}
      />

      {/* Audit History Drawer */}
      <ReleaseAuditHistoryDrawer
        isOpen={isHistoryDrawerOpen}
        targetTaskId={targetHistoryTaskId}
        onClose={() => setIsHistoryDrawerOpen(false)}
      />

      {/* Configurable Dropdowns Modal */}
      <ReleaseConfigurableDropdownsModal
        isOpen={isDropdownsOpen}
        onClose={() => setIsDropdownsOpen(false)}
      />

      {/* Export / Import Modal */}
      <ReleaseExportImportModal
        isOpen={isExportImportOpen}
        initialTab={exportImportTab}
        onClose={() => setIsExportImportOpen(false)}
      />

      {/* Permissions Info Modal */}
      <ReleasePermissionsInfoModal
        isOpen={isPermsInfoOpen}
        onClose={() => setIsPermsInfoOpen(false)}
      />
    </div>
  )
}
export default ReleaseTaskTracker
