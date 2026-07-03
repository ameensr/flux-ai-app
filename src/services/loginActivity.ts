// src/services/loginActivity.ts
// Service to log and query login activity events.

import { supabase } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LoginEvent {
  id: string
  user_id: string
  event_type: 'sign_in' | 'sign_up' | 'failed'
  browser: string | null
  os: string | null
  ip_address: string | null
  created_at: string
}

// ── User-agent parsing ────────────────────────────────────────────────────────

function parseBrowser(ua: string): string {
  if (ua.includes('Edg')) return 'Edge'
  if (ua.includes('OPR') || ua.includes('Opera')) return 'Opera'
  if (ua.includes('Chrome')) return 'Chrome'
  if (ua.includes('Firefox')) return 'Firefox'
  if (ua.includes('Safari')) return 'Safari'
  return 'Browser'
}

function parseOS(ua: string): string {
  if (ua.includes('Windows')) return 'Windows'
  if (ua.includes('Mac OS') || ua.includes('Macintosh')) return 'macOS'
  if (ua.includes('Android')) return 'Android'
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS'
  if (ua.includes('Linux')) return 'Linux'
  if (ua.includes('CrOS')) return 'ChromeOS'
  return 'Unknown'
}

// ── Log a login event ─────────────────────────────────────────────────────────

export async function logLoginEvent(
  userId: string,
  eventType: LoginEvent['event_type'],
): Promise<void> {
  const ua = navigator.userAgent
  const browser = parseBrowser(ua)
  const os = parseOS(ua)

  try {
    await supabase.from('login_events').insert({
      user_id: userId,
      event_type: eventType,
      browser,
      os,
      // ip_address is not available client-side; leave null (could be enriched server-side)
      ip_address: null,
    })
  } catch {
    // Non-critical — don't break auth flow if logging fails
    console.warn('[LoginActivity] Failed to log event')
  }
}

// ── Fetch recent login activity for the current user ──────────────────────────

export async function getLoginActivity(limit = 10): Promise<LoginEvent[]> {
  const { data, error } = await supabase
    .from('login_events')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) {
    console.warn('[LoginActivity] Failed to fetch:', error.message)
    return []
  }

  return (data ?? []) as LoginEvent[]
}
