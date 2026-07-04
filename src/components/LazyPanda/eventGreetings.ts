// src/components/LazyPanda/eventGreetings.ts
// Smart Event & Greetings Engine — types, defaults, store, and display logic.

import { create } from 'zustand'
import type { PandaAnimation } from './pandaMessages'

// ── Types ─────────────────────────────────────────────────────────────────────

export type EventType =
  | 'birthday'
  | 'work_anniversary'
  | 'company_anniversary'
  | 'festival'
  | 'public_holiday'
  | 'product_launch'
  | 'release_day'
  | 'company_meeting'
  | 'team_celebration'
  | 'qa_day'
  | 'developer_day'
  | 'ai_day'
  | 'custom'

export type EventPriority = 'critical' | 'high' | 'medium' | 'low'
export type DisplayFrequency = 'once_per_day' | 'once_per_session' | 'every_login' | 'until_dismissed'
export type TargetAudience = 'everyone' | 'admins' | 'specific_roles' | 'specific_users'

export interface EventAction {
  label: string
  emoji: string
  type: 'dismiss' | 'link' | 'acknowledge'
  url?: string
}

export interface GreetingEvent {
  id: string
  name: string
  eventType: EventType
  startDate: string        // YYYY-MM-DD or MM-DD for recurring
  endDate: string | null   // null = single day
  isRecurring: boolean     // true = repeats every year (MM-DD format)
  priority: EventPriority
  enabled: boolean
  frequency: DisplayFrequency
  audience: TargetAudience
  audienceRoles?: string[]
  animation: PandaAnimation
  emoji: string
  message: string
  actions: EventAction[]
  autoDismissSeconds: number | null  // null = manual dismiss only
}

export interface EventGreetingsConfig {
  enabled: boolean
  multipleDisplay: boolean  // show multiple events on same day
  events: GreetingEvent[]
}

// ── Event Type Labels ─────────────────────────────────────────────────────────

export const EVENT_TYPE_LABELS: Record<EventType, { label: string; emoji: string }> = {
  birthday:             { label: 'Birthday',            emoji: '🎂' },
  work_anniversary:     { label: 'Work Anniversary',   emoji: '🎉' },
  company_anniversary:  { label: 'Company Anniversary', emoji: '🏢' },
  festival:             { label: 'Festival',            emoji: '🎊' },
  public_holiday:       { label: 'Public Holiday',     emoji: '📅' },
  product_launch:       { label: 'Product Launch',     emoji: '🚀' },
  release_day:          { label: 'Release Day',        emoji: '🛳️' },
  company_meeting:      { label: 'Company Meeting',    emoji: '🤝' },
  team_celebration:     { label: 'Team Celebration',   emoji: '🥳' },
  qa_day:               { label: 'QA Day',             emoji: '🐞' },
  developer_day:        { label: 'Developer Day',      emoji: '💻' },
  ai_day:               { label: 'AI Day',             emoji: '🤖' },
  custom:               { label: 'Custom Event',       emoji: '✨' },
}

