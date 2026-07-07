import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import type { SupportLogRecord, ReleaseTestingRecord, DropdownConfig, ConfigCategory } from './types'

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
  { category: 'status', value: 'Passed', is_active: true, sort_order: 1 },
  { category: 'status', value: 'Failed', is_active: true, sort_order: 2 },
  { category: 'status', value: 'Blocked', is_active: true, sort_order: 3 },
  { category: 'status', value: 'In Progress', is_active: true, sort_order: 4 },
  { category: 'status', value: 'Pending', is_active: true, sort_order: 5 },
  { category: 'status', value: 'Not Executed', is_active: true, sort_order: 6 },
  { category: 'retesting_status', value: 'Open', is_active: true, sort_order: 1 },
  { category: 'retesting_status', value: 'Retesting', is_active: true, sort_order: 2 },
  { category: 'retesting_status', value: 'Fixed', is_active: true, sort_order: 3 },
  { category: 'retesting_status', value: 'Closed', is_active: true, sort_order: 4 },
  { category: 'smoke_status', value: 'Pass', is_active: true, sort_order: 1 },
  { category: 'smoke_status', value: 'Fail', is_active: true, sort_order: 2 },
  { category: 'smoke_status', value: 'Blocked', is_active: true, sort_order: 3 },
  { category: 'smoke_status', value: 'Not Executed', is_active: true, sort_order: 4 },
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

  // Actions
  fetchDropdownConfigs: () => Promise<void>
  saveDropdownConfig: (config: Omit<DropdownConfig, 'id'> & { id?: string }) => Promise<void>
  deleteDropdownConfig: (id: string) => Promise<void>
  reorderDropdownConfigs: (category: ConfigCategory, configs: DropdownConfig[]) => Promise<void>

  fetchProjects: () => Promise<void>
  setSelectedProjectId: (projectId: string) => void
  fetchProjectMembers: (projectId: string) => Promise<void>
  fetchReportRows: () => Promise<void>
  setSupportRows: (rows: SupportLogRecord[], forceSync?: boolean) => Promise<void>
  setReleaseRows: (rows: ReleaseTestingRecord[], forceSync?: boolean) => Promise<void>
  syncRowsToDatabase: () => Promise<void>
  overdueOnlyFilter: boolean
  setOverdueOnlyFilter: (val: boolean) => void
}

// Debounce helper for database syncing
let syncTimeout: any = null

// Helper function to validate rows and add errors property
const validateSupportRow = (row: SupportLogRecord, dropdownConfigs: DropdownConfig[]): SupportLogRecord => {
  const rowErrors: string[] = []

  // Get configured values
  const branches = dropdownConfigs.filter(c => c.category === 'branch' && c.is_active).map(c => c.value.toLowerCase())
  const qas = dropdownConfigs.filter(c => c.category === 'qa' && c.is_active).map(c => c.value.toLowerCase())
  const statuses = dropdownConfigs.filter(c => c.category === 'status' && c.is_active).map(c => c.value.toLowerCase())
  const retestingStatuses = dropdownConfigs.filter(c => c.category === 'retesting_status' && c.is_active).map(c => c.value.toLowerCase())
  const issueSources = dropdownConfigs.filter(c => c.category === 'issue_source' && c.is_active).map(c => c.value.toLowerCase())

  // Validate branch
  if (row.branch && !branches.includes(row.branch.toLowerCase())) {
    rowErrors.push(`Branch '${row.branch}' is not configured.`)
  }

  // Validate QA
  if (row.qa && !qas.includes(row.qa.toLowerCase())) {
    rowErrors.push(`QA '${row.qa}' is not configured.`)
  }

  // Validate status
  if (row.status && !statuses.includes(row.status.toLowerCase())) {
    rowErrors.push(`Status '${row.status}' is not configured.`)
  }

  // Validate retesting status
  if (row.retesting_status && !retestingStatuses.includes(row.retesting_status.toLowerCase())) {
    rowErrors.push(`Retesting Status '${row.retesting_status}' is not configured.`)
  }

  // Validate issue source
  if (row.issue_source && !issueSources.includes(row.issue_source.toLowerCase())) {
    rowErrors.push(`Issue Source '${row.issue_source}' is not configured.`)
  }

  if (rowErrors.length > 0) {
    return { ...row, errors: rowErrors } as any
  }

  return row
}

