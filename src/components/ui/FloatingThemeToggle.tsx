// src/components/ui/FloatingThemeToggle.tsx
import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'

export const FloatingThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className="fixed z-[59] pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 print:hidden"
      style={{
        bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        right: 'calc(5.5rem + env(safe-area-inset-right, 0px))',
        width: '44px',
        height: '44px',
        borderRadius: '14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in srgb, var(--surface-elevated) 80%, transparent)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: 'var(--shadow-sm)',
        color: 'var(--text-secondary)',
        // @ts-ignore
        '--tw-ring-color': 'var(--accent)',
        '--tw-ring-offset-color': 'var(--bg)',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.color = 'var(--text-primary)'
        e.currentTarget.style.borderColor = 'color-mix(in srgb, var(--accent) 35%, transparent)'
        e.currentTarget.style.background = 'color-mix(in srgb, var(--accent) 10%, var(--surface-elevated))'
      }}
      onMouseLeave={e => {
        e.currentTarget.style.color = 'var(--text-secondary)'
        e.currentTarget.style.borderColor = 'var(--glass-border)'
        e.currentTarget.style.background = 'color-mix(in srgb, var(--surface-elevated) 80%, transparent)'
      }}
    >
      {isDark
        ? <Sun className="w-4 h-4" aria-hidden />
        : <Moon className="w-4 h-4" aria-hidden />
      }
    </button>
  )
}
