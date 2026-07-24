import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import { useColumnConfigStore } from './columnConfigStore'
import type { SupportLogRecord, ReleaseTestingRecord, DropdownConfig, ConfigCategory, ColumnConfig } from './types'

// Default seed values for dropdown configs in case database fetching fails or is not setup yet
const DEFAULT_CONFIGS: Omit<DropdownConfig, 'id'>[] = [
  { category: 'branch', value: 'main', is_active: true, sort_order: 1 },
  { category: 'branch', value: 'develop', is_active: true, sort_order: 2 },
  { category: 'branch', value: 'release/v2.4', is_active: true, sort_order: 3 },
  { category: 'branch', value: 'feature/auth', is_active: true, sort_order: 4 },
  { category: 'qa', value: 'Ameen S.', is_active: true, sort_order: 1 },
  { category: 'qa', value: 'Sarah Jenkins', is_active: true, sort_order: 2 },
  { category: 'qa', value: 'Michael Ross', is_active: true, sort_order: 3 },
  { category: 'qa', value: 'Emily Taylor', is_active: true, sort_order: 4 },
  { category: 'testing_status', value: 'Passed', is_active: true, sort_order: 1 },
  { category: 'testing_status', value: 'Failed', is_active: true, sort_order: 2 },
  { category: 'testing_status', value: 'Blocked', is_active: true, sort_order: 3 },
  { category: 'testing_status', value: 'In Progress', is_active: true, sort_order: 4 },
  { category: 'testing_status', value: 'Pending', is_active: true, sort_order: 5 },
  { category: 'testing_status', value: 'Not Executed', is_active: true, sort_order: 6 },
  { category: 'retesting_status', value: 'Open', is_active: true, sort_order: 1 },
  { category: 'retesting_status', value: 'Retesting', is_active: true, sort_order: 2 },
  { category: 'retesting_status', value: 'Fixed', is_active: true, sort_order: 3 },
  { category: 'retesting_status', value: 'Closed', is_active: true, sort_order: 4 },
  { category: 'smoke_status', value: 'Pass', is_active: true, sort_order: 1 },
  { category: 'smoke_status', value: 'Fail', is_active: true, sort_order: 2 },
  { category: 'smoke_status', value: 'Blocked', is_active: true, sort_order: 3 },
  { category: 'smoke_status', value: 'Not Executed', is_active: true, sort_order: 4 },
  { category: 'issue_source', value: 'Internal Testing', is_active: true, sort_order: 1 },
  { category: 'issue_source', value: 'Customer Report', is_active: true, sort_order: 2 },
  { category: 'issue_source', value: 'Production', is_active: true, sort_order: 3 },
  { category: 'issue_source', value: 'Staging', is_active: true, sort_order: 4 },
  { category: 'priority', value: 'Critical', is_active: true, sort_order: 1 },
  { category: 'priority', value: 'High', is_active: true, sort_order: 2 },
  { category: 'priority', value: 'Medium', is_active: true, sort_order: 3 },
  { category: 'priority', value: 'Low', is_active: true, sort_order: 4 },
]

interface DailyReportState {
  supportRows: SupportLogRecord[]
  releaseRows: ReleaseTestingRecord[]
  dropdownConfigs: DropdownConfig[]
  loading: boolean
  syncing: boolean
  isDbAvailable: boolean
  syncStatus: 'synced' | 'saving' | 'local' | 'error'
  selectedProjectId: string
  projects: Array<{ id: string; project_name: string; project_code: string }>
  projectMembers: string[] // Array of user IDs who are members of the selected project
  userProjectRole: 'owner' | 'lead' | 'member' | 'viewer' | null // Current user's role in selected project
  isProjectViewer: boolean // Quick check if user is a viewer (read-only)
  deletedRowIds: string[] // Track row IDs that need to be deleted from database

  // Actions
  fetchDropdownConfigs: () => Promise<void>
  saveDropdownConfig: (config: Omit<DropdownConfig, 'id'> & { id?: string }) => Promise<void>
  deleteDropdownConfig: (id: string) => Promise<void>
  reorderDropdownConfigs: (category: ConfigCategory, configs: DropdownConfig[]) => Promise<void>

  fetchProjects: () => Promise<void>
  /** @internal actual fetchProjects body — do not call directly, use fetchProjects() which single-flights it */
  _fetchProjectsImpl: () => Promise<void>
  setSelectedProjectId: (projectId: string) => Promise<void>
  fetchProjectMembers: (projectId: string) => Promise<void>
  fetchUserProjectRole: (projectId: string) => Promise<void>
  fetchReportRows: () => Promise<void>
  setSupportRows: (rows: SupportLogRecord[], forceSync?: boolean) => Promise<void>
  setReleaseRows: (rows: ReleaseTestingRecord[], forceSync?: boolean) => Promise<void>
  syncRowsToDatabase: () => Promise<void>
  overdueOnlyFilter: boolean
  setOverdueOnlyFilter: (val: boolean) => void
  markRowsForDeletion: (rowIds: string[], tableName: 'support' | 'release') => void
}

// Debounce helper for database syncing
let syncTimeout: any = null

// Monotonic counter guarding fetchReportRows against out-of-order network
// responses. If two calls overlap (e.g. a stray extra caller races the
// members/role-sequenced call in setSelectedProjectId), whichever request's
// response arrives LAST would otherwise win regardless of which one was
// actually started last — including an earlier call that ran with
// stale/incomplete project-member filters and resolves with an empty or
// wrong result AFTER the correct one already populated the rows. Each call
// captures the counter value at its start and only commits its result if
// that value is still current by the time it resolves.
let reportRowsFetchSeq = 0

