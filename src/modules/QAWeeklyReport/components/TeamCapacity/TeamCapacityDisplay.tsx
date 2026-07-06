// src/modules/QAWeeklyReport/components/TeamCapacity/TeamCapacityDisplay.tsx
// Compact Team Capacity Display for Report Preview - Executive Summary

import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Users, CheckCircle, Clock, AlertTriangle, Activity, Sparkles } from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { AIService } from '@/services/ai/ai-service'
import type { TeamCapacityData, TeamMemberCapacity } from '../../types/teamCapacity'
import { getCapacityDistribution } from '../../types/teamCapacity'

interface TeamCapacityDisplayProps {
  data: TeamCapacityData
  onOpenModal?: () => void
}

export function TeamCapacityDisplay({ data, onOpenModal }: TeamCapacityDisplayProps) {
  const [aiSummary, setAiSummary] = useState<string>('')
  const [loadingAI, setLoadingAI] = useState(false)

  useEffect(() => {
    generateAISummary()
  }, [data])

  const generateAISummary = async () => {
    setLoadingAI(true)
    try {
      const prompt = buildCapacitySummaryPrompt(data)
      const response = await AIService.callAI({
        prompt,
        options: {
          systemPrompt: 'You are a QA manager summarizing team capacity for an executive report. Be concise and focus on testing impact.',
          module: 'team-capacity-summary'
        }
      })
      setAiSummary(response.trim())
    } catch (error) {
      // Fallback to rule-based summary
      setAiSummary(generateFallbackSummary(data))
    } finally {
      setLoadingAI(false)
    }
  }

  const distribution = getCapacityDistribution(data.stats)

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <KPICard
          icon={<Users className="w-5 h-5" />}
          label="Total Team Members"
          value={data.stats.total_members}
          color="rgba(99,102,241,0.1)"
          iconColor="var(--accent)"
        />
        <KPICard
          icon={<CheckCircle className="w-5 h-5" />}
          label="Available This Week"
          value={data.stats.available}
          color="rgba(34,197,94,0.1)"
          iconColor="#22c55e"
        />
        <KPICard
          icon={<Clock className="w-5 h-5" />}
          label="On Leave"
          value={data.stats.on_leave}
          color="rgba(245,158,11,0.1)"
          iconColor="#f59e0b"
        />
        <KPICard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="No Logged Hours"
          value={data.stats.no_logs}
          color="rgba(239,68,68,0.1)"
          iconColor="#ef4444"
        />
        <KPICard
          icon={<Activity className="w-5 h-5" />}
          label="Avg Working Hours"
          value={`${data.stats.average_hours}h`}
          color="rgba(168,85,247,0.1)"
          iconColor="#a855f7"
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
                    stroke="rgba(255,255,255,0.05)"
                    strokeWidth="20"
                  />

                  {/* Segments */}
                  {(() => {
                    let offset = 0
                    return distribution.map((d, idx) => {
                      const circumference = 2 * Math.PI * 40
                      const dashArray = (d.percentage / 100) * circumference
                      const segment = (
                        <motion.circle
                          key={d.status}
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke={d.color}
                          strokeWidth="20"
                          strokeDasharray={`${dashArray} ${circumference}`}
                          strokeDashoffset={-offset}
                          strokeLinecap="round"
                          initial={{ strokeDasharray: `0 ${circumference}` }}
                          animate={{ strokeDasharray: `${dashArray} ${circumference}` }}
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
                  <div className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
                    {data.stats.estimated_capacity_percent}%
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                    Capacity
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

        {/* Team Availability Table */}
        <div className="lg:col-span-2">
          <GlassCard>
            <h4 className="text-sm font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
              Team Availability
            </h4>

            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--border)' }}>
                    <th className="text-left py-2 px-3 font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Employee
                    </th>
                    <th className="text-right py-2 px-3 font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Logged Hours
                    </th>
                    <th className="text-right py-2 px-3 font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                      Leave Hours
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {data.members.map((member, idx) => {
                    // Visual indicators based on hours
                    const isFullyAvailable = member.logged_hours > 0 && member.leave_hours === 0
                    const hasLeave = member.leave_hours > 0
                    const noLogs = member.logged_hours === 0 && member.leave_hours === 0

                    return (
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
                        <td className="py-2 px-3 text-right font-semibold" style={{
                          color: member.logged_hours > 0 ? 'var(--text-primary)' : '#ef4444'
                        }}>
                          {member.logged_hours}h
                        </td>
                        <td className="py-2 px-3 text-right font-semibold" style={{
                          color: member.leave_hours > 0 ? '#eab308' : 'var(--text-muted)'
                        }}>
                          {member.leave_hours}h
                        </td>
                      </motion.tr>
                    )
                  })}
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
}

function KPICard({ icon, label, value, color, iconColor }: KPICardProps) {
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

        <div className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
          {value}
        </div>

        <div className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {label}
        </div>
      </GlassCard>
    </motion.div>
  )
}

// Helper functions
function buildCapacitySummaryPrompt(data: TeamCapacityData): string {
  const { stats, members } = data

  return `Analyze this QA team capacity data and write a concise one-paragraph executive summary:

**Team Overview:**
- Total Members: ${stats.total_members}
- Available: ${stats.available}
- On Leave: ${stats.on_leave}
- No Logged Hours: ${stats.no_logs}
- Average Hours: ${stats.average_hours}h
- Estimated Capacity: ${stats.estimated_capacity_percent}%

**Context:**
This is for a QA Weekly Report. Focus on:
1. Whether testing capacity was sufficient for the week
2. Impact of leave/absences on testing activities
3. Any concerns about team availability

Write 2-3 sentences maximum. Be factual and executive-appropriate. Do not include recommendations or action items.`
}

function generateFallbackSummary(data: TeamCapacityData): string {
  const { stats } = data
  const total = stats.total_members
  const available = stats.available
  const onLeave = stats.on_leave
  const noLogs = stats.no_logs

  let summary = `${available} of ${total} QA team members were available this week`

  if (onLeave > 0) {
    summary += `, with ${onLeave} member${onLeave > 1 ? 's' : ''} on leave`
  }

  if (noLogs > 0) {
    summary += ` and ${noLogs} member${noLogs > 1 ? 's' : ''} with no logged work hours`
  }

  summary += `. `

  if (stats.estimated_capacity_percent >= 80) {
    summary += `Overall testing capacity remained sufficient for planned execution.`
  } else if (stats.estimated_capacity_percent >= 60) {
    summary += `Testing capacity was adequate but may have impacted some lower-priority test activities.`
  } else {
    summary += `Reduced capacity may have affected testing coverage and execution timelines.`
  }

  return summary
}
