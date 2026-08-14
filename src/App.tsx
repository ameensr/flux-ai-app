import React, { Suspense, lazy, createContext, useContext } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from 'react-router-dom'
import { useAppStore } from '@/store/useAppStore'
import type { Profile } from '@/store/useAppStore'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LandingPage } from '@/pages/LandingPage'
import { AuthPage } from '@/pages/AuthPage'
import { supabase } from '@/lib/supabase'
import { Toaster } from '@/components/ui/toaster'
import { AIRestrictedModal } from '@/components/ai/AIRestrictedModal'
import { loadPermissionsForRole, FALLBACK_MAPS } from '@/lib/rbac'
import { ProtectedRoute } from '@/components/router/ProtectedRoute'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { ROUTES } from '@/lib/routes'
import { useIdleTimeout } from '@/hooks/useIdleTimeout'
import { SessionTimeoutWarning } from '@/components/ui/SessionTimeoutWarning'
import { logLoginEvent } from '@/services/loginActivity'
import { useMaintenanceStore } from '@/store/useMaintenanceStore'
import { useAIPlatformStore } from '@/store/useAIPlatformStore'
import { useToast } from '@/hooks/use-toast'

// ── Idle timeout context ──────────────────────────────────────────────────────
type RegisterOperationFn = (key: string) => () => void
const IdleContext = createContext<RegisterOperationFn>(() => () => { })
export function useRegisterActiveOperation(): RegisterOperationFn {
  return useContext(IdleContext)
}

// ── Lazy-loaded page modules ──────────────────────────────────────────────────
const Dashboard = lazy(() => import('@/pages/Dashboard').then(m => ({ default: m.Dashboard })))
const ProjectHub = lazy(() => import('@/modules/ProjectHub').then(m => ({ default: m.ProjectHub })))
const ProjectDetail = lazy(() => import('@/modules/ProjectHub/ProjectDetail').then(m => ({ default: m.ProjectDetail })))
const BugRefiner = lazy(() => import('@/modules/BugRefiner').then(m => ({ default: m.BugRefiner })))
const TestCaseGenerator = lazy(() => import('@/modules/TestCaseGenerator').then(m => ({ default: m.TestCaseGenerator })))
const WritingAssistant = lazy(() => import('@/modules/WritingAssistant').then(m => ({ default: m.WritingAssistant })))
const QAWeeklyReport = lazy(() => import('@/modules/QAWeeklyReport').then(m => ({ default: m.QAWeeklyReport })))
const QAReportConfig = lazy(() => import('@/modules/QAWeeklyReport/QAReportConfig').then(m => ({ default: m.QAReportConfig })))
const QAReportDropdownConfig = lazy(() => import('@/modules/QAWeeklyReport/QAReportDropdownConfig').then(m => ({ default: m.QAReportDropdownConfig })))
const ReportPreviewDashboard = lazy(() => import('@/modules/QAWeeklyReport/components/ReportPreviewDashboard').then(m => ({ default: m.ReportPreviewDashboard })))
const Settings = lazy(() => import('@/pages/Settings').then(m => ({ default: m.Settings })))
const AdminPanel = lazy(() => import('@/pages/AdminPanel').then(m => ({ default: m.AdminPanel })))
const EnterpriseAdmin = lazy(() => import('@/pages/EnterpriseAdmin').then(m => ({ default: m.EnterpriseAdmin })))
const AICopilot = lazy(() => import('@/components/ai/AICopilot').then(m => ({ default: m.AICopilot })))
const RequireFullNameGate = lazy(() =>
  import('@/components/ai/RequireFullNameGate').then(m => ({ default: m.RequireFullNameGate }))
)
const DailyUpdateReport = lazy(() => import('@/modules/DailyUpdateReport').then(m => ({ default: m.DailyUpdateReport })))
const AINews = lazy(() => import('@/pages/AINews').then(m => ({ default: m.AINews })))
const MaintenancePage = lazy(() => import('@/pages/MaintenancePage').then(m => ({ default: m.MaintenancePage })))
const QalyAiEngine404 = lazy(() => import('@/pages/qalyaiengine404/App'))
const QalyAiEngine401 = lazy(() => import('@/pages/qalyaiengine401/App'))

// ── Loaders ───────────────────────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
    </div>
  )
}

function FullPageLoader() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
    </div>
  )
}

// ── Auth guard ────────────────────────────────────────────────────────────────
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppStore()
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to={ROUTES.login} state={{ from: location }} replace />
  }
  return <>{children}</>
}

function RedirectIfAuth({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAppStore()
  if (isAuthenticated) {
    return <Navigate to={ROUTES.dashboard} replace />
  }
  return <>{children}</>
}

// ── Maintenance guard for standalone routes (e.g. /report-preview) ─────────
function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const { role } = useAppStore()
  const { isRoleLocked, loading: maintenanceLoading } = useMaintenanceStore()
  if (maintenanceLoading) return <FullPageLoader />
  if (isRoleLocked(role)) return <Navigate to={ROUTES.maintenance} replace />
  return <>{children}</>
}

