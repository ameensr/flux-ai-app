// Compact project membership card — shows only projects the user is a member of
import React, { useEffect, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { FolderKanban, AlertCircle, CheckCircle } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'
import { fetchMyProjects } from '@/modules/ProjectHub/projectService'
import type { ProjectRole } from '@/modules/ProjectHub/types'

type MembershipProject = {
  id: string
  name: string
  project_code: string
  project_role: ProjectRole
}

/** User-facing tag: management roles vs contributor roles */
function getRoleTag(role: ProjectRole): { label: string; bg: string; color: string; border: string } {
  if (role === 'owner' || role === 'lead') {
    return {
      label: role === 'owner' ? 'Owner' : 'Lead',
      bg: 'rgba(99, 102, 241, 0.12)',
      color: '#6366f1',
      border: 'rgba(99, 102, 241, 0.28)',
    }
  }
  if (role === 'viewer') {
    return {
      label: 'Viewer',
      bg: 'rgba(148, 163, 184, 0.12)',
      color: '#94a3b8',
      border: 'rgba(148, 163, 184, 0.28)',
    }
  }
  return {
    label: 'Member',
    bg: 'rgba(16, 185, 129, 0.12)',
    color: '#10b981',
    border: 'rgba(16, 185, 129, 0.28)',
  }
}

export const ProjectMembershipCard: React.FC = () => {
  const { profile } = useAppStore()
  const [projects, setProjects] = useState<MembershipProject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      try {
        const mine = await fetchMyProjects()
        if (cancelled) return
        setProjects(
          mine
            .filter((p) => p.status === 'active' || !p.status)
            .map((p) => ({
              id: p.id,
              name: p.name,
              project_code: p.project_code ?? '',
              project_role: p.my_project_role,
            }))
        )
      } catch {
        if (!cancelled) setProjects([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  if (!profile) return null

  const hasProjects = projects.length > 0

  return (
    <GlassCard hoverEffect={false} className="relative overflow-hidden">
      {/* Subtle gradient accent at top */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
        style={{
          background: hasProjects
            ? 'linear-gradient(90deg, rgba(16,185,129,0.6), rgba(34,197,94,0.3))'
            : 'linear-gradient(90deg, rgba(251,191,36,0.6), rgba(245,158,11,0.3))',
        }}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-4 pt-2">
        <FolderKanban className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          My Projects
        </h3>
      </div>

      {/* Content */}
      {loading ? (
        <p className="text-xs py-2" style={{ color: 'var(--text-muted)' }}>
          Loading projects…
        </p>
      ) : hasProjects ? (
        <div className="space-y-2.5">
          {projects.map((project) => {
            const tag = getRoleTag(project.project_role)
            return (
              <div
                key={project.id}
                className="flex items-start gap-2.5 p-2.5 rounded-lg transition-all"
                style={{
                  background: 'var(--hover)',
                  border: '1px solid var(--border)',
                }}
              >
                <CheckCircle
                  className="w-3.5 h-3.5 shrink-0 mt-0.5"
                  style={{ color: 'rgba(16,185,129,0.8)' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <p
                      className="text-xs font-semibold truncate"
                      style={{ color: 'var(--text-primary)' }}
                      title={project.name}
                    >
                      {project.name}
                    </p>
                    <span
                      className="shrink-0 text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded"
                      style={{
                        background: tag.bg,
                        color: tag.color,
                        border: `1px solid ${tag.border}`,
                      }}
                      title={
                        project.project_role === 'owner' || project.project_role === 'lead'
                          ? 'You manage this project'
                          : 'You are a member of this project'
                      }
                    >
                      {tag.label}
                    </span>
                  </div>
                  <p
                    className="text-[10px] font-mono mt-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {project.project_code}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <div
          className="flex items-start gap-2.5 p-3 rounded-lg"
          style={{
            background: 'rgba(251,191,36,0.05)',
            border: '1px solid rgba(251,191,36,0.2)',
          }}
        >
          <AlertCircle
            className="w-4 h-4 shrink-0 mt-0.5"
            style={{ color: 'rgba(251,191,36,0.9)' }}
          />
          <div className="flex-1">
            <p className="text-xs font-medium" style={{ color: 'rgba(251,191,36,1)' }}>
              No Projects Assigned
            </p>
            <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>
              Contact your manager to get project access
            </p>
          </div>
        </div>
      )}

      {/* Footer count */}
      <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--divider)' }}>
        <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>
          {loading ? (
            '…'
          ) : hasProjects ? (
            <>
              <span className="font-bold" style={{ color: 'var(--accent)' }}>
                {projects.length}
              </span>{' '}
              {projects.length === 1 ? 'project' : 'projects'} assigned
            </>
          ) : (
            'Request access from your team lead'
          )}
        </p>
      </div>
    </GlassCard>
  )
}
