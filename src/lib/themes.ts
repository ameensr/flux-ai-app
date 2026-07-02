// src/lib/themes.ts
// Centralized design token system — all themes defined here as CSS variable maps.

export type ThemeId =
  | 'dark'
  | 'light'
  | 'fabric'
  | 'github'
  | 'apple'
  | 'material'
  | 'cred'
  | 'powerbi'
  | 'cyber'
  | 'glassmorphism'

export interface ThemeTokens {
  // Core
  '--bg':                string
  '--surface':           string
  '--surface-secondary': string
  '--surface-elevated':  string
  // Text
  '--text-primary':      string
  '--text-secondary':    string
  '--text-muted':        string
  // Accent
  '--accent':            string
  '--accent-fg':         string
  // Border
  '--border':            string
  '--divider':           string
  // Semantic
  '--card-bg':           string
  '--sidebar-bg':        string
  '--nav-bg':            string
  '--input-bg':          string
  '--modal-bg':          string
  '--overlay':           string
  '--hover':             string
  // Chart
  '--chart-grid':        string
  '--chart-text':        string
  '--chart-tooltip-bg':  string
  // Misc
  '--shadow':            string
  '--radius':            string
  '--glass-border':      string
  // Chart palette (serialized as JSON string, parsed at use-site)
  '--chart-colors':      string
}

