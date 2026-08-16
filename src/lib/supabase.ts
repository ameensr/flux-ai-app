import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY'

export const SUPABASE_URL = supabaseUrl
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
})

// ── Absolute Session Timeout ──────────────────────────────────────────────────
// Maximum session lifetime in milliseconds (default: 24 hours)
export const MAX_SESSION_AGE_MS: number =
  Number(import.meta.env.VITE_MAX_SESSION_AGE_MS) || 24 * 60 * 60 * 1000

const SESSION_START_KEY = 'qaly-session-start'

/** Record when a new session started */
export function markSessionStart(): void {
  localStorage.setItem(SESSION_START_KEY, Date.now().toString())
}

/** Clear session start timestamp */
export function clearSessionStart(): void {
  localStorage.removeItem(SESSION_START_KEY)
}

/** Check if the session has exceeded the absolute max age */
export function isSessionExpired(): boolean {
  const startStr = localStorage.getItem(SESSION_START_KEY)
  if (!startStr) return false // No recorded start = new session, will be marked on login
  const elapsed = Date.now() - Number(startStr)
  return elapsed >= MAX_SESSION_AGE_MS
}

/** Get remaining session time in ms (0 if expired) */
export function getSessionTimeRemaining(): number {
  const startStr = localStorage.getItem(SESSION_START_KEY)
  if (!startStr) return MAX_SESSION_AGE_MS
  const remaining = MAX_SESSION_AGE_MS - (Date.now() - Number(startStr))
  return Math.max(0, remaining)
}
