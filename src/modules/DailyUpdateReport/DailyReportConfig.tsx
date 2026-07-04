import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Plus, Edit, Save, Trash2, Power, PowerOff, ShieldAlert,
  ArrowLeft, Search, GripVertical, Check, X, Clock, User
} from 'lucide-react'
import { useDailyReportStore } from './store'
import { useAppStore } from '@/store/useAppStore'
import { usePermissions } from '@/hooks/usePermissions'
import { ROUTES } from '@/lib/routes'
import { GlassCard } from '@/components/ui/GlassCard'
import { CinematicHeading } from '@/components/ui/CinematicHeading'
import type { DropdownConfig, ConfigCategory } from './types'
import { supabase } from '@/lib/supabase'

const CATEGORIES: { key: ConfigCategory; label: string; desc: string }[] = [
  { key: 'branch', label: 'Branches', desc: 'Manage project codebase repository branch selection lists.' },
  { key: 'qa', label: 'QA Engineers', desc: 'Personnel assignments for support tickets and release verification.' },
  { key: 'status', label: 'Statuses', desc: 'Track progress flow for support tasks and logs.' },
  { key: 'retesting_status', label: 'Retesting Statuses', desc: 'Phases of validation (e.g. Open, Retesting, Fixed).' },
  { key: 'smoke_status', label: 'Smoke Testing Statuses', desc: 'Status checks specifically assigned to smoke runs.' },
]

