import { createClient } from '@supabase/supabase-js'
import { SESSION_START_KEY, MAX_SESSION_AGE_MS } from './idleConfig'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('[supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set.')
}

export const SUPABASE_URL = supabaseUrl
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    lock: <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => fn(),
  },
})

export { MAX_SESSION_AGE_MS }

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