export const THEMES: Record<ThemeId, ThemeTokens> = {
  dark: {
    '--bg':                '#0B0B0B',
    '--surface':           '#111111',
    '--surface-secondary': '#161616',
    '--surface-elevated':  '#1a1a1a',
    '--text-primary':      '#F5F5F5',
    '--text-secondary':    '#8B8B8B',
    '--text-muted':        '#555555',
    '--accent':            '#D4AF37',
    '--accent-fg':         '#0B0B0B',
    '--border':            'rgba(255,255,255,0.07)',
    '--divider':           'rgba(255,255,255,0.05)',
    '--card-bg':           'rgba(255,255,255,0.02)',
    '--sidebar-bg':        'rgba(255,255,255,0.03)',
    '--nav-bg':            'rgba(11,11,11,0.85)',
    '--input-bg':          'rgba(255,255,255,0.05)',
    '--modal-bg':          '#111111',
    '--overlay':           'rgba(0,0,0,0.6)',
    '--hover':             'rgba(255,255,255,0.05)',
    '--chart-grid':        'rgba(255,255,255,0.05)',
    '--chart-text':        '#555555',
    '--chart-tooltip-bg':  '#111111',
    '--shadow':            '0 8px 32px rgba(0,0,0,0.4)',
    '--radius':            '24px',
    '--glass-border':      'rgba(255,255,255,0.06)',
    '--chart-colors':      '["#D4AF37","#3b82f6","#10b981","#a855f7","#fb923c"]',
  },
  light: {
    '--bg':                '#F8F8F8',
    '--surface':           '#FFFFFF',
    '--surface-secondary': '#F0F0F0',
    '--surface-elevated':  '#FFFFFF',
    '--text-primary':      '#111111',
    '--text-secondary':    '#444444',
    '--text-muted':        '#777777',
    '--accent':            '#B8960C',
    '--accent-fg':         '#FFFFFF',
    '--border':            'rgba(0,0,0,0.12)',
    '--divider':           'rgba(0,0,0,0.08)',
    '--card-bg':           '#FFFFFF',
    '--sidebar-bg':        '#F0F0F0',
    '--nav-bg':            'rgba(248,248,248,0.95)',
    '--input-bg':          '#FFFFFF',
    '--modal-bg':          '#FFFFFF',
    '--overlay':           'rgba(0,0,0,0.4)',
    '--hover':             'rgba(0,0,0,0.05)',
    '--chart-grid':        'rgba(0,0,0,0.08)',
    '--chart-text':        '#555555',
    '--chart-tooltip-bg':  '#FFFFFF',
    '--shadow':            '0 4px 20px rgba(0,0,0,0.10)',
    '--radius':            '24px',
    '--glass-border':      'rgba(0,0,0,0.10)',
    '--chart-colors':      '["#B8960C","#2563eb","#059669","#7c3aed","#ea580c"]',
  },
  fabric: {
    '--bg':                '#f3f2f1',
    '--surface':           '#ffffff',
    '--surface-secondary': '#edebe9',
    '--surface-elevated':  '#ffffff',
    '--text-primary':      '#201f1e',
    '--text-secondary':    '#484644',
    '--text-muted':        '#6e6b69',
    '--accent':            '#0078d4',
    '--accent-fg':         '#ffffff',
    '--border':            '#c8c6c4',
    '--divider':           '#e1dfdd',
    '--card-bg':           '#ffffff',
    '--sidebar-bg':        '#f3f2f1',
    '--nav-bg':            'rgba(243,242,241,0.97)',
    '--input-bg':          '#ffffff',
    '--modal-bg':          '#ffffff',
    '--overlay':           'rgba(0,0,0,0.4)',
    '--hover':             '#edebe9',
    '--chart-grid':        'rgba(0,0,0,0.07)',
    '--chart-text':        '#484644',
    '--chart-tooltip-bg':  '#ffffff',
    '--shadow':            '0 2px 8px rgba(0,0,0,0.12)',
    '--radius':            '4px',
    '--glass-border':      '#c8c6c4',
    '--chart-colors':      '["#0078d4","#107c41","#a80038","#d83b01","#5c2d91"]',
  },
  github: {
    '--bg':                '#0d1117',
    '--surface':           '#161b22',
    '--surface-secondary': '#21262d',
    '--surface-elevated':  '#1c2128',
    '--text-primary':      '#e6edf3',
    '--text-secondary':    '#8b949e',
    '--text-muted':        '#6e7681',
    '--accent':            '#58a6ff',
    '--accent-fg':         '#ffffff',
    '--border':            '#30363d',
    '--divider':           '#21262d',
    '--card-bg':           '#161b22',
    '--sidebar-bg':        '#161b22',
    '--nav-bg':            'rgba(13,17,23,0.9)',
    '--input-bg':          '#0d1117',
    '--modal-bg':          '#161b22',
    '--overlay':           'rgba(0,0,0,0.6)',
    '--hover':             '#21262d',
    '--chart-grid':        'rgba(255,255,255,0.05)',
    '--chart-text':        '#8b949e',
    '--chart-tooltip-bg':  '#161b22',
    '--shadow':            '0 8px 24px rgba(0,0,0,0.4)',
    '--radius':            '8px',
    '--glass-border':      '#30363d',
    '--chart-colors':      '["#58a6ff","#3fb950","#f85149","#db6d28","#ab7df8"]',
  },
  apple: {
    '--bg':                '#f5f5f7',
    '--surface':           '#ffffff',
    '--surface-secondary': '#f5f5f7',
    '--surface-elevated':  '#ffffff',
    '--text-primary':      '#1d1d1f',
    '--text-secondary':    '#3d3d3f',
    '--text-muted':        '#6e6e73',
    '--accent':            '#0071e3',
    '--accent-fg':         '#ffffff',
    '--border':            '#c7c7cc',
    '--divider':           '#d1d1d6',
    '--card-bg':           'rgba(255,255,255,0.9)',
    '--sidebar-bg':        'rgba(245,245,247,0.95)',
    '--nav-bg':            'rgba(245,245,247,0.90)',
    '--input-bg':          '#ffffff',
    '--modal-bg':          '#ffffff',
    '--overlay':           'rgba(0,0,0,0.3)',
    '--hover':             'rgba(0,0,0,0.05)',
    '--chart-grid':        'rgba(0,0,0,0.07)',
    '--chart-text':        '#3d3d3f',
    '--chart-tooltip-bg':  '#ffffff',
    '--shadow':            '0 4px 30px rgba(0,0,0,0.08)',
    '--radius':            '18px',
    '--glass-border':      '#c7c7cc',
    '--chart-colors':      '["#0071e3","#34c759","#ff3b30","#ff9500","#af52de"]',
  },
  material: {
    '--bg':                '#f7f9fc',
    '--surface':           '#eff4f9',
    '--surface-secondary': '#e3eaf2',
    '--surface-elevated':  '#ffffff',
    '--text-primary':      '#1a1a1a',
    '--text-secondary':    '#3c3c3c',
    '--text-muted':        '#5f6368',
    '--accent':            '#0b57d0',
    '--accent-fg':         '#ffffff',
    '--border':            '#adb5bd',
    '--divider':           '#d0d5dd',
    '--card-bg':           '#eff4f9',
    '--sidebar-bg':        '#e3eaf2',
    '--nav-bg':            'rgba(247,249,252,0.97)',
    '--input-bg':          '#ffffff',
    '--modal-bg':          '#eff4f9',
    '--overlay':           'rgba(0,0,0,0.3)',
    '--hover':             'rgba(11,87,208,0.07)',
    '--chart-grid':        'rgba(0,0,0,0.07)',
    '--chart-text':        '#3c3c3c',
    '--chart-tooltip-bg':  '#ffffff',
    '--shadow':            '0 2px 12px rgba(0,0,0,0.10)',
    '--radius':            '28px',
    '--glass-border':      '#adb5bd',
    '--chart-colors':      '["#0b57d0","#b31412","#137333","#e37400","#7a28cb"]',
  },
  cred: {
    '--bg':                '#090909',
    '--surface':           '#121212',
    '--surface-secondary': '#1a1a1a',
    '--surface-elevated':  '#1f1f1f',
    '--text-primary':      '#e5e5e5',
    '--text-secondary':    '#888888',
    '--text-muted':        '#555555',
    '--accent':            '#d4af37',
    '--accent-fg':         '#000000',
    '--border':            'rgba(255,255,255,0.05)',
    '--divider':           'rgba(255,255,255,0.04)',
    '--card-bg':           '#121212',
    '--sidebar-bg':        '#0f0f0f',
    '--nav-bg':            'rgba(9,9,9,0.9)',
    '--input-bg':          '#1a1a1a',
    '--modal-bg':          '#121212',
    '--overlay':           'rgba(0,0,0,0.7)',
    '--hover':             'rgba(255,255,255,0.04)',
    '--chart-grid':        'rgba(255,255,255,0.04)',
    '--chart-text':        '#555555',
    '--chart-tooltip-bg':  '#1a1a1a',
    '--shadow':            '0 0 30px rgba(212,175,55,0.05)',
    '--radius':            '16px',
    '--glass-border':      'rgba(212,175,55,0.15)',
    '--chart-colors':      '["#d4af37","#ffffff","#888888","#444444","#222222"]',
  },
  powerbi: {
    '--bg':                '#e8e8e8',
    '--surface':           '#ffffff',
    '--surface-secondary': '#f0f0f0',
    '--surface-elevated':  '#ffffff',
    '--text-primary':      '#1a1a1a',
    '--text-secondary':    '#3d3d3d',
    '--text-muted':        '#666666',
    '--accent':            '#118d95',
    '--accent-fg':         '#ffffff',
    '--border':            '#a0a3a6',
    '--divider':           '#c8cacc',
    '--card-bg':           '#ffffff',
    '--sidebar-bg':        '#f0f0f0',
    '--nav-bg':            'rgba(232,232,232,0.97)',
    '--input-bg':          '#ffffff',
    '--modal-bg':          '#ffffff',
    '--overlay':           'rgba(0,0,0,0.4)',
    '--hover':             '#ebebeb',
    '--chart-grid':        'rgba(0,0,0,0.08)',
    '--chart-text':        '#3d3d3d',
    '--chart-tooltip-bg':  '#ffffff',
    '--shadow':            '0 2px 8px rgba(0,0,0,0.12)',
    '--radius':            '4px',
    '--glass-border':      '#a0a3a6',
    '--chart-colors':      '["#118d95","#f2c811","#e15241","#3599b8","#dfbf00"]',
  },
  cyber: {
    '--bg':                '#030303',
    '--surface':           '#0a0a0f',
    '--surface-secondary': '#0f0f18',
    '--surface-elevated':  '#12121e',
    '--text-primary':      '#00f0ff',
    '--text-secondary':    '#7af0ff',
    '--text-muted':        '#3a8a90',
    '--accent':            '#ff0055',
    '--accent-fg':         '#000000',
    '--border':            'rgba(255,0,85,0.25)',
    '--divider':           'rgba(0,240,255,0.1)',
    '--card-bg':           '#0a0a0f',
    '--sidebar-bg':        '#080810',
    '--nav-bg':            'rgba(3,3,3,0.9)',
    '--input-bg':          '#0f0f18',
    '--modal-bg':          '#0a0a0f',
    '--overlay':           'rgba(0,0,0,0.8)',
    '--hover':             'rgba(0,240,255,0.05)',
    '--chart-grid':        'rgba(0,240,255,0.06)',
    '--chart-text':        '#3a8a90',
    '--chart-tooltip-bg':  '#0a0a0f',
    '--shadow':            '0 0 20px rgba(0,240,255,0.1)',
    '--radius':            '12px',
    '--glass-border':      'rgba(0,240,255,0.2)',
    '--chart-colors':      '["#00f0ff","#ff0055","#b500ff","#ffb700","#00ff66"]',
  },
  glassmorphism: {
    '--bg':                '#09090b',
    '--surface':           'rgba(255,255,255,0.03)',
    '--surface-secondary': 'rgba(255,255,255,0.05)',
    '--surface-elevated':  'rgba(255,255,255,0.07)',
    '--text-primary':      '#ffffff',
    '--text-secondary':    '#a1a1aa',
    '--text-muted':        '#71717a',
    '--accent':            '#d4af37',
    '--accent-fg':         '#000000',
    '--border':            'rgba(255,255,255,0.08)',
    '--divider':           'rgba(255,255,255,0.05)',
    '--card-bg':           'rgba(255,255,255,0.03)',
    '--sidebar-bg':        'rgba(255,255,255,0.04)',
    '--nav-bg':            'rgba(9,9,11,0.8)',
    '--input-bg':          'rgba(255,255,255,0.05)',
    '--modal-bg':          'rgba(9,9,11,0.9)',
    '--overlay':           'rgba(0,0,0,0.6)',
    '--hover':             'rgba(255,255,255,0.05)',
    '--chart-grid':        'rgba(255,255,255,0.05)',
    '--chart-text':        '#71717a',
    '--chart-tooltip-bg':  'rgba(9,9,11,0.95)',
    '--shadow':            '0 8px 32px rgba(0,0,0,0.4)',
    '--radius':            '24px',
    '--glass-border':      'rgba(255,255,255,0.08)',
    '--chart-colors':      '["#d4af37","#3b82f6","#10b981","#a855f7","#fb923c"]',
  },
}

