// src/modules/QAWeeklyReport/QAReportDropdownConfig.tsx
// Dedicated dropdown master-list configuration page for /qa-report.
//
// Replaces the removed centralized Daily Report "Configuration" page for
// the two categories /qa-report actually still depends on: Testing Status
// and Priority, used by SupportLog.tsx / ReleaseTable.tsx's status and
// priority dropdowns. These still live in the shared
// daily_report_dropdown_configs table (unchanged schema) — Support &
// Exception Log / Release Testing Log on /daily-report no longer read from
// it at all (they use their own per-column dropdown_options instead), so
// this table is effectively qa-report-only going forward.

import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Edit, Trash2, Power, PowerOff, ShieldAlert,
  ArrowLeft, Search, GripVertical, Check, X, Clock, User
} from 'lucide-react'
import { useDailyReportStore } from '@/modules/DailyUpdateReport/store'
import { usePermissions } from '@/hooks/usePermissions'
import { ROUTES } from '@/lib/routes'
import { GlassCard } from '@/components/ui/GlassCard'
import { CinematicHeading } from '@/components/ui/CinematicHeading'
import type { DropdownConfig, ConfigCategory } from '@/modules/DailyUpdateReport/types'
import { supabase } from '@/lib/supabase'
import { useToast } from '@/hooks/use-toast'
import { useConfirm } from '@/components/ui/ConfirmDialog'

const CATEGORIES: { key: ConfigCategory; label: string; desc: string }[] = [
  { key: 'testing_status', label: 'Testing Statuses', desc: 'Status values used by the Support Log and Release Testing status/priority dropdowns on this report.' },
  { key: 'priority', label: 'Priorities', desc: 'Urgency levels for support tickets and release items (e.g. Critical, High, Medium, Low).' },
]

