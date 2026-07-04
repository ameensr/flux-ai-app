// src/modules/Announcements/store.ts
// Zustand store for announcements — manages both user-facing and admin state.

import { create } from 'zustand'
import type { Announcement, AnnouncementWithMeta } from './types'
import {
  fetchActiveAnnouncements,
  fetchAllAnnouncements,
  fetchUserReadIds,
  fetchUserAckIds,
  markAnnouncementRead,
  acknowledgeAnnouncement,
  fetchAnnouncementAnalytics,
  fetchAnnouncementReadCounts,
  fetchAnnouncementAckCounts,
  type AnnouncementAnalytics,
} from './service'

interface AnnouncementsState {
  // User-facing
  announcements: AnnouncementWithMeta[]
  readIds: Set<string>
  ackIds: Set<string>
  loading: boolean

  // Admin
  allAnnouncements: Announcement[]
  adminLoading: boolean
  analytics: AnnouncementAnalytics | null
  readCounts: Record<string, number>
  ackCounts: Record<string, number>

  // Actions
  fetchForUser: (userRole: string, userId: string) => Promise<void>
  fetchForAdmin: () => Promise<void>
  markRead: (announcementId: string, userId: string) => Promise<void>
  acknowledge: (announcementId: string, userId: string) => Promise<void>
  refreshAnalytics: () => Promise<void>
}

export const useAnnouncementsStore = create<AnnouncementsState>((set, get) => ({
  announcements: [],
  readIds: new Set(),
  ackIds: new Set(),
  loading: false,

  allAnnouncements: [],
  adminLoading: false,
  analytics: null,
  readCounts: {},
  ackCounts: {},

  fetchForUser: async (userRole, userId) => {
    set({ loading: true })
    try {
      const [announcements, readIds, ackIds] = await Promise.all([
        fetchActiveAnnouncements(userRole),
        fetchUserReadIds(userId),
        fetchUserAckIds(userId),
      ])
      // Enrich with read/ack status
      const enriched = announcements.map(a => ({
        ...a,
        is_read: readIds.has(a.id),
        is_acknowledged: ackIds.has(a.id),
      }))
      set({ announcements: enriched, readIds, ackIds, loading: false })
    } catch {
      set({ loading: false })
    }
  },

  fetchForAdmin: async () => {
    set({ adminLoading: true })
    try {
      const [all, analytics, readCounts, ackCounts] = await Promise.all([
        fetchAllAnnouncements(),
        fetchAnnouncementAnalytics(),
        fetchAnnouncementReadCounts(),
        fetchAnnouncementAckCounts(),
      ])
      set({ allAnnouncements: all, analytics, readCounts, ackCounts, adminLoading: false })
    } catch {
      set({ adminLoading: false })
    }
  },

  markRead: async (announcementId, userId) => {
    await markAnnouncementRead(announcementId, userId)
    const readIds = new Set(get().readIds)
    readIds.add(announcementId)
    set({
      readIds,
      announcements: get().announcements.map(a =>
        a.id === announcementId ? { ...a, is_read: true } : a
      ),
    })
  },

  acknowledge: async (announcementId, userId) => {
    await acknowledgeAnnouncement(announcementId, userId)
    const ackIds = new Set(get().ackIds)
    ackIds.add(announcementId)
    set({
      ackIds,
      announcements: get().announcements.map(a =>
        a.id === announcementId ? { ...a, is_acknowledged: true } : a
      ),
    })
  },

  refreshAnalytics: async () => {
    const [analytics, readCounts, ackCounts] = await Promise.all([
      fetchAnnouncementAnalytics(),
      fetchAnnouncementReadCounts(),
      fetchAnnouncementAckCounts(),
    ])
    set({ analytics, readCounts, ackCounts })
  },
}))
