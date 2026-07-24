// src/modules/DailyUpdateReport/columnConfigStore.ts
// Dynamic column configuration store for the QA Daily Update module.
// Resolves column structure per Project → Organization Default priority,
// and provides CRUD for renaming, adding, reordering, hiding, and deleting
// (custom-only) columns. Column data itself stays metadata-driven: no
// physical DB columns are created for custom fields.

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import type { ColumnConfig, DailyReportTableKey, ColumnType, DropdownOptionItem, OutcomeBucket, DashboardRole } from './types'

// ── Fallback option lists (used if the DB table isn't reachable yet — same
// values previously seeded centrally in daily_report_dropdown_configs /
// store.ts's DEFAULT_CONFIGS, now living directly on each system column's
// own dropdown_options since the centralized Configuration page was
// removed). outcome_bucket is only assigned for Testing Status / Smoke
// Status options — every other dropdown leaves it undefined. ──────────────
function opts(labels: [string, OutcomeBucket?][]): DropdownOptionItem[] {
  return labels.map(([label, bucket], i) => ({
    id: `fallback-opt-${label.toLowerCase().replace(/\s+/g, '-')}`,
    label,
    sort_order: i + 1,
    outcome_bucket: bucket ?? null,
  }))
}

const BRANCH_OPTIONS = opts([['main'], ['develop'], ['release/v2.4'], ['feature/auth']])
const QA_OPTIONS = opts([['Ameen S.'], ['Sarah Jenkins'], ['Michael Ross'], ['Emily Taylor']])
const TESTING_STATUS_OPTIONS = opts([
  ['Passed', 'completed'], ['Failed', 'other'], ['Blocked', 'blocked'],
  ['In Progress', 'pending'], ['Pending', 'pending'], ['Not Executed', 'pending'],
])
const RETESTING_STATUS_OPTIONS = opts([['Open', 'pending'], ['Retesting', 'pending'], ['Fixed', 'completed'], ['Closed', 'completed']])
const SMOKE_STATUS_OPTIONS = opts([['Pass', 'completed'], ['Fail', 'other'], ['Blocked', 'blocked'], ['Not Executed', 'pending']])
const ISSUE_SOURCE_OPTIONS = opts([['Missed by QA'], ['Backend Update'], ['Customer Reported'], ['Internal Testing'], ['Production']])

const SYSTEM_SUPPORT_DEFAULTS: Omit<ColumnConfig, 'id' | 'project_id'>[] = [
  { table_key: 'support', internal_key: 'support_id', display_name: 'Support ID', column_type: 'short_text', is_required: true, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 1 },
  { table_key: 'support', internal_key: 'bug_id', display_name: 'Bug ID', column_type: 'short_text', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 2 },
  { table_key: 'support', internal_key: 'branch', display_name: 'Branch', column_type: 'dropdown', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: BRANCH_OPTIONS, display_order: 3 },
  { table_key: 'support', internal_key: 'description', display_name: 'Description', column_type: 'long_text', is_required: true, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 4 },
  { table_key: 'support', internal_key: 'received_date', display_name: 'Received Date', column_type: 'date', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 5 },
  { table_key: 'support', internal_key: 'qa', display_name: 'QA', column_type: 'dropdown', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: QA_OPTIONS, display_order: 6 },
  { table_key: 'support', internal_key: 'tc_count', display_name: 'TC Count', column_type: 'number', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 7 },
  { table_key: 'support', internal_key: 'estimation_hrs', display_name: 'Estimation (Hrs)', column_type: 'number', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 8 },
  { table_key: 'support', internal_key: 'actual_start_date', display_name: 'Actual Start Date', column_type: 'date', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 9 },
  { table_key: 'support', internal_key: 'planned_end_date', display_name: 'Planned End Date', column_type: 'date', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 10 },
  { table_key: 'support', internal_key: 'actual_end_date', display_name: 'Actual End Date', column_type: 'date', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 11 },
  { table_key: 'support', internal_key: 'testing_status', display_name: 'Testing Status', column_type: 'dropdown', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: TESTING_STATUS_OPTIONS, dashboard_role: 'testing_status', display_order: 12 },
  { table_key: 'support', internal_key: 'issue_source', display_name: 'Issue Source', column_type: 'dropdown', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: ISSUE_SOURCE_OPTIONS, display_order: 13 },
  { table_key: 'support', internal_key: 'comments', display_name: 'Comments', column_type: 'long_text', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 14 },
  { table_key: 'support', internal_key: 'blocked_hours', display_name: 'Blocked Hours', column_type: 'number', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 15 },
  { table_key: 'support', internal_key: 'retesting_status', display_name: 'Retesting Status', column_type: 'dropdown', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: RETESTING_STATUS_OPTIONS, display_order: 16 },
  { table_key: 'support', internal_key: 'retesting_estimation_hrs', display_name: 'Retesting Est (Hrs)', column_type: 'number', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 17 },
]

