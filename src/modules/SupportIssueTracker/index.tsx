// src/modules/SupportIssueTracker/index.tsx

import React, { useEffect, useRef, useState } from 'react'
import {
  LifeBuoy, Plus, Sliders, History, Download, Upload, RefreshCw, Shield
} from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/useAppStore'
import { useSupportTrackerStore } from './store'
import { ManagerLiveDashboard } from './components/ManagerLiveDashboard'
import { SupportIssueTable } from './components/SupportIssueTable'
import { AddEditIssueModal } from './components/AddEditIssueModal'
import { ConfigurableDropdownsModal } from './components/ConfigurableDropdownsModal'
import { AuditHistoryDrawer } from './components/AuditHistoryDrawer'
import { ExportImportModal } from './components/ExportImportModal'
import { PermissionsInfoModal } from './components/PermissionsInfoModal'
import { AddTimeLogModal } from './components/AddTimeLogModal'
import { TimeLogDrawer } from './components/TimeLogDrawer'
import type { SupportIssue } from './types'

export function SupportIssueTracker() {
  const { toast } = useToast()
  const confirm = useConfirm()
  const { can, canView, permissionsLoaded } = usePermissions()
  const { user, profile } = useAppStore()

  // Granular Permissions — all gated behind permissionsLoaded
  const canViewDashboard    = can('support-tracker', 'can_view_dashboard')
  const canCreate           = can('support-tracker', 'can_create')
  const canDelete           = can('support-tracker', 'can_delete')
  const canExport           = can('support-tracker', 'can_export')
  const canImport           = can('support-tracker', 'can_import')
  const canViewHistory      = can('support-tracker', 'can_view_history')
  const canConfigureDropdowns = can('support-tracker', 'can_configure_dropdowns')

  const currentUser = {
    name: (profile?.full_name || user?.user_metadata?.full_name || user?.email || 'System User') as string,
    id: user?.id
  }

  // Modal states
  const [isAddEditOpen, setIsAddEditOpen]         = useState(false)
  const [issueToEdit, setIssueToEdit]             = useState<SupportIssue | null>(null)
  const [isDropdownsOpen, setIsDropdownsOpen]     = useState(false)
  const [isHistoryOpen, setIsHistoryOpen]         = useState(false)
  const [historyTargetId, setHistoryTargetId]     = useState<string | null>(null)
  const [isExportOpen, setIsExportOpen]           = useState(false)
  const [isImportOpen, setIsImportOpen]           = useState(false)
  const [isPermsInfoOpen, setIsPermsInfoOpen]     = useState(false)
  const [isAddHoursOpen, setIsAddHoursOpen]       = useState(false)
  const [addHoursTarget, setAddHoursTarget]       = useState<SupportIssue | null>(null)
  const [isTimeLogDrawerOpen, setIsTimeLogDrawerOpen] = useState(false)
  const [timeLogTarget, setTimeLogTarget]         = useState<SupportIssue | null>(null)

  const { fetchInitialData, refreshData, loading, isRefreshing, deleteIssue, bulkDeleteIssues } = useSupportTrackerStore()

  // Fetch on mount; reset on unmount so revisiting the page re-fetches fresh data
  const hasFetched = useRef(false)
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchInitialData()
    return () => { hasFetched.current = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleEditIssue = (issue: SupportIssue) => { setIssueToEdit(issue); setIsAddEditOpen(true) }

  const handleDeleteIssue = async (issue: SupportIssue) => {
    const ok = await confirm({
      title: `Delete Support Issue ${issue.issue_id}?`,
      description: `Are you sure you want to delete this issue for "${issue.product_name}"? This will be recorded in audit history.`,
      confirmLabel: 'Delete Issue', cancelLabel: 'Cancel', tone: 'danger'
    })
    if (!ok) return
    try {
      await deleteIssue(issue.id, currentUser)
      toast({ title: 'Issue Deleted', description: `Removed ${issue.issue_id}` })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: err.message || 'Could not delete issue' })
    }
  }

  const handleBulkDelete = async (ids: string[]) => {
    if (!canDelete) {
      toast({ variant: 'destructive', title: 'Permission Denied', description: 'You do not have permission to delete these records.' })
      return
    }
    const ok = await confirm({
      title: `Delete Selected Support Issues?`,
      description: `You are about to delete ${ids.length} selected support ${ids.length === 1 ? 'issue' : 'issues'}. This action may affect related time logs and records. Please confirm before proceeding.`,
      confirmLabel: `Delete ${ids.length} ${ids.length === 1 ? 'Issue' : 'Issues'}`,
      cancelLabel: 'Cancel',
      tone: 'danger'
    })
    if (!ok) return
    try {
      const result = await bulkDeleteIssues(ids, currentUser)
      if (result.failed.length === 0) {
        toast({ title: 'Bulk Delete Complete', description: `Successfully deleted ${result.deleted.length} support ${result.deleted.length === 1 ? 'issue' : 'issues'}.` })
      } else if (result.deleted.length > 0) {
        toast({ variant: 'destructive', title: 'Partial Delete', description: `Deleted ${result.deleted.length}, failed ${result.failed.length}. Review and try again.` })
      } else {
        toast({ variant: 'destructive', title: 'Delete Failed', description: 'Unable to delete the selected records. Please try again.' })
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: err.message || 'Unable to delete the selected records.' })
    }
  }

  const handleViewHistory  = (issue?: SupportIssue) => { setHistoryTargetId(issue?.issue_id || null); setIsHistoryOpen(true) }
  const handleLogHours     = (issue: SupportIssue)  => { setAddHoursTarget(issue); setIsAddHoursOpen(true) }
  const handleViewTimeLogs = (issue: SupportIssue)  => { setTimeLogTarget(issue); setIsTimeLogDrawerOpen(true) }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        <p className="text-xs text-text-muted">Loading Support Issue Tracker...</p>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 lg:p-8 space-y-8 max-w-[1600px] mx-auto">
      {/* ── Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent shadow-sm">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">Support Issue Tracker</h1>
              <Badge variant="outline" className="text-[10px] uppercase font-semibold tracking-wider bg-accent/10 text-accent border-accent/20">
                Enterprise QA
              </Badge>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Dynamic QA & support tracking integrated with Project Hub
            </p>
          </div>
        </div>

        {/* Toolbar — only render permission-gated buttons after permissions are loaded */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button" onClick={refreshData} disabled={isRefreshing}
            title="Refresh Data"
            className="p-2.5 rounded-xl border border-white/10 bg-surface-elevated hover:bg-surface text-text-muted hover:text-text-primary transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-accent' : ''}`} />
          </button>

          <button
            type="button" onClick={() => setIsPermsInfoOpen(true)}
            className="h-9 px-3 rounded-xl border border-white/10 bg-surface-elevated hover:bg-surface text-xs font-semibold text-text-muted hover:text-text-primary transition-all flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5 text-accent" />
            Permissions
          </button>

          {permissionsLoaded && canViewHistory && (
            <button
              type="button" onClick={() => handleViewHistory()}
              className="h-9 px-3 rounded-xl border border-white/10 bg-surface-elevated hover:bg-surface text-xs font-semibold text-text-muted hover:text-cyan-400 transition-all flex items-center gap-1.5"
            >
              <History className="w-3.5 h-3.5 text-cyan-400" />
              Audit History
            </button>
          )}

          {permissionsLoaded && canConfigureDropdowns && (
            <button
              type="button" onClick={() => setIsDropdownsOpen(true)}
              className="h-9 px-3 rounded-xl border border-white/10 bg-surface-elevated hover:bg-surface text-xs font-semibold text-text-muted hover:text-purple-400 transition-all flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              Configure Dropdowns
            </button>
          )}

          {/* Export — separate standalone button */}
          {permissionsLoaded && canExport && (
            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              className="h-9 px-3 rounded-xl border border-white/10 bg-surface-elevated hover:bg-surface text-xs font-semibold text-text-muted hover:text-emerald-400 transition-all flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              Export
            </button>
          )}

          {/* Import — separate standalone button */}
          {permissionsLoaded && canImport && (
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="h-9 px-3 rounded-xl border border-white/10 bg-surface-elevated hover:bg-surface text-xs font-semibold text-text-muted hover:text-blue-400 transition-all flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              Import
            </button>
          )}

          {permissionsLoaded && canCreate && (
            <button
              type="button"
              onClick={() => { setIssueToEdit(null); setIsAddEditOpen(true) }}
              className="h-9 px-4 rounded-xl text-xs font-bold bg-accent hover:bg-accent-hover text-white transition-all shadow-md shadow-accent/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Support Issue
            </button>
          )}
        </div>
      </div>

      {/* ── Manager Dashboard ── */}
      {canViewDashboard ? (
        <section aria-label="Manager Live Dashboard">
          <ManagerLiveDashboard />
        </section>
      ) : (
        <div className="p-4 rounded-xl border border-white/10 bg-surface/50 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-text-muted" />
            <span>Manager Live Dashboard requires <strong>View Support Dashboard</strong> permission.</span>
          </div>
          <button type="button" onClick={() => setIsPermsInfoOpen(true)} className="text-accent hover:underline text-xs">
            Check Permissions
          </button>
        </div>
      )}

      {/* ── Issue Table ── */}
      <section aria-label="Support Issue Tracker Table" className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-text-primary">Support Issue Register</h2>
          <p className="text-xs text-text-muted">Detailed tracking with progressive time logging and live calculations</p>
        </div>
        <SupportIssueTable
          onEditIssue={handleEditIssue}
          onDeleteIssue={handleDeleteIssue}
          onViewHistory={handleViewHistory}
          onLogHours={handleLogHours}
          onViewTimeLogs={handleViewTimeLogs}
          onBulkDelete={handleBulkDelete}
        />
      </section>

      {/* ── Modals & Drawers ── */}
      <AddEditIssueModal isOpen={isAddEditOpen} issueToEdit={issueToEdit} onClose={() => setIsAddEditOpen(false)} />

      <AddTimeLogModal
        isOpen={isAddHoursOpen} issue={addHoursTarget}
        onClose={() => { setIsAddHoursOpen(false); setAddHoursTarget(null) }}
      />

      <TimeLogDrawer
        isOpen={isTimeLogDrawerOpen} issue={timeLogTarget}
        onClose={() => { setIsTimeLogDrawerOpen(false); setTimeLogTarget(null) }}
        onAddHours={(issue: SupportIssue) => { setAddHoursTarget(issue); setIsAddHoursOpen(true) }}
      />

      <ConfigurableDropdownsModal isOpen={isDropdownsOpen} onClose={() => setIsDropdownsOpen(false)} />

      <AuditHistoryDrawer isOpen={isHistoryOpen} targetIssueId={historyTargetId} onClose={() => setIsHistoryOpen(false)} />

      <ExportImportModal key="support-export" isOpen={isExportOpen} initialTab="export" onClose={() => setIsExportOpen(false)} />
      <ExportImportModal key="support-import" isOpen={isImportOpen} initialTab="import" onClose={() => setIsImportOpen(false)} />

      <PermissionsInfoModal isOpen={isPermsInfoOpen} onClose={() => setIsPermsInfoOpen(false)} />
    </div>
  )
}
