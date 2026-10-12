// src/modules/ProjectHub/components/ProjectDropdownConfig.tsx
// Centralized dropdown configuration page for a specific project.
// Accessible at /project-hub/:projectId/dropdown-config
//
// 4 centralized categories:
//   STATUS        → Testing Status, Retesting Status, Task Status, QA Report Testing Status
//   QA ENGINEERS  → QA Engineers (Testers), Assigned To (QA Engineers)
//   PRIORITY      → Release Tracker Priority, QA Report Priority
//   IS QA MISS?   → Is QA Miss? (independent)
//
// /daily-report is NOT connected here.

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Plus, Edit2, Trash2, Check, X, Settings2, Loader2, Info
} from 'lucide-react'
import { GlassCard } from '@/components/ui/GlassCard'
import { CinematicHeading } from '@/components/ui/CinematicHeading'
import { useToast } from '@/hooks/use-toast'
import { usePermissions } from '@/hooks/usePermissions'
import { useConfirm } from '@/components/ui/ConfirmDialog'
import { fetchProjectById } from '../projectService'
import {
  fetchProjectDropdownConfigs,
  addProjectDropdownOption,
  updateProjectDropdownOption,
  deleteProjectDropdownOption,
  CATEGORY_LABELS,
  CATEGORY_DESCRIPTIONS,
  CATEGORY_GROUPS,
} from '../projectDropdownService'
import type { ProjectDropdownOption, ProjectDropdownCategory } from '../projectDropdownService'
import type { ProjectWithMembers } from '../types'
import { ROUTES } from '@/lib/routes'

const CATEGORY_ICONS: Record<ProjectDropdownCategory, string> = {
  status:       '🔵',
  qa_engineers: '👤',
  priority:     '🔴',
  is_qa_miss:   '❓',
}

