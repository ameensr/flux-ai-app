// src/store/useMaintenanceStore.ts
// Zustand store for Role-Based Maintenance Mode configuration.

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

export type MaintenanceType = 'full_lock' | 'custom_message'

export interface MaintenanceConfig {
  id: string
  enabled: boolean
  maintenance_type: MaintenanceType
  reason: string
  start_time: string | null
  end_time: string | null
  locked_roles: string[]
  allowed_roles: string[]
  show_countdown: boolean
  show_branding: boolean
  support_email: string
  custom_message: string | null
  updated_by: string | null
  updated_at: string
}

const DEFAULT_CONFIG: MaintenanceConfig = {
  id: '00000000-0000-0000-0000-000000000001',
  enabled: false,
  maintenance_type: 'full_lock',
  reason: 'Scheduled maintenance in progress.',
  start_time: null,
  end_time: null,
  locked_roles: [],
  allowed_roles: ['super_admin', 'admin'],
  show_countdown: true,
  show_branding: true,
  support_email: 'support@company.com',
  custom_message: null,
  updated_by: null,
  updated_at: new Date().toISOString(),
}

interface MaintenanceStore {
  config: MaintenanceConfig
  loading: boolean
  fetchConfig: () => Promise<void>
  updateConfig: (patch: Partial<MaintenanceConfig>) => Promise<void>
  /** Check if a given role is currently locked out */
  isRoleLocked: (role: string) => boolean
  /** Check if maintenance is active (considering time window) */
  isMaintenanceActive: () => boolean
  /** Get minutes until maintenance starts (for pre-banner). Returns null if not scheduled or already active */
  minutesUntilStart: () => number | null
}

export const useMaintenanceStore = create<MaintenanceStore>((set, get) => ({
  config: DEFAULT_CONFIG,
  loading: true,

  fetchConfig: async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_config')
        .select('*')
        .limit(1)
        .single()

      if (error) throw error
      if (data) {
        set({
          config: {
            id: data.id,
            enabled: data.enabled,
            maintenance_type: data.maintenance_type,
            reason: data.reason || DEFAULT_CONFIG.reason,
            start_time: data.start_time,
            end_time: data.end_time,
            locked_roles: data.locked_roles || [],
            allowed_roles: data.allowed_roles || ['super_admin', 'admin'],
            show_countdown: data.show_countdown ?? true,
            show_branding: data.show_branding ?? true,
            support_email: data.support_email || DEFAULT_CONFIG.support_email,
            custom_message: data.custom_message,
            updated_by: data.updated_by,
            updated_at: data.updated_at,
          },
          loading: false,
        })
      }
    } catch (e) {
      console.warn('[Maintenance] Failed to fetch config:', e)
      set({ loading: false })
    }
  },

  updateConfig: async (patch) => {
    const { config } = get()
    const { data: { session } } = await supabase.auth.getSession()

    const payload: any = {
      ...patch,
      updated_by: session?.user?.id || null,
      updated_at: new Date().toISOString(),
    }

    // Remove id from payload to avoid conflicts
    delete payload.id

    const { error } = await supabase
      .from('maintenance_config')
      .update(payload)
      .eq('id', config.id)

    if (error) throw new Error(error.message)

    set({ config: { ...config, ...patch, updated_at: payload.updated_at, updated_by: payload.updated_by } })
  },

  isMaintenanceActive: () => {
    const { config } = get()
    if (!config.enabled) return false

    const now = new Date()

    // If start_time is set and we haven't reached it yet, not active
    if (config.start_time && new Date(config.start_time) > now) return false

    // If end_time is set and we've passed it, not active
    if (config.end_time && new Date(config.end_time) < now) return false

    return true
  },

  isRoleLocked: (role: string) => {
    const { config } = get()
    if (!get().isMaintenanceActive()) return false

    // If role is in allowed list, never locked
    if (config.allowed_roles.includes(role)) return false

    // If role is in locked list, it's locked
    return config.locked_roles.includes(role)
  },

  minutesUntilStart: () => {
    const { config } = get()
    if (!config.enabled) return null
    if (!config.start_time) return null

    const now = new Date()
    const start = new Date(config.start_time)
    const diffMs = start.getTime() - now.getTime()

    // If already started or in past, return null
    if (diffMs <= 0) return null

    return Math.ceil(diffMs / 60000)
  },
}))
