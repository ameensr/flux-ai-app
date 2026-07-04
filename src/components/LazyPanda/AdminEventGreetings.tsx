// src/components/LazyPanda/AdminEventGreetings.tsx
// Admin page for managing Event & Greetings configuration.

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import {
  CalendarHeart, Plus, Edit2, Trash2, Copy, Eye, EyeOff,
  RotateCcw, X, Save, Sparkles, Monitor, Moon, Sun,
} from 'lucide-react'
import {
  useEventGreetingsStore,
  EVENT_TYPE_LABELS,
  PRIORITY_OPTIONS,
  type GreetingEvent,
  type EventType,
  type EventPriority,
  type DisplayFrequency,
  type TargetAudience,
  type EventAction,
} from './eventGreetings'
import { PandaSVG } from './PandaSVG'

// ── Event Form Modal ──────────────────────────────────────────────────────────

function EventFormModal({
  event,
  onClose,
  onSave,
}: {
  event: GreetingEvent | null
  onClose: () => void
  onSave: (data: GreetingEvent) => void
}) {
  const isEdit = !!event

  const [name, setName] = useState(event?.name ?? '')
  const [eventType, setEventType] = useState<EventType>(event?.eventType ?? 'custom')
  const [startDate, setStartDate] = useState(event?.startDate ?? '')
  const [endDate, setEndDate] = useState(event?.endDate ?? '')
  const [isRecurring, setIsRecurring] = useState(event?.isRecurring ?? true)
  const [priority, setPriority] = useState<EventPriority>(event?.priority ?? 'medium')
  const [frequency, setFrequency] = useState<DisplayFrequency>(event?.frequency ?? 'once_per_day')
  const [audience, setAudience] = useState<TargetAudience>(event?.audience ?? 'everyone')
  const [emoji, setEmoji] = useState(event?.emoji ?? '🎉')
  const [message, setMessage] = useState(event?.message ?? '')
  const [animation, setAnimation] = useState(event?.animation ?? 'wave')
  const [autoDismiss, setAutoDismiss] = useState(event?.autoDismissSeconds?.toString() ?? '')
  const [actionLabel1, setActionLabel1] = useState(event?.actions?.[0]?.label ?? 'Acknowledge')
  const [actionEmoji1, setActionEmoji1] = useState(event?.actions?.[0]?.emoji ?? '🎉')

  const handleSave = () => {
    if (!name.trim() || !message.trim() || !startDate) return
    const actions: EventAction[] = [
      { label: actionLabel1, emoji: actionEmoji1, type: 'dismiss' },
      { label: 'Dismiss', emoji: '❌', type: 'dismiss' },
    ]
    onSave({
      id: event?.id ?? `evt_${Date.now()}`,
      name: name.trim(),
      eventType,
      startDate,
      endDate: endDate || null,
      isRecurring,
      priority,
      enabled: event?.enabled ?? true,
      frequency,
      audience,
      animation: animation as any,
      emoji,
      message: message.trim(),
      actions,
      autoDismissSeconds: autoDismiss ? parseInt(autoDismiss) : null,
    })
    onClose()
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
        className="w-full max-w-lg rounded-3xl border overflow-hidden"
        style={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)' }}
      >
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid var(--divider)' }}>
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
            {isEdit ? 'Edit Event' : 'Create Event'}
          </h3>
          <button onClick={onClose} className="p-2 rounded-xl" style={{ color: 'var(--text-muted)' }}><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
          {/* Name + Emoji */}
          <div className="grid grid-cols-[50px_1fr] gap-2">
            <div>
              <label className="label-xs mb-1 block">Emoji</label>
              <input value={emoji} onChange={e => setEmoji(e.target.value)} className="field-input text-center text-lg h-10" maxLength={2} />
            </div>
            <div>
              <label className="label-xs mb-1 block">Event Name *</label>
              <input value={name} onChange={e => setName(e.target.value)} className="field-input h-10" placeholder="e.g. Christmas" />
            </div>
          </div>

          {/* Type + Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs mb-1 block">Event Type</label>
              <select value={eventType} onChange={e => setEventType(e.target.value as EventType)} className="field-input text-xs h-9">
                {Object.entries(EVENT_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.emoji} {v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="label-xs mb-1 block">Priority</label>
              <select value={priority} onChange={e => setPriority(e.target.value as EventPriority)} className="field-input text-xs h-9">
                {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </div>
          </div>

          {/* Dates + Recurring */}
          <div className="grid grid-cols-[1fr_1fr_auto] gap-2 items-end">
            <div>
              <label className="label-xs mb-1 block">{isRecurring ? 'Start (MM-DD)' : 'Start Date'}</label>
              <input value={startDate} onChange={e => setStartDate(e.target.value)} className="field-input text-xs h-9" placeholder={isRecurring ? '12-25' : '2026-12-25'} />
            </div>
            <div>
              <label className="label-xs mb-1 block">End (optional)</label>
              <input value={endDate} onChange={e => setEndDate(e.target.value)} className="field-input text-xs h-9" placeholder={isRecurring ? '12-26' : '2026-12-26'} />
            </div>
            <label className="flex items-center gap-1.5 pb-1 cursor-pointer">
              <input type="checkbox" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} className="w-3.5 h-3.5 rounded" />
              <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>Yearly</span>
            </label>
          </div>

          {/* Frequency + Audience */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs mb-1 block">Frequency</label>
              <select value={frequency} onChange={e => setFrequency(e.target.value as DisplayFrequency)} className="field-input text-xs h-9">
                <option value="once_per_day">Once/Day</option>
                <option value="once_per_session">Once/Session</option>
                <option value="every_login">Every Login</option>
                <option value="until_dismissed">Until Dismissed</option>
              </select>
            </div>
            <div>
              <label className="label-xs mb-1 block">Audience</label>
              <select value={audience} onChange={e => setAudience(e.target.value as TargetAudience)} className="field-input text-xs h-9">
                <option value="everyone">Everyone</option>
                <option value="admins">Admins Only</option>
                <option value="specific_roles">Specific Roles</option>
              </select>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="label-xs mb-1 block">Greeting Message *</label>
            <textarea value={message} onChange={e => setMessage(e.target.value)} className="field-input text-xs resize-none h-20" placeholder="Happy New Year! Here's to another year of building..." />
          </div>

          {/* Animation + Auto-dismiss */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs mb-1 block">Panda Animation</label>
              <select value={animation} onChange={e => setAnimation(e.target.value as any)} className="field-input text-xs h-9">
                <option value="wave">Wave 👋</option>
                <option value="yawn">Yawn 🥱</option>
                <option value="coffee">Coffee ☕</option>
                <option value="laptop">Laptop 💻</option>
                <option value="stretch">Stretch 🙆</option>
                <option value="scratch">Scratch 🤔</option>
                <option value="smile">Smile 😊</option>
                <option value="point">Point 👉</option>
                <option value="sign">Sign 🎉</option>
              </select>
            </div>
            <div>
              <label className="label-xs mb-1 block">Auto-dismiss (sec)</label>
              <input value={autoDismiss} onChange={e => setAutoDismiss(e.target.value)} className="field-input text-xs h-9" placeholder="Leave empty for manual" type="number" min="0" />
            </div>
          </div>

          {/* Action button */}
          <div className="grid grid-cols-[40px_1fr] gap-2">
            <div>
              <label className="label-xs mb-1 block">Btn</label>
              <input value={actionEmoji1} onChange={e => setActionEmoji1(e.target.value)} className="field-input text-center text-sm h-9" maxLength={2} />
            </div>
            <div>
              <label className="label-xs mb-1 block">Primary Action Label</label>
              <input value={actionLabel1} onChange={e => setActionLabel1(e.target.value)} className="field-input text-xs h-9" placeholder="Celebrate!" />
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4" style={{ borderTop: '1px solid var(--divider)' }}>
          <button onClick={onClose} className="btn-ghost flex-1 text-xs">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || !message.trim() || !startDate} className="btn-accent flex-1 text-xs disabled:opacity-40">
            <Save className="w-3.5 h-3.5" /> {isEdit ? 'Update' : 'Create'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Live Preview ──────────────────────────────────────────────────────────────

function EventPreview({ event }: { event: GreetingEvent | null }) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  return (
    <GlassCard hoverEffect={false}>
      <div className="flex items-center gap-2 mb-3">
        <Monitor className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Preview</h3>
      </div>

      <div
        className="rounded-2xl p-5 flex flex-col items-center gap-3 mb-3 border"
        style={{
          background: theme === 'dark' ? '#0B1020' : '#F8FAFC',
          borderColor: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
          minHeight: 180,
        }}
      >
        {event ? (
          <>
            <div className="rounded-xl p-3 text-center max-w-[220px]" style={{ background: theme === 'dark' ? '#111827' : '#fff', border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'}` }}>
              <p className="text-xs font-medium mb-2" style={{ color: theme === 'dark' ? '#F1F5F9' : '#1a1a1a' }}>
                {event.emoji} {event.message}
              </p>
              <div className="flex gap-1.5 justify-center">
                {event.actions.map((a, i) => (
                  <span key={i} className="text-[9px] px-2 py-1 rounded-lg" style={{ background: theme === 'dark' ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.1)', color: '#6366F1' }}>
                    {a.emoji} {a.label}
                  </span>
                ))}
              </div>
            </div>
            <PandaSVG state="IDLE" eyeOffset={{ x: 0, y: 0 }} headRotation={0} isBlinking={false} size={80} />
          </>
        ) : (
          <p className="text-[10px]" style={{ color: theme === 'dark' ? '#6B7A8D' : '#94A3B8' }}>Select an event to preview</p>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={() => setTheme('dark')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold', theme === 'dark' ? 'bg-accent text-white' : '')} style={theme !== 'dark' ? { background: 'var(--hover)', color: 'var(--text-muted)' } : {}}>
          <Moon className="w-2.5 h-2.5" /> Dark
        </button>
        <button onClick={() => setTheme('light')} className={cn('flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold', theme === 'light' ? 'bg-accent text-white' : '')} style={theme !== 'light' ? { background: 'var(--hover)', color: 'var(--text-muted)' } : {}}>
          <Sun className="w-2.5 h-2.5" /> Light
        </button>
      </div>
    </GlassCard>
  )
}

// ── Main Admin Page ───────────────────────────────────────────────────────────

export function AdminEventGreetings() {
  const { config, setEnabled, setMultipleDisplay, updateEvent, removeEvent, duplicateEvent, addEvent, resetToDefaults } = useEventGreetingsStore()
  const [formModal, setFormModal] = useState<{ open: boolean; event: GreetingEvent | null }>({ open: false, event: null })
  const [previewEvent, setPreviewEvent] = useState<GreetingEvent | null>(null)

  const handleSave = (data: GreetingEvent) => {
    const exists = config.events.find(e => e.id === data.id)
    if (exists) { updateEvent(data.id, data) } else { addEvent(data) }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <CalendarHeart className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Event & Greetings</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Schedule personalized greetings and event messages.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={resetToDefaults} className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold" style={{ background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}>
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
          <button onClick={() => setFormModal({ open: true, event: null })} className="btn-accent text-xs">
            <Plus className="w-3.5 h-3.5" /> New Event
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-6">
        {/* Left — Event List */}
        <div className="space-y-4">
          {/* Master toggles */}
          <GlassCard hoverEffect={false}>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Enable Event Greetings</span>
              <button onClick={() => setEnabled(!config.enabled)} className="relative w-10 h-5 rounded-full shrink-0 transition-colors" style={{ background: config.enabled ? 'var(--accent)' : 'var(--hover)', border: `1px solid ${config.enabled ? 'var(--accent)' : 'var(--border)'}` }} role="switch" aria-checked={config.enabled}>
                <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform" style={{ transform: config.enabled ? 'translateX(20px)' : 'translateX(0)' }} />
              </button>
            </div>
          </GlassCard>

          {/* Event cards */}
          <div className="space-y-2">
            {config.events.map(event => {
              const typeCfg = EVENT_TYPE_LABELS[event.eventType]
              const priCfg = PRIORITY_OPTIONS.find(p => p.value === event.priority)
              return (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-xl border transition-all"
                  style={{ background: 'var(--card-bg)', borderColor: previewEvent?.id === event.id ? 'var(--accent)' : 'var(--border)' }}
                  onClick={() => setPreviewEvent(event)}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-lg">{event.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold truncate" style={{ color: event.enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>{event.name}</span>
                        {!event.enabled && <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/5" style={{ color: 'var(--text-muted)' }}>OFF</span>}
                      </div>
                      <p className="text-[10px] line-clamp-1 mb-1.5" style={{ color: 'var(--text-secondary)' }}>{event.message}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[8px] px-1.5 py-0.5 rounded-full border font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}>{typeCfg?.label}</span>
                        <span className={cn('text-[8px] px-1.5 py-0.5 rounded-full border font-bold uppercase tracking-widest', priCfg?.color)}>{priCfg?.label}</span>
                        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{event.isRecurring ? '🔄 Yearly' : '📅 Once'}</span>
                        <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>{event.startDate}{event.endDate ? ` → ${event.endDate}` : ''}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                      <button onClick={() => updateEvent(event.id, { enabled: !event.enabled })} className="p-1.5 rounded-lg" style={{ color: event.enabled ? 'var(--accent)' : 'var(--text-muted)' }} title={event.enabled ? 'Disable' : 'Enable'}>
                        {event.enabled ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      </button>
                      <button onClick={() => duplicateEvent(event.id)} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }} title="Duplicate">
                        <Copy className="w-3 h-3" />
                      </button>
                      <button onClick={() => setFormModal({ open: true, event })} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }} title="Edit">
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button onClick={() => removeEvent(event.id)} className="p-1.5 rounded-lg hover:text-red-400" style={{ color: 'var(--text-muted)' }} title="Delete">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )
            })}
            {config.events.length === 0 && (
              <div className="text-center py-12">
                <CalendarHeart className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--text-muted)', opacity: 0.4 }} />
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>No events configured. Create your first event.</p>
              </div>
            )}
          </div>
        </div>

        {/* Right — Preview */}
        <EventPreview event={previewEvent} />
      </div>

      {/* Form Modal */}
      <AnimatePresence>
        {formModal.open && (
          <EventFormModal
            event={formModal.event}
            onClose={() => setFormModal({ open: false, event: null })}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