export function ProjectDropdownConfig() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { can, permissionsLoaded } = usePermissions()
  const confirm = useConfirm()

  const [project, setProject] = useState<ProjectWithMembers | null>(null)
  const [options, setOptions] = useState<ProjectDropdownOption[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<ProjectDropdownCategory>('status')

  const [newValue, setNewValue] = useState('')
  const [newColor, setNewColor] = useState('')
  const [adding, setAdding] = useState(false)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState('')
  const [editColor, setEditColor] = useState('')
  const [saving, setSaving] = useState(false)

  const canConfigure = can('project-hub', 'can_manage_dropdown_config')

  const load = useCallback(async () => {
    if (!projectId) return
    try {
      setLoading(true)
      const [proj, opts] = await Promise.all([
        fetchProjectById(projectId),
        fetchProjectDropdownConfigs(projectId),
      ])
      setProject(proj)
      setOptions(opts)
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err?.message || 'Failed to load configuration' })
    } finally {
      setLoading(false)
    }
  }, [projectId])

  useEffect(() => { load() }, [load])

  const activeOptions = options
    .filter(o => o.category === activeCategory)
    .sort((a, b) => a.sort_order - b.sort_order)

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId || !newValue.trim()) return
    setAdding(true)
    try {
      const added = await addProjectDropdownOption(projectId, activeCategory, newValue.trim(), newColor || undefined)
      setOptions(prev => [...prev, added])
      setNewValue('')
      setNewColor('')
      toast({ variant: 'success', title: 'Added', description: `"${added.label}" added to ${CATEGORY_LABELS[activeCategory]}.` })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to Add', description: err?.message || 'Error adding value' })
    } finally {
      setAdding(false)
    }
  }

  const handleEditSave = async (opt: ProjectDropdownOption) => {
    if (!editValue.trim()) return
    setSaving(true)
    try {
      const updated = await updateProjectDropdownOption(opt.id, opt.project_id, {
        label: editValue.trim(),
        color: editColor || null,
      })
      setOptions(prev => prev.map(o => o.id === updated.id ? updated : o))
      setEditingId(null)
      toast({ variant: 'success', title: 'Updated', description: `"${updated.label}" updated.` })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to Update', description: err?.message || 'Error updating value' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (opt: ProjectDropdownOption) => {
    try {
      const updated = await updateProjectDropdownOption(opt.id, opt.project_id, { is_active: !opt.is_active })
      setOptions(prev => prev.map(o => o.id === updated.id ? updated : o))
      toast({ variant: 'success', title: updated.is_active ? 'Activated' : 'Deactivated', description: `"${updated.label}" ${updated.is_active ? 'activated' : 'deactivated'}.` })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Error', description: err?.message || 'Failed to update status' })
    }
  }

  const handleDelete = async (opt: ProjectDropdownOption) => {
    if (!await confirm({
      title: `Delete "${opt.label}"?`,
      description: 'This removes the value from the dropdown. Existing records using this value are not affected.',
      confirmLabel: 'Delete',
    })) return
    try {
      await deleteProjectDropdownOption(opt.id)
      setOptions(prev => prev.filter(o => o.id !== opt.id))
      toast({ variant: 'success', title: 'Deleted', description: `"${opt.label}" removed.` })
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Failed to Delete', description: err?.message || 'Error deleting value' })
    }
  }

  if (!permissionsLoaded) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-accent-gold" />
      </div>
    )
  }

  if (!canConfigure) {
    navigate(ROUTES.qalyAiEngine401, { replace: true })
    return null
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-6 h-6 animate-spin text-accent-gold" />
      </div>
    )
  }

  return (
    <div className="space-y-8 pb-8">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <button
          onClick={() => navigate(`${ROUTES.projectHub}/${projectId}`)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--hover)] transition-all text-sm font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Project
        </button>
        <div>
          <CinematicHeading
            title="Dropdown Configuration"
            subtitle={project ? `Managing centralized dropdown values for ${project.name}` : 'Loading…'}
            align="left"
          />
        </div>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-3 px-4 py-3 rounded-xl border border-accent-gold/20 bg-accent-gold/5">
        <Info className="w-4 h-4 text-accent-gold mt-0.5 flex-shrink-0" />
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          Configure once here — values are automatically shared across <strong className="text-[var(--text-primary)]">Support Tracker</strong>, <strong className="text-[var(--text-primary)]">Release Tracker</strong>, and <strong className="text-[var(--text-primary)]">QA Report</strong> for this project.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">
        {/* Left: Category Selector */}
        <div className="flex flex-col gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)] px-1 mb-1">
            Categories
          </p>
          {CATEGORY_GROUPS[0].categories.map(cat => {
            const count = options.filter(o => o.category === cat).length
            const isActive = activeCategory === cat
            return (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`w-full text-left px-4 py-3.5 rounded-xl border transition-all flex items-start gap-3 ${
                  isActive
                    ? 'bg-accent-gold/10 border-accent-gold/30 text-accent-gold'
                    : 'border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover)] hover:border-[var(--border)]'
                }`}
              >
                <span className="text-base mt-0.5">{CATEGORY_ICONS[cat]}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`text-sm font-bold ${isActive ? 'text-accent-gold' : ''}`}>
                      {CATEGORY_LABELS[cat]}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold flex-shrink-0 ${
                      isActive ? 'bg-accent-gold/20 text-accent-gold' : 'bg-[var(--hover)] text-[var(--text-muted)]'
                    }`}>
                      {count}
                    </span>
                  </div>
                  <p className={`text-[10px] mt-0.5 leading-relaxed ${isActive ? 'text-accent-gold/70' : 'text-[var(--text-muted)]'}`}>
                    {CATEGORY_DESCRIPTIONS[cat]}
                  </p>
                </div>
              </button>
            )
          })}
        </div>

        {/* Right: Values Editor */}
        <GlassCard hoverEffect={false} className="flex flex-col gap-6">
          <div className="flex items-center gap-3 border-b border-[var(--border)] pb-4">
            <span className="text-2xl">{CATEGORY_ICONS[activeCategory]}</span>
            <div>
              <h2 className="text-lg font-extrabold font-clash text-[var(--text-primary)]">
                {CATEGORY_LABELS[activeCategory]}
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                {CATEGORY_DESCRIPTIONS[activeCategory]}
              </p>
            </div>
          </div>

          {/* Add new value */}
          <form onSubmit={handleAdd} className="flex items-center gap-3">
            <input
              type="text"
              placeholder={`Add new ${CATEGORY_LABELS[activeCategory].toLowerCase()} value…`}
              value={newValue}
              onChange={e => setNewValue(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--hover)] text-xs text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-accent-gold/40 transition-all"
            />
            {activeCategory !== 'qa_engineers' && activeCategory !== 'is_qa_miss' && (
              <input
                type="color"
                value={newColor || '#6366f1'}
                onChange={e => setNewColor(e.target.value)}
                title="Pick a color (optional)"
                className="w-9 h-9 rounded-lg border border-[var(--border)] cursor-pointer bg-transparent"
              />
            )}
            <button
              type="submit"
              disabled={adding || !newValue.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-accent-gold text-black hover:opacity-90 transition-all text-xs font-black uppercase tracking-wider disabled:opacity-50"
            >
              {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              Add
            </button>
          </form>

          {/* Values list */}
          <div className="flex flex-col gap-2">
            {activeOptions.length === 0 && (
              <div className="py-12 text-center text-[var(--text-muted)] text-xs italic">
                No values configured. Add one above.
              </div>
            )}
            {activeOptions.map(opt => {
              const isEditing = editingId === opt.id
              return (
                <div
                  key={opt.id}
                  className={`p-4 rounded-xl border border-[var(--border)] bg-[var(--hover)]/30 flex items-center justify-between gap-4 transition-all hover:bg-[var(--hover)]/50 ${!opt.is_active ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {opt.color && (
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ background: opt.color }}
                      />
                    )}
                    {isEditing ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          className="flex-1 px-3 py-1.5 rounded-lg border border-accent-gold bg-black/40 text-xs text-white focus:outline-none"
                          autoFocus
                        />
                        {activeCategory !== 'qa_engineers' && activeCategory !== 'is_qa_miss' && (
                          <input
                            type="color"
                            value={editColor || '#6366f1'}
                            onChange={e => setEditColor(e.target.value)}
                            className="w-7 h-7 rounded border border-[var(--border)] cursor-pointer bg-transparent"
                          />
                        )}
                        <button
                          onClick={() => handleEditSave(opt)}
                          disabled={saving}
                          className="p-1.5 rounded-lg bg-green-500/10 text-green-400 border border-green-500/20 hover:bg-green-500/20"
                        >
                          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <span className="text-sm font-semibold truncate text-[var(--text-primary)]">
                        {opt.label}
                      </span>
                    )}
                  </div>

                  {!isEditing && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleToggleActive(opt)}
                        title={opt.is_active ? 'Deactivate' : 'Activate'}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-bold transition-all ${
                          opt.is_active
                            ? 'bg-green-500/10 border-green-500/20 text-green-400 hover:bg-green-500/20'
                            : 'bg-[var(--hover)] border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {opt.is_active ? 'Active' : 'Inactive'}
                      </button>
                      <button
                        onClick={() => { setEditingId(opt.id); setEditValue(opt.label); setEditColor(opt.color || '') }}
                        className="p-1.5 rounded-lg bg-[var(--hover)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(opt)}
                        className="p-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {activeOptions.length > 0 && (
            <p className="text-[11px] text-[var(--text-muted)]">
              {activeOptions.filter(o => o.is_active).length} active · {activeOptions.filter(o => !o.is_active).length} inactive
            </p>
          )}
        </GlassCard>
      </div>
    </div>
  )
}
