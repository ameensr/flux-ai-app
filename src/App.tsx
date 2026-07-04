import React, { Suspense, lazy, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import type { Profile } from '@/store/useAppStore'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LandingPage } from '@/pages/LandingPage'
import { AuthPage } from '@/pages/AuthPage'
import { supabase } from '@/lib/supabase'
import { Toaster } from '@/components/ui/toaster'
import { loadPermissionsForRole, FALLBACK_MAPS } from '@/lib/rbac'
import { ProtectedRoute } from '@/components/router/ProtectedRoute'
import { ErrorBoundary, SilentBoundary } from '@/components/ErrorBoundary'
import { GlassCard } from '@/components/ui/GlassCard'
import { ROUTES } from '@/lib/routes'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import { SessionTimeoutWarning } from '@/components/ui/SessionTimeoutWarning'
import { logLoginEvent } from '@/services/loginActivity'

// ── Idle timeout context (so child components can register active operations) ─
type RegisterOperationFn = (key: string) => () => void
const IdleContext = createContext<RegisterOperationFn>(() => () => { })

/**
 * Hook for child components to register active operations that should
 * prevent automatic logout (e.g., file uploads, AI generation, exports).
 *
 * Usage:
 *   const registerOp = useRegisterActiveOperation()
 *   const unregister = registerOp('ai-generation')
 *   // ... when done:
 *   unregister()
 */
export function useRegisterActiveOperation(): RegisterOperationFn {
  return useContext(IdleContext)
}

// ── Lazy-loaded page modules ──────────────────────────────────────────────────
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const BugRefiner = lazy(() => import('@/modules/BugRefiner').then(m => ({ default: m.BugRefiner })))
const TestCaseGenerator = lazy(() => import('@/modules/TestCaseGenerator').then(m => ({ default: m.TestCaseGenerator })))
const WritingAssistant = lazy(() => import('@/modules/WritingAssistant').then(m => ({ default: m.WritingAssistant })))
const QAWeeklyReport = lazy(() => import('@/modules/QAWeeklyReport').then(m => ({ default: m.QAWeeklyReport })))
const ReportPreviewDashboard = lazy(() => import('@/modules/QAWeeklyReport/components/ReportPreviewDashboard').then(m => ({ default: m.ReportPreviewDashboard })))
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })))
const AdminPanel = lazy(() => import('@/pages/AdminPanel').then(m => ({ default: m.AdminPanel })))
const EnterpriseAdmin = lazy(() => import('@/pages/EnterpriseAdmin').then(m => ({ default: m.EnterpriseAdmin })))
const AICopilot = lazy(() => import('@/components/ai/AICopilot').then(m => ({ default: m.AICopilot })))
const DailyUpdateReport = lazy(() => import('@/modules/DailyUpdateReport').then(m => ({ default: m.DailyUpdateReport })))
const DailyReportConfig = lazy(() => import('@/modules/DailyUpdateReport/DailyReportConfig').then(m => ({ default: m.DailyReportConfig })))
const AINews = lazy(() => import('@/pages/AINews').then(m => ({ default: m.AINews })))
const AnnouncementsPage = lazy(() => import('@/modules/Announcements/AnnouncementsPage').then(m => ({ default: m.AnnouncementsPage })))

// ── Redirect to /login when unauthenticated (saves intended destination) ──────
function NavigateToLogin() {
  const location = useLocation()
  // Public paths that don't require auth
  const publicPaths: string[] = [ROUTES.landing, ROUTES.login, ROUTES.signup, '/forgot-password', '/reset-password']
  if (!publicPaths.includes(location.pathname)) {
    // Save the intended route so we can return after login
    try {
      sessionStorage.setItem('qaly-return-to', location.pathname + location.search)
    } catch { /* non-critical */ }
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />
  }
  return null
}

// ── Route-level loading skeleton ─────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
    </div>
  )
}