const SYSTEM_RELEASE_DEFAULTS: Omit<ColumnConfig, 'id' | 'project_id'>[] = [
  { table_key: 'release', internal_key: 'task_id', display_name: 'Task ID', column_type: 'short_text', is_required: true, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 1 },
  { table_key: 'release', internal_key: 'description', display_name: 'Description', column_type: 'long_text', is_required: true, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 2 },
  { table_key: 'release', internal_key: 'qa', display_name: 'QA', column_type: 'dropdown', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: QA_OPTIONS, display_order: 3 },
  { table_key: 'release', internal_key: 'initial_round_estimation_hrs', display_name: 'Initial Est (Hrs)', column_type: 'number', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 4 },
  { table_key: 'release', internal_key: 'testing_status', display_name: 'Testing Status', column_type: 'dropdown', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: TESTING_STATUS_OPTIONS, display_order: 5 },
  { table_key: 'release', internal_key: 'smoke_testing_status', display_name: 'Smoke Status', column_type: 'dropdown', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: SMOKE_STATUS_OPTIONS, dashboard_role: 'smoke_status', display_order: 6 },
  { table_key: 'release', internal_key: 'scope_of_testing_for_smoke', display_name: 'Smoke Test Scope', column_type: 'long_text', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 7 },
  { table_key: 'release', internal_key: 'smoke_testing_estimation_hrs', display_name: 'Smoke Est (Hrs)', column_type: 'number', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 8 },
  { table_key: 'release', internal_key: 'overall_scope_of_testing', display_name: 'Overall Scope', column_type: 'long_text', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 9 },
  { table_key: 'release', internal_key: 'overall_estimation_hrs', display_name: 'Overall Est (Hrs)', column_type: 'number', is_required: false, is_visible: true, is_system: true, include_in_qa_report: true, include_in_export: true, dropdown_options: [], display_order: 10 },
]

function fallbackDefaults(tableKey: DailyReportTableKey): ColumnConfig[] {
  const base = tableKey === 'support' ? SYSTEM_SUPPORT_DEFAULTS : SYSTEM_RELEASE_DEFAULTS
  return base.map((c, i) => ({ ...c, id: `fallback-${tableKey}-${i}`, project_id: null }))
}

interface ColumnConfigState {
  // Resolved (active) configs for the currently selected table+project, sorted by display_order
  supportColumns: ColumnConfig[]
  releaseColumns: ColumnConfig[]
  // Which scope is actually in effect for the current project selection
  supportScope: 'organization' | 'project'
  releaseScope: 'organization' | 'project'
  loading: boolean
  isDbAvailable: boolean

  fetchColumnConfigs: (tableKey: DailyReportTableKey, projectId: string | null) => Promise<void>
  getColumns: (tableKey: DailyReportTableKey) => ColumnConfig[]
  getScope: (tableKey: DailyReportTableKey) => 'organization' | 'project'

  // Fetches ONLY the rows that literally belong to the given scope (no
  // Project → Organization Default fallback merging). Used by the Customize
  // Columns popup so that switching to "Project: X" for a project that has
  // no saved configuration of its own returns an EMPTY list — letting the
  // user build that project's column structure from a clean slate — instead
  // of silently pre-filling the draft with the inherited Organization
  // Default columns. Organization scope still falls back to the hardcoded
  // defaults if the DB is unreachable or the org-default rows are somehow
  // missing, since that scope is the last-resort fallback for every project
  // and should never appear "broken"/blank.
  fetchScopedColumns: (tableKey: DailyReportTableKey, projectId: string | null) => Promise<ColumnConfig[]>

  saveColumn: (config: Partial<ColumnConfig> & { table_key: DailyReportTableKey; project_id: string | null }) => Promise<ColumnConfig | null>
  saveColumns: (configs: ColumnConfig[]) => Promise<void>
  deleteColumn: (id: string) => Promise<void>
  reorderColumns: (tableKey: DailyReportTableKey, projectId: string | null, orderedIds: string[]) => Promise<void>

