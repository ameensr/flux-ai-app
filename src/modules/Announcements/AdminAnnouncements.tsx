// src/modules/Announcements/AdminAnnouncements.tsx
// Admin Announcement Management — CRUD, publish, pin, archive, schedule, analytics.

import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useAppStore } from '@/store/useAppStore'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'
import {
  Megaphone, Plus, Edit2, Trash2, Pin, PinOff, Eye, EyeOff,
  Archive, Send, Search, RefreshCw, X, Save, ExternalLink,
  Paperclip, BarChart3, Users, CheckCircle, Clock, AlertTriangle,
  FileText, ChevronDown, Lock,
} from 'lucide-react'
import { useAnnouncementsStore } from './store'
import {
  createAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
} from './service'
import type {
  Announcement,
  AnnouncementPriority,
  AnnouncementCategory,
  AnnouncementStatus,
  AnnouncementAudience,
  CreateAnnouncementPayload,
} from './types'
import { PRIORITY_CONFIG, CATEGORY_CONFIG, STATUS_OPTIONS, AUDIENCE_OPTIONS } from './types'

// ── Analytics Cards ───────────────────────────────────────────────────────────

function AnalyticsBar() {
  const { analytics, readCounts, ackCounts } = useAnnouncementsStore()
  if (!analytics) return null

  const stats = [
    { label: 'Total', value: analytics.total, icon: FileText, color: 'text-blue-400' },
    { label: 'Published', value: analytics.published, icon: Send, color: 'text-green-400' },
    { label: 'Draft', value: analytics.draft, icon: Edit2, color: 'text-amber-400' },
    { label: 'Archived', value: analytics.archived, icon: Archive, color: 'text-slate-400' },
    { label: 'Total Views', value: analytics.totalReads, icon: Eye, color: 'text-purple-400' },
    { label: 'Acknowledged', value: analytics.totalAcks, icon: CheckCircle, color: 'text-emerald-400' },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stats.map(s => (
        <div
          key={s.label}
          className="p-4 rounded-2xl border flex flex-col gap-2"
          style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
        >
          <div className="flex items-center justify-between">
            <s.icon className={cn('w-4 h-4', s.color)} />
            <span className="text-lg font-black" style={{ color: 'var(--text-primary)' }}>{s.value}</span>
          </div>
          <span className="text-[10px] uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>{s.label}</span>
        </div>
      ))}
    </div>
  )
}

// ── Create/Edit Form Modal ────────────────────────────────────────────────────

interface FormModalProps {
  announcement: Announcement | null // null = creating new
  onClose: () => void
  onSaved: () => void
}

