import React, { useState, useEffect } from 'react'
import { Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { useAIAccess } from '@/hooks/useAIAccess'

export const FloatingThemeToggle: React.FC = () => {
  const { isDark, toggleTheme } = useTheme()
  const { canUseCopilot } = useAIAccess()
  const hasCopilot = canUseCopilot()
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(!!(
      document.fullscreenElement || (document as any).webkitFullscreenElement
    ))
    handleFsChange()
    document.addEventListener('fullscreenchange', handleFsChange)
    document.addEventListener('webkitfullscreenchange', handleFsChange)
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange)
      document.removeEventListener('webkitfullscreenchange', handleFsChange)
    }
  }, [])

  if (isFullscreen) return null

  return (
    <div
      className="fixed z-[60] print:hidden pointer-events-auto select-none"
      style={{
        bottom: hasCopilot
          ? 'calc(5.25rem + env(safe-area-inset-bottom, 0px))'
          : 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        right: 'calc(1.5rem + env(safe-area-inset-right, 0px))',
      }}
    >
      <button
        type="button"
        onClick={toggleTheme}
        aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        className="group relative flex h-11 w-11 items-center justify-center rounded-full border backdrop-blur-xl transition-[transform,box-shadow,background-color] duration-200 motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 motion-safe:active:translate-y-0"
        style={{
          background: isDark ? 'rgba(17, 22, 34, 0.92)' : 'rgba(245, 247, 250, 0.94)',
          borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(15,23,42,0.12)',
          boxShadow: isDark
            ? '0 6px 18px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.09)'
            : '0 6px 18px rgba(15,23,42,0.10), inset 0 1px 0 rgba(255,255,255,0.95)',
        }}
      >
        {isDark
          ? <Moon aria-hidden="true" className="h-[18px] w-[18px] text-indigo-200" strokeWidth={1.8} />
          : <Sun aria-hidden="true" className="h-[18px] w-[18px] text-amber-600" strokeWidth={1.8} />}
        <span className="pointer-events-none absolute -top-10 right-0 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-medium opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
          style={{ background: 'var(--surface)', color: 'var(--text-primary)', border: '1px solid var(--border)' }}>
          {isDark ? 'Light mode' : 'Dark mode'}
        </span>
      </button>
    </div>
  )
}
