import React from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'
import { MaintenanceBanner } from '../ui/MaintenanceBanner'
import { Menu, Sun, Moon } from 'lucide-react'
import { useTheme } from '@/context/ThemeContext'
import { Logo } from '../ui/Logo'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isSidebarOpen, setSidebarOpen } = useAppStore()
  const { isDark, toggleTheme } = useTheme()

  // Sidebar widths: expanded=240, collapsed=64, plus 12px left offset on desktop
  const marginLeft = isSidebarOpen ? 252 : 76

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      <MaintenanceBanner />
      <Sidebar />

      {/* Mobile top bar */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 h-14 backdrop-blur-xl"
        style={{
          backgroundColor: 'var(--nav-bg)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg transition-all"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Logo size="sm" animate={false} />
        </div>

        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg transition-all"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          aria-label={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Main content */}
      <main
        className="min-h-screen px-4 pt-20 pb-8 lg:px-8 lg:pt-8 lg:pb-8 transition-[margin-left] duration-300"
        style={{ marginLeft: isSidebarOpen ? marginLeft : 76 }}
      >
        <div className="max-w-7xl mx-auto overflow-hidden">
          {children}
          <Footer />
        </div>
      </main>
    </div>
  )
}