function FormModal({ announcement, onClose, onSaved }: FormModalProps) {
  useBodyScrollLock(true)
  const { toast } = useToast()
  const { user, profile } = useAppStore()
  const isEdit = !!announcement

  const [title, setTitle] = useState(announcement?.title ?? '')
  const [description, setDescription] = useState(announcement?.description ?? '')
  const [priority, setPriority] = useState<AnnouncementPriority>(announcement?.priority ?? 'medium')
  const [category, setCategory] = useState<AnnouncementCategory>(announcement?.category ?? 'general')
  const [status, setStatus] = useState<AnnouncementStatus>(announcement?.status ?? 'draft')
  const [isPinned, setIsPinned] = useState(announcement?.is_pinned ?? false)
  const [requiresAck, setRequiresAck] = useState(announcement?.requires_ack ?? false)
  const [audience, setAudience] = useState<AnnouncementAudience>(announcement?.audience ?? 'all')
  const [publishDate, setPublishDate] = useState(announcement?.publish_date?.slice(0, 16) ?? '')
  const [expiryDate, setExpiryDate] = useState(announcement?.expiry_date?.slice(0, 16) ?? '')
  const [externalLink, setExternalLink] = useState(announcement?.external_link ?? '')
  const [attachmentUrl, setAttachmentUrl] = useState(announcement?.attachment_url ?? '')
  const [attachmentName, setAttachmentName] = useState(announcement?.attachment_name ?? '')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!title.trim()) { toast({ variant: 'destructive', title: 'Title is required' }); return }
    if (!description.trim()) { toast({ variant: 'destructive', title: 'Description is required' }); return }

    setSaving(true)
    const payload: CreateAnnouncementPayload = {
      title: title.trim(),
      description: description.trim(),
      priority,
      category,
      status,
      is_pinned: isPinned,
      requires_ack: requiresAck,
      audience,
      publish_date: publishDate ? new Date(publishDate).toISOString() : null,
      expiry_date: expiryDate ? new Date(expiryDate).toISOString() : null,
      external_link: externalLink.trim() || null,
      attachment_url: attachmentUrl.trim() || null,
      attachment_name: attachmentName.trim() || null,
    }

    try {
      if (isEdit) {
        await updateAnnouncement(announcement.id, payload)
        toast({ title: 'Announcement Updated' })
      } else {
        await createAnnouncement(payload, user?.id ?? '', profile?.full_name ?? profile?.email ?? null)
        toast({ title: 'Announcement Created' })
      }
      onSaved()
      onClose()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed', description: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[5vh] overflow-y-auto"
      style={{ backgroundColor: 'var(--overlay)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl border overflow-hidden"
        style={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--divider)' }}>
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Announcement' : 'Create Announcement'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl transition-all" style={{ color: 'var(--text-muted)' }}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Title */}
          <div>
            <label className="label-xs mb-1.5 block">Title *</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="field-input" placeholder="Announcement title" />
          </div>

          {/* Description */}
          <div>
            <label className="label-xs mb-1.5 block">Description *</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="field-input resize-none h-28" placeholder="Full announcement content…" />
          </div>

          {/* Row: Priority + Category + Audience */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label-xs mb-1.5 block">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as AnnouncementPriority)} className="field-input text-sm">
                {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-xs mb-1.5 block">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as AnnouncementCategory)} className="field-input text-sm">
                {Object.entries(CATEGORY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-xs mb-1.5 block">Audience</label>
              <select value={audience} onChange={e => setAudience(e.target.value as AnnouncementAudience)} className="field-input text-sm">
                {AUDIENCE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
          </div>

          {/* Row: Status + Pinned + Requires Ack */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="label-xs mb-1.5 block">Status</label>
              <select value={status} onChange={e => setStatus(e.target.value as AnnouncementStatus)} className="field-input text-sm">
                {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="flex items-end gap-3 pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={isPinned} onChange={e => setIsPinned(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Pinned</span>
              </label>
            </div>
            <div className="flex items-end gap-3 pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={requiresAck} onChange={e => setRequiresAck(e.target.checked)} className="w-4 h-4 rounded" />
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Require Acknowledgement</span>
              </label>
            </div>
          </div>

          {/* Row: Publish Date + Expiry Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label-xs mb-1.5 block">Publish Date</label>
              <input type="datetime-local" value={publishDate} onChange={e => setPublishDate(e.target.value)} className="field-input text-sm" />
            </div>
            <div>
              <label className="label-xs mb-1.5 block">Expiry Date</label>
              <input type="datetime-local" value={expiryDate} onChange={e => setExpiryDate(e.target.value)} className="field-input text-sm" />
            </div>
          </div>

          {/* External Link */}
          <div>
            <label className="label-xs mb-1.5 block">External Link</label>
            <input value={externalLink} onChange={e => setExternalLink(e.target.value)} className="field-input" placeholder="https://..." />
          </div>

          {/* Attachment */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="label-xs mb-1.5 block">Attachment URL</label>
              <input value={attachmentUrl} onChange={e => setAttachmentUrl(e.target.value)} className="field-input" placeholder="File URL" />
            </div>
            <div>
              <label className="label-xs mb-1.5 block">Attachment Name</label>
              <input value={attachmentName} onChange={e => setAttachmentName(e.target.value)} className="field-input" placeholder="File name for display" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--divider)' }}>
          <button onClick={onClose} className="btn-ghost flex-1">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="btn-accent flex-1">
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Admin Page ───────────────────────────────────────────────────────────

export function AdminAnnouncements() {
  const { toast } = useToast()
  const { user, role } = useAppStore()
  const { allAnnouncements, adminLoading, readCounts, ackCounts, fetchForAdmin } = useAnnouncementsStore()

  // Permission checks
  const { canView, canCreate, canEdit, canDelete } = usePermissions()
  const hasViewPerm = canView('announcements')
  const hasCreatePerm = canCreate('announcements')
  const hasEditPerm = canEdit('announcements')
  const hasDeletePerm = canDelete('announcements')
  const isAdmin = role === 'admin' || role === 'super_admin'

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [formModal, setFormModal] = useState<{ open: boolean; announcement: Announcement | null }>({ open: false, announcement: null })

  useEffect(() => { fetchForAdmin() }, [])

  // Early exit if no view permission
  if (!hasViewPerm) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-20 h-20 rounded-full flex items-center justify-center mb-6" style={{ background: 'var(--surface)' }}>
          <Lock className="w-8 h-8" style={{ color: 'var(--accent)' }} />
        </div>
        <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          No Permission
        </h3>
        <p style={{ color: 'var(--text-muted)' }}>
          You don't have permission to view announcements.
        </p>
      </div>
    )
  }

  const handleDelete = async (a: Announcement) => {
    if (!confirm(`Delete "${a.title}"? This cannot be undone.`)) return
    try {
      await deleteAnnouncement(a.id)
      toast({ title: 'Announcement Deleted' })
      fetchForAdmin()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed', description: e.message })
    }
  }

  const handleTogglePin = async (a: Announcement) => {
    try {
      await updateAnnouncement(a.id, { is_pinned: !a.is_pinned })
      toast({ title: a.is_pinned ? 'Unpinned' : 'Pinned' })
      fetchForAdmin()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed', description: e.message })
    }
  }

  const handlePublish = async (a: Announcement) => {
    const next: AnnouncementStatus = a.status === 'published' ? 'draft' : 'published'
    try {
      await updateAnnouncement(a.id, {
        status: next,
        publish_date: next === 'published' ? new Date().toISOString() : a.publish_date,
      })
      toast({ title: next === 'published' ? 'Published' : 'Unpublished' })
      fetchForAdmin()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed', description: e.message })
    }
  }

  const handleArchive = async (a: Announcement) => {
    try {
      await updateAnnouncement(a.id, { status: 'archived' })
      toast({ title: 'Archived' })
      fetchForAdmin()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed', description: e.message })
    }
  }

  // Filter
  const filtered = allAnnouncements.filter(a => {
    if (filterStatus && a.status !== filterStatus) return false
    if (filterPriority && a.priority !== filterPriority) return false
    if (search) {
      const q = search.toLowerCase()
      return a.title.toLowerCase().includes(q) || a.description.toLowerCase().includes(q)
    }
    return true
  })

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Analytics */}
      <AnalyticsBar />

      {/* Toolbar */}
      <GlassCard hoverEffect={false}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
          <div className="flex items-center gap-2">
            <Megaphone className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            <h3 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Announcements</h3>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => fetchForAdmin()} className="p-2 rounded-xl transition-all" style={{ color: 'var(--text-muted)' }}>
              <RefreshCw className={cn('w-4 h-4', adminLoading && 'animate-spin')} />
            </button>
            {hasCreatePerm && (
              <button
                onClick={() => setFormModal({ open: true, announcement: null })}
                className="btn-accent text-xs"
              >
                <Plus className="w-3.5 h-3.5" /> New Announcement
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-5">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search announcements…" className="field-input pl-9 h-9 text-xs" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="field-input h-9 text-xs w-32">
            <option value="">All Status</option>
            {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)} className="field-input h-9 text-xs w-32">
            <option value="">All Priority</option>
            {Object.entries(PRIORITY_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>

        {/* Table */}
        {adminLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <Megaphone className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>No announcements found</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Create your first announcement to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(a => {
              const pCfg = PRIORITY_CONFIG[a.priority]
              const cCfg = CATEGORY_CONFIG[a.category]
              const isNew = Date.now() - new Date(a.created_at).getTime() < 48 * 60 * 60 * 1000
              const isExpired = a.expiry_date && new Date(a.expiry_date) < new Date()

              return (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl border transition-all"
                  style={{ background: 'var(--card-bg)', borderColor: 'var(--border)' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.background = 'var(--hover)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--card-bg)' }}
                >
                  <div className="flex items-start gap-4">
                    {/* Left: Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {a.is_pinned && <Pin className="w-3 h-3 text-accent-gold" />}
                        <span className="text-sm font-bold truncate" style={{ color: 'var(--text-primary)' }}>{a.title}</span>
                        {isNew && <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400 font-bold uppercase">New</span>}
                        {isExpired && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 text-red-400 font-bold uppercase">Expired</span>}
                      </div>
                      <p className="text-xs line-clamp-1 mb-2" style={{ color: 'var(--text-secondary)' }}>{a.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest', pCfg.color)}>{pCfg.label}</span>
                        <span className={cn('text-[9px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest', cCfg.color)}>{cCfg.label}</span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          {a.status === 'published' ? '● Published' : a.status === 'draft' ? '○ Draft' : '◌ Archived'}
                        </span>
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          · {a.author_name || 'System'} · {formatDate(a.publish_date || a.created_at)}
                        </span>
                        {a.requires_ack && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 font-bold">ACK</span>}
                      </div>
                    </div>

                    {/* Right: Stats + Actions */}
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-center gap-0.5 text-center">
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{readCounts[a.id] ?? 0}</span>
                        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Views</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 text-center">
                        <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{ackCounts[a.id] ?? 0}</span>
                        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>Acks</span>
                      </div>
                      <div className="flex gap-1">
                        {/* Pin/Unpin - admins only */}
                        {isAdmin && (
                          <button onClick={() => handleTogglePin(a)} title={a.is_pinned ? 'Unpin' : 'Pin'} className="p-1.5 rounded-lg transition-all" style={{ color: a.is_pinned ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {a.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {/* Publish - admins or own announcement */}
                        {(isAdmin || a.author_id === user?.id) && (
                          <button onClick={() => handlePublish(a)} title={a.status === 'published' ? 'Unpublish' : 'Publish'} className="p-1.5 rounded-lg transition-all" style={{ color: a.status === 'published' ? 'var(--accent)' : 'var(--text-muted)' }}>
                            {a.status === 'published' ? <EyeOff className="w-3.5 h-3.5" /> : <Send className="w-3.5 h-3.5" />}
                          </button>
                        )}
                        {/* Archive - admins only */}
                        {isAdmin && (
                          <button onClick={() => handleArchive(a)} title="Archive" className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--text-muted)' }}>
                            <Archive className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* Edit - permission check + (own announcement or admin) */}
                        {hasEditPerm && (a.author_id === user?.id || isAdmin) && (
                          <button onClick={() => setFormModal({ open: true, announcement: a })} title="Edit" className="p-1.5 rounded-lg transition-all" style={{ color: 'var(--text-muted)' }}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {/* Delete - permission check (usually admin-only) */}
                        {hasDeletePerm && (
                          <button onClick={() => handleDelete(a)} title="Delete" className="p-1.5 rounded-lg hover:text-red-400 transition-all" style={{ color: 'var(--text-muted)' }}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}
      </GlassCard>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {formModal.open && (
          <FormModal
            announcement={formModal.announcement}
            onClose={() => setFormModal({ open: false, announcement: null })}
            onSaved={() => fetchForAdmin()}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
