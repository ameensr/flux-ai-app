// src/components/ui/FloatingThemeToggle.tsx
import React from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAIAccess } from '@/hooks/useAIAccess'

export const FloatingThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme()
  const { canUseCopilot } = useAIAccess()
  const hasCopilot = canUseCopilot()

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className="fixed z-[60] pressable focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 print:hidden cursor-pointer"
      style={{
        bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        right: hasCopilot
          ? 'calc(7.25rem + env(safe-area-inset-right, 0px))'
          : 'calc(1.5rem + env(safe-area-inset-right, 0px))',
        width: '44px',
        height: '44px',
        borderRadius: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'color-mix(in srgb, var(--surface-elevated) 80%, transparent)',
        border: '1px solid var(--glass-border)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: 'var(--shadow-sm)',
        color: 'var(--text-secondary)',
        transition: 'right 0.2s ease, background 0.15s ease, border-color 0.15s ease, color 0.15s ease',
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