  // Ensures project-scoped rows exist for a table (clones from the currently
  // resolved set — which may itself be the org default — so a project can be
  // edited independently going forward).
  ensureProjectScope: (tableKey: DailyReportTableKey, projectId: string) => Promise<void>
  resetToOrgDefault: (tableKey: DailyReportTableKey, projectId: string) => Promise<void>
  saveAsProjectTemplate: (tableKey: DailyReportTableKey, projectId: string, columns: ColumnConfig[]) => Promise<void>

  // Custom (metadata-driven) column values for /daily-report rows, keyed by
  // table+project and shared across every `useDynamicColumns` call site —
  // the KPI-card calculation in index.tsx, plus each table's own inline
  // editor. Without this shared slice, each call site held its own private
  // React state, so editing a custom column's value in the table updated
  // that table's cell instantly but left the KPI cards (a *different*
  // useDynamicColumns instance) reading stale data until a full reload.
  customFieldValues: Record<string, CustomValuesMap>
  getCustomFieldValues: (tableKey: DailyReportTableKey, projectId: string | null) => CustomValuesMap
  mergeCustomFieldValues: (tableKey: DailyReportTableKey, projectId: string | null, values: CustomValuesMap) => void
  setCustomFieldValue: (tableKey: DailyReportTableKey, projectId: string | null, rowId: string, internalKey: string, value: any) => void
  clearCustomFieldValuesForRows: (tableKey: DailyReportTableKey, projectId: string | null, rowIds: string[]) => void
}

function sortByOrder(cols: ColumnConfig[]): ColumnConfig[] {
  return [...cols].sort((a, b) => a.display_order - b.display_order)
}

// rowId -> internal_key -> value, for a table's CUSTOM (metadata-driven) columns.
export interface CustomValuesMap {
  [rowId: string]: Record<string, any>
}

// Cache key for the customFieldValues slice below — scoped per table+project
// since a custom column's values are project-specific.
function customValuesCacheKey(tableKey: DailyReportTableKey, projectId: string | null | undefined): string {
  return `${tableKey}:${projectId || ''}`
}

// Stable shared "empty" reference — MUST be reused (not a fresh `{}` literal)
// whenever a table+project key has no entries yet, since callers select this
// value from the Zustand store; returning a new object identity on every
// call would make a reference-equality snapshot check (e.g. `useSyncExternalStore`)
// think the store changed on every render, triggering an infinite render loop.
const EMPTY_CUSTOM_VALUES: CustomValuesMap = {}

