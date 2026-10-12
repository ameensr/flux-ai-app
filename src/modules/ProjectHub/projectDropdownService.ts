// src/modules/ProjectHub/projectDropdownService.ts
// Centralized service for project-wise dropdown configuration.
//
// CENTRALIZED CATEGORIES (single source of truth):
//   status        → Testing Status, Retesting Status, Task Status, QA Report Testing Status
//   qa_engineers  → QA Engineers (Testers), Assigned To (QA Engineers)
//   priority      → Release Tracker Priority, QA Report Priority
//   is_qa_miss    → Is QA Miss? (independent)
//
// /daily-report is NOT connected here and remains unchanged.

import { supabase } from '@/lib/supabase'

export type ProjectDropdownCategory =
  | 'status'
  | 'qa_engineers'
  | 'priority'
  | 'is_qa_miss'

export interface ProjectDropdownOption {
  id: string
  project_id: string
  category: ProjectDropdownCategory
  label: string
  value: string
  color?: string | null
  is_active: boolean
  sort_order: number
  created_at?: string
  updated_at?: string
}

export const CATEGORY_LABELS: Record<ProjectDropdownCategory, string> = {
  status:       'Status',
  qa_engineers: 'QA Engineers',
  priority:     'Priority',
  is_qa_miss:   'Is QA Miss?',
}

export const CATEGORY_DESCRIPTIONS: Record<ProjectDropdownCategory, string> = {
  status:       'Used for: Testing Status, Retesting Status, Task Status, QA Report Testing Status',
  qa_engineers: 'Used for: QA Engineers (Testers), Assigned To (QA Engineers)',
  priority:     'Used for: Release Tracker Priority, QA Report Priority',
  is_qa_miss:   'Used for: Is QA Miss? field in Support Tracker',
}

// Single group — all 4 centralized categories
export const CATEGORY_GROUPS: { label: string; categories: ProjectDropdownCategory[] }[] = [
  {
    label: 'Project Dropdown Configuration',
    categories: ['status', 'qa_engineers', 'priority', 'is_qa_miss'],
  },
]

// ── Default seeds ─────────────────────────────────────────────────────────────

const DEFAULT_SEEDS: Record<ProjectDropdownCategory, Array<{ label: string; value: string; color?: string }>> = {
  status: [
    { label: 'Not Started', value: 'Not Started', color: '#94a3b8' },
    { label: 'Assigned',    value: 'Assigned',    color: '#3b82f6' },
    { label: 'In Testing',  value: 'In Testing',  color: '#8b5cf6' },
    { label: 'In Progress', value: 'In Progress', color: '#8b5cf6' },
    { label: 'Blocked',     value: 'Blocked',     color: '#ef4444' },
    { label: 'Retesting',   value: 'Retesting',   color: '#06b6d4' },
    { label: 'In Review',   value: 'In Review',   color: '#f59e0b' },
    { label: 'Completed',   value: 'Completed',   color: '#10b981' },
    { label: 'Cancelled',   value: 'Cancelled',   color: '#6b7280' },
    { label: 'Pass',        value: 'Pass',        color: '#10b981' },
    { label: 'Fail',        value: 'Fail',        color: '#ef4444' },
  ],
  qa_engineers: [],
  priority: [
    { label: 'Critical', value: 'Critical', color: '#ef4444' },
    { label: 'High',     value: 'High',     color: '#f97316' },
    { label: 'Medium',   value: 'Medium',   color: '#3b82f6' },
    { label: 'Low',      value: 'Low',      color: '#10b981' },
  ],
  is_qa_miss: [
    { label: 'Yes',            value: 'Yes' },
    { label: 'No',             value: 'No' },
    { label: 'Under Review',   value: 'Under Review' },
    { label: 'Not Applicable', value: 'Not Applicable' },
  ],
}

function isUUID(val?: string | null): boolean {
  if (!val) return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val)
}

// ── Fetch all dropdown configs for a project ──────────────────────────────────

export async function fetchProjectDropdownConfigs(
  projectId: string
): Promise<ProjectDropdownOption[]> {
  if (!isUUID(projectId)) return []

  const { data, error } = await supabase
    .from('project_dropdown_configs')
    .select('*')
    .eq('project_id', projectId)
    .order('sort_order', { ascending: true })

  if (error) {
    console.warn('[projectDropdownService] fetchProjectDropdownConfigs error:', error)
    return []
  }

  return (data || []) as ProjectDropdownOption[]
}

// ── Fetch configs for a specific category, with default seed fallback ─────────

