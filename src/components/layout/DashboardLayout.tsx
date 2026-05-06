import React from 'react'
import { motion, AnimatePresence } from "framer-motion"
import { useAppStore } from "@/store/useAppStore"
import { Sidebar } from "./Sidebar"
import { AmbientGlow } from "../ui/AmbientGlow"

interface DashboardLayoutProps {
  children: React.ReactNode
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const { isSidebarOpen } = useAppStore()

  return (
    <div className="min-h-screen bg-background text-white font-satoshi selection:bg-accent-gold selection:text-background">
      <AmbientGlow size="xl" className="top-[-10%] right-[-10%] opacity-[0.05]" />
      <AmbientGlow size="lg" className="bottom-[10%] left-[-5%] opacity-[0.03]" />
      
      <Sidebar />
      
      <motion.main
        animate={{ 
          marginLeft: isSidebarOpen ? 312 : 112,
          paddingRight: 24,
          paddingTop: 24,
          paddingBottom: 24
        }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="min-h-screen"
      >
        <div className="max-w-7xl mx-auto">
          {children}
        </div>
      </motion.main>
      
      {/* Cinematic Top Blur */}
      <div className="fixed top-0 left-0 right-0 h-24 bg-gradient-to-b from-background to-transparent z-30 pointer-events-none" />
    </div>
  )
}
