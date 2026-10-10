// src/modules/DashboardQuickDetails/QuickDetailsWidget.tsx

import React, { useEffect, useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { useAppStore } from '@/store/useAppStore'
import { useAIAccess } from '@/hooks/useAIAccess'
import {
  FolderKanban,
  ListChecks,
  CalendarX,
  Timer,
  Sparkles,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ArrowUpRight,
  ArrowRight,
  ShieldAlert
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { loadQuickDetailsData } from './quickDetailsDataService'
import type { QuickDetailsSummary, AIInsightAlert } from './types'

export const QuickDetailsWidget: React.FC = () => {
  const navigate = useNavigate()
  const { user, profile, role } = useAppStore()
  const { canGenerate } = useAIAccess()

  const [loading, setLoading] = useState(true)
  const [summary, setSummary] = useState<QuickDetailsSummary>({
    activeProjectsCount: 0,
    tasksInProgressCount: 0,
    pendingTasksCount: 0,
    overdueTasksCount: 0,
    effortOverrunsCount: 0,
    openSupportIssuesCount: 0,
  })
  const [alerts, setAlerts] = useState<AIInsightAlert[]>([])
  const [error, setError] = useState<string | null>(null)

  const hasFetched = useRef(false)

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const userNameStr = profile?.full_name || (typeof user?.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null) || user?.email?.split('@')[0]
      const ctx = {
        userId: user?.id,
        userName: userNameStr ? String(userNameStr) : undefined,
        role: role || profile?.role || 'free',
      }

      const canUseAI = canGenerate('dashboard')

      const data = await loadQuickDetailsData(ctx, canUseAI)
      setSummary(data.summary)
      setAlerts(data.alerts)
    } catch (err: any) {
      console.warn('[QuickDetailsWidget] Data load error:', err)
      setError(err?.message || 'Failed to load quick details')
    } finally {
      setLoading(false)
    }
  }, [user, profile, role, canGenerate])

  useEffect(() => {
    if (hasFetched.current) return
    hasFetched.current = true
    fetchData()
  }, [fetchData])

  // Format 2-digit numbers (e.g. 04, 12, 02)
  const formatNumber = (num: number): string => {
    return num < 10 && num >= 0 ? `0${num}` : String(num)
  }

  return (
    <GlassCard
      hoverEffect={false}
      className="p-6 sm:p-7 flex flex-col justify-between relative overflow-hidden h-full border-border/60 bg-card/60 backdrop-blur-md"
    >
      {/* Background ambient lighting */}
      <div
        className="absolute w-64 h-64 rounded-full blur-3xl pointer-events-none opacity-15 -top-16 -right-16"
        style={{ background: 'radial-gradient(circle, var(--accent, #6366f1) 0%, transparent 70%)' }}
      />

      <div className="space-y-6 relative z-10">
        {/* ── Top Header ──────────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-foreground">
              Quick Details
            </h2>
            <p className="text-xs sm:text-sm text-text-muted mt-0.5">
              Your current project situation
            </p>
          </div>

          {/* Live Overview Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span>Live overview</span>
          </div>
        </div>

        {/* ── 4-Grid Metric Cards ─────────────────────────────────────────────── */}
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:gap-6 py-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="w-5 h-5 rounded bg-muted/60" />
                <div className="w-12 h-7 rounded bg-muted/80" />
                <div className="w-24 h-3.5 rounded bg-muted/50" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center gap-3 p-4 rounded-xl bg-destructive/10 text-destructive text-xs">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:gap-6">
            {/* 1. Active Projects */}
            <div
              onClick={() => navigate('/project-hub?status=active')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/project-hub?status=active')}
              className="group p-2.5 -m-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary group-hover:text-foreground transition-colors">
                <FolderKanban className="w-4 h-4" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-clash text-foreground tracking-tight mt-1 group-hover:text-accent transition-colors">
                {formatNumber(summary.activeProjectsCount)}
              </div>
              <div className="text-xs text-text-muted mt-0.5 group-hover:text-text-secondary transition-colors">
                Active Projects
              </div>
            </div>

            {/* 2. Tasks In Progress */}
            <div
              onClick={() => navigate('/release-tracker?status=in_progress')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/release-tracker?status=in_progress')}
              className="group p-2.5 -m-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary group-hover:text-foreground transition-colors">
                <ListChecks className="w-4 h-4" />
              </div>
              <div className="text-2xl sm:text-3xl font-bold font-clash text-foreground tracking-tight mt-1 group-hover:text-accent transition-colors">
                {formatNumber(summary.tasksInProgressCount)}
              </div>
              <div className="text-xs text-text-muted mt-0.5 group-hover:text-text-secondary transition-colors">
                Tasks In Progress
              </div>
            </div>

            {/* 3. Overdue Tasks */}
            <div
              onClick={() => navigate('/release-tracker?status=overdue')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/release-tracker?status=overdue')}
              className="group p-2.5 -m-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary group-hover:text-foreground transition-colors">
                <CalendarX className={cn('w-4 h-4', summary.overdueTasksCount > 0 ? 'text-amber-500' : '')} />
              </div>
              <div className={cn(
                'text-2xl sm:text-3xl font-bold font-clash tracking-tight mt-1 transition-colors',
                summary.overdueTasksCount > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-foreground group-hover:text-accent'
              )}>
                {formatNumber(summary.overdueTasksCount)}
              </div>
              <div className="text-xs text-text-muted mt-0.5 group-hover:text-text-secondary transition-colors">
                Overdue Tasks
              </div>
            </div>

            {/* 4. Effort Overruns */}
            <div
              onClick={() => navigate('/release-tracker?overrun=true')}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && navigate('/release-tracker?overrun=true')}
              className="group p-2.5 -m-2.5 rounded-xl hover:bg-muted/40 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-text-secondary group-hover:text-foreground transition-colors">
                <Timer className={cn('w-4 h-4', summary.effortOverrunsCount > 0 ? 'text-amber-500' : '')} />
              </div>
              <div className={cn(
                'text-2xl sm:text-3xl font-bold font-clash tracking-tight mt-1 transition-colors',
                summary.effortOverrunsCount > 0 ? 'text-amber-500 dark:text-amber-400' : 'text-foreground group-hover:text-accent'
              )}>
                {formatNumber(summary.effortOverrunsCount)}
              </div>
              <div className="text-xs text-text-muted mt-0.5 group-hover:text-text-secondary transition-colors">
                Effort Overruns
              </div>
            </div>
          </div>
        )}

        {/* ── AI Project Insights Panel ────────────────────────────────────────── */}
        <div className="rounded-2xl border border-border/70 bg-muted/20 dark:bg-white/[0.02] p-4 sm:p-5 relative overflow-hidden transition-all">
          {/* Header */}
          <div className="flex items-center gap-2 mb-3.5">
            <Sparkles className="w-4 h-4 text-purple-500 shrink-0" />
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              AI Project Insights
            </h3>
          </div>

          {/* Alert rows */}
          {loading ? (
            <div className="space-y-3 py-1">
              {[1, 2].map((i) => (
                <div key={i} className="animate-pulse space-y-1.5 p-2 rounded-xl">
                  <div className="w-40 h-4 rounded bg-muted/80" />
                  <div className="w-full h-3 rounded bg-muted/50" />
                  <div className="w-28 h-2.5 rounded bg-muted/40" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {alerts.map((alert) => {
                const isOverdue = alert.type === 'overdue_task' || alert.type === 'project_risk'
                const isOverrun = alert.type === 'effort_overrun'
                const isHealthy = alert.type === 'healthy'

                return (
                  <div
                    key={alert.id}
                    onClick={() => navigate(alert.targetRoute)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && navigate(alert.targetRoute)}
                    className="group flex items-start justify-between gap-3 p-2.5 sm:p-3 rounded-xl hover:bg-muted/50 transition-all cursor-pointer border border-transparent hover:border-border/60"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="mt-0.5 shrink-0">
                        {isHealthy ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        ) : isOverdue ? (
                          <AlertTriangle className="w-4 h-4 text-amber-500" />
                        ) : isOverrun ? (
                          <Clock className="w-4 h-4 text-amber-500" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-purple-500" />
                        )}
                      </div>

                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-foreground group-hover:text-accent transition-colors flex items-center gap-1.5">
                          <span>{alert.title}</span>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5 leading-relaxed line-clamp-2">
                          {alert.description}
                        </p>
                        <p className="text-[11px] text-text-muted mt-1 font-mono">
                          {alert.context}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 mt-0.5 text-text-muted group-hover:text-accent group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all">
                      <ArrowUpRight className="w-4 h-4" />
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Subtitle / Disclaimer */}
          <div className="text-[11px] text-text-muted/80 mt-3 pt-2.5 border-t border-border/40 leading-tight">
            Production values and alerts generated from actual authorised records.
          </div>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-4 mt-5 pt-3.5 border-t border-border/50 text-xs text-text-muted">
        <span>All summaries respect role permissions.</span>
        <button
          onClick={() => navigate('/project-hub')}
          className="inline-flex items-center gap-1 font-semibold text-foreground hover:text-accent transition-colors shrink-0"
        >
          <span>View details</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </GlassCard>
  )
}
