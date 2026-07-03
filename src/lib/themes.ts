// src/lib/themes.ts
// Qaly AI Engine — two-mode design system: dark & light only.
// /report-preview has its own isolated theme system — untouched.

export type ThemeId = 'dark' | 'light'

export interface ThemeTokens {
  '--bg':                string
  '--surface':           string
  '--surface-secondary': string
  '--surface-elevated':  string
  '--text-primary':      string
  '--text-secondary':    string
  '--text-muted':        string
  '--accent':            string
  '--accent-fg':         string
  '--accent-hover':      string
  '--border':            string
  '--divider':           string
  '--card-bg':           string
  '--sidebar-bg':        string
  '--nav-bg':            string
  '--input-bg':          string
  '--modal-bg':          string
  '--overlay':           string
  '--hover':             string
  '--chart-grid':        string
  '--chart-text':        string
  '--chart-tooltip-bg':  string
  '--shadow':            string
  '--shadow-sm':         string
  '--radius':            string
  '--glass-border':      string
  '--chart-colors':      string
}

export const THEMES: Record<ThemeId, ThemeTokens> = {
  dark: {
    '--bg':                '#0B1020',
    '--surface':           '#111827',
    '--surface-secondary': '#161f30',
    '--surface-elevated':  '#1a2235',
    '--text-primary':      '#F1F5F9',
    '--text-secondary':    '#94A3B8',
    '--text-muted':        '#475569',
    '--accent':            '#6366F1',
    '--accent-fg':         '#ffffff',
    '--accent-hover':      '#4F46E5',
    '--border':            'rgba(148,163,184,0.1)',
    '--divider':           'rgba(148,163,184,0.07)',
    '--card-bg':           'rgba(255,255,255,0.03)',
    '--sidebar-bg':        '#0f1623',
    '--nav-bg':            'rgba(11,16,32,0.9)',
    '--input-bg':          'rgba(255,255,255,0.05)',
    '--modal-bg':          '#111827',
    '--overlay':           'rgba(0,0,0,0.65)',
    '--hover':             'rgba(255,255,255,0.05)',
    '--chart-grid':        'rgba(148,163,184,0.08)',
    '--chart-text':        '#475569',
    '--chart-tooltip-bg':  '#1a2235',
    '--shadow':            '0 4px 24px rgba(0,0,0,0.35)',
    '--shadow-sm':         '0 1px 4px rgba(0,0,0,0.25)',
    '--radius':            '12px',
    '--glass-border':      'rgba(148,163,184,0.1)',
    '--chart-colors':      '["#6366F1","#3b82f6","#10b981","#a855f7","#f59e0b"]',
  },
  light: {
    '--bg':                '#F8FAFC',
    '--surface':           '#FFFFFF',
    '--surface-secondary': '#F1F5F9',
    '--surface-elevated':  '#FFFFFF',
    '--text-primary':      '#0F172A',
    '--text-secondary':    '#475569',
    '--text-muted':        '#94A3B8',
    '--accent':            '#6366F1',
    '--accent-fg':         '#ffffff',
    '--accent-hover':      '#4F46E5',
    '--border':            'rgba(15,23,42,0.1)',
    '--divider':           'rgba(15,23,42,0.07)',
    '--card-bg':           '#FFFFFF',
    '--sidebar-bg':        '#FFFFFF',
    '--nav-bg':            'rgba(248,250,252,0.92)',
    '--input-bg':          '#F8FAFC',
    '--modal-bg':          '#FFFFFF',
    '--overlay':           'rgba(15,23,42,0.4)',
    '--hover':             'rgba(15,23,42,0.04)',
    '--chart-grid':        'rgba(15,23,42,0.07)',
    '--chart-text':        '#94A3B8',
    '--chart-tooltip-bg':  '#FFFFFF',
    '--shadow':            '0 1px 8px rgba(15,23,42,0.08), 0 4px 24px rgba(15,23,42,0.06)',
    '--shadow-sm':         '0 1px 3px rgba(15,23,42,0.08)',
    '--radius':            '12px',
    '--glass-border':      'rgba(15,23,42,0.1)',
    '--chart-colors':      '["#6366F1","#3b82f6","#10b981","#a855f7","#f59e0b"]',
  },
}

export const THEME_LABELS: Record<ThemeId, string> = {
  dark:  'Dark',
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