const validateReleaseRow = (row: ReleaseTestingRecord, dropdownConfigs: DropdownConfig[]): ReleaseTestingRecord => {
  const rowErrors: string[] = []

  // Get configured values
  const qas = dropdownConfigs.filter(c => c.category === 'qa' && c.is_active).map(c => c.value.toLowerCase())
  const smokeStatuses = dropdownConfigs.filter(c => c.category === 'smoke_status' && c.is_active).map(c => c.value.toLowerCase())

  // Validate QA
  if (row.qa && !qas.includes(row.qa.toLowerCase())) {
    rowErrors.push(`QA '${row.qa}' is not configured.`)
  }

  // Validate smoke testing status
  if (row.smoke_testing_status && !smokeStatuses.includes(row.smoke_testing_status.toLowerCase())) {
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

  setOverdueOnlyFilter: (val: boolean) => set({ overdueOnlyFilter: val }),
  setSelectedProjectId: (projectId: string) => {
    set({ selectedProjectId: projectId })
    if (projectId) {
      get().fetchProjectMembers(projectId)
      get().fetchReportRows()
    }
  },

  fetchProjects: async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, project_code')
        .eq('status', 'active')
        .order('name', { ascending: true })

      if (error) throw error
      if (data) {
        const mapped = data.map(p => ({
          id: p.id,
          project_name: p.name,
          project_code: p.project_code
        }))
        set({ projects: mapped })
        // Auto-select first project if available and none selected
        const currentProjectId = get().selectedProjectId
        if (!currentProjectId && mapped.length > 0) {
          get().setSelectedProjectId(mapped[0].id)
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
    const isEdit = !!config.id && !config.id.startsWith('seed-')

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
    }

    // Update local state directly
    set((state) => {
      let nextConfigs = [...state.dropdownConfigs]
      if (isEdit || (config.id && config.id.startsWith('seed-'))) {
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
    set({ loading: true })
    const user = useAppStore.getState().user
    const role = useAppStore.getState().role
    const selectedProjectId = get().selectedProjectId
    const projectMembers = get().projectMembers

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
        // Bug fix: manager/qa_lead/admin see all team rows (RLS handles scoping).
        // qa_engineer and others only see their own rows.
        // Now also filtered by project and project members
        const teamRoles = ['manager', 'qa_lead', 'admin', 'super_admin']
        const isTeamRole = teamRoles.includes(role)

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

        // For team roles, filter by project members only
        if (isTeamRole && projectMembers.length > 0) {
          supportQuery.in('user_id', projectMembers)
          releaseQuery.in('user_id', projectMembers)
        } else if (!isTeamRole) {
          // Only filter by user_id for non-team roles
          supportQuery.eq('user_id', user.id)
          releaseQuery.eq('user_id', user.id)
        }

        const [supportRes, releaseRes] = await Promise.all([supportQuery, releaseQuery])

        // Only update from database if there are no unsaved changes
        if (!hasUnsavedChanges) {
          if (!supportRes.error) {
            const dbSupportRows = (supportRes.data || []) as SupportLogRecord[]
            // Re-validate rows to add errors property for unconfigured values
            const validatedRows = dbSupportRows.map(row => validateSupportRow(row, get().dropdownConfigs))
            set({ supportRows: validatedRows })
            localStorage.setItem('flux-daily-support-rows', JSON.stringify(validatedRows))
          }

          if (!releaseRes.error) {
            const dbReleaseRows = (releaseRes.data || []) as ReleaseTestingRecord[]
            // Re-validate rows to add errors property for unconfigured values
            const validatedRows = dbReleaseRows.map(row => validateReleaseRow(row, get().dropdownConfigs))
            set({ releaseRows: validatedRows })
            localStorage.setItem('flux-daily-release-rows', JSON.stringify(validatedRows))
          }
        } else {
          console.log('[DailyReportStore] Skipping database overwrite - unsaved changes detected')
        }

        set({ isDbAvailable: true, syncStatus: hasUnsavedChanges ? currentSyncStatus : 'synced' })
      } catch (e) {
        console.warn('[DailyReportStore] Failed to fetch report rows from database, working in Local Draft Mode.', e)
        set({ isDbAvailable: false, syncStatus: 'local' })
      } finally {
        set({ loading: false })
      }
    } else {
      set({ loading: false, syncStatus: 'local' })
    }
  },

  setSupportRows: async (rows, forceSync = false) => {
    set({ supportRows: rows, syncStatus: 'saving' })
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
    set({ releaseRows: rows, syncStatus: 'saving' })
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
    if (!user || !get().isDbAvailable) {
      set({ syncStatus: 'local' })
      return
    }

    set({ syncing: true, syncStatus: 'saving' })
    try {
      const selectedProjectId = get().selectedProjectId // Get current project filter
      console.log('[DailyReportStore] Starting sync with project:', selectedProjectId)

      const supportPayload = get().supportRows.map((r, i) => {
        const item: any = { ...r, user_id: user.id, sort_order: i + 1 }

        // Set project_id to currently selected project (critical for filtering!)
        if (selectedProjectId) {
          item.project_id = selectedProjectId
        }

        // Clean temporary local IDs
        if (r.id.startsWith('temp-') || r.id.startsWith('local-')) {
          delete item.id
        }

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
        const item: any = { ...r, user_id: user.id, sort_order: i + 1 }

        // Set project_id to currently selected project (critical for filtering!)
        if (selectedProjectId) {
          item.project_id = selectedProjectId
        }

        if (r.id.startsWith('temp-') || r.id.startsWith('local-')) {
          delete item.id
        }

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

      // 1. Re-sync Support Rows: Clear and Upsert
      // Only delete rows for the current project to avoid affecting other projects
      if (selectedProjectId) {
        await supabase
          .from('daily_support_logs')
          .delete()
          .eq('user_id', user.id)
          .eq('project_id', selectedProjectId)

        await supabase
          .from('daily_release_testing_status')
          .delete()
          .eq('user_id', user.id)
          .eq('project_id', selectedProjectId)
      } else {
        // If no project selected, clear all user rows (legacy behavior)
        await supabase
          .from('daily_support_logs')
          .delete()
          .eq('user_id', user.id)

        await supabase
          .from('daily_release_testing_status')
          .delete()
          .eq('user_id', user.id)
      }

      const insertPromises: any[] = []

      if (supportPayload.length > 0) {
        insertPromises.push(
          supabase
            .from('daily_support_logs')
            .insert(supportPayload)
            .select()
        )
      }

      if (releasePayload.length > 0) {
        insertPromises.push(
          supabase
            .from('daily_release_testing_status')
            .insert(releasePayload)
            .select()
        )
      }

      const results = await Promise.all(insertPromises)

      // Check for database errors before marking as synced
      let hasErrors = false
      let resIdx = 0

      const stateUpdate: Partial<DailyReportState> = { syncing: false }

      if (supportPayload.length > 0) {
        const res = results[resIdx++]
        if (res.error) {
          console.error('[DailyReportStore] Support logs insert failed:', res.error)
          console.error('[DailyReportStore] Failed payload sample:', JSON.stringify(supportPayload[0], null, 2))
          hasErrors = true
        } else if (res.data) {
          console.log('[DailyReportStore] Successfully inserted', res.data.length, 'support rows')

          // Re-validate the returned data to add errors property back
          const validatedRows = (res.data as SupportLogRecord[]).map(row =>
            validateSupportRow(row, get().dropdownConfigs)
          )

          stateUpdate.supportRows = validatedRows
          localStorage.setItem('flux-daily-support-rows', JSON.stringify(validatedRows))
        }
      } else {
        // If supportPayload is empty (all rows deleted), clear state and localStorage
        stateUpdate.supportRows = []
        localStorage.setItem('flux-daily-support-rows', JSON.stringify([]))
        console.log('[DailyReportStore] All support rows deleted')
      }

      if (releasePayload.length > 0) {
        const res = results[resIdx++]
        if (res.error) {
          console.error('[DailyReportStore] Release testing status insert failed:', res.error)
          console.error('[DailyReportStore] Failed payload sample:', JSON.stringify(releasePayload[0], null, 2))
          hasErrors = true
        } else if (res.data) {
          console.log('[DailyReportStore] Successfully inserted', res.data.length, 'release rows')

          // Re-validate the returned data to add errors property back
          const validatedRows = (res.data as ReleaseTestingRecord[]).map(row =>
            validateReleaseRow(row, get().dropdownConfigs)
          )

          stateUpdate.releaseRows = validatedRows
          localStorage.setItem('flux-daily-release-rows', JSON.stringify(validatedRows))
        }
      } else {
        // If releasePayload is empty (all rows deleted), clear state and localStorage
        stateUpdate.releaseRows = []
        localStorage.setItem('flux-daily-release-rows', JSON.stringify([]))
        console.log('[DailyReportStore] All release rows deleted')
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
  }
}))