export async function fetchProjectDropdownsByCategory(
  projectId: string,
  category: ProjectDropdownCategory
): Promise<ProjectDropdownOption[]> {
  if (!isUUID(projectId)) return []

  const { data, error } = await supabase
    .from('project_dropdown_configs')
    .select('*')
    .eq('project_id', projectId)
    .eq('category', category)
    .eq('is_active', true)
    .order('sort_order', { ascending: true })

  if (error) {
    console.warn('[projectDropdownService] fetchProjectDropdownsByCategory error:', error)
    return []
  }

  return (data || []) as ProjectDropdownOption[]
}

function buildDefaults(projectId: string, category: ProjectDropdownCategory): ProjectDropdownOption[] {
  return (DEFAULT_SEEDS[category] || []).map((item, idx) => ({
    id: `default-${category}-${idx}`,
    project_id: projectId,
    category,
    label: item.label,
    value: item.value,
    color: item.color || null,
    is_active: true,
    sort_order: idx + 1,
  }))
}

// ── Add a new dropdown value ──────────────────────────────────────────────────

export async function addProjectDropdownOption(
  projectId: string,
  category: ProjectDropdownCategory,
  label: string,
  color?: string
): Promise<ProjectDropdownOption> {
  if (!isUUID(projectId)) throw new Error('Invalid project ID')
  const trimmedLabel = label.trim()
  if (!trimmedLabel) throw new Error('Label cannot be empty')

  const { data: existing } = await supabase
    .from('project_dropdown_configs')
    .select('id')
    .eq('project_id', projectId)
    .eq('category', category)
    .ilike('value', trimmedLabel)
    .maybeSingle()

  if (existing) throw new Error(`"${trimmedLabel}" already exists in this category`)

  const { data: maxRow } = await supabase
    .from('project_dropdown_configs')
    .select('sort_order')
    .eq('project_id', projectId)
    .eq('category', category)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = ((maxRow as any)?.sort_order ?? 0) + 1

  const { data, error } = await supabase
    .from('project_dropdown_configs')
    .insert({
      project_id: projectId,
      category,
      label: trimmedLabel,
      value: trimmedLabel,
      color: color || null,
      is_active: true,
      sort_order: nextOrder,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as ProjectDropdownOption
}

// ── Update an existing dropdown value ────────────────────────────────────────

export async function updateProjectDropdownOption(
  id: string,
  projectId: string,
  updates: { label?: string; color?: string | null; is_active?: boolean; sort_order?: number }
): Promise<ProjectDropdownOption> {
  if (!isUUID(id)) throw new Error('Invalid option ID')

  if (updates.label !== undefined) {
    const trimmed = updates.label.trim()
    if (!trimmed) throw new Error('Label cannot be empty')

    const { data: catRow } = await supabase
      .from('project_dropdown_configs')
      .select('category')
      .eq('id', id)
      .single()

    const { data: dup } = await supabase
      .from('project_dropdown_configs')
      .select('id')
      .eq('project_id', projectId)
      .eq('category', catRow?.category)
      .ilike('value', trimmed)
      .neq('id', id)
      .maybeSingle()

    if (dup) throw new Error(`"${trimmed}" already exists in this category`)
    updates = { ...updates, label: trimmed }
  }

  const payload: any = { updated_at: new Date().toISOString() }
  if (updates.label !== undefined) { payload.label = updates.label; payload.value = updates.label }
  if (updates.color !== undefined) payload.color = updates.color
  if (updates.is_active !== undefined) payload.is_active = updates.is_active
  if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order

  const { data, error } = await supabase
    .from('project_dropdown_configs')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as ProjectDropdownOption
}

// ── Delete a dropdown value ───────────────────────────────────────────────────

export async function deleteProjectDropdownOption(id: string): Promise<void> {
  if (!isUUID(id)) throw new Error('Invalid option ID')
  const { error } = await supabase
    .from('project_dropdown_configs')
    .delete()
    .eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Seed defaults for a newly created project ─────────────────────────────────

export async function seedProjectDropdownDefaults(projectId: string): Promise<void> {
  if (!isUUID(projectId)) return

  const rows: any[] = []
  for (const [category, seeds] of Object.entries(DEFAULT_SEEDS)) {
    seeds.forEach((item, idx) => {
      rows.push({
        project_id: projectId,
        category,
        label: item.label,
        value: item.value,
        color: item.color || null,
        is_active: true,
        sort_order: idx + 1,
      })
    })
  }

  if (rows.length === 0) return

  const { error } = await supabase
    .from('project_dropdown_configs')
    .upsert(rows, { onConflict: 'project_id,category,lower(value)', ignoreDuplicates: true })

  if (error) console.warn('[projectDropdownService] seedProjectDropdownDefaults error:', error)
}
