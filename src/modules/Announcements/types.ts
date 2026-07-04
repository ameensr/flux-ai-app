// src/modules/Announcements/types.ts

export type AnnouncementPriority = 'critical' | 'high' | 'medium' | 'low'
export type AnnouncementCategory = 'general' | 'maintenance' | 'feature' | 'security' | 'policy' | 'event'
export type AnnouncementStatus = 'draft' | 'published' | 'archived'
export type AnnouncementAudience = 'all' | 'admin' | 'pro' | 'free'

export interface Announcement {
  id: string
  title: string
  description: string
  priority: AnnouncementPriority
  category: AnnouncementCategory
  status: AnnouncementStatus
  is_pinned: boolean
  requires_ack: boolean
  audience: AnnouncementAudience
  publish_date: string | null
  expiry_date: string | null
  attachment_url: string | null
  attachment_name: string | null
  external_link: string | null
  author_id: string
  author_name: string | null
  created_at: string
  updated_at: string
}

export interface AnnouncementRead {
  id: string
  announcement_id: string
  user_id: string
  read_at: string
}

export interface AnnouncementAcknowledgement {
  id: string
  announcement_id: string
  user_id: string
  acknowledged_at: string
}

export interface AnnouncementWithMeta extends Announcement {
  is_read?: boolean
  is_acknowledged?: boolean
  read_count?: number
  ack_count?: number
}

export interface CreateAnnouncementPayload {
  title: string
  description: string
  priority: AnnouncementPriority
  category: AnnouncementCategory
  status: AnnouncementStatus
  is_pinned: boolean
  requires_ack: boolean
  audience: AnnouncementAudience
  publish_date: string | null
  expiry_date: string | null
  attachment_url: string | null
  attachment_name: string | null
  external_link: string | null
}

export type UpdateAnnouncementPayload = Partial<CreateAnnouncementPayload>

// ── UI Config ─────────────────────────────────────────────────────────────────

export const PRIORITY_CONFIG: Record<AnnouncementPriority, { label: string; color: string; dot: string }> = {
  critical: { label: 'Critical', color: 'text-red-400 bg-red-500/10 border-red-500/20', dot: 'bg-red-400' },
  high:     { label: 'High',     color: 'text-orange-400 bg-orange-500/10 border-orange-500/20', dot: 'bg-orange-400' },
  medium:   { label: 'Medium',   color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', dot: 'bg-amber-400' },
  low:      { label: 'Low',      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', dot: 'bg-blue-400' },
}

export const CATEGORY_CONFIG: Record<AnnouncementCategory, { label: string; color: string }> = {
  general:     { label: 'General',     color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' },
  maintenance: { label: 'Maintenance', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' },
  feature:     { label: 'Feature',     color: 'text-green-400 bg-green-500/10 border-green-500/20' },
  security:    { label: 'Security',    color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  policy:      { label: 'Policy',      color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  event:       { label: 'Event',       color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
}

export const STATUS_OPTIONS: { value: AnnouncementStatus; label: string }[] = [
  { value: 'draft',     label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived',  label: 'Archived' },
]

export const AUDIENCE_OPTIONS: { value: AnnouncementAudience; label: string }[] = [
  { value: 'all',   label: 'All Users' },
  { value: 'admin', label: 'Admins Only' },
  { value: 'pro',   label: 'Pro Users' },
  { value: 'free',  label: 'Free Users' },
]
