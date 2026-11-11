import React from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Sidebar } from './Sidebar'
import { Footer } from './Footer'
import { MaintenanceBanner } from '../ui/MaintenanceBanner'
import { Menu } from 'lucide-react'
import { Logo } from '../ui/Logo'

interface DashboardLayoutProps {
  children: React.ReactNode
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isSidebarOpen, setSidebarOpen } = useAppStore()

  // Sidebar widths: expanded=240, collapsed=64, plus 12px left offset on desktop
  const marginLeft = isSidebarOpen ? 252 : 76

  return (
    <div
      className="min-h-screen relative overflow-x-hidden"
      style={{ backgroundColor: 'var(--bg)', color: 'var(--text-primary)' }}
    >
      {/* ── Atmospheric Ambient Lighting (Reference Image Style) ── */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden print:hidden" aria-hidden="true">
        {/* Top-center ambient violet / indigo glow */}
        <div
          className="absolute -top-[25%] left-[20%] w-[55vw] h-[45vw] rounded-full opacity-25 dark:opacity-20 blur-[120px]"
          style={{
            background: 'radial-gradient(circle, #6366F1 0%, #4F46E5 40%, transparent 70%)',
          }}
        />
        {/* Top-right subtle cyan / sky accent */}
        <div
          className="absolute -top-[15%] right-[5%] w-[40vw] h-[35vw] rounded-full opacity-15 dark:opacity-15 blur-[100px]"
          style={{
            background: 'radial-gradient(circle, #06B6D4 0%, #3B82F6 45%, transparent 70%)',
          }}
        />
        {/* Bottom-left warm deep amber / rose reflection */}
        <div
          className="absolute bottom-[5%] -left-[10%] w-[45vw] h-[40vw] rounded-full opacity-10 dark:opacity-10 blur-[130px]"
          style={{
            background: 'radial-gradient(circle, #8B5CF6 0%, #EC4899 35%, transparent 70%)',
          }}
        />
      </div>

      <MaintenanceBanner />
      <Sidebar />

      {/* Mobile top bar with premium glassmorphism */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 h-14 backdrop-blur-2xl"
        style={{
          backgroundColor: 'var(--nav-bg)',
          borderBottom: '1px solid var(--glass-border)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
        }}
      >
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-xl pressable"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--hover)')}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Logo size="sm" animate={false} />
        </div>
      </div>

      {/* Main column: content grows, branding footer stays at bottom */}
      <main
        className="min-h-screen flex flex-col px-4 pt-20 pb-0 lg:px-8 lg:pt-8 relative z-10 transition-[margin-left] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{ marginLeft: isSidebarOpen ? marginLeft : 76 }}
      >
        <div className="flex-1 w-full max-w-7xl mx-auto overflow-hidden">
          {children}
        </div>
        <Footer />
      </main>
    </div>
  )
}
