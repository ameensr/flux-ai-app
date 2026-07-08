// src/modules/ProjectHub/ProjectDetail.tsx
// Detailed project view with member management - Consistent UI with application design

import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Edit, Archive, Trash2, Users, Calendar, Tag, Clock, FolderKanban } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { useTheme } from '@/context/ThemeContext'
import { fetchProjectById, archiveProject, deleteProject } from './projectService'
import type { ProjectWithMembers } from './types'
import { PROJECT_STATUS_LABELS } from './types'
import { ROUTES } from '@/lib/routes'
import { ProjectMembersList } from './components/ProjectMembersList'
import { AddMemberModal } from './components/AddMemberModal'
import { EditProjectModal } from './components/EditProjectModal'
import { DeleteProjectModal } from './components/DeleteProjectModal'

export function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = usePermissions()
  const { isDark } = useTheme()

  const [project, setProject] = useState<ProjectWithMembers | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddMember, setShowAddMember] = useState(false)
  const [showEditProject, setShowEditProject] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const canEdit = can('project-hub', 'can_edit')
  const canDelete = can('project-hub', 'can_delete')
  const canAssignMembers = can('project-hub', 'can_assign_members')

  useEffect(() => {
    if (projectId) {
      loadProject()
    }
  }, [projectId])

  const loadProject = async () => {
    if (!projectId) return

    try {
      setLoading(true)
      const data = await fetchProjectById(projectId)
      setProject(data)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to load project'
      })
      navigate(ROUTES.projectHub)
    } finally {
      setLoading(false)
    }
  }

  const handleArchive = async () => {
    if (!project) return
    if (!confirm('Archive this project? It will be hidden from active projects.')) return

    try {
      await archiveProject(project.id)
      toast({ title: 'Success', description: 'Project archived' })
      navigate(ROUTES.projectHub)
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to archive project'
      })
    }
  }

  const handleDeleteClick = () => {
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      if (!project) return
      await deleteProject(project.id)
      setShowDeleteModal(false)
      toast({
        title: 'Success',
        description: 'Project deleted successfully. All associated data has been permanently removed.'
      })
      navigate(ROUTES.projectHub)
    } catch (error: any) {
      // Error will be shown in modal
      throw error
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    active: { bg: 'rgba(34, 197, 94, 0.1)', text: '#22c55e', border: 'rgba(34, 197, 94, 0.3)' },
    on_hold: { bg: 'rgba(249, 115, 22, 0.1)', text: '#f97316', border: 'rgba(249, 115, 22, 0.3)' },
    completed: { bg: 'rgba(99, 102, 241, 0.1)', text: '#6366f1', border: 'rgba(99, 102, 241, 0.3)' },
    archived: { bg: 'rgba(148, 163, 184, 0.1)', text: '#94a3b8', border: 'rgba(148, 163, 184, 0.3)' },
  }

  const statusColor = statusColors[project?.status || 'active'] || statusColors.active

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-2xl animate-pulse border border-[var(--border)] bg-[var(--surface-secondary)]/50">
          <div className="h-6 rounded-lg mb-3" style={{ background: 'var(--hover)', width: '33%' }} />
          <div className="h-3 rounded" style={{ background: 'var(--hover)', width: '66%' }} />
        </div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard hoverEffect={false} className="p-10 text-center max-w-md">
          <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-indigo-500/10 to-purple-500/10 flex items-center justify-center">
            <FolderKanban className="w-10 h-10" style={{ color: 'var(--accent)' }} />
          </div>
          <h2 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Project Not Found
          </h2>
          <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>
            The project you're looking for doesn't exist or you don't have access.
          </p>
          <button
            onClick={() => navigate(ROUTES.projectHub)}
            className="px-4 py-2.5 rounded-xl bg-accent-gold text-black hover:opacity-90 transition-all font-bold text-sm uppercase tracking-wider inline-flex items-center gap-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Projects
          </button>
        </GlassCard>
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(ROUTES.projectHub)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--hover)] transition-all text-sm font-medium"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-3 mb-1">
              <h1 className="font-clash font-black text-3xl sm:text-4xl text-[var(--text-primary)] tracking-tight">
                {project.name}
              </h1>
              <span
                className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide"
                style={{
                  background: statusColor.bg,
                  color: statusColor.text,
                  border: `1px solid ${statusColor.border}`
                }}
              >
                {PROJECT_STATUS_LABELS[project.status]}
              </span>
            </div>
            {project.project_code && (
              <p className="text-xs font-mono text-text-secondary">
                Code: {project.project_code}
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <>
              <button
                onClick={() => setShowEditProject(true)}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent-gold text-black hover:opacity-90 transition-all font-bold text-sm uppercase tracking-wider"
              >
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>

              {project.status !== 'archived' && (
                <button
                  onClick={handleArchive}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--hover)] transition-all font-bold text-sm uppercase tracking-wider"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archive
                </button>
              )}
            </>
          )}

          {canDelete && (
            <button
              onClick={handleDeleteClick}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-red-500/30 text-red-500 hover:bg-red-500/10 transition-all font-bold text-sm uppercase tracking-wider"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* Project Info */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Description */}
          <GlassCard hoverEffect={false} className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-3" style={{ color: 'var(--text-secondary)' }}>
              Description
            </h3>
            {project.description ? (
              <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                {project.description}
              </p>
            ) : (
              <p className="italic text-sm" style={{ color: 'var(--text-muted)' }}>
                No description provided
              </p>
            )}
          </GlassCard>

          {/* Team Members */}
          <GlassCard hoverEffect={false} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <Users className="w-4 h-4" />
                Team Members ({project.members.length})
              </h3>
              {canAssignMembers && (
                <button
                  onClick={() => setShowAddMember(true)}
                  className="px-3 py-1.5 rounded-xl bg-accent-gold text-black hover:opacity-90 transition-all font-bold text-xs uppercase tracking-wider"
                >
                  Add Member
                </button>
              )}
            </div>
            <ProjectMembersList
              members={project.members}
              projectId={project.id}
              onUpdate={loadProject}
            />
          </GlassCard>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          {/* Dates */}
          <GlassCard hoverEffect={false} className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
              Timeline
            </h3>
            <div className="space-y-3">
              <div>
                <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--text-muted)' }}>
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Start Date</span>
                </div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {formatDate(project.start_date)}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--text-muted)' }}>
                  <Clock className="w-3.5 h-3.5" />
                  <span className="text-xs font-medium">Target End Date</span>
                </div>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {formatDate(project.target_end_date)}
                </p>
              </div>

              {project.actual_end_date && (
                <div>
                  <div className="flex items-center gap-1.5 mb-1" style={{ color: 'var(--text-muted)' }}>
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Actual End Date</span>
                  </div>
                  <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                    {formatDate(project.actual_end_date)}
                  </p>
                </div>
              )}
            </div>
          </GlassCard>

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <GlassCard hoverEffect={false} className="p-5">
              <h3 className="text-sm font-bold uppercase tracking-wider mb-4 flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
                <Tag className="w-4 h-4" />
                Tags
              </h3>
              <div className="flex flex-wrap gap-2">
                {project.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-1 rounded-lg text-xs font-medium border border-purple-500/20 bg-purple-500/10"
                    style={{
                      color: '#a855f7'
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </GlassCard>
          )}

          {/* Meta Info */}
          <GlassCard hoverEffect={false} className="p-5">
            <h3 className="text-sm font-bold uppercase tracking-wider mb-4" style={{ color: 'var(--text-secondary)' }}>
              Information
            </h3>
            <div className="space-y-3 text-xs">
              <div>
                <span className="font-medium" style={{ color: 'var(--text-muted)' }}>Created</span>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {new Date(project.created_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
              <div>
                <span className="font-medium" style={{ color: 'var(--text-muted)' }}>Last Updated</span>
                <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                  {new Date(project.updated_at).toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Modals */}
      {showAddMember && (
        <AddMemberModal
          projectId={project.id}
          existingMemberIds={project.members.map(m => m.user_id)}
          onClose={() => setShowAddMember(false)}
          onSuccess={() => {
            setShowAddMember(false)
            loadProject()
            toast({ title: 'Success', description: 'Member added to project' })
          }}
        />
      )}

      {showEditProject && (
        <EditProjectModal
          project={project}
          onClose={() => setShowEditProject(false)}
          onSuccess={() => {
            setShowEditProject(false)
            loadProject()
            toast({ title: 'Success', description: 'Project updated successfully' })
          }}
        />
      )}

      {/* Delete Modal */}
      {showDeleteModal && project && (
        <DeleteProjectModal
          projectName={project.name}
          projectId={project.id}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </div>
  )
}
