// src/modules/SupportIssueTracker/index.tsx

import React, { useEffect, useRef, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  LifeBuoy, Plus, Settings2, History, Download, Upload, RefreshCw, Shield,
  CheckCircle2, AlertTriangle, Layers
} from 'lucide-react'
import { ROUTES } from '@/lib/routes'
import { usePermissions } from '@/hooks/usePermissions'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { useAppStore } from '@/store/useAppStore'
import { useSupportTrackerStore } from './store'
import { ManagerLiveDashboard } from './components/ManagerLiveDashboard'
import { SupportIssueTable } from './components/SupportIssueTable'
import { AddEditIssueModal } from './components/AddEditIssueModal'
import { AuditHistoryDrawer } from './components/AuditHistoryDrawer'
import { ExportImportModal } from './components/ExportImportModal'
import { PermissionsInfoModal } from './components/PermissionsInfoModal'
import { AddTimeLogModal } from './components/AddTimeLogModal'
import { TimeLogDrawer } from './components/TimeLogDrawer'
import type { SupportIssue, SupportFilters } from './types'
import type { RowIssue } from '@/modules/DailyUpdateReport/components/ValidationTooltip'

export function SupportIssueTracker() {
  const { toast } = useToast()
  const confirm = useConfirm()
  const { can, canView, permissionsLoaded } = usePermissions()
  const { user, profile } = useAppStore()
  const [searchParams] = useSearchParams()

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
  const [isHistoryOpen, setIsHistoryOpen]         = useState(false)
  const [historyTargetId, setHistoryTargetId]     = useState<string | null>(null)
  const [isExportOpen, setIsExportOpen]           = useState(false)
  const [isImportOpen, setIsImportOpen]           = useState(false)
  const [isPermsInfoOpen, setIsPermsInfoOpen]     = useState(false)
  const [rowImportIssues, setRowImportIssues]     = useState<Map<string, RowIssue[]>>(new Map())
  const [importSummary, setImportSummary]         = useState<{ total: number; clean: number; withIssues: number; totalIssues: number } | null>(null)
  const [isAddHoursOpen, setIsAddHoursOpen]       = useState(false)
  const [addHoursTarget, setAddHoursTarget]       = useState<SupportIssue | null>(null)
  const [isTimeLogDrawerOpen, setIsTimeLogDrawerOpen] = useState(false)
  const [timeLogTarget, setTimeLogTarget]         = useState<SupportIssue | null>(null)

  const navigate = useNavigate()

  const {
    fetchInitialData, refreshData, loading, isRefreshing,
    deleteIssue, bulkDeleteIssues, bulkUpdateIssues, issues, setFilters, setSelectedProduct,
    filters, products
  } = useSupportTrackerStore()

  // Fetch on mount. The store's loading flag prevents duplicate in-flight fetches.
  // hasFetched ref prevents double-invoke in React StrictMode dev.
  const hasFetched = useRef(false)
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchInitialData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Apply URL query parameter filters
  useEffect(() => {
    const statusParam = searchParams.get('status')
    const searchParam = searchParams.get('search')
    const overrunParam = searchParams.get('overrun')
    const productParam = searchParams.get('productId')

    const filterUpdates: Partial<SupportFilters> = {}
    if (statusParam === 'open') {
      filterUpdates.testingStatus = ['Not Started', 'Assigned', 'In Testing', 'Blocked', 'Retesting']
    } else if (statusParam === 'in_testing') {
      filterUpdates.testingStatus = ['In Testing', 'Retesting']
    } else if (statusParam === 'overdue') {
      filterUpdates.overdueOnly = true
    }

    if (overrunParam === 'true') filterUpdates.overrunOnly = true
    if (searchParam) filterUpdates.searchQuery = searchParam
    if (productParam) setSelectedProduct(productParam)

    if (Object.keys(filterUpdates).length > 0) {
      setFilters(filterUpdates)
    }
  }, [searchParams, setFilters, setSelectedProduct])

  // Handle StoryPot import
  const [storyPotImportData, setStoryPotImportData] = useState<any[] | null>(null)
  useEffect(() => {
    if (searchParams.get('import') === 'storypot') {
      const raw = sessionStorage.getItem('storypot_export_support')
      if (raw) {
        try {
          const data = JSON.parse(raw)
          if (Array.isArray(data) && data.length > 0) {
            setStoryPotImportData(data)
            sessionStorage.removeItem('storypot_export_support')
          }
        } catch { /* ignore */ }
      }
    }
  }, [searchParams])

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
        <div className="w-9 h-9 border-2 border-accent/20 border-t-accent rounded-full animate-spin" />
        <p className="text-xs font-medium text-text-muted">Loading Support Issue Tracker...</p>
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
            <LifeBuoy className="w-3.5 h-3.5" />
          </div>
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm sm:text-base font-bold tracking-tight text-text-primary whitespace-nowrap">
              Support Issue Tracker
            </h1>
            <span className="text-[10px] sm:text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-secondary/70 text-text-muted border border-border/40 whitespace-nowrap">
              {issues.length} {issues.length === 1 ? 'record' : 'records'}
            </span>
          </div>
        </div>

        {/* Right: Minimal Toolbar (Single-row icons & compact buttons) */}
        <div className="flex items-center gap-1.5 overflow-x-auto shrink-0 ml-auto">
          <button
            type="button"
            onClick={refreshData}
            disabled={isRefreshing}
            title="Refresh Data"
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

          {permissionsLoaded && canConfigureDropdowns && (() => {
            const pid = filters.selectedProductId !== 'all' ? filters.selectedProductId : products[0]?.id
            return pid ? (
              <button
                type="button"
                onClick={() => navigate(`${ROUTES.projectHub}/${pid}/dropdown-config`)}
                title="Configure Dropdowns (Project Hub)"
                className="h-7.5 px-2 sm:px-2.5 rounded-lg border border-border/50 text-xs font-medium text-text-muted hover:text-purple-400 hover:bg-surface-elevated/80 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Settings2 className="w-3.5 h-3.5 text-purple-400" />
                <span className="hidden lg:inline">Dropdowns</span>
              </button>
            ) : null
          })()}

          {permissionsLoaded && canExport && (
            <button
              type="button"
              onClick={() => setIsExportOpen(true)}
              title="Export Issues CSV"
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
              title="Import Issues CSV"
              className="h-7.5 px-2 sm:px-2.5 rounded-lg border border-border/50 text-xs font-medium text-text-muted hover:text-blue-400 hover:bg-surface-elevated/80 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">Import</span>
            </button>
          )}

          {permissionsLoaded && canCreate && (
            <button
              type="button"
              onClick={() => { setIssueToEdit(null); setIsAddEditOpen(true) }}
              className="h-7.5 px-2.5 sm:px-3 rounded-lg text-xs font-semibold bg-accent hover:bg-accent-hover text-white transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-95 shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Issue</span>
            </button>
          )}
        </div>
      </div>

      {/* ── StoryPot Import Panel ── */}
      {storyPotImportData && storyPotImportData.length > 0 && (
        <div className="rounded-xl border border-accent/30 bg-accent/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-accent" />
              <h3 className="text-sm font-semibold text-text-primary">StoryPot Import</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-accent/20 text-accent font-medium">
                {storyPotImportData.length} {storyPotImportData.length === 1 ? 'item' : 'items'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setStoryPotImportData(null)}
              className="text-xs text-text-muted hover:text-text-primary"
            >
              Dismiss
            </button>
          </div>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {storyPotImportData.map((item, idx) => (
              <div key={item.openproject_id || idx} className="flex items-center justify-between p-2.5 rounded-lg bg-surface border border-border/50">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-text-primary truncate">{item.description}</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    OpenProject #{item.openproject_id} • {item.product_name || 'Unknown Product'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIssueToEdit(null)
                    // Pre-fill will be handled by passing initialData to modal
                    sessionStorage.setItem('storypot_prefill_support', JSON.stringify(item))
                    setIsAddEditOpen(true)
                    setStoryPotImportData(prev => prev?.filter((_, i) => i !== idx) || null)
                  }}
                  className="ml-3 px-3 py-1.5 rounded-md text-xs font-medium bg-accent/20 text-accent hover:bg-accent/30 transition-colors"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Manager Dashboard Section ── */}
      {canViewDashboard ? (
        <section aria-label="Manager Live Dashboard">
          <ManagerLiveDashboard />
        </section>
      ) : (
        <div className="p-4 rounded-xl border border-border/50 bg-surface/60 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-text-muted" />
            <span>Manager Live Dashboard requires <strong>View Support Dashboard</strong> permission.</span>
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

      {/* ── Main Issue Register Section ── */}
      <section aria-label="Support Issue Tracker Table" className="space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 px-1">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-text-primary tracking-tight">Support Issue Register</h2>
              <span className="text-xs px-2 py-0.5 rounded-full font-mono bg-surface-secondary border border-border/50 text-text-secondary">
                {issues.length} {issues.length === 1 ? 'issue' : 'issues'}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              Comprehensive QA defect register with live effort formulas, locks, and progressive time tracking
            </p>
          </div>
        </div>

        <SupportIssueTable
          onEditIssue={handleEditIssue}
          onDeleteIssue={handleDeleteIssue}
          onViewHistory={handleViewHistory}
          onLogHours={handleLogHours}
          onViewTimeLogs={handleViewTimeLogs}
          onBulkDelete={handleBulkDelete}
          onBulkUpdate={async (ids, field, value) => {
            const result = await bulkUpdateIssues(ids, field, value, currentUser)
            const fieldLabel = field.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
            if (result.failed === 0) {
              toast({ title: 'Bulk Update Complete', description: `Updated ${fieldLabel} for ${result.updated} ${result.updated === 1 ? 'record' : 'records'}.` })
            } else if (result.updated > 0) {
              toast({ variant: 'destructive', title: 'Partial Update', description: `Updated ${result.updated}, failed ${result.failed}.` })
            } else {
              toast({ variant: 'destructive', title: 'Update Failed', description: 'No records were updated.' })
            }
            return result
          }}
        />
      </section>

      {/* ── Modals & Drawers (All Preserved) ── */}
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



      <AuditHistoryDrawer isOpen={isHistoryOpen} targetIssueId={historyTargetId} onClose={() => setIsHistoryOpen(false)} />

      <ExportImportModal key="support-export" isOpen={isExportOpen} initialTab="export" onClose={() => setIsExportOpen(false)} />
      <ExportImportModal key="support-import" isOpen={isImportOpen} initialTab="import" onClose={() => setIsImportOpen(false)}
        onImportComplete={(issues, summary) => {
          setRowImportIssues(issues)
          setImportSummary(summary)
        }}
      />

      {importSummary && (
        <div className={`flex items-start justify-between gap-3 px-4 py-3 rounded-xl border text-xs ${
          importSummary.withIssues > 0
            ? 'bg-amber-500/[0.06] border-amber-500/25 text-amber-200'
            : 'bg-emerald-500/[0.06] border-emerald-500/25 text-emerald-200'
        }`}>
          <div className="space-y-0.5">
            <p className="font-bold">{importSummary.withIssues > 0 ? '⚠ Import Completed with Issues' : '✓ Import Completed'}</p>
            <p className="text-[11px] opacity-80">
              {importSummary.total} rows imported · {importSummary.clean} clean · {importSummary.withIssues} with issues · {importSummary.totalIssues} total issues
            </p>
            {importSummary.withIssues > 0 && (
              <p className="text-[10px] opacity-60">Click the ⚠ icon on affected rows to view details. Data was imported as-is.</p>
            )}
          </div>
          <button type="button" onClick={() => setImportSummary(null)} className="shrink-0 opacity-50 hover:opacity-100 transition-opacity mt-0.5 text-current">✕</button>
        </div>
      )}

      <PermissionsInfoModal isOpen={isPermsInfoOpen} onClose={() => setIsPermsInfoOpen(false)} />
    </div>
  )
}