export const THEME_LABELS: Record<ThemeId, string> = {
  dark:           'Dark',
  light:          'Light',
  fabric:         'Microsoft Fabric',
  github:         'GitHub',
  apple:          'Apple',
  material:       'Google Material',
  cred:           'CRED Black',
  powerbi:        'Power BI',
  cyber:          'Neon Cyber',
  glassmorphism:  'Glassmorphism',
}

export const STORAGE_KEY = 'flux-theme'

export function applyTheme(id: ThemeId): void {
  const tokens = THEMES[id]
  const root = document.documentElement
  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value)
  }
  // Remove all theme classes, add current
  const allIds: ThemeId[] = Object.keys(THEMES) as ThemeId[]
  root.classList.remove(...allIds.map(t => `theme-${t}`))
  root.classList.add(`theme-${id}`)
  // Legacy light/dark class for any third-party components
  if (id === 'light' || id === 'fabric' || id === 'apple' || id === 'material' || id === 'powerbi') {
    root.classList.add('light')
    root.classList.remove('dark')
  } else {
    root.classList.add('dark')
    root.classList.remove('light')
  }
}

export function getChartColors(id: ThemeId): string[] {
  try {
    return JSON.parse(THEMES[id]['--chart-colors'])
  } catch {
    return ['#D4AF37', '#3b82f6', '#10b981', '#a855f7', '#fb923c']
  }
}
