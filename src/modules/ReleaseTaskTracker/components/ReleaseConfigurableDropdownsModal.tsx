// src/modules/ReleaseTaskTracker/components/ReleaseConfigurableDropdownsModal.tsx
// Configuration UI for master dropdown lists (Task Status, Priority, Assigned To).
// Follows the same architecture and UI/UX as Support Issue Tracker.
// Permission-controlled: Requires 'can_configure_dropdowns' permission.

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Plus, Check, Trash2, Sliders, RefreshCw, ShieldAlert,
  Users, CheckSquare, Square
} from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { useAppStore } from '@/store/useAppStore'
import { useReleaseTrackerStore } from '../store'
import { syncReleaseAssigneesFromProfiles, generateUUID } from '../releaseTrackerService'
import type { ReleaseDropdownOption } from '../types'

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

export function ReleaseConfigurableDropdownsModal({ isOpen, onClose }: Props) {
  useBodyScrollLock(isOpen)
  const { toast } = useToast()
  const { user, profile } = useAppStore()
  const { can } = usePermissions()
  const canConfigure = can('release-tracker', 'can_configure_dropdowns')

  const { dropdownConfigs, updateDropdowns } = useReleaseTrackerStore()

  const [activeTab, setActiveTab] = useState<'task_status' | 'priority' | 'assigned_to'>('task_status')

  // Working copies of configurations
  const [statuses, setStatuses] = useState<ReleaseDropdownOption[]>(dropdownConfigs.task_status)
  const [priorities, setPriorities] = useState<ReleaseDropdownOption[]>(dropdownConfigs.priority)
  const [assignees, setAssignees] = useState<ReleaseDropdownOption[]>(dropdownConfigs.assigned_to)

  // New item inputs
  const [newLabel, setNewLabel] = useState('')
  const [newColor, setNewColor] = useState(PRESET_COLORS[0])
  const [syncingProfiles, setSyncingProfiles] = useState(false)
  const [saving, setSaving] = useState(false)

  // Re-sync when modal opens
  useEffect(() => {
    if (!isOpen) return
    setStatuses(dropdownConfigs.task_status)
    setPriorities(dropdownConfigs.priority)
    setAssignees(dropdownConfigs.assigned_to)
    setNewLabel('')
  }, [isOpen, dropdownConfigs])

  // Handle Add Item
  const handleAddItem = () => {
    if (!canConfigure) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You need "Configure Release Task Dropdowns" permission to add options.'
      })
      return
    }

    if (!newLabel.trim()) return
    const trimmed = newLabel.trim()

    if (activeTab === 'task_status') {
      if (statuses.some(s => s.value.toLowerCase() === trimmed.toLowerCase())) {
        toast({ variant: 'destructive', title: 'Duplicate', description: `"${trimmed}" already exists.` })
        return
      }
      const newItem: ReleaseDropdownOption = {
        id: `stat-${Date.now()}`,
        category: 'task_status',
        label: trimmed,
        value: trimmed,
        color: newColor,
        is_active: true,
        sort_order: statuses.length + 1
      }
      setStatuses([...statuses, newItem])
    } else if (activeTab === 'priority') {
      if (priorities.some(p => p.value.toLowerCase() === trimmed.toLowerCase())) {
        toast({ variant: 'destructive', title: 'Duplicate', description: `"${trimmed}" already exists.` })
        return
      }
      const newItem: ReleaseDropdownOption = {
        id: `prio-${Date.now()}`,
        category: 'priority',
        label: trimmed,
        value: trimmed,
        color: newColor,
        is_active: true,
        sort_order: priorities.length + 1
      }
      setPriorities([...priorities, newItem])
    } else {
      // Assigned To
      if (assignees.some(a => a.label.toLowerCase() === trimmed.toLowerCase())) {
        toast({ variant: 'destructive', title: 'Duplicate', description: `"${trimmed}" is already configured.` })
        return
      }
      const stableId = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const newItem: ReleaseDropdownOption = {
        id: stableId,
        category: 'assigned_to',
        label: trimmed,
        value: stableId, // Stable unique ID internally
        user_id: stableId,
        is_active: true,
        sort_order: assignees.length + 1
      }
      setAssignees([...assignees, newItem])
    }
    setNewLabel('')
  }

  // Handle Remove Item
  const handleRemoveItem = (id: string) => {
    if (!canConfigure) return
    if (activeTab === 'task_status') {
      setStatuses(statuses.filter(s => s.id !== id))
    } else if (activeTab === 'priority') {
      setPriorities(priorities.filter(p => p.id !== id))
    } else {
      setAssignees(assignees.filter(a => a.id !== id))
    }
  }

  // Handle Toggle Active
  const handleToggleActive = (id: string) => {
    if (!canConfigure) return
    if (activeTab === 'task_status') {
      setStatuses(statuses.map(s => s.id === id ? { ...s, is_active: !s.is_active } : s))
    } else if (activeTab === 'priority') {
      setPriorities(priorities.map(p => p.id === id ? { ...p, is_active: !p.is_active } : p))
    } else {
      setAssignees(assignees.map(a => a.id === id ? { ...a, is_active: !a.is_active } : a))
    }
  }

  // Sync Assignees from user profiles
  const handleSyncProfiles = async () => {
    if (!canConfigure) return
    setSyncingProfiles(true)
    try {
      const profileOptions = await syncReleaseAssigneesFromProfiles()
      const existingValues = new Set(assignees.map(a => a.value.toLowerCase()))
      const existingLabels = new Set(assignees.map(a => a.label.toLowerCase()))
      const newAdditions: ReleaseDropdownOption[] = []

      for (const p of profileOptions) {
        if (!existingValues.has(p.value.toLowerCase()) && !existingLabels.has(p.label.toLowerCase())) {
          newAdditions.push({
            ...p,
            sort_order: assignees.length + newAdditions.length + 1
          })
          existingValues.add(p.value.toLowerCase())
          existingLabels.add(p.label.toLowerCase())
        }
      }

      if (newAdditions.length > 0) {
        setAssignees([...assignees, ...newAdditions])
        toast({
          title: 'Employees Synchronized',
          description: `Added ${newAdditions.length} active team members from system profiles.`
        })
      } else {
        toast({
          title: 'Already Synchronized',
          description: 'All system profile users already exist in the Assigned To list.'
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
    if (!canConfigure) {
      toast({
        variant: 'destructive',
        title: 'Permission Denied',
        description: 'You need "Configure Release Task Dropdowns" permission to save changes.'
      })
      return
    }

    setSaving(true)
    try {
      const actorName =
        (profile?.full_name as string) ||
        (user?.user_metadata?.full_name as string) ||
        user?.email ||
        'QA Admin'

      await updateDropdowns(
        {
          task_status: statuses,
          priority: priorities,
          assigned_to: assignees
        },
        { name: actorName, id: user?.id }
      )

      toast({
        title: 'Configurations Saved',
        description: 'Release Task dropdowns (Statuses, Priorities, and Assigned To) updated successfully.'
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

  const currentList =
    activeTab === 'task_status'
      ? statuses
      : activeTab === 'priority'
      ? priorities
      : assignees

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
                  Configure Release Dropdowns
                </h3>
                <p className="text-xs text-text-muted">
                  Customizable master lists for Task Statuses, Priorities, and Assigned To employees
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

          {/* Permission Warning if read-only */}
          {!canConfigure && (
            <div className="mx-6 mt-4 p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-center gap-2.5 text-xs text-amber-300">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                Read-only mode. You need <strong>Configure Release Task Dropdowns</strong> permission to modify options.
              </span>
            </div>
          )}

          {/* Tab switch */}
          <div className="flex items-center gap-2 px-6 pt-4 pb-2 border-b border-white/5">
            <button
              type="button"
              onClick={() => setActiveTab('task_status')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'task_status'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/5'
              }`}
            >
              Task Status ({statuses.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('priority')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'priority'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/5'
              }`}
            >
              Priority ({priorities.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assigned_to')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'assigned_to'
                  ? 'bg-accent text-white shadow-xs'
                  : 'text-text-muted hover:text-text-primary hover:bg-white/5'
              }`}
            >
              Assigned To ({assignees.length})
            </button>
          </div>

          {/* Content Body */}
          <div className="overflow-y-auto space-y-4 px-6 py-4 flex-1">
            {/* Add New Option Input Box */}
            <div className="p-3.5 rounded-xl bg-surface border border-white/10 space-y-2.5">
              <span className="text-xs font-semibold text-text-primary block">
                Add New {activeTab === 'task_status' ? 'Status' : activeTab === 'priority' ? 'Priority' : 'Employee'}
              </span>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                  disabled={!canConfigure}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddItem()
                    }
                  }}
                  placeholder={
                    activeTab === 'task_status'
                      ? 'e.g. In Security Audit'
                      : activeTab === 'priority'
                      ? 'e.g. Blocker'
                      : 'e.g. Ameen SR'
                  }
                  className="flex-1 h-9 bg-surface-elevated border border-white/15 rounded-lg px-3 text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-50"
                />

                {activeTab !== 'assigned_to' && (
                  <div className="flex items-center gap-1">
                    {PRESET_COLORS.slice(0, 5).map((c) => (
                      <button
                        key={c}
                        type="button"
                        disabled={!canConfigure}
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
                  disabled={!canConfigure || !newLabel.trim()}
                  className="h-9 px-3.5 rounded-lg bg-accent hover:bg-accent-hover text-white text-xs font-bold transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add
                </button>
              </div>

              {activeTab === 'assigned_to' && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                  <span className="text-[11px] text-text-muted">
                    Pull registered employees and testers from user profiles
                  </span>
                  <button
                    type="button"
                    onClick={handleSyncProfiles}
                    disabled={!canConfigure || syncingProfiles}
                    className="text-xs font-semibold text-accent hover:underline flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${syncingProfiles ? 'animate-spin' : ''}`} />
                    Sync from Team Profiles
                  </button>
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-text-muted block">
                Configured Options ({currentList.length})
              </span>

              <div className="divide-y divide-white/5 border border-white/10 rounded-xl overflow-hidden bg-surface">
                {currentList.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 flex items-center justify-between text-xs hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {/* Checkbox icon for assigned_to (Requirement 12: ☑ Ameen, ☑ Rahul, ☐ John) */}
                      {activeTab === 'assigned_to' ? (
                        <button
                          type="button"
                          disabled={!canConfigure}
                          onClick={() => handleToggleActive(item.id)}
                          className="text-text-muted hover:text-accent transition-colors disabled:cursor-not-allowed"
                          title={item.is_active ? 'Click to disable' : 'Click to enable'}
                        >
                          {item.is_active ? (
                            <CheckSquare className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Square className="w-4 h-4 text-zinc-500" />
                          )}
                        </button>
                      ) : (
                        item.color && (
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: item.color }}
                          />
                        )
                      )}

                      <div className="flex flex-col">
                        <span className={`font-semibold ${item.is_active ? 'text-text-primary' : 'text-text-muted line-through'}`}>
                          {item.label}
                        </span>
                        {activeTab === 'assigned_to' && item.value && (
                          <span className="text-[10px] text-text-muted font-mono">
                            ID: {item.value}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={!canConfigure}
                        onClick={() => handleToggleActive(item.id)}
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-colors cursor-pointer disabled:cursor-not-allowed ${
                          item.is_active
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20'
                        }`}
                      >
                        {item.is_active ? 'Active' : 'Disabled'}
                      </button>

                      <button
                        type="button"
                        disabled={!canConfigure}
                        onClick={() => handleRemoveItem(item.id)}
                        className="p-1 text-text-muted hover:text-rose-400 transition-colors disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
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
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={!canConfigure || saving}
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