function ModuleErrorFallback() {
  return (
    <GlassCard hoverEffect={false} className="flex flex-col items-center justify-center py-32 text-center">
      <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
        <span className="text-2xl">⚠️</span>
      </div>
      <h3 className="text-2xl font-bold text-white mb-2">Module Failed to Load</h3>
      <p className="text-text-secondary max-w-sm mb-6">Something went wrong rendering this module.</p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-xl bg-accent-gold text-background font-bold text-sm hover:opacity-90 transition-opacity"
      >
        Reload
      </button>
    </GlassCard>
  )
}

// ── Animated route wrapper ────────────────────────────────────────────────────
function AnimatedPage({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.25 }}
    >
      {children}
    </motion.div>
  )
}

// ── Authenticated app shell with animated routes ──────────────────────────────
function AppShell() {
  const location = useLocation()
  const isReportPreview = location.pathname.startsWith('/report-preview')

  // Idle timeout — active for the entire authenticated session
  const { phase, secondsLeft, stayLoggedIn, logoutNow, registerOperation } = useIdleTimeout()

  const shell = isReportPreview ? (
    <ErrorBoundary>
      <AnimatePresence mode="wait">
        <AnimatedPage key={location.pathname}>
          <SilentBoundary fallback={<ModuleErrorFallback />}>
            <Suspense fallback={<PageLoader />}>
              <Routes location={location}>
                <Route path={ROUTES.reportPreview} element={
                  <ProtectedRoute><ReportPreviewDashboard /></ProtectedRoute>
                } />
                <Route path="*" element={<Navigate to={ROUTES.reportPreview} replace />} />
              </Routes>
            </Suspense>
          </SilentBoundary>
        </AnimatedPage>
      </AnimatePresence>
      <Toaster />
    </ErrorBoundary>
  ) : (
    <ErrorBoundary>
      <DashboardLayout>
        <AnimatePresence mode="wait">
          <AnimatedPage key={location.pathname}>
            <SilentBoundary fallback={<ModuleErrorFallback />}>
              <Suspense fallback={<PageLoader />}>
                <Routes location={location}>
                  <Route index element={<Navigate to={ROUTES.dashboard} replace />} />

                  <Route path={ROUTES.dashboard} element={
                    <ProtectedRoute><Dashboard /></ProtectedRoute>
                  } />

                  <Route path={ROUTES.bugRefiner} element={
                    <ProtectedRoute><BugRefiner /></ProtectedRoute>
                  } />

                  <Route path={ROUTES.testGenerator} element={
                    <ProtectedRoute><TestCaseGenerator /></ProtectedRoute>
                  } />

                  <Route path={ROUTES.writingAssistant} element={
                    <ProtectedRoute><WritingAssistant /></ProtectedRoute>
                  } />

                  <Route path={ROUTES.qaReport} element={
                    <ProtectedRoute><QAWeeklyReport /></ProtectedRoute>
                  } />

                  <Route path={ROUTES.dailyReport} element={
                    <ProtectedRoute><DailyUpdateReport /></ProtectedRoute>
                  } />

                  <Route path={ROUTES.dailyReportConfig} element={
                    <ProtectedRoute><DailyReportConfig /></ProtectedRoute>
                  } />

                  <Route path={ROUTES.aiNews} element={
                    <ProtectedRoute><AINews /></ProtectedRoute>
                  } />

                  <Route path={ROUTES.announcements} element={
                    <ProtectedRoute><AnnouncementsPage /></ProtectedRoute>
                  } />

                  <Route path={ROUTES.settings} element={
                    <ProtectedRoute><Settings /></ProtectedRoute>
                  } />

                  {/* Admin routes — all require adminOnly */}
                  <Route path={ROUTES.admin} element={
                    <ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>
                  } />
                  <Route path={`${ROUTES.admin}/*`} element={
                    <ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>
                  } />

                  {/* Enterprise RBAC routes */}
                  <Route path={`${ROUTES.enterprise}/*`} element={
                    <ProtectedRoute adminOnly><EnterpriseAdmin /></ProtectedRoute>
                  } />

                  {/* Catch-all inside shell → back to dashboard */}
                  <Route path="*" element={<Navigate to={ROUTES.dashboard} replace />} />
                </Routes>
              </Suspense>
            </SilentBoundary>
          </AnimatedPage>
        </AnimatePresence>

        <SilentBoundary>
          <Suspense fallback={null}>
            <AICopilot />
          </Suspense>
        </SilentBoundary>

        <Toaster />
      </DashboardLayout>
    </ErrorBoundary>
  )

  return (
    <IdleContext.Provider value={registerOperation}>
      {shell}
      {/* Session timeout warning modal — rendered above everything */}
      <SessionTimeoutWarning
        visible={phase === 'warning'}
        secondsLeft={secondsLeft}
        onStay={stayLoggedIn}
        onLogout={logoutNow}
      />
    </IdleContext.Provider>
  )
}

