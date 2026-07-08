// src/modules/ProjectHub/components/ProjectCard.tsx
// Premium project card with light/dark mode support

import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Users, MoreVertical, Edit, Archive, Trash2, Eye, Tag } from 'lucide-react'
import { usePermissions } from '@/hooks/usePermissions'
import { useToast } from '@/hooks/use-toast'
import { useTheme } from '@/context/ThemeContext'
import { archiveProject, deleteProject } from '../projectService'
import type { ProjectWithMembers } from '../types'
import { PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from '../types'
import { ROUTES } from '@/lib/routes'
import { DeleteProjectModal } from './DeleteProjectModal'

interface ProjectCardProps {
  project: ProjectWithMembers
  onUpdate: () => void
}

export function ProjectCard({ project, onUpdate }: ProjectCardProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can } = usePermissions()
  const { isDark } = useTheme()
  const [showMenu, setShowMenu] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)

  const canEdit = can('project-hub', 'can_edit')
  const canDelete = can('project-hub', 'can_delete')

  const handleView = () => {
    navigate(`${ROUTES.projectHub}/${project.id}`)
  }

  const handleArchive = async () => {
    if (!confirm('Archive this project? It will be hidden from active projects.')) return

    try {
      setLoading(true)
      await archiveProject(project.id)
      toast({ title: 'Success', description: 'Project archived successfully' })
      onUpdate()
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to archive project'
      })
    } finally {
      setLoading(false)
      setShowMenu(false)
    }
  }

  const handleDeleteClick = () => {
    setShowMenu(false)
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    try {
      await deleteProject(project.id)
      setShowDeleteModal(false)
      toast({
        title: 'Success',
        description: 'Project deleted successfully. All associated data has been permanently removed.'
      })
      onUpdate()
    } catch (error: any) {
      // Error will be shown in modal
      throw error
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
  }

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    active: {
      bg: 'rgba(34, 197, 94, 0.1)',
      text: '#22c55e',
      border: 'rgba(34, 197, 94, 0.3)'
    },
    on_hold: {
      bg: 'rgba(249, 115, 22, 0.1)',
      text: '#f97316',
      border: 'rgba(249, 115, 22, 0.3)'
    },
    completed: {
      bg: 'rgba(99, 102, 241, 0.1)',
      text: '#6366f1',
      border: 'rgba(99, 102, 241, 0.3)'
    },
    archived: {
      bg: 'rgba(148, 163, 184, 0.1)',
      text: '#94a3b8',
      border: 'rgba(148, 163, 184, 0.3)'
    },
  }

  const statusColor = statusColors[project.status] || statusColors.active

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      className="relative group h-full"
    >
      <div
        className="relative overflow-hidden rounded-2xl p-4 cursor-pointer transition-all hover:shadow-2xl h-full flex flex-col border border-[var(--border)] bg-[var(--surface-secondary)]/50 hover:bg-[var(--surface-secondary)]/90"
        onClick={handleView}
        style={{
          minHeight: '240px'
        }}
      >
        {/* Hover gradient effect */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, transparent 100%)'
          }}
        />

        {/* Actions Menu */}
        {(canEdit || canDelete) && (
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all hover:scale-110 border border-[var(--border)] bg-[var(--surface)]"
              style={{
                color: 'var(--text-muted)'
              }}
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            <AnimatePresence>
              {showMenu && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 top-10 w-48 rounded-xl shadow-2xl overflow-hidden z-20 border border-[var(--border)] bg-[var(--surface)]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleView()
                      setShowMenu(false)
                    }}
                    className="w-full px-3 py-2 text-left text-xs flex items-center gap-2.5 transition-colors"
                    style={{
                      color: 'var(--text-primary)',
                      background: 'transparent'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    View Details
                  </button>

                  {canEdit && (
                    <>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleView()
                          setShowMenu(false)
                        }}
                        className="w-full px-3 py-2 text-left text-xs flex items-center gap-2.5 transition-colors"
                        style={{
                          color: 'var(--text-primary)',
                          background: 'transparent'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit Project
                      </button>

                      {project.status !== 'archived' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleArchive()
                          }}
                          disabled={loading}
                          className="w-full px-3 py-2 text-left text-xs flex items-center gap-2.5 transition-colors disabled:opacity-50"
                          style={{
                            color: 'var(--text-primary)',
                            background: 'transparent'
                          }}
                          onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'var(--hover)')}
                          onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        >
                          <Archive className="w-3.5 h-3.5" />
                          Archive
                        </button>
                      )}
                    </>
                  )}

                  {canDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClick()
                      }}
                      disabled={loading}
                      className="w-full px-3 py-2 text-left text-xs flex items-center gap-2.5 transition-colors disabled:opacity-50"
                      style={{
                        color: '#ef4444',
                        background: 'transparent',
                        borderTop: `1px solid var(--divider)`
                      }}
                      onMouseEnter={(e) => !loading && (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Content */}
        <div className="relative space-y-3 flex-1 flex flex-col">
          {/* Header */}
          <div className="pr-8 flex-1">
            <h3
              className="text-lg font-bold mb-1.5 line-clamp-2 group-hover:text-accent-gold transition-colors"
              style={{ color: 'var(--text-primary)' }}
            >
              {project.name}
            </h3>

            <div className="flex items-center gap-2 mb-2">
              <span
                className="px-2.5 py-0.5 rounded-lg text-[10px] font-bold uppercase tracking-wide"
                style={{
                  background: statusColor.bg,
                  color: statusColor.text,
                  border: `1px solid ${statusColor.border}`
                }}
              >
                {PROJECT_STATUS_LABELS[project.status]}
              </span>
              {project.project_code && (
                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded border border-[var(--border)] bg-[var(--surface)]"
                  style={{
                    color: 'var(--text-muted)'
                  }}
                >
                  {project.project_code}
                </span>
              )}
            </div>

            {project.description && (
              <p
                className="text-xs line-clamp-2 leading-relaxed"
                style={{ color: 'var(--text-muted)' }}
              >
                {project.description}
              </p>
            )}
          </div>

          {/* Tags */}
          {project.tags && project.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {project.tags.slice(0, 3).map((tag, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-medium border border-purple-500/20 bg-purple-500/10"
                  style={{
                    color: '#a855f7'
                  }}
                >
                  <Tag className="w-2.5 h-2.5" />
                  {tag}
                </span>
              ))}
              {project.tags.length > 3 && (
                <span
                  className="px-2 py-0.5 text-[10px] font-medium"
                  style={{ color: 'var(--text-muted)' }}
                >
                  +{project.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Footer */}
          <div
            className="flex items-center justify-between pt-3"
            style={{ borderTop: `1px solid var(--divider)` }}
          >
            <div
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-blue-500/20 bg-blue-500/10"
              style={{
                color: '#3b82f6'
              }}
            >
              <Users className="w-3.5 h-3.5" />
              <span className="text-xs font-semibold">
                {project.member_count || 0}
              </span>
            </div>

            {project.target_end_date && (
              <div
                className="flex items-center gap-1 text-[10px]"
                style={{ color: 'var(--text-muted)' }}
              >
                <Calendar className="w-3 h-3" />
                <span className="font-medium">
                  Due {formatDate(project.target_end_date)}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <DeleteProjectModal
          projectName={project.name}
          projectId={project.id}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={handleDeleteConfirm}
        />
      )}
    </motion.div>
  )
}
