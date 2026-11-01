// src/modules/StoryPot/StatsCards.tsx
import React from 'react'
import { BarChart3, Filter, AlertTriangle, User, CheckCircle2, History } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'

interface StatsCardsProps {
  stats: {
    total: number
    withForwardingDate: number
    overdue: number
    unassigned: number
    byStatus: Record<string, number>
    byType: Record<string, number>
    byPriority: Record<string, number>
    byTestingStatus: Record<string, number>
  } | undefined
  filteredCount: number
  isDark: boolean
}

function StatCard({ 
  label, 
  value, 
  icon, 
  color 
}: { 
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
  isDark: boolean 
}) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center"
          style={{ background: `${color}20`, color }}
        >
          {icon}
        </div>
        <div>
          <p className="text-2xl font-black" style={{ color: 'var(--text-primary)' }}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          <p className="text-xs uppercase font-bold" style={{ color: 'var(--text-muted)' }}>
            {label}
          </p>
        </div>
      </div>
    </GlassCard>
  )
}

export function StatsCards({ stats, filteredCount, isDark }: StatsCardsProps) {
  if (!stats) return null

  const completedCount = Object.entries(stats.byStatus)
    .filter(([status]) => 
      status.toLowerCase().includes('closed') || 
      status.toLowerCase().includes('done')
    )
    .reduce((sum, [, count]) => sum + count, 0)

  const completedPercentage = stats.total > 0 
    ? Math.round((completedCount / stats.total) * 100) 
    : 0

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
      <StatCard
        label="Total"
        value={stats.total}
        icon={<BarChart3 className="w-5 h-5" />}
        color="#3b82f6"
        isDark={isDark}
      />
      <StatCard
        label="Filtered"
        value={filteredCount}
        icon={<Filter className="w-5 h-5" />}
        color="#8b5cf6"
        isDark={isDark}
      />
      <StatCard
        label="With Date"
        value={stats.withForwardingDate}
        icon={<History className="w-5 h-5" />}
        color="#06b6d4"
        isDark={isDark}
      />
      <StatCard
        label="Overdue"
        value={stats.overdue}
        icon={<AlertTriangle className="w-5 h-5" />}
        color="#ef4444"
        isDark={isDark}
      />
      <StatCard
        label="Unassigned"
        value={stats.unassigned}
        icon={<User className="w-5 h-5" />}
        color="#f97316"
        isDark={isDark}
      />
      <StatCard
        label="Completed"
        value={`${completedPercentage}%`}
        icon={<CheckCircle2 className="w-5 h-5" />}
        color="#22c55e"
        isDark={isDark}
      />
    </div>
  )
}
