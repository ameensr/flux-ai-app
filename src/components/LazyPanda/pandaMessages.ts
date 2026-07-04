// src/components/LazyPanda/pandaMessages.ts
// Smart Panda Messages — config, data, frequency, and contextual detection.

import { create } from 'zustand'

// ── Types ─────────────────────────────────────────────────────────────────────

export type MessageCategory = 'weekend' | 'late_night' | 'early_morning' | 'first_of_week' | 'holiday' | 'general'
export type ShowFrequency = 'every_login' | 'once_per_day' | 'once_per_session'
export type PandaAnimation = 'wave' | 'yawn' | 'coffee' | 'laptop' | 'stretch' | 'scratch' | 'smile' | 'point' | 'sign'

export interface SmartMessage {
  id: string
  text: string
  emoji: string
  category: MessageCategory
  animation: PandaAnimation
  enabled: boolean
}

export interface MessageResponse {
  label: string
  emoji: string
  reply: string
}

export interface SmartMessagesConfig {
  enabled: boolean
  activeDays: { saturday: boolean; sunday: boolean }
  frequency: ShowFrequency
  randomize: boolean
  lateNightEnabled: boolean   // after 10 PM
  earlyMorningEnabled: boolean // before 6 AM
  firstOfWeekEnabled: boolean
  messages: SmartMessage[]
}

// ── Default Messages ──────────────────────────────────────────────────────────

export const DEFAULT_MESSAGES: SmartMessage[] = [
  // Weekend - Work-Life Balance
  { id: 'w1',  text: 'Working on a weekend?', emoji: '👀', category: 'weekend', animation: 'scratch', enabled: true },
  { id: 'w2',  text: 'Even I took a nap... are you sure you want to work?', emoji: '🐼', category: 'weekend', animation: 'yawn', enabled: true },
  { id: 'w3',  text: 'Weekend? More like "work-end"?', emoji: '☕', category: 'weekend', animation: 'coffee', enabled: true },
  { id: 'w4',  text: 'Did your manager send you here?', emoji: '😴', category: 'weekend', animation: 'scratch', enabled: true },
  { id: 'w5',  text: 'Overtime mode detected...', emoji: '💼', category: 'weekend', animation: 'laptop', enabled: true },
  { id: 'w6',  text: "Shouldn't you be relaxing today?", emoji: '🌴', category: 'weekend', animation: 'stretch', enabled: true },
  { id: 'w7',  text: 'Weekend login? Hope there\'s pizza involved!', emoji: '🍕', category: 'weekend', animation: 'smile', enabled: true },
  { id: 'w8',  text: 'Sunshine is outside... just saying.', emoji: '🌞', category: 'weekend', animation: 'point', enabled: true },
  { id: 'w9',  text: 'I was sleeping... you woke me up!', emoji: '🐼', category: 'weekend', animation: 'yawn', enabled: true },
  { id: 'w10', text: 'Bug hunting on a Saturday?', emoji: '🤔', category: 'weekend', animation: 'scratch', enabled: true },
  { id: 'w11', text: 'Deploying greatness this weekend?', emoji: '🚀', category: 'weekend', animation: 'sign', enabled: true },
  { id: 'w12', text: 'Another production emergency?', emoji: '💻', category: 'weekend', animation: 'laptop', enabled: true },
  { id: 'w13', text: 'Coffee first... then bugs?', emoji: '☕', category: 'weekend', animation: 'coffee', enabled: true },
  { id: 'w14', text: 'Testing never sleeps, huh?', emoji: '🧪', category: 'weekend', animation: 'scratch', enabled: true },
  { id: 'w15', text: 'Chasing deadlines again?', emoji: '🎯', category: 'weekend', animation: 'point', enabled: true },
  // Weekend - QA themed
  { id: 'w16', text: 'Found another bug already?', emoji: '🐞', category: 'weekend', animation: 'scratch', enabled: true },
  { id: 'w17', text: 'Weekend regression testing?', emoji: '📋', category: 'weekend', animation: 'laptop', enabled: true },
  { id: 'w18', text: 'Production issue?', emoji: '🚨', category: 'weekend', animation: 'wave', enabled: true },
  { id: 'w19', text: 'Are you testing... or being tested?', emoji: '🧪', category: 'weekend', animation: 'scratch', enabled: true },
  { id: 'w20', text: "Remember: It's always the last test case.", emoji: '🐼', category: 'weekend', animation: 'smile', enabled: true },
  // Weekend - AI themed
  { id: 'w21', text: 'Even AI takes maintenance breaks.', emoji: '🤖', category: 'weekend', animation: 'stretch', enabled: true },
  { id: 'w22', text: 'Training models on a Sunday?', emoji: '🧠', category: 'weekend', animation: 'laptop', enabled: true },
  { id: 'w23', text: 'Building the future never stops.', emoji: '🚀', category: 'weekend', animation: 'sign', enabled: true },
  { id: 'w24', text: 'Ready to make Qaly AI Engine even smarter today?', emoji: '⚡', category: 'weekend', animation: 'wave', enabled: true },
  // Late night
  { id: 'ln1', text: "Still awake? Don't forget to rest!", emoji: '😴', category: 'late_night', animation: 'yawn', enabled: true },
  { id: 'ln2', text: 'Midnight coding session?', emoji: '🌙', category: 'late_night', animation: 'coffee', enabled: true },
  { id: 'ln3', text: 'The bugs can wait until morning...', emoji: '🐞', category: 'late_night', animation: 'yawn', enabled: true },
  // Early morning
  { id: 'em1', text: "You're up early! Coffee first?", emoji: '☕', category: 'early_morning', animation: 'coffee', enabled: true },
  { id: 'em2', text: 'Early bird catches the bug!', emoji: '🌅', category: 'early_morning', animation: 'stretch', enabled: true },
  // First of week
  { id: 'fw1', text: "Let's make this a productive week!", emoji: '🏆', category: 'first_of_week', animation: 'wave', enabled: true },
  { id: 'fw2', text: 'New week, new deployments!', emoji: '🚀', category: 'first_of_week', animation: 'sign', enabled: true },
]

