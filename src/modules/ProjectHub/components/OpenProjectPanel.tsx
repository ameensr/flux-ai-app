// src/modules/ProjectHub/components/OpenProjectPanel.tsx
// Display OpenProject work packages and statistics in project detail page

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ExternalLink,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  Filter,
  ChevronDown,
  ChevronUp,
  Loader2,
  Bug,
  FileText,
  Zap,
  AlertTriangle,
  Calendar,
  BarChart3,
  Link2Off,
  Settings2,
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/context/ThemeContext'
import { useToast } from '@/hooks/use-toast'
import type { Project } from '../types'
import {
  fetchWorkPackages,
  fetchWorkPackageStats,
  fetchStatuses,
  fetchTypes,
  formatWorkPackage,
  type OpenProjectConfig,
  type WorkPackageStats,
  type FormattedWorkPackage,
} from '@/services/openproject'

interface OpenProjectPanelProps {
  project: Project
  onConfigureClick: () => void
}

export function OpenProjectPanel({ project, onConfigureClick }: OpenProjectPanelProps) {
  const { isDark } = useTheme()
  const { toast } = useToast()

  const config = project.metadata?.openproject as OpenProjectConfig | undefined

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [workPackages, setWorkPackages] = useState<FormattedWorkPackage[]>([])
  const [stats, setStats] = useState<WorkPackageStats | null>(null)
  const [expanded, setExpanded] = useState(true)
  const [showFilters, setShowFilters] = useState(false)

  // Filter state
  const [statuses, setStatuses] = useState<{ id: number; name: string }[]>([])
  const [types, setTypes] = useState<{ id: number; name: string }[]>([])
  const [selectedStatus, setSelectedStatus] = useState<string>('')
  const [selectedType, setSelectedType] = useState<string>('')

  const loadData = useCallback(async () => {
    if (!config?.openproject_url || !config?.openproject_api_key) return

    setLoading(true)
    setError(null)

    try {
      const filters: { status?: string[]; type?: string[] } = {}
      if (selectedStatus) filters.status = [selectedStatus]
      if (selectedType) filters.type = [selectedType]

      const [wpResult, statsResult] = await Promise.all([
        fetchWorkPackages(config, { ...filters, pageSize: 50 }),
        fetchWorkPackageStats(config),
      ])

      setWorkPackages(wpResult.items.map(formatWorkPackage))
      setStats(statsResult)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data')
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to fetch OpenProject data' })
    } finally {
      setLoading(false)
    }
  }, [config, selectedStatus, selectedType, toast])

  const loadFilterOptions = useCallback(async () => {
    if (!config?.openproject_url || !config?.openproject_api_key) return

    try {
      const [statusList, typeList] = await Promise.all([fetchStatuses(config), fetchTypes(config)])
      setStatuses(statusList)
      setTypes(typeList)
    } catch {
      // Silently fail for filter options
    }
  }, [config])

  useEffect(() => {
    if (config?.openproject_url && config?.openproject_api_key) {
      loadData()
      loadFilterOptions()
    }
  }, [config?.openproject_url, config?.openproject_api_key])

  useEffect(() => {
    if (config?.openproject_url && config?.openproject_api_key) {
      loadData()
    }
  }, [selectedStatus, selectedType])

  // No config - show setup prompt
  if (!config?.openproject_url || !config?.openproject_api_key) {
    return (
      <GlassCard hoverEffect={false} className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
            <ExternalLink className="w-4 h-4" />
            OpenProject Integration
          </h3>
        </div>
        <div className="text-center py-8">
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }}
          >
            <Link2Off className="w-8 h-8" style={{ color: 'var(--text-muted)' }} />
          </div>
          <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Connect to OpenProject to view live work packages and statistics
          </p>
          <Button onClick={onConfigureClick} variant="outline" className="gap-2">
            <Settings2 className="w-4 h-4" />
            Configure Integration
          </Button>
        </div>
      </GlassCard>
    )
  }

  const getTypeIcon = (type: string) => {
    const t = type.toLowerCase()
    if (t.includes('bug')) return <Bug className="w-3.5 h-3.5" />
    if (t.includes('feature')) return <Zap className="w-3.5 h-3.5" />
    if (t.includes('task')) return <CheckCircle2 className="w-3.5 h-3.5" />
    return <FileText className="w-3.5 h-3.5" />
  }

  const getPriorityColor = (priority: string) => {
    const p = priority.toLowerCase()
    if (p.includes('immediate') || p.includes('urgent')) return '#ef4444'
    if (p.includes('high')) return '#f97316'
    if (p.includes('normal') || p.includes('medium')) return '#3b82f6'
    if (p.includes('low')) return '#22c55e'
    return 'var(--text-muted)'
  }

  const getStatusColor = (status: string) => {
    const s = status.toLowerCase()
    if (s.includes('closed') || s.includes('done') || s.includes('resolved')) return '#22c55e'
    if (s.includes('progress') || s.includes('review')) return '#3b82f6'
    if (s.includes('new') || s.includes('open')) return '#a855f7'
    if (s.includes('rejected') || s.includes('blocked')) return '#ef4444'
    return 'var(--text-muted)'
  }

  return (
    <GlassCard hoverEffect={false} className="p-0 overflow-hidden">
      {/* Header */}
      <div
        className="px-5 py-4 flex items-center justify-between cursor-pointer"
        style={{ background: isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)' }}
        onClick={() => setExpanded(!expanded)}
      >
        <h3 className="text-sm font-bold uppercase tracking-wider flex items-center gap-2" style={{ color: 'var(--text-secondary)' }}>
          <ExternalLink className="w-4 h-4 text-green-500" />
          OpenProject
          {stats && (
            <span
              className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }}
            >
              {stats.total} items
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation()
              loadData()
            }}
            disabled={loading}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {/* Stats Cards */}
            {stats && (
              <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-3 border-b" style={{ borderColor: 'var(--border)' }}>
                <StatCard
                  label="Total"
                  value={stats.total}
                  icon={<BarChart3 className="w-4 h-4" />}
                  color="#3b82f6"
                  isDark={isDark}
                />
                <StatCard
                  label="Overdue"
                  value={stats.overdue}
                  icon={<AlertTriangle className="w-4 h-4" />}
                  color="#ef4444"
                  isDark={isDark}
                />
                <StatCard
                  label="Unassigned"
                  value={stats.unassigned}
                  icon={<User className="w-4 h-4" />}
                  color="#f97316"
                  isDark={isDark}
                />
                <StatCard
                  label="Completed"
                  value={`${stats.completedPercentage}%`}
                  icon={<CheckCircle2 className="w-4 h-4" />}
                  color="#22c55e"
                  isDark={isDark}
                />
              </div>
            )}

            {/* Filters */}
            <div className="px-5 py-3 border-b flex items-center gap-3 flex-wrap" style={{ borderColor: 'var(--border)' }}>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="gap-1.5 h-8"
              >
                <Filter className="w-3.5 h-3.5" />
                Filters
                {(selectedStatus || selectedType) && (
                  <span className="ml-1 w-5 h-5 rounded-full bg-green-500 text-white text-xs flex items-center justify-center">
                    {(selectedStatus ? 1 : 0) + (selectedType ? 1 : 0)}
                  </span>
                )}
              </Button>

              {showFilters && (
                <>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="h-8 px-3 rounded-lg border text-sm"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">All Statuses</option>
                    {statuses.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedType}
                    onChange={(e) => setSelectedType(e.target.value)}
                    className="h-8 px-3 rounded-lg border text-sm"
                    style={{
                      background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.02)',
                      borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <option value="">All Types</option>
                    {types.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>

                  {(selectedStatus || selectedType) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedStatus('')
                        setSelectedType('')
                      }}
                      className="h-8 text-xs"
                    >
                      Clear
                    </Button>
                  )}
                </>
              )}

              <a
                href={`${config.openproject_url}/projects/${config.openproject_project_id || ''}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-xs flex items-center gap-1 hover:underline"
                style={{ color: 'var(--text-muted)' }}
              >
                Open in OpenProject
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Content */}
            <div className="px-5 py-4">
              {loading && workPackages.length === 0 ? (
                <div className="flex items-center justify-center py-12 gap-3" style={{ color: 'var(--text-muted)' }}>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Loading work packages...
                </div>
              ) : error ? (
                <div className="flex items-center justify-center py-12 gap-3 text-red-500">
                  <AlertCircle className="w-5 h-5" />
                  {error}
                </div>
              ) : workPackages.length === 0 ? (
                <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                  <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No work packages found</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                  {workPackages.map((wp) => (
                    <WorkPackageRow
                      key={wp.id}
                      wp={wp}
                      config={config}
                      isDark={isDark}
                      getTypeIcon={getTypeIcon}
                      getPriorityColor={getPriorityColor}
                      getStatusColor={getStatusColor}
                    />
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  )
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon,
  color,
  isDark,
}: {
  label: string
  value: number | string
  icon: React.ReactNode
  color: string
  isDark: boolean
}) {
  return (
    <div
      className="p-3 rounded-xl border"
      style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-center gap-2 mb-1">
        <span style={{ color }}>{icon}</span>
        <span className="text-[10px] uppercase font-bold tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
      </div>
      <p className="text-xl font-black" style={{ color: 'var(--text-primary)' }}>
        {value}
      </p>
    </div>
  )
}

// Work Package Row Component
function WorkPackageRow({
  wp,
  config,
  isDark,
  getTypeIcon,
  getPriorityColor,
  getStatusColor,
}: {
  wp: FormattedWorkPackage
  config: OpenProjectConfig
  isDark: boolean
  getTypeIcon: (type: string) => React.ReactNode
  getPriorityColor: (priority: string) => string
  getStatusColor: (status: string) => string
}) {
  const priorityColor = getPriorityColor(wp.priority)
  const statusColor = getStatusColor(wp.status)

  return (
    <a
      href={`${config.openproject_url}/work_packages/${wp.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className="block p-3 rounded-xl border transition-all hover:scale-[1.01]"
      style={{
        background: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        borderColor: wp.isOverdue
          ? 'rgba(239, 68, 68, 0.3)'
          : isDark
          ? 'rgba(255,255,255,0.06)'
          : 'rgba(0,0,0,0.06)',
      }}
    >
      <div className="flex items-start gap-3">
        {/* Type Icon */}
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', color: 'var(--text-secondary)' }}
        >
          {getTypeIcon(wp.type)}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              #{wp.id}
            </span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
              style={{ background: `${statusColor}20`, color: statusColor }}
            >
              {wp.status}
            </span>
            {wp.isOverdue && (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/20 text-red-500">
                Overdue
              </span>
            )}
          </div>

          <p className="text-sm font-medium truncate mb-2" style={{ color: 'var(--text-primary)' }}>
            {wp.subject}
          </p>

          <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--text-muted)' }}>
            {/* Priority */}
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: priorityColor }} />
              {wp.priority}
            </span>

            {/* Assignee */}
            <span className="flex items-center gap-1">
              <User className="w-3 h-3" />
              {wp.assignee}
            </span>

            {/* Due Date */}
            {wp.dueDate && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {new Date(wp.dueDate).toLocaleDateString()}
              </span>
            )}

            {/* Progress */}
            {wp.percentageDone > 0 && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {wp.percentageDone}%
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {wp.percentageDone > 0 && (
          <div className="w-16 shrink-0">
            <div
              className="h-1.5 rounded-full overflow-hidden"
              style={{ background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }}
            >
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${wp.percentageDone}%`,
                  background: wp.percentageDone === 100 ? '#22c55e' : '#3b82f6',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </a>
  )
}
