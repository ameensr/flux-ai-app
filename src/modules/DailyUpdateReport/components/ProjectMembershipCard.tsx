// Compact project membership card for Daily Update Report
import React from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { FolderKanban, AlertCircle, CheckCircle } from 'lucide-react'
import { useDailyReportStore } from '../store'
import { useAppStore } from '@/store/useAppStore'

export const ProjectMembershipCard: React.FC = () => {
  const { projects } = useDailyReportStore()
  const { profile } = useAppStore()

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
            : 'linear-gradient(90deg, rgba(251,191,36,0.6), rgba(245,158,11,0.3))'
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
      {hasProjects ? (
        <div className="space-y-2.5">
          {projects.map((project, index) => (
            <div
              key={project.id}
              className="flex items-start gap-2.5 p-2.5 rounded-lg transition-all"
              style={{ 
                background: 'var(--hover)', 
                border: '1px solid var(--border)' 
              }}
            >
              <CheckCircle 
                className="w-3.5 h-3.5 shrink-0 mt-0.5" 
                style={{ color: 'rgba(16,185,129,0.8)' }} 
              />
              <div className="flex-1 min-w-0">
                <p 
                  className="text-xs font-semibold truncate" 
                  style={{ color: 'var(--text-primary)' }}
                  title={project.project_name}
                >
                  {project.project_name}
                </p>
                <p 
                  className="text-[10px] font-mono mt-0.5" 
                  style={{ color: 'var(--text-muted)' }}
                >
                  {project.project_code}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div
          className="flex items-start gap-2.5 p-3 rounded-lg"
          style={{ 
            background: 'rgba(251,191,36,0.05)', 
            border: '1px solid rgba(251,191,36,0.2)' 
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
          {hasProjects ? (
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