export const useColumnConfigStore = create<ColumnConfigState>((set, get) => ({
  supportColumns: fallbackDefaults('support'),
  releaseColumns: fallbackDefaults('release'),
  supportScope: 'organization',
  releaseScope: 'organization',
  loading: false,
  isDbAvailable: true,

  getColumns: (tableKey) => tableKey === 'support' ? get().supportColumns : get().releaseColumns,
  getScope: (tableKey) => tableKey === 'support' ? get().supportScope : get().releaseScope,

  fetchColumnConfigs: async (tableKey, projectId) => {
    set({ loading: true })
    try {
      // 1. Try project-specific configuration first
      let scope: 'organization' | 'project' = 'organization'
      let rows: ColumnConfig[] = []

      if (projectId) {
        const { data: projectRows, error: projErr } = await supabase
          .from('daily_report_column_configs')
          .select('*')
          .eq('table_key', tableKey)
          .eq('project_id', projectId)
          .order('display_order', { ascending: true })

        if (!projErr && projectRows && projectRows.length > 0) {
          rows = projectRows as unknown as ColumnConfig[]
          scope = 'project'
        }
      }

      // 2. Fall back to Organization Default
      if (rows.length === 0) {
        const { data: orgRows, error: orgErr } = await supabase
          .from('daily_report_column_configs')
          .select('*')
          .eq('table_key', tableKey)
          .is('project_id', null)
          .order('display_order', { ascending: true })

        if (orgErr) throw orgErr

        rows = (orgRows && orgRows.length > 0)
          ? orgRows as unknown as ColumnConfig[]
          : fallbackDefaults(tableKey)
        scope = 'organization'
      }

      const normalized = rows.map(r => ({ ...r, dropdown_options: r.dropdown_options || [] }))

      if (tableKey === 'support') {
        set({ supportColumns: sortByOrder(normalized), supportScope: scope, isDbAvailable: true })
      } else {
        set({ releaseColumns: sortByOrder(normalized), releaseScope: scope, isDbAvailable: true })
      }
    } catch (e) {
      console.warn('[ColumnConfigStore] Failed to fetch column configs, using fallback defaults.', e)
      const fb = fallbackDefaults(tableKey)
      if (tableKey === 'support') {
        set({ supportColumns: fb, supportScope: 'organization', isDbAvailable: false })
      } else {
        set({ releaseColumns: fb, releaseScope: 'organization', isDbAvailable: false })
      }
    } finally {
      set({ loading: false })
    }
  },

  saveColumn: async (config) => {
    const user = useAppStore.getState().user
    const isEdit = !!config.id && !config.id.startsWith('fallback-')

    const payload: any = {
      project_id: config.project_id,
      table_key: config.table_key,
      internal_key: config.internal_key,
      display_name: config.display_name,
      column_type: config.column_type,
      description: config.description ?? null,
      placeholder: config.placeholder ?? null,
      is_required: !!config.is_required,
      is_visible: config.is_visible !== false,
      is_system: !!config.is_system,
      include_in_qa_report: config.include_in_qa_report !== false,
      include_in_export: config.include_in_export !== false,
      default_value: config.default_value ?? null,
      dropdown_options: config.dropdown_options ?? [],
      config_category: config.config_category ?? null,
      dashboard_role: config.dashboard_role ?? null,
      display_order: config.display_order ?? 0,
    }

    if (isEdit) {
      payload.id = config.id
    } else {
      payload.created_by = user?.id
    }

    try {
      const { data, error } = await supabase
        .from('daily_report_column_configs')
        .upsert(payload)
        .select()
        .single()

      if (error) throw error
      const saved = { ...(data as any), dropdown_options: (data as any).dropdown_options || [] } as ColumnConfig

      set((state) => {
        const key = config.table_key === 'support' ? 'supportColumns' : 'releaseColumns'
        const list = state[key]
        const next = isEdit
          ? list.map(c => c.id === saved.id ? saved : c)
          : [...list, saved]
        return { [key]: sortByOrder(next) } as any
      })

      return saved
    } catch (e) {
      console.error('[ColumnConfigStore] saveColumn failed:', e)
      throw e
    }
  },

  saveColumns: async (configs) => {
    if (configs.length === 0) return
    const tableKey = configs[0].table_key
    const payload = configs.map(c => ({
      id: c.id.startsWith('fallback-') ? undefined : c.id,
      project_id: c.project_id,
      table_key: c.table_key,
      internal_key: c.internal_key,
      display_name: c.display_name,
      column_type: c.column_type,
      description: c.description ?? null,
      placeholder: c.placeholder ?? null,
      is_required: !!c.is_required,
      is_visible: c.is_visible !== false,
      is_system: !!c.is_system,
      include_in_qa_report: c.include_in_qa_report !== false,
      include_in_export: c.include_in_export !== false,
      default_value: c.default_value ?? null,
      dropdown_options: c.dropdown_options ?? [],
      config_category: c.config_category ?? null,
      dashboard_role: c.dashboard_role ?? null,
      display_order: c.display_order ?? 0,
    }))

    const { data, error } = await supabase
      .from('daily_report_column_configs')
      .upsert(payload)
      .select()

    if (error) {
      console.error('[ColumnConfigStore] saveColumns failed:', error)
      throw error
    }

    const saved = (data || []).map((r: any) => ({ ...r, dropdown_options: r.dropdown_options || [] })) as ColumnConfig[]
    const key = tableKey === 'support' ? 'supportColumns' : 'releaseColumns'
    set({ [key]: sortByOrder(saved) } as any)
  },

  deleteColumn: async (id) => {
    if (id.startsWith('fallback-')) return
    const { error } = await supabase
      .from('daily_report_column_configs')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('[ColumnConfigStore] deleteColumn failed:', error)
      throw error
    }

    set((state) => ({
      supportColumns: state.supportColumns.filter(c => c.id !== id),
      releaseColumns: state.releaseColumns.filter(c => c.id !== id),
    }))
  },

  reorderColumns: async (tableKey, projectId, orderedIds) => {
    const key = tableKey === 'support' ? 'supportColumns' : 'releaseColumns'
    const current = get()[key]
    const reordered = orderedIds
      .map((id, idx) => {
        const col = current.find(c => c.id === id)
        return col ? { ...col, display_order: idx + 1 } : null
      })
      .filter(Boolean) as ColumnConfig[]

    set({ [key]: sortByOrder(reordered) } as any)

    try {
      await get().saveColumns(reordered)
    } catch (e) {
      console.error('[ColumnConfigStore] Failed to persist reorder:', e)
    }
  },

  fetchScopedColumns: async (tableKey, projectId) => {
    try {
      if (projectId) {
        // Strictly this project's own rows — NO fallback to Organization
        // Default. An empty array here correctly means "this project has
        // not configured its own columns yet" so the caller (Customize
        // Columns popup) can present a clean, empty canvas instead of
        // silently pre-filling with the shared org structure.
        const { data, error } = await supabase
          .from('daily_report_column_configs')
          .select('*')
          .eq('table_key', tableKey)
          .eq('project_id', projectId)
          .order('display_order', { ascending: true })

        if (error) throw error
        return ((data || []) as ColumnConfig[]).map(r => ({ ...r, dropdown_options: r.dropdown_options || [] }))
      }

      // Organization Default scope — this is the last-resort fallback used
      // by every project, so it should never appear "broken"/blank. Fall
      // back to the hardcoded defaults if the DB has no rows or is
      // unreachable.
      const { data, error } = await supabase
        .from('daily_report_column_configs')
        .select('*')
        .eq('table_key', tableKey)
        .is('project_id', null)
        .order('display_order', { ascending: true })

      if (error) throw error
      if (data && data.length > 0) {
        return (data as ColumnConfig[]).map(r => ({ ...r, dropdown_options: r.dropdown_options || [] }))
      }
      return fallbackDefaults(tableKey)
    } catch (e) {
      console.warn('[ColumnConfigStore] fetchScopedColumns failed, using fallback.', e)
      return projectId ? [] : fallbackDefaults(tableKey)
    }
  },

  ensureProjectScope: async (tableKey, projectId) => {
    const state = get()
    const scope = tableKey === 'support' ? state.supportScope : state.releaseScope
    if (scope === 'project') return // already project-scoped

    const current = tableKey === 'support' ? state.supportColumns : state.releaseColumns
    const cloned = current.map(c => ({
      ...c,
      id: crypto.randomUUID(),
      project_id: projectId,
    }))

    await get().saveColumns(cloned)
    if (tableKey === 'support') set({ supportScope: 'project' })
    else set({ releaseScope: 'project' })
  },

  resetToOrgDefault: async (tableKey, projectId) => {
    // Delete all project-scoped rows for this table+project, then re-fetch
    // so the view falls back to the Organization Default configuration.
    try {
      const { error } = await supabase
        .from('daily_report_column_configs')
        .delete()
        .eq('table_key', tableKey)
        .eq('project_id', projectId)

      if (error) throw error
    } catch (e) {
      console.error('[ColumnConfigStore] resetToOrgDefault failed:', e)
      throw e
    }
    await get().fetchColumnConfigs(tableKey, projectId)
  },

  saveAsProjectTemplate: async (tableKey, projectId, columns) => {
    // Persist the given column set as the project's own configuration
    // (equivalent to "Save as Team/Project Template" in the spec — since
    // Teams don't exist in this app's data model, this saves at Project scope).
    //
    // ⚠️ Safety: only reuse a row's existing id if it already belongs to this
    // exact project. If the draft was sourced from the Organization Default
    // (or another project), reusing that id here would UPSERT-in-place and
    // silently repoint the *original* row's project_id, corrupting the org
    // default / other project's configuration. Unmatched rows must be
    // inserted as brand-new rows instead.
    const cloned = columns.map(c => {
      const alreadyThisProject = c.project_id === projectId && !c.id.startsWith('fallback-')
      return {
        ...c,
        id: alreadyThisProject ? c.id : crypto.randomUUID(),
        project_id: projectId,
      }
    })
    await get().saveColumns(cloned)
    if (tableKey === 'support') set({ supportScope: 'project' })
    else set({ releaseScope: 'project' })
  },

  customFieldValues: {},

  getCustomFieldValues: (tableKey, projectId) =>
    get().customFieldValues[customValuesCacheKey(tableKey, projectId)] ?? EMPTY_CUSTOM_VALUES,

  mergeCustomFieldValues: (tableKey, projectId, values) => {
    const key = customValuesCacheKey(tableKey, projectId)
    set(state => ({
      customFieldValues: {
        ...state.customFieldValues,
        [key]: { ...state.customFieldValues[key], ...values },
      },
    }))
  },

  setCustomFieldValue: (tableKey, projectId, rowId, internalKey, value) => {
    const key = customValuesCacheKey(tableKey, projectId)
    set(state => ({
      customFieldValues: {
        ...state.customFieldValues,
        [key]: {
          ...state.customFieldValues[key],
          [rowId]: { ...(state.customFieldValues[key]?.[rowId] || {}), [internalKey]: value },
        },
      },
    }))
  },

  clearCustomFieldValuesForRows: (tableKey, projectId, rowIds) => {
    const key = customValuesCacheKey(tableKey, projectId)
    set(state => {
      const existing = state.customFieldValues[key]
      if (!existing) return state
      const next = { ...existing }
      rowIds.forEach(id => delete next[id])
      return { customFieldValues: { ...state.customFieldValues, [key]: next } }
    })
  },
}))