export const INTERACTIVE_RESPONSES: Record<string, { question: string; options: MessageResponse[] }> = {
  weekend: {
    question: 'Working this weekend?',
    options: [
      { label: 'Yes, unfortunately...', emoji: '😅', reply: "You're awesome. Don't forget to take breaks! ☕" },
      { label: 'No, just checking something.', emoji: '😎', reply: 'Good! I was worried for a second. 😄' },
    ],
  },
  late_night: {
    question: 'Burning the midnight oil?',
    options: [
      { label: 'Debugging emergency!', emoji: '🔥', reply: 'You got this! Ship it and sleep. 🚀' },
      { label: 'Just one more thing...', emoji: '🤞', reply: "That's what they all say... 😄 Good luck!" },
    ],
  },
  early_morning: {
    question: 'Up before the sun?',
    options: [
      { label: 'Early start today!', emoji: '💪', reply: 'Respect! The quiet hours are the best for coding. ☕' },
      { label: "Couldn't sleep...", emoji: '😅', reply: "Hope it's not a production issue! 🤞" },
    ],
  },
  first_of_week: {
    question: 'Ready for the week?',
    options: [
      { label: "Let's go!", emoji: '🚀', reply: "That's the spirit! Let's build something great. 💪" },
      { label: 'Need more coffee...', emoji: '☕', reply: 'Same here. Coffee loading... ███░░ 60%' },
    ],
  },
}

// ── Default Config ────────────────────────────────────────────────────────────

export const DEFAULT_MESSAGES_CONFIG: SmartMessagesConfig = {
  enabled: true,
  activeDays: { saturday: true, sunday: true },
  frequency: 'once_per_day',
  randomize: true,
  lateNightEnabled: true,
  earlyMorningEnabled: true,
  firstOfWeekEnabled: true,
  messages: DEFAULT_MESSAGES,
}

// ── Storage & Frequency Logic ─────────────────────────────────────────────────

const CONFIG_KEY = 'qaly-panda-messages-config'
const SHOWN_KEY = 'qaly-panda-msg-shown'
const LAST_MSG_KEY = 'qaly-panda-last-msg'

function loadMessagesConfig(): SmartMessagesConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_MESSAGES_CONFIG, ...parsed, messages: parsed.messages?.length ? parsed.messages : DEFAULT_MESSAGES }
    }
  } catch {}
  return DEFAULT_MESSAGES_CONFIG
}

function saveMessagesConfig(config: SmartMessagesConfig): void {
  try { localStorage.setItem(CONFIG_KEY, JSON.stringify(config)) } catch {}
}

/** Check if the message should be shown based on frequency */
export function shouldShowMessage(frequency: ShowFrequency): boolean {
  try {
    const shown = localStorage.getItem(SHOWN_KEY)
    if (!shown) return true

    const data = JSON.parse(shown) as { date: string; session: string }
    const today = new Date().toISOString().split('T')[0]

    switch (frequency) {
      case 'every_login': return true
      case 'once_per_day': return data.date !== today
      case 'once_per_session': return data.session !== sessionStorage.getItem('qaly-session-id')
    }
  } catch {}
  return true
}

