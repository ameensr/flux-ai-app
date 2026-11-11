// src/lib/themes.ts
// Qaly AI Engine — two-mode design system: dark & light only.
// /report-preview has its own isolated theme system — untouched.

export type ThemeId = 'dark' | 'light'

export interface ThemeTokens {
  '--bg': string
  '--surface': string
  '--surface-secondary': string
  '--surface-elevated': string
  '--text-primary': string
  '--text-secondary': string
  '--text-muted': string
  '--accent': string
  '--accent-fg': string
  '--accent-hover': string
  '--border': string
  '--divider': string
  '--card-bg': string
  '--sidebar-bg': string
  '--nav-bg': string
  '--input-bg': string
  '--modal-bg': string
  '--overlay': string
  '--hover': string
  '--chart-grid': string
  '--chart-text': string
  '--chart-tooltip-bg': string
  '--shadow': string
  '--shadow-sm': string
  '--radius': string
  '--glass-border': string
  '--glass-highlight': string
  '--glass-glow': string
  '--chart-colors': string
}

export const THEMES: Record<ThemeId, ThemeTokens> = {
  dark: {
    '--bg': '#090D1A',
    '--surface': '#0F1629',
    '--surface-secondary': '#131B33',
    '--surface-elevated': '#182240',
    '--text-primary': '#F3F6FC',
    '--text-secondary': '#A4B3CD',
    '--text-muted': '#62728D',
    '--accent': '#6366F1',
    '--accent-fg': '#ffffff',
    '--accent-hover': '#4F46E5',
    '--border': 'rgba(255, 255, 255, 0.08)',
    '--divider': 'rgba(255, 255, 255, 0.06)',
    '--card-bg': 'rgba(15, 22, 41, 0.65)',
    '--sidebar-bg': '#0A0F1D',
    '--nav-bg': 'rgba(9, 13, 26, 0.82)',
    '--input-bg': 'rgba(255, 255, 255, 0.05)',
    '--modal-bg': '#0F172A',
    '--overlay': 'rgba(3, 6, 15, 0.75)',
    '--hover': 'rgba(255, 255, 255, 0.08)',
    '--chart-grid': 'rgba(255, 255, 255, 0.06)',
    '--chart-text': '#62728D',
    '--chart-tooltip-bg': '#141D36',
    '--shadow': '0 20px 50px -10px rgba(0, 0, 0, 0.65), 0 0 24px rgba(99, 102, 241, 0.06)',
    '--shadow-sm': '0 4px 16px -2px rgba(0, 0, 0, 0.4), 0 1px 3px rgba(0, 0, 0, 0.3)',
    '--radius': '16px',
    '--glass-border': 'rgba(255, 255, 255, 0.1)',
    '--glass-highlight': 'rgba(255, 255, 255, 0.12)',
    '--glass-glow': 'rgba(99, 102, 241, 0.15)',
    '--chart-colors': '["#6366F1","#3b82f6","#10b981","#a855f7","#f59e0b"]',
  },
  light: {
    '--bg': '#F4F6FB',
    '--surface': '#FFFFFF',
    '--surface-secondary': '#EDF2F9',
    '--surface-elevated': '#FFFFFF',
    '--text-primary': '#0F172A',
    '--text-secondary': '#475569',
    '--text-muted': '#8898AA',
    '--accent': '#6366F1',
    '--accent-fg': '#ffffff',
    '--accent-hover': '#4F46E5',
    '--border': 'rgba(15, 23, 42, 0.08)',
    '--divider': 'rgba(15, 23, 42, 0.06)',
    '--card-bg': 'rgba(255, 255, 255, 0.8)',
    '--sidebar-bg': 'rgba(255, 255, 255, 0.88)',
    '--nav-bg': 'rgba(244, 246, 251, 0.85)',
    '--input-bg': 'rgba(241, 245, 249, 0.8)',
    '--modal-bg': '#FFFFFF',
    '--overlay': 'rgba(15, 23, 42, 0.4)',
    '--hover': 'rgba(99, 102, 241, 0.06)',
    '--chart-grid': 'rgba(15, 23, 42, 0.06)',
    '--chart-text': '#8898AA',
    '--chart-tooltip-bg': '#FFFFFF',
    '--shadow': '0 20px 40px -15px rgba(15, 23, 42, 0.1), 0 0 15px rgba(99, 102, 241, 0.04)',
    '--shadow-sm': '0 2px 10px -1px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
    '--radius': '16px',
    '--glass-border': 'rgba(255, 255, 255, 0.7)',
    '--glass-highlight': 'rgba(255, 255, 255, 0.8)',
    '--glass-glow': 'rgba(99, 102, 241, 0.1)',
    '--chart-colors': '["#6366F1","#3b82f6","#10b981","#a855f7","#f59e0b"]',
  },
}

export const THEME_LABELS: Record<ThemeId, string> = {
  dark: 'Dark',
  light: 'Light',
}

export const STORAGE_KEY = 'qaly-theme'

export function applyTheme(id: ThemeId): void {
  const tokens = THEMES[id]
  const root = document.documentElement
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value)
  }
  root.classList.remove('theme-dark', 'theme-light', 'dark', 'light')
  root.classList.add(`theme-${id}`, id === 'light' ? 'light' : 'dark')
}

export function getChartColors(id: ThemeId): string[] {
  try { return JSON.parse(THEMES[id]['--chart-colors']) }
  catch { return ['#6366F1', '#3b82f6', '#10b981', '#a855f7', '#f59e0b'] }
}
