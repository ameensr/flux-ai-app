// src/modules/StoryPot/index.tsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, RefreshCw, Filter, X, Bug, FileText, Zap, CheckCircle2,
  AlertTriangle, User, Calendar, Clock, ExternalLink, BarChart3,
  Loader2, FolderOpen, Lock, ChevronDown, ChevronUp, Users, Tag,
  Square, CheckSquare, Rocket, LifeBuoy, Shield, Code, Headphones, Wrench,
  Database, AlertCircle, ChevronLeft, ChevronRight, History,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/ThemeContext'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'
import {
  fetchWorkPackages, fetchStatuses, fetchTypes,
  fetchPriorities, fetchProjectMembers, fetchReleaseOptions, formatWorkPackage,
  fetchOpenProjectProjects, fetchTestingStatusChanges,
  type OpenProjectConfig, type OpenProjectProject, type OpenProjectWorkPackage,
} from '@/services/openproject'
import { useStoryPotStore } from './store'
import type { StoryPotWorkPackage, FilterOption } from './types'

const MODULE_KEY = 'story-pot'

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const

type Perspective = 'qa-manager' | 'dev-manager' | 'dev-qa' | 'support-manager'

const PERSPECTIVES: { id: Perspective; label: string; icon: React.ReactNode; available: boolean }[] = [
  { id: 'qa-manager', label: 'QA Manager', icon: <Shield className="w-4 h-4" />, available: true },
  { id: 'dev-manager', label: 'Dev Manager', icon: <Code className="w-4 h-4" />, available: false },
  { id: 'dev-qa', label: 'Dev / QA', icon: <Wrench className="w-4 h-4" />, available: false },
  { id: 'support-manager', label: 'Support Manager', icon: <Headphones className="w-4 h-4" />, available: false },
]

interface Project {
  id: string
  name: string
  metadata?: { openproject?: OpenProjectConfig }
}