// ── Dashboard Layout wrapper (renders <Outlet /> for child routes) ─────────────
function DashboardWrapper() {
  const { phase, secondsLeft, stayLoggedIn, logoutNow, registerOperation } = useIdleTimeout()
  const { role } = useAppStore()
  const { isRoleLocked, loading: maintenanceLoading } = useMaintenanceStore()

  // Wait for maintenance config to load before making any routing decision
  if (maintenanceLoading) return <FullPageLoader />

  // Redirect locked roles to maintenance page
  if (isRoleLocked(role)) {
    return <Navigate to={ROUTES.maintenance} replace />
  }

  return (
    <IdleContext.Provider value={registerOperation}>
      <DashboardLayout>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
        <Suspense fallback={null}><AICopilot /></Suspense>
      </DashboardLayout>
      <SessionTimeoutWarning
        visible={phase === 'warning'}
        secondsLeft={secondsLeft}
        onStay={stayLoggedIn}
        onLogout={logoutNow}
      />
    </IdleContext.Provider>
  )
}

// ── Report Preview wrapper (standalone, no sidebar) ───────────────────────────
function ReportPreviewWrapper() {
  const { phase, secondsLeft, stayLoggedIn, logoutNow, registerOperation } = useIdleTimeout()
  return (
    <IdleContext.Provider value={registerOperation}>
      <ErrorBoundary>
        <Suspense fallback={<FullPageLoader />}>
          <ReportPreviewDashboard />
        </Suspense>
      </ErrorBoundary>
      <SessionTimeoutWarning
        visible={phase === 'warning'}
        secondsLeft={secondsLeft}
        onStay={stayLoggedIn}
        onLogout={logoutNow}
      />
    </IdleContext.Provider>
  )
}

// ── Auth initializer ──────────────────────────────────────────────────────────
function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { toast } = useToast()
  const {
    setUser, setProfile, setPermissionMap, setPermissionsLoaded, initSession,
  } = useAppStore()

  const [ready, setReady] = React.useState(false)
  const initPromiseRef = React.useRef<Promise<void> | null>(null)

  React.useEffect(() => {
    const handleSession = (user: any): Promise<void> => {
      // Single-flight only while a load is in progress — must clear when done
      // so role/profile changes (e.g. SQL promote to super_admin) are picked up
      // on refresh, token refresh, and re-login.
      if (initPromiseRef.current) return initPromiseRef.current

      initPromiseRef.current = (async () => {
        try {
          // Prefer SECURITY DEFINER RPC so badge/role still load if RLS SELECT is broken
          const [{ data: rpcRows, error: rpcError }] = await Promise.all([
            supabase.rpc('get_my_profile'),
            useMaintenanceStore.getState().fetchConfig(),
            useAIPlatformStore.getState().fetchConfig(),
          ])

          if (rpcError) {
            console.warn('[App] get_my_profile RPC error:', rpcError)
          }

          let data = Array.isArray(rpcRows) ? rpcRows[0] : rpcRows

          // Fallback: direct table read (works when profiles_read_authenticated exists)
          if (!data) {
            const { data: row, error: profileError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', user.id)
              .maybeSingle()
            if (profileError) console.warn('[App] profile fetch error:', profileError)
            data = row
          }

          // Heal missing profile row (auth user without trigger insert)
          if (!data) {
            const { error: createError } = await supabase.from('profiles').upsert(
              {
                id: user.id,
                email: user.email ?? '',
                full_name:
                  user.user_metadata?.full_name
                  ?? user.user_metadata?.name
                  ?? null,
                status: 'active',
              },
              { onConflict: 'id' },
            )
            if (createError) console.warn('[App] profile create error:', createError)

            const { data: rpcRetry } = await supabase.rpc('get_my_profile')
            data = Array.isArray(rpcRetry) ? rpcRetry[0] : rpcRetry
            if (!data) {
              const { data: row } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .maybeSingle()
              data = row
            }
          }

          if (data && data.status === 'inactive') {
            await supabase.auth.signOut()
            toast({ variant: 'destructive', title: 'Account Disabled', description: 'Your account has been disabled. Please contact support.' })
            return
          }

          const role = (data?.role as Profile['role']) ?? 'free'
          if (data) setProfile(data as Profile)
          else setProfile(null)

          const map = await loadPermissionsForRole(role)
          initSession(user, map)
        } catch (e) {
          console.warn('[App] session setup error:', e)
          initSession(user, FALLBACK_MAPS.free)
        } finally {
          initPromiseRef.current = null
        }
      })()

      return initPromiseRef.current
    }

    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          await handleSession(session.user)
        }
      } catch (e) {
        console.warn('[App] getSession error:', e)
      } finally {
        setReady(true)
      }
    }
    checkInitialSession()

    // Realtime: re-fetch maintenance / AI platform config whenever admin changes it
    const maintenanceChannel = supabase
      .channel('maintenance_config_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'maintenance_config' }, () => {
        useMaintenanceStore.getState().fetchConfig()
      })
      .subscribe()

    const aiPlatformChannel = supabase
      .channel('ai_platform_config_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'ai_platform_config' }, () => {
        useAIPlatformStore.getState().fetchConfig()
      })
      .subscribe()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION') return
      if (event === 'SIGNED_IN' && session?.user) {
        handleSession(session.user).then(() => setReady(true))
        logLoginEvent(session.user.id, 'sign_in')
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        handleSession(session.user)
      } else if (event === 'SIGNED_OUT') {
        initPromiseRef.current = null
        setUser(null)
        setProfile(null)
        setPermissionMap({})
        setPermissionsLoaded(false)
        setReady(true)
      }
    })

    return () => {
      subscription.unsubscribe()
      supabase.removeChannel(maintenanceChannel)
      supabase.removeChannel(aiPlatformChannel)
    }
  }, [])

  if (!ready) return <FullPageLoader />
  return (
    <>
      <Suspense fallback={null}>
        <RequireFullNameGate />
      </Suspense>
      {children}
      <Toaster />
      <AIRestrictedModal />
      <SessionExpiredToast />
    </>
  )
}

