import React from 'react'
import { motion, AnimatePresence } from "framer-motion"
import { useAppStore } from "@/store/useAppStore"
import type { Profile } from "@/store/useAppStore"
import { DashboardLayout } from "@/components/layout/DashboardLayout"
import { Dashboard } from "@/pages/Dashboard"
import { BugRefiner } from "@/modules/BugRefiner"
import { TestCaseGenerator } from "@/modules/TestCaseGenerator"
import { WritingAssistant } from "@/modules/WritingAssistant"
import { Settings } from "@/pages/Settings"
import { LandingPage } from "@/pages/LandingPage"
import { AuthPage } from "@/pages/AuthPage"
import { AICopilot } from "@/components/ai/AICopilot"
import { AdminPanel } from "@/pages/AdminPanel"
import { supabase } from "@/lib/supabase"
import { Toaster } from "@/components/ui/toaster"

function App() {
  const { activeModule, showLanding, setShowLanding, isAuthenticated, setUser, setProfile } = useAppStore()

  React.useEffect(() => {
    const fetchProfile = async (userId: string) => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()
      if (data) setProfile(data as Profile)
    }

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        setShowLanding(false)
      }
    })

    // Listen for changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        fetchProfile(session.user.id)
        setShowLanding(false)
      } else {
        setProfile(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (showLanding) {
    return <LandingPage onStart={() => setShowLanding(false)} />
  }

  if (!isAuthenticated) {
    return (
      <>
        <AuthPage />
        <Toaster />
      </>
    )
  }

  const renderModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard />
      case 'bug-refiner':
        return <BugRefiner />
      case 'test-generator':
        return <TestCaseGenerator />
      case 'writing-assistant':
        return <WritingAssistant />
      case 'settings':
        return <Settings />
      case 'admin':
        return <AdminPanel />
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[60vh]">
            <h2 className="text-4xl font-clash font-bold text-white mb-4">Module Under Construction</h2>
            <p className="text-text-secondary text-xl font-montreal">We are polishing this module for you.</p>
          </div>
        )
    }
  }

  return (
    <DashboardLayout>
      <AnimatePresence mode="wait">
        <motion.div
          key={activeModule}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
        >
          {renderModule()}
        </motion.div>
      </AnimatePresence>
      <AICopilot />
      <Toaster />
    </DashboardLayout>
  )
}

export default App
