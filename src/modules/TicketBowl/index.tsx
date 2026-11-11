// src/modules/TicketBowl/index.tsx
// Main Ticket Bowl module component

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Ticket, AlertCircle, ExternalLink, Settings } from 'lucide-react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { usePermissions } from '@/hooks/usePermissions'
import { useTicketBowl } from '@/hooks/useTicketBowl'
import { fetchOpenProjectProjects, type OpenProjectProject, type OpenProjectConfig } from '@/services/openproject'

import { TicketBowlHeader } from './TicketBowlHeader'
import { TicketBowlFiltersPanel } from './TicketBowlFiltersPanel'
import { TicketBowlStatsDashboard } from './TicketBowlStatsDashboard'
import { TicketBowlTable } from './TicketBowlTable'
import { TicketBowlPagination } from './TicketBowlPagination'
import { TicketForwardingHistoryModal } from './TicketForwardingHistoryModal'
import { QuickSearchResultsTable } from './QuickSearchResultsTable'
import { useBackgroundSync } from '@/hooks/useBackgroundSync'
import { SyncNotification } from '@/components/LazyPanda'

export default function TicketBowl() {
  const { can, canView: checkCanView, role } = usePermissions()
  const isAdmin = role === 'admin' || role === 'super_admin'

  // RBAC Permission checks for 'ticket-bowl'
  const canView = isAdmin || checkCanView('ticket-bowl')
  const canSync = isAdmin || can('ticket-bowl', 'can_import') // can_import represents Sync Data
  const canExport = isAdmin || can('ticket-bowl', 'can_export')
  const canViewDashboard = isAdmin || can('ticket-bowl', 'can_view_dashboard')
  const canViewHistory = isAdmin || can('ticket-bowl', 'can_view_history')

  // Projects State
  const [projects, setProjects] = useState<Array<{ id: string; name: string; metadata?: Record<string, unknown> }>>([])
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [loadingProjects, setLoadingProjects] = useState(true)

  // Sub-projects in OpenProject (for the selected project)
  const [opProjects, setOpProjects] = useState<OpenProjectProject[]>([])
  const [selectedOpProjectId, setSelectedOpProjectId] = useState<number | null>(null)

  // 1. Load Projects from Project Hub
  useEffect(() => {
    async function loadProjects() {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, metadata')
          .order('name', { ascending: true })

        if (!error && data) {
          setProjects(data)
          // Default to first project with OpenProject configured, or first project
          const configured = data.find(p => {
            const op = p.metadata?.openproject as OpenProjectConfig | undefined
            return Boolean(op?.openproject_url && op?.openproject_api_key)
          })
          if (configured) {
            setSelectedProjectId(configured.id)
          } else if (data.length > 0) {
            setSelectedProjectId(data[0].id)
          }
        }
      } catch (err) {
        console.error('[Ticket Bowl] Failed to load projects:', err)
      } finally {
        setLoadingProjects(false)
      }
    }
    loadProjects()
  }, [])

  // Currently selected project and its OpenProject configuration
  const currentProject = useMemo(() => {
    return projects.find(p => p.id === selectedProjectId)
  }, [projects, selectedProjectId])

  const opConfig = useMemo(() => {
    return (currentProject?.metadata?.openproject || null) as OpenProjectConfig | null
  }, [currentProject])

  const isOpConfigured = Boolean(opConfig?.openproject_url && opConfig?.openproject_api_key)

  // 2. Load OpenProject projects/sub-projects when configured
  useEffect(() => {
    let active = true
    async function loadOpProjects() {
      if (!opConfig?.openproject_url || !opConfig?.openproject_api_key) {
        setOpProjects([])
        setSelectedOpProjectId(null)
        return
      }

      try {
        const list = await fetchOpenProjectProjects(opConfig)
        if (active) {
          setOpProjects(list)
          // Default to configured openproject_project_id if set
          if (opConfig.openproject_project_id) {
            setSelectedOpProjectId(Number(opConfig.openproject_project_id))
          } else {
            setSelectedOpProjectId(null)
          }
        }
      } catch (err) {
        // Expected when OpenProject is not configured - suppress verbose error
        console.debug('[Ticket Bowl] Could not load OpenProject projects (not configured or unreachable):', err instanceof Error ? err.message : 'Network error')
      }
    }

    loadOpProjects()
    return () => {
      active = false
    }
  }, [opConfig])

  // Resolve current OpenProject project name
  const currentOpProjectName = useMemo(() => {
    if (!selectedOpProjectId) return null
    return opProjects.find(p => p.id === selectedOpProjectId)?.name || null
  }, [opProjects, selectedOpProjectId])

  // 3. Background Sync Hook (replaces old blocking sync)
  const {
    isSyncing,
    syncProgress,
    showSuccessNotification,
    showErrorNotification,
    syncResult,
    syncStatus,
    startSync,
    cancelSync,
    retrySync,
    dismissSuccessNotification,
    dismissErrorNotification,
    loadSyncStatus,
  } = useBackgroundSync({
    projectId: selectedProjectId,
    opProjectId: selectedOpProjectId,
    opProjectName: currentOpProjectName,
    config: opConfig,
    autoRestoreJob: true,
  })

  // 4. Ticket Bowl Hook for data fetching and operations (without sync)
  const {
    filters,
    setFilters,
    resetFilters,
    toggleViewUnavailableHistory,
    page,
    pageSize,
    setPage,
    setPageSize,
    tickets,
    total,
    totalPages,
    loading: ticketsLoading,
    stats,
    statsLoading,
    availableTypes,
    selectedTicketForHistory,
    historyEvents,
    testingStatusHistory,
    historyLoading,
    openHistoryModal,
    closeHistoryModal,
    selectedTicketIds,
    toggleSelectTicket,
    selectAllCurrentPage,
    clearSelection,
    exportToReleaseTracker,
    exportToSupportTracker,
    exportToCsv,
    refreshTickets: loadTickets,
    refreshStats: loadDashboardStats,
    // Quick Search
    quickSearchMode,
    toggleQuickSearchMode,
    quickSearchResults,
    quickSearchLoading,
    quickSearchProgress,
    quickSearchError,
    executeQuickSearch,
    clearQuickSearch,
  } = useTicketBowl({
    projectId: selectedProjectId,
    opProjectId: selectedOpProjectId,
    opProjectName: currentOpProjectName,
    config: opConfig,
    autoLoad: Boolean(selectedProjectId),
  })

  // Refresh data after successful sync
  useEffect(() => {
    if (showSuccessNotification) {
      // Reload ticket data and stats after successful sync
      loadSyncStatus()
      loadTickets()
      loadDashboardStats()
    }
  }, [showSuccessNotification, loadSyncStatus])

  // Permission Guard
  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 space-y-3">
        <div className="p-3 rounded-full bg-rose-500/10 text-rose-500">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-text-primary">Access Restricted</h2>
        <p className="text-xs text-text-muted max-w-sm">
          You do not have permission to view the Ticket Bowl module. Please contact your organization administrator.
        </p>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-5">
      {/* ── Header ── */}
      <TicketBowlHeader
        projects={projects}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        opProjects={opProjects}
        selectedOpProjectId={selectedOpProjectId}
        onSelectOpProject={setSelectedOpProjectId}
        syncStatus={syncStatus}
        syncing={isSyncing}
        syncProgress={syncProgress}
        onSync={startSync}
        onCancelSync={cancelSync}
        selectedCount={selectedTicketIds.size}
        onExportRelease={() => exportToReleaseTracker()}
        onExportSupport={() => exportToSupportTracker()}
        onExportCsv={exportToCsv}
        canSync={canSync}
        canExport={canExport}
      />

      {/* ── OpenProject Not Configured Banner ── */}
      {!isOpConfigured && !loadingProjects && (
        <div className="p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-text-primary">OpenProject Integration Not Configured</p>
              <p className="text-text-muted mt-0.5">
                The selected project does not have OpenProject credentials configured in Project Hub.
              </p>
            </div>
          </div>
          <Link
            to={`/project-hub/${selectedProjectId}`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-medium bg-amber-500/20 text-amber-600 dark:text-amber-400 hover:bg-amber-500/30 transition-colors shrink-0"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configure in Project Hub</span>
          </Link>
        </div>
      )}

      {/* ── Testing Status Dashboard ── */}
      {canViewDashboard && (
        <TicketBowlStatsDashboard
          stats={stats}
          loading={statsLoading}
          onFilterUnavailableHistory={toggleViewUnavailableHistory}
          isFilteringUnavailableHistory={filters.historyVerificationStatus === 'unavailable'}
        />
      )}

      {/* ── Primary & Secondary Filters ── */}
      <TicketBowlFiltersPanel
        filters={filters}
        onFilterChange={setFilters}
        onResetFilters={resetFilters}
        onToggleUnavailableHistory={toggleViewUnavailableHistory}
        availableTypes={availableTypes}
        availableStatuses={Object.keys(stats.statusCounts).length > 0
          ? Object.keys(stats.statusCounts).sort()
          : undefined}
        availableTestingStatuses={Object.keys(stats.currentTestingStatusCounts).length > 0
          ? Object.keys(stats.currentTestingStatusCounts).sort()
          : undefined}
        unavailableCount={stats.unavailableHistoryTickets}
        quickSearchMode={quickSearchMode}
        onToggleQuickSearchMode={toggleQuickSearchMode}
        onExecuteQuickSearch={executeQuickSearch}
        quickSearchLoading={quickSearchLoading}
        quickSearchProgress={quickSearchProgress}
      />

      {/* ── Quick Search Results (shown when in quick search mode with results) ── */}
      {quickSearchMode && (quickSearchResults.length > 0 || quickSearchError) && (
        <QuickSearchResultsTable
          results={quickSearchResults}
          loading={quickSearchLoading}
          error={quickSearchError}
          openprojectUrl={opConfig?.openproject_url}
          onClearResults={clearQuickSearch}
        />
      )}

      {/* ── Results Table (hidden when showing quick search results) ── */}
      {(!quickSearchMode || (quickSearchMode && quickSearchResults.length === 0 && !quickSearchError)) && (
        <TicketBowlTable
          tickets={tickets}
          loading={ticketsLoading}
          openprojectUrl={opConfig?.openproject_url}
          onOpenHistory={openHistoryModal}
          selectedIds={selectedTicketIds}
          onToggleSelect={toggleSelectTicket}
          onSelectAllCurrentPage={selectAllCurrentPage}
          onClearSelection={clearSelection}
          canViewHistory={canViewHistory}
        />
      )}

      {/* ── Server-Side Pagination (hidden when showing quick search results) ── */}
      {total > 0 && (!quickSearchMode || quickSearchResults.length === 0) && (
        <TicketBowlPagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          disabled={ticketsLoading}
        />
      )}

      {/* ── Modals ── */}
      <TicketForwardingHistoryModal
        ticket={selectedTicketForHistory}
        events={historyEvents}
        testingStatusHistory={testingStatusHistory}
        loading={historyLoading}
        onClose={closeHistoryModal}
      />

      {/* ── Sync Notifications ── */}
      <SyncNotification
        type="success"
        isVisible={showSuccessNotification}
        onDismiss={dismissSuccessNotification}
        totalSynced={syncResult?.totalSynced || 0}
        eventsFound={syncResult?.eventsFound || 0}
        autoHideDelay={8000}
      />

      <SyncNotification
        type="error"
        isVisible={showErrorNotification}
        onDismiss={dismissErrorNotification}
        onRetry={retrySync}
        errorMessage={syncResult?.errorMessage}
        autoHideDelay={0}
      />
    </div>
  )
}
