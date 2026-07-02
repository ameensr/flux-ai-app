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
    <div className="min-h-screen bg-background text-white font-satoshi selection:bg-accent-gold selection:text-background">
      <AmbientGlow size="xl" className="top-[-10%] right-[-10%] opacity-[0.05]" />
      <AmbientGlow size="lg" className="bottom-[10%] left-[-5%] opacity-[0.03]" />
      
      <Sidebar />
      
      {/* Mobile top bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-20 flex items-center gap-4 px-4 h-14 bg-background/80 backdrop-blur-xl border-b border-white/5">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-xl hover:bg-white/5 text-text-secondary hover:text-white transition-all"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold text-white tracking-wide">Flux AI</span>
      </div>

      {/* Main content — CSS transition for smooth sidebar animation, no framer-motion conflict */}
      <main
        className="min-h-screen px-4 pt-20 pb-8 lg:px-6 lg:pt-6 lg:pb-6 transition-[margin-left] duration-400"
        style={{ marginLeft: isSidebarOpen ? 296 : 96 }}
      >
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </main>
      
      {/* Cinematic Top Blur */}
      <div className="fixed top-0 left-0 right-0 h-16 bg-gradient-to-b from-background to-transparent z-10 pointer-events-none" />
    </div>
  )
}
