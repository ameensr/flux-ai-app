// src/modules/ProjectHub/ProjectHub.tsx
// Main Project Hub page - Premium UI with proper light/dark mode support

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Filter, FolderKanban } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/useAppStore'
import { usePermissions } from '@/hooks/usePermissions'
import { useTheme } from '@/context/ThemeContext'
import { fetchProjects, fetchProjectStats } from './projectService'
import type { ProjectWithMembers, ProjectFilters, ProjectStats, ProjectStatus } from './types'
import { ProjectCard } from './components/ProjectCard'
import { CreateProjectModal } from './components/CreateProjectModal'
import { ProjectStatsCards } from './components/ProjectStatsCards'
import { PROJECT_STATUS_LABELS } from './types'

export function ProjectHub() {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { permissionMap } = useAppStore()
  const { canView, can } = usePermissions()
  const { isDark } = useTheme()

  const [projects, setProjects] = useState<ProjectWithMembers[]>([])
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<ProjectStatus[]>([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  const canCreate = can('project-hub', 'can_create')
  const canViewModule = canView('project-hub')

  useEffect(() => {
    if (canViewModule) {
      loadProjects()
      loadStats()
    }
  }, [canViewModule])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const filters: ProjectFilters = {
        search: searchQuery || undefined,
        status: statusFilter.length > 0 ? statusFilter : undefined
      }
      const data = await fetchProjects(filters)
      setProjects(data)
    } catch (error: any) {
      console.error('[ProjectHub] Load projects error:', error)
      toast({
        variant: 'destructive',
        title: 'Failed to Load Projects',
        description: error.message || 'Unable to fetch projects. Please check if migrations have been run.'
      })
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const data = await fetchProjectStats()
      setStats(data)
    } catch (error: any) {
      console.error('Failed to load stats:', error)
    }
  }

  const handleSearch = () => {
    loadProjects()
  }

  const handleStatusFilterToggle = (status: ProjectStatus) => {
    setStatusFilter(prev =>
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    )
  }

  const handleProjectCreated = () => {
    setShowCreateModal(false)
    loadProjects()
    loadStats()
    toast({
      title: 'Success',
      description: 'Project created successfully'
    })
  }

  const handleProjectUpdated = () => {
    loadProjects()
    loadStats()
  }

  useEffect(() => {
    if (canViewModule) {
      loadProjects()
    }
  }, [statusFilter])

  if (!canViewModule) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
        >
          <GlassCard className="p-10 text-center max-w-md" hoverEffect={false}>
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-yellow-500/20 to-orange-500/20 flex items-center justify-center">
              <FolderKanban className="w-10 h-10" style={{ color: 'var(--accent)' }} />
            </div>
            <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              Access Denied
            </h2>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              You don't have permission to view the Project Hub.
            </p>
          </GlassCard>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="font-clash font-black text-3xl sm:text-4xl text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            <FolderKanban className="w-8 h-8 text-accent-gold" />
            Project Hub
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Organize and manage your projects with ease
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent-gold text-black hover:opacity-90 transition-all font-black uppercase tracking-wider"
          >
            <Plus className="w-3.5 h-3.5" />
            New Project
          </button>
        )}
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="mb-8">
          <ProjectStatsCards stats={stats} />
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-8">
        <GlassCard hoverEffect={false} className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="flex-1 flex gap-3">
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="field-input w-full pl-10 pr-4 py-2.5 text-sm"
                />
              </div>
              <button
                onClick={handleSearch}
                className="px-4 py-2.5 rounded-xl bg-accent-gold text-black hover:opacity-90 transition-all font-bold text-sm uppercase tracking-wider"
              >
                Search
              </button>
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all flex items-center gap-2 ${showFilters
                ? 'bg-accent-gold/15 border border-accent-gold/40 text-accent-gold'
                : 'border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--hover)]'
                }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              {statusFilter.length > 0 && (
                <span className="px-1.5 py-0.5 bg-accent-gold/20 text-accent-gold rounded-full text-[9px] font-bold">
                  {statusFilter.length}
                </span>
              )}
            </button>
          </div>

          {/* Filter Options */}
          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="mt-4 pt-4 space-y-2" style={{ borderTop: `1px solid var(--divider)` }}>
                  <label className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                    Project Status
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(Object.keys(PROJECT_STATUS_LABELS) as ProjectStatus[]).map(status => (
                      <button
                        key={status}
                        onClick={() => handleStatusFilterToggle(status)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${statusFilter.includes(status)
                          ? 'bg-accent-gold/20 border-accent-gold/40 text-accent-gold shadow-sm'
                          : 'border-[var(--border)] bg-[var(--surface-secondary)]/50 text-[var(--text-secondary)] hover:bg-[var(--hover)]'
                          }`}
                      >
                        {PROJECT_STATUS_LABELS[status]}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </GlassCard>
      </div>

      {/* Projects Grid */}
      <div>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="p-4 rounded-2xl animate-pulse border border-[var(--border)] bg-[var(--surface-secondary)]/50"
              >
                <div className="h-5 rounded-lg mb-3" style={{ background: 'var(--hover)' }} />
                <div className="h-3 rounded mb-2" style={{ background: 'var(--hover)' }} />
                <div className="h-3 rounded w-2/3" style={{ background: 'var(--hover)' }} />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <GlassCard
            hoverEffect={false}
            className="p-12 text-center"
            style={{
              border: `2px dashed var(--border)`
            }}
          >
            <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center">
              <FolderKanban className="w-10 h-10" style={{ color: 'var(--accent)' }} />
            </div>
            <h3 className="text-lg font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              No projects found
            </h3>
            <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'var(--text-muted)' }}>
              {searchQuery || statusFilter.length > 0
                ? 'Try adjusting your search query or filters'
                : canCreate
                  ? 'Get started by creating your first project'
                  : 'No projects have been created yet'}
            </p>
            {canCreate && !searchQuery && statusFilter.length === 0 && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-6 py-2.5 rounded-xl bg-accent-gold text-black hover:opacity-90 transition-all font-bold text-sm uppercase tracking-wider"
              >
                <Plus className="w-4 h-4 inline mr-2" />
                Create First Project
              </button>
            )}
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project, index) => (
              <motion.div
                key={project.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * index, duration: 0.3 }}
              >
                <ProjectCard
                  project={project}
                  onUpdate={handleProjectUpdated}
                />
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create Project Modal */}
      {showCreateModal && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleProjectCreated}
        />
      )}
    </div>
  )
}