export const PRIORITY_OPTIONS: { value: EventPriority; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'text-red-400 bg-red-500/10 border-red-500/20' },
  { value: 'high',     label: 'High',     color: 'text-orange-400 bg-orange-500/10 border-orange-500/20' },
  { value: 'medium',   label: 'Medium',   color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { value: 'low',      label: 'Low',      color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
]

// ── Default Events ────────────────────────────────────────────────────────────

export const DEFAULT_EVENTS: GreetingEvent[] = [
  {
    id: 'evt_newyear',
    name: 'New Year',
    eventType: 'festival',
    startDate: '01-01',
    endDate: '01-02',
    isRecurring: true,
    priority: 'high',
    enabled: true,
    frequency: 'once_per_day',
    audience: 'everyone',
    animation: 'wave',
    emoji: '🎆',
    message: "Happy New Year! Here's to another year of building amazing software.",
    actions: [
      { label: 'Celebrate!', emoji: '🎉', type: 'dismiss' },
      { label: 'Dismiss', emoji: '❌', type: 'dismiss' },
    ],
    autoDismissSeconds: null,
  },
  {
    id: 'evt_christmas',
    name: 'Christmas',
    eventType: 'festival',
    startDate: '12-24',
    endDate: '12-26',
    isRecurring: true,
    priority: 'high',
    enabled: true,
    frequency: 'once_per_day',
    audience: 'everyone',
    animation: 'wave',
    emoji: '🎄',
    message: 'Merry Christmas! Wishing you a joyful holiday.',
    actions: [
      { label: 'Merry Christmas!', emoji: '🎄', type: 'dismiss' },
      { label: 'Dismiss', emoji: '❌', type: 'dismiss' },
    ],
    autoDismissSeconds: null,
  },
  {
    id: 'evt_diwali',
    name: 'Diwali',
    eventType: 'festival',
    startDate: '10-20',
    endDate: '10-25',
    isRecurring: true,
    priority: 'medium',
    enabled: true,
    frequency: 'once_per_day',
    audience: 'everyone',
    animation: 'smile',
    emoji: '🪔',
    message: 'Happy Diwali! May your day be bright and bug-free.',
    actions: [
      { label: 'Happy Diwali!', emoji: '🪔', type: 'dismiss' },
      { label: 'Dismiss', emoji: '❌', type: 'dismiss' },
    ],
    autoDismissSeconds: null,
  },
  {
    id: 'evt_eid',
    name: 'Eid',
    eventType: 'festival',
    startDate: '03-28',
    endDate: '04-01',
    isRecurring: true,
    priority: 'medium',
    enabled: true,
    frequency: 'once_per_day',
    audience: 'everyone',
    animation: 'wave',
    emoji: '🌙',
    message: 'Eid Mubarak! Have a wonderful celebration.',
    actions: [
      { label: 'Eid Mubarak!', emoji: '🌙', type: 'dismiss' },
      { label: 'Dismiss', emoji: '❌', type: 'dismiss' },
    ],
    autoDismissSeconds: null,
  },
  {
    id: 'evt_qa_day',
    name: 'World QA Day',
    eventType: 'qa_day',
    startDate: '11-01',
    endDate: null,
    isRecurring: true,
    priority: 'medium',
    enabled: true,
    frequency: 'once_per_day',
    audience: 'everyone',
    animation: 'sign',
    emoji: '🐞',
    message: 'Happy QA Day! Thanks for keeping software bug-free.',
    actions: [
      { label: 'Bug-free!', emoji: '🐞', type: 'dismiss' },
    ],
    autoDismissSeconds: 10,
  },
  {
    id: 'evt_release',
    name: 'Release Day Reminder',
    eventType: 'release_day',
    startDate: '2026-07-15',
    endDate: null,
    isRecurring: false,
    priority: 'high',
    enabled: false,
    frequency: 'every_login',
    audience: 'everyone',
    animation: 'laptop',
    emoji: '🚀',
    message: 'Production release scheduled today. Good luck!',
    actions: [
      { label: "Let's ship it!", emoji: '🚀', type: 'dismiss' },
      { label: 'Dismiss', emoji: '❌', type: 'dismiss' },
    ],
    autoDismissSeconds: null,
  },
]

// ── Default Config ────────────────────────────────────────────────────────────

export const DEFAULT_EVENT_CONFIG: EventGreetingsConfig = {
  enabled: true,
  multipleDisplay: false,
  events: DEFAULT_EVENTS,
}

// ── Storage ───────────────────────────────────────────────────────────────────

const CONFIG_KEY = 'qaly-event-greetings-config'
const SHOWN_KEY = 'qaly-event-shown'

function loadConfig(): EventGreetingsConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_EVENT_CONFIG, ...parsed, events: parsed.events?.length ? parsed.events : DEFAULT_EVENTS }
    }
  } catch {}
  return DEFAULT_EVENT_CONFIG
}

function saveConfig(config: EventGreetingsConfig): void {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)) } catch {}
}

// ── Display Logic ─────────────────────────────────────────────────────────────

