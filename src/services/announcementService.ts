// src/services/announcementService.ts
// Service layer for the Qub.ai Rebranding Announcement.
// Handles persistent admin configuration (via Supabase),
// user dismissal tracking (scoped per authenticated user & browser profile),
// and cross-tab synchronization.

import { supabase } from '@/lib/supabase'

export interface RebrandingAnnouncementConfig {
  enabled: boolean
  updated_at?: string
  updated_by?: string | null
}

const CONFIG_SINGLETON_ID = '00000000-0000-0000-0000-000000000001'
const CACHE_KEY = 'qub_rebranding_config_cache'
const USER_SEEN_PREFIX = 'qub_rebranding_seen_'
const BROADCAST_CHANNEL_NAME = 'qub_rebranding_announcement_channel'

// Safe BroadcastChannel instance for cross-tab synchronisation
let broadcastChannel: BroadcastChannel | null = null
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
  }
} catch {
  // BroadcastChannel not supported in this environment
}

export type AnnouncementBroadcastMessage =
  | { type: 'CONFIG_CHANGED'; enabled: boolean }
  | { type: 'ANNOUNCEMENT_DISMISSED'; userId: string }

/**
 * Broadcast an announcement event to all open browser tabs
 */
export function broadcastAnnouncementEvent(message: AnnouncementBroadcastMessage): void {
  try {
    broadcastChannel?.postMessage(message)
  } catch {
    // Ignore postMessage errors
  }
}

/**
 * Subscribe to cross-tab announcement broadcast events
 */
export function onAnnouncementBroadcast(
  handler: (message: AnnouncementBroadcastMessage) => void
): () => void {
  if (!broadcastChannel) return () => {}

  const listener = (event: MessageEvent<AnnouncementBroadcastMessage>) => {
    if (event.data) {
      handler(event.data)
    }
  }

  broadcastChannel.addEventListener('message', listener)
  return () => {
    broadcastChannel?.removeEventListener('message', listener)
  }
}

/**
 * Check if the given user has already seen or dismissed the rebranding announcement.
 * Scoped per authenticated user ID and browser profile (localStorage).
 */
export function hasUserSeenAnnouncement(userId: string | null | undefined): boolean {
  if (!userId) return false
  try {
    return localStorage.getItem(`${USER_SEEN_PREFIX}${userId}`) === 'true'
  } catch {
    return false
  }
}

/**
 * Mark the rebranding announcement as seen/dismissed for the specified user.
 * Persists in localStorage and broadcasts to other tabs so they do not reopen.
 */
export function markAnnouncementSeen(userId: string | null | undefined): void {
  if (!userId) return
  try {
    localStorage.setItem(`${USER_SEEN_PREFIX}${userId}`, 'true')
    // Clear any accumulated active seconds for this session
    sessionStorage.removeItem(`qub_active_usage_${userId}`)
    broadcastAnnouncementEvent({ type: 'ANNOUNCEMENT_DISMISSED', userId })
  } catch {
    // Ignore storage errors
  }
}

/**
 * Fetch the persistent admin toggle setting for the rebranding announcement.
 * Tries `maintenance_config.rebranding_announcement_enabled`, then fallback table.
 * Defaults to `false` (disabled) on error or missing configuration.
 */
export async function fetchRebrandingConfig(): Promise<boolean> {
  // 1. Try maintenance_config first
  try {
    const { data, error } = await supabase
      .from('maintenance_config')
      .select('rebranding_announcement_enabled')
      .eq('id', CONFIG_SINGLETON_ID)
      .maybeSingle()

    if (!error && data && typeof data.rebranding_announcement_enabled === 'boolean') {
      const isEnabled = data.rebranding_announcement_enabled
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ enabled: isEnabled, timestamp: Date.now() }))
      } catch { /* ignore */ }
      return isEnabled
    }
  } catch (err) {
    console.warn('[announcementService] maintenance_config fetch error:', err)
  }

  // 2. Try standalone rebranding_announcement_config table
  try {
    const { data, error } = await supabase
      .from('rebranding_announcement_config')
      .select('enabled')
      .eq('id', CONFIG_SINGLETON_ID)
      .maybeSingle()

    if (!error && data && typeof data.enabled === 'boolean') {
      const isEnabled = data.enabled
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ enabled: isEnabled, timestamp: Date.now() }))
      } catch { /* ignore */ }
      return isEnabled
    }
  } catch (err) {
    console.warn('[announcementService] fallback table fetch error:', err)
  }

  // 3. Fallback: check cached state from localStorage if offline/network fails
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (typeof parsed?.enabled === 'boolean') {
        return parsed.enabled
      }
    }
  } catch { /* ignore */ }

  // Default to disabled
  return false
}

/**
 * Update the persistent rebranding announcement toggle.
 * Enforces admin permissions on the client and server.
 */
export async function updateRebrandingConfig(enabled: boolean): Promise<boolean> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) {
    throw new Error('Unauthorized: You must be logged in to update configuration.')
  }

  // Check role from profiles
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .maybeSingle()

  const userRole = profile?.role
  if (userRole !== 'admin' && userRole !== 'super_admin') {
    throw new Error('Forbidden: Only administrators can modify this setting.')
  }

  const now = new Date().toISOString()
  let updateSuccessful = false
  let lastError: Error | null = null

  // 1. Try updating maintenance_config
  try {
    const { error } = await supabase
      .from('maintenance_config')
      .update({
        rebranding_announcement_enabled: enabled,
        updated_by: session.user.id,
        updated_at: now,
      })
      .eq('id', CONFIG_SINGLETON_ID)

    if (!error) {
      updateSuccessful = true
    } else {
      lastError = new Error(error.message)
    }
  } catch (err: any) {
    lastError = err instanceof Error ? err : new Error(String(err))
  }

  // 2. If maintenance_config update failed (e.g. column missing), try fallback table
  if (!updateSuccessful) {
    try {
      const { error } = await supabase
        .from('rebranding_announcement_config')
        .upsert({
          id: CONFIG_SINGLETON_ID,
          enabled,
          updated_by: session.user.id,
          updated_at: now,
        })

      if (!error) {
        updateSuccessful = true
        lastError = null
      } else {
        lastError = new Error(error.message)
      }
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }

  // 3. If remote update succeeded, update cache and broadcast
  if (updateSuccessful) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ enabled, timestamp: Date.now() }))
    } catch { /* ignore */ }

    broadcastAnnouncementEvent({ type: 'CONFIG_CHANGED', enabled })
    return enabled
  }

  // If both failed and we couldn't write to DB, throw the error
  throw lastError || new Error('Failed to persist announcement configuration in database.')
}
