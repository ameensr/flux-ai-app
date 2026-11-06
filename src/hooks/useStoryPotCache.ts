// src/hooks/useStoryPotCache.ts
// React hook for StoryPot cache operations (without React Query)

import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  syncWorkPackagesToCache,
  queryCachedWorkPackages,
  getCachedStats,
  getSyncStatus,
  getCachedFilterOptions,
  getFilteredTestingStatusCounts,
  getFilteredQaMissedCounts,
  clearCache,
  type SyncProgress,
  type SyncResult,
  type StoryPotQueryFilters,
  type CachedWorkPackage,
} from '@/services/storypot-cache'
import type { OpenProjectConfig } from '@/services/openproject'

export interface UseStoryPotCacheOptions {
  projectId: string
  opProjectId?: number | null
  opProjectName?: string | null
  config?: OpenProjectConfig | null
  enabled?: boolean
}

export interface StoryPotFiltersState {
  forwardedFrom: string
  forwardedTo: string
  type: string
  status: string
  priority: string
  releaseTag: string
  testingStatus: string
  isQAMissed: string
  author: string
  assignee: string
  search: string
}

const defaultFilters: StoryPotFiltersState = {
  forwardedFrom: '',
  forwardedTo: '',
  type: '',
  status: '',
  priority: '',
  releaseTag: '',
  testingStatus: '',
  isQAMissed: '',
  author: '',
  assignee: '',
  search: '',
}

