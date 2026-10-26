// src/store/useAnnouncementStore.ts
// Zustand store for Qub.ai Rebranding Announcement state.
// Manages admin toggle state, user eligibility, active usage countdown, and popup visibility.

import { create } from 'zustand'
import {
  fetchRebrandingConfig,
  updateRebrandingConfig,
  hasUserSeenAnnouncement,
  markAnnouncementSeen,
  onAnnouncementBroadcast,
  broadcastAnnouncementEvent,
} from '@/services/announcementService'

interface AnnouncementStore {
  // Configuration
  enabled: boolean
  configLoaded: boolean
  isSaving: boolean

  // User state
  userId: string | null
  hasSeen: boolean
  activeSeconds: number

  // Popup state
  isOpen: boolean

  // Actions
  fetchConfig: () => Promise<void>
  setEnabled: (enabled: boolean) => Promise<void>
  initForUser: (userId: string | null) => void
  incrementActiveSeconds: () => void
  resetActiveSeconds: () => void
  openPopup: () => void
  closePopup: () => void
  dismissPopup: () => void
  previewPopup: () => void
}

export const useAnnouncementStore = create<AnnouncementStore>((set, get) => {
  // Listen for cross-tab broadcasts
  if (typeof window !== 'undefined') {
    onAnnouncementBroadcast((msg) => {
      if (msg.type === 'CONFIG_CHANGED') {
        const currentlyOpen = get().isOpen
        set({ enabled: msg.enabled })
        // If disabled while a popup is open, close the popup immediately
        if (!msg.enabled && currentlyOpen) {
          set({ isOpen: false })
        }
      } else if (msg.type === 'ANNOUNCEMENT_DISMISSED') {
        const currentUserId = get().userId
        if (currentUserId && msg.userId === currentUserId) {
          set({ hasSeen: true, isOpen: false, activeSeconds: 0 })
        }
      }
    })
  }

  return {
    enabled: false,
    configLoaded: false,
    isSaving: false,
    userId: null,
    hasSeen: false,
    activeSeconds: 0,
    isOpen: false,

    fetchConfig: async () => {
      try {
        const isEnabled = await fetchRebrandingConfig()
        const currentlyOpen = get().isOpen
        set({
          enabled: isEnabled,
          configLoaded: true,
        })
        // If disabled while open, close it
        if (!isEnabled && currentlyOpen) {
          set({ isOpen: false })
        }
      } catch (err) {
        console.warn('[useAnnouncementStore] Failed to fetch rebranding config:', err)
        // Default to disabled
        set({ enabled: false, configLoaded: true })
      }
    },

    setEnabled: async (enabled: boolean) => {
      const prev = get().enabled
      // Optimistic update
      set({ enabled, isSaving: true })
      if (!enabled && get().isOpen) {
        set({ isOpen: false })
      }

      try {
        await updateRebrandingConfig(enabled)
        set({ isSaving: false })
      } catch (err) {
        // Rollback on failure
        set({ enabled: prev, isSaving: false })
        throw err
      }
    },

    initForUser: (userId: string | null) => {
      if (!userId) {
        set({ userId: null, hasSeen: true, activeSeconds: 0, isOpen: false })
        return
      }

      const seen = hasUserSeenAnnouncement(userId)

      // Restore active seconds from sessionStorage if available
      let restoredSeconds = 0
      try {
        const saved = sessionStorage.getItem(`qub_active_usage_${userId}`)
        if (saved) {
          restoredSeconds = parseInt(saved, 10) || 0
        }
      } catch {
        // Ignore sessionStorage errors
      }

      set({
        userId,
        hasSeen: seen,
        activeSeconds: seen ? 60 : restoredSeconds,
        isOpen: false,
      })
    },

    incrementActiveSeconds: () => {
      const { hasSeen, enabled, activeSeconds, userId, isOpen } = get()
      if (hasSeen || !enabled || isOpen) return

      const next = activeSeconds + 1
      set({ activeSeconds: next })

      if (userId) {
        try {
          sessionStorage.setItem(`qub_active_usage_${userId}`, String(next))
        } catch {
          // Ignore
        }
      }
    },

    resetActiveSeconds: () => {
      const { userId } = get()
      set({ activeSeconds: 0 })
      if (userId) {
        try {
          sessionStorage.removeItem(`qub_active_usage_${userId}`)
        } catch {
          // Ignore
        }
      }
    },

    openPopup: () => {
      const { hasSeen, enabled } = get()
      if (!hasSeen && enabled) {
        set({ isOpen: true })
      }
    },

    closePopup: () => {
      set({ isOpen: false })
    },

    dismissPopup: () => {
      const { userId } = get()
      if (userId) {
        markAnnouncementSeen(userId)
      }
      set({
        isOpen: false,
        hasSeen: true,
        activeSeconds: 0,
      })
    },

    previewPopup: () => {
      set({ isOpen: true })
    },
  }
})

// Expose dev/preview helper on window for quick browser testing
if (typeof window !== 'undefined') {
  ;(window as any).__qubPreviewAnnouncement = () => {
    useAnnouncementStore.getState().previewPopup()
    console.log('[Qub.ai] Rebranding announcement preview opened.')
  }
}

