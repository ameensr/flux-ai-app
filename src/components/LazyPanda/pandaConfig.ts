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
}

export interface PandaGlobalConfig {
  /** Master switch — disables panda entirely when false */
  enabled: boolean
  /** Individual feature toggles */
  features: PandaFeatureToggles
}

// ── Defaults ──────────────────────────────────────────────────────────────────

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
}

export const DEFAULT_PANDA_CONFIG: PandaGlobalConfig = {
  enabled: true,
  features: DEFAULT_FEATURES,
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
  resetToDefaults: () => void
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

  resetToDefaults: () => {
    saveConfig(DEFAULT_PANDA_CONFIG)
    set({ config: DEFAULT_PANDA_CONFIG })
  },
}))
