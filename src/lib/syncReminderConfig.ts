// src/lib/syncReminderConfig.ts
// Smart Sync Reminder configuration — persisted in localStorage per-user.

import { create } from 'zustand'

export interface SyncReminderConfig {
  enabled: boolean
  reminderIntervalSeconds: number
  initialDelaySeconds: number
  rotateMessages: boolean
}

export const DEFAULT_SYNC_REMINDER_CONFIG: SyncReminderConfig = {
  enabled: true,
  reminderIntervalSeconds: 300,
  initialDelaySeconds: 60,
  rotateMessages: true,
}

const STORAGE_KEY = 'qaly-sync-reminder-config'

function loadConfig(): SyncReminderConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_SYNC_REMINDER_CONFIG, ...parsed }
    }
  } catch { /* corrupt — use defaults */ }
  return DEFAULT_SYNC_REMINDER_CONFIG
}

function saveConfig(config: SyncReminderConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch { /* non-critical */ }
}

interface SyncReminderConfigStore {
  config: SyncReminderConfig
  setConfig: (patch: Partial<SyncReminderConfig>) => void
  resetToDefaults: () => void
}

export const useSyncReminderConfigStore = create<SyncReminderConfigStore>((set) => ({
  config: loadConfig(),

  setConfig: (patch) => {
    set((state) => {
      const next = { ...state.config, ...patch }
      saveConfig(next)
      return { config: next }
    })
  },

  resetToDefaults: () => {
    saveConfig(DEFAULT_SYNC_REMINDER_CONFIG)
    set({ config: DEFAULT_SYNC_REMINDER_CONFIG })
  },
}))

// ── Sync state tracking (last successful sync timestamp per user) ─────────────

const SYNC_TS_KEY_PREFIX = 'qaly-last-sync-ts-'

export function getLastSyncTimestamp(userId: string): string | null {
  try {
    return localStorage.getItem(`${SYNC_TS_KEY_PREFIX}${userId}`)
  } catch {
    return null
  }
}

export function setLastSyncTimestamp(userId: string, iso: string): void {
  try {
    localStorage.setItem(`${SYNC_TS_KEY_PREFIX}${userId}`, iso)
  } catch { /* non-critical */ }
}
