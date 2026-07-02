// src/context/ThemeContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { type ThemeId, applyTheme, STORAGE_KEY, THEMES } from '@/lib/themes'

interface ThemeContextValue {
  theme: ThemeId
  setTheme: (id: ThemeId) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'dark',
  setTheme: () => {},
})

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null
    return saved && saved in THEMES ? saved : 'dark'
  })

  const setTheme = useCallback((id: ThemeId) => {
    setThemeState(id)
    localStorage.setItem(STORAGE_KEY, id)
    applyTheme(id)
  }, [])

  // Apply on mount (before first paint) and on change
  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
