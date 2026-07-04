// src/modules/Announcements/service.ts
// Supabase CRUD operations for the Announcements module.

import { supabase } from '@/lib/supabase'
import type {
  Announcement,
  AnnouncementWithMeta,
  CreateAnnouncementPayload,
  UpdateAnnouncementPayload,
} from './types'

// ── Fetch active announcements (for Dashboard / User view) ────────────────────

export async function fetchActiveAnnouncements(userRole: string): Promise<AnnouncementWithMeta[]> {
  const now = new Date().toISOString()

  let query = supabase
    .from('announcements')
    .select('*')
    .eq('status', 'published')
    .or(`publish_date.is.null,publish_date.lte.${now}`)
    .or(`expiry_date.is.null,expiry_date.gt.${now}`)
    .order('is_pinned', { ascending: false })
    .order('publish_date', { ascending: false })

  // Filter by audience
  if (userRole !== 'admin') {
    query = query.or(`audience.eq.all,audience.eq.${userRole}`)
  }

  const { data, error } = await query.limit(20)
  if (error) { console.warn('[Announcements] fetch error:', error.message); return [] }
  return (data ?? []) as AnnouncementWithMeta[]
}

// ── Fetch all announcements (Admin view — includes drafts, archived) ──────────

export async function fetchAllAnnouncements(): Promise<Announcement[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) { console.warn('[Announcements] admin fetch error:', error.message); return [] }
  return (data ?? []) as Announcement[]
}

// ── Create ────────────────────────────────────────────────────────────────────

export async function createAnnouncement(
  payload: CreateAnnouncementPayload,
  authorId: string,
  authorName: string | null,
): Promise<Announcement | null> {
  const { data, error } = await supabase
    .from('announcements')
    .insert({ ...payload, author_id: authorId, author_name: authorName })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Announcement
}

// ── Update ────────────────────────────────────────────────────────────────────

export async function updateAnnouncement(
  id: string,
  payload: UpdateAnnouncementPayload,
): Promise<Announcement | null> {
  const { data, error } = await supabase
    .from('announcements')
    .update(payload)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data as Announcement
}

// ── Delete ────────────────────────────────────────────────────────────────────

export async function deleteAnnouncement(id: string): Promise<void> {
  const { error } = await supabase.from('announcements').delete().eq('id', id)
  if (error) throw new Error(error.message)
}

// ── Mark as read ──────────────────────────────────────────────────────────────

export async function markAnnouncementRead(announcementId: string, userId: string): Promise<void> {
  await supabase
    .from('announcement_reads')
    .upsert(
      { announcement_id: announcementId, user_id: userId },
      { onConflict: 'announcement_id,user_id' }
    )
}

// ── Acknowledge ───────────────────────────────────────────────────────────────

export async function acknowledgeAnnouncement(announcementId: string, userId: string): Promise<void> {
  await supabase
    .from('announcement_acknowledgements')
    .upsert(
      { announcement_id: announcementId, user_id: userId },
      { onConflict: 'announcement_id,user_id' }
    )
}

// ── Fetch user's read IDs ─────────────────────────────────────────────────────

export async function fetchUserReadIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('announcement_reads')
    .select('announcement_id')
    .eq('user_id', userId)

  return new Set((data ?? []).map((r: any) => r.announcement_id))
}

// ── Fetch user's acknowledged IDs ─────────────────────────────────────────────

export async function fetchUserAckIds(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('announcement_acknowledgements')
    .select('announcement_id')
    .eq('user_id', userId)

  return new Set((data ?? []).map((r: any) => r.announcement_id))
}

// ── Analytics (Admin) ─────────────────────────────────────────────────────────

export interface AnnouncementAnalytics {
  total: number
  published: number
  draft: number
  archived: number
  expired: number
  totalReads: number
  totalAcks: number
}

export async function fetchAnnouncementAnalytics(): Promise<AnnouncementAnalytics> {
  const now = new Date().toISOString()

  const [announcementsRes, readsRes, acksRes] = await Promise.all([
    supabase.from('announcements').select('id, status, expiry_date'),
    supabase.from('announcement_reads').select('id', { count: 'exact', head: true }),
    supabase.from('announcement_acknowledgements').select('id', { count: 'exact', head: true }),
  ])

  const all = (announcementsRes.data ?? []) as { id: string; status: string; expiry_date: string | null }[]

  return {
    total: all.length,
    published: all.filter(a => a.status === 'published').length,
    draft: all.filter(a => a.status === 'draft').length,
    archived: all.filter(a => a.status === 'archived').length,
    expired: all.filter(a => a.expiry_date && a.expiry_date < now).length,
    totalReads: readsRes.count ?? 0,
    totalAcks: acksRes.count ?? 0,
  }
}

// ── Per-announcement read/ack counts (Admin) ──────────────────────────────────

export async function fetchAnnouncementReadCounts(): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('announcement_reads')
    .select('announcement_id')

  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as { announcement_id: string }[]) {
    counts[row.announcement_id] = (counts[row.announcement_id] ?? 0) + 1
  }
  return counts
}

export async function fetchAnnouncementAckCounts(): Promise<Record<string, number>> {
  const { data } = await supabase
    .from('announcement_acknowledgements')
    .select('announcement_id')

  const counts: Record<string, number> = {}
  for (const row of (data ?? []) as { announcement_id: string }[]) {
    counts[row.announcement_id] = (counts[row.announcement_id] ?? 0) + 1
  }
  return counts
}
