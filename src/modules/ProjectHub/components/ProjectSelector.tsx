// src/modules/ProjectHub/components/ProjectSelector.tsx
// Reusable project selector dropdown for filtering content by project

import React, { useState, useEffect } from 'react'
import { FolderKanban, Check } from 'lucide-react'
import { fetchMyProjects } from '../projectService'
import type { ProjectWithMembers } from '../types'
import { PROJECT_STATUS_LABELS } from '../types'

interface ProjectSelectorProps {
  value: string | null
  onChange: (projectId: string | null) => void
  placeholder?: string
  className?: string
  includeAllOption?: boolean
}

export function ProjectSelector({
  value,
  onChange,
  placeholder = 'Select project...',
  className = '',
  includeAllOption = true
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<ProjectWithMembers[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      setLoading(true)
      const data = await fetchMyProjects()
      setProjects(data.filter(p => p.status !== 'archived'))
    } catch (error) {
      console.error('Failed to load projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const selectedProject = projects.find(p => p.id === value)

  const handleSelect = (projectId: string | null) => {
    onChange(projectId)
    setIsOpen(false)
  }

  return (
    <div className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-gold/50 text-white text-left flex items-center justify-between hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <FolderKanban className="w-4 h-4 text-white/60 shrink-0" />
          <span className={`truncate ${!value ? 'text-white/40' : ''}`}>
            {loading
              ? 'Loading...'
              : selectedProject
              ? selectedProject.name
              : placeholder}
          </span>
        </div>
        <svg
          className={`w-4 h-4 text-white/60 transition-transform shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-2 bg-[#0A0118] border border-white/10 rounded-lg shadow-xl z-20 overflow-hidden max-h-64 overflow-y-auto">
            {includeAllOption && (
              <button
                onClick={() => handleSelect(null)}
                className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 flex items-center justify-between ${
                  !value ? 'bg-white/5 text-accent-gold' : 'text-white/80'
                }`}
              >
                <span>All Projects</span>
                {!value && <Check className="w-4 h-4" />}
              </button>
            )}

            {loading ? (
              <div className="px-4 py-8 text-center text-white/60 text-sm">
                Loading projects...
              </div>
            ) : projects.length === 0 ? (
              <div className="px-4 py-8 text-center text-white/60 text-sm">
                No projects available
              </div>
            ) : (
              <>
                {includeAllOption && (
                  <div className="border-t border-white/10" />
                )}
                {projects.map(project => (
                  <button
                    key={project.id}
                    onClick={() => handleSelect(project.id)}
                    className={`w-full px-4 py-2.5 text-left text-sm hover:bg-white/5 flex items-center justify-between ${
                      value === project.id
                        ? 'bg-white/5 text-accent-gold'
                        : 'text-white/80'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="truncate">{project.name}</span>
                      <span className="text-xs text-white/40 shrink-0">
                        {PROJECT_STATUS_LABELS[project.status]}
                      </span>
                    </div>
                    {value === project.id && <Check className="w-4 h-4 shrink-0" />}
                  </button>
                ))}
              </>
            )}
          </div>
        </>
      )}
    </div>
  )
}
