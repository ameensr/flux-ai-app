// src/context/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { type ThemeId, applyTheme, STORAGE_KEY, THEMES } from '@/lib/themes'

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (id: ThemeId) => void
  isDark: boolean
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
  isDark: true,
  toggleTheme: () => {},
})

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

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id)
    localStorage.setItem(STORAGE_KEY, id)
    applyTheme(id)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(theme === 'dark' ? 'light' : 'dark')
  }, [theme, setTheme])

  useEffect(() => { applyTheme(theme) }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme, isDark: theme === 'dark', toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
