// src/pages/EnterpriseAdmin/TeamManagement.tsx
// Teams feature has been replaced with Project Hub
import React from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { FolderKanban, ArrowRight } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { ROUTES } from '@/lib/routes'

export function TeamManagement() {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <GlassCard className="p-12 text-center max-w-2xl">
        <FolderKanban className="w-20 h-20 mx-auto mb-6 text-accent-gold opacity-80" />
        <h2 className="text-2xl font-bold mb-4 text-white">
          Teams Feature Moved to Project Hub
        </h2>
        <p className="text-white/70 mb-6 leading-relaxed">
          The Teams feature has been replaced with a more powerful <strong className="text-accent-gold">Project Hub</strong> system.
          <br />
          Project Hub provides better organization with project-based teams, flexible roles, and enhanced collaboration.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-8 text-left">
          <h3 className="font-semibold text-white mb-3">What's New:</h3>
          <ul className="space-y-2 text-sm text-white/70">
            <li className="flex items-start gap-2">
              <span className="text-accent-gold mt-0.5">✓</span>
              <span><strong>Project-based Organization</strong> - Organize work by projects instead of teams</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-gold mt-0.5">✓</span>
              <span><strong>Flexible Roles</strong> - Owner, Lead, Member, and Viewer roles per project</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-gold mt-0.5">✓</span>
              <span><strong>Multi-Project Membership</strong> - Users can be in multiple projects</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent-gold mt-0.5">✓</span>
              <span><strong>Better Permissions</strong> - Granular access control per project</span>
            </li>
          </ul>
        </div>

        <button
          onClick={() => navigate(ROUTES.projectHub)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-accent-gold to-accent-purple text-background font-bold hover:opacity-90 transition-opacity"
        >
          Go to Project Hub
          <ArrowRight className="w-4 h-4" />
        </button>

        <p className="text-xs text-white/50 mt-6">
          All team-related data has been preserved. Contact your administrator if you need help migrating.
        </p>
      </GlassCard>
    </div>
  )
}
