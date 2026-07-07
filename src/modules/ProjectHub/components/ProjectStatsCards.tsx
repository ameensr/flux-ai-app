// src/modules/ProjectHub/components/ProjectStatsCards.tsx
// Premium statistics cards for Project Hub with light/dark mode support

import React from 'react'
import { motion } from 'framer-motion'
import { FolderKanban, FolderOpen, CheckCircle2, Users } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import type { ProjectStats } from '../types'

interface ProjectStatsCardsProps {
  stats: ProjectStats
}

export function ProjectStatsCards({ stats }: ProjectStatsCardsProps) {
  const { isDark } = useTheme()

  const cards = [
    {
      label: 'Total Projects',
      value: stats.total_projects,
      icon: FolderKanban,
      gradient: 'from-blue-500 to-cyan-500',
      bgColor: isDark ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.08)',
      iconColor: '#3b82f6'
    },
    {
      label: 'Active Projects',
      value: stats.active_projects,
      icon: FolderOpen,
      gradient: 'from-green-500 to-emerald-500',
      bgColor: isDark ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.08)',
      iconColor: '#22c55e'
    },
    {
      label: 'Completed',
      value: stats.completed_projects,
      icon: CheckCircle2,
      gradient: 'from-purple-500 to-pink-500',
      bgColor: isDark ? 'rgba(168, 85, 247, 0.1)' : 'rgba(168, 85, 247, 0.08)',
      iconColor: '#a855f7'
    },
    {
      label: 'Team Members',
      value: stats.total_members,
      icon: Users,
      gradient: 'from-orange-500 to-red-500',
      bgColor: isDark ? 'rgba(249, 115, 22, 0.1)' : 'rgba(249, 115, 22, 0.08)',
      iconColor: '#f97316'
    }
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, idx) => {
        const Icon = card.icon
        return (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05, duration: 0.25 }}
            className="group relative overflow-hidden rounded-2xl p-4 transition-all hover:scale-[1.02] border border-[var(--border)] bg-[var(--surface-secondary)]/50 hover:bg-[var(--surface-secondary)]/90 hover:border-accent-gold/25 hover:shadow-lg"
          >
            {/* Background gradient effect */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
              style={{
                background: `linear-gradient(135deg, ${card.bgColor} 0%, transparent 100%)`
              }}
            />

            <div className="relative flex items-start justify-between">
              <div className="flex-1">
                <p
                  className="text-[9px] uppercase font-bold tracking-widest mb-2"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {card.label}
                </p>
                <p
                  className="text-2xl font-black"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {card.value}
                </p>
              </div>

              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
                style={{
                  background: card.bgColor
                }}
              >
                <Icon className="w-5 h-5" style={{ color: card.iconColor }} />
              </div>
            </div>

            {/* Bottom accent line */}
            <div
              className="absolute bottom-0 left-0 right-0 h-1 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"
              style={{
                background: `linear-gradient(90deg, ${card.iconColor} 0%, transparent 100%)`
              }}
            />
          </motion.div>
        )
      })}
    </div>
  )
}