// Single-flight guard for fetchProjects. React 18 StrictMode intentionally
// double-invokes effects in development (mount → cleanup → mount again),
// which fires two back-to-back fetchProjects() calls with no await between
// them — harmless in production (StrictMode's double-invoke is dev-only),
// but in dev it doubles every query, doubles the auto-select side effect,
// and clutters the console. If a call is already in flight, later callers
// just await the same promise instead of starting a redundant one.
let fetchProjectsInFlight: Promise<void> | null = null

// Looks up a system column's currently-resolved option list (Project →
// Organization Default, same resolution the table itself uses) by its
// internal_key. Returns null if the column isn't option-based / not found,
// in which case the caller skips validation for that field entirely rather
// than false-flagging it — this mirrors the old "dropdownConfigs has no
// rows for this category yet" graceful-degradation behavior.
const getColumnOptionValues = (tableKey: 'support' | 'release', internalKey: string): string[] | null => {
  const columns = useColumnConfigStore.getState().getColumns(tableKey)
  const col = columns.find(c => c.internal_key === internalKey)
  if (!col || !col.dropdown_options || col.dropdown_options.length === 0) return null
  return col.dropdown_options.map(o => o.label.toLowerCase())
}

// Helper function to validate rows and add errors property. Dropdown/status
// values are now validated against each system column's own dropdown_options
// (Customize Columns drawer) instead of the centralized
// daily_report_dropdown_configs table — see migration 057.
const validateSupportRow = (row: SupportLogRecord): SupportLogRecord => {
  const rowErrors: string[] = []

  const branches = getColumnOptionValues('support', 'branch')
  const qas = getColumnOptionValues('support', 'qa')
  const testingStatuses = getColumnOptionValues('support', 'testing_status')
  const retestingStatuses = getColumnOptionValues('support', 'retesting_status')
  const issueSources = getColumnOptionValues('support', 'issue_source')

  if (row.branch && branches && !branches.includes(row.branch.toLowerCase())) {
    rowErrors.push(`Branch '${row.branch}' is not configured.`)
  }
  if (row.qa && qas && !qas.includes(row.qa.toLowerCase())) {
    rowErrors.push(`QA '${row.qa}' is not configured.`)
  }
  if (row.testing_status && testingStatuses && !testingStatuses.includes(row.testing_status.toLowerCase())) {
    rowErrors.push(`Testing Status '${row.testing_status}' is not configured.`)
  }
  if (row.retesting_status && retestingStatuses && !retestingStatuses.includes(row.retesting_status.toLowerCase())) {
    rowErrors.push(`Retesting Status '${row.retesting_status}' is not configured.`)
  }
  if (row.issue_source && issueSources && !issueSources.includes(row.issue_source.toLowerCase())) {
    rowErrors.push(`Issue Source '${row.issue_source}' is not configured.`)
  }

  if (rowErrors.length > 0) {
    return { ...row, errors: rowErrors } as any
  }

  return row
}

const validateReleaseRow = (row: ReleaseTestingRecord): ReleaseTestingRecord => {
  const rowErrors: string[] = []

  const qas = getColumnOptionValues('release', 'qa')
  const testingStatuses = getColumnOptionValues('release', 'testing_status')
  const smokeStatuses = getColumnOptionValues('release', 'smoke_testing_status')

  if (row.qa && qas && !qas.includes(row.qa.toLowerCase())) {
    rowErrors.push(`QA '${row.qa}' is not configured.`)
  }
  if (row.testing_status && testingStatuses && !testingStatuses.includes(row.testing_status.toLowerCase())) {
    rowErrors.push(`Testing Status '${row.testing_status}' is not configured.`)
  }
  if (row.smoke_testing_status && smokeStatuses && !smokeStatuses.includes(row.smoke_testing_status.toLowerCase())) {
    rowErrors.push(`Smoke Status '${row.smoke_testing_status}' is not configured.`)
  }

  if (rowErrors.length > 0) {
    return { ...row, errors: rowErrors } as any
  }

  return row
}

