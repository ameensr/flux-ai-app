// src/modules/Announcements/AnnouncementsPage.tsx
// Full Announcements listing page — all active announcements for the current user.

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import { useAnnouncementsStore } from './store'
import { PRIORITY_CONFIG, CATEGORY_CONFIG } from './types'
import type { AnnouncementWithMeta } from './types'
import { cn } from '@/lib/utils'
import {
  Megaphone, Pin, ExternalLink, ChevronLeft, Paperclip,
  CheckCircle, Clock, Search, X, ArrowRight, Filter,
} from 'lucide-react'
import { ROUTES } from '@/lib/routes'
import { GlassCard } from '@/components/ui/GlassCard'

// ── Announcement Detail Modal ─────────────────────────────────────────────────

function DetailModal({
  announcement,
  onClose,
  onAcknowledge,
}: {
  announcement: AnnouncementWithMeta
  onClose: () => void
  onAcknowledge: (id: string) => void
}) {
  const pCfg = PRIORITY_CONFIG[announcement.priority]
  const cCfg = CATEGORY_CONFIG[announcement.category]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--overlay)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-3xl border overflow-hidden"
        style={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="shrink-0 px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--divider)' }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              {announcement.is_pinned && <Pin className="w-3 h-3 text-accent-gold" />}
              <span className={cn('text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest', pCfg.color)}>{pCfg.label}</span>
              <span className={cn('text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest', cCfg.color)}>{cCfg.label}</span>
            </div>
            <button onClick={onClose} className="p-2 rounded-xl transition-all" style={{ color: 'var(--text-muted)' }}>
              <X className="w-4 h-4" />
            </button>
          </div>
          <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>{announcement.title}</h2>
          <div className="flex items-center gap-3 mt-2">
            <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              <Clock className="w-3 h-3" />
              {new Date(announcement.publish_date || announcement.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
            {announcement.description}
          </p>

          {/* Attachment */}
          {announcement.attachment_url && (
            <a
              href={announcement.attachment_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mt-5 p-3 rounded-xl transition-all"
              style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <Paperclip className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-medium">{announcement.attachment_name || 'Attachment'}</span>
              <ExternalLink className="w-3 h-3 ml-auto" style={{ color: 'var(--text-muted)' }} />
            </a>
          )}

          {/* External Link */}
          {announcement.external_link && (
            <a
              href={announcement.external_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 mt-3 p-3 rounded-xl transition-all"
              style={{ background: 'var(--hover)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}
            >
              <ExternalLink className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <span className="text-xs font-medium truncate">{announcement.external_link}</span>
              <ArrowRight className="w-3 h-3 ml-auto" style={{ color: 'var(--text-muted)' }} />
            </a>
          )}
        </div>

        {/* Footer: Acknowledge button (if required) */}
        {announcement.requires_ack && !announcement.is_acknowledged && (
          <div className="shrink-0 px-6 py-4" style={{ borderTop: '1px solid var(--divider)' }}>
            <button
              onClick={() => { onAcknowledge(announcement.id); onClose() }}
              className="btn-accent w-full"
            >
              <CheckCircle className="w-4 h-4" /> Acknowledge
            </button>
          </div>
        )}
        {announcement.requires_ack && announcement.is_acknowledged && (
          <div className="shrink-0 px-6 py-3 text-center" style={{ borderTop: '1px solid var(--divider)' }}>
            <span className="text-xs font-bold text-green-400 flex items-center justify-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Acknowledged
            </span>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ── Main Announcements Page ───────────────────────────────────────────────────

export function AnnouncementsPage() {
  const navigate = useNavigate()
  const { user, role } = useAppStore()
  const { announcements, loading, fetchForUser, markRead, acknowledge } = useAnnouncementsStore()
  const [search, setSearch] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementWithMeta | null>(null)

  useEffect(() => {
    if (user?.id && role) {
      fetchForUser(role, user.id)
    }
  }, [user?.id, role])

  const handleOpen = (a: AnnouncementWithMeta) => {
    if (!a.is_read && user?.id) markRead(a.id, user.id)
    setSelectedAnnouncement(a)
  }

  const handleAcknowledge = (id: string) => {
    if (user?.id) acknowledge(id, user.id)
  }

  // Filter
  const filtered = announcements.filter(a => {
    if (filterPriority && a.priority !== filterPriority) return false
    if (filterCategory && a.category !== filterCategory) return false
    if (search) {
      const q = search.toLowerCase()
      return a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
    }
    return true
  })

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="py-6 sm:py-10"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <button
            onClick={() => navigate(ROUTES.dashboard)}
            className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest mb-3 transition-colors"
            style={{ color: 'var(--text-muted)' }}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)' }}>
              <Megaphone className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Announcements</h1>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{announcements.length} active announcement{announcements.length !== 1 ? 's' : ''}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search announcements…" className="field-input pl-9 h-9 text-xs" />
        </div>
        <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="field-input h-9 text-xs w-32">
          <option value="">All Priority</option>
          {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="field-input h-9 text-xs w-32">
          <option value="">All Categories</option>
          {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20">
          <Megaphone className="w-12 h-12 mx-auto mb-4" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
            {search || filterPriority || filterCategory ? 'No matching announcements' : 'No announcements'}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {search || filterPriority || filterCategory ? 'Try adjusting your filters.' : 'Check back later for updates.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((a, i) => {
            const pCfg = PRIORITY_CONFIG[a.priority]
            const cCfg = CATEGORY_CONFIG[a.category]
            const isNew = Date.now() - new Date(a.publish_date || a.created_at).getTime() < 48 * 60 * 60 * 1000

            return (
              <motion.div
                key={a.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => handleOpen(a)}
                className="p-5 rounded-2xl border cursor-pointer transition-all group"
                style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(99,102,241,0.3)'; e.currentTarget.style.background = 'var(--hover)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--card-bg)' }}
              >
                {/* Top badges */}
                <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                  {a.is_pinned && <Pin className="w-3 h-3 text-accent-gold" />}
                  <span className={cn('text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest', pCfg.color)}>{pCfg.label}</span>
                  <span className={cn('text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest', cCfg.color)}>{cCfg.label}</span>
                  {isNew && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/15 text-green-400 font-bold uppercase">New</span>}
                  {a.requires_ack && !a.is_acknowledged && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold uppercase">Needs Ack</span>
                  )}
                  {a.is_acknowledged && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-bold uppercase flex items-center gap-0.5">
                      <CheckCircle className="w-2.5 h-2.5" /> Done
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-sm font-bold leading-snug mb-1.5 line-clamp-2 transition-colors group-hover:text-[var(--accent)]" style={{ color: 'var(--text-primary)' }}>
                  {a.title}
                </h3>

                {/* Description */}
                <p className="text-xs leading-relaxed line-clamp-3 mb-3" style={{ color: 'var(--text-secondary)' }}>
                  {a.description}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      <Clock className="w-2.5 h-2.5" />
                      {new Date(a.publish_date || a.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {a.attachment_url && <Paperclip className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />}
                    {a.external_link && <ExternalLink className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />}
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}

      {/* Detail Modal */}
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
