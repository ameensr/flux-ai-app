// src/modules/DailyUpdateReport/components/CustomizeColumnsDrawer.tsx
// Premium side drawer for configuring QA Daily Update table columns:
// rename, add custom columns, reorder, show/hide, required toggle,
// dropdown option management, org/project scope, live preview, and save actions.

import React, { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Plus, GripVertical, Eye, EyeOff, Trash2, Pencil, ChevronDown,
  Info, Building2, FolderKanban, RotateCcw, Save, ShieldCheck, Sparkles,
  AlertTriangle, Copy,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { usePermissions } from '@/hooks/usePermissions'
import {
  useColumnConfigStore, generateInternalKey, generateOptionId, isOptionBasedType, normalizeColumnDisplayName,
} from '../columnConfigStore'
import type { ColumnConfig, ColumnType, DailyReportTableKey, DropdownOptionItem } from '../types'
import { COLUMN_TYPE_LABELS } from '../types'

interface CustomizeColumnsDrawerProps {
  open: boolean
  onClose: () => void
  tableKey: DailyReportTableKey
  projectId: string
  projectName?: string
  onSaved?: () => void
}

const COLUMN_TYPES: ColumnType[] = [
  'short_text', 'long_text', 'number', 'percentage', 'date', 'datetime',
  'dropdown', 'multiselect', 'status', 'boolean', 'user', 'url',
]

function cloneDraft(columns: ColumnConfig[]): ColumnConfig[] {
  return columns.map(c => ({ ...c, dropdown_options: c.dropdown_options.map(o => ({ ...o })) }))
}

// Normalizes every option's display label to FULL CAPS (same rule as
// normalizeColumnDisplayName for column names, for uniform presentation),
// and collapses options that become identical after normalization — e.g.
// "New" and "new" typed as two separate options both become "NEW", so only
// the first occurrence is kept (preserving its original sort position).
function dedupeNormalizedOptions(options: DropdownOptionItem[]): DropdownOptionItem[] {
  const seen = new Set<string>()
  const result: DropdownOptionItem[] = []
  let order = 1
  for (const opt of options) {
    const normalizedLabel = normalizeColumnDisplayName(opt.label)
    if (!normalizedLabel || seen.has(normalizedLabel)) continue
    seen.add(normalizedLabel)
    result.push({ ...opt, label: normalizedLabel, sort_order: order++ })
  }
  return result
}

function sampleValueForColumn(col: ColumnConfig, rowIdx: number): string {
  switch (col.column_type) {
    case 'short_text': return ['REL-1042', 'REL-1043', 'REL-1044'][rowIdx] || 'Sample text'
    case 'long_text': return 'Short sample description of the work item...'
    case 'number': return String(3 + rowIdx)
    case 'percentage': return `${70 + rowIdx * 10}%`
    case 'date': return new Date(Date.now() + rowIdx * 86400000).toISOString().split('T')[0]
    case 'datetime': return new Date(Date.now() + rowIdx * 3600000).toLocaleString()
    case 'dropdown':
    case 'status': {
      const opts = col.dropdown_options
      return opts.length ? opts[rowIdx % opts.length].label : '—'
    }
    case 'multiselect': {
      const opts = col.dropdown_options
      if (!opts.length) return '—'
      return opts.slice(0, 2).map(o => o.label).join(', ')
    }
    case 'boolean': return rowIdx % 2 === 0 ? 'Yes' : 'No'
    case 'user': return ['Sarah Jenkins', 'Michael Ross', 'Emily Taylor'][rowIdx] || 'Team Member'
    case 'url': return 'https://example.com/ticket'
    default: return '—'
  }
}

export const CustomizeColumnsDrawer: React.FC<CustomizeColumnsDrawerProps> = ({
  open, onClose, tableKey, projectId, projectName, onSaved,
}) => {
  useBodyScrollLock(open)
  const { toast } = useToast()
  const { can } = usePermissions()
  const {
    getColumns, getScope, saveColumns, deleteColumn, fetchColumnConfigs, fetchScopedColumns,
    resetToOrgDefault, saveAsProjectTemplate,
  } = useColumnConfigStore()

  const canManageColumns = can('daily-report', 'can_manage_columns')
  const canAddColumns = can('daily-report', 'can_add_columns')
  const canRenameColumns = can('daily-report', 'can_rename_columns')
  const canReorderColumns = can('daily-report', 'can_reorder_columns')
  const canHideShowColumns = can('daily-report', 'can_hide_show_columns')
  const canDeleteCustomColumns = can('daily-report', 'can_delete_custom_columns')
  const canManageOrgConfig = can('daily-report', 'can_manage_org_config')
  const canManageProjectConfig = can('daily-report', 'can_manage_project_config')

  const currentScope = getScope(tableKey)

  const [draft, setDraft] = useState<ColumnConfig[]>([])
  const [pendingDeletes, setPendingDeletes] = useState<string[]>([])
  const [applyScope, setApplyScope] = useState<'organization' | 'project'>('project')
  // Full "Edit Column" panel state — mirrors the Add New Column form so
  // editing a column exposes every configurable setting (type, description,
  // placeholder, default value, required/visibility/report/export toggles,
  // and dropdown options), not just the display name.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<ColumnConfig | null>(null)
  const [editOptionLabel, setEditOptionLabel] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<ColumnConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState(false)
  const [draftLoading, setDraftLoading] = useState(false)
  // Whether the currently loaded draft is this project's OWN saved
  // configuration, vs. the project having none yet (empty canvas) or the
  // Organization Default scope being viewed/edited directly.
  const [isEmptyProjectSlate, setIsEmptyProjectSlate] = useState(false)

  const [newCol, setNewCol] = useState<Partial<ColumnConfig>>({
    display_name: '',
    column_type: 'short_text',
    description: '',
    placeholder: '',
    is_required: false,
    is_visible: true,
    include_in_qa_report: true,
    include_in_export: true,
    default_value: '',
    dropdown_options: [],
  })
  const [newOptionLabel, setNewOptionLabel] = useState('')

  // Loads the draft for a given scope with NO cross-scope fallback merging:
  // - "project" scope shows ONLY this project's own saved columns. If the
  //   project has never been configured, this is an intentionally EMPTY
  //   list — a clean canvas — instead of silently inheriting/displaying the
  //   Organization Default's columns. This only affects what's shown in the
  //   editor draft; nothing is deleted or persisted until Save Configuration
  //   is clicked, so the live /daily-report table (which still resolves
  //   Project → Organization Default via getColumns) is completely
  //   unaffected until the user explicitly saves.
  // - "organization" scope shows the org default columns (with the usual
  //   hardcoded-fallback safety net if the DB has none).
  const loadDraftForScope = async (scope: 'organization' | 'project') => {
    setDraftLoading(true)
    try {
      const cols = scope === 'project' && projectId
        ? await fetchScopedColumns(tableKey, projectId)
        : await fetchScopedColumns(tableKey, null)
      setDraft(cloneDraft(cols))
      setIsEmptyProjectSlate(scope === 'project' && cols.length === 0)
    } finally {
      setDraftLoading(false)
    }
  }

  // Clones the Organization Default column set into the current PROJECT
  // draft as independently-editable rows. Nothing is persisted until Save
  // Configuration.
  //
  // ⚠️ id reuse is critical here. If this project ALREADY has its own saved
  // columns (e.g. from a previous clone+save), and every cloned row got a
  // brand-new random id, then clicking Save Configuration would try to
  // INSERT rows whose (project_id, table_key, internal_key) already exists
  // on a DIFFERENT row — violating the uq_column_configs_project unique
  // index. Postgres fails that INSERT/upsert as a single atomic statement,
  // so the *entire* save (including any column deletions queued in the same
  // save) silently rolled back with no visible change — which is exactly
  // what made previously-cloned columns look impossible to delete: the
  // delete was queued correctly, but the save that would persist it never
  // succeeded. To prevent this, any internal_key that already has a row in
  // this project reuses that row's id (turning Save into an UPDATE instead
  // of a colliding INSERT).
  const handleCloneFromOrgDefault = async () => {
    if (applyScope !== 'project' || !projectId) return
    if (draft.length > 0) {
      const proceed = confirm('This will replace the current draft with a fresh copy of the Organization Default columns. Any unsaved changes in this draft will be lost. Continue?')
      if (!proceed) return
    }
    setDraftLoading(true)
    try {
      // Prefer DB rows for id reuse — draft may have already removed columns
      // queued in pendingDeletes, which would otherwise mint new UUIDs and
      // collide on save with the still-present DB rows.
      const existingProjectCols = await fetchScopedColumns(tableKey, projectId)
      const existingIdByInternalKey = new Map(
        existingProjectCols
          .filter(c => !c.id.startsWith('fallback-'))
          .map(c => [c.internal_key, c.id]),
      )

      const orgCols = await fetchScopedColumns(tableKey, null)
      const orgInternalKeys = new Set(orgCols.map(c => c.internal_key))

      const cloned = orgCols.map((c, i) => ({
        ...c,
        id: existingIdByInternalKey.get(c.internal_key) ?? crypto.randomUUID(),
        project_id: projectId,
        is_system: false, // cloned copies are independent, fully editable custom columns — not linked to org "system" protection
        display_order: i + 1,
        dropdown_options: c.dropdown_options.map(o => ({ ...o, id: generateOptionId() })),
      }))

      // Drop project-only custom columns that aren't in org default, AND keep
      // any previously queued deletes that aren't being reused as cloned ids.
      const orphanedCustomIds = existingProjectCols
        .filter(c => !c.id.startsWith('fallback-') && !orgInternalKeys.has(c.internal_key))
        .map(c => c.id)
      const clonedIds = new Set(cloned.map(c => c.id))
      const stillPending = pendingDeletes.filter(id => !clonedIds.has(id))

      setDraft(cloned)
      setIsEmptyProjectSlate(false)
      setPendingDeletes([...new Set([...orphanedCustomIds, ...stillPending])])
      toast({
        variant: 'success',
        title: 'Cloned from Organization Default',
        description: `${cloned.length} column${cloned.length === 1 ? '' : 's'} copied into this project's draft. Edit anything below, then click Save Configuration to make it this project's own configuration.`,
      })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Clone failed', description: e?.message || 'Could not clone the Organization Default columns.' })
    } finally {
      setDraftLoading(false)
    }
  }

  const handleScopeChange = (scope: 'organization' | 'project') => {
    if (scope === applyScope) return
    // Discard queued deletes when switching scope — they belong to the
    // previous draft and must not delete rows during the other scope's save.
    setPendingDeletes([])
    setApplyScope(scope)
    setEditingId(null)
    setShowAddForm(false)
    setConfirmDelete(null)
    setSavedMessage(false)
    loadDraftForScope(scope)
  }

  // Initialize the working draft whenever the drawer is opened
  useEffect(() => {
    if (open) {
      const initialScope: 'organization' | 'project' = projectId ? 'project' : 'organization'
      setApplyScope(initialScope)
      setPendingDeletes([])
      setEditingId(null)
      setShowAddForm(false)
      setConfirmDelete(null)
      setSavedMessage(false)
      resetNewColForm()
      loadDraftForScope(initialScope)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, tableKey, projectId])

  const resetNewColForm = () => {
    setNewCol({
      display_name: '', column_type: 'short_text', description: '', placeholder: '',
      is_required: false, is_visible: true, include_in_qa_report: true, include_in_export: true,
      default_value: '', dropdown_options: [],
    })
    setNewOptionLabel('')
  }

  const tableLabel = tableKey === 'support' ? 'Support & Exception Log' : 'Release Testing Log'

  const existingKeys = useMemo(() => draft.map(c => c.internal_key), [draft])

  // ── Edit Column (full panel, mirrors Add New Column) ───────────────────────
  const startEdit = (col: ColumnConfig) => {
    setShowAddForm(false)
    setConfirmDelete(null)
    setEditingId(col.id)
    setEditDraft({ ...col, dropdown_options: col.dropdown_options.map(o => ({ ...o })) })
    setEditOptionLabel('')
  }
  const cancelEdit = () => {
    setEditingId(null)
    setEditDraft(null)
    setEditOptionLabel('')
  }
  const updateEditDraft = (patch: Partial<ColumnConfig>) =>
    setEditDraft(prev => (prev ? { ...prev, ...patch } : prev))

  const addOptionToEditDraft = () => {
    if (!editOptionLabel.trim()) return
    setEditDraft(prev => prev
      ? { ...prev, dropdown_options: [...prev.dropdown_options, { id: generateOptionId(), label: editOptionLabel.trim(), sort_order: prev.dropdown_options.length + 1 }] }
      : prev)
    setEditOptionLabel('')
  }
  const removeOptionFromEditDraft = (optId: string) => {
    setEditDraft(prev => prev ? { ...prev, dropdown_options: prev.dropdown_options.filter(o => o.id !== optId) } : prev)
  }
  // Kept as a live, un-normalized onChange handler (raw typed value) so
  // users can freely type multi-word labels including trailing spaces
  // between words — normalizing to uppercase on every keystroke here is
  // harmless, but re-trimming on every keystroke would strip a trailing
  // space the moment it's typed, making it impossible to type a second
  // word. All dropdown option labels are normalized to FULL CAPS once, at
  // the final commit point in handleSaveEditColumn / handleAddColumn below.
  const renameEditOption = (optId: string, label: string) => {
    setEditDraft(prev => prev ? { ...prev, dropdown_options: prev.dropdown_options.map(o => o.id === optId ? { ...o, label } : o) } : prev)
  }
  const moveEditOption = (optIdx: number, dir: -1 | 1) => {
    setEditDraft(prev => {
      if (!prev) return prev
      const opts = [...prev.dropdown_options]
      const target = optIdx + dir
      if (target < 0 || target >= opts.length) return prev
      const [removed] = opts.splice(optIdx, 1)
      opts.splice(target, 0, removed)
      return { ...prev, dropdown_options: opts.map((o, i) => ({ ...o, sort_order: i + 1 })) }
    })
  }

  const handleSaveEditColumn = () => {
    if (!editDraft || !editingId) return
    if (!editDraft.display_name.trim()) {
      toast({ variant: 'destructive', title: 'Column name required', description: 'Please enter a name for this column.' })
      return
    }
    // Normalize for uniform presentation regardless of how the user typed
    // it ("support id" / "Support Id" / "SUPPORT ID" all become "SUPPORT ID").
    const normalizedName = normalizeColumnDisplayName(editDraft.display_name)
    const dupName = draft.some(c => c.id !== editingId && normalizeColumnDisplayName(c.display_name) === normalizedName)
    if (dupName) {
      toast({ variant: 'destructive', title: 'Duplicate column name', description: 'Another column already uses this display name. Please choose a different name.' })
      return
    }
    if (isOptionBasedType(editDraft.column_type) && editDraft.dropdown_options.length === 0) {
      toast({ variant: 'destructive', title: 'Options required', description: `Add at least one option for a ${COLUMN_TYPE_LABELS[editDraft.column_type]} column.` })
      return
    }

    // Warn (but don't silently block) if the column type is changing on a
    // column that isn't brand new — a type change can invalidate or
    // misrepresent existing stored values (e.g. text -> number).
    const original = draft.find(c => c.id === editingId)
    if (original && original.column_type !== editDraft.column_type) {
      const proceed = confirm(
        `Changing the column type from "${COLUMN_TYPE_LABELS[original.column_type]}" to "${COLUMN_TYPE_LABELS[editDraft.column_type]}" may affect how existing values in this column are displayed, validated, or stored. Continue?`
      )
      if (!proceed) return
    }

    // Normalize every dropdown/multiselect/status option label to FULL CAPS
    // for uniformity, same rule as the column name above (now applies to
    // system columns too, since they manage their own options directly).
    // De-duplicate by normalized value so "New" and "NEW" typed separately
    // don't end up as two identical-looking options after normalization.
    const normalizedOptions = dedupeNormalizedOptions(editDraft.dropdown_options)

    const finalized: ColumnConfig = { ...editDraft, display_name: normalizedName, dropdown_options: normalizedOptions }
    setDraft(prev => prev.map(c => c.id === editingId ? finalized : c))
    cancelEdit()
    toast({ variant: 'success', title: 'Column updated', description: `"${finalized.display_name}" changes were applied to the draft. Click Save Configuration to persist them.` })
  }

  // ── Visibility / Required toggles ────────────────────────────────────────
  const toggleVisible = (id: string) =>
    setDraft(prev => prev.map(c => c.id === id ? { ...c, is_visible: !c.is_visible } : c))

  // Required is now only toggled from the full Edit Column panel (see
  // updateEditDraft / handleSaveEditColumn) — no standalone quick-toggle in
  // the row anymore, replaced by the Delete action.

  // ── Drag reorder ──────────────────────────────────────────────────────────
  const handleDragStart = (idx: number) => setDragIndex(idx)
  const handleDrop = (idx: number) => {
    if (dragIndex === null || dragIndex === idx) return
    setDraft(prev => {
      const next = [...prev]
      const [removed] = next.splice(dragIndex, 1)
      next.splice(idx, 0, removed)
      return next.map((c, i) => ({ ...c, display_order: i + 1 }))
    })
    setDragIndex(null)
  }

  // ── Delete (custom columns only) ─────────────────────────────────────────
  const requestDelete = (col: ColumnConfig) => {
    if (col.is_system) return
    setConfirmDelete(col)
  }
  const confirmDeleteColumn = () => {
    if (!confirmDelete) return
    setDraft(prev => prev.filter(c => c.id !== confirmDelete.id))
    if (!confirmDelete.id.startsWith('fallback-')) {
      setPendingDeletes(prev => [...prev, confirmDelete.id])
    }
    setConfirmDelete(null)
  }

  // ── Add new column ───────────────────────────────────────────────────────
  const addOptionToNewCol = () => {
    if (!newOptionLabel.trim()) return
    setNewCol(prev => ({
      ...prev,
      dropdown_options: [...(prev.dropdown_options || []), { id: generateOptionId(), label: newOptionLabel.trim(), sort_order: (prev.dropdown_options?.length || 0) + 1 }],
    }))
    setNewOptionLabel('')
  }
  const removeOptionFromNewCol = (optId: string) => {
    setNewCol(prev => ({ ...prev, dropdown_options: (prev.dropdown_options || []).filter(o => o.id !== optId) }))
  }
  // Not normalized on individual add/rename keystrokes (see renameEditOption
  // comment above) — every option label across both the Add New Column form
  // and the Edit Column panel is normalized to FULL CAPS once, at the two
  // final commit points: handleAddColumn and handleSaveEditColumn.

  const handleAddColumn = () => {
    if (!newCol.display_name?.trim()) {
      toast({ variant: 'destructive', title: 'Column name required', description: 'Please enter a name for the new column.' })
      return
    }
    // Normalize for uniform presentation regardless of how the user typed
    // it ("support id" / "Support Id" / "SUPPORT ID" all become "SUPPORT ID"),
    // matching the all-caps style already used by system columns like
    // "SUPPORT ID". internal_key generation below is unaffected since it
    // already lowercases independently of this display label.
    const normalizedName = normalizeColumnDisplayName(newCol.display_name)
    // Prevent duplicate display names (soft validation per spec item 15)
    const dupName = draft.some(c => normalizeColumnDisplayName(c.display_name) === normalizedName)
    if (dupName) {
      toast({ variant: 'destructive', title: 'Duplicate column name', description: 'A column with this display name already exists. Please choose a different name.' })
      return
    }
    if (isOptionBasedType(newCol.column_type as ColumnType) && (!newCol.dropdown_options || newCol.dropdown_options.length === 0)) {
      toast({ variant: 'destructive', title: 'Options required', description: `Add at least one option for a ${COLUMN_TYPE_LABELS[newCol.column_type as ColumnType]} column.` })
      return
    }

    // Normalize every dropdown/multiselect/status option label to FULL CAPS
    // for uniformity, same rule as the column name above, and de-duplicate
    // by normalized value.
    const normalizedOptions = dedupeNormalizedOptions(newCol.dropdown_options || [])

    const internalKey = generateInternalKey(newCol.display_name, existingKeys)
    const column: ColumnConfig = {
      id: crypto.randomUUID(),
      project_id: applyScope === 'organization' ? null : projectId,
      table_key: tableKey,
      internal_key: internalKey,
      display_name: normalizedName,
      column_type: (newCol.column_type as ColumnType) || 'short_text',
      description: newCol.description || '',
      placeholder: newCol.placeholder || '',
      is_required: !!newCol.is_required,
      is_visible: newCol.is_visible !== false,
      is_system: false,
      include_in_qa_report: newCol.include_in_qa_report !== false,
      include_in_export: newCol.include_in_export !== false,
      default_value: newCol.default_value || '',
      dropdown_options: normalizedOptions,
      display_order: draft.length + 1,
    }

    setDraft(prev => [...prev, column])
    resetNewColForm()
    setShowAddForm(false)
    toast({ variant: 'success', title: 'Column added', description: `"${column.display_name}" was added to the draft. Click Save Configuration to apply it.` })
  }

  // ── Save / Cancel / Reset ────────────────────────────────────────────────
  const handleCancel = () => { onClose() }

  const handleResetToDefault = async () => {
    if (!projectId) return
    if (!confirm('Reset this project to the Organization Default column configuration? Any project-specific column customizations will be removed. Existing row data is not affected.')) return
    setSaving(true)
    try {
      await resetToOrgDefault(tableKey, projectId)
      setApplyScope('project')
      await loadDraftForScope('project') // project's own rows are now gone -> correctly shows the empty-slate state
      toast({ variant: 'success', title: 'Reset complete', description: 'This project now has no configuration of its own and will use the Organization Default until you save new project-specific columns.' })
      onSaved?.()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Reset failed', description: e?.message || 'Could not reset to default.' })
    } finally {
      setSaving(false)
    }
  }

  const persistDraft = async (targetScope: 'organization' | 'project') => {
    const targetProjectId = targetScope === 'organization' ? null : projectId

    // ⚠️ Deletions MUST be processed BEFORE the upsert below, not after.
    // Fail loudly if a delete is blocked — otherwise a later upsert can
    // collide on unique indexes and roll back the entire batch.
    for (const id of pendingDeletes) {
      await deleteColumn(id)
    }

    // For project scope, reuse existing DB ids by internal_key so we UPDATE
    // instead of INSERT-colliding when the draft was cloned from org.
    let existingByKey = new Map<string, string>()
    if (targetProjectId) {
      const existing = await fetchScopedColumns(tableKey, targetProjectId)
      existingByKey = new Map(
        existing
          .filter(c => !c.id.startsWith('fallback-'))
          .map(c => [c.internal_key, c.id]),
      )
    } else {
      const existing = await fetchScopedColumns(tableKey, null)
      existingByKey = new Map(
        existing
          .filter(c => !c.id.startsWith('fallback-'))
          .map(c => [c.internal_key, c.id]),
      )
    }

    const mapped = draft.map((c, i) => {
      const alreadyInTargetScope = c.project_id === targetProjectId && !c.id.startsWith('fallback-')
      const reusedId = alreadyInTargetScope
        ? c.id
        : (existingByKey.get(c.internal_key) ?? crypto.randomUUID())
      return {
        ...c,
        id: reusedId,
        project_id: targetProjectId,
        display_order: i + 1,
      }
    })

    // Remove leftover target-scope rows that are no longer in the draft
    const keepKeys = new Set(mapped.map(c => c.internal_key))
    for (const [key, id] of existingByKey) {
      if (!keepKeys.has(key) && !pendingDeletes.includes(id)) {
        await deleteColumn(id)
      }
    }

    if (mapped.length > 0) {
      await saveColumns(mapped)
    }

    await fetchColumnConfigs(tableKey, projectId || null)
  }

  const handleSaveConfiguration = async () => {
    if (applyScope === 'organization' && !canManageOrgConfig) {
      toast({ variant: 'destructive', title: 'Permission denied', description: 'You do not have permission to manage the organization-level configuration.' })
      return
    }
    if (applyScope === 'project' && !canManageProjectConfig) {
      toast({ variant: 'destructive', title: 'Permission denied', description: 'You do not have permission to manage this project\'s configuration.' })
      return
    }

    // ⚠️ This is the highest-blast-radius action in this popup: saving while
    // on the Organization Default tab overwrites the shared fallback used by
    // EVERY project that has no configuration of its own — not just the
    // project currently selected in the drawer. Require an explicit
    // confirmation here, mirroring the same warning already shown for
    // "Clear All Columns" on this scope, so it can't be triggered by a
    // single misclick.
    if (applyScope === 'organization') {
      const proceed = confirm(
        `You're about to save changes to the Organization Default configuration for ${tableLabel}.\n\n` +
        'This is the shared fallback used by EVERY project that has no column configuration of its own — saving here will change what those projects see immediately, not just the current project.\n\n' +
        'If you only meant to update this project, click Cancel and use "Save as Project Template" instead.\n\n' +
        'Continue saving the Organization Default?'
      )
      if (!proceed) return
    }

    setSaving(true)
    try {
      await persistDraft(applyScope)
      setPendingDeletes([]) // already processed inside persistDraft — clear so a later save doesn't retry stale ids
      await loadDraftForScope(applyScope) // refresh draft with persisted IDs + clear "empty slate" hint
      setSavedMessage(true)
      toast({ variant: 'success', title: 'Configuration saved', description: 'QA Daily Update column configuration updated successfully.' })
      onSaved?.()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save failed', description: e?.message || 'Could not save column configuration.' })
    } finally {
      setSaving(false)
    }
  }

  const handleSaveAsProjectTemplate = async () => {
    if (!projectId) return
    if (!canManageProjectConfig) {
      toast({ variant: 'destructive', title: 'Permission denied', description: 'You do not have permission to manage this project\'s configuration.' })
      return
    }
    setSaving(true)
    try {
      // Deletions must succeed before upsert, or unique-key collisions can
      // fail the entire batch. Do not swallow delete errors.
      for (const id of pendingDeletes) {
        await deleteColumn(id)
      }
      setPendingDeletes([])
      await saveAsProjectTemplate(tableKey, projectId, draft)
      await fetchColumnConfigs(tableKey, projectId)
      await loadDraftForScope('project')
      setSavedMessage(true)
      toast({ variant: 'success', title: 'Saved as project template', description: 'This configuration is now saved specifically for the current project.' })
      onSaved?.()
    } catch (e: any) {
      const msg = e?.message || e?.details || 'Could not save project template.'
      toast({ variant: 'destructive', title: 'Save failed', description: msg })
    } finally {
      setSaving(false)
    }
  }

  const visibleDraft = draft.filter(c => c.is_visible)

  const drawerContent = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleCancel}
            className="fixed inset-0 z-[80] bg-black/50 dark:bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 z-[81] w-full max-w-[760px] flex flex-col shadow-2xl"
            style={{ background: 'var(--surface)', borderLeft: '1px solid var(--border)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
                  <Sparkles className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>
                    Customize QA Daily Update Columns
                  </h2>
                  <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>{tableLabel}</p>
                </div>
              </div>
              <button onClick={handleCancel} className="p-2 rounded-xl transition-all hover:scale-105 shrink-0" style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-muted)' }} aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>

            {!canManageColumns ? (
              <div className="flex-1 flex items-center justify-center p-8 text-center">
                <div>
                  <ShieldCheck className="w-8 h-8 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>You don't have permission to customize columns.</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Contact an administrator, manager, or QA lead for access.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

                  {/* Configuration Applies To selector */}
                  <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2">
                      <Info className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Configuration Applies To</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        disabled={!canManageOrgConfig}
                        onClick={() => handleScopeChange('organization')}
                        className={cn(
                          'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border disabled:opacity-40 disabled:cursor-not-allowed',
                          applyScope === 'organization' ? 'bg-accent-gold text-black border-accent-gold' : 'text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]'
                        )}
                      >
                        <Building2 className="w-3.5 h-3.5" /> Organization Default
                      </button>
                      <button
                        disabled={!projectId || !canManageProjectConfig}
                        onClick={() => handleScopeChange('project')}
                        className={cn(
                          'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all border disabled:opacity-40 disabled:cursor-not-allowed',
                          applyScope === 'project' ? 'bg-accent-gold text-black border-accent-gold' : 'text-[var(--text-secondary)] border-[var(--border)] hover:text-[var(--text-primary)]'
                        )}
                      >
                        <FolderKanban className="w-3.5 h-3.5" /> Project{projectName ? `: ${projectName}` : ' Specific'}
                      </button>
                      <span className="text-[10px] px-2 py-1 rounded-lg" style={{ color: 'var(--text-muted)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        Currently active on table: <strong style={{ color: 'var(--text-primary)' }}>{currentScope === 'project' ? 'Project Configuration' : 'Organization Default'}</strong>
                      </span>
                    </div>
                    {applyScope === 'project' && isEmptyProjectSlate ? (
                      <p className="text-[10px] leading-relaxed flex items-center gap-1.5" style={{ color: 'var(--accent)' }}>
                        <Sparkles className="w-3 h-3 shrink-0" /> This project has no saved column configuration yet — you're starting from a clean, empty slate. Add columns below, or click "Clone from Organization Default" to start from the shared default and edit freely, then Save Configuration.
                      </p>
                    ) : (
                      <p className="text-[10px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                        {applyScope === 'project'
                          ? "You're editing this project's own saved column configuration. Switching to Organization Default above shows/edits the shared default instead."
                          : 'You are editing the Organization Default configuration, used by every project that has no configuration of its own.'}
                      </p>
                    )}
                  </div>

                  {/* Column list */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                        Columns ({draft.length}){draftLoading && ' · Loading…'}
                      </span>
                      <div className="flex items-center gap-2">
                        {applyScope === 'project' && canManageProjectConfig && (
                          <IconAction
                            icon={<Copy className="w-3.5 h-3.5" />}
                            label="Clone from Organization Default"
                            onClick={handleCloneFromOrgDefault}
                            disabled={draftLoading}
                            variant="blue"
                          />
                        )}
                        {draft.length > 0 && (
                          (applyScope === 'organization' ? canManageOrgConfig : canManageProjectConfig)
                        ) && (
                            <IconAction
                              icon={<Trash2 className="w-3.5 h-3.5" />}
                              label="Clear All Columns"
                              variant="red"
                              onClick={() => {
                                const warning = applyScope === 'organization'
                                  ? 'Clear ALL columns from the Organization Default draft? This is the fallback used by every project with no configuration of its own — clearing and saving it will leave those projects with zero columns until new ones are added. This only affects the unsaved draft below until you click Save Configuration.'
                                  : "Clear ALL columns from this project's draft? This only affects the unsaved draft below — nothing is deleted from the database until you click Save Configuration. You can then add columns from scratch."
                                if (!confirm(warning)) return
                                setDraft([])
                                setPendingDeletes(prev => Array.from(new Set([...prev, ...draft.filter(c => !c.id.startsWith('fallback-')).map(c => c.id)])))
                                setIsEmptyProjectSlate(applyScope === 'project')
                              }}
                            />
                          )}
                        {canAddColumns && (
                          <IconAction
                            icon={<Plus className="w-3.5 h-3.5" />}
                            label="Add New Column"
                            variant="gold"
                            onClick={() => setShowAddForm(p => !p)}
                          />
                        )}
                      </div>
                    </div>

                    {/* Add New Column form */}
                    <AnimatePresence>
                      {showAddForm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--accent)' }}>
                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Column Name</label>
                                <input
                                  value={newCol.display_name}
                                  onChange={e => setNewCol(p => ({ ...p, display_name: e.target.value }))}
                                  placeholder="e.g. Release Item"
                                  className="px-3 py-2 rounded-lg text-xs focus:outline-none"
                                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Column Type</label>
                                <select
                                  value={newCol.column_type}
                                  onChange={e => setNewCol(p => ({ ...p, column_type: e.target.value as ColumnType }))}
                                  className="px-3 py-2 rounded-lg text-xs focus:outline-none"
                                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                >
                                  {COLUMN_TYPES.map(t => <option key={t} value={t}>{COLUMN_TYPE_LABELS[t]}</option>)}
                                </select>
                              </div>
                            </div>

                            <div className="flex flex-col gap-1">
                              <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Description / Help Text</label>
                              <input
                                value={newCol.description ?? ''}
                                onChange={e => setNewCol(p => ({ ...p, description: e.target.value }))}
                                placeholder="Shown to users as guidance for this field"
                                className="px-3 py-2 rounded-lg text-xs focus:outline-none"
                                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Placeholder</label>
                                <input
                                  value={newCol.placeholder ?? ''}
                                  onChange={e => setNewCol(p => ({ ...p, placeholder: e.target.value }))}
                                  placeholder="e.g. Enter value..."
                                  className="px-3 py-2 rounded-lg text-xs focus:outline-none"
                                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                />
                              </div>
                              <div className="flex flex-col gap-1">
                                <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Default Value</label>
                                <input
                                  value={newCol.default_value ?? ''}
                                  onChange={e => setNewCol(p => ({ ...p, default_value: e.target.value }))}
                                  placeholder="Optional"
                                  className="px-3 py-2 rounded-lg text-xs focus:outline-none"
                                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                />
                              </div>
                            </div>

                            {/* Option editor for dropdown/multiselect/status */}
                            {isOptionBasedType(newCol.column_type as ColumnType) && (
                              <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
                                <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Options</span>
                                <div className="flex flex-col gap-1.5">
                                  {(newCol.dropdown_options || []).map(opt => (
                                    <div key={opt.id} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs" style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                                      <span className="flex-1 truncate">{opt.label}</span>
                                      <button onClick={() => removeOptionFromNewCol(opt.id)} className="text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex items-center gap-2">
                                  <input
                                    value={newOptionLabel}
                                    onChange={e => setNewOptionLabel(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOptionToNewCol() } }}
                                    placeholder="Add an option..."
                                    className="flex-1 px-3 py-1.5 rounded-lg text-xs focus:outline-none"
                                    style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                  />
                                  <button onClick={addOptionToNewCol} className="px-3 py-1.5 rounded-lg bg-accent-gold text-black text-[11px] font-bold">Add</button>
                                </div>
                              </div>
                            )}

                            <div className="flex items-center gap-4 flex-wrap pt-1">
                              <ToggleField label="Required" checked={!!newCol.is_required} onChange={v => setNewCol(p => ({ ...p, is_required: v }))} />
                              <ToggleField label="Show in Table" checked={newCol.is_visible !== false} onChange={v => setNewCol(p => ({ ...p, is_visible: v }))} />
                              <ToggleField label="Include in QA Report" checked={newCol.include_in_qa_report !== false} onChange={v => setNewCol(p => ({ ...p, include_in_qa_report: v }))} />
                              <ToggleField label="Include in Export" checked={newCol.include_in_export !== false} onChange={v => setNewCol(p => ({ ...p, include_in_export: v }))} />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-1">
                              <button onClick={() => { setShowAddForm(false); resetNewColForm() }} className="px-3.5 py-2 rounded-xl text-xs font-bold" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Cancel</button>
                              <button onClick={handleAddColumn} className="px-3.5 py-2 rounded-xl bg-accent-gold text-black text-xs font-bold">Add Column</button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Column rows */}
                    <div className="flex flex-col gap-1.5">
                      {draft.map((col, idx) => {
                        const isEditingThis = editingId === col.id
                        return (
                          <div key={col.id}>
                            <div
                              draggable={canReorderColumns && !isEditingThis}
                              onDragStart={() => handleDragStart(idx)}
                              onDragOver={e => e.preventDefault()}
                              onDrop={() => handleDrop(idx)}
                              className="flex items-center gap-2 px-3 py-2.5 rounded-xl transition-colors"
                              style={{ background: isEditingThis ? 'var(--hover)' : 'var(--surface-elevated)', border: isEditingThis ? '1px solid var(--accent)' : '1px solid var(--border)' }}
                            >
                              {canReorderColumns && (
                                <span className="cursor-grab active:cursor-grabbing shrink-0" style={{ color: 'var(--text-muted)' }}>
                                  <GripVertical className="w-4 h-4" />
                                </span>
                              )}

                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{col.display_name}</span>
                                  {col.is_required && <span className="text-red-400 text-xs font-bold">*</span>}
                                  <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase', col.is_system ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border border-purple-500/20')}>
                                    {col.is_system ? 'System' : 'Custom'}
                                  </span>
                                  <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'var(--hover)', color: 'var(--text-muted)' }}>
                                    {COLUMN_TYPE_LABELS[col.column_type]}
                                  </span>
                                  {!col.is_visible && (
                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(248,113,113,0.1)', color: '#f87171' }}>Hidden</span>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-1 shrink-0">
                                {canRenameColumns && (
                                  <button
                                    onClick={() => isEditingThis ? cancelEdit() : startEdit(col)}
                                    title={isEditingThis ? 'Close editor' : 'Edit column'}
                                    className="p-1.5 rounded-lg transition-all"
                                    style={{ color: isEditingThis ? 'var(--accent)' : 'var(--text-muted)', background: isEditingThis ? 'var(--surface)' : 'transparent' }}
                                  >
                                    <Pencil className="w-3.5 h-3.5" />
                                  </button>
                                )}
                                {canHideShowColumns && (
                                  <button onClick={() => toggleVisible(col.id)} title={col.is_visible ? 'Hide column' : 'Show column'} className="p-1.5 rounded-lg transition-all" style={{ color: col.is_visible ? '#22c55e' : 'var(--text-muted)' }}>
                                    {col.is_visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                                  </button>
                                )}
                                {canDeleteCustomColumns && (
                                  col.is_system ? (
                                    <span title="System columns are required for the application and cannot be deleted" className="p-1.5 rounded-lg cursor-not-allowed" style={{ color: 'var(--text-muted)', opacity: 0.35 }}>
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </span>
                                  ) : (
                                    <button onClick={() => requestDelete(col)} title="Delete column" className="p-1.5 rounded-lg text-red-400 hover:bg-red-500/10 transition-all">
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )
                                )}
                              </div>
                            </div>

                            {/* Full Edit Column panel — same shape as Add New Column */}
                            <AnimatePresence>
                              {isEditingThis && editDraft && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-1.5 rounded-2xl p-4 flex flex-col gap-3" style={{ background: 'var(--surface-elevated)', border: '1px solid var(--accent)' }}>
                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Column Name</label>
                                        <input
                                          autoFocus
                                          value={editDraft.display_name}
                                          onChange={e => updateEditDraft({ display_name: e.target.value })}
                                          placeholder="e.g. Release Item"
                                          className="px-3 py-2 rounded-lg text-xs focus:outline-none"
                                          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                        />
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>
                                          Column Type{editDraft.is_system && <span className="ml-1 opacity-60">(System)</span>}
                                        </label>
                                        <select
                                          value={editDraft.column_type}
                                          disabled={editDraft.is_system}
                                          onChange={e => updateEditDraft({ column_type: e.target.value as ColumnType })}
                                          className="px-3 py-2 rounded-lg text-xs focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed"
                                          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                        >
                                          {COLUMN_TYPES.map(t => <option key={t} value={t}>{COLUMN_TYPE_LABELS[t]}</option>)}
                                        </select>
                                      </div>
                                    </div>

                                    <div className="flex flex-col gap-1">
                                      <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Description / Help Text</label>
                                      <input
                                        value={editDraft.description ?? ''}
                                        onChange={e => updateEditDraft({ description: e.target.value })}
                                        placeholder="Shown to users as guidance for this field"
                                        className="px-3 py-2 rounded-lg text-xs focus:outline-none"
                                        style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                      />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                      <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Placeholder</label>
                                        <input
                                          value={editDraft.placeholder ?? ''}
                                          onChange={e => updateEditDraft({ placeholder: e.target.value })}
                                          placeholder="e.g. Enter value..."
                                          className="px-3 py-2 rounded-lg text-xs focus:outline-none"
                                          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                        />
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <label className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Default Value</label>
                                        <input
                                          value={editDraft.default_value ?? ''}
                                          onChange={e => updateEditDraft({ default_value: e.target.value })}
                                          placeholder="Optional"
                                          className="px-3 py-2 rounded-lg text-xs focus:outline-none"
                                          style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                        />
                                      </div>
                                    </div>

                                    {/* Option editor for dropdown/multiselect/status — system columns now
                                        manage their own dropdown_options directly too (same mechanism as
                                        custom columns), since the centralized Configuration page was removed. */}
                                    {isOptionBasedType(editDraft.column_type) && (
                                      <div className="flex flex-col gap-2 p-3 rounded-xl" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
                                        <span className="text-[10px] font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Options</span>
                                        <div className="flex flex-col gap-1.5">
                                          {editDraft.dropdown_options.map((opt, oi) => (
                                            <div key={opt.id} className="flex items-center gap-1.5">
                                              <div className="flex flex-col shrink-0">
                                                <button disabled={oi === 0} onClick={() => moveEditOption(oi, -1)} className="disabled:opacity-30" style={{ color: 'var(--text-muted)' }}><ChevronDown className="w-3 h-3 rotate-180" /></button>
                                                <button disabled={oi === editDraft.dropdown_options.length - 1} onClick={() => moveEditOption(oi, 1)} className="disabled:opacity-30" style={{ color: 'var(--text-muted)' }}><ChevronDown className="w-3 h-3" /></button>
                                              </div>
                                              <input
                                                value={opt.label}
                                                onChange={e => renameEditOption(opt.id, e.target.value)}
                                                className="flex-1 px-2.5 py-1.5 rounded-lg text-xs focus:outline-none"
                                                style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                              />
                                              <button onClick={() => removeOptionFromEditDraft(opt.id)} className="p-1 text-red-400 hover:text-red-300"><Trash2 className="w-3.5 h-3.5" /></button>
                                            </div>
                                          ))}
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <input
                                            value={editOptionLabel}
                                            onChange={e => setEditOptionLabel(e.target.value)}
                                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOptionToEditDraft() } }}
                                            placeholder="Add an option..."
                                            className="flex-1 px-3 py-1.5 rounded-lg text-xs focus:outline-none"
                                            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                                          />
                                          <button onClick={addOptionToEditDraft} className="px-3 py-1.5 rounded-lg bg-accent-gold text-black text-[11px] font-bold">Add</button>
                                        </div>
                                      </div>
                                    )}

                                    <div className="flex items-center gap-4 flex-wrap pt-1">
                                      <ToggleField label="Required" checked={!!editDraft.is_required} onChange={v => updateEditDraft({ is_required: v })} />
                                      <ToggleField label="Show in Table" checked={editDraft.is_visible !== false} onChange={v => updateEditDraft({ is_visible: v })} />
                                      <ToggleField label="Include in QA Report" checked={editDraft.include_in_qa_report !== false} onChange={v => updateEditDraft({ include_in_qa_report: v })} />
                                      <ToggleField label="Include in Export" checked={editDraft.include_in_export !== false} onChange={v => updateEditDraft({ include_in_export: v })} />
                                    </div>

                                    <div className="flex items-center justify-end gap-2 pt-1">
                                      <button onClick={cancelEdit} className="px-3.5 py-2 rounded-xl text-xs font-bold" style={{ color: 'var(--text-secondary)', border: '1px solid var(--border)' }}>Cancel</button>
                                      <button onClick={handleSaveEditColumn} className="px-3.5 py-2 rounded-xl bg-accent-gold text-black text-xs font-bold">Apply Changes</button>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )
                      })}
                    </div>
                  </div>

                  {/* Live Preview */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Live Preview (Sample Data)</span>
                    <div className="rounded-2xl overflow-x-auto" style={{ border: '1px solid var(--border)' }}>
                      <table className="w-full text-xs min-w-full" style={{ borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: 'var(--hover)' }}>
                            {visibleDraft.map((col, i) => (
                              <th
                                key={col.id}
                                className={cn('px-3 py-2 text-left text-[9px] font-black uppercase tracking-wider whitespace-nowrap', i === 0 && 'sticky left-0 z-10')}
                                style={{ color: 'var(--text-muted)', borderBottom: '1px solid var(--border)', background: 'var(--hover)' }}
                              >
                                {col.display_name}{col.is_required && <span className="text-red-400 ml-0.5">*</span>}
                              </th>
                            ))}
                            {visibleDraft.length === 0 && (
                              <th className="px-3 py-2 text-[10px] italic" style={{ color: 'var(--text-muted)' }}>No visible columns</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {[0, 1, 2].map(rowIdx => (
                            <tr key={rowIdx}>
                              {visibleDraft.map((col, i) => (
                                <td
                                  key={col.id}
                                  className={cn('px-3 py-2 whitespace-nowrap', i === 0 && 'sticky left-0 z-10 font-semibold')}
                                  style={{ color: 'var(--text-secondary)', borderBottom: '1px solid var(--divider)', background: 'var(--surface)' }}
                                >
                                  {sampleValueForColumn(col, rowIdx)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="text-[10px] flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                      <Info className="w-3 h-3" /> Preview uses sample data only. Your actual QA Daily Update records are not modified until you click Save Configuration.
                    </p>
                  </div>
                </div>

                {/* Footer actions */}
                <div className="shrink-0 px-6 py-4 flex flex-col gap-3" style={{ borderTop: '1px solid var(--border)', background: 'var(--surface-secondary)' }}>
                  {savedMessage && (
                    <div className="px-4 py-2.5 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                      <p className="text-xs font-bold text-green-500">✓ QA Daily Update column configuration updated successfully.</p>
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <button onClick={handleCancel} className="px-4 py-2.5 rounded-xl text-xs font-bold transition-all" style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        Cancel
                      </button>
                      {projectId && applyScope === 'project' && canManageProjectConfig && (
                        <button onClick={handleResetToDefault} disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50" style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                          <RotateCcw className="w-3.5 h-3.5" /> Reset to Default
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {projectId && canManageProjectConfig && (
                        <button onClick={handleSaveAsProjectTemplate} disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all disabled:opacity-50" style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                          <FolderKanban className="w-3.5 h-3.5" /> Save as Project Template
                        </button>
                      )}
                      <button
                        onClick={handleSaveConfiguration}
                        disabled={saving}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-60"
                        style={{ background: 'var(--accent)', color: '#000' }}
                      >
                        {saving ? (
                          <><div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(0,0,0,0.2)', borderTopColor: '#000' }} /> Saving...</>
                        ) : (
                          <><Save className="w-4 h-4" /> Save Configuration</>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </motion.div>

          {/* Delete confirmation dialog */}
          <AnimatePresence>
            {confirmDelete && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] bg-black/60" onClick={() => setConfirmDelete(null)} />
                <div className="fixed inset-0 z-[91] flex items-center justify-center p-4 pointer-events-none">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    onClick={e => e.stopPropagation()}
                    className="pointer-events-auto w-full max-w-sm rounded-2xl p-6 shadow-2xl"
                    style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-start gap-3 mb-4">
                      <div className="w-9 h-9 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-4 h-4 text-red-400" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Delete "{confirmDelete.display_name}"?</h3>
                        <p className="text-xs mt-1.5 leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                          This column will be removed from the QA Daily Update configuration. Existing data associated with this column may also be affected.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 rounded-xl text-xs font-bold" style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                        Cancel
                      </button>
                      <button onClick={confirmDeleteColumn} className="px-4 py-2 rounded-xl text-xs font-bold bg-red-500 text-white hover:bg-red-600 transition-all">
                        Delete Column
                      </button>
                    </div>
                  </motion.div>
                </div>
              </>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  )

  return createPortal(drawerContent, document.body)
}

// ── Icon-only action button with an accessible hover/focus tooltip ─────────
// Used for the toolbar actions above the column list (Clone from
// Organization Default / Clear All Columns / Add New Column) so the row
// stays compact instead of three long labeled buttons competing for space.
const ICON_ACTION_VARIANTS = {
  gold: { bg: 'rgba(212,175,55,0.15)', border: 'rgba(212,175,55,0.3)', color: 'var(--accent)', hoverBg: 'rgba(212,175,55,0.25)' },
  blue: { bg: 'rgba(59,130,246,0.1)', border: 'rgba(59,130,246,0.2)', color: '#60a5fa', hoverBg: 'rgba(59,130,246,0.2)' },
  red: { bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', color: '#f87171', hoverBg: 'rgba(239,68,68,0.2)' },
} as const

const IconAction: React.FC<{
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled?: boolean
  variant: keyof typeof ICON_ACTION_VARIANTS
}> = ({ icon, label, onClick, disabled, variant }) => {
  const [hovered, setHovered] = useState(false)
  const v = ICON_ACTION_VARIANTS[variant]
  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={label}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="flex items-center justify-center w-8 h-8 rounded-xl border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: hovered && !disabled ? v.hoverBg : v.bg, borderColor: v.border, color: v.color }}
      >
        {icon}
      </button>
      <AnimatePresence>
        {hovered && (
          <motion.span
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.12 }}
            role="tooltip"
            className="absolute top-full mt-1.5 right-0 z-50 whitespace-nowrap px-2.5 py-1.5 rounded-lg text-[10px] font-bold shadow-xl pointer-events-none"
            style={{ background: 'var(--surface-elevated)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  )
}

// ── Small reusable toggle switch ────────────────────────────────────────────
const ToggleField: React.FC<{ label: string; checked: boolean; onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => (
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={cn('w-8 h-4.5 rounded-full relative transition-all shrink-0', checked ? 'bg-accent-gold' : '')}
      style={{ background: checked ? undefined : 'var(--border)', width: '32px', height: '18px' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform"
        style={{ transform: checked ? 'translateX(14px)' : 'translateX(0)' }}
      />
    </button>
    <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</span>
  </label>
)
