// src/hooks/useTicketBowl.ts
// React hook encapsulating state, progressive loading, queries, sync, and interactions for Ticket Bowl

import { useState, useEffect, useCallback, useRef } from 'react'
import { useToast } from '@/hooks/use-toast'
import type { OpenProjectConfig } from '@/services/openproject'
import {
  syncTicketBowlData,
  queryTicketBowlWorkPackages,
  fetchTicketBowlSyncStatus,
  fetchTicketForwardingHistory,
  fetchTicketTestingStatusHistory,
  fetchTicketBowlDashboardStats,
  fetchAllOpenProjectTypes,
} from '@/services/ticketbowl-service'
import type {
  TicketBowlWorkPackage,
  TicketBowlForwardingEvent,
  TicketBowlTestingStatusEvent,
  TicketBowlSyncStatus,
  TicketBowlFilters,
  TicketBowlDashboardStats,
  TicketBowlSyncProgress,
  ForwardingHistoryVerification,
} from '@/modules/TicketBowl/types'

export interface UseTicketBowlOptions {
  projectId: string
  opProjectId?: number | null
  opProjectName?: string | null
  config?: OpenProjectConfig | null
  autoLoad?: boolean
}

const DEFAULT_FILTERS: Omit<TicketBowlFilters, 'projectId'> = {
  opProjectId: null,
  forwardedFrom: null,
  forwardedTo: null,
  typeName: null,
  statusName: null,
  priorityName: null,
  testingStatus: null,
  isQAMissed: null,
  authorName: null,
  assigneeName: null,
  historyVerificationStatus: null,
  search: null,
  pageSize: 25,
  page: 1,
}

const EMPTY_STATS: TicketBowlDashboardStats = {
  totalUniqueTickets: 0,
  totalForwardingEvents: 0,
  repeatForwardedTickets: 0,
  unavailableHistoryTickets: 0,
  currentTestingStatusCounts: {},
  qaMissedCounts: {},
  typeCounts: {},
  statusCounts: {},
  priorityCounts: {},
  historyVerificationCounts: {},
}

