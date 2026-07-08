// src/modules/QAWeeklyReport/components/DashboardSectionToggles.tsx
// Premium Dashboard Display Sections panel — complete section control with presets, search, and categories.

import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LayoutDashboard, Shield, Bug, BarChart3, Calendar, Sparkles,
  Search, ChevronDown, ChevronRight, Eye, EyeOff, RotateCcw,
  Users, FileText, TrendingUp, Activity, Briefcase, Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQAReportStore } from '../store'
import { GlassCard } from '@/components/ui/GlassCard'

// ── Section Definitions ───────────────────────────────────────────────────────

export interface DashboardSectionConfig {
  key: string
  label: string
  description: string
  icon: React.ElementType
  category: string
  defaultEnabled: boolean
}

const SECTIONS: DashboardSectionConfig[] = [
  // Executive Overview
  { key: 'show_hero', label: 'Hero Section', description: 'Project title, reporting period, and key metrics', icon: LayoutDashboard, category: 'Executive Overview', defaultEnabled: true },
  { key: 'show_qualityScore', label: 'Quality Score', description: 'Executive quality gauge with health indicator', icon: Shield, category: 'Executive Overview', defaultEnabled: true },
  { key: 'show_kpiCards', label: 'KPI Scorecards', description: 'Support emails, features, fixes, defects', icon: Activity, category: 'Executive Overview', defaultEnabled: true },
  { key: 'showAISummary', label: 'Executive Summary', description: 'AI-generated achievements and overview', icon: Sparkles, category: 'Executive Overview', defaultEnabled: true },

  // Release
  { key: 'show_sprintHealth', label: 'Sprint Health', description: 'Sprint validation progress and status cards', icon: Shield, category: 'Release', defaultEnabled: true },
  { key: 'show_releaseReadiness', label: 'Release Readiness Meter', description: 'Radial gauge for deployment approval', icon: Target, category: 'Release', defaultEnabled: true },
  { key: 'show_releaseTable', label: 'Release Testing Table', description: 'Full table of release items with status', icon: FileText, category: 'Release', defaultEnabled: true },
  { key: 'show_releaseBugStatus', label: 'Release Bug Status', description: 'Uploaded defect tracker analytics', icon: Bug, category: 'Release', defaultEnabled: true },

  // Support
  { key: 'show_supportLog', label: 'Support & Exception Log', description: 'Support tickets table', icon: FileText, category: 'Support', defaultEnabled: true },
  { key: 'show_productionIssues', label: 'Production Issues', description: 'Issue categories breakdown table', icon: Bug, category: 'Support', defaultEnabled: true },
  { key: 'show_teamAllocation', label: 'Team Allocation', description: 'Team resource cards with members', icon: Users, category: 'Support', defaultEnabled: true },
  { key: 'show_teamCapacity', label: 'Team Capacity Overview', description: 'Weekly team availability and testing capacity', icon: Activity, category: 'Support', defaultEnabled: true },

  // Defects
  { key: 'show_defectAnalysis', label: 'Defects — Last Week', description: 'Last week + MTD defect counts', icon: Bug, category: 'Defects', defaultEnabled: true },
  { key: 'show_historicalDefectOptimization', label: 'Historical Defect Optimization', description: 'Compare previous vs latest fixed bug counts with improvement metrics', icon: TrendingUp, category: 'Defects', defaultEnabled: true },
  { key: 'show_weeklyCharts', label: 'Weekly Defect Charts', description: 'Pie and bar charts for distributions', icon: BarChart3, category: 'Defects', defaultEnabled: true },

  // Analytics
  { key: 'show_wowComparison', label: 'Week-over-Week Comparison', description: 'KPI cards comparing this vs last week', icon: TrendingUp, category: 'Analytics', defaultEnabled: true },
  { key: 'showHistoricalAnalytics', label: 'Historical Analytics', description: 'Trend charts across saved reports', icon: BarChart3, category: 'Analytics', defaultEnabled: true },

  // Planning
  { key: 'show_nextPriorities', label: 'Next Priorities', description: 'Upcoming week priority cards', icon: Briefcase, category: 'Planning', defaultEnabled: true },

  // AI Insights
  { key: 'showAIInsights', label: 'AI Insights', description: 'Achievements, risks, trends, recommendations', icon: Sparkles, category: 'AI Insights', defaultEnabled: true },
  { key: 'show_aiRisk', label: 'AI Risk Analysis', description: 'Risk identification from historical data', icon: Shield, category: 'AI Insights', defaultEnabled: true },
]

