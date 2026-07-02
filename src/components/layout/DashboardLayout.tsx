import React from 'react'
import { useAppStore } from "@/store/useAppStore"
import { Sidebar } from "./Sidebar"
import { AmbientGlow } from "../ui/AmbientGlow"
import { Menu } from "lucide-react"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isSidebarOpen, setSidebarOpen } = useAppStore()

  return (
    <div
      className="min-h-screen font-satoshi"
      style={{
        backgroundColor: 'var(--bg)',
        color: 'var(--text-primary)',
      }}
    >
      <AmbientGlow size="xl" className="top-[-10%] right-[-10%] opacity-[0.05]" />
      <AmbientGlow size="lg" className="bottom-[10%] left-[-5%] opacity-[0.03]" />

      <Sidebar />

      {/* Mobile top bar */}
      <div
        className="lg:hidden fixed top-0 left-0 right-0 z-20 flex items-center gap-4 px-4 h-14 backdrop-blur-xl"
        style={{
          backgroundColor: 'var(--nav-bg)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl transition-all"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = 'var(--hover)')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Flux AI</span>
      </div>

      {/* Main content */}
      <main
        className="min-h-screen px-4 pt-20 pb-8 lg:px-6 lg:pt-6 lg:pb-6 transition-[margin-left] duration-400"
        style={{ marginLeft: isSidebarOpen ? 296 : 96 }}
      >
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>

      {/* Cinematic Top Blur */}
      <div
        className="fixed top-0 left-0 right-0 h-16 z-10 pointer-events-none"
        style={{ background: `linear-gradient(to bottom, var(--bg), transparent)` }}
      />
    </div>
  )
}
