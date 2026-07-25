// src/modules/Announcements/AnnouncementsPage.tsx
// Announcement detail modal, shared by AnnouncementsWidget.
// NOTE: this file previously also exported a standalone `AnnouncementsPage`
// full-listing page component, but it was never registered on any route
// (confirmed via full-repo search — announcements are admin-only per
// routes.ts, surfaced only through AnnouncementsWidget/AdminAnnouncements)
// and was removed as confirmed dead code.

import { motion } from 'framer-motion'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { PRIORITY_CONFIG, CATEGORY_CONFIG } from './types'
import type { AnnouncementWithMeta } from './types'
import { cn } from '@/lib/utils'
import {
  Pin, ExternalLink, Paperclip,
  CheckCircle, Clock, X, ArrowRight,
} from 'lucide-react'

// ── Announcement Detail Modal ─────────────────────────────────────────────────

export function DetailModal({
  announcement,
  onClose,
  onAcknowledge,
}: {
  announcement: AnnouncementWithMeta
  onClose: () => void
  onAcknowledge: (id: string) => void
}) {
  useBodyScrollLock(true)
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

