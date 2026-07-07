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

  // Actions
  fetchDropdownConfigs: () => Promise<void>
  saveDropdownConfig: (config: Omit<DropdownConfig, 'id'> & { id?: string }) => Promise<void>
  deleteDropdownConfig: (id: string) => Promise<void>
  reorderDropdownConfigs: (category: ConfigCategory, configs: DropdownConfig[]) => Promise<void>

  fetchReportRows: () => Promise<void>
  setSupportRows: (rows: SupportLogRecord[], forceSync?: boolean) => Promise<void>
  setReleaseRows: (rows: ReleaseTestingRecord[], forceSync?: boolean) => Promise<void>
  syncRowsToDatabase: () => Promise<void>
  overdueOnlyFilter: boolean
  setOverdueOnlyFilter: (val: boolean) => void
}

// Debounce helper for database syncing
let syncTimeout: any = null

export const useDailyReportStore = create<DailyReportState>((set, get) => ({
  supportRows: [],
  releaseRows: [],
  dropdownConfigs: [],
  loading: false,
  syncing: false,
  isDbAvailable: true,
  syncStatus: 'synced',
  overdueOnlyFilter: false,
  setOverdueOnlyFilter: (val: boolean) => set({ overdueOnlyFilter: val }),

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

    // Load local storage drafts first as immediately responsive state
    const localSupport = localStorage.getItem('flux-daily-support-rows')
    const localRelease = localStorage.getItem('flux-daily-release-rows')

    if (localSupport) set({ supportRows: JSON.parse(localSupport) })
    if (localRelease) set({ releaseRows: JSON.parse(localRelease) })

    if (user) {
      try {
        // Bug fix: manager/qa_lead/admin see all team rows (RLS handles scoping).
        // qa_engineer and others only see their own rows.
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

        // Only filter by user_id for non-team roles
        if (!isTeamRole) {
          supportQuery.eq('user_id', user.id)
          releaseQuery.eq('user_id', user.id)
        }

        const [supportRes, releaseRes] = await Promise.all([supportQuery, releaseQuery])

        if (!supportRes.error && supportRes.data && supportRes.data.length > 0) {
          set({ supportRows: supportRes.data as SupportLogRecord[] })
          localStorage.setItem('flux-daily-support-rows', JSON.stringify(supportRes.data))
        }

        if (!releaseRes.error && releaseRes.data && releaseRes.data.length > 0) {
          set({ releaseRows: releaseRes.data as ReleaseTestingRecord[] })
          localStorage.setItem('flux-daily-release-rows', JSON.stringify(releaseRes.data))
        }

        set({ isDbAvailable: true, syncStatus: 'synced' })
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
      const supportPayload = get().supportRows.map((r, i) => {
        const item: any = { ...r, user_id: user.id, sort_order: i + 1 }
        // Clean temporary local IDs
        if (r.id.startsWith('temp-') || r.id.startsWith('local-')) {
          delete item.id
        }
        // Replace empty strings with null for numeric SQL columns
        if (item.tc_count === '') item.tc_count = null
        if (item.estimation_hrs === '') item.estimation_hrs = null
        if (item.blocked_hours === '') item.blocked_hours = null
        if (item.retesting_estimation_hrs === '') item.retesting_estimation_hrs = null
        return item
      })

      const releasePayload = get().releaseRows.map((r, i) => {
        const item: any = { ...r, user_id: user.id, sort_order: i + 1 }
        if (r.id.startsWith('temp-') || r.id.startsWith('local-')) {
          delete item.id
        }
        if (item.initial_round_estimation_hrs === '') item.initial_round_estimation_hrs = null
        if (item.smoke_testing_estimation_hrs === '') item.smoke_testing_estimation_hrs = null
        if (item.overall_estimation_hrs === '') item.overall_estimation_hrs = null
        return item
      })

      // 1. Re-sync Support Rows: Clear and Upsert
      await supabase
        .from('daily_support_logs')
        .delete()
        .eq('user_id', user.id)

      await supabase
        .from('daily_release_testing_status')
        .delete()
        .eq('user_id', user.id)

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

      // Update local states with actual database assigned IDs
      const stateUpdate: Partial<DailyReportState> = { syncStatus: 'synced', syncing: false }

      let resIdx = 0
      if (supportPayload.length > 0) {
        const res = results[resIdx++]
        if (!res.error && res.data) {
          stateUpdate.supportRows = res.data as SupportLogRecord[]
          localStorage.setItem('flux-daily-support-rows', JSON.stringify(res.data))
        }
      }
      if (releasePayload.length > 0) {
        const res = results[resIdx++]
        if (!res.error && res.data) {
          stateUpdate.releaseRows = res.data as ReleaseTestingRecord[]
          localStorage.setItem('flux-daily-release-rows', JSON.stringify(res.data))
        }
      }

      set(stateUpdate)
    } catch (e) {
      console.error('[DailyReportStore] Database Sync failed, falling back to local mode.', e)
      set({ syncStatus: 'error', syncing: false })
    }
  }
}))