/** Check if an event is active today */
export function isEventActiveToday(event: GreetingEvent): boolean {
  if (!event.enabled) return false

  const now = new Date()
  const todayFull = now.toISOString().split('T')[0] // YYYY-MM-DD
  const todayMD = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}` // MM-DD

  if (event.isRecurring) {
    const start = event.startDate // MM-DD
    const end = event.endDate || start // MM-DD
    if (start <= end) {
      return todayMD >= start && todayMD <= end
    } else {
      // Wrapping (e.g., Dec 30 → Jan 02)
      return todayMD >= start || todayMD <= end
    }
  } else {
    // One-time event: YYYY-MM-DD format
    const start = event.startDate
    const end = event.endDate || start
    return todayFull >= start && todayFull <= end
  }
}

/** Check frequency for a specific event */
export function shouldShowEvent(eventId: string, frequency: DisplayFrequency): boolean {
  try {
    const raw = localStorage.getItem(SHOWN_KEY)
    if (!raw) return true
    const data = JSON.parse(raw) as Record<string, { date: string; session: string; dismissed: boolean }>
    const entry = data[eventId]
    if (!entry) return true

    const today = new Date().toISOString().split('T')[0]
    const sessionId = sessionStorage.getItem('qaly-session-id') || ''

    switch (frequency) {
      case 'every_login': return true
      case 'once_per_day': return entry.date !== today
      case 'once_per_session': return entry.session !== sessionId
      case 'until_dismissed': return !entry.dismissed
    }
  } catch {}
  return true
}

/** Mark event as shown */
export function markEventShown(eventId: string, dismissed = false): void {
  try {
    const today = new Date().toISOString().split('T')[0]
    let sessionId = sessionStorage.getItem('qaly-session-id')
    if (!sessionId) { sessionId = Date.now().toString(); sessionStorage.setItem('qaly-session-id', sessionId) }

    const raw = localStorage.getItem(SHOWN_KEY)
    const data = raw ? JSON.parse(raw) : {}
    data[eventId] = { date: today, session: sessionId, dismissed }
    localStorage.setItem(SHOWN_KEY, JSON.stringify(data))
  } catch {}
}

/** Get the highest-priority active event to display */
export function getActiveEvent(config: EventGreetingsConfig): GreetingEvent | null {
  if (!config.enabled) return null

  const priorityOrder: EventPriority[] = ['critical', 'high', 'medium', 'low']
  const activeEvents = config.events
    .filter(e => isEventActiveToday(e) && shouldShowEvent(e.id, e.frequency))
    .sort((a, b) => priorityOrder.indexOf(a.priority) - priorityOrder.indexOf(b.priority))

  return activeEvents[0] || null
}

// ── Zustand Store ─────────────────────────────────────────────────────────────

interface EventGreetingsStore {
  config: EventGreetingsConfig
  setEnabled: (v: boolean) => void
  setMultipleDisplay: (v: boolean) => void
  addEvent: (event: GreetingEvent) => void
  updateEvent: (id: string, updates: Partial<GreetingEvent>) => void
  removeEvent: (id: string) => void
  duplicateEvent: (id: string) => void
  resetToDefaults: () => void
}

export const useEventGreetingsStore = create<EventGreetingsStore>((set, get) => ({
  config: loadConfig(),

  setEnabled: (v) => set(s => {
    const next = { ...s.config, enabled: v }; saveConfig(next); return { config: next }
  }),

  setMultipleDisplay: (v) => set(s => {
    const next = { ...s.config, multipleDisplay: v }; saveConfig(next); return { config: next }
  }),

  addEvent: (event) => set(s => {
    const next = { ...s.config, events: [...s.config.events, event] }; saveConfig(next); return { config: next }
  }),

  updateEvent: (id, updates) => set(s => {
    const next = { ...s.config, events: s.config.events.map(e => e.id === id ? { ...e, ...updates } : e) }; saveConfig(next); return { config: next }
  }),

  removeEvent: (id) => set(s => {
    const next = { ...s.config, events: s.config.events.filter(e => e.id !== id) }; saveConfig(next); return { config: next }
  }),

  duplicateEvent: (id) => set(s => {
    const original = s.config.events.find(e => e.id === id)
    if (!original) return s
    const copy: GreetingEvent = { ...original, id: `${id}_copy_${Date.now()}`, name: `${original.name} (Copy)`, enabled: false }
    const next = { ...s.config, events: [...s.config.events, copy] }; saveConfig(next); return { config: next }
  }),

  resetToDefaults: () => { saveConfig(DEFAULT_EVENT_CONFIG); set({ config: DEFAULT_EVENT_CONFIG }) },
}))
