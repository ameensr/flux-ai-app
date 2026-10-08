// src/modules/SupportIssueTracker/index.tsx
// Main entry point for Support Issue Tracker Module
// Enterprise QA / Support tracking system with two main sections:
// 1. Manager Live Dashboard (Permission: 'can_view_dashboard')
// 2. Support Issue Tracker (Permission: 'can_view')

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  LifeBuoy, Plus, Sliders, History, Download, Upload, RefreshCw,
  Shield, Layers, FolderKanban, AlertCircle
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
  const { can, canView } = usePermissions()

  // Granular Permissions
  const canViewTracker = canView('support-tracker')
  const canViewDashboard = can('support-tracker', 'can_view_dashboard')
  const canCreate = can('support-tracker', 'can_create')
  const canEdit = can('support-tracker', 'can_edit')
  const canDelete = can('support-tracker', 'can_delete')
  const canExport = can('support-tracker', 'can_export')
  const canImport = can('support-tracker', 'can_import')
  const canViewHistory = can('support-tracker', 'can_view_history')
  const canConfigureDropdowns = can('support-tracker', 'can_configure_dropdowns')
  const canManagePermissions = can('support-tracker', 'can_manage_permissions')

  const { user, profile } = useAppStore()
  const currentUser = {
    name: (profile?.full_name || user?.user_metadata?.full_name || user?.email || 'System User') as string,
    id: user?.id
  }

  // Modal visibility states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false)
  const [issueToEdit, setIssueToEdit] = useState<SupportIssue | null>(null)
  const [isDropdownsOpen, setIsDropdownsOpen] = useState(false)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false)
  const [historyTargetId, setHistoryTargetId] = useState<string | null>(null)
  const [isExportImportOpen, setIsExportImportOpen] = useState(false)
  const [exportImportTab, setExportImportTab] = useState<'export' | 'import'>('export')
  const [isPermsInfoOpen, setIsPermsInfoOpen] = useState(false)

  // Time logging modal states
  const [isAddHoursOpen, setIsAddHoursOpen] = useState(false)
  const [addHoursTargetIssue, setAddHoursTargetIssue] = useState<SupportIssue | null>(null)
  const [isTimeLogDrawerOpen, setIsTimeLogDrawerOpen] = useState(false)
  const [timeLogTargetIssue, setTimeLogTargetIssue] = useState<SupportIssue | null>(null)

  const {
    fetchInitialData,
    refreshData,
    loading,
    isRefreshing,
    deleteIssue,
    products
  } = useSupportTrackerStore()

  // Use a ref to ensure fetchInitialData is only called once on mount
  const hasFetched = useRef(false)
  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchInitialData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle Edit Issue
  const handleEditIssue = (issue: SupportIssue) => {
    setIssueToEdit(issue)
    setIsAddEditOpen(true)
  }

  // Handle Delete Issue
  const handleDeleteIssue = async (issue: SupportIssue) => {
    const isConfirmed = await confirm({
      title: `Delete Support Issue ${issue.issue_id}?`,
      description: `Are you sure you want to delete this issue for product "${issue.product_name}"? This action will be recorded in the audit history.`,
      confirmLabel: 'Delete Issue',
      cancelLabel: 'Cancel',
      tone: 'danger'
    })

    if (isConfirmed) {
      try {
        await deleteIssue(issue.id, currentUser)
        toast({
          title: 'Issue Deleted',
          description: `Successfully removed ${issue.issue_id}`
        })
      } catch (err: any) {
        toast({
          variant: 'destructive',
          title: 'Delete Failed',
          description: err.message || 'Could not delete issue'
        })
      }
    }
  }

  // Handle View History
  const handleViewHistory = (issue?: SupportIssue) => {
    setHistoryTargetId(issue?.issue_id || null)
    setIsHistoryOpen(true)
  }

  // Handle Log Work Hours (Incremental Time Log)
  const handleLogHours = (issue: SupportIssue) => {
    setAddHoursTargetIssue(issue)
    setIsAddHoursOpen(true)
  }

  // Handle View Time Log History Drawer
  const handleViewTimeLogs = (issue: SupportIssue) => {
    setTimeLogTargetIssue(issue)
    setIsTimeLogDrawerOpen(true)
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        <p className="text-xs text-text-muted">Loading Support Issue Tracker from Project Hub...</p>
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
              <LifeBuoy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight text-text-primary">
                  Support Issue Tracker
                </h1>
                <Badge variant="outline" className="text-[10px] uppercase font-semibold tracking-wider bg-accent/10 text-accent border-accent/20">
                  Enterprise QA
                </Badge>
              </div>
              <p className="text-xs text-text-muted mt-0.5">
                Dynamic QA & support tracking system integrated with Project Hub as single source of truth
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

          {/* Permissions Info / Manage */}
          <button
            type="button"
            onClick={() => setIsPermsInfoOpen(true)}
            className="h-9 px-3 rounded-xl border border-white/10 bg-surface-elevated hover:bg-surface text-xs font-semibold text-text-muted hover:text-text-primary transition-all flex items-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5 text-accent" />
            Permissions
          </button>

          {/* Audit History (Requirement 14) */}
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

          {/* Configure Dropdowns (Requirement 12) */}
          {canConfigureDropdowns && (
            <button
              type="button"
              onClick={() => setIsDropdownsOpen(true)}
              className="h-9 px-3 rounded-xl border border-white/10 bg-surface-elevated hover:bg-surface text-xs font-semibold text-text-muted hover:text-text-primary transition-all flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-purple-400" />
              Configure Dropdowns
            </button>
          )}

          {/* Export / Import (Requirement 15) */}
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

          {/* Add Support Issue (Requirement 11) */}
          {canCreate && (
            <button
              type="button"
              onClick={() => {
                setIssueToEdit(null)
                setIsAddEditOpen(true)
              }}
              className="h-9 px-4 rounded-xl text-xs font-bold bg-accent hover:bg-accent-hover text-white transition-all shadow-md shadow-accent/20 flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Add Support Issue
            </button>
          )}
        </div>
      </div>

      {/* ── Section 1: MANAGER LIVE DASHBOARD ──────────────────────────────── */}
      {/* Requirement 2: Dedicated permission 'View Support Dashboard' */}
      {canViewDashboard ? (
        <section aria-label="Manager Live Dashboard">
          <ManagerLiveDashboard />
        </section>
      ) : (
        <div className="p-4 rounded-xl border border-white/10 bg-surface/50 flex items-center justify-between text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-text-muted" />
            <span>
              Manager Live Dashboard is hidden for your current role. (Requires <strong>View Support Dashboard</strong> permission).
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

      {/* ── Section 2: SUPPORT ISSUE TRACKER TABLE ─────────────────────────── */}
      <section aria-label="Support Issue Tracker Table" className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-text-primary">
              Support Issue Register
            </h2>
            <p className="text-xs text-text-muted">
              Detailed tracking table with automatic Sl. No., progressive time logging, and live calculations
            </p>
          </div>
        </div>

        <SupportIssueTable
          onEditIssue={handleEditIssue}
          onDeleteIssue={handleDeleteIssue}
          onViewHistory={handleViewHistory}
          onLogHours={handleLogHours}
          onViewTimeLogs={handleViewTimeLogs}
        />
      </section>

      {/* ── Modals & Drawers ────────────────────────────────────────────────── */}
      {/* Add / Edit Modal */}
      <AddEditIssueModal
        isOpen={isAddEditOpen}
        issueToEdit={issueToEdit}
        onClose={() => setIsAddEditOpen(false)}
      />

      {/* Add Time Log Modal */}
      <AddTimeLogModal
        isOpen={isAddHoursOpen}
        issue={addHoursTargetIssue}
        onClose={() => {
          setIsAddHoursOpen(false)
          setAddHoursTargetIssue(null)
        }}
      />

      {/* Time Log Drawer */}
      <TimeLogDrawer
        isOpen={isTimeLogDrawerOpen}
        issue={timeLogTargetIssue}
        onClose={() => {
          setIsTimeLogDrawerOpen(false)
          setTimeLogTargetIssue(null)
        }}
        onAddHours={(issue: SupportIssue) => {
          setAddHoursTargetIssue(issue)
          setIsAddHoursOpen(true)
        }}
      />

      {/* Configurable Dropdowns Modal */}
      <ConfigurableDropdownsModal
        isOpen={isDropdownsOpen}
        onClose={() => setIsDropdownsOpen(false)}
      />

      {/* Audit History Drawer */}
      <AuditHistoryDrawer
        isOpen={isHistoryOpen}
        targetIssueId={historyTargetId}
        onClose={() => setIsHistoryOpen(false)}
      />

      {/* Export / Import Modal */}
      <ExportImportModal
        isOpen={isExportImportOpen}
        initialTab={exportImportTab}
        onClose={() => setIsExportImportOpen(false)}
      />

      {/* Permissions Info Modal */}
      <PermissionsInfoModal
        isOpen={isPermsInfoOpen}
        onClose={() => setIsPermsInfoOpen(false)}
      />
    </div>
  )
}