export default function StoryPot() {
  const { isDark } = useTheme()
  const { toast } = useToast()
  const { can, canView } = usePermissions()
  const navigate = useNavigate()

  const hasViewAccess = canView(MODULE_KEY)
  const canViewDashboard = can(MODULE_KEY, 'can_view_dashboard')

  const {
    workPackages, filteredWorkPackages, stats, filters, loading, error,
    selectedProjectId, authorOptions, assigneeOptions, testingStatusOptions,
    isQAMissedOptions, qaConfirmationOptions, hasFetched, lastFetchedAt,
    filtersChanged, pagination,
    setWorkPackages, setFilteredWorkPackages, setStats, setFilters,
    resetFilters, setLoading, setError, setSelectedProjectId, setFilterOptions,
    setHasFetched, setLastFetchedAt, clearFiltersChanged,
    setPagination, setCurrentPage, setPageSize, resetPagination,
  } = useStoryPotStore()

  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [statusOptions, setStatusOptions] = useState<FilterOption[]>([])
  const [typeOptions, setTypeOptions] = useState<FilterOption[]>([])
  const [priorityOptions, setPriorityOptions] = useState<FilterOption[]>([])
  const [versionOptions, setVersionOptions] = useState<FilterOption[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [perspective, setPerspective] = useState<Perspective>('qa-manager')
  const [projectSearch, setProjectSearch] = useState('')
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const projectDropdownRef = useRef<HTMLDivElement>(null)
  const fetchingRef = useRef(false)
  const [fetchingHistory, setFetchingHistory] = useState(false)
  const [historyProgress, setHistoryProgress] = useState({ current: 0, found: 0, total: 0 })

  
  // OpenProject projects (inside the configured OpenProject instance)
  const [opProjects, setOpProjects] = useState<OpenProjectProject[]>([])
  const [loadingOpProjects, setLoadingOpProjects] = useState(false)
  const [selectedOpProjectId, setSelectedOpProjectId] = useState<string>('')
  const [opProjectSearch, setOpProjectSearch] = useState('')
  const [showOpProjectDropdown, setShowOpProjectDropdown] = useState(false)
  const opProjectDropdownRef = useRef<HTMLDivElement>(null)

  const currentProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  )
  const config = currentProject?.metadata?.openproject

  // Filtered projects for searchable dropdown
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects
    const search = projectSearch.toLowerCase()
    return projects.filter(p => p.name.toLowerCase().includes(search))
  }, [projects, projectSearch])

  // Filtered OpenProject projects for searchable dropdown
  const filteredOpProjects = useMemo(() => {
    if (!opProjectSearch.trim()) return opProjects
    const search = opProjectSearch.toLowerCase()
    return opProjects.filter(p => p.name.toLowerCase().includes(search))
  }, [opProjects, opProjectSearch])

  // Selected OpenProject project name
  const selectedOpProject = useMemo(
    () => opProjects.find(p => p.id.toString() === selectedOpProjectId),
    [opProjects, selectedOpProjectId]
  )

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setShowProjectDropdown(false)
      }
      if (opProjectDropdownRef.current && !opProjectDropdownRef.current.contains(e.target as Node)) {
        setShowOpProjectDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Selection handlers
  const toggleSelect = useCallback((id: number, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearSelection = () => setSelectedIds(new Set())

  // Export to Release Tracker
  const exportToReleaseTracker = () => {
    const selected = computedFilteredWPs.filter(wp => selectedIds.has(wp.id))
    const exportData = selected.map(wp => {
      // Use actual forwarding date if available, otherwise fall back to updatedAt/createdAt
      const receivedDateTime = wp.forwardedToTestingAt || wp.updatedAt || wp.createdAt
      return {
        openproject_id: wp.id,
        description: wp.subject,
        release_version: wp.release || wp.version || '',
        priority: wp.priority,
        received_date_time: receivedDateTime,
        assigned_to_name: wp.assignee,
        comments: wp.description || '',
        product_name: wp.project,
        author: wp.author,
        forwarded_to_testing_at: wp.forwardedToTestingAt,
        forwarded_to_testing_by: wp.forwardedToTestingBy,
      }
    })
    sessionStorage.setItem('storypot_export_release', JSON.stringify(exportData))
    toast({ title: 'Export Ready', description: `${selected.length} items ready for Release Tracker` })
    navigate('/release-tracker?import=storypot')
  }

  // Export to Support Tracker
  const exportToSupportTracker = () => {
    const selected = computedFilteredWPs.filter(wp => selectedIds.has(wp.id))
    const exportData = selected.map(wp => {
      // Use actual forwarding date if available, otherwise fall back to updatedAt/createdAt
      const receivedDateTime = wp.forwardedToTestingAt || wp.updatedAt || wp.createdAt
      return {
        openproject_id: wp.id,
        description: wp.subject,
        received_date: receivedDateTime?.split('T')[0] || '',
        received_time: receivedDateTime?.split('T')[1]?.substring(0, 5) || '',
        tester_name: wp.assignee,
        testing_status: 'Not Started',
        is_qa_miss: wp.isQAMissed || 'Not Applicable',
        comments: wp.description || '',
        product_name: wp.project,
        author: wp.author,
        forwarded_to_testing_at: wp.forwardedToTestingAt,
        forwarded_to_testing_by: wp.forwardedToTestingBy,
      }
    })
    sessionStorage.setItem('storypot_export_support', JSON.stringify(exportData))
    toast({ title: 'Export Ready', description: `${selected.length} items ready for Support Tracker` })
    navigate('/support-tracker?import=storypot')
  }

  // Load projects
  useEffect(() => {
    async function loadProjects() {
      setLoadingProjects(true)
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('id, name, metadata')
          .not('metadata->openproject', 'is', null)
          .order('name')
        if (error) throw error
        setProjects(data || [])
        if (data && data.length > 0 && !selectedProjectId) {
          setSelectedProjectId(data[0].id)
        }
      } catch (err) {
        console.error('Failed to load projects:', err)
      } finally {
        setLoadingProjects(false)
      }
    }
    loadProjects()
  }, [])

  // Load global filter options (Status, Type, Priority) when config is available
  useEffect(() => {
    if (!config?.openproject_url || !config?.openproject_api_key) return
    async function loadGlobalOptions() {
      try {
        const [statuses, types, priorities] = await Promise.all([
          fetchStatuses(config!),
          fetchTypes(config!),
          fetchPriorities(config!),
        ])
        setStatusOptions(statuses)
        setTypeOptions(types)
        setPriorityOptions(priorities)
      } catch { /* silent */ }
    }
    loadGlobalOptions()
  }, [config?.openproject_url, config?.openproject_api_key])

  // Load project-specific filter options (Members, Release) when OpenProject Project is selected
  useEffect(() => {
    if (!config?.openproject_url || !config?.openproject_api_key) return
    if (!selectedOpProjectId) {
      setVersionOptions([])
      setFilterOptions({ assignees: [], authors: [] })
      return
    }
    async function loadProjectOptions() {
      try {
        const configWithProject: OpenProjectConfig = {
          ...config!,
          openproject_project_id: selectedOpProjectId,
        }
        const [members, releases] = await Promise.all([
          fetchProjectMembers(configWithProject),
          fetchReleaseOptions(configWithProject),
        ])
        setVersionOptions(releases)
        setFilterOptions({ assignees: members, authors: members })
      } catch { /* silent */ }
    }
    loadProjectOptions()
  }, [config?.openproject_url, config?.openproject_api_key, selectedOpProjectId])

  // Load OpenProject projects when config is available
  useEffect(() => {
    if (!config?.openproject_url || !config?.openproject_api_key) {
      setOpProjects([])
      setSelectedOpProjectId('')
      return
    }
    async function loadOpProjects() {
      setLoadingOpProjects(true)
      try {
        const projects = await fetchOpenProjectProjects(config!)
        setOpProjects(projects)
      } catch {
        setOpProjects([])
      } finally {
        setLoadingOpProjects(false)
      }
    }
    loadOpProjects()
  }, [config?.openproject_url, config?.openproject_api_key])

  // Load Release options - extracted from work packages after fetch
  // (Custom field options API may require admin permissions)

  // Apply client-side filters (only for filters NOT supported by OpenProject API)
  const preFilteredWPs = useMemo(() => {
    let result = workPackages

    if (filters.search) {
      const s = filters.search.toLowerCase()
      result = result.filter(wp =>
        wp.subject.toLowerCase().includes(s) || wp.id.toString().includes(s)
      )
    }
    if (filters.author) {
      const authorLower = filters.author.toLowerCase()
      result = result.filter(wp => wp.author.toLowerCase().includes(authorLower))
    }
    if (filters.assignee) {
      const assigneeLower = filters.assignee.toLowerCase()
      result = result.filter(wp => wp.assignee.toLowerCase().includes(assigneeLower))
    }
    // Note: Release filter is now handled at API level (customField9)
    if (filters.receivedDateFrom) {
      result = result.filter(wp => wp.createdAt && wp.createdAt >= filters.receivedDateFrom)
    }
    if (filters.receivedDateTo) {
      const toDate = filters.receivedDateTo + 'T23:59:59'
      result = result.filter(wp => wp.createdAt && wp.createdAt <= toDate)
    }
    if (filters.testingStatus) {
      const statusLower = filters.testingStatus.toLowerCase()
      result = result.filter(wp => wp.testingStatus?.toLowerCase() === statusLower)
    }
    
    // Only apply isQAMissed and qaConfirmation filters for Support Issue type
    const selectedTypeName = typeOptions.find(t => String(t.id) === filters.type)?.name?.toLowerCase() || ''
    const isSupportIssue = selectedTypeName.includes('support')
    
    if (isSupportIssue && filters.isQAMissed) {
      const missedLower = filters.isQAMissed.toLowerCase()
      result = result.filter(wp => wp.isQAMissed?.toLowerCase() === missedLower)
    }
    if (isSupportIssue && filters.qaConfirmation) {
      const confLower = filters.qaConfirmation.toLowerCase()
      result = result.filter(wp => wp.qaConfirmation?.toLowerCase() === confLower)
    }

    return result
  }, [workPackages, filters.search, filters.author, filters.assignee,
      filters.receivedDateFrom, filters.receivedDateTo, filters.testingStatus,
      filters.isQAMissed, filters.qaConfirmation, filters.type, typeOptions])

  // Final filtered results - apply "Received for Testing" date filter if set
  const computedFilteredWPs = useMemo(() => {
    let result = preFilteredWPs
    
    // Filter by "Received for Testing" date (forwardedToTestingAt)
    if (filters.testingReceivedDateFrom) {
      result = result.filter(wp => {
        if (!wp.forwardedToTestingAt) return false
        return wp.forwardedToTestingAt >= filters.testingReceivedDateFrom
      })
    }
    if (filters.testingReceivedDateTo) {
      const toDate = filters.testingReceivedDateTo + 'T23:59:59'
      result = result.filter(wp => {
        if (!wp.forwardedToTestingAt) return false
        return wp.forwardedToTestingAt <= toDate
      })
    }
    
    return result
  }, [preFilteredWPs, filters.testingReceivedDateFrom, filters.testingReceivedDateTo])

  // Client-side paginated results for display
  const paginatedWPs = useMemo(() => {
    const startIndex = (pagination.currentPage - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    return computedFilteredWPs.slice(startIndex, endIndex)
  }, [computedFilteredWPs, pagination.currentPage, pagination.pageSize])

  // Update pagination when filtered results change (for client-side filtering)
  useEffect(() => {
    if (hasFetched && computedFilteredWPs.length > 0) {
      const totalRecords = computedFilteredWPs.length
      const totalPages = Math.ceil(totalRecords / pagination.pageSize)
      // Only update if values changed to avoid infinite loop
      if (pagination.totalRecords !== totalRecords || pagination.totalPages !== totalPages) {
        setPagination({ totalRecords, totalPages })
      }
    }
  }, [computedFilteredWPs.length, pagination.pageSize, hasFetched])

  // Toggle select all - selects all items on current page
  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      const currentPageIds = paginatedWPs.map(wp => wp.id)
      const allSelected = currentPageIds.every(id => prev.has(id))
      if (allSelected) {
        // Deselect all on current page
        const next = new Set(prev)
        currentPageIds.forEach(id => next.delete(id))
        return next
      } else {
        // Select all on current page
        const next = new Set(prev)
        currentPageIds.forEach(id => next.add(id))
        return next
      }
    })
  }, [paginatedWPs])

  // Update store when computed results change
  useEffect(() => {
    setFilteredWorkPackages(computedFilteredWPs)
    if (stats && workPackages.length > 0) {
      const byAuthor: Record<string, number> = {}
      const byAssignee: Record<string, number> = {}
      computedFilteredWPs.forEach(wp => {
        byAuthor[wp.author] = (byAuthor[wp.author] || 0) + 1
        byAssignee[wp.assignee] = (byAssignee[wp.assignee] || 0) + 1
      })
      // Total = items fetched from API, Filtered = after client-side filters
      setStats({ 
        ...stats, 
        total: workPackages.length,
        filtered: computedFilteredWPs.length, 
        byAuthor, 
        byAssignee 
      })
    }
  }, [computedFilteredWPs, workPackages.length])

  // Load data - triggered ONLY by explicit user action (Search/Fetch button)
  const loadData = useCallback(async (
    cfg: OpenProjectConfig, 
    opProjectId: string
  ) => {
    if (!cfg?.openproject_url || !cfg?.openproject_api_key) return
    if (!selectedProjectId) return
    if (fetchingRef.current) return
    
    fetchingRef.current = true
    setLoading(true)
    setError(null)
    
    try {
      // Build API filters (for filters supported by OpenProject API)
      const apiFilters: { status?: string[]; type?: string[]; priority?: string[]; customField9?: string } = {}
      if (filters.status && /^\d+$/.test(filters.status)) {
        apiFilters.status = [filters.status]
      }
      if (filters.type && /^\d+$/.test(filters.type)) {
        apiFilters.type = [filters.type]
      }
      if (filters.priority && /^\d+$/.test(filters.priority)) {
        apiFilters.priority = [filters.priority]
      }
      
      // Release filter - find the option ID from versionOptions
      // Only apply Release filter if NOT Support Issue type (Support Issues don't have customField9)
      const selectedTypeName = typeOptions.find(t => String(t.id) === filters.type)?.name?.toLowerCase() || ''
      const isSupportIssue = selectedTypeName.includes('support')
      
      if (filters.releaseTag && !isSupportIssue) {
        const releaseOption = versionOptions.find(v => v.name === filters.releaseTag)
        if (releaseOption) {
          apiFilters.customField9 = String(releaseOption.id)
        }
      }
      
      const configWithProject: OpenProjectConfig = {
        ...cfg,
        openproject_project_id: opProjectId || undefined,
      }

      // Fetch ALL matching work packages using page-based pagination
      const pageSize = 200 // Fetch up to 200 per request
      let allItems: OpenProjectWorkPackage[] = []
      let total = 0
      let currentPage = 1
      
      // First fetch
      const firstResult = await fetchWorkPackages(configWithProject, { 
        ...apiFilters, 
        pageSize, 
        page: currentPage,
        sortBy: '[["updatedAt","desc"],["id","desc"]]'
      })
      
      allItems = [...firstResult.items]
      total = firstResult.total
      
      // Fetch remaining pages if needed (cap at 10 pages = 2000 items max)
      while (allItems.length < total && currentPage < 10) {
        currentPage++
        
        const nextResult = await fetchWorkPackages(configWithProject, { 
          ...apiFilters, 
          pageSize, 
          page: currentPage,
          sortBy: '[["updatedAt","desc"],["id","desc"]]'
        })
        
        if (nextResult.items.length === 0) break
        allItems = [...allItems, ...nextResult.items]
      }
      
      const wpResult = { items: allItems, total }

      // Format work packages
      let items: StoryPotWorkPackage[] = wpResult.items.map(wp => {
        const formatted = formatWorkPackage(wp)
        return {
          ...formatted,
          receivedDate: formatted.receivedDate || null,
          forwardedToTestingAt: null,
          forwardedToTestingBy: null,
          handoffVerified: false,
          handoffCount: 0,
        }
      })
      


      // Skip activity history fetching during initial load for performance
      // Activity history will be fetched on-demand when date filter is used
      // Items with testingStatus set will show the status but without verified date/time until filtered
      
      setWorkPackages(items)

      // Extract filter options from fetched data
      const releases = new Set<string>()
      const authors = new Set<string>()
      const assignees = new Set<string>()
      const testingStatuses = new Set<string>()
      const qaConfirmations = new Set<string>()
      
      items.forEach(wp => {
        if (wp.release) releases.add(wp.release)
        if (wp.author && wp.author !== 'Unassigned') authors.add(wp.author)
        if (wp.assignee && wp.assignee !== 'Unassigned') assignees.add(wp.assignee)
        if (wp.testingStatus) testingStatuses.add(wp.testingStatus)
        if (wp.qaConfirmation) qaConfirmations.add(wp.qaConfirmation)
      })
      

      setFilterOptions({
        authors: Array.from(authors).sort().map((a, i) => ({ id: i, name: a })),
        assignees: Array.from(assignees).sort().map((a, i) => ({ id: i, name: a })),
        testingStatuses: Array.from(testingStatuses).sort().map((s, i) => ({ id: i, name: s })),
        qaConfirmations: Array.from(qaConfirmations).sort().map((c, i) => ({ id: i, name: c })),
      })

      // Reset pagination to page 1
      setPagination({
        currentPage: 1,
        pageSize: pagination.pageSize,
        totalRecords: items.length,
        totalPages: Math.ceil(items.length / pagination.pageSize),
      })

      // Update stats
      // - total: What we actually fetched (may be capped)
      // - filtered: After client-side filters (same as total if no client filters)
      // Note: If API total > fetched, we show a warning
      const overdueCount = items.filter(wp => wp.isOverdue).length
      const unassignedCount = items.filter(wp => wp.assignee === 'Unassigned').length
      const completedCount = items.filter(wp => 
        wp.status.toLowerCase().includes('closed') || 
        wp.status.toLowerCase().includes('done') ||
        wp.percentageDone === 100
      ).length
      
      const apiTotal = wpResult.total // Total matching API filters
      const fetchedCount = items.length // What we actually fetched (may be capped)
      
      if (apiTotal > fetchedCount) {
        console.warn(`[StoryPot] API has ${apiTotal} records but only fetched ${fetchedCount}. Consider adding more filters.`)
      }
      
      setStats({
        total: fetchedCount, // Show what we actually have
        filtered: fetchedCount, // Initially same (client-side filters will update this)
        overdue: overdueCount,
        unassigned: unassignedCount,
        completedPercentage: fetchedCount > 0 ? Math.round((completedCount / fetchedCount) * 100) : 0,
        byStatus: {},
        byType: {},
        byPriority: {},
        byAuthor: {},
        byAssignee: {},
        byTestingStatus: {},
        qaMissedCount: items.filter(wp => wp.isQAMissed?.toLowerCase() === 'yes').length,
      })
      
      setHasFetched(true)
      setLastFetchedAt(new Date().toISOString())
      clearFiltersChanged()
      
      // Show appropriate toast message
      if (apiTotal > fetchedCount) {
        toast({ 
          title: 'Data Fetched (Partial)', 
          description: `Retrieved ${fetchedCount} of ${apiTotal} work packages. Add more filters to narrow results.`,
          variant: 'default'
        })
      } else {
        toast({ 
          title: 'Data Fetched', 
          description: `Retrieved ${fetchedCount} work packages` 
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch data' })
    } finally {
      setLoading(false)
      fetchingRef.current = false
    }
  }, [selectedProjectId, filters.status, filters.type, filters.priority, filters.releaseTag, typeOptions, versionOptions, pagination.pageSize, setWorkPackages, setFilterOptions, setStats, setLoading, setError, setHasFetched, setLastFetchedAt, clearFiltersChanged, setPagination, toast])

  // Handle Search/Fetch button click
  const handleSearchFetch = useCallback(() => {
    if (config && !loading) {
      loadData(config, selectedOpProjectId)
    }
  }, [config, loading, loadData, selectedOpProjectId])

  // Handle page change - client-side pagination (data already loaded)
  const handlePageChange = useCallback((newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setCurrentPage(newPage)
    }
  }, [pagination.totalPages, setCurrentPage])

  // Handle page size change - reset to page 1
  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize)
  }, [setPageSize])

  // NO auto-fetch - data is only loaded when user clicks Search/Fetch

  if (!hasViewAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <GlassCard className="p-12 text-center max-w-md">
          <Lock className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Access Denied
          </h2>
          <p style={{ color: 'var(--text-muted)' }}>
            You don't have permission to view StoryPot.
          </p>
        </GlassCard>
      </div>
    )
  }

  // Check if selected type is "Support Issue"
  const selectedTypeName = typeOptions.find(t => String(t.id) === filters.type)?.name?.toLowerCase() || ''
  const isSupportIssueType = selectedTypeName.includes('support')

  // Only count isQAMissed and qaConfirmation filters when Type is "Support Issue"
  const activeFilterCount = [
    filters.status, filters.type, filters.priority, filters.author,
    filters.assignee, filters.releaseTag, filters.receivedDateFrom,
    filters.receivedDateTo, filters.search, filters.testingStatus,
    isSupportIssueType ? filters.isQAMissed : '',
    isSupportIssueType ? filters.qaConfirmation : '',
    filters.testingReceivedDateFrom, filters.testingReceivedDateTo,
  ].filter(Boolean).length

  const getTypeIcon = (type: string) => {
    const t = type.toLowerCase()
    if (t.includes('bug')) return <Bug className="w-4 h-4" />
    if (t.includes('feature') || t.includes('user story')) return <Zap className="w-4 h-4" />
    if (t.includes('task')) return <CheckCircle2 className="w-4 h-4" />
    return <FileText className="w-4 h-4" />
  }

  const getPriorityColor = (p: string) => {
    const pl = p.toLowerCase()
    if (pl.includes('immediate') || pl.includes('urgent')) return '#ef4444'
    if (pl.includes('high')) return '#f97316'
    if (pl.includes('normal') || pl.includes('medium')) return '#3b82f6'
    return '#22c55e'
  }

  const getStatusColor = (s: string) => {
    const sl = s.toLowerCase()
    if (sl.includes('closed') || sl.includes('done')) return '#22c55e'
    if (sl.includes('progress') || sl.includes('review')) return '#3b82f6'
    if (sl.includes('new') || sl.includes('open')) return '#a855f7'
    return 'var(--text-muted)'
  }

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-2">
          <div>
            <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
              📖 StoryPot
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Select an OpenProject project and retrieve matching records.
            </p>
          </div>
        </div>

        {/* Search & Filter Panel */}
        <GlassCard className="p-5 overflow-visible">
          <div className="space-y-4 overflow-visible">
            {/* Row 1: Project Selection & Perspective */}
            <div className="flex flex-col sm:flex-row gap-3 relative z-20">
              {/* Searchable Project Dropdown (Supabase/Qaly Projects) */}
              <div className="flex-1 min-w-[200px] relative" ref={projectDropdownRef}>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>Qaly Project</label>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                    disabled={loadingProjects}
                    className="w-full h-10 pl-10 pr-8 rounded-xl border text-sm text-left flex items-center justify-between"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                      style={{ color: 'var(--text-muted)' }} />
                    <span className="truncate">
                      {loadingProjects ? 'Loading...' : currentProject?.name || 'Select Project'}
                    </span>
                    <ChevronDown className="w-4 h-4 shrink-0" style={{ color: 'var(--text-muted)' }} />
                  </button>
                  
                  {showProjectDropdown && (
                    <div 
                      className="absolute z-[100] mt-1 w-full rounded-xl border shadow-lg overflow-hidden"
                      style={{
                        background: isDark ? 'rgba(30,30,30,0.98)' : 'rgba(255,255,255,0.98)',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        backdropFilter: 'blur(12px)',
                      }}
                    >
                      <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                            style={{ color: 'var(--text-muted)' }} />
                          <input
                            type="text"
                            value={projectSearch}
                            onChange={(e) => setProjectSearch(e.target.value)}
                            placeholder="Search projects..."
                            className="w-full h-9 pl-9 pr-3 rounded-lg border text-sm"
                            style={{
                              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                              color: 'var(--text-primary)',
                            }}
                            autoFocus
                          />
                        </div>
                      </div>
                      <div className="max-h-60 overflow-y-auto">
                        {filteredProjects.length === 0 ? (
                          <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                            No projects found
                          </div>
                        ) : (
                          filteredProjects.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => {
                                setSelectedProjectId(p.id)
                                setShowProjectDropdown(false)
                                setProjectSearch('')
                                setSelectedOpProjectId('') // Reset OP project when Qaly project changes
                                resetFilters() // Reset filters when project changes
                              }}
                              className={`w-full px-4 py-2.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 ${
                                selectedProjectId === p.id ? 'bg-blue-500/10' : ''
                              }`}
                              style={{ color: 'var(--text-primary)' }}
                            >
                              <FolderOpen className="w-4 h-4 shrink-0" style={{ color: selectedProjectId === p.id ? '#3b82f6' : 'var(--text-muted)' }} />
                              <span className="truncate">{p.name}</span>
                              {selectedProjectId === p.id && (
                                <CheckCircle2 className="w-4 h-4 ml-auto text-blue-500" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* OpenProject Project Dropdown */}
              {config && (
                <div className="flex-1 min-w-[200px] relative" ref={opProjectDropdownRef}>
                  <label className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                    style={{ color: '#3b82f6' }}>OpenProject Project</label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowOpProjectDropdown(!showOpProjectDropdown)}
                      disabled={loadingOpProjects}
                      className="w-full h-10 pl-10 pr-8 rounded-xl border text-sm text-left flex items-center justify-between"
                      style={{
                        background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                        borderColor: 'rgba(59, 130, 246, 0.3)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                        style={{ color: '#3b82f6' }} />
                      <span className="truncate">
                        {loadingOpProjects ? 'Loading...' : selectedOpProject?.name || 'All Projects'}
                      </span>
                      <ChevronDown className="w-4 h-4 shrink-0" style={{ color: '#3b82f6' }} />
                    </button>
                    
                    {showOpProjectDropdown && (
                      <div 
                        className="absolute z-[100] mt-1 w-full rounded-xl border shadow-lg overflow-hidden"
                        style={{
                          background: isDark ? 'rgba(30,30,30,0.98)' : 'rgba(255,255,255,0.98)',
                          borderColor: 'rgba(59, 130, 246, 0.3)',
                          backdropFilter: 'blur(12px)',
                        }}
                      >
                        <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
                          <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                              style={{ color: 'var(--text-muted)' }} />
                            <input
                              type="text"
                              value={opProjectSearch}
                              onChange={(e) => setOpProjectSearch(e.target.value)}
                              placeholder="Search OpenProject projects..."
                              className="w-full h-9 pl-9 pr-3 rounded-lg border text-sm"
                              style={{
                                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                color: 'var(--text-primary)',
                              }}
                              autoFocus
                            />
                          </div>
                        </div>
                        <div className="max-h-60 overflow-y-auto">
                          {/* All Projects Option */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOpProjectId('')
                              setShowOpProjectDropdown(false)
                              setOpProjectSearch('')
                            }}
                            className={`w-full px-4 py-2.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 ${
                              !selectedOpProjectId ? 'bg-blue-500/10' : ''
                            }`}
                            style={{ color: 'var(--text-primary)' }}
                          >
                            <Database className="w-4 h-4 shrink-0" style={{ color: !selectedOpProjectId ? '#3b82f6' : 'var(--text-muted)' }} />
                            <span>All Projects</span>
                            {!selectedOpProjectId && (
                              <CheckCircle2 className="w-4 h-4 ml-auto text-blue-500" />
                            )}
                          </button>
                          {filteredOpProjects.length === 0 && opProjectSearch ? (
                            <div className="px-4 py-3 text-sm" style={{ color: 'var(--text-muted)' }}>
                              No projects found
                            </div>
                          ) : (
                            filteredOpProjects.map((p) => (
                              <button
                                key={p.id}
                                type="button"
                                onClick={() => {
                                  setSelectedOpProjectId(p.id.toString())
                                  setShowOpProjectDropdown(false)
                                  setOpProjectSearch('')
                                }}
                                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-2 ${
                                  selectedOpProjectId === p.id.toString() ? 'bg-blue-500/10' : ''
                                }`}
                                style={{ color: 'var(--text-primary)' }}
                              >
                                <Database className="w-4 h-4 shrink-0" style={{ color: selectedOpProjectId === p.id.toString() ? '#3b82f6' : 'var(--text-muted)' }} />
                                <span className="truncate">{p.name}</span>
                                {selectedOpProjectId === p.id.toString() && (
                                  <CheckCircle2 className="w-4 h-4 ml-auto text-blue-500" />
                                )}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Perspective Selector */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                  style={{ color: 'var(--text-muted)' }}>View</label>
                <div className="flex items-center rounded-xl border overflow-hidden h-10" style={{
                  background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                }}>
                  {PERSPECTIVES.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setPerspective(p.id)}
                      className={`flex items-center gap-1.5 px-3 h-full text-xs font-medium transition-all ${
                        perspective === p.id ? 'text-white' : 'hover:bg-white/5'
                      }`}
                      style={{
                        background: perspective === p.id 
                          ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' 
                          : 'transparent',
                        color: perspective === p.id ? 'white' : 'var(--text-muted)',
                      }}
                    >
                      {p.icon}
                      <span className="hidden md:inline">{p.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Filters Section - Only show when project is selected and configured */}
            {selectedProjectId && config && perspective === 'qa-manager' && (
              <>
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                    style={{ color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => setFilters({ search: e.target.value })}
                    placeholder="Search by ID or subject..."
                    className="w-full h-10 pl-10 pr-4 rounded-xl border text-sm"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>

                {/* Filter Toggle */}
                <div className="flex items-center gap-3">
                  <Button variant="outline" onClick={() => setShowFilters(!showFilters)} className="gap-2">
                    <Filter className="w-4 h-4" />
                    Filters
                    {activeFilterCount > 0 && (
                      <span className="w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">
                        {activeFilterCount}
                      </span>
                    )}
                    {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                  {activeFilterCount > 0 && (
                    <Button variant="ghost" onClick={resetFilters} className="gap-2 text-red-500">
                      <X className="w-4 h-4" /> Clear Filters
                    </Button>
                  )}
                </div>

                {/* Expanded Filters */}
                <AnimatePresence>
                  {showFilters && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="space-y-4 overflow-hidden"
                    >
                      {/* Row 1: Basic Filters */}
                      <div className={`grid gap-3 ${isSupportIssueType ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
                        <FilterSelect label="Status" value={filters.status}
                          onChange={(v) => setFilters({ status: v })} options={statusOptions} isDark={isDark} useIdAsValue />
                        <FilterSelect label="Type" value={filters.type}
                          onChange={(v) => setFilters({ type: v, releaseTag: '' })} options={typeOptions} isDark={isDark} useIdAsValue />
                        {!isSupportIssueType && (
                          <FilterSelect label="Release" value={filters.releaseTag}
                            onChange={(v) => setFilters({ releaseTag: v })} options={versionOptions} isDark={isDark} />
                        )}
                      </div>

                      {/* Row 2: QA Manager Filters */}
                      <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
                        <FilterSelect label="Author" value={filters.author}
                          onChange={(v) => setFilters({ author: v })} options={authorOptions} isDark={isDark} />
                        <FilterSelect label="Assignee" value={filters.assignee}
                          onChange={(v) => setFilters({ assignee: v })} options={assigneeOptions} isDark={isDark} />
                      </div>

                      {/* Row 3: QA Specific Filters */}
                      <div className={`grid gap-3 ${isSupportIssueType ? 'grid-cols-2 sm:grid-cols-3' : 'grid-cols-1'}`}>
                        <FilterSelect label="Testing Status" value={filters.testingStatus}
                          onChange={(v) => setFilters({ testingStatus: v })} options={testingStatusOptions} isDark={isDark} />
                        {isSupportIssueType && (
                          <>
                            <FilterSelect label="Is QA Missed?" value={filters.isQAMissed}
                              onChange={(v) => setFilters({ isQAMissed: v })} options={isQAMissedOptions} isDark={isDark} />
                            <FilterSelect label="QA Confirmation" value={filters.qaConfirmation}
                              onChange={(v) => setFilters({ qaConfirmation: v })} options={qaConfirmationOptions} isDark={isDark} />
                          </>
                        )}
                      </div>

                      {/* Row 4: Received for Testing Date Filter (On-Demand) */}
                      <div className="p-3 rounded-lg border" style={{
                        background: isDark ? 'rgba(59, 130, 246, 0.05)' : 'rgba(59, 130, 246, 0.03)',
                        borderColor: 'rgba(59, 130, 246, 0.2)',
                      }}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <History className="w-4 h-4" style={{ color: '#3b82f6' }} />
                            <span className="text-xs font-bold uppercase" style={{ color: '#3b82f6' }}>
                              Received for Testing Date
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                              if (!config || fetchingHistory || workPackages.length === 0) return
                              setFetchingHistory(true)
                              setHistoryProgress({ current: 0, found: 0, total: workPackages.length })
                              try {
                                const wpIds = workPackages.map(wp => wp.id)
                                const changes = await fetchTestingStatusChanges(
                                  config,
                                  wpIds,
                                  'Forwarded to the Testing Team',
                                  (current, found) => setHistoryProgress({ current, found, total: wpIds.length })
                                )
                                // Update work packages with forwarding info
                                const updated = workPackages.map(wp => {
                                  const change = changes.get(wp.id)
                                  if (change) {
                                    return {
                                      ...wp,
                                      forwardedToTestingAt: change.changedAt,
                                      forwardedToTestingBy: change.changedBy,
                                    }
                                  }
                                  return wp
                                })
                                setWorkPackages(updated)
                                toast({
                                  title: 'Testing Dates Loaded',
                                  description: `Found ${changes.size} items with testing handoff dates`,
                                })
                              } catch (err) {
                                toast({ variant: 'destructive', title: 'Error', description: 'Failed to load testing dates' })
                              } finally {
                                setFetchingHistory(false)
                              }
                            }}
                            disabled={fetchingHistory || !hasFetched || workPackages.length === 0}
                            className="gap-1.5 h-7 text-xs"
                          >
                            {fetchingHistory ? (
                              <>
                                <Loader2 className="w-3 h-3 animate-spin" />
                                {historyProgress.current}/{historyProgress.total}
                              </>
                            ) : (
                              <>
                                <History className="w-3 h-3" />
                                Load Dates
                              </>
                            )}
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>From</label>
                            <input
                              type="date"
                              value={filters.testingReceivedDateFrom || ''}
                              onChange={(e) => setFilters({ testingReceivedDateFrom: e.target.value })}
                              className="w-full h-9 px-3 rounded-lg border text-sm"
                              style={{
                                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                color: 'var(--text-primary)',
                              }}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>To</label>
                            <input
                              type="date"
                              value={filters.testingReceivedDateTo || ''}
                              onChange={(e) => setFilters({ testingReceivedDateTo: e.target.value })}
                              className="w-full h-9 px-3 rounded-lg border text-sm"
                              style={{
                                background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                                color: 'var(--text-primary)',
                              }}
                            />
                          </div>
                        </div>
                        <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
                          Click "Load Dates" to fetch when each item was forwarded to testing. This may take a moment.
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {!selectedProjectId && 'Select a project to begin'}
                {selectedProjectId && !config && 'OpenProject not configured for this project'}
                {selectedProjectId && config && !hasFetched && 'Click Fetch Data to retrieve data'}
                {selectedProjectId && config && hasFetched && filtersChanged && (
                  <span className="flex items-center gap-1 text-amber-500">
                    <AlertCircle className="w-3 h-3" />
                    Filters changed. Click Fetch Data to update results.
                  </span>
                )}
              </div>
              <Button 
                onClick={handleSearchFetch} 
                disabled={loading || !config || !selectedProjectId}
                className="gap-2 min-w-[140px]"
                style={{
                  background: loading ? undefined : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                  color: 'white',
                }}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Fetching...
                  </>
                ) : (
                  <>
                    <Database className="w-4 h-4" />
                    Fetch Data
                  </>
                )}
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* No Project Selected */}
        {!selectedProjectId && (
          <GlassCard className="p-12 text-center">
            <FolderOpen className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Select a Project
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Choose an OpenProject project from the dropdown above to get started.
            </p>
          </GlassCard>
        )}

        {/* OpenProject Not Configured */}
        {selectedProjectId && !config && (
          <GlassCard className="p-12 text-center">
            <ExternalLink className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              OpenProject Not Configured
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              This project doesn't have OpenProject integration configured.
            </p>
          </GlassCard>
        )}

        {/* Coming Soon for other perspectives */}
        {perspective !== 'qa-manager' && config && (
          <GlassCard className="p-16 text-center">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            >
              <div 
                className="w-20 h-20 mx-auto mb-6 rounded-2xl flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.2), rgba(249, 115, 22, 0.2))' }}
              >
                <Wrench className="w-10 h-10" style={{ color: '#f97316' }} />
              </div>
              <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                {PERSPECTIVES.find(p => p.id === perspective)?.label} View
              </h2>
              <p className="text-lg mb-2" style={{ color: 'var(--text-secondary)' }}>
                Will be available shortly
              </p>
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold"
                style={{ background: 'rgba(251, 146, 60, 0.15)', color: '#f97316' }}
              >
                <Loader2 className="w-4 h-4 animate-spin" />
                STILL BUILDING!!!
              </div>
            </motion.div>
          </GlassCard>
        )}

        {config && perspective === 'qa-manager' && (
          <>
            {/* Stats - Only show after fetch */}
            {canViewDashboard && stats && hasFetched && (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <StatCard label="Total" value={stats.total} icon={<BarChart3 className="w-5 h-5" />}
                  color="#3b82f6" isDark={isDark} />
                <StatCard label="Filtered" value={stats.filtered} icon={<Filter className="w-5 h-5" />}
                  color="#8b5cf6" isDark={isDark} />
                <StatCard label="Overdue" value={stats.overdue} icon={<AlertTriangle className="w-5 h-5" />}
                  color="#ef4444" isDark={isDark} />
                <StatCard label="Unassigned" value={stats.unassigned} icon={<User className="w-5 h-5" />}
                  color="#f97316" isDark={isDark} />
                <StatCard label="Completed" value={`${stats.completedPercentage}%`}
                  icon={<CheckCircle2 className="w-5 h-5" />} color="#22c55e" isDark={isDark} />
              </div>
            )}

            {/* Result Summary */}
            {hasFetched && stats && (
              <div className="flex flex-wrap items-center gap-3 px-1 py-2 rounded-lg" style={{
                background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.01)',
              }}>
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    {currentProject?.name}
                  </span>
                </div>
                {selectedOpProject && (
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4" style={{ color: '#3b82f6' }} />
                    <span className="text-sm font-medium" style={{ color: '#3b82f6' }}>
                      {selectedOpProject.name}
                    </span>
                  </div>
                )}
                <span className="text-xs px-2 py-1 rounded-full" style={{ 
                  background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' 
                }}>
                  {stats.filtered} of {stats.total} records
                </span>
                {activeFilterCount > 0 && (
                  <span className="text-xs px-2 py-1 rounded-full" style={{ 
                    background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' 
                  }}>
                    {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''}
                  </span>
                )}
                {lastFetchedAt && (
                  <span className="text-xs ml-auto" style={{ color: 'var(--text-muted)' }}>
                    Last fetched: {new Date(lastFetchedAt).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {/* Work Packages List */}
            <GlassCard className="p-0 overflow-hidden">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3"
                  style={{ color: 'var(--text-muted)' }}>
                  <Loader2 className="w-8 h-8 animate-spin" style={{ color: '#3b82f6' }} />
                  <p className="text-sm font-medium">Fetching OpenProject data...</p>
                </div>
              ) : !hasFetched ? (
                <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                  <Database className="w-12 h-12 mx-auto mb-3" style={{ opacity: 0.5 }} />
                  <p className="text-lg font-medium">Ready to fetch data</p>
                  <p className="text-sm mt-2">Configure your filters and click Search / Fetch</p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
                  <AlertTriangle className="w-12 h-12 text-red-500" />
                  <p className="text-lg font-medium text-red-500">Error fetching data</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{error}</p>
                  <Button onClick={handleSearchFetch} variant="outline" className="mt-2 gap-2">
                    <RefreshCw className="w-4 h-4" /> Retry
                  </Button>
                </div>
              ) : computedFilteredWPs.length === 0 ? (
                <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                  <FileText className="w-12 h-12 mx-auto mb-3" style={{ opacity: 0.5 }} />
                  <p className="text-lg font-medium">No matching records found</p>
                  <p className="text-sm mt-2">Try adjusting your filters.</p>
                </div>
              ) : (
                <>
                  {/* Select All Header */}
                  <div className="px-4 py-3 border-b flex items-center gap-3" style={{ borderColor: 'var(--border)' }}>
                    <button 
                      type="button"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleSelectAll(); }}
                      className="flex items-center gap-2 text-sm cursor-pointer select-none"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {paginatedWPs.length > 0 && paginatedWPs.every(wp => selectedIds.has(wp.id))
                        ? <CheckSquare className="w-5 h-5 text-green-500" />
                        : <Square className="w-5 h-5" />}
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : `Select All (${paginatedWPs.length})`}
                    </button>
                  </div>
                  <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {paginatedWPs.map((wp) => (
                      <WorkPackageRow key={wp.id} wp={wp} config={config} isDark={isDark}
                        getTypeIcon={getTypeIcon} getPriorityColor={getPriorityColor}
                        getStatusColor={getStatusColor}
                        isSelected={selectedIds.has(wp.id)}
                        onToggleSelect={toggleSelect} />
                    ))}
                  </div>
                  
                  {/* Pagination Controls */}
                  {pagination.totalPages > 0 && (
                    <PaginationControls
                      currentPage={pagination.currentPage}
                      totalPages={pagination.totalPages}
                      pageSize={pagination.pageSize}
                      totalRecords={pagination.totalRecords}
                      onPageChange={handlePageChange}
                      onPageSizeChange={handlePageSizeChange}
                      loading={loading}
                      isDark={isDark}
                    />
                  )}
                </>
              )}
            </GlassCard>

            {/* Floating Action Bar - Minimal Elegant Design */}
            {selectedIds.size > 0 && (
              <motion.div
                initial={{ y: 60, opacity: 0, scale: 0.95 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 60, opacity: 0, scale: 0.95 }}
                transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50"
              >
                <div
                  className="flex items-center gap-1 px-1.5 py-1.5 rounded-full backdrop-blur-xl border shadow-lg"
                  style={{
                    background: isDark ? 'rgba(23, 23, 23, 0.9)' : 'rgba(255, 255, 255, 0.95)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                    boxShadow: isDark
                      ? '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.05)'
                      : '0 8px 32px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Selection Count */}
                  <div className="flex items-center gap-2 pl-3 pr-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}
                    >
                      {selectedIds.size}
                    </div>
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                      selected
                    </span>
                  </div>

                  {/* Divider */}
                  <div className="w-px h-6" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />

                  {/* Export Buttons */}
                  <button
                    onClick={exportToReleaseTracker}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                      color: 'white',
                    }}
                  >
                    <Rocket className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Release</span>
                  </button>

                  <button
                    onClick={exportToSupportTracker}
                    className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium transition-all hover:scale-105 active:scale-95"
                    style={{
                      background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)',
                      color: 'white',
                    }}
                  >
                    <LifeBuoy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Support</span>
                  </button>

                  {/* Divider */}
                  <div className="w-px h-6" style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }} />

                  {/* Clear Button */}
                  <button
                    onClick={clearSelection}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:bg-red-500/10 active:scale-95"
                    style={{ color: '#ef4444' }}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, color, isDark }: {
  label: string; value: number | string; icon: React.ReactNode; color: string; isDark: boolean
}) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20`, color }}>{icon}</div>
        <div>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>{value}</p>
          <p className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>{label}</p>
        </div>
      </div>
    </GlassCard>
  )
}

function FilterSelect({ label, value, onChange, options, isDark, useIdAsValue = false }: {
  label: string; value: string; onChange: (v: string) => void
  options: FilterOption[]; isDark: boolean; useIdAsValue?: boolean
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5"
        style={{ color: 'var(--text-muted)' }}>{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full h-9 px-3 rounded-lg border text-sm"
        style={{
          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
          color: 'var(--text-primary)',
        }}>
        <option value="">All</option>
        {options.map((opt) => (
          <option key={`${opt.id}-${opt.name}`} value={useIdAsValue ? String(opt.id) : opt.name}>{opt.name}</option>
        ))}
      </select>
    </div>
  )
}

function WorkPackageRow({ wp, config, isDark, getTypeIcon, getPriorityColor, getStatusColor, isSelected, onToggleSelect }: {
  wp: StoryPotWorkPackage; config: OpenProjectConfig; isDark: boolean
  getTypeIcon: (t: string) => React.ReactNode
  getPriorityColor: (p: string) => string; getStatusColor: (s: string) => string
  isSelected?: boolean
  onToggleSelect?: (id: number, e: React.MouseEvent) => void
}) {
  return (
    <div 
      className="flex items-start gap-2 p-4 hover:bg-black/5 dark:hover:bg-white/5"
      style={{ background: isSelected ? (isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.05)') : undefined }}
    >
      {/* Checkbox */}
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          onToggleSelect?.(wp.id, e)
        }}
        className="mt-1 shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10 select-none"
      >
        {isSelected
          ? <CheckSquare className="w-5 h-5 text-green-500" />
          : <Square className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />}
      </button>
      
      {/* Content - clickable link */}
      <a href={`${config.openproject_url}/work_packages/${wp.id}`} target="_blank" rel="noopener noreferrer"
        className="flex-1 flex items-start gap-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)',
            color: 'var(--text-secondary)' }}>{getTypeIcon(wp.type)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>#{wp.id}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
              style={{ background: `${getStatusColor(wp.status)}20`, color: getStatusColor(wp.status) }}>
              {wp.status}
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
              style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                color: 'var(--text-secondary)' }}>{wp.type}</span>
            {wp.release && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                <Tag className="w-3 h-3 inline mr-1" />{wp.release}
              </span>
            )}
            {wp.isOverdue && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-500">
                Overdue
              </span>
            )}
            {wp.testingStatus && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                {wp.testingStatus}
              </span>
            )}
            {wp.isQAMissed && wp.isQAMissed.toLowerCase() === 'yes' && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-500/20 text-orange-500">
                QA Missed
              </span>
            )}
            {wp.qaConfirmation && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}>
                {wp.qaConfirmation}
              </span>
            )}
          </div>
          <p className="text-sm font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{wp.subject}</p>
          <div className="flex items-center gap-4 text-xs flex-wrap" style={{ color: 'var(--text-muted)' }}>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: getPriorityColor(wp.priority) }} />
              {wp.priority}
            </span>
            <span className="flex items-center gap-1"><Users className="w-3 h-3" />Author: {wp.author}</span>
            <span className="flex items-center gap-1"><User className="w-3 h-3" />{wp.assignee}</span>
            {wp.createdAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(wp.createdAt).toLocaleDateString()}
              </span>
            )}
            {wp.forwardedToTestingAt && (
              <span className="flex items-center gap-1" style={{ color: '#3b82f6' }}>
                <History className="w-3 h-3" />
                Testing: {new Date(wp.forwardedToTestingAt).toLocaleDateString()}
              </span>
            )}
            {wp.percentageDone > 0 && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{wp.percentageDone}%</span>
            )}
          </div>
        </div>
        {wp.percentageDone > 0 && (
          <div className="w-20 shrink-0">
            <div className="text-right text-xs font-bold mb-1" style={{ color: 'var(--text-muted)' }}>
              {wp.percentageDone}%
            </div>
            <div className="h-2 rounded-full overflow-hidden"
              style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}>
              <div className="h-full rounded-full"
                style={{ width: `${wp.percentageDone}%`,
                  background: wp.percentageDone === 100 ? '#22c55e' : '#3b82f6' }} />
            </div>
          </div>
        )}
      </a>
    </div>
  )
}

// Pagination Controls Component
function PaginationControls({
  currentPage,
  totalPages,
  pageSize,
  totalRecords,
  onPageChange,
  onPageSizeChange,
  loading,
  isDark,
}: {
  currentPage: number
  totalPages: number
  pageSize: number
  totalRecords: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  loading: boolean
  isDark: boolean
}) {
  // Calculate display range
  const startRecord = (currentPage - 1) * pageSize + 1
  const endRecord = Math.min(currentPage * pageSize, totalRecords)

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = []
    const maxVisible = 5
    
    if (totalPages <= maxVisible + 2) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      // Always show first page
      pages.push(1)
      
      if (currentPage > 3) {
        pages.push('ellipsis')
      }
      
      // Show pages around current
      const start = Math.max(2, currentPage - 1)
      const end = Math.min(totalPages - 1, currentPage + 1)
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i)
      }
      
      if (currentPage < totalPages - 2) {
        pages.push('ellipsis')
      }
      
      // Always show last page
      if (!pages.includes(totalPages)) pages.push(totalPages)
    }
    
    return pages
  }

  const pageNumbers = getPageNumbers()

  return (
    <div 
      className="px-4 py-3 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
      style={{ borderColor: 'var(--border)' }}
    >
      {/* Records info */}
      <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-muted)' }}>
        <span>
          Showing {startRecord}–{endRecord} of {totalRecords.toLocaleString()} tickets
        </span>
        
        {/* Page size selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs">Per page:</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={loading}
            className="h-7 px-2 rounded-md border text-xs"
            style={{
              background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
              color: 'var(--text-primary)',
            }}
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Page navigation */}
      <div className="flex items-center gap-1">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          className="flex items-center gap-1 h-8 px-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: 'var(--text-secondary)' }}
        >
          <ChevronLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Previous</span>
        </button>

        {/* Page numbers */}
        <div className="flex items-center gap-1">
          {pageNumbers.map((page, idx) => (
            page === 'ellipsis' ? (
              <span 
                key={`ellipsis-${idx}`} 
                className="w-8 h-8 flex items-center justify-center text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                disabled={loading}
                className={`w-8 h-8 rounded-lg text-xs font-medium transition-all ${
                  currentPage === page 
                    ? 'text-white' 
                    : 'hover:bg-black/5 dark:hover:bg-white/5'
                }`}
                style={{
                  background: currentPage === page 
                    ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)' 
                    : 'transparent',
                  color: currentPage === page ? 'white' : 'var(--text-secondary)',
                }}
              >
                {page}
              </button>
            )
          ))}
        </div>

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
          className="flex items-center gap-1 h-8 px-2 rounded-lg text-xs font-medium transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-black/5 dark:hover:bg-white/5"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
