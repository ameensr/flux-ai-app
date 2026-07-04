// src/modules/Announcements/AnnouncementsWidget.tsx
// Premium Dashboard widget — shows latest announcements in a glassmorphic card.

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { useAnnouncementsStore } from './store'
import { PRIORITY_CONFIG, CATEGORY_CONFIG } from './types'
import type { AnnouncementWithMeta } from './types'
import { cn } from '@/lib/utils'
import {
  Megaphone, Pin, ExternalLink, ChevronRight, Paperclip,
  CheckCircle, Clock,
} from 'lucide-react'
import { ROUTES } from '@/lib/routes'
import { DetailModal } from './AnnouncementsPage'

// ── Single Announcement Item ──────────────────────────────────────────────────

function AnnouncementItem({
  announcement,
  onMarkRead,
  onClick,
}: {
  announcement: AnnouncementWithMeta
  onMarkRead: (id: string) => void
  onClick: () => void
}) {
  const pCfg = PRIORITY_CONFIG[announcement.priority]
  const cCfg = CATEGORY_CONFIG[announcement.category]
  const isNew = Date.now() - new Date(announcement.publish_date || announcement.created_at).getTime() < 48 * 60 * 60 * 1000

  // Mark as read on first view
  useEffect(() => {
    if (!announcement.is_read) {
      onMarkRead(announcement.id)
    }
  }, [announcement.id, announcement.is_read])

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onClick}
      className="group p-3 rounded-xl transition-all cursor-pointer"
      style={{ border: '1px solid var(--border)' }}
      onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hover)' }}
      onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
    >
      {/* Top row: badges */}
      <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
        {announcement.is_pinned && <Pin className="w-2.5 h-2.5 text-accent-gold" />}
        <span className={cn('text-[8px] px-1.5 py-0.5 rounded-full border font-bold uppercase tracking-widest leading-none', pCfg.color)}>
          {pCfg.label}
        </span>
        <span className={cn('text-[8px] px-1.5 py-0.5 rounded-full border font-bold uppercase tracking-widest leading-none', cCfg.color)}>
          {cCfg.label}
        </span>
        {isNew && (
          <span className="text-[8px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-bold uppercase leading-none">
            New
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-xs font-semibold leading-snug line-clamp-1 mb-1" style={{ color: 'var(--text-primary)' }}>
        {announcement.title}
      </p>

      {/* Description */}
      <p className="text-[11px] leading-relaxed line-clamp-2 mb-2" style={{ color: 'var(--text-secondary)' }}>
        {announcement.description}
      </p>

      {/* Footer meta */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
            <Clock className="w-2.5 h-2.5" />
            {new Date(announcement.publish_date || announcement.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {announcement.attachment_url && <Paperclip className="w-2.5 h-2.5" style={{ color: 'var(--text-muted)' }} />}
          {announcement.external_link && <ExternalLink className="w-2.5 h-2.5" style={{ color: 'var(--text-muted)' }} />}
          {announcement.is_acknowledged && <CheckCircle className="w-2.5 h-2.5 text-green-400" />}
        </div>
      </div>
    </motion.div>
  )
}

// ── Widget ────────────────────────────────────────────────────────────────────

export function AnnouncementsWidget() {
  const navigate = useNavigate()
  const { user, role } = useAppStore()
  const { announcements, loading, fetchForUser, markRead, acknowledge } = useAnnouncementsStore()
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementWithMeta | null>(null)

  useEffect(() => {
    if (user?.id && role) {
      fetchForUser(role, user.id)
    }
  }, [user?.id, role])

  const handleMarkRead = (id: string) => {
    if (user?.id) markRead(id, user.id)
  }

  const handleOpen = (a: AnnouncementWithMeta) => {
    if (!a.is_read && user?.id) markRead(a.id, user.id)
    setSelectedAnnouncement(a)
  }

  const handleAcknowledge = (id: string) => {
    if (user?.id) acknowledge(id, user.id)
  }

  // Show max 5 announcements
  const visible = announcements.slice(0, 5)

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4, duration: 0.5 }}
      className="glass-panel p-4 sm:p-5"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <Megaphone className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Announcements</h3>
            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
              {announcements.length} active
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate(ROUTES.announcements)}
          className="flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg transition-all"
          style={{ color: 'var(--accent)' }}
          onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hover)' }}
          onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
        >
          View All <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-6">
          <Megaphone className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>No announcements right now.</p>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {visible.map((a, i) => (
              <AnnouncementItem
                key={a.id}
                announcement={a}
                onMarkRead={handleMarkRead}
                onClick={() => handleOpen(a)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Detail Modal Overlay */}
      <AnimatePresence>
        {selectedAnnouncement && (
          <DetailModal
            announcement={selectedAnnouncement}
            onClose={() => setSelectedAnnouncement(null)}
            onAcknowledge={handleAcknowledge}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
