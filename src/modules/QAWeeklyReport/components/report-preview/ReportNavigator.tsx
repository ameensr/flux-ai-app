import React from 'react'

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
 * Compact sticky report navigator rendered as a horizontally scrollable pill strip below
 * the top bar, on every screen size.
 */
export const ReportNavigator: React.FC<ReportNavigatorProps> = ({ theme, items, activeSection, onNavigate }) => {
  const visibleItems = items.filter(item => item.show !== false)

  return (
    <nav
      className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5"
      aria-label="Report sections"
    >
      {visibleItems.map(item => (
        <button
          key={item.id}
          onClick={() => onNavigate(item.id)}
          className={`shrink-0 whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] font-bold transition-all duration-200 border ${activeSection === item.id
            ? 'bg-accent-gold text-black border-accent-gold shadow-sm'
            : theme === 'dark'
              ? 'text-white/55 border-white/[0.08] bg-white/[0.03] hover:text-white'
              : 'text-slate-500 border-black/[0.08] bg-black/[0.02] hover:text-slate-900'
            }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  )
}
