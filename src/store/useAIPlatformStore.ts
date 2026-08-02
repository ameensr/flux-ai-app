// Zustand store for Centralised AI provider kill-switch + user allowlist.

import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

const CONFIG_ID = '00000000-0000-0000-0000-000000000001'

function normalizeIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return []
  return [...new Set(
    ids
      .filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
      .map((id) => id.trim().toLowerCase()),
  )]
}

interface AIPlatformStore {
  /** When false, all FastAPI AI features are blocked. Default false until fetched. */
  enabled: boolean
  /**
   * User IDs allowed to use AI (still subject to RBAC).
   * Empty = nobody except admin/super_admin (handled by callers).
   */
  allowedUserIds: string[]
  loading: boolean
  /** False until a successful fetch — fail closed while unknown. */
  configLoaded: boolean
  updatedAt: string | null
  fetchConfig: () => Promise<void>
  updateConfig: (enabled: boolean, allowedUserIds: string[]) => Promise<void>
  /** True when the given user is on the allowlist. */
  isUserAllowed: (userId: string | null | undefined) => boolean
}

export const useAIPlatformStore = create<AIPlatformStore>((set, get) => ({
  enabled: false,
  allowedUserIds: [],
  loading: true,
  configLoaded: false,
  updatedAt: null,

  isUserAllowed: (userId) => {
    const { configLoaded, allowedUserIds } = get()
    // Unknown / failed config → deny
    if (!configLoaded) return false
    if (!userId) return false
    // Empty allowlist → no non-admin users (admins bypass in useAIAccess / backend)
    if (allowedUserIds.length === 0) return false
    return allowedUserIds.includes(userId.trim().toLowerCase())
  },

  fetchConfig: async () => {
    try {
      const { data, error } = await supabase
        .from('ai_platform_config')
        .select('enabled, allowed_user_ids, updated_at')
        .eq('id', CONFIG_ID)
        .maybeSingle()

      if (error) throw error
      if (data) {
        set({
          enabled: data.enabled !== false,
          allowedUserIds: normalizeIds(data.allowed_user_ids),
          updatedAt: data.updated_at ?? null,
          loading: false,
          configLoaded: true,
        })
        return
      }
      // Row missing — treat as disabled until an admin saves config
      set({
        enabled: false,
        allowedUserIds: [],
        loading: false,
        configLoaded: true,
        updatedAt: null,
      })
    } catch (e) {
      console.warn('[AI Platform] Failed to fetch config:', e)
      // Fail closed: do not leave "enabled + empty allowlist" (= everyone)
      set({
        enabled: false,
        allowedUserIds: [],
        loading: false,
        configLoaded: false,
      })
    }
  },

  updateConfig: async (enabled: boolean, allowedUserIds: string[]) => {
    const { data: { session } } = await supabase.auth.getSession()
    const updated_at = new Date().toISOString()
    const uniqueIds = normalizeIds(allowedUserIds)

    const { error } = await supabase
      .from('ai_platform_config')
      .update({
        enabled,
        allowed_user_ids: uniqueIds,
        updated_by: session?.user?.id || null,
        updated_at,
      })
      .eq('id', CONFIG_ID)

    if (error) throw new Error(error.message)

    set({
      enabled,
      allowedUserIds: uniqueIds,
      updatedAt: updated_at,
      configLoaded: true,
    })
  },
}))