/** Mark the message as shown */
export function markMessageShown(): void {
  try {
    const today = new Date().toISOString().split('T')[0]
    let sessionId = sessionStorage.getItem('qaly-session-id')
    if (!sessionId) { sessionId = Date.now().toString(); sessionStorage.setItem('qaly-session-id', sessionId) }
    localStorage.setItem(SHOWN_KEY, JSON.stringify({ date: today, session: sessionId }))
  } catch {}
}

/** Get last shown message ID to avoid repeats */
function getLastMessageId(): string | null {
  try { return localStorage.getItem(LAST_MSG_KEY) } catch { return null }
}

function setLastMessageId(id: string): void {
  try { localStorage.setItem(LAST_MSG_KEY, id) } catch {}
}

// ── Context Detection ─────────────────────────────────────────────────────────

export function detectMessageCategory(): MessageCategory | null {
  const now = new Date()
  const day = now.getDay() // 0=Sun, 6=Sat
  const hour = now.getHours()

  if (day === 0 || day === 6) return 'weekend'
  if (hour >= 22 || hour < 4) return 'late_night'
  if (hour >= 4 && hour < 6) return 'early_morning'
  if (day === 1 && hour < 12) return 'first_of_week'
  return null
}

/** Pick a random message for the detected category */
export function pickMessage(config: SmartMessagesConfig): SmartMessage | null {
  const category = detectMessageCategory()
  if (!category) return null

  // Check if category is enabled
  if (category === 'weekend') {
    const dayName = new Date().getDay() === 0 ? 'sunday' : 'saturday'
    if (!config.activeDays[dayName as keyof typeof config.activeDays]) return null
  }
  if (category === 'late_night' && !config.lateNightEnabled) return null
  if (category === 'early_morning' && !config.earlyMorningEnabled) return null
  if (category === 'first_of_week' && !config.firstOfWeekEnabled) return null

  const eligible = config.messages.filter(m => m.enabled && m.category === category)
  if (eligible.length === 0) return null

  if (config.randomize) {
    const lastId = getLastMessageId()
    const filtered = eligible.length > 1 ? eligible.filter(m => m.id !== lastId) : eligible
    const chosen = filtered[Math.floor(Math.random() * filtered.length)]
    setLastMessageId(chosen.id)
    return chosen
  }

  return eligible[0]
}

// ── Zustand Store ─────────────────────────────────────────────────────────────

interface PandaMessagesStore {
  config: SmartMessagesConfig
  setEnabled: (v: boolean) => void
  setFrequency: (f: ShowFrequency) => void
  setRandomize: (v: boolean) => void
  setActiveDay: (day: 'saturday' | 'sunday', v: boolean) => void
  setContextEnabled: (key: 'lateNightEnabled' | 'earlyMorningEnabled' | 'firstOfWeekEnabled', v: boolean) => void
  addMessage: (msg: SmartMessage) => void
  updateMessage: (id: string, updates: Partial<SmartMessage>) => void
  removeMessage: (id: string) => void
  resetToDefaults: () => void
}

export const usePandaMessagesStore = create<PandaMessagesStore>((set) => ({
  config: loadMessagesConfig(),

  setEnabled: (v) => set(s => {
    const next = { ...s.config, enabled: v }; saveMessagesConfig(next); return { config: next }
  }),

  setFrequency: (f) => set(s => {
    const next = { ...s.config, frequency: f }; saveMessagesConfig(next); return { config: next }
  }),

  setRandomize: (v) => set(s => {
    const next = { ...s.config, randomize: v }; saveMessagesConfig(next); return { config: next }
  }),

  setActiveDay: (day, v) => set(s => {
    const next = { ...s.config, activeDays: { ...s.config.activeDays, [day]: v } }; saveMessagesConfig(next); return { config: next }
  }),

  setContextEnabled: (key, v) => set(s => {
    const next = { ...s.config, [key]: v }; saveMessagesConfig(next); return { config: next }
  }),

  addMessage: (msg) => set(s => {
    const next = { ...s.config, messages: [...s.config.messages, msg] }; saveMessagesConfig(next); return { config: next }
  }),

  updateMessage: (id, updates) => set(s => {
    const next = { ...s.config, messages: s.config.messages.map(m => m.id === id ? { ...m, ...updates } : m) }; saveMessagesConfig(next); return { config: next }
  }),

  removeMessage: (id) => set(s => {
    const next = { ...s.config, messages: s.config.messages.filter(m => m.id !== id) }; saveMessagesConfig(next); return { config: next }
  }),

  resetToDefaults: () => { saveMessagesConfig(DEFAULT_MESSAGES_CONFIG); set({ config: DEFAULT_MESSAGES_CONFIG }) },
}))
