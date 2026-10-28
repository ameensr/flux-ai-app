// src/modules/StoryPot/index.tsx
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Search, RefreshCw, Filter, X, Bug, FileText, Zap, CheckCircle2,
  AlertTriangle, User, Calendar, Clock, ExternalLink, BarChart3,
  Loader2, FolderOpen, Lock, ChevronDown, ChevronUp, Users, Tag,
  Square, CheckSquare, Rocket, LifeBuoy, Shield, Code, Headphones, Wrench,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/ThemeContext'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { supabase } from '@/lib/supabase'
import {
  fetchWorkPackages, fetchWorkPackageStats, fetchStatuses, fetchTypes,
  fetchPriorities, fetchProjectMembers, formatWorkPackage,
  fetchTestingStatusChanges,
  type OpenProjectConfig, type TestingStatusChange,
} from '@/services/openproject'
import { useStoryPotStore } from './store'
import type { StoryPotWorkPackage, FilterOption } from './types'

const MODULE_KEY = 'story-pot'

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
    isQAMissedOptions, qaConfirmationOptions,
    setWorkPackages, setFilteredWorkPackages, setStats, setFilters,
    resetFilters, setLoading, setError, setSelectedProjectId, setFilterOptions,
  } = useStoryPotStore()

  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [showFilters, setShowFilters] = useState(false)
  const [statusOptions, setStatusOptions] = useState<FilterOption[]>([])
  const [typeOptions, setTypeOptions] = useState<FilterOption[]>([])
  const [priorityOptions, setPriorityOptions] = useState<FilterOption[]>([])
  const [versionOptions, setVersionOptions] = useState<FilterOption[]>([])
  const [testingStatusChanges, setTestingStatusChanges] = useState<Map<number, TestingStatusChange>>(new Map())
  const [loadingChanges, setLoadingChanges] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [perspective, setPerspective] = useState<Perspective>('qa-manager')

  const currentProject = useMemo(
    () => projects.find((p) => p.id === selectedProjectId),
    [projects, selectedProjectId]
  )
  const config = currentProject?.metadata?.openproject

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
      const change = testingStatusChanges.get(wp.id)
      return {
        openproject_id: wp.id,
        description: wp.subject,
        release_version: wp.version || '',
        priority: wp.priority,
        received_date_time: change?.changedAt || wp.createdAt,
        assigned_to_name: wp.assignee,
        comments: wp.description || '',
        product_name: wp.project,
        author: wp.author,
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
      const change = testingStatusChanges.get(wp.id)
      return {
        openproject_id: wp.id,
        description: wp.subject,
        received_date: change?.changedAt?.split('T')[0] || wp.createdAt?.split('T')[0],
        received_time: change?.changedAt?.split('T')[1]?.substring(0, 5) || '',
        tester_name: wp.assignee,
        testing_status: 'Not Started',
        is_qa_miss: wp.isQAMissed || 'Not Applicable',
        comments: wp.description || '',
        product_name: wp.project,
        author: wp.author,
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

  // Load filter options
  useEffect(() => {
    if (!config?.openproject_url || !config?.openproject_api_key) return
    async function loadFilterOptions() {
      try {
        const [statuses, types, priorities, members] = await Promise.all([
          fetchStatuses(config!),
          fetchTypes(config!),
          fetchPriorities(config!),
          fetchProjectMembers(config!),
        ])
        setStatusOptions(statuses)
        setTypeOptions(types)
        setPriorityOptions(priorities)
        setFilterOptions({ assignees: members, authors: members })
      } catch { /* silent */ }
    }
    loadFilterOptions()
  }, [config?.openproject_url, config?.openproject_api_key])

  // Apply client-side filters WITHOUT testing received date - for pre-filtering
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
    if (filters.releaseTag) {
      const tagLower = filters.releaseTag.toLowerCase()
      result = result.filter(wp => wp.version?.toLowerCase().includes(tagLower))
    }
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
    if (filters.isQAMissed) {
      const missedLower = filters.isQAMissed.toLowerCase()
      result = result.filter(wp => wp.isQAMissed?.toLowerCase() === missedLower)
    }
    if (filters.qaConfirmation) {
      const confLower = filters.qaConfirmation.toLowerCase()
      result = result.filter(wp => wp.qaConfirmation?.toLowerCase() === confLower)
    }

    return result
  }, [workPackages, filters.search, filters.author, filters.assignee, filters.releaseTag,
      filters.receivedDateFrom, filters.receivedDateTo, filters.testingStatus,
      filters.isQAMissed, filters.qaConfirmation])

  // Final filtered results - apply testing received date filter if changes loaded
  const computedFilteredWPs = useMemo(() => {
    let result = preFilteredWPs
    
    // Testing Received Date filter - only apply if changes are loaded
    if ((filters.testingReceivedDateFrom || filters.testingReceivedDateTo) && testingStatusChanges.size > 0) {
      result = result.filter(wp => {
        const change = testingStatusChanges.get(wp.id)
        if (!change) return false
        const changeDate = change.changedAt.split('T')[0]
        if (filters.testingReceivedDateFrom && changeDate < filters.testingReceivedDateFrom) return false
        if (filters.testingReceivedDateTo && changeDate > filters.testingReceivedDateTo) return false
        return true
      })
    }

    return result
  }, [preFilteredWPs, testingStatusChanges, filters.testingReceivedDateFrom, filters.testingReceivedDateTo])

  // Toggle select all - defined after computedFilteredWPs
  const toggleSelectAll = useCallback(() => {
    setSelectedIds(prev => {
      if (prev.size === computedFilteredWPs.length && computedFilteredWPs.length > 0) {
        return new Set()
      }
      return new Set(computedFilteredWPs.map(wp => wp.id))
    })
  }, [computedFilteredWPs])

  // Update store when computed results change
  useEffect(() => {
    setFilteredWorkPackages(computedFilteredWPs)
    if (stats) {
      const byAuthor: Record<string, number> = {}
      const byAssignee: Record<string, number> = {}
      computedFilteredWPs.forEach(wp => {
        byAuthor[wp.author] = (byAuthor[wp.author] || 0) + 1
        byAssignee[wp.assignee] = (byAssignee[wp.assignee] || 0) + 1
      })
      setStats({ ...stats, filtered: computedFilteredWPs.length, byAuthor, byAssignee })
    }
  }, [computedFilteredWPs])

  // Lazy load testing status changes only for PRE-FILTERED work packages (much faster)
  useEffect(() => {
    const needsChanges = filters.testingReceivedDateFrom || filters.testingReceivedDateTo
    if (!needsChanges || loadingChanges || !config || preFilteredWPs.length === 0) return
    
    // Only fetch for work packages we don't already have
    const idsToFetch = preFilteredWPs
      .filter(wp => !testingStatusChanges.has(wp.id))
      .map(wp => wp.id)
    
    if (idsToFetch.length === 0) return
    
    // Limit to max 50 to keep it fast
    const limitedIds = idsToFetch.slice(0, 50)
    
    setLoadingChanges(true)
    fetchTestingStatusChanges(config, limitedIds, 'Forwarded to the Testing Team')
      .then(newChanges => {
        setTestingStatusChanges(prev => {
          const merged = new Map(prev)
          newChanges.forEach((v, k) => merged.set(k, v))
          return merged
        })
      })
      .catch(() => {})
      .finally(() => setLoadingChanges(false))
  }, [filters.testingReceivedDateFrom, filters.testingReceivedDateTo, preFilteredWPs, loadingChanges, config])

  // Load data - triggered when config or API filters change
  const loadData = useCallback(async (cfg: OpenProjectConfig) => {
    if (!cfg?.openproject_url || !cfg?.openproject_api_key) return
    setLoading(true)
    setError(null)
    try {
      const apiFilters: { status?: string[]; type?: string[]; priority?: string[] } = {}
      if (filters.status) apiFilters.status = [filters.status]
      if (filters.type) apiFilters.type = [filters.type]
      if (filters.priority) apiFilters.priority = [filters.priority]

      const [wpResult, statsResult] = await Promise.all([
        fetchWorkPackages(cfg, { ...apiFilters, pageSize: 200 }),
        fetchWorkPackageStats(cfg),
      ])

      const items = wpResult.items.map(wp => ({
        ...formatWorkPackage(wp),
        forwardedToTestingAt: null,
        forwardedToTestingBy: null,
      })) as StoryPotWorkPackage[]
      setWorkPackages(items)

      // Extract versions for release tag filter
      const versions = new Set<string>()
      items.forEach(wp => { if (wp.version) versions.add(wp.version) })
      setVersionOptions(Array.from(versions).map((v, i) => ({ id: i, name: v })))

      // Extract unique authors
      const authors = new Set<string>()
      items.forEach(wp => { if (wp.author) authors.add(wp.author) })
      
      // Extract unique testing statuses, QA missed values, QA confirmations
      const testingStatuses = new Set<string>()
      const qaConfirmations = new Set<string>()
      items.forEach(wp => {
        if (wp.testingStatus) testingStatuses.add(wp.testingStatus)
        if (wp.qaConfirmation) qaConfirmations.add(wp.qaConfirmation)
      })
      
      setFilterOptions({
        authors: Array.from(authors).map((a, i) => ({ id: i, name: a })),
        testingStatuses: Array.from(testingStatuses).map((s, i) => ({ id: i, name: s })),
        qaConfirmations: Array.from(qaConfirmations).map((c, i) => ({ id: i, name: c })),
      })

      setStats({
        ...statsResult,
        filtered: items.length,
        byAuthor: {},
        byAssignee: {},
        byTestingStatus: {},
        qaMissedCount: items.filter(wp => wp.isQAMissed?.toLowerCase() === 'yes').length,
      })
      
      // Reset testing status changes cache when data reloads
      setTestingStatusChanges(new Map())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch data' })
    } finally {
      setLoading(false)
    }
  }, [filters.status, filters.type, filters.priority, setWorkPackages, setFilterOptions, setStats, setLoading, setError, toast])

  // Fetch data when config becomes available or API filters change
  useEffect(() => {
    if (config?.openproject_url && config?.openproject_api_key) {
      loadData(config)
    }
  }, [config, filters.status, filters.type, filters.priority, loadData])

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

  const activeFilterCount = [
    filters.status, filters.type, filters.priority, filters.author,
    filters.assignee, filters.releaseTag, filters.receivedDateFrom,
    filters.receivedDateTo, filters.search, filters.testingStatus,
    filters.isQAMissed, filters.qaConfirmation,
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black" style={{ color: 'var(--text-primary)' }}>
              🍲 StoryPot
            </h1>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              OpenProject Work Packages Dashboard
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* Perspective Selector */}
            <div className="flex items-center rounded-xl border overflow-hidden" style={{
              background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
              borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
            }}>
              {PERSPECTIVES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPerspective(p.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-all ${
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

            <div className="relative">
              <select
                value={selectedProjectId || ''}
                onChange={(e) => setSelectedProjectId(e.target.value || null)}
                disabled={loadingProjects}
                className="h-10 pl-10 pr-8 rounded-xl border text-sm appearance-none"
                style={{
                  background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                  borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  color: 'var(--text-primary)', minWidth: '200px',
                }}
              >
                <option value="">Select Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
              <FolderOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                style={{ color: 'var(--text-muted)' }} />
            </div>
            <Button onClick={() => config && loadData(config)} disabled={loading || !config} variant="outline" className="gap-2">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {!selectedProjectId && (
          <GlassCard className="p-12 text-center">
            <FolderOpen className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Select a Project
            </h2>
          </GlassCard>
        )}

        {selectedProjectId && !config && (
          <GlassCard className="p-12 text-center">
            <ExternalLink className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-muted)' }} />
            <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              OpenProject Not Configured
            </h2>
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
            {/* Stats */}
            {canViewDashboard && stats && (
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

            {/* Filters */}
            <GlassCard className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
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
                    <X className="w-4 h-4" /> Clear All
                  </Button>
                )}
              </div>

              {showFilters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  className="mt-4 pt-4 border-t space-y-4 overflow-visible"
                  style={{ borderColor: 'var(--border)' }}
                >
                  {/* Row 1: Basic Filters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <FilterSelect label="Status" value={filters.status}
                      onChange={(v) => setFilters({ status: v })} options={statusOptions} isDark={isDark} />
                    <FilterSelect label="Type" value={filters.type}
                      onChange={(v) => setFilters({ type: v })} options={typeOptions} isDark={isDark} />
                    <FilterSelect label="Priority" value={filters.priority}
                      onChange={(v) => setFilters({ priority: v })} options={priorityOptions} isDark={isDark} />
                    <FilterSelect label="Release Tag" value={filters.releaseTag}
                      onChange={(v) => setFilters({ releaseTag: v })} options={versionOptions} isDark={isDark} />
                  </div>

                  {/* Row 2: QA Manager Filters */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <FilterSelect label="Author" value={filters.author}
                      onChange={(v) => setFilters({ author: v })} options={authorOptions} isDark={isDark} />
                    <FilterSelect label="Assignee" value={filters.assignee}
                      onChange={(v) => setFilters({ assignee: v })} options={assigneeOptions} isDark={isDark} />
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                        style={{ color: 'var(--text-muted)' }}>Received From</label>
                      <input 
                        type="date" 
                        value={filters.receivedDateFrom}
                        onChange={(e) => setFilters({ receivedDateFrom: e.target.value })}
                        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                        className="w-full h-9 px-3 rounded-lg border text-sm cursor-pointer"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          color: 'var(--text-primary)',
                          colorScheme: isDark ? 'dark' : 'light',
                        }}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                        style={{ color: 'var(--text-muted)' }}>Received To</label>
                      <input 
                        type="date" 
                        value={filters.receivedDateTo}
                        onChange={(e) => setFilters({ receivedDateTo: e.target.value })}
                        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                        className="w-full h-9 px-3 rounded-lg border text-sm cursor-pointer"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          color: 'var(--text-primary)',
                          colorScheme: isDark ? 'dark' : 'light',
                        }}
                      />
                    </div>
                  </div>

                  {/* Row 3: QA Specific Filters */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <FilterSelect label="Testing Status" value={filters.testingStatus}
                      onChange={(v) => setFilters({ testingStatus: v })} options={testingStatusOptions} isDark={isDark} />
                    <FilterSelect label="Is QA Missed?" value={filters.isQAMissed}
                      onChange={(v) => setFilters({ isQAMissed: v })} options={isQAMissedOptions} isDark={isDark} />
                    <FilterSelect label="QA Confirmation" value={filters.qaConfirmation}
                      onChange={(v) => setFilters({ qaConfirmation: v })} options={qaConfirmationOptions} isDark={isDark} />
                  </div>

                  {/* Row 4: Testing Received Date Filter */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                        style={{ color: '#3b82f6' }}>Testing Received From</label>
                      <input 
                        type="date" 
                        value={filters.testingReceivedDateFrom}
                        onChange={(e) => setFilters({ testingReceivedDateFrom: e.target.value })}
                        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                        className="w-full h-9 px-3 rounded-lg border text-sm cursor-pointer"
                        style={{
                          background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                          borderColor: 'rgba(59, 130, 246, 0.3)',
                          color: 'var(--text-primary)',
                          colorScheme: isDark ? 'dark' : 'light',
                        }}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold uppercase tracking-wider mb-1.5"
                        style={{ color: '#3b82f6' }}>Testing Received To</label>
                      <input 
                        type="date" 
                        value={filters.testingReceivedDateTo}
                        onChange={(e) => setFilters({ testingReceivedDateTo: e.target.value })}
                        onClick={(e) => (e.target as HTMLInputElement).showPicker?.()}
                        className="w-full h-9 px-3 rounded-lg border text-sm cursor-pointer"
                        style={{
                          background: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.05)',
                          borderColor: 'rgba(59, 130, 246, 0.3)',
                          color: 'var(--text-primary)',
                          colorScheme: isDark ? 'dark' : 'light',
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}
            </GlassCard>

            {/* Results Summary */}
            {stats && activeFilterCount > 0 && (
              <div className="flex items-center gap-2 px-1">
                <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Showing {stats.filtered} of {stats.total} items
                </span>
                <span className="text-xs px-2 py-1 rounded-full"
                  style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                  {activeFilterCount} filter{activeFilterCount > 1 ? 's' : ''} applied
                </span>
              </div>
            )}

            {/* Work Packages List */}
            <GlassCard className="p-0 overflow-hidden">
              {activeFilterCount === 0 ? (
                <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                  <Filter className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">Apply filters to view work packages</p>
                  <p className="text-sm mt-2">Select at least one filter to display data</p>
                </div>
              ) : loading && workPackages.length === 0 ? (
                <div className="flex items-center justify-center py-16 gap-3"
                  style={{ color: 'var(--text-muted)' }}>
                  <Loader2 className="w-6 h-6 animate-spin" /> Loading...
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-16 gap-3 text-red-500">
                  <AlertTriangle className="w-6 h-6" /> {error}
                </div>
              ) : computedFilteredWPs.length === 0 ? (
                <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-lg font-medium">No work packages found</p>
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
                      {selectedIds.size === computedFilteredWPs.length && computedFilteredWPs.length > 0
                        ? <CheckSquare className="w-5 h-5 text-green-500" />
                        : <Square className="w-5 h-5" />}
                      {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select All'}
                    </button>
                  </div>
                  <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                    {loadingChanges && (
                      <div className="px-4 py-2 text-xs flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                        <Loader2 className="w-3 h-3 animate-spin" /> Loading testing status history...
                      </div>
                    )}
                    {computedFilteredWPs.map((wp) => (
                      <WorkPackageRow key={wp.id} wp={wp} config={config} isDark={isDark}
                        getTypeIcon={getTypeIcon} getPriorityColor={getPriorityColor}
                        getStatusColor={getStatusColor}
                        testingChange={testingStatusChanges.get(wp.id)}
                        isSelected={selectedIds.has(wp.id)}
                        onToggleSelect={toggleSelect} />
                    ))}
                  </div>
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

function FilterSelect({ label, value, onChange, options, isDark }: {
  label: string; value: string; onChange: (v: string) => void
  options: FilterOption[]; isDark: boolean
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
          <option key={opt.id} value={typeof opt.id === 'number' ? opt.id : opt.name}>{opt.name}</option>
        ))}
      </select>
    </div>
  )
}

function WorkPackageRow({ wp, config, isDark, getTypeIcon, getPriorityColor, getStatusColor, testingChange, isSelected, onToggleSelect }: {
  wp: StoryPotWorkPackage; config: OpenProjectConfig; isDark: boolean
  getTypeIcon: (t: string) => React.ReactNode
  getPriorityColor: (p: string) => string; getStatusColor: (s: string) => string
  testingChange?: TestingStatusChange
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
            {wp.version && (
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase"
                style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6' }}>
                <Tag className="w-3 h-3 inline mr-1" />{wp.version}
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
            {wp.percentageDone > 0 && (
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{wp.percentageDone}%</span>
            )}
          </div>
          {testingChange && (
            <div className="mt-2 px-3 py-2 rounded-lg text-xs"
              style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
              <span className="font-semibold" style={{ color: '#3b82f6' }}>Forwarded to Testing:</span>
              <span className="ml-2" style={{ color: 'var(--text-secondary)' }}>
                {new Date(testingChange.changedAt).toLocaleString()}
              </span>
              <span className="ml-2" style={{ color: 'var(--text-muted)' }}>by</span>
              <span className="ml-1 font-medium" style={{ color: 'var(--text-primary)' }}>
                {testingChange.changedBy}
              </span>
            </div>
          )}
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