const CATEGORIES = ['Executive Overview', 'Release', 'Support', 'Defects', 'Analytics', 'Planning', 'AI Insights']

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  'Executive Overview': LayoutDashboard,
  'Release': Shield,
  'Support': FileText,
  'Defects': Bug,
  'Analytics': BarChart3,
  'Planning': Calendar,
  'AI Insights': Sparkles,
}

// ── Presets ───────────────────────────────────────────────────────────────────

interface Preset {
  id: string
  label: string
  description: string
  enabled: string[]
}

const PRESETS: Preset[] = [
  {
    id: 'executive',
    label: 'Executive View',
    description: 'High-level metrics for management',
    enabled: ['show_hero', 'show_qualityScore', 'show_kpiCards', 'showAISummary', 'show_releaseReadiness', 'show_releaseBugStatus', 'show_weeklyCharts', 'show_wowComparison', 'showAIInsights'],
  },
  {
    id: 'client',
    label: 'Client View',
    description: 'Safe for external stakeholders',
    enabled: ['show_hero', 'show_qualityScore', 'show_kpiCards', 'show_sprintHealth', 'show_releaseReadiness', 'show_releaseTable', 'show_releaseBugStatus', 'show_defectAnalysis', 'show_weeklyCharts', 'show_nextPriorities'],
  },
  {
    id: 'internal',
    label: 'Internal QA View',
    description: 'All sections enabled',
    enabled: SECTIONS.map(s => s.key),
  },
]

// ── Default section state ─────────────────────────────────────────────────────

export function getDefaultSectionVisibility(): Record<string, boolean> {
  const map: Record<string, boolean> = {}
  for (const s of SECTIONS) map[s.key] = s.defaultEnabled
  return map
}