export const DailyReportConfig: React.FC = () => {
  const navigate = useNavigate()
  const { role } = useAppStore()
  const { can } = usePermissions()
  const {
    dropdownConfigs,
    fetchDropdownConfigs,
    saveDropdownConfig,
    deleteDropdownConfig,
    reorderDropdownConfigs,
    loading
  } = useDailyReportStore()

  // Authorization Check via RBAC
  const isAuthorized = can('daily-report', 'can_configure')

  // Configuration page states
  const [activeTab, setActiveTab] = useState<ConfigCategory>('branch')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newValue, setNewValue] = useState('')
  const [profiles, setProfiles] = useState<any[]>([])

  useEffect(() => {
    if (!isAuthorized) return
    fetchDropdownConfigs()

    // Fetch profile names for audit maps
    supabase
      .from('profiles')
      .select('id, full_name, email')
      .then(({ data }) => {
        if (data) setProfiles(data)
      })
  }, [isAuthorized])

  if (!isAuthorized) {
    return <AccessDeniedView />
  }

  const getProfileName = (id?: string) => {
    if (!id) return 'System Seed'
    const found = profiles.find(p => p.id === id)
    return found ? (found.full_name || found.email) : 'User'
  }

  // Filter values
  const activeConfigs = dropdownConfigs
    .filter(c => c.category === activeTab)
    .filter(c => c.value.toLowerCase().includes(searchQuery.toLowerCase()))

  // Add configuration value
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newValue.trim()) return

    // Prevent duplicates
    const isDuplicate = dropdownConfigs.some(c => c.category === activeTab && c.value.toLowerCase() === newValue.trim().toLowerCase())
    if (isDuplicate) {
      alert('This value already exists in this master category.')
      return
    }

    const maxSort = dropdownConfigs
      .filter(c => c.category === activeTab)
      .reduce((max, c) => Math.max(max, c.sort_order), 0)

    try {
      await saveDropdownConfig({
        category: activeTab,
        value: newValue.trim(),
        is_active: true,
        sort_order: maxSort + 1
      })
      setNewValue('')
    } catch (e) {
      alert('Error creating dropdown config.')
    }
  }

  // Edit inline save
  const handleEditSave = async (id: string, config: DropdownConfig) => {
    if (!editValue.trim()) return
    try {
      await saveDropdownConfig({
        ...config,
        value: editValue.trim()
      })
      setEditingConfigId(null)
      setEditValue('')
    } catch (e) {
      alert('Error updating configuration.')
    }
  }

  // Toggle active/inactive
  const handleToggleActive = async (config: DropdownConfig) => {
    try {
      await saveDropdownConfig({
        ...config,
        is_active: !config.is_active
      })
    } catch (e) {
      alert('Error toggling configuration status.')
    }
  }

  // Delete config
  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dropdown value? This may result in empty values in existing rows.')) return
    try {
      await deleteDropdownConfig(id)
    } catch (e) {
      alert('Error deleting configuration.')
    }
  }

  // Drag and drop reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString())
  }

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    if (sourceIndex === targetIndex || isNaN(sourceIndex)) return
    const nextList = [...activeConfigs]
    const [removed] = nextList.splice(sourceIndex, 1)
    nextList.splice(targetIndex, 0, removed)
    reorderDropdownConfigs(activeTab, nextList)
  }

  return (
    <div className="py-6 sm:py-12 min-h-screen">

      {/* Back button */}
      <button
        onClick={() => navigate(ROUTES.dailyReport)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-bold text-text-secondary hover:text-white transition-all mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Daily Report
      </button>

      <CinematicHeading
        title="Dropdown Configurations"
        subtitle="Manage master values used dynamically across support logs and release testing statuses."
        align="left"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 mt-10">

        {/* Sidebar tabs */}
        <div className="flex flex-col gap-2">
          {CATEGORIES.map(cat => {
            const active = activeTab === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => {
                  setActiveTab(cat.key)
                  setSearchQuery('')
                  setEditingConfigId(null)
                }}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 ${active ? 'bg-accent-gold border-accent-gold text-black shadow-lg shadow-accent-gold/10 font-bold' : 'bg-white/5 border-white/5 text-text-secondary hover:text-white hover:bg-white/[0.08]'}`}
              >
                <span className="text-sm block">{cat.label}</span>
                <span className={`text-[10px] block mt-1 leading-normal ${active ? 'text-black/75' : 'text-text-muted'}`}>{cat.desc}</span>
              </button>
            )
          })}
        </div>

        {/* Configuration list container */}
        <div className="flex flex-col gap-6">

          <GlassCard hoverEffect={false} className="flex flex-col gap-5">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-white/5 pb-4">
              <h2 className="text-xl font-extrabold font-clash text-white">
                {CATEGORIES.find(c => c.key === activeTab)?.label} List
              </h2>

              {/* Search config */}
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 text-xs w-56 focus-within:border-accent-gold/40 transition-all">
                <Search className="w-3.5 h-3.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search values..."
                  className="bg-transparent focus:outline-none w-full placeholder:text-text-muted text-white text-xs"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {/* Add Value Form */}
            <form onSubmit={handleAdd} className="flex items-center gap-3">
              <input
                type="text"
                placeholder={`Add new ${CATEGORIES.find(c => c.key === activeTab)?.label.toLowerCase().slice(0, -1)} value...`}
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs text-white placeholder:text-text-muted focus:outline-none focus:border-accent-gold/40 transition-all font-sans"
              />
              <button
                type="submit"
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-accent-gold text-black hover:opacity-90 transition-all text-xs font-black uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </form>

            {/* List items */}
            {loading ? (
              <div className="py-8 flex justify-center">
                <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {activeConfigs.map((config, idx) => {
                  const isEditing = editingConfigId === config.id

                  return (
                    <div
                      key={config.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, idx)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => handleDrop(e, idx)}
                      className={`p-4 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between gap-4 group transition-all hover:bg-white/[0.02] ${!config.is_active ? 'opacity-40' : ''}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="cursor-grab text-text-muted group-hover:text-white active:cursor-grabbing">
                          <GripVertical className="w-4 h-4" />
                        </div>

                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={e => setEditValue(e.target.value)}
                              className="px-3 py-1.5 rounded-lg border border-accent-gold bg-black/40 text-xs text-white focus:outline-none w-full font-sans"
                              autoFocus
                            />
                            <button
                              onClick={() => handleEditSave(config.id, config)}
                              className="p-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingConfigId(null)}
                              className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm font-semibold truncate text-white">
                            {config.value}
                          </span>
                        )}
                      </div>

                      {/* Right actions */}
                      {!isEditing && (
                        <div className="flex items-center gap-2 shrink-0">

                          {/* Toggle Active */}
                          <button
                            onClick={() => handleToggleActive(config)}
                            title={config.is_active ? 'Deactivate' : 'Activate'}
                            className={`p-1.5 rounded-lg border transition-all ${config.is_active ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20' : 'bg-white/5 border-white/10 text-text-muted hover:text-white'}`}
                          >
                            {config.is_active ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                          </button>

                          {/* Edit inline */}
                          <button
                            onClick={() => {
                              setEditingConfigId(config.id)
                              setEditValue(config.value)
                            }}
                            className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-text-secondary hover:text-white transition-all"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDelete(config.id)}
                            className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
                {activeConfigs.length === 0 && (
                  <div className="py-12 text-center text-text-muted text-xs italic">
                    No dropdown values found. Add one above.
                  </div>
                )}
              </div>
            )}
          </GlassCard>

          {/* Audit trail card section */}
          {activeConfigs.length > 0 && (
            <GlassCard hoverEffect={false} className="p-4 flex flex-col gap-3">
              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block border-b border-white/5 pb-1">
                Selected Audit Trail Summary
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {activeConfigs.map(c => (
                  <div key={c.id} className="p-3 rounded-xl bg-white/[0.005] border border-white/5 flex flex-col gap-1.5">
                    <span className="font-bold text-accent-gold text-xs">{c.value}</span>
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <User className="w-3 h-3 text-text-muted" />
                      <span>Created By: <strong className="text-white">{getProfileName(c.created_by)}</strong></span>
                    </div>
                    {c.updated_by && (
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <Clock className="w-3 h-3 text-text-muted" />
                        <span>Last Updated: <strong className="text-white">{getProfileName(c.updated_by)}</strong> ({new Date(c.updated_at || '').toLocaleDateString()})</span>
                      </div>
                    )}
                  </div>
                )).slice(0, 4) /* Limit count to prevent list overflows */}
              </div>
            </GlassCard>
          )}

        </div>
      </div>
    </div>
  )
}

// Access Denied Template View
const AccessDeniedView: React.FC = () => {
  const navigate = useNavigate()
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <GlassCard hoverEffect={false} className="flex flex-col items-center justify-center py-20 text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-2xl font-bold text-white mb-2">🔒 Access Denied (403)</h3>
        <p className="text-text-secondary text-sm leading-relaxed mb-6">
          You don't have access to this configuration module. Only managers, QA leads, and administrators are authorized to manage master dropdown lists.
        </p>
        <button
          onClick={() => navigate(ROUTES.dailyReport)}
          className="px-6 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs font-extrabold uppercase tracking-wider text-text-secondary hover:text-white transition-all"
        >
          Return to Daily Report
        </button>
      </GlassCard>
    </div>
  )
}
