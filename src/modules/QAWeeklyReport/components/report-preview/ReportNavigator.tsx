import React, { useRef } from 'react'

type ThemeId = 'light' | 'dark'

export interface ReportNavItem {
  id: string
  label: string
  /** Section is only shown when this resolves truthy (vis flag AND/OR data presence). */
  show?: boolean
}

interface ReportNavigatorProps {
  theme: ThemeId
  items: ReportNavItem[]
  activeSection: string
  onNavigate: (sectionId: string) => void
}

/**
 * Capsule segment navigator for report preview:
 * Nested floating pill strip styled to match the application's clean design system.
 */
export const ReportNavigator: React.FC<ReportNavigatorProps> = ({
  theme,
  items,
  activeSection,
  onNavigate
}) => {
  const visibleItems = items.filter(item => item.show !== false)
  const navRef = useRef<HTMLDivElement>(null)

  return (
    <nav
      ref={navRef}
      className={`flex items-center gap-1 overflow-x-auto scrollbar-none py-1 px-1.5 rounded-full w-full max-w-full transition-all duration-300 ${
        theme === 'dark'
          ? 'bg-black/25 border border-white/[0.06]'
          : 'bg-slate-200/50 border border-slate-300/40'
      }`}
      aria-label="Report sections"
    >
      {visibleItems.map(item => {
        const isActive = activeSection === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onNavigate(item.id)}
            className={`shrink-0 whitespace-nowrap px-3 py-1 rounded-full text-xs transition-all duration-200 select-none ${
              isActive
                ? 'bg-indigo-600 text-white font-medium shadow-[0_2px_10px_rgba(99,102,241,0.35)] border border-indigo-400/30'
                : theme === 'dark'
                  ? 'text-white/60 hover:text-white hover:bg-white/[0.06] border border-transparent font-normal'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-black/[0.04] border border-transparent font-normal'
            }`}
          >
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}