export const useDailyReportStore = create<DailyReportState>((set, get) => ({
  supportRows: [],
  releaseRows: [],
  dropdownConfigs: [],
  loading: false,
  syncing: false,
  isDbAvailable: true,
  syncStatus: 'synced',
  overdueOnlyFilter: false,
  selectedProjectId: '',
  projects: [],
  projectMembers: [],
  userProjectRole: null,
  isProjectViewer: false,
  deletedRowIds: [],

  setOverdueOnlyFilter: (val: boolean) => set({ overdueOnlyFilter: val }),
  setSelectedProjectId: async (projectId: string) => {
    set({ selectedProjectId: projectId })
    if (projectId) {
      // CRITICAL FIX: Fetch members and role FIRST, then fetch data
      // This ensures projectMembers and userProjectRole are available
      // before fetchReportRows() uses them for filtering
      console.log('[DailyReportStore] Project selected:', projectId)

      // Wait for both member and role fetches to complete
      await Promise.all([
        get().fetchProjectMembers(projectId),
        get().fetchUserProjectRole(projectId)
      ])

      console.log('[DailyReportStore] Members and role loaded, fetching data...')
      console.log('[DailyReportStore] Project members count:', get().projectMembers.length)
      console.log('[DailyReportStore] User project role:', get().userProjectRole)

      // Now fetch the actual report rows with correct filters
      await get().fetchReportRows()
    } else {
      // No project selected - clear everything
      console.log('[DailyReportStore] Project deselected - clearing data')
      set({
        supportRows: [],
        releaseRows: [],
        projectMembers: [],
        userProjectRole: null,
        isProjectViewer: false,
        syncStatus: 'synced'
      })
      // Clear localStorage
      localStorage.removeItem('flux-daily-support-rows')
      localStorage.removeItem('flux-daily-release-rows')
    }
  },

  fetchProjects: async () => {
    if (fetchProjectsInFlight) return fetchProjectsInFlight
    fetchProjectsInFlight = get()._fetchProjectsImpl().finally(() => {
      fetchProjectsInFlight = null
    })
    return fetchProjectsInFlight
  },

  _fetchProjectsImpl: async () => {
    try {
      const user = useAppStore.getState().user
      const role = useAppStore.getState().role

      console.log('[DailyReportStore] fetchProjects called')
      console.log('[DailyReportStore] User ID:', user?.id)
      console.log('[DailyReportStore] User Role:', role)

      if (!user) {
        console.log('[DailyReportStore] No user found, returning empty projects')
        set({ projects: [] })
        return
      }

      // Layer 1: Database-level filtering - only fetch projects where user is a member.
      // Exception: only true admins (admin/super_admin) see every active project —
      // this matches is_admin() being the sole unrestricted-visibility bypass left in
      // the projects/project_members RLS policies as of migration 051.
      //
      // ⚠️ 'manager' was previously grouped into this "see everything" bucket, and any
      // project the manager wasn't an actual member of had its role fabricated as a
      // fallback 'member' below. That contradicts migration 051, which scoped manager
      // visibility to ONLY projects they created (is_project_creator) or are a real
      // project_members row for (is_project_member) — everything else is invisible to
      // them at the database level too, so the fabricated 'member' badge was pure
      // frontend fiction: it made a manager's Settings page list projects they have
      // zero actual access to, with a role they don't actually hold. Managers now use
      // the same membership + creator query as regular users below.
      const isSuperAdmin = role === 'admin' || role === 'super_admin'

      console.log('[DailyReportStore] Is Super Admin?', isSuperAdmin)

      let data: any[] = []
      let error: any = null

      if (isSuperAdmin) {
        // Admins and super_admins see all active projects
        console.log('[DailyReportStore] Fetching as admin - all active projects')
        const response = await supabase
          .from('projects')
          .select('id, name, project_code')
          .eq('status', 'active')
          .order('name', { ascending: true })

        data = response.data || []
        error = response.error
        console.log('[DailyReportStore] Admin query result:', { data, error })
      } else {
        // Everyone else (manager, qa_lead, and other roles) only sees projects they're
        // an actual project_members row for, PLUS any project they created but aren't
        // (or are no longer) a member row for — mirroring is_project_member(id) OR
        // is_project_creator(id) from the projects_select / project_members_select RLS
        // policies (migration 051) exactly, instead of a hardcoded role allowlist.
        console.log('[DailyReportStore] Fetching as regular user - membership + creator query')

        const [memberResponse, creatorResponse] = await Promise.all([
          supabase
            .from('project_members')
            .select(`
              project_id,
              project_role,
              projects!inner (
                id,
                name,
                project_code,
                status
              )
            `)
            .eq('user_id', user.id)
            .eq('projects.status', 'active'),
          supabase
            .from('projects')
            .select('id, name, project_code')
            .eq('status', 'active')
            .eq('created_by', user.id),
        ])

console.log('[DailyReportStore] Membership query response:', memberResponse)
        console.log('[DailyReportStore] Created-by query response:', creatorResponse)


        const byId = new Map<string, any>()

if (memberResponse.data) {
          for (const item of memberResponse.data as any[]) {
            byId.set(item.projects.id, {
              id: item.projects.id,
              name: item.projects.name,
              project_code: item.projects.project_code,
              project_role: item.project_role,
            })
          }

        }

        // Projects created by this user that don't already have a member-row entry
        // (e.g. their own membership row was removed later) still show up, without a
        // fabricated role — default to 'owner' since project creation auto-assigns
        // ownership (see createProject() in projectService.ts) and this only fires
        // for the edge case where that original ownership row is gone.
        if (creatorResponse.data) {
          for (const p of creatorResponse.data as any[]) {
            if (!byId.has(p.id)) {
              byId.set(p.id, { id: p.id, name: p.name, project_code: p.project_code, project_role: 'owner' })
            }
          }
        }

        data = Array.from(byId.values())
        error = memberResponse.error || creatorResponse.error
        console.log('[DailyReportStore] Merged membership+creator data:', data)
      }

      if (error) {
        console.error('[DailyReportStore] Database error:', error)
        throw error
      }

      if (data) {
        const mapped = data.map(p => ({
          id: p.id,
          project_name: p.name,
          project_code: p.project_code
        }))
        console.log('[DailyReportStore] Final mapped projects:', mapped)
        set({ projects: mapped })

        // Auto-select first project if available and none selected
        const currentProjectId = get().selectedProjectId
        if (!currentProjectId && mapped.length > 0) {
          console.log('[DailyReportStore] Auto-selecting first project:', mapped[0].id)
          await get().setSelectedProjectId(mapped[0].id)
        } else if (currentProjectId && !mapped.find(p => p.id === currentProjectId)) {
          // Layer 2: If currently selected project is not in user's list, clear selection
          console.log('[DailyReportStore] Current project not in list, clearing selection')
          await get().setSelectedProjectId('')
        }
      }
    } catch (e) {
      console.error('[DailyReportStore] Failed to fetch projects:', e)
      set({ projects: [] })
    }
  },

  fetchProjectMembers: async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('project_members')
        .select('user_id')
        .eq('project_id', projectId)

      if (error) throw error
      if (data) {
        const memberIds = data.map(m => m.user_id)
        set({ projectMembers: memberIds })
      }
    } catch (e) {
      console.error('[DailyReportStore] Failed to fetch project members:', e)
      set({ projectMembers: [] })
    }
  },

  fetchUserProjectRole: async (projectId: string) => {
    try {
      const user = useAppStore.getState().user
      if (!user || !projectId) {
        set({ userProjectRole: null, isProjectViewer: false })
        return
      }

      const { data, error } = await supabase
        .from('project_members')
        .select('project_role')
        .eq('project_id', projectId)
        .eq('user_id', user.id)
        .single()

      if (error) {
        console.error('[DailyReportStore] Failed to fetch user project role:', error)
        set({ userProjectRole: null, isProjectViewer: false })
        return
      }

      if (data) {
        const role = data.project_role as 'owner' | 'lead' | 'member' | 'viewer'
        const isViewer = role === 'viewer'

        console.log('[DailyReportStore] User project role:', role, 'isViewer:', isViewer)
        set({ userProjectRole: role, isProjectViewer: isViewer })
      } else {
        set({ userProjectRole: null, isProjectViewer: false })
      }
    } catch (e) {
      console.error('[DailyReportStore] Failed to fetch user project role:', e)
      set({ userProjectRole: null, isProjectViewer: false })
    }
  },

  fetchDropdownConfigs: async () => {
    set({ loading: true })
    try {
      const { data, error } = await supabase
        .from('daily_report_dropdown_configs')
        .select('*')
        .order('sort_order', { ascending: true })

      if (error || !data || data.length === 0) {
        // Use seed values with temporary IDs
        const seeded: DropdownConfig[] = DEFAULT_CONFIGS.map((c, i) => ({
          ...c,
          id: `seed-${c.category}-${i}`
        }))
        set({ dropdownConfigs: seeded, isDbAvailable: !error })
      } else {
        set({ dropdownConfigs: data as DropdownConfig[], isDbAvailable: true })
      }
    } catch (e) {
      console.warn('[DailyReportStore] Failed to fetch configs, using fallback seed data.', e)
      const seeded: DropdownConfig[] = DEFAULT_CONFIGS.map((c, i) => ({
        ...c,
        id: `seed-${c.category}-${i}`
      }))
      set({ dropdownConfigs: seeded, isDbAvailable: false })
    } finally {
      set({ loading: false })
    }
  },

  saveDropdownConfig: async (config) => {
    const user = useAppStore.getState().user
    // Check if this is a real database record (not seed or local)
    const isEdit = !!config.id && !config.id.startsWith('seed-') && !config.id.startsWith('local-')

    if (get().isDbAvailable && user) {
      const payload: any = {
        category: config.category,
        value: config.value,
        is_active: config.is_active,
        sort_order: config.sort_order,
        updated_by: user.id,
        updated_at: new Date().toISOString()
      }

      if (isEdit) {
        payload.id = config.id
      } else {
        payload.created_by = user.id
        payload.created_at = new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('daily_report_dropdown_configs')
        .upsert(payload)
        .select()

      if (error) {
        console.error('[DailyReportStore] saveDropdownConfig failed:', String(error).replace(/[\r\n]/g, ' '))
        throw error
      }

      // If we successfully saved to the database, update the local state with the database record
      if (data && data.length > 0) {
        set((state) => {
          let nextConfigs = [...state.dropdownConfigs]
          if (isEdit) {
            // Update existing database record
            nextConfigs = nextConfigs.map(c => c.id === config.id ? data[0] as DropdownConfig : c)
          } else {
            // Replace local/seed record with database record
            if (config.id) {
              nextConfigs = nextConfigs.map(c => c.id === config.id ? data[0] as DropdownConfig : c)
            } else {
              nextConfigs.push(data[0] as DropdownConfig)
            }
          }
          return { dropdownConfigs: nextConfigs.sort((a, b) => a.sort_order - b.sort_order) }
        })
        return
      }
    }

    // Fallback: Update local state only (when DB is not available or insert/update failed)
    set((state) => {
      let nextConfigs = [...state.dropdownConfigs]
      if (config.id && (isEdit || config.id.startsWith('seed-') || config.id.startsWith('local-'))) {
        nextConfigs = nextConfigs.map(c => c.id === config.id ? { ...c, ...config } as DropdownConfig : c)
      } else {
        const newConfig: DropdownConfig = {
          ...config,
          id: config.id || `local-${config.category}-${Math.random().toString(36).substr(2, 9)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
        nextConfigs.push(newConfig)
      }
      return { dropdownConfigs: nextConfigs.sort((a, b) => a.sort_order - b.sort_order) }
    })
  },

  deleteDropdownConfig: async (id) => {
    if (get().isDbAvailable && !id.startsWith('seed-') && !id.startsWith('local-')) {
      const { error } = await supabase
        .from('daily_report_dropdown_configs')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('[DailyReportStore] deleteDropdownConfig failed:', String(error).replace(/[\r\n]/g, ' '))
        throw error
      }
    }

    set((state) => ({
      dropdownConfigs: state.dropdownConfigs.filter(c => c.id !== id)
    }))
  },

  reorderDropdownConfigs: async (category, configs) => {
    // Reassign sort orders
    const updated = configs.map((c, i) => ({ ...c, sort_order: i + 1 }))

    // Update locally
    set((state) => ({
      dropdownConfigs: state.dropdownConfigs
        .filter(c => c.category !== category)
        .concat(updated)
        .sort((a, b) => a.sort_order - b.sort_order)
    }))

    // Sync database orders
    if (get().isDbAvailable) {
      const user = useAppStore.getState().user
      if (user) {
        try {
          const promises = updated
            .filter(c => !c.id.startsWith('seed-') && !c.id.startsWith('local-'))
            .map(c => supabase
              .from('daily_report_dropdown_configs')
              .update({ sort_order: c.sort_order, updated_by: user.id })
              .eq('id', c.id)
            )
          await Promise.all(promises)
        } catch (e) {
          console.error('[DailyReportStore] Failed to update sort orders in database:', e)
        }
      }
    }
  },

  fetchReportRows: async () => {
    // Captured once at the start of this call — see reportRowsFetchSeq above.
    const seq = ++reportRowsFetchSeq
    set({ loading: true })
    const user = useAppStore.getState().user
    const role = useAppStore.getState().role
    const selectedProjectId = get().selectedProjectId
    const projectMembers = get().projectMembers

    // ⚠️ CRITICAL FIX: If no project selected, clear data and return
    if (!selectedProjectId) {
      console.log('[DailyReportStore] No project selected - clearing report rows')
      set({
        supportRows: [],
        releaseRows: [],
        loading: false,
        syncStatus: 'synced',
        projectMembers: [],
        userProjectRole: null,
        isProjectViewer: false
      })
      // Clear localStorage to prevent stale data
      localStorage.removeItem('flux-daily-support-rows')
      localStorage.removeItem('flux-daily-release-rows')
      return
    }

    // Check if there are unsaved changes BEFORE loading localStorage
    const currentSyncStatus = get().syncStatus
    const hasUnsavedChanges = currentSyncStatus === 'saving' || currentSyncStatus === 'local' || currentSyncStatus === 'error'

    // Only load localStorage if there are unsaved changes
    // This prevents "flash" of stale/unfiltered data from appearing
    // CRITICAL: Include 'error' status to prevent data loss after failed sync (e.g., validation warnings)
    if (hasUnsavedChanges) {
      const localSupport = localStorage.getItem('flux-daily-support-rows')
      const localRelease = localStorage.getItem('flux-daily-release-rows')

      if (localSupport) set({ supportRows: JSON.parse(localSupport) })
      if (localRelease) set({ releaseRows: JSON.parse(localRelease) })
    }

    if (user) {
      try {
        // Determine data visibility based on:
        // 1. System role (admin, manager, qa_lead, etc.)
        // 2. Project role (owner, lead, member, viewer)
        //
        // VISIBILITY RULES:
        // - Admins/Managers/QA Leads: See all project member data
        // - Project members (including viewers): See all project member data
        // - Non-team roles without project membership: See only own data

        const teamRoles = ['manager', 'qa_lead', 'admin', 'super_admin']
        const isTeamRole = teamRoles.includes(role)
        const userProjectRole = get().userProjectRole

        const supportQuery = supabase
          .from('daily_support_logs')
          .select('*')
          .order('sort_order', { ascending: true })
        const releaseQuery = supabase
          .from('daily_release_testing_status')
          .select('*')
          .order('sort_order', { ascending: true })

        // Filter by project if selected
        if (selectedProjectId) {
          supportQuery.eq('project_id', selectedProjectId)
          releaseQuery.eq('project_id', selectedProjectId)
        }

        // CRITICAL FIX: Check if user has a project role (viewer, member, lead, owner)
        // If they have ANY project role, they should see all project member data
        const hasProjectRole = userProjectRole !== null && ['viewer', 'member', 'lead', 'owner'].includes(userProjectRole)

        // For team roles OR project members (including viewers), show all project member data
        if ((isTeamRole || hasProjectRole) && projectMembers.length > 0) {
          console.log('[DailyReportStore] Showing all project member data (role:', role, 'projectRole:', userProjectRole, ')')
          supportQuery.in('user_id', projectMembers)
          releaseQuery.in('user_id', projectMembers)
        } else if (!isTeamRole && !hasProjectRole) {
          // Only filter by user_id for users without team role or project membership
          console.log('[DailyReportStore] Showing only own data (no team/project role)')
          supportQuery.eq('user_id', user.id)
          releaseQuery.eq('user_id', user.id)
        }

        const [supportRes, releaseRes] = await Promise.all([supportQuery, releaseQuery])

        // A newer fetchReportRows() call has started since this one began —
        // discard this response entirely rather than let an out-of-order
        // network reply stomp the latest (correct) data with stale or
        // wrongly-filtered rows.
        if (seq !== reportRowsFetchSeq) return

        // Only update from database if there are no unsaved changes
        if (!hasUnsavedChanges) {
          if (!supportRes.error) {
            const dbSupportRows = (supportRes.data || []) as SupportLogRecord[]
            // Re-validate rows to add errors property for unconfigured values
            const validatedRows = dbSupportRows.map(row => validateSupportRow(row))
            set({ supportRows: validatedRows })

            // ⚠️ Don't write to localStorage for viewers (read-only, no sync needed)
            if (!get().isProjectViewer) {
              localStorage.setItem('flux-daily-support-rows', JSON.stringify(validatedRows))
            }
          }

          if (!releaseRes.error) {
            const dbReleaseRows = (releaseRes.data || []) as ReleaseTestingRecord[]
            // Re-validate rows to add errors property for unconfigured values
            const validatedRows = dbReleaseRows.map(row => validateReleaseRow(row))
            set({ releaseRows: validatedRows })

            // ⚠️ Don't write to localStorage for viewers (read-only, no sync needed)
            if (!get().isProjectViewer) {
              localStorage.setItem('flux-daily-release-rows', JSON.stringify(validatedRows))
            }
          }
        } else {
          console.log('[DailyReportStore] Skipping database overwrite - unsaved changes detected')
        }

        set({ isDbAvailable: true, syncStatus: hasUnsavedChanges ? currentSyncStatus : 'synced' })
      } catch (e) {
        if (seq !== reportRowsFetchSeq) return
        console.warn('[DailyReportStore] Failed to fetch report rows from database, working in Local Draft Mode.', e)
        set({ isDbAvailable: false, syncStatus: 'local' })
      } finally {
        // Only the most recent call is allowed to clear the loading flag —
        // if a stale call's response happens to resolve while a newer call
        // is still in flight, leave `loading: true` so the UI keeps showing
        // the loading state until the ACTIVE fetch actually finishes.
        if (seq === reportRowsFetchSeq) set({ loading: false })
      }
    } else {
      if (seq === reportRowsFetchSeq) set({ loading: false, syncStatus: 'local' })
    }
  },

  setSupportRows: async (rows, forceSync = false) => {
    // ⚠️ CRITICAL: Viewers cannot modify data (read-only)
    if (get().isProjectViewer) {
      console.warn('[DailyReportStore] Viewer mode - cannot modify support rows (read-only)')
      return
    }

    // Track which rows were deleted (have real UUIDs and are no longer in the new rows array)
    const currentRows = get().supportRows
    const currentIds = new Set(currentRows.map(r => r.id).filter(id => !id.startsWith('temp-')))
    const newIds = new Set(rows.map(r => r.id).filter(id => !id.startsWith('temp-')))

    // Find IDs that were in current but not in new = deleted rows
    const deletedIds = Array.from(currentIds).filter(id => !newIds.has(id))

    if (deletedIds.length > 0) {
      console.log('[DailyReportStore] Rows marked for deletion:', deletedIds)
    }

    set({
      supportRows: rows,
      syncStatus: 'saving',
      deletedRowIds: deletedIds.length > 0 ? deletedIds : []
    })
    localStorage.setItem('flux-daily-support-rows', JSON.stringify(rows))

    if (forceSync) {
      await get().syncRowsToDatabase()
    } else {
      // Trigger debounced save
      if (syncTimeout) clearTimeout(syncTimeout)
      syncTimeout = setTimeout(() => {
        get().syncRowsToDatabase()
      }, 3000)
    }
  },

  setReleaseRows: async (rows, forceSync = false) => {
    // ⚠️ CRITICAL: Viewers cannot modify data (read-only)
    if (get().isProjectViewer) {
      console.warn('[DailyReportStore] Viewer mode - cannot modify release rows (read-only)')
      return
    }

    // Track which rows were deleted (have real UUIDs and are no longer in the new rows array)
    const currentRows = get().releaseRows
    const currentIds = new Set(currentRows.map(r => r.id).filter(id => !id.startsWith('temp-')))
    const newIds = new Set(rows.map(r => r.id).filter(id => !id.startsWith('temp-')))

    // Find IDs that were in current but not in new = deleted rows
    const deletedIds = Array.from(currentIds).filter(id => !newIds.has(id))

    if (deletedIds.length > 0) {
      console.log('[DailyReportStore] Release rows marked for deletion:', deletedIds)
    }

    set({
      releaseRows: rows,
      syncStatus: 'saving',
      deletedRowIds: deletedIds.length > 0 ? deletedIds : []
    })
    localStorage.setItem('flux-daily-release-rows', JSON.stringify(rows))

    if (forceSync) {
      await get().syncRowsToDatabase()
    } else {
      // Trigger debounced save
      if (syncTimeout) clearTimeout(syncTimeout)
      syncTimeout = setTimeout(() => {
        get().syncRowsToDatabase()
      }, 3000)
    }
  },

  syncRowsToDatabase: async () => {
    const user = useAppStore.getState().user
    const isProjectViewer = get().isProjectViewer

    // ⚠️ CRITICAL: Viewers cannot sync data to database (read-only access)
    if (isProjectViewer) {
      console.log('[DailyReportStore] Viewer mode - skipping database sync (read-only)')
      set({ syncStatus: 'synced', syncing: false })
      return
    }

    if (!user || !get().isDbAvailable) {
      set({ syncStatus: 'local' })
      return
    }

    set({ syncing: true, syncStatus: 'saving' })
    try {
      const selectedProjectId = get().selectedProjectId
      const deletedRowIds = get().deletedRowIds

      console.log('[DailyReportStore] Starting sync with project:', selectedProjectId)
      console.log('[DailyReportStore] Total rows to sync:', {
        support: get().supportRows.length,
        release: get().releaseRows.length,
        deletedRows: deletedRowIds.length
      })

      // STEP 1: Delete rows that were explicitly removed from state
      if (deletedRowIds.length > 0) {
        console.log('[DailyReportStore] Deleting rows:', deletedRowIds)

        // Delete from both tables (we don't know which table they belong to)
        // The DELETE will only affect rows that actually exist
        const deletePromises = [
          supabase
            .from('daily_support_logs')
            .delete()
            .in('id', deletedRowIds),
          supabase
            .from('daily_release_testing_status')
            .delete()
            .in('id', deletedRowIds)
        ]

        const deleteResults = await Promise.all(deletePromises)

        // Log any deletion errors (non-fatal)
        deleteResults.forEach((result, idx) => {
          const tableName = idx === 0 ? 'daily_support_logs' : 'daily_release_testing_status'
          if (result.error) {
            console.warn(`[DailyReportStore] Delete from ${tableName} had error:`, result.error)
          } else {
            console.log(`[DailyReportStore] Successfully deleted from ${tableName}`)
          }
        })

        // Clear the deletion tracking after processing
        set({ deletedRowIds: [] })
      }

      // STEP 2: UPSERT remaining rows (updates existing, inserts new)
      // ⚠️ CRITICAL: We need to handle rows differently based on whether they have real IDs
      // - Rows with real IDs (from DB): UPDATE via upsert
      // - Rows with temp IDs (new): INSERT via upsert
      // - All rows get updated sort_order

      const supportPayload = get().supportRows.map((r, i) => {
        const item: any = { ...r, sort_order: i + 1 }

        // Preserve original user_id if it exists (maintain row ownership)
        if (!item.user_id) {
          item.user_id = user.id // Assign current user for new rows
        }

        // Set project_id to currently selected project (critical for filtering!)
        if (selectedProjectId) {
          item.project_id = selectedProjectId
        }

        // ⚠️ CRITICAL FIX: Only delete temp IDs (new rows)
        // Keep real UUIDs so UPSERT can match and UPDATE existing rows
        // This prevents RLS violations when Members try to update other users' rows
        const hasRealId = item.id && !item.id.startsWith('temp-')

        if (!hasRealId) {
          // New row - delete temp ID so database generates UUID
          delete item.id
        }
        // else: Keep the real ID for UPSERT matching

        // Remove timestamp fields - let database generate these
        delete item.created_at
        delete item.updated_at

        // Remove obsolete team_id field
        delete item.team_id

        // Remove client-side validation errors property (not a DB column!)
        delete item.errors

        // Replace empty strings with null for numeric SQL columns
        if (item.tc_count === '') item.tc_count = null
        if (item.estimation_hrs === '') item.estimation_hrs = null
        if (item.blocked_hours === '') item.blocked_hours = null
        if (item.retesting_estimation_hrs === '') item.retesting_estimation_hrs = null

        // Replace empty strings with null for date columns too!
        if (item.received_date === '') item.received_date = null
        if (item.actual_start_date === '') item.actual_start_date = null
        if (item.planned_end_date === '') item.planned_end_date = null
        if (item.actual_end_date === '') item.actual_end_date = null

        // Remove any undefined values
        Object.keys(item).forEach(key => {
          if (item[key] === undefined) {
            delete item[key]
          }
        })

        return item
      })

      const releasePayload = get().releaseRows.map((r, i) => {
        const item: any = { ...r, sort_order: i + 1 }

        // Preserve original user_id if it exists (maintain row ownership)
        if (!item.user_id) {
          item.user_id = user.id // Assign current user for new rows
        }

        // Set project_id to currently selected project (critical for filtering!)
        if (selectedProjectId) {
          item.project_id = selectedProjectId
        }

        // ⚠️ CRITICAL FIX: Only delete temp IDs, keep real UUIDs
        const hasRealId = item.id && !item.id.startsWith('temp-')

        if (!hasRealId) {
          delete item.id
        }

        // Remove timestamp fields
        delete item.created_at
        delete item.updated_at

        // Remove obsolete team_id field
        delete item.team_id

        // Remove client-side validation errors property (not a DB column!)
        delete item.errors

        if (item.initial_round_estimation_hrs === '') item.initial_round_estimation_hrs = null
        if (item.smoke_testing_estimation_hrs === '') item.smoke_testing_estimation_hrs = null
        if (item.overall_estimation_hrs === '') item.overall_estimation_hrs = null

        // Remove any undefined values
        Object.keys(item).forEach(key => {
          if (item[key] === undefined) {
            delete item[key]
          }
        })

        return item
      })

      const insertPromises: any[] = []

      // ⚠️ CRITICAL FIX: Split into separate UPDATE and INSERT operations
      // UPSERT with onConflict checks BOTH INSERT and UPDATE RLS policies
      // This causes Members to fail when trying to update other users' rows
      // because INSERT policy requires: auth.uid() = user_id

      // Separate existing rows (have real IDs) from new rows (temp IDs)
      const existingSupportRows = supportPayload.filter(r => r.id && !r.id.startsWith('temp-'))
      const newSupportRows = supportPayload.filter(r => !r.id || r.id.startsWith('temp-'))

      const existingReleaseRows = releasePayload.filter(r => r.id && !r.id.startsWith('temp-'))
      const newReleaseRows = releasePayload.filter(r => !r.id || r.id.startsWith('temp-'))

      console.log('[DailyReportStore] Sync strategy:', {
        support: { existing: existingSupportRows.length, new: newSupportRows.length },
        release: { existing: existingReleaseRows.length, new: newReleaseRows.length }
      })

      // UPDATE existing rows (will pass UPDATE policy)
      // ⚠️ CRITICAL: Use individual UPDATE operations, NOT UPSERT
      // UPSERT checks INSERT policy even with onConflict, causing RLS violations
      if (existingSupportRows.length > 0) {
        // Batch update all existing rows
        const updatePromises = existingSupportRows.map(row =>
          supabase
            .from('daily_support_logs')
            .update(row)
            .eq('id', row.id)
            .select()
            .single()
        )
        insertPromises.push(Promise.all(updatePromises))
      }

      // INSERT new rows (will pass INSERT policy)
      if (newSupportRows.length > 0) {
        // Remove temp IDs from new rows
        const cleanedNewSupport = newSupportRows.map(r => {
          const clean = { ...r }
          if (clean.id && clean.id.startsWith('temp-')) {
            delete clean.id
          }
          return clean
        })

        insertPromises.push(
          supabase
            .from('daily_support_logs')
            .insert(cleanedNewSupport)
            .select()
        )
      }

      // UPDATE existing release rows
      // ⚠️ CRITICAL: Use individual UPDATE operations, NOT UPSERT
      if (existingReleaseRows.length > 0) {
        const updatePromises = existingReleaseRows.map(row =>
          supabase
            .from('daily_release_testing_status')
            .update(row)
            .eq('id', row.id)
            .select()
            .single()
        )
        insertPromises.push(Promise.all(updatePromises))
      }

      // INSERT new release rows
      if (newReleaseRows.length > 0) {
        const cleanedNewRelease = newReleaseRows.map(r => {
          const clean = { ...r }
          if (clean.id && clean.id.startsWith('temp-')) {
            delete clean.id
          }
          return clean
        })

        insertPromises.push(
          supabase
            .from('daily_release_testing_status')
            .insert(cleanedNewRelease)
            .select()
        )
      }

      const results = await Promise.all(insertPromises)

      // ⚠️ CRITICAL: Process results from split operations
      // Results array order matches insertPromises order:
      // [existingSupport, newSupport, existingRelease, newRelease] (if they exist)

      let hasErrors = false
      let resIdx = 0

      const stateUpdate: Partial<DailyReportState> = { syncing: false }

      // Collect all synced support rows (from both UPDATE and INSERT operations)
      const syncedSupportRows: SupportLogRecord[] = []

      // Process existing support rows UPDATE result
      if (existingSupportRows.length > 0) {
        const res = results[resIdx++]
        // res is now Promise.all result containing array of individual update results
        if (Array.isArray(res)) {
          const allData: SupportLogRecord[] = []
          let hasUpdateError = false

          res.forEach((singleRes, idx) => {
            if (singleRes.error) {
              console.error(`[DailyReportStore] Support row update failed (row ${idx}):`, singleRes.error)
              console.error('[DailyReportStore] Failed row:', JSON.stringify(existingSupportRows[idx], null, 2))
              hasUpdateError = true
            } else if (singleRes.data) {
              allData.push(singleRes.data as SupportLogRecord)
            }
          })

          if (hasUpdateError) {
            hasErrors = true
          } else {
            console.log('[DailyReportStore] Successfully updated', allData.length, 'existing support rows')
            syncedSupportRows.push(...allData)
          }
        }
      }

      // Process new support rows INSERT result
      if (newSupportRows.length > 0) {
        const res = results[resIdx++]
        if (res.error) {
          console.error('[DailyReportStore] New support logs insert failed:', res.error)
          console.error('[DailyReportStore] Failed payload sample:', JSON.stringify(newSupportRows[0], null, 2))
          hasErrors = true
        } else if (res.data) {
          console.log('[DailyReportStore] Successfully inserted', res.data.length, 'new support rows')
          syncedSupportRows.push(...(res.data as SupportLogRecord[]))
        }
      }

      // Update state with all synced support rows
      if (syncedSupportRows.length > 0) {
        // Validate and sort by sort_order
        const validatedRows = syncedSupportRows
          .map(row => validateSupportRow(row))
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

        stateUpdate.supportRows = validatedRows
        localStorage.setItem('flux-daily-support-rows', JSON.stringify(validatedRows))
      } else if (supportPayload.length === 0) {
        // No rows to sync - state already cleared
        stateUpdate.supportRows = []
        localStorage.setItem('flux-daily-support-rows', JSON.stringify([]))
        console.log('[DailyReportStore] No support rows to sync')
      }

      // Collect all synced release rows (from both UPDATE and INSERT operations)
      const syncedReleaseRows: ReleaseTestingRecord[] = []

      // Process existing release rows UPDATE result
      if (existingReleaseRows.length > 0) {
        const res = results[resIdx++]
        // res is now Promise.all result containing array of individual update results
        if (Array.isArray(res)) {
          const allData: ReleaseTestingRecord[] = []
          let hasUpdateError = false

          res.forEach((singleRes, idx) => {
            if (singleRes.error) {
              console.error(`[DailyReportStore] Release row update failed (row ${idx}):`, singleRes.error)
              console.error('[DailyReportStore] Failed row:', JSON.stringify(existingReleaseRows[idx], null, 2))
              hasUpdateError = true
            } else if (singleRes.data) {
              allData.push(singleRes.data as ReleaseTestingRecord)
            }
          })

          if (hasUpdateError) {
            hasErrors = true
          } else {
            console.log('[DailyReportStore] Successfully updated', allData.length, 'existing release rows')
            syncedReleaseRows.push(...allData)
          }
        }
      }

      // Process new release rows INSERT result
      if (newReleaseRows.length > 0) {
        const res = results[resIdx++]
        if (res.error) {
          console.error('[DailyReportStore] New release logs insert failed:', res.error)
          console.error('[DailyReportStore] Failed payload sample:', JSON.stringify(newReleaseRows[0], null, 2))
          hasErrors = true
        } else if (res.data) {
          console.log('[DailyReportStore] Successfully inserted', res.data.length, 'new release rows')
          syncedReleaseRows.push(...(res.data as ReleaseTestingRecord[]))
        }
      }

      // Update state with all synced release rows
      if (syncedReleaseRows.length > 0) {
        // Validate and sort by sort_order
        const validatedRows = syncedReleaseRows
          .map(row => validateReleaseRow(row))
          .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))

        stateUpdate.releaseRows = validatedRows
        localStorage.setItem('flux-daily-release-rows', JSON.stringify(validatedRows))
      } else if (releasePayload.length === 0) {
        // No rows to sync - state already cleared
        stateUpdate.releaseRows = []
        localStorage.setItem('flux-daily-release-rows', JSON.stringify([]))
        console.log('[DailyReportStore] No release rows to sync')
      }

      // Only mark as synced if there were no errors
      stateUpdate.syncStatus = hasErrors ? 'error' : 'synced'

      if (hasErrors) {
        console.error('[DailyReportStore] Sync completed with errors. Check logs above for details.')
      } else {
        console.log('[DailyReportStore] Sync completed successfully')
      }

      set(stateUpdate)
    } catch (e) {
      console.error('[DailyReportStore] Database Sync failed, falling back to local mode.', e)
      set({ syncStatus: 'error', syncing: false })
    }
  },

  markRowsForDeletion: (rowIds: string[], tableName: 'support' | 'release') => {
    console.log(`[DailyReportStore] Marking ${rowIds.length} ${tableName} rows for deletion:`, rowIds)
    set({ deletedRowIds: rowIds })
  }
}))
