// src/modules/StoryPot/CachedStoryPot.tsx
// New cache-based StoryPot component with instant filtering

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen, FolderOpen, Database, Lock, Loader2, FileText,
  Search, ChevronDown, CheckCircle2, Square, CheckSquare, X,
  Rocket, LifeBuoy, ExternalLink, AlertTriangle,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/ThemeContext'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { useStoryPotCache } from '@/hooks/useStoryPotCache'
import { supabase } from '@/lib/supabase'
import { fetchOpenProjectProjects, type OpenProjectConfig, type OpenProjectProject } from '@/services/openproject'
import { SyncButton, SyncProgressBar } from './SyncButton'
import { CachedFilters } from './CachedFilters'
import { WorkPackageRow } from './WorkPackageRow'
import { StatsCards } from './StatsCards'
import { Pagination } from './Pagination'
import { DropdownPortal } from './DropdownPortal'

const MODULE_KEY = 'story-pot'

interface Project {
  id: string
  name: string
  metadata?: { openproject?: OpenProjectConfig }
}

export default function CachedStoryPot() {
  const { isDark } = useTheme()
  const { toast } = useToast()
  const { canView, can } = usePermissions()
  const navigate = useNavigate()

  // Permission checks
  const hasViewAccess = canView(MODULE_KEY)
  const canViewDashboard = can(MODULE_KEY, 'can_view_dashboard')
  const canExport = can(MODULE_KEY, 'can_export')
  const canImport = can(MODULE_KEY, 'can_import') // Sync data from OpenProject

  // Project selection state
  const [projects, setProjects] = useState<Project[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [selectedProjectId, setSelectedProjectId] = useState<string>('')
  const [projectSearch, setProjectSearch] = useState('')
  const [showProjectDropdown, setShowProjectDropdown] = useState(false)
  const projectDropdownRef = useRef<HTMLButtonElement>(null)

  // OpenProject project selection
  const [opProjects, setOpProjects] = useState<OpenProjectProject[]>([])
  const [loadingOpProjects, setLoadingOpProjects] = useState(false)
  const [selectedOpProjectId, setSelectedOpProjectId] = useState<number | null>(null)
  const [selectedOpProjectName, setSelectedOpProjectName] = useState<string>('')
  const [opProjectSearch, setOpProjectSearch] = useState('')
  const [showOpProjectDropdown, setShowOpProjectDropdown] = useState(false)
  const opProjectDropdownRef = useRef<HTMLButtonElement>(null)

  // UI state
  const [showFilters, setShowFilters] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Get current project config
  const currentProject = useMemo(
    () => projects.find(p => p.id === selectedProjectId),
    [projects, selectedProjectId]
  )
  const config = currentProject?.metadata?.openproject

  // Use the cache hook
  const cache = useStoryPotCache({
    projectId: selectedProjectId,
    opProjectId: selectedOpProjectId,
    opProjectName: selectedOpProjectName,
    config: config || null,
    enabled: !!selectedProjectId && !!config,
  })

  // Load Qaly projects
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
        if (data?.length && !selectedProjectId) {
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

  // Load OpenProject projects when config changes
  useEffect(() => {
    if (!config?.openproject_url || !config?.openproject_api_key) {
      setOpProjects([])
      return
    }
    async function loadOpProjects() {
      setLoadingOpProjects(true)
      try {
        const projects = await fetchOpenProjectProjects(config!)
        setOpProjects(projects)
      } catch (err) {
        console.error('[CachedStoryPot] Failed to load OpenProject projects:', err)
        setOpProjects([])
      } finally {
        setLoadingOpProjects(false)
      }
    }
    loadOpProjects()
  }, [config?.openproject_url, config?.openproject_api_key])

  // Close dropdowns on outside click - handled by DropdownPortal
  // Keeping empty effect for cleanup if needed

  // Filtered projects for dropdown
  const filteredProjects = useMemo(() => {
    if (!projectSearch.trim()) return projects
    return projects.filter(p => p.name.toLowerCase().includes(projectSearch.toLowerCase()))
  }, [projects, projectSearch])

  const filteredOpProjects = useMemo(() => {
    if (!opProjectSearch.trim()) return opProjects
    return opProjects.filter(p => p.name.toLowerCase().includes(opProjectSearch.toLowerCase()))
  }, [opProjects, opProjectSearch])

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

  const toggleSelectAll = useCallback(() => {
    const pageIds = cache.workPackages.map(wp => wp.id)
    setSelectedIds(prev => {
      const allSelected = pageIds.every(id => prev.has(id))
      if (allSelected) {
        const next = new Set(prev)
        pageIds.forEach(id => next.delete(id))
        return next
      }
      return new Set([...prev, ...pageIds])
    })
  }, [cache.workPackages])

  // Export handlers
  const exportToReleaseTracker = () => {
    const selected = cache.workPackages.filter(wp => selectedIds.has(wp.id))
    const data = selected.map(wp => ({
      openproject_id: wp.id,
      description: wp.subject,
      release_version: wp.release_tag || '',
      priority: wp.priority,
      received_date_time: wp.forwarded_to_testing_at || wp.updated_at || wp.created_at,
      assigned_to_name: wp.assignee,
      author: wp.author,
      forwarded_to_testing_at: wp.forwarded_to_testing_at,
      forwarded_to_testing_by: wp.forwarded_to_testing_by,
    }))
    sessionStorage.setItem('storypot_export_release', JSON.stringify(data))
    toast({ title: 'Export Ready', description: `${selected.length} items ready` })
    navigate('/release-tracker?import=storypot')
  }

  const exportToSupportTracker = () => {
    const selected = cache.workPackages.filter(wp => selectedIds.has(wp.id))
    const data = selected.map(wp => ({
      openproject_id: wp.id,
      description: wp.subject,
      received_date: wp.forwarded_to_testing_at?.split('T')[0] || '',
      tester_name: wp.assignee,
      author: wp.author,
      forwarded_to_testing_at: wp.forwarded_to_testing_at,
      forwarded_to_testing_by: wp.forwarded_to_testing_by,
    }))
    sessionStorage.setItem('storypot_export_support', JSON.stringify(data))
    toast({ title: 'Export Ready', description: `${selected.length} items ready` })
    navigate('/support-tracker?import=storypot')
  }

  // Handle sync
  const handleSync = () => {
    cache.sync()
    toast({ title: 'Sync Started', description: 'Fetching data from OpenProject...' })
  }

  if (!hasViewAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <GlassCard className="p-12 text-center max-w-md">
          <Lock className="w-16 h-16 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Access Denied
          </h2>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="py-6 sm:py-12">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="font-clash font-black text-3xl sm:text-4xl text-[var(--text-primary)] flex items-center gap-2">
              <BookOpen className="w-8 h-8 text-accent-gold" />
              StoryPot
              <span className="text-xs px-2 py-1 rounded-full bg-green-500/20 text-green-400 font-medium">
                CACHED
              </span>
            </h1>
            <p className="text-sm text-text-secondary mt-1">
              Instant filtering with local cache. Sync once, filter instantly.
            </p>
          </div>
        </div>

        {/* Project Selection & Sync */}
        <div 
          className="glass-panel p-5 relative"
          style={{ overflow: 'visible' }}
        >
          <div className="space-y-4">
            {/* Project Dropdowns */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Qaly Project */}
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: 'var(--text-muted)' }}>
                  Qaly Project
                </label>
                <button
                  ref={projectDropdownRef}
                  type="button"
                  onClick={() => setShowProjectDropdown(!showProjectDropdown)}
                  className="w-full h-10 pl-10 pr-8 rounded-xl border text-sm text-left flex items-center relative"
                  style={{
                    background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                    borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  }}
                >
                  <FolderOpen className="absolute left-3 w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                  <span className="truncate">{currentProject?.name || 'Select Project'}</span>
                  <ChevronDown className="absolute right-3 w-4 h-4" />
                </button>
                <DropdownPortal
                  isOpen={showProjectDropdown}
                  onClose={() => setShowProjectDropdown(false)}
                  triggerRef={projectDropdownRef}
                  isDark={isDark}
                >
                  <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
                    <input
                      type="text"
                      value={projectSearch}
                      onChange={e => setProjectSearch(e.target.value)}
                      placeholder="Search..."
                      className="w-full h-8 px-3 rounded-lg border text-sm"
                      style={{
                        background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                        borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                        color: 'var(--text-primary)',
                      }}
                      autoFocus
                    />
                  </div>
                  <div className="max-h-60 overflow-y-auto">
                    {filteredProjects.map(p => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setSelectedProjectId(p.id)
                          setSelectedOpProjectId(null)
                          setShowProjectDropdown(false)
                          cache.resetFilters()
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <FolderOpen className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        <span className="truncate">{p.name}</span>
                        {selectedProjectId === p.id && <CheckCircle2 className="w-4 h-4 ml-auto text-blue-500" />}
                      </button>
                    ))}
                  </div>
                </DropdownPortal>
              </div>

              {/* OpenProject Project */}
              {config && (
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-xs font-bold uppercase mb-1.5" style={{ color: '#3b82f6' }}>
                    OpenProject Project
                  </label>
                  <button
                    ref={opProjectDropdownRef}
                    type="button"
                    onClick={() => setShowOpProjectDropdown(!showOpProjectDropdown)}
                    className="w-full h-10 pl-10 pr-8 rounded-xl border text-sm text-left flex items-center relative"
                    style={{
                      background: isDark ? 'rgba(59,130,246,0.1)' : 'rgba(59,130,246,0.05)',
                      borderColor: 'rgba(59,130,246,0.3)',
                    }}
                  >
                    <Database className="absolute left-3 w-4 h-4" style={{ color: '#3b82f6' }} />
                    <span className="truncate">{selectedOpProjectName || 'All Projects'}</span>
                    <ChevronDown className="absolute right-3 w-4 h-4" style={{ color: '#3b82f6' }} />
                  </button>
                  <DropdownPortal
                    isOpen={showOpProjectDropdown}
                    onClose={() => setShowOpProjectDropdown(false)}
                    triggerRef={opProjectDropdownRef}
                    isDark={isDark}
                  >
                    <div className="p-2 border-b" style={{ borderColor: 'var(--border)' }}>
                      <input
                        type="text"
                        value={opProjectSearch}
                        onChange={e => setOpProjectSearch(e.target.value)}
                        placeholder="Search..."
                        className="w-full h-8 px-3 rounded-lg border text-sm"
                        style={{
                          background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                          borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                          color: 'var(--text-primary)',
                        }}
                        autoFocus
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                      <button
                        onClick={() => {
                          setSelectedOpProjectId(null)
                          setSelectedOpProjectName('')
                          setShowOpProjectDropdown(false)
                        }}
                        className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        <Database className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                        All Projects
                        {!selectedOpProjectId && <CheckCircle2 className="w-4 h-4 ml-auto text-blue-500" />}
                      </button>
                      {filteredOpProjects.map(p => (
                        <button
                          key={p.id}
                          onClick={() => {
                            setSelectedOpProjectId(p.id)
                            setSelectedOpProjectName(p.name)
                            setShowOpProjectDropdown(false)
                          }}
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-white/10 flex items-center gap-2"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          <Database className="w-4 h-4" style={{ color: '#3b82f6' }} />
                          <span className="truncate">{p.name}</span>
                          {selectedOpProjectId === p.id && <CheckCircle2 className="w-4 h-4 ml-auto text-blue-500" />}
                        </button>
                      ))}
                    </div>
                  </DropdownPortal>
                </div>
              )}

              {/* Sync Button - only show if user has can_import permission */}
              {canImport && (
                <div className="flex items-end">
                  <SyncButton
                    onSync={handleSync}
                    isSyncing={cache.isSyncing}
                    syncProgress={cache.syncProgress}
                    lastSyncAt={cache.syncStatus?.lastSyncAt || null}
                    hasData={cache.hasData}
                    disabled={!config}
                  />
                </div>
              )}
            </div>

            {/* Sync Progress */}
            {cache.isSyncing && cache.syncProgress && (
              <SyncProgressBar progress={cache.syncProgress} />
            )}

            {/* Filters - show when config exists (even before first sync) */}
            {config && (
              <CachedFilters
                filters={cache.filters}
                setFilters={cache.setFilters}
                resetFilters={cache.resetFilters}
                filterOptions={cache.filterOptions || undefined}
                activeFilterCount={cache.activeFilterCount}
                isBugType={cache.isBugType}
                isDark={isDark}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
              />
            )}
          </div>
        </div>

        {/* Stats */}
        {canViewDashboard && cache.stats && cache.stats.total > 0 && (
        <StatsCards
            stats={cache.stats || undefined}
            filteredByTestingStatus={cache.filteredByTestingStatus}
            filteredCount={cache.totalCount}
            activeFilterCount={cache.activeFilterCount}
            isDark={isDark}
          />
        )}

        {/* Work Packages List */}
        <GlassCard className="p-0 overflow-hidden">
          {!config ? (
            <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
              <ExternalLink className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>OpenProject not configured for this project</p>
            </div>
          ) : !cache.hasData ? (
            <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
              <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="text-lg font-medium">No cached data</p>
              <p className="text-sm mt-2">Click "Sync Data" to fetch from OpenProject</p>
            </div>
          ) : cache.isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : cache.workPackages.length === 0 ? (
            <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
              <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No matching records</p>
            </div>
          ) : (
            <>
              {/* Select All Header - only show if user can export */}
              {canExport && (
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--border)' }}>
                  <button onClick={toggleSelectAll} className="flex items-center gap-2 text-sm">
                    {cache.workPackages.every(wp => selectedIds.has(wp.id))
                      ? <CheckSquare className="w-5 h-5 text-green-500" />
                      : <Square className="w-5 h-5" />
                    }
                    {selectedIds.size > 0 ? `${selectedIds.size} selected` : 'Select All'}
                  </button>
                  {selectedIds.size > 0 && (
                    <button onClick={() => setSelectedIds(new Set())} className="text-xs text-red-400">
                      Clear
                    </button>
                  )}
                </div>
              )}

              {/* Work Package Rows */}
              <div className="divide-y" style={{ borderColor: 'var(--border)' }}>
                {cache.workPackages.map(wp => (
                  <WorkPackageRow
                    key={wp.id}
                    wp={wp}
                    openprojectUrl={config.openproject_url}
                    isDark={isDark}
                    isSelected={selectedIds.has(wp.id)}
                    onToggleSelect={canExport ? toggleSelect : undefined}
                    showCheckbox={canExport}
                  />
                ))}
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={cache.page}
                totalPages={cache.totalPages}
                pageSize={cache.pageSize}
                totalRecords={cache.totalCount}
                onPageChange={cache.goToPage}
                onPageSizeChange={cache.changePageSize}
                isDark={isDark}
              />
            </>
          )}
        </GlassCard>

        {/* Floating Action Bar - only show if user can export */}
        {canExport && selectedIds.size > 0 && (
          <motion.div
            initial={{ y: 60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50"
          >
            <div
              className="flex items-center gap-2 px-2 py-2 rounded-full backdrop-blur-xl border shadow-lg"
              style={{
                background: isDark ? 'rgba(23,23,23,0.9)' : 'rgba(255,255,255,0.95)',
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
              }}
            >
              <div className="flex items-center gap-2 px-3">
                <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                  style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)' }}>
                  {selectedIds.size}
                </div>
                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>selected</span>
              </div>
              <button
                onClick={exportToReleaseTracker}
                className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium text-white"
                style={{ background: 'linear-gradient(135deg, #3b82f6, #2563eb)' }}
              >
                <Rocket className="w-3.5 h-3.5" />
                Release
              </button>
              <button
                onClick={exportToSupportTracker}
                className="flex items-center gap-1.5 h-8 px-3 rounded-full text-xs font-medium text-white"
                style={{ background: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' }}
              >
                <LifeBuoy className="w-3.5 h-3.5" />
                Support
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="w-8 h-8 rounded-full flex items-center justify-center text-red-400"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}
