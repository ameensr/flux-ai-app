// src/context/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { type ThemeId, applyTheme, STORAGE_KEY, THEMES } from '@/lib/themes'

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (id: ThemeId, event?: { clientX: number; clientY: number } | React.MouseEvent) => void
  isDark: boolean
  toggleTheme: (event?: { clientX: number; clientY: number } | React.MouseEvent) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  isDark: true,
  toggleTheme: () => {},
})

/**
 * Spawns an ephemeral, hardware-accelerated radiant ripple at the click epicenter
 * that gracefully expands across the viewport while the theme crossfades.
 */
function spawnLuminousRipple(x: number, y: number, targetTheme: ThemeId) {
  if (typeof document === 'undefined') return
  try {
    const ripple = document.createElement('div')
    ripple.className = `theme-luminous-ripple theme-luminous-ripple-${targetTheme}`
    ripple.style.left = `${x}px`
    ripple.style.top = `${y}px`
    document.body.appendChild(ripple)

    window.setTimeout(() => {
      ripple.remove()
    }, 620)
  } catch {
    // Ignore in non-browser environments
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    // Migrate any legacy theme keys → normalize to dark/light
    const raw = localStorage.getItem(STORAGE_KEY)
      || localStorage.getItem('flux-theme')
      || 'dark'
    // Any old theme that isn't 'light' maps to 'dark'
    const normalized: ThemeId = raw === 'light' ? 'light' : 'dark'
    localStorage.setItem(STORAGE_KEY, normalized)
    localStorage.removeItem('flux-theme')
    return normalized
  })

  const executeThemeTransition = useCallback((
    targetTheme: ThemeId,
    event?: { clientX: number; clientY: number } | React.MouseEvent
  ) => {
    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    // Determine the exact epicenter of the transition wave from click event
    let x = window.innerWidth - 36
    let y = window.innerHeight - 36

    if (event) {
      if ('clientX' in event && typeof event.clientX === 'number' && event.clientX > 0) {
        x = event.clientX
        y = event.clientY
      }
    }

    const doc = document as any
    const canUseViewTransition =
      !prefersReduced &&
      typeof doc !== 'undefined' &&
      typeof doc.startViewTransition === 'function'

    if (!canUseViewTransition) {
      // Fallback for browsers without View Transition API: smooth property transitions
      const root = document.documentElement
      root.classList.add('theme-transitioning-fallback')
      setThemeState(targetTheme)
      localStorage.setItem(STORAGE_KEY, targetTheme)
      applyTheme(targetTheme)
      window.setTimeout(() => {
        root.classList.remove('theme-transitioning-fallback')
      }, 550)
      return
    }

    // Launch radiant atmospheric ripple at click coordinates
    spawnLuminousRipple(x, y, targetTheme)

    try {
      doc.startViewTransition(() => {
        // Butter-smooth synchronous snapshot capture with zero style collision
        setThemeState(targetTheme)
        localStorage.setItem(STORAGE_KEY, targetTheme)
        applyTheme(targetTheme)
      })
    } catch {
      setThemeState(targetTheme)
      localStorage.setItem(STORAGE_KEY, targetTheme)
      applyTheme(targetTheme)
    }
  }, [])

  const setTheme = useCallback((
    id: ThemeId,
    event?: { clientX: number; clientY: number } | React.MouseEvent
  ) => {
    executeThemeTransition(id, event)
  }, [executeThemeTransition])

  const toggleTheme = useCallback((
    event?: { clientX: number; clientY: number } | React.MouseEvent
  ) => {
    const nextTheme: ThemeId = theme === 'dark' ? 'light' : 'dark'
    executeThemeTransition(nextTheme, event)
  }, [theme, executeThemeTransition])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