export function useTicketBowl({
  projectId,
  opProjectId,
  opProjectName,
  config,
  autoLoad = true,
}: UseTicketBowlOptions) {
  const { toast } = useToast()

  // Filters State
  const [filters, setFiltersState] = useState<TicketBowlFilters>({
    projectId,
    ...DEFAULT_FILTERS,
    opProjectId: opProjectId || null,
  })

  // Synchronize projectId and opProjectId when changed externally
  useEffect(() => {
    setFiltersState(prev => ({
      ...prev,
      projectId,
      opProjectId: opProjectId || null,
      page: 1,
    }))
  }, [projectId, opProjectId])

  // Data Loading States
  const [tickets, setTickets] = useState<TicketBowlWorkPackage[]>([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Dashboard Stats State
  const [stats, setStats] = useState<TicketBowlDashboardStats>(EMPTY_STATS)
  const [statsLoading, setStatsLoading] = useState(false)

  // Sync Status & Progress State
  const [syncStatus, setSyncStatus] = useState<TicketBowlSyncStatus | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncProgress, setSyncProgress] = useState<TicketBowlSyncProgress | null>(null)

  // Dynamic OpenProject Types
  const [availableTypes, setAvailableTypes] = useState<Array<{ id: number; name: string }>>([])
  const [loadingTypes, setLoadingTypes] = useState(false)

  // History Modal State
  const [selectedTicketForHistory, setSelectedTicketForHistory] = useState<TicketBowlWorkPackage | null>(null)
  const [historyEvents, setHistoryEvents] = useState<TicketBowlForwardingEvent[]>([])
  const [testingStatusHistory, setTestingStatusHistory] = useState<TicketBowlTestingStatusEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Selected Tickets for Batch Export
  const [selectedTicketIds, setSelectedTicketIds] = useState<Set<number>>(new Set())

  // Request race-condition guard
  const activeRequestIdRef = useRef(0)

  // Load Sync Status
  const loadSyncStatus = useCallback(async () => {
    if (!projectId) return
    const status = await fetchTicketBowlSyncStatus(projectId, opProjectId)
    setSyncStatus(status)
  }, [projectId, opProjectId])

  // Fetch Available Types
  const loadTypes = useCallback(async () => {
    if (!config?.openproject_url || !config?.openproject_api_key) return
    setLoadingTypes(true)
    try {
      const types = await fetchAllOpenProjectTypes(config)
      setAvailableTypes(types)
    } finally {
      setLoadingTypes(false)
    }
  }, [config])

  // PROGRESSIVE STEP 2: Load cached ticket data fast (first page independent of analytics)
  const loadTickets = useCallback(async () => {
    if (!projectId) return
    const currentRequestId = ++activeRequestIdRef.current
    setLoading(true)
    setError(null)
    try {
      const result = await queryTicketBowlWorkPackages(filters)
      // Discard stale response if a newer search was initiated
      if (currentRequestId === activeRequestIdRef.current) {
        setTickets(result.items)
        setTotal(result.total)
        setTotalPages(result.totalPages)
      }
    } catch (err) {
      if (currentRequestId === activeRequestIdRef.current) {
        const msg = err instanceof Error ? err.message : 'Failed to query tickets'
        setError(msg)
      }
    } finally {
      if (currentRequestId === activeRequestIdRef.current) {
        setLoading(false)
      }
    }
  }, [filters, projectId])

  // PROGRESSIVE STEP 3: Load summary analytics in parallel
  const loadDashboardStats = useCallback(async () => {
    if (!projectId) return
    setStatsLoading(true)
    try {
      const statsData = await fetchTicketBowlDashboardStats(filters)
      setStats(statsData)
    } catch (err) {
      console.warn('[Ticket Bowl] Failed to load dashboard stats:', err)
    } finally {
      setStatsLoading(false)
    }
  }, [filters, projectId])

  useEffect(() => {
    if (autoLoad && projectId) {
      loadSyncStatus()
      loadTypes()
    }
  }, [autoLoad, projectId, loadSyncStatus, loadTypes])

  useEffect(() => {
    if (autoLoad && projectId) {
      loadTickets()
      loadDashboardStats()
    }
  }, [autoLoad, projectId, filters, loadTickets, loadDashboardStats])

  // Set individual filters and reset to page 1
  const setFilters = useCallback((updates: Partial<TicketBowlFilters>) => {
    setFiltersState(prev => ({
      ...prev,
      ...updates,
      page: updates.page ?? 1,
    }))
  }, [])

  // Reset all filters to defaults
  const resetFilters = useCallback(() => {
    setFiltersState({
      projectId,
      ...DEFAULT_FILTERS,
      opProjectId: opProjectId || null,
    })
    setSelectedTicketIds(new Set())
  }, [projectId, opProjectId])

  // Toggle filter to view only unavailable history tickets
  const toggleViewUnavailableHistory = useCallback(() => {
    setFiltersState(prev => ({
      ...prev,
      historyVerificationStatus:
        prev.historyVerificationStatus === 'unavailable' ? null : 'unavailable',
      page: 1,
    }))
  }, [])

  // Page navigation
  const setPage = useCallback((newPage: number) => {
    setFiltersState(prev => ({ ...prev, page: Math.max(1, newPage) }))
  }, [])

  const dismissSyncProgress = useCallback(() => {
    setSyncProgress(null)
  }, [])

  // Page size selection (10, 25, 50, 100)
  const setPageSize = useCallback((newPageSize: number) => {
    setFiltersState(prev => ({ ...prev, pageSize: newPageSize, page: 1 }))
  }, [])

  // Sync Data Action
  const handleSyncData = useCallback(async () => {
    if (!config?.openproject_url || !config?.openproject_api_key) {
      toast({
        title: 'OpenProject Not Configured',
        description: 'Please configure your OpenProject API credentials in Project Hub first.',
        variant: 'destructive',
      })
      return
    }

    setSyncing(true)
    setSyncProgress({
      phase: 'fetching-tickets',
      current: 0,
      total: 0,
      message: 'Starting Ticket Bowl synchronization...',
    })

    try {
      const result = await syncTicketBowlData(
        config,
        projectId,
        opProjectId,
        opProjectName,
        progress => {
          setSyncProgress(progress)
        }
      )

      if (result.success) {
        toast({
          title: 'Sync Successful',
          description: result.message,
        })
        await loadSyncStatus()
        await loadTickets()
        await loadDashboardStats()
      } else {
        toast({
          title: 'Sync Completed With Warnings',
          description: result.message,
          variant: 'destructive',
        })
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Synchronization failed'
      toast({
        title: 'Sync Failed',
        description: msg,
        variant: 'destructive',
      })
    } finally {
      setSyncing(false)
      setSyncProgress(null)
    }
  }, [config, projectId, opProjectId, opProjectName, toast, loadSyncStatus, loadTickets, loadDashboardStats])

  // PROGRESSIVE STEP 4: On-demand Forwarding History inspection
  const openHistoryModal = useCallback(async (wp: TicketBowlWorkPackage) => {
    setSelectedTicketForHistory(wp)
    setHistoryLoading(true)
    try {
      const [events, statusHistory] = await Promise.all([
        fetchTicketForwardingHistory(wp.project_id, wp.work_package_id),
        fetchTicketTestingStatusHistory(wp.project_id, wp.work_package_id),
      ])
      setHistoryEvents(events)
      setTestingStatusHistory(statusHistory)
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  const closeHistoryModal = useCallback(() => {
    setSelectedTicketForHistory(null)
    setHistoryEvents([])
    setTestingStatusHistory([])
  }, [])

  // Toggle Ticket Selection
  const toggleSelectTicket = useCallback((wpId: number) => {
    setSelectedTicketIds(prev => {
      const next = new Set(prev)
      if (next.has(wpId)) next.delete(wpId)
      else next.add(wpId)
      return next
    })
  }, [])

  const selectAllCurrentPage = useCallback(() => {
    setSelectedTicketIds(prev => {
      const next = new Set(prev)
      tickets.forEach(t => next.add(t.work_package_id))
      return next
    })
  }, [tickets])

  const clearSelection = useCallback(() => {
    setSelectedTicketIds(new Set())
  }, [])

  // Export to Release Task Tracker
  const exportToReleaseTracker = useCallback((itemsToExport?: TicketBowlWorkPackage[]) => {
    const targets = itemsToExport || tickets.filter(t => selectedTicketIds.has(t.work_package_id))
    if (targets.length === 0) {
      toast({
        title: 'No Tickets Selected',
        description: 'Please select at least one ticket to export to Release Task Tracker.',
      })
      return
    }

    const payload = targets.map(t => ({
      openproject_id: t.work_package_id,
      product_name: t.op_project_name || 'OpenProject',
      release_version: t.release_tag || t.version_name || 'Release 1.0',
      description: `[OP#${t.work_package_id}] ${t.subject}`,
      priority: t.priority_name || 'Medium',
      received_date_time: t.matched_forwarded_at || t.latest_forwarded_at || new Date().toISOString(),
    }))

    sessionStorage.setItem('ticketbowl_export_release', JSON.stringify(payload))
    sessionStorage.setItem('storypot_export_release', JSON.stringify(payload))
    toast({
      title: 'Exported to Release Task Tracker',
      description: `${payload.length} ticket(s) prepared for Release Task Tracker.`,
    })
    window.location.href = '/release-tracker?import=ticketbowl'
  }, [tickets, selectedTicketIds, toast])

  // Export to Support Issue Tracker
  const exportToSupportTracker = useCallback((itemsToExport?: TicketBowlWorkPackage[]) => {
    const targets = itemsToExport || tickets.filter(t => selectedTicketIds.has(t.work_package_id))
    if (targets.length === 0) {
      toast({
        title: 'No Tickets Selected',
        description: 'Please select at least one ticket to export to Support Issue Tracker.',
      })
      return
    }

    const payload = targets.map(t => ({
      openproject_id: t.work_package_id,
      product_name: t.op_project_name || 'OpenProject',
      description: `[OP#${t.work_package_id}] ${t.subject}`,
      received_date: (t.matched_forwarded_at || t.latest_forwarded_at || new Date().toISOString()).split('T')[0],
      is_qa_missed: t.is_qa_missed === 'Yes' ? 'Yes' : 'No',
    }))

    sessionStorage.setItem('ticketbowl_export_support', JSON.stringify(payload))
    sessionStorage.setItem('storypot_export_support', JSON.stringify(payload))
    toast({
      title: 'Exported to Support Issue Tracker',
      description: `${payload.length} ticket(s) prepared for Support Issue Tracker.`,
    })
    window.location.href = '/support-tracker?import=ticketbowl'
  }, [tickets, selectedTicketIds, toast])

  // Export to CSV
  const exportToCsv = useCallback(() => {
    if (tickets.length === 0) {
      toast({ title: 'No Data', description: 'No tickets to export.' })
      return
    }

    const headers = [
      'Ticket ID',
      'Subject',
      'Type',
      'Priority',
      'Status',
      'Testing Status',
      'Is QA Missed',
      'History Verification',
      'Last Forwarded Date',
      'Last Forwarded By',
      'Forwarding Count',
      'Author',
      'Assignee',
    ]

    const rows = tickets.map(t => [
      t.work_package_id,
      `"${(t.subject || '').replace(/"/g, '""')}"`,
      t.type_name,
      t.priority_name,
      t.status_name,
      t.testing_status || '',
      t.is_qa_missed || 'N/A',
      t.history_verification_status || 'unavailable',
      t.matched_forwarded_at ? new Date(t.matched_forwarded_at).toLocaleString() : '',
      t.matched_forwarded_by || 'Unknown',
      t.forwarding_count,
      t.author_name || '',
      t.assignee_name || '',
    ])

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement('a')
    link.setAttribute('href', encodedUri)
    link.setAttribute('download', `ticket_bowl_export_${new Date().toISOString().split('T')[0]}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }, [tickets, toast])

  return {
    filters,
    setFilters,
    resetFilters,
    toggleViewUnavailableHistory,
    page: filters.page,
    pageSize: filters.pageSize,
    setPage,
    setPageSize,
    tickets,
    total,
    totalPages,
    loading,
    error,
    stats,
    statsLoading,
    syncStatus,
    syncing,
    syncProgress,
    dismissSyncProgress,
    handleSyncData,
    availableTypes,
    loadingTypes,
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
  }
}
