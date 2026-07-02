/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      colors: {
        // All mapped to CSS variables — update once, applies everywhere
        background:  'var(--bg)',
        surface: {
          DEFAULT:   'var(--surface)',
          secondary: 'var(--surface-secondary)',
          elevated:  'var(--surface-elevated)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          gold:    'var(--accent)',
          silver:  '#C0C0C0',
          fg:      'var(--accent-fg)',
        },
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
        },
        border:  'var(--border)',
        divider: 'var(--divider)',
        card:    'var(--card-bg)',
        sidebar: 'var(--sidebar-bg)',
        input:   'var(--input-bg)',
        modal:   'var(--modal-bg)',
        hover:   'var(--hover)',
        // Legacy aliases kept for backward compat
        glass:   'var(--card-bg)',
        glow:    'var(--hover)',
        foreground: 'var(--text-primary)',
      },
      fontFamily: {
        satoshi:  ['Satoshi', 'sans-serif'],
        general:  ['General Sans', 'sans-serif'],
        montreal: ['Neue Montreal', 'sans-serif'],
        inter:    ['Inter', 'sans-serif'],
        clash:    ['Clash Display', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '24px',
        '3xl': '32px',
      },
      animation: {
        'glow-pulse': 'glow-pulse 4s cubic-bezier(0.4,0,0.6,1) infinite',
        'reveal':     'reveal 0.8s cubic-bezier(0.22,1,0.36,1) forwards',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '0.1' },
          '50%':      { opacity: '0.3' },
        },
        reveal: {
          '0%':   { opacity: '0', transform: 'translateY(20px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      transitionTimingFunction: {
        cinematic: 'cubic-bezier(0.22,1,0.36,1)',
      },
    },
  },
  plugins: [],
}
