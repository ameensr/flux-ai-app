// src/modules/ProjectHub/components/OpenProjectPanel.tsx
// Only show OpenProject Configuration button

import React from 'react'
import { Settings2, Link2Off } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/ThemeContext'
import type { Project } from '../types'
import type { OpenProjectConfig } from '@/services/openproject'

interface OpenProjectPanelProps {
  project: Project
  onConfigureClick: () => void
}

export function OpenProjectPanel({ project, onConfigureClick }: OpenProjectPanelProps) {
  const { isDark } = useTheme()
  const config = project.metadata?.openproject as OpenProjectConfig | undefined
  const isConfigured = !!(config?.openproject_url && config?.openproject_api_key)

  return (
    <GlassCard hoverEffect={false} className="p-6">
      <div className="text-center py-8">
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
          style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
        >
          <Link2Off className="w-8 h-8" style={{ color: isConfigured ? '#22c55e' : 'var(--text-muted)' }} />
        </div>
        <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
          {isConfigured ? 'OpenProject integration is configured' : 'Connect to OpenProject to enable integration'}
        </p>
        <Button onClick={onConfigureClick} variant="outline" className="gap-2">
          <Settings2 className="w-4 h-4" />
          {isConfigured ? 'Edit Configuration' : 'Configure Integration'}
        </Button>
      </div>
    </GlassCard>
  )
}
