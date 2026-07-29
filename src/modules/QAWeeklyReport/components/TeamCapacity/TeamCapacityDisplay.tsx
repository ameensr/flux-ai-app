// src/modules/QAWeeklyReport/components/TeamCapacity/TeamCapacityDisplay.tsx
// Compact Team Capacity Display for Report Preview - Executive Summary

import React, { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import { Users, CheckCircle, Clock, Sparkles, Gauge } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { AIService } from '@/services/ai/ai-service'
import type { TeamCapacityData } from '../../types/teamCapacity'
import {
  calculateCapacityStats,
  getCapacityDistribution,
  getMembersWithUtilization,
  getUtilizationColor,
} from '../../types/teamCapacity'

interface TeamCapacityDisplayProps {
  data: TeamCapacityData
  onOpenModal?: () => void
}

export function TeamCapacityDisplay({ data, onOpenModal }: TeamCapacityDisplayProps) {
  const [aiSummary, setAiSummary] = useState<string>('')
  const [loadingAI, setLoadingAI] = useState(false)

  const liveStats = Array.isArray(data?.members) && data.members.length > 0
    ? calculateCapacityStats(data.members)
    : data?.stats
  const liveData: TeamCapacityData | null =
    liveStats && Array.isArray(data?.members)
      ? { ...data, stats: liveStats }
      : null

  const membersWithUtil = useMemo(
    () => (liveData ? getMembersWithUtilization(liveData.members) : []),
    [liveData],
  )

  const avgUtil = liveData?.stats.average_utilization_percent ?? liveData?.stats.estimated_capacity_percent ?? 0

  useEffect(() => {
    if (!liveData) return
    let cancelled = false
    ;(async () => {
      setLoadingAI(true)
      try {
        const prompt = buildCapacitySummaryPrompt(liveData)
        const response = await AIService.callAI({
          prompt,
          options: {
            systemPrompt:
              'You are a QA manager writing a weekly capacity summary. Use only the facts provided. Never mention leave, absences, time off, or who was on leave. Focus on utilization and logged hours only.',
            module: 'team-capacity-summary',
          },
        })
        if (!cancelled) setAiSummary(response.trim())
      } catch {
        if (!cancelled) setAiSummary(generateFallbackSummary(liveData))
      } finally {
        if (!cancelled) setLoadingAI(false)
      }
    })()
    return () => { cancelled = true }
  }, [data])

  if (!liveData) {
    return null
  }

  const distribution = getCapacityDistribution(liveData.stats)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <KPICard
          icon={<Gauge className="w-5 h-5" />}
          label="Avg Team Utilization"
          value={`${avgUtil}%`}
          color="rgba(16,185,129,0.1)"
          iconColor={getUtilizationColor(avgUtil)}
          valueColor={getUtilizationColor(avgUtil)}
        />
        <KPICard
          icon={<Clock className="w-5 h-5" />}
          label="Total Logged Hours"
          value={`${liveData.stats.total_logged_hours ?? 0}h`}
          color="rgba(59,130,246,0.1)"
          iconColor="#3b82f6"
        />
        <KPICard
          icon={<Users className="w-5 h-5" />}
          label="Total Team Members"
          value={liveData.stats.total_members}
          color="rgba(99,102,241,0.1)"
          iconColor="var(--accent)"
        />
        <KPICard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Available This Week"
          value={liveData.stats.available}
          color="rgba(34,197,94,0.1)"
          iconColor="#22c55e"
        />
        <KPICard
          icon={<Clock className="w-5 h-5" />}
          label="Total Leave Hours"
          value={`${liveData.stats.total_leave_hours ?? 0}h`}
          color="rgba(245,158,11,0.1)"
          iconColor="#f59e0b"
        />
      </div>

      {/* Main Content Row: Donut Chart + Team Table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Capacity Distribution Donut Chart - Interactive */}
        <div
          onClick={onOpenModal}
          className={`${onOpenModal ? 'cursor-pointer group' : ''}`}
        >
          <GlassCard className={`relative ${onOpenModal ? 'transition-all duration-300 hover:border-green-500/30 hover:shadow-lg' : ''}`}>
            {/* Click Indicator */}
            {onOpenModal && (
              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 border border-green-500/20">
                  <span className="text-[9px] font-bold text-green-400 uppercase tracking-wider">Click to Expand</span>
                  <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
              </div>
            )}

            {/* Hover Glow Effect */}
            {onOpenModal && (
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-xl" />
            )}

            <h4 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Capacity Distribution
            </h4>

            <div className="flex flex-col items-center">
              {/* Simple Donut Chart */}
              <div className="relative w-40 h-40 mb-4">
                <svg viewBox="0 0 100 100" className="transform -rotate-90">
                  {/* Background circle */}
                  <circle
                    cx="50"
                    cy="50"
                    r="40"
                    fill="none"
                    stroke="var(--chart-grid)"
                    strokeWidth="16"
                  />

                  {/* Segments */}
                  {(() => {
                    let offset = 0
                    return distribution.map((d, idx) => {
                      const circumference = 2 * Math.PI * 40
                      const dashArray = (d.percentage / 100) * circumference
                      const gap = distribution.length > 1 ? 1.5 : 0
                      const segment = (
                        <motion.circle
                          key={d.status}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={d.color}
                          strokeWidth="16"
                          strokeDasharray={`${Math.max(dashArray - gap, 0)} ${circumference}`}
                          strokeDashoffset={-offset}
                          strokeLinecap="round"
                          style={{ filter: `drop-shadow(0 0 3px ${d.color}88)` }}
                          initial={{ strokeDasharray: `0 ${circumference}` }}
                          animate={{ strokeDasharray: `${Math.max(dashArray - gap, 0)} ${circumference}` }}
                          transition={{ duration: 1, delay: idx * 0.1, ease: 'easeOut' }}
                        />
                      )
                      offset += dashArray
                      return segment
                    })
                  })()}
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold" style={{ color: getUtilizationColor(avgUtil) }}>
                    {avgUtil}%
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Avg Util
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="w-full space-y-2">
                {distribution.map(d => (
                  <div key={d.status} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: d.color }}
                      />
                      <span style={{ color: 'var(--text-secondary)' }}>{d.label}</span>
                    </div>
                    <span className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {d.count} ({d.percentage.toFixed(0)}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Team Utilization Table */}
        <div className="lg:col-span-2">
          <GlassCard>
            <h4 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Employee Utilization
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <th className="text-left py-2 px-3 font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Employee
                    </th>
                    <th className="text-right py-2 px-3 font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Available Hours
                    </th>
                    <th className="text-right py-2 px-3 font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Leave Hours
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {membersWithUtil.map((member, idx) => (
                    <motion.tr
                      key={member.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: idx * 0.03 }}
                      className="border-b hover:bg-white/[0.02] transition-colors"
                      style={{ borderColor: 'var(--border)' }}
                    >
                      <td className="py-2 px-3" style={{ color: 'var(--text-primary)' }}>
                        {member.name}
                      </td>
                      <td className="py-2 px-3 text-right font-semibold tabular-nums" style={{ color: 'var(--text-secondary)' }}>
                        {member.available_hours}h
                      </td>
                      <td className="py-2 px-3 text-right font-semibold tabular-nums" style={{
                        color: member.leave_hours > 0 ? '#eab308' : 'var(--text-muted)'
                      }}>
                        {member.leave_hours}h
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* AI Summary Card */}
      <GlassCard>
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            Weekly Capacity Summary
          </h4>
        </div>

        {loadingAI ? (
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            <div className="w-3 h-3 border-2 rounded-full animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
            Generating summary...
          </div>
        ) : (
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {aiSummary}
          </p>
        )}
      </GlassCard>
    </div>
  )
}

// KPI Card Component
interface KPICardProps {
  icon: React.ReactNode
  label: string
  value: string | number
  color: string
  iconColor: string
  sub?: string
  valueColor?: string
}

function KPICard({ icon, label, value, color, iconColor, sub, valueColor }: KPICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: color }}
          >
            <div style={{ color: iconColor }}>
              {icon}
            </div>
          </div>
        </div>

        <div className="text-2xl font-bold mb-1 tabular-nums" style={{ color: valueColor ?? 'var(--text-primary)' }}>
          {value}
        </div>

        <div className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </div>
        {sub && (
          <div className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-muted)' }}>
            {sub}
          </div>
        )}
      </GlassCard>
    </motion.div>
  )
}