export const QAReportDropdownConfig: React.FC = () => {
  const navigate = useNavigate()
  const { can } = usePermissions()
  const { toast } = useToast()
  const confirm = useConfirm()
  const {
    dropdownConfigs,
    fetchDropdownConfigs,
    saveDropdownConfig,
    deleteDropdownConfig,
    reorderDropdownConfigs,
    loading
  } = useDailyReportStore()

  // Same permission that already gates /qa-report/configuration (Project
  // Configurations) — dropdown master lists are just another configuration
  // surface within the qa-report module, not a separate capability.
  const isAuthorized = can('qa-report', 'can_configure')

  const [activeTab, setActiveTab] = useState<ConfigCategory>('testing_status')
  const [searchQuery, setSearchQuery] = useState('')
  const [editingConfigId, setEditingConfigId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [newValue, setNewValue] = useState('')
  const [profiles, setProfiles] = useState<any[]>([])

  useEffect(() => {
    if (!isAuthorized) return
    fetchDropdownConfigs()

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

  const activeConfigs = dropdownConfigs
    .filter(c => c.category === activeTab)
    .filter(c => c.value.toLowerCase().includes(searchQuery.toLowerCase()))

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newValue.trim()) return

    const isDuplicate = dropdownConfigs.some(c => c.category === activeTab && c.value.toLowerCase() === newValue.trim().toLowerCase())
    if (isDuplicate) {
      toast({ variant: 'destructive', title: 'Duplicate Value', description: 'This value already exists in this master category.' })
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
      const categoryLabel = CATEGORIES.find(c => c.key === activeTab)?.label.slice(0, -1) || 'Configuration'
      toast({ variant: 'success', title: 'Added Successfully', description: `${categoryLabel} "${newValue.trim()}" added successfully.` })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to Add', description: e.message || 'Error creating dropdown config.' })
    }
  }

  const handleEditSave = async (id: string, config: DropdownConfig) => {
    if (!editValue.trim()) return
    try {
      await saveDropdownConfig({ ...config, value: editValue.trim() })
      setEditingConfigId(null)
      setEditValue('')
      const categoryLabel = CATEGORIES.find(c => c.key === activeTab)?.label.slice(0, -1) || 'Configuration'
      toast({ variant: 'success', title: 'Updated Successfully', description: `${categoryLabel} updated successfully.` })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to Update', description: e.message || 'Error updating configuration.' })
    }
  }

  const handleToggleActive = async (config: DropdownConfig) => {
    try {
      await saveDropdownConfig({ ...config, is_active: !config.is_active })
      const categoryLabel = CATEGORIES.find(c => c.key === activeTab)?.label.slice(0, -1) || 'Configuration'
      const action = !config.is_active ? 'activated' : 'deactivated'
      toast({ variant: 'success', title: 'Status Updated', description: `${categoryLabel} ${action} successfully.` })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to Update Status', description: e.message || 'Error toggling configuration status.' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!await confirm({
      title: 'Delete this dropdown value?',
      description: 'This may result in empty values in existing rows.',
      confirmLabel: 'Delete',
    })) return
    try {
      await deleteDropdownConfig(id)
      const categoryLabel = CATEGORIES.find(c => c.key === activeTab)?.label.slice(0, -1) || 'Configuration'
      toast({ variant: 'success', title: 'Deleted Successfully', description: `${categoryLabel} deleted successfully.` })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to Delete', description: e.message || 'Error deleting configuration.' })
    }
  }

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
      <button
        onClick={() => navigate(ROUTES.qaReport)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-hover border border-border text-xs font-bold text-text-secondary hover:text-text-primary transition-all mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Back to QA Weekly Report
      </button>

      <CinematicHeading
        title="Dropdown Configurations"
        subtitle="Manage master values for the Testing Status and Priority dropdowns used across this report's Support Log and Release Testing tables."
        align="left"
      />

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 mt-10">
        <div className="flex flex-col gap-2">
          {CATEGORIES.map(cat => {
            const active = activeTab === cat.key
            return (
              <button
                key={cat.key}
                onClick={() => { setActiveTab(cat.key); setSearchQuery(''); setEditingConfigId(null) }}
                className={`w-full text-left p-4 rounded-2xl border transition-all duration-300 ${active ? 'bg-accent-gold border-accent-gold text-black shadow-lg shadow-accent-gold/10 font-bold' : 'bg-hover border-border text-text-secondary hover:text-text-primary hover:bg-hover/80'}`}
              >
                <span className="text-sm block">{cat.label}</span>
                <span className={`text-[10px] block mt-1 leading-normal ${active ? 'text-black/75' : 'text-text-muted'}`}>{cat.desc}</span>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col gap-6">
          <GlassCard hoverEffect={false} className="flex flex-col gap-5">
            <div className="flex items-center justify-between flex-wrap gap-4 border-b border-border pb-4">
              <h2 className="text-xl font-extrabold font-clash text-text-primary">
                {CATEGORIES.find(c => c.key === activeTab)?.label} List
              </h2>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-hover rounded-xl border border-border text-xs w-56 focus-within:border-accent/40 transition-all">
                <Search className="w-3.5 h-3.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search values..."
                  className="bg-transparent focus:outline-none w-full placeholder:text-text-muted text-text-primary text-xs"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <form onSubmit={handleAdd} className="flex items-center gap-3">
              <input
                type="text"
                placeholder={`Add new ${CATEGORIES.find(c => c.key === activeTab)?.label.toLowerCase().slice(0, -1)} value...`}
                value={newValue}
                onChange={e => setNewValue(e.target.value)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border bg-hover text-xs text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent/40 transition-all font-sans"
              />
              <button
                type="submit"
                className="flex items-center gap-1 px-4 py-2.5 rounded-xl bg-accent-gold text-black hover:opacity-90 transition-all text-xs font-black uppercase tracking-wider"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </form>

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
                      className={`p-4 rounded-xl border border-border bg-hover/30 flex items-center justify-between gap-4 group transition-all hover:bg-hover/50 ${!config.is_active ? 'opacity-40' : ''}`}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="cursor-grab text-text-muted group-hover:text-text-primary active:cursor-grabbing">
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
                            <button onClick={() => handleEditSave(config.id, config)} className="p-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setEditingConfigId(null)} className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-sm font-semibold truncate text-text-primary">{config.value}</span>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleToggleActive(config)}
                            title={config.is_active ? 'Deactivate' : 'Activate'}
                            className={`p-1.5 rounded-lg border transition-all ${config.is_active ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20' : 'bg-hover border-border text-text-muted hover:text-text-primary'}`}
                          >
                            {config.is_active ? <Power className="w-3.5 h-3.5" /> : <PowerOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => { setEditingConfigId(config.id); setEditValue(config.value) }}
                            className="p-1.5 rounded-lg bg-hover border border-border text-text-secondary hover:text-text-primary transition-all"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
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

          {activeConfigs.length > 0 && (
            <GlassCard hoverEffect={false} className="p-4 flex flex-col gap-3">
              <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block border-b border-border pb-1">
                Selected Audit Trail Summary
              </span>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {activeConfigs.slice(0, 4).map(c => (
                  <div key={c.id} className="p-3 rounded-xl bg-hover/20 border border-border flex flex-col gap-1.5">
                    <span className="font-bold text-accent-gold text-xs">{c.value}</span>
                    <div className="flex items-center gap-1.5 text-text-secondary">
                      <User className="w-3 h-3 text-text-muted" />
                      <span>Created By: <strong className="text-text-primary">{getProfileName(c.created_by)}</strong></span>
                    </div>
                    {c.updated_by && (
                      <div className="flex items-center gap-1.5 text-text-secondary">
                        <Clock className="w-3 h-3 text-text-muted" />
                        <span>Last Updated: <strong className="text-text-primary">{getProfileName(c.updated_by)}</strong> ({new Date(c.updated_at || '').toLocaleDateString()})</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  )
}

const AccessDeniedView: React.FC = () => {
  const navigate = useNavigate()
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <GlassCard hoverEffect={false} className="flex flex-col items-center justify-center py-20 text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
          <ShieldAlert className="w-8 h-8 text-red-400" />
        </div>
        <h3 className="text-2xl font-bold text-text-primary mb-2">🔒 Access Denied (403)</h3>
        <p className="text-text-secondary text-sm leading-relaxed mb-6">
          You don't have access to this configuration module. Only managers, QA leads, and administrators are authorized to manage master dropdown lists.
        </p>
        <button
          onClick={() => navigate(ROUTES.qaReport)}
          className="px-6 py-2.5 rounded-xl bg-hover border border-border text-xs font-extrabold uppercase tracking-wider text-text-secondary hover:text-text-primary transition-all"
        >
          Return to QA Weekly Report
        </button>
      </GlassCard>
    </div>
  )
}