// Normalizes a user-typed column display name for consistent, uniform
// presentation regardless of how it was capitalized when entered — e.g.
// "Support ID", "support id", and "SUPPORT id" all normalize to the same
// "SUPPORT ID" so column names always look consistent across the table,
// live preview, and every place display_name is rendered. Internal
// whitespace is also collapsed. This only affects the display label —
// internal_key (the stable identifier data mapping relies on) is never
// derived from this normalized value's case, so existing data/mappings are
// unaffected by renames.
export function normalizeColumnDisplayName(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ').toUpperCase()
}

// ── Helpers for generating stable internal keys for new custom columns ──────
export function generateInternalKey(displayName: string, existingKeys: string[]): string {
  const base = 'custom_' + displayName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 40) || 'custom_field'

  let candidate = base
  let suffix = 1
  while (existingKeys.includes(candidate)) {
    candidate = `${base}_${suffix++}`
  }
  return candidate
}

export function generateOptionId(): string {
  return `opt-${Math.random().toString(36).slice(2, 10)}`
}

export function newDropdownOption(label: string, sortOrder: number): DropdownOptionItem {
  return { id: generateOptionId(), label, sort_order: sortOrder }
}

export function isOptionBasedType(type: ColumnType): boolean {
  return type === 'dropdown' || type === 'multiselect' || type === 'status'
}