export function useStoryPotCache(options: UseStoryPotCacheOptions) {
  const { projectId, opProjectId, opProjectName, config, enabled = true } = options

  // State
  const [filters, setFiltersState] = useState<StoryPotFiltersState>(defaultFilters)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null)
  
  // Data state
  const [workPackages, setWorkPackages] = useState<CachedWorkPackage[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getCachedStats>> | null>(null)
  const [filteredByTestingStatus, setFilteredByTestingStatus] = useState<Record<string, number>>({})
  const [filteredQaMissed, setFilteredQaMissed] = useState<{ yes: number; no: number; na: number; unknown: number; total: number }>({ yes: 0, no: 0, na: 0, unknown: 0, total: 0 })
  const [filterOptions, setFilterOptions] = useState<Awaited<ReturnType<typeof getCachedFilterOptions>> | null>(null)
  const [syncStatus, setSyncStatus] = useState<Awaited<ReturnType<typeof getSyncStatus>> | null>(null)
  
  // Loading states
  const [isLoading, setIsLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  // Load sync status
  const loadSyncStatus = useCallback(async () => {
    if (!projectId) return
    try {
      const status = await getSyncStatus(projectId, opProjectId)
      setSyncStatus(status)
    } catch (e) {
      console.error('Failed to load sync status:', e)
    }
  }, [projectId, opProjectId])

  // Load filter options
  const loadFilterOptions = useCallback(async () => {
    if (!projectId) return
    try {
      const options = await getCachedFilterOptions(projectId, opProjectId)
      setFilterOptions(options)
    } catch (e) {
      console.error('Failed to load filter options:', e)
    }
  }, [projectId, opProjectId])

  // Load stats
  const loadStats = useCallback(async () => {
    if (!projectId) return
    try {
      const s = await getCachedStats(projectId, opProjectId)
      setStats(s)
    } catch (e) {
      console.error('Failed to load stats:', e)
    }
  }, [projectId, opProjectId])

  // Load filtered QA Missed counts (respects active filters)
  const loadFilteredQaMissed = useCallback(async () => {
    if (!projectId) return
    try {
      const counts = await getFilteredQaMissedCounts({
        projectId,
        opProjectId: opProjectId || undefined,
        forwardedFrom: filters.forwardedFrom || undefined,
        forwardedTo: filters.forwardedTo || undefined,
        type: filters.type || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        releaseTag: filters.releaseTag || undefined,
        testingStatus: filters.testingStatus || undefined,
        isQAMissed: filters.isQAMissed || undefined,
        author: filters.author || undefined,
        assignee: filters.assignee || undefined,
        search: filters.search || undefined,
      })
      setFilteredQaMissed(counts)
    } catch (e) {
      console.error('Failed to load filtered QA missed counts:', e)
    }
  }, [projectId, opProjectId, filters])

  // Load filtered testing status counts (respects active filters)
  const loadFilteredTestingStatus = useCallback(async () => {
    if (!projectId) return
    try {
      const counts = await getFilteredTestingStatusCounts({
        projectId,
        opProjectId: opProjectId || undefined,
        forwardedFrom: filters.forwardedFrom || undefined,
        forwardedTo: filters.forwardedTo || undefined,
        type: filters.type || undefined,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        releaseTag: filters.releaseTag || undefined,
        testingStatus: filters.testingStatus || undefined,
        isQAMissed: filters.isQAMissed || undefined,
        author: filters.author || undefined,
        assignee: filters.assignee || undefined,
        search: filters.search || undefined,
      })
      setFilteredByTestingStatus(counts)
    } catch (e) {
      console.error('Failed to load filtered testing status counts:', e)
    }
  }, [projectId, opProjectId, filters])

  // Query work packages - use queryFilters directly in the function
  const loadWorkPackages = useCallback(async () => {
    if (!projectId) return
    
    // When ANY filter is active, fetch ALL matching rows so no tickets are
    // hidden behind page boundaries.
    const isAnyFilterActive = !!(filters.forwardedFrom || filters.forwardedTo ||
      filters.type || filters.status || filters.priority || filters.releaseTag ||
      filters.testingStatus || filters.isQAMissed || filters.author || filters.assignee || filters.search)

    // Build filters inline to avoid stale closure
    const currentFilters: StoryPotQueryFilters = {
      projectId,
      opProjectId: opProjectId || undefined,
      forwardedFrom: filters.forwardedFrom || undefined,
      forwardedTo: filters.forwardedTo || undefined,
      type: filters.type || undefined,
      status: filters.status || undefined,
      priority: filters.priority || undefined,
      releaseTag: filters.releaseTag || undefined,
      testingStatus: filters.testingStatus || undefined,
      isQAMissed: filters.isQAMissed || undefined,
      author: filters.author || undefined,
      assignee: filters.assignee || undefined,
      search: filters.search || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      noLimit: isAnyFilterActive,
    }
    
    setIsLoading(true)
    setError(null)
    try {
      const result = await queryCachedWorkPackages(currentFilters)
      setWorkPackages(result.items)
      setTotalCount(result.total)
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load work packages'))
      console.error('Failed to load work packages:', e)
    } finally {
      setIsLoading(false)
    }
  }, [projectId, opProjectId, filters, page, pageSize])

  // Initial load when sync status is available
  useEffect(() => {
    if (enabled && projectId) {
      loadSyncStatus()
    }
  }, [enabled, projectId, opProjectId, loadSyncStatus])

  // Load filter options and stats when sync status indicates we have data
  useEffect(() => {
    if (enabled && projectId && syncStatus?.lastSyncAt) {
      loadFilterOptions()
      loadStats()
    }
  }, [enabled, projectId, syncStatus?.lastSyncAt, loadFilterOptions, loadStats])

  // Reload work packages when filters or pagination changes
  useEffect(() => {
    if (enabled && projectId && syncStatus?.lastSyncAt) {
      loadWorkPackages()
      loadFilteredTestingStatus()
      loadFilteredQaMissed()
    }
  }, [enabled, projectId, syncStatus?.lastSyncAt, loadWorkPackages, loadFilteredTestingStatus, loadFilteredQaMissed])

  // Sync function
  const sync = useCallback(async () => {
    if (!config || !projectId) return
    
    setIsSyncing(true)
    setSyncProgress(null)
    
    try {
      await syncWorkPackagesToCache(
        config,
        projectId,
        opProjectId,
        opProjectName,
        (progress) => setSyncProgress(progress)
      )
      
      // Reload sync status first, then update syncStatus state directly so
      // the new lastSyncAt is immediately reflected in the UI without waiting
      // for useEffect dependency chains to re-fire.
      const newStatus = await getSyncStatus(projectId, opProjectId)
      setSyncStatus(newStatus)

      // Reload data with fresh calls (not stale-closure callbacks)
      await Promise.all([
        loadWorkPackages(),
        loadFilterOptions(),
        loadStats(),
        loadFilteredTestingStatus(),
        loadFilteredQaMissed(),
      ])
    } catch (e) {
      console.error('Sync failed:', e)
      setError(e instanceof Error ? e : new Error('Sync failed'))
    } finally {
      setIsSyncing(false)
      setSyncProgress(null)
    }
  }, [config, projectId, opProjectId, opProjectName, loadWorkPackages, loadFilterOptions, loadStats, loadFilteredTestingStatus, loadFilteredQaMissed])

  // Clear cache function
  const clearCacheData = useCallback(async () => {
    if (!projectId) return
    try {
      await clearCache(projectId, opProjectId)
      setWorkPackages([])
      setTotalCount(0)
      setStats(null)
      setSyncStatus(null)
    } catch (e) {
      console.error('Failed to clear cache:', e)
    }
  }, [projectId, opProjectId])

  // Filter setters
  const setFilters = useCallback((newFilters: Partial<StoryPotFiltersState>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
    setPage(1)
  }, [])

  const resetFilters = useCallback(() => {
    setFiltersState(defaultFilters)
    setPage(1)
  }, [])

  // Pagination
  const totalPages = useMemo(() => {
    if (!totalCount) return 0
    return Math.ceil(totalCount / pageSize)
  }, [totalCount, pageSize])

  const goToPage = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage)
    }
  }, [totalPages])

  const changePageSize = useCallback((newSize: number) => {
    setPageSize(newSize)
    setPage(1)
  }, [])

  // Computed values
  const hasData = !!syncStatus?.lastSyncAt
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => !!v).length
  }, [filters])
  const isBugType = filters.type.toLowerCase() === 'bug'

  return {
    // Data
    workPackages,
    totalCount,
    stats,
    filteredByTestingStatus,
    filteredQaMissed,
    filterOptions,
    syncStatus,

    // State
    filters,
    page,
    pageSize,
    totalPages,
    activeFilterCount,
    isBugType,

    // Loading states
    isLoading,
    isSyncing,
    syncProgress,
    error,

    // Flags
    hasData,
    isFresh: hasData,
    needsSync: !hasData,

    // Actions
    setFilters,
    resetFilters,
    goToPage,
    changePageSize,
    sync,
    clearCache: clearCacheData,
    refetch: loadWorkPackages,
    refetchStats: loadStats,
    refetchSyncStatus: loadSyncStatus,
  }
}

export type { CachedWorkPackage, SyncProgress, SyncResult }