// ── Root auth bootstrap ───────────────────────────────────────────────────────
function AuthBootstrap() {
  const {
    isAuthenticated, setUser, setProfile,
    setPermissionMap, setPermissionsLoaded, initSession,
  } = useAppStore()

  const [authChecking, setAuthChecking] = React.useState(true)
  const initializedUidRef = React.useRef<string | null>(null)
  const location = useLocation()

  React.useEffect(() => {
    const handleSession = async (user: any) => {
      if (initializedUidRef.current === user.id) return
      initializedUidRef.current = user.id
      try {
        const { data } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single()

        const role = data?.role ?? 'free'
        if (data) setProfile(data as Profile)

        const map = await loadPermissionsForRole(role)
        initSession(user, map)
      } catch (e) {
        console.warn('[App] session setup error:', e)
        initSession(user, FALLBACK_MAPS.free)
      }
    }

    // 1. Check stored session immediately (handles refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        handleSession(session.user).finally(() => setAuthChecking(false))
      } else {
        setAuthChecking(false)
      }
    })

    // 2. Subscribe to auth changes (handles login/logout/token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        handleSession(session.user).finally(() => setAuthChecking(false))
        logLoginEvent(session.user.id, 'sign_in')
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        // Session refreshed — keep user logged in, no action needed
        handleSession(session.user)
      } else if (event === 'SIGNED_OUT') {
        // Explicit sign-out — clear everything
        initializedUidRef.current = null
        setUser(null)
        setProfile(null)
        setPermissionMap({})
        setPermissionsLoaded(false)
        setAuthChecking(false)
        window.history.replaceState(null, '', '/login')
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (authChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
      </div>
    )
  }

  // Public routes — accessible without authentication
  const publicPaths = [ROUTES.landing, ROUTES.login, ROUTES.signup, '/forgot-password', '/reset-password']
  const isPublicRoute = publicPaths.includes(location.pathname)

  // Authenticated users on auth pages (login/signup) → redirect to saved route or dashboard
  if (isAuthenticated && (location.pathname === ROUTES.login || location.pathname === ROUTES.signup)) {
    let returnTo: string = ROUTES.dashboard
    try {
      const saved = sessionStorage.getItem('qaly-return-to')
      if (saved && saved !== '/' && saved !== '/login' && saved !== '/signup') {
        returnTo = saved
        sessionStorage.removeItem('qaly-return-to')
      }
    } catch { /* non-critical */ }
    return <Navigate to={returnTo} replace />
  }

  // Authenticated users on landing page → redirect to dashboard
  if (isAuthenticated && location.pathname === ROUTES.landing) {
    return <Navigate to={ROUTES.dashboard} replace />
  }

  // Authenticated → render the app shell (preserves current route)
  if (isAuthenticated) {
    return <AppShell />
  }

  // Unauthenticated → render public routes
  return (
    <>
      <NavigateToLogin />
      <Routes>
        <Route path={ROUTES.landing} element={<LandingPage />} />
        <Route path={ROUTES.login} element={<AuthPage />} />
        <Route path={ROUTES.signup} element={<AuthPage />} />
        <Route path="*" element={<AuthPage />} />
      </Routes>
      <Toaster />
    </>
  )
}

// ── App root — BrowserRouter lives here ──────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthBootstrap />
    </BrowserRouter>
  )
}