/** Shows the idle-logout flash message after a hard redirect to /login */
function SessionExpiredToast() {
  const { toast } = useToast()
  React.useEffect(() => {
    try {
      const raw = sessionStorage.getItem('qaly-session-expired')
      if (!raw) return
      sessionStorage.removeItem('qaly-session-expired')
      const payload = JSON.parse(raw) as { title?: string; description?: string }
      toast({
        title: payload.title || 'Session expired',
        description: payload.description || 'You have been logged out due to inactivity.',
      })
    } catch { /* ignore */ }
  }, [toast])
  return null
}

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthInitializer>
        <Routes>
          {/* Public routes */}
          <Route path={ROUTES.landing} element={<RedirectIfAuth><LandingPage /></RedirectIfAuth>} />
          <Route path={ROUTES.login} element={<RedirectIfAuth><AuthPage /></RedirectIfAuth>} />
          <Route path={ROUTES.signup} element={<RedirectIfAuth><AuthPage /></RedirectIfAuth>} />
          <Route path={ROUTES.qalyAiEngine404} element={<Suspense fallback={<FullPageLoader />}><QalyAiEngine404 /></Suspense>} />
          <Route path={ROUTES.qalyAiEngine401} element={<Suspense fallback={<FullPageLoader />}><QalyAiEngine401 /></Suspense>} />

          {/* Report Preview — standalone page, no sidebar */}
          <Route path={ROUTES.reportPreview} element={<RequireAuth><ProtectedRoute moduleKey="qa-report"><MaintenanceGuard><ReportPreviewWrapper /></MaintenanceGuard></ProtectedRoute></RequireAuth>} />

          {/* Maintenance page — standalone, no sidebar */}
          <Route path={ROUTES.maintenance} element={<RequireAuth><MaintenancePage /></RequireAuth>} />

          {/* Protected dashboard routes — uses layout with sidebar */}
          <Route element={<RequireAuth><DashboardWrapper /></RequireAuth>}>
            <Route path={ROUTES.dashboard} element={<Dashboard />} />
            <Route path={ROUTES.projectHub} element={<ProjectHub />} />
            <Route path={`${ROUTES.projectHub}/:projectId`} element={<ProjectDetail />} />
            <Route path={ROUTES.bugRefiner} element={<BugRefiner />} />
            <Route path={ROUTES.testGenerator} element={<TestCaseGenerator />} />
            <Route path={ROUTES.writingAssistant} element={<WritingAssistant />} />
            <Route path={ROUTES.qaReport} element={<QAWeeklyReport />} />
            <Route path={ROUTES.dailyReport} element={<DailyUpdateReport />} />
            <Route path={ROUTES.qaReportConfig} element={<QAReportConfig />} />
            <Route path={ROUTES.qaReportDropdownConfig} element={<QAReportDropdownConfig />} />
            <Route path={ROUTES.aiNews} element={<AINews />} />
            <Route path={ROUTES.settings} element={<Settings />} />
            <Route path={ROUTES.admin} element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />
            <Route path={`${ROUTES.admin}/*`} element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />
            <Route path={`${ROUTES.enterprise}/*`} element={<ProtectedRoute adminOnly><EnterpriseAdmin /></ProtectedRoute>} />
            <Route path="*" element={<Navigate to={ROUTES.qalyAiEngine404} replace />} />
          </Route>
        </Routes>
      </AuthInitializer>
    </BrowserRouter>
  )
}
