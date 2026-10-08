// src/modules/ReleaseTaskTracker/components/ReleaseRecentActivitySection.tsx
// Displays recent audit activity events with formatted timestamps and actions.

import React from 'react'
import { motion } from 'framer-motion'
import {
  Activity, Clock, CheckCircle2, User, Flame, Plus,
  Edit3, Trash2, ArrowRight, Layers
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useReleaseTrackerStore } from '../store'

interface Props {
  onViewAllHistory: () => void
}

export function ReleaseRecentActivitySection({ onViewAllHistory }: Props) {
  const { getRecentActivities } = useReleaseTrackerStore()
  const activities = getRecentActivities()

  if (activities.length === 0) return null

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'Time Added':
        return <Clock className="w-3.5 h-3.5 text-purple-400" />
      case 'Task Completed':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
      case 'Task Created':
        return <Plus className="w-3.5 h-3.5 text-accent" />
      case 'Task Deleted':
        return <Trash2 className="w-3.5 h-3.5 text-rose-400" />
      default:
        return <Activity className="w-3.5 h-3.5 text-cyan-400" />
    }
  }

  return (
    <GlassCard className="p-4 md:p-5 border border-white/10 bg-surface/85 rounded-2xl space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent" />
          <h3 className="text-sm font-bold text-text-primary">
            Recent Release Activity
          </h3>
        </div>
        <button
          type="button"
          onClick={onViewAllHistory}
          className="text-xs text-accent hover:underline flex items-center gap-1 font-semibold"
        >
          <span>View All History</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
        {activities.slice(0, 6).map((item) => (
          <div
            key={item.id}
            className="p-3 rounded-xl border border-white/10 bg-surface-elevated/40 hover:bg-surface-elevated/70 transition-all flex items-start gap-2.5 text-xs"
          >
            <div className="w-7 h-7 rounded-lg bg-surface border border-white/10 flex items-center justify-center shrink-0 mt-0.5">
              {getActionIcon(item.action)}
            </div>

            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="flex items-center justify-between gap-1">
                <span className="font-semibold text-text-primary truncate">
                  {item.user_name}
                </span>
                <span className="text-[10px] text-text-muted shrink-0">
                  {item.timestamp}
                </span>
              </div>

              <div className="text-[11px] text-text-secondary truncate">
                <span className="font-mono text-accent font-bold mr-1">
                  {item.task_id}
                </span>
                <span>• {item.action}</span>
              </div>

              <div className="text-[10px] text-text-muted truncate">
                {item.product_name} • <span className="font-mono">{item.release_version}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  )
}
