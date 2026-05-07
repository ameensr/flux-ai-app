import React from 'react'
import { motion } from "framer-motion"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/store/useAppStore"
import { hasPermission } from "@/lib/rbac"
import type { Permission, Role } from "@/lib/rbac"
import { 
  LayoutDashboard, 
  Bug, 
  FileText, 
  PenTool, 
  Settings, 
  History,
  ChevronLeft,
  Shield,
  LogOut,
} from "lucide-react"
import { Logo } from "../ui/Logo"
import { supabase } from "@/lib/supabase"

const menuItems: { id: string; label: string; icon: React.ElementType; permission: Permission }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, permission: 'access:dashboard' },
  { id: 'bug-refiner', label: 'AI Bug Refiner', icon: Bug, permission: 'access:bug-refiner' },
  { id: 'test-generator', label: 'Test Case Gen', icon: FileText, permission: 'access:test-generator' },
  { id: 'writing-assistant', label: 'Writing Assistant', icon: PenTool, permission: 'access:writing-assistant' },
  { id: 'history', label: 'History', icon: History, permission: 'access:history' },
  { id: 'settings', label: 'Settings', icon: Settings, permission: 'access:settings' },
  { id: 'admin', label: 'Admin Panel', icon: Shield, permission: 'access:admin' },
]

export const Sidebar = () => {
  const { activeModule, setActiveModule, isSidebarOpen, setSidebarOpen, role, profile, setUser, setProfile } = useAppStore()

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setProfile(null)
  }

  const effectiveRole = (profile?.role ?? role ?? 'free') as Role
  const visibleItems = menuItems.filter((item) => hasPermission(effectiveRole, item.permission))

  return (
    <motion.aside
      initial={false}
      animate={{ width: isSidebarOpen ? 280 : 80 }}
      className="fixed left-4 top-4 bottom-4 glass-panel z-40 flex flex-col overflow-hidden"
    >
      <div className="p-6 flex items-center justify-between h-20">
        <Logo 
          collapsed={!isSidebarOpen} 
          size="md" 
          className={cn("transition-all duration-500", !isSidebarOpen && "ml-1")}
        />
        
        <button 
          onClick={() => setSidebarOpen(!isSidebarOpen)}
          className={cn(
            "p-2 hover:bg-white/5 rounded-lg transition-all text-text-secondary hover:text-white",
            !isSidebarOpen && "absolute right-2 opacity-0 group-hover:opacity-100"
          )}
        >
          <ChevronLeft className={cn("w-5 h-5 transition-transform duration-500", !isSidebarOpen && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 px-3 py-4 flex flex-col gap-2">
        {visibleItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveModule(item.id as any)}
            className={cn(
              "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group relative overflow-hidden",
              activeModule === item.id 
                ? "bg-accent-gold text-background font-bold" 
                : "text-text-secondary hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon className={cn("w-5 h-5", activeModule === item.id ? "text-background" : "group-hover:text-accent-gold transition-colors")} />
            {isSidebarOpen && (
              <motion.span 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="text-sm tracking-wide"
              >
                {item.label}
              </motion.span>
            )}
            
            {activeModule === item.id && (
              <motion.div 
                layoutId="active-pill"
                className="absolute inset-0 bg-accent-gold -z-10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 flex flex-col gap-3">
        <div className={cn(
          "bg-white/5 rounded-2xl p-4 transition-all duration-300",
          !isSidebarOpen && "opacity-0 pointer-events-none"
        )}>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">AI System Live</span>
          </div>
          <p className="text-[11px] text-text-secondary leading-relaxed">
            Quantum Engine v2.4 initialized and ready for QA.
          </p>
        </div>

        <button
          onClick={handleSignOut}
          className={cn(
            "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 text-text-secondary hover:text-white hover:bg-white/5 group",
          )}
        >
          <LogOut className="w-5 h-5 group-hover:text-red-400 transition-colors" />
          {isSidebarOpen && <span className="text-sm tracking-wide">Sign Out</span>}
        </button>
      </div>
    </motion.aside>
  )
}