export function getSectionVisibility(form: any): Record<string, boolean> {
  const defaults = getDefaultSectionVisibility()
  const stored = form.dashboardSections || {}
  return { ...defaults, ...stored }
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DashboardSectionToggles() {
  const { form, setForm } = useQAReportStore()
  const [search, setSearch] = useState('')
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>(() => {
    const m: Record<string, boolean> = {}
    CATEGORIES.forEach(c => { m[c] = true })
    return m
  })

  const visibility = getSectionVisibility(form)

  const updateSection = (key: string, enabled: boolean) => {
    const current = form.dashboardSections || {}
    setForm({ dashboardSections: { ...current, [key]: enabled } } as any)
  }

  const applyPreset = (preset: Preset) => {
    const map: Record<string, boolean> = {}
    for (const s of SECTIONS) map[s.key] = preset.enabled.includes(s.key)
    setForm({ dashboardSections: map } as any)
  }

  const enableAll = () => {
    const map: Record<string, boolean> = {}
    for (const s of SECTIONS) map[s.key] = true
    setForm({ dashboardSections: map } as any)
  }

  const disableAll = () => {
    const map: Record<string, boolean> = {}
    for (const s of SECTIONS) map[s.key] = false
    setForm({ dashboardSections: map } as any)
  }

  const resetDefaults = () => {
    setForm({ dashboardSections: getDefaultSectionVisibility() } as any)
  }

  const toggleCategory = (cat: string) => {
    setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }))
  }

  const enabledCount = Object.values(visibility).filter(Boolean).length

  // Filter by search
  const filteredSections = useMemo(() => {
    if (!search.trim()) return SECTIONS
    const q = search.toLowerCase()
    return SECTIONS.filter(s =>
      s.label.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
    )
  }, [search])

  const filteredCategories = useMemo(() => {
    return CATEGORIES.filter(cat => filteredSections.some(s => s.category === cat))
  }, [filteredSections])

  return (
    <GlassCard hoverEffect={false}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
            <LayoutDashboard className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            Dashboard Display Sections
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-muted)' }}>
            Choose which sections will be visible in the Executive Dashboard. ({enabledCount}/{SECTIONS.length} active)
          </p>
        </div>
      </div>

      {/* Presets */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESETS.map(preset => (
          <button
            key={preset.id}
            onClick={() => applyPreset(preset)}
            className="px-3 py-1.5 rounded-xl text-[10px] font-bold transition-all"
            style={{ background: 'var(--hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)' }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-secondary)' }}
            title={preset.description}
          >
            {preset.label}
          </button>
        ))}
        <button onClick={enableAll} className="px-3 py-1.5 rounded-xl text-[10px] font-bold" style={{ background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          <Eye className="w-3 h-3 inline mr-1" />All On
        </button>
        <button onClick={disableAll} className="px-3 py-1.5 rounded-xl text-[10px] font-bold" style={{ background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          <EyeOff className="w-3 h-3 inline mr-1" />All Off
        </button>
        <button onClick={resetDefaults} className="px-3 py-1.5 rounded-xl text-[10px] font-bold" style={{ background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
          <RotateCcw className="w-3 h-3 inline mr-1" />Reset
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search sections..."
          className="field-input pl-9 h-8 text-xs"
        />
      </div>

      {/* Categories + Sections */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {filteredCategories.map(cat => {
          const CatIcon = CATEGORY_ICONS[cat] || LayoutDashboard
          const isExpanded = expandedCats[cat]
          const catSections = filteredSections.filter(s => s.category === cat)
          const catEnabledCount = catSections.filter(s => visibility[s.key]).length

          return (
            <div key={cat}>
              {/* Category header */}
              <button
                onClick={() => toggleCategory(cat)}
                className="w-full flex items-center justify-between py-2 px-3 rounded-xl transition-all"
                style={{ background: 'var(--hover)' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--card-bg)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--hover)' }}
              >
                <div className="flex items-center gap-2">
                  {isExpanded ? <ChevronDown className="w-3 h-3" style={{ color: 'var(--text-muted)' }} /> : <ChevronRight className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />}
                  <CatIcon className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
                  <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{cat}</span>
                </div>
                <span className="text-[10px] font-bold" style={{ color: catEnabledCount === catSections.length ? 'var(--accent)' : 'var(--text-muted)' }}>
                  {catEnabledCount}/{catSections.length}
                </span>
              </button>

              {/* Section toggles */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="pl-5 pt-1 pb-2 space-y-1">
                      {catSections.map(section => {
                        const enabled = visibility[section.key]
                        return (
                          <div
                            key={section.key}
                            className="flex items-center justify-between py-2 px-3 rounded-xl transition-all"
                            style={{ background: enabled ? 'rgba(99,102,241,0.04)' : 'transparent' }}
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <section.icon className="w-3.5 h-3.5 shrink-0" style={{ color: enabled ? 'var(--accent)' : 'var(--text-muted)' }} />
                              <div className="min-w-0">
                                <span className="text-xs font-semibold block truncate" style={{ color: enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                                  {section.label}
                                </span>
                                <span className="text-[10px] block truncate" style={{ color: 'var(--text-muted)' }}>
                                  {section.description}
                                </span>
                              </div>
                            </div>
                            {/* Toggle switch */}
                            <button
                              onClick={() => updateSection(section.key, !enabled)}
                              className="relative w-9 h-5 rounded-full shrink-0 ml-3 transition-colors duration-200"
                              style={{
                                background: enabled ? 'var(--accent)' : 'var(--hover)',
                                border: `1px solid ${enabled ? 'var(--accent)' : 'var(--border)'}`,
                              }}
                              role="switch"
                              aria-checked={enabled}
                              aria-label={section.label}
                            >
                              <span
                                className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200"
                                style={{ transform: enabled ? 'translateX(16px)' : 'translateX(0)' }}
                              />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </GlassCard>
  )
}