// Helper functions
function buildCapacitySummaryPrompt(data: TeamCapacityData): string {
  const { stats } = data
  const avgUtil = stats.average_utilization_percent ?? stats.estimated_capacity_percent

  return `Write a concise 2–3 sentence executive summary of QA team capacity for a weekly report.

**Facts (use only these — do not invent):**
- Total Members: ${stats.total_members}
- Total Logged Hours: ${stats.total_logged_hours ?? 'n/a'}h
- Total Available Hours: ${stats.total_available_hours ?? 'n/a'}h
- Average Team Utilization: ${avgUtil}% (Logged ÷ Available × 100)

**Rules:**
- Focus only on team size, logged/available hours, and utilization.
- Do NOT mention leave, absences, time off, or who was on leave.
- Be factual. No recommendations or action items.`
}

function generateFallbackSummary(data: TeamCapacityData): string {
  const { stats } = data
  const total = stats.total_members
  const avgUtil = stats.average_utilization_percent ?? stats.estimated_capacity_percent
  const logged = stats.total_logged_hours

  let summary = `The QA team of ${total} member${total === 1 ? '' : 's'} logged ${logged ?? 'n/a'}h this period, with average utilization at ${avgUtil}%. `

  if (avgUtil >= 95) {
    summary += `Overall testing capacity remained near full utilization.`
  } else if (avgUtil >= 80) {
    summary += `Testing capacity was healthy with some headroom.`
  } else {
    summary += `Utilization was below target and may indicate spare capacity.`
  }

  return summary
}
