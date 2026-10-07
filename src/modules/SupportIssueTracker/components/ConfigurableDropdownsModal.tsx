// src/modules/SupportIssueTracker/components/ConfigurableDropdownsModal.tsx
// Configuration UI for master dropdown lists (Testing Status, Testers).
// Permission-controlled: Requires 'can_configure_dropdowns' permission.

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Plus, Check, Trash2, Edit2, RotateCcw, Users, Sliders,
  RefreshCw, Palette, ShieldAlert
} from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useSupportTrackerStore } from '../store'
import { syncTestersFromUserProfiles } from '../supportTrackerService'
import type { SupportDropdownOption } from '../types'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const PRESET_COLORS = [
  '#94a3b8', // slate
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#ef4444', // red
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#6b7280', // gray
  '#ec4899', // pink
  '#6366f1'  // indigo
]

export function ConfigurableDropdownsModal({ isOpen, onClose }: Props) {
  useBodyScrollLock(isOpen)
  const { toast } = useToast()
  const { dropdownConfigs, updateDropdowns } = useSupportTrackerStore()

  const [activeTab, setActiveTab] = useState<'testing_status' | 'testers'>('testing_status')

  // Working copy of configurations
  const [statuses, setStatuses] = useState<SupportDropdownOption[]>(dropdownConfigs.testing_status)
  const [testers, setTesters] = useState<SupportDropdownOption[]>(dropdownConfigs.testers)

  // New item inputs
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [syncingProfiles, setSyncingProfiles] = useState(false)
  const [saving, setSaving] = useState(false)

  // Re-sync when modal opens
  React.useEffect(() => {
    setStatuses(dropdownConfigs.testing_status)
    setTesters(
      dropdownConfigs.testers.map(t => ({
        ...t,
        label: t.label.toUpperCase(),
        value: t.value.toUpperCase()
      }))
    )
    setNewLabel('')
  }, [isOpen, dropdownConfigs])

  // Handle Add Item
  const handleAddItem = () => {
    if (!newLabel.trim()) return

    if (activeTab === 'testing_status') {
      const trimmedLabel = newLabel.trim()
      const newItem: SupportDropdownOption = {
        id: `ts-${Date.now()}`,
        category: 'testing_status',
        label: trimmedLabel,
        value: trimmedLabel,
        color: newColor,
        is_active: true,
        sort_order: statuses.length + 1
      }
      setStatuses([...statuses, newItem])
    } else {
      // Tester names must ALWAYS be in FULL CAPITAL for uniformity
      const cleanUpperName = newLabel.trim().toUpperCase()
      const newItem: SupportDropdownOption = {
        id: `tester-${Date.now()}`,
        category: 'tester',
        label: cleanUpperName,
        value: cleanUpperName,
        is_active: true,
        sort_order: testers.length + 1
      }
      setTesters([...testers, newItem])
    }
    setNewLabel('')
  }

  // Handle Remove Item
  const handleRemoveItem = (id: string) => {
    if (activeTab === 'testing_status') {
      setStatuses(statuses.filter(s => s.id !== id))
    } else {
      setTesters(testers.filter(t => t.id !== id))
    }
  }

  // Handle Toggle Active
  const handleToggleActive = (id: string) => {
    if (activeTab === 'testing_status') {
      setStatuses(statuses.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s))
    } else {
      setTesters(testers.map(t => t.id === id ? { ...t, is_active: !t.is_active } : t))
    }
  }

  // Sync testers with profiles
  const handleSyncProfiles = async () => {
    setSyncingProfiles(true)
    try {
      const profileNames = await syncTestersFromUserProfiles()
      const existingTesterNames = new Set(testers.map(t => t.value.toUpperCase()))
      const newAdditions: SupportDropdownOption[] = []

      for (const name of profileNames) {
        const upperName = name.trim().toUpperCase()
        if (!existingTesterNames.has(upperName)) {
          newAdditions.push({
            id: `tester-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
            category: 'tester',
            label: upperName,
            value: upperName,
            is_active: true,
            sort_order: testers.length + newAdditions.length + 1
          })
          existingTesterNames.add(upperName)
        }
      }

      if (newAdditions.length > 0) {
        setTesters([...testers, ...newAdditions])
        toast({
          title: 'Testers Synchronized',
          description: `Added ${newAdditions.length} active users in ALL CAPS from system profiles.`
        })
      } else {
        toast({
          title: 'Testers Up-to-date',
          description: 'All system profile users already exist in the tester list.'
        })
      }
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Sync Failed',
        description: err.message || 'Could not sync profiles'
      })
    } finally {
      setSyncingProfiles(false)
    }
  }

  // Save changes
  const handleSaveAll = async () => {
    setSaving(true)
    try {
      const currentUser = { name: 'Ameen SR' }
      const normalizedTesters = testers.map(t => ({
        ...t,
        label: t.label.trim().toUpperCase(),
        value: t.value.trim().toUpperCase()
      }))
      await updateDropdowns(
        {
          testing_status: statuses,
          testers: normalizedTesters
        },
        currentUser
      )

      toast({
        title: 'Configurations Saved',
        description: 'Dropdown options and status lists updated successfully.'
      })
      onClose()
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error Saving Configurations',
        description: err.message || 'Failed saving dropdown options'
      })
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-hidden"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl bg-surface-elevated border border-white/15 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
          style={{ backgroundColor: 'var(--modal-bg, #141c2b)' }}
        >
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-white/10 flex items-center justify-between shrink-0 bg-surface/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    Configure Dropdowns
                  </h3>
                  <p className="text-xs text-text-muted">
                    Customizable master lists for testing statuses and tester employees
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Tab switch */}
            <div className="flex items-center gap-2 pt-4 pb-2 border-b border-white/5">
              <button
                type="button"
                onClick={() => setActiveTab('testing_status')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'testing_status'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                }`}
              >
                Testing Statuses ({statuses.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('testers')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'testers'
                    ? 'bg-accent text-white shadow-xs'
                    : 'text-text-muted hover:text-text-primary hover:bg-white/5'
                }`}
              >
                Who's Testing ({testers.length})
              </button>
            </div>

            {/* Content Body */}
            <div className="overflow-y-auto space-y-4 py-4 pr-1 flex-1">
              {/* Add New Option Input Box */}
              <div className="p-3.5 rounded-xl bg-surface border border-white/10 space-y-2.5">
                <span className="text-xs font-semibold text-text-primary block">
                  Add New {activeTab === 'testing_status' ? 'Status' : 'Tester'}
                </span>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newLabel}
                    onChange={(e) =>
                      setNewLabel(activeTab === 'testers' ? e.target.value.toUpperCase() : e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddItem()
                      }
                    }}
                    placeholder={
                      activeTab === 'testing_status'
                        ? 'e.g. In Security Review'
                        : 'e.g. JOHN DOE'
                    }
                    className={`flex-1 h-9 bg-surface-elevated border border-white/15 rounded-lg px-3 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent ${
                      activeTab === 'testers' ? 'uppercase font-mono tracking-wider' : ''
                    }`}
                  />

                  {activeTab === 'testing_status' && (
                    <div className="flex items-center gap-1">
                      {PRESET_COLORS.slice(0, 5).map((c) => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNewColor(c)}
                          className={`w-5 h-5 rounded-full border-2 transition-transform ${
                            newColor === c ? 'scale-110 border-white' : 'border-transparent opacity-70'
                          }`}
                          style={{ backgroundColor: c }}
                        />
                      ))}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleAddItem}
                    disabled={!newLabel.trim()}
                    className="h-9 px-3.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add
                  </button>
                </div>

                {activeTab === 'testers' && (
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                    <span className="text-[11px] text-text-muted">
                      Quickly pull active team members from company profiles
                    </span>
                    <button
                      type="button"
                      onClick={handleSyncProfiles}
                      disabled={syncingProfiles}
                      className="text-xs font-semibold text-accent hover:underline flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${syncingProfiles ? 'animate-spin' : ''}`} />
                      Sync from User Profiles
                    </button>
                  </div>
                )}
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-text-muted block">
                  Active Options ({activeTab === 'testing_status' ? statuses.length : testers.length})
                </span>

                <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-surface">
                  {(activeTab === 'testing_status' ? statuses : testers).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 flex items-center justify-between text-xs hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        {activeTab === 'testing_status' && item.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                        )}
                        <span className={`font-semibold ${item.is_active ? 'text-text-primary' : 'text-text-muted line-through'} ${activeTab === 'testers' ? 'uppercase font-mono tracking-wide' : ''}`}>
                          {activeTab === 'testers' ? item.label.toUpperCase() : item.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(item.id)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors ${
                            item.is_active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                          }`}
                        >
                          {item.is_active ? 'Active' : 'Disabled'}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          className="p-1 text-text-muted hover:text-rose-400 transition-colors"
                          title="Remove option"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-white/10 flex items-center justify-end gap-3 shrink-0 bg-surface/80 backdrop-blur-sm">
              <button
                type="button"
                onClick={onClose}
                disabled={saving}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAll}
                disabled={saving}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-accent hover:bg-accent-hover text-white transition-all shadow-md shadow-accent/20 flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Configuration'}
              </button>
            </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