// Which internal_key each dashboard role falls back to when NO column in
// the resolved set has been explicitly assigned that role yet — covers
// installs that haven't re-saved their column configuration since
// dashboard_role was introduced (migration 058 tags the real system
// columns in the DB, but a project's already-cloned/customized copy of
// that column won't automatically pick up the new field). Once a user
// assigns the role to any column (system or custom) via the Customize
// Columns drawer, that explicit assignment always takes priority over this
// fallback.
const DASHBOARD_ROLE_FALLBACK_KEY: Record<DashboardRole, string> = {
  testing_status: 'testing_status',
  smoke_status: 'smoke_testing_status',
}

// Finds the column that should feed a given dashboard summary-card metric:
// prefers an explicit dashboard_role assignment (works for system AND
// custom columns), falling back to matching the historical system column's
// internal_key if nothing has been explicitly assigned yet.
export function findDashboardRoleColumn(columns: ColumnConfig[], role: DashboardRole): ColumnConfig | undefined {
  return columns.find(c => c.dashboard_role === role)
    ?? columns.find(c => c.internal_key === DASHBOARD_ROLE_FALLBACK_KEY[role])
}

// Builds a case-insensitive value -> outcome_bucket lookup map from a
// column's dropdown_options, defaulting anything unmapped (including values
// that don't match any configured option at all, e.g. legacy/stale row
// data) to 'other'. Used by the /daily-report summary dashboard cards to
// bucket Testing Status / Smoke Status values without any hardcoded string
// arrays — a value only needs its bucket assigned once, in the Customize
// Columns drawer, to be picked up here.
export function buildOutcomeBucketMap(column: ColumnConfig | undefined): Map<string, import('./types').OutcomeBucket> {
  const map = new Map<string, import('./types').OutcomeBucket>()
  if (!column) return map
  for (const opt of column.dropdown_options) {
    map.set(opt.label.toLowerCase(), (opt.outcome_bucket as any) || 'other')
  }
  return map
}

export function resolveOutcomeBucket(bucketMap: Map<string, import('./types').OutcomeBucket>, value: string | null | undefined): import('./types').OutcomeBucket {
  if (!value) return 'other'
  return bucketMap.get(value.toLowerCase()) || 'other'
}
