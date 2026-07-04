// src/components/LazyPanda/pandaConfig.ts
// Global Lazy Panda configuration — types, defaults, and Zustand store.
// Persisted in localStorage. Admin-only write access enforced in the UI layer.

import { create } from 'zustand'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface PandaFeatureToggles {
  walking: boolean
  emailTracking: boolean
  passwordCover: boolean
  passwordPeek: boolean
  loginSuccess: boolean
  loginFailure: boolean
  idleSleep: boolean
  cursorTracking: boolean
  loadingAnimation: boolean
  easterEggs: boolean
  microAnimations: boolean // blinking, ear twitch, tail, breathing
  soundEffects: boolean   // future
}

export interface SeasonalTheme {
  id: string
  name: string
  emoji: string
  enabled: boolean
  startDate: string // ISO date (MM-DD)
  endDate: string   // ISO date (MM-DD)
}

export interface PandaGlobalConfig {
  /** Master switch — disables panda entirely when false */
  enabled: boolean
  /** Individual feature toggles */
  features: PandaFeatureToggles
  /** Seasonal themes master switch */
  seasonalEnabled: boolean
  /** Seasonal theme definitions */
  seasonalThemes: SeasonalTheme[]
}

// ── Defaults ──────────────────────────────────────────────────────────────────

export const DEFAULT_SEASONAL_THEMES: SeasonalTheme[] = [
  { id: 'christmas',    name: 'Christmas',        emoji: '🎄', enabled: true,  startDate: '12-01', endDate: '12-31' },
  { id: 'valentine',    name: "Valentine's Day",  emoji: '❤️', enabled: true,  startDate: '02-10', endDate: '02-16' },
  { id: 'eid',          name: 'Eid',              emoji: '🌙', enabled: true,  startDate: '03-28', endDate: '04-02' },
  { id: 'diwali',       name: 'Diwali',           emoji: '🪔', enabled: true,  startDate: '10-20', endDate: '11-05' },
  { id: 'halloween',    name: 'Halloween',        emoji: '🎃', enabled: true,  startDate: '10-25', endDate: '11-01' },
  { id: 'easter',       name: 'Easter',           emoji: '🐰', enabled: true,  startDate: '03-25', endDate: '04-05' },
  { id: 'newyear',      name: 'New Year',         emoji: '🎆', enabled: true,  startDate: '12-30', endDate: '01-03' },
  { id: 'stpatricks',   name: "St. Patrick's Day",emoji: '☘️', enabled: true,  startDate: '03-15', endDate: '03-19' },
  { id: 'spring',       name: 'Spring',           emoji: '🌸', enabled: true,  startDate: '03-20', endDate: '04-20' },
  { id: 'winter',       name: 'Winter',           emoji: '❄️', enabled: true,  startDate: '12-01', endDate: '02-28' },
]

export const DEFAULT_FEATURES: PandaFeatureToggles = {
  walking: true,
  emailTracking: true,
  passwordCover: true,
  passwordPeek: true,
  loginSuccess: true,
  loginFailure: true,
  idleSleep: true,
  cursorTracking: true,
  loadingAnimation: true,
  easterEggs: true,
  microAnimations: true,
  soundEffects: false,
}

export const DEFAULT_PANDA_CONFIG: PandaGlobalConfig = {
  enabled: true,
  features: DEFAULT_FEATURES,
  seasonalEnabled: true,
  seasonalThemes: DEFAULT_SEASONAL_THEMES,
}

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = 'qaly-panda-config'

function loadConfig(): PandaGlobalConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Merge with defaults to handle newly added fields
      return {
        ...DEFAULT_PANDA_CONFIG,
        ...parsed,
        features: { ...DEFAULT_FEATURES, ...parsed.features },
        seasonalThemes: parsed.seasonalThemes?.length ? parsed.seasonalThemes : DEFAULT_SEASONAL_THEMES,
      }
    }
  } catch { /* corrupt data — use defaults */ }
  return DEFAULT_PANDA_CONFIG
}

function saveConfig(config: PandaGlobalConfig): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch { /* storage full — non-critical */ }
}

// ── Zustand Store ─────────────────────────────────────────────────────────────

interface PandaConfigStore {
  config: PandaGlobalConfig
  setEnabled: (enabled: boolean) => void
  setFeature: (key: keyof PandaFeatureToggles, value: boolean) => void
  setSeasonalEnabled: (enabled: boolean) => void
  updateSeasonalTheme: (id: string, updates: Partial<SeasonalTheme>) => void
  addSeasonalTheme: (theme: SeasonalTheme) => void
  removeSeasonalTheme: (id: string) => void
  resetToDefaults: () => void
  /** Get the currently active seasonal theme (if any) */
  getActiveSeasonalTheme: () => SeasonalTheme | null
}

export const usePandaConfigStore = create<PandaConfigStore>((set, get) => ({
  config: loadConfig(),

  setEnabled: (enabled) => {
    set(state => {
      const next = { ...state.config, enabled }
      saveConfig(next)
      return { config: next }
    })
  },

  setFeature: (key, value) => {
    set(state => {
      const next = { ...state.config, features: { ...state.config.features, [key]: value } }
      saveConfig(next)
      return { config: next }
    })
  },

  setSeasonalEnabled: (enabled) => {
    set(state => {
      const next = { ...state.config, seasonalEnabled: enabled }
      saveConfig(next)
      return { config: next }
    })
  },

  updateSeasonalTheme: (id, updates) => {
    set(state => {
      const themes = state.config.seasonalThemes.map(t => t.id === id ? { ...t, ...updates } : t)
      const next = { ...state.config, seasonalThemes: themes }
      saveConfig(next)
      return { config: next }
    })
  },

  addSeasonalTheme: (theme) => {
    set(state => {
      const next = { ...state.config, seasonalThemes: [...state.config.seasonalThemes, theme] }
      saveConfig(next)
      return { config: next }
    })
  },

  removeSeasonalTheme: (id) => {
    set(state => {
      const next = { ...state.config, seasonalThemes: state.config.seasonalThemes.filter(t => t.id !== id) }
      saveConfig(next)
      return { config: next }
    })
  },

  resetToDefaults: () => {
    saveConfig(DEFAULT_PANDA_CONFIG)
    set({ config: DEFAULT_PANDA_CONFIG })
  },

  getActiveSeasonalTheme: () => {
    const { config } = get()
    if (!config.enabled || !config.seasonalEnabled) return null

    const now = new Date()
    const monthDay = `${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    for (const theme of config.seasonalThemes) {
      if (!theme.enabled) continue
      // Handle wrapping (e.g., Dec 30 → Jan 03)
      if (theme.startDate <= theme.endDate) {
        if (monthDay >= theme.startDate && monthDay <= theme.endDate) return theme
      } else {
        if (monthDay >= theme.startDate || monthDay <= theme.endDate) return theme
      }
    }
    return null
  },
}))
