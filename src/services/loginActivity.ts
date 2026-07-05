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

// ── Config ─────────────────────────────────────────────────────────────────────

/** Maximum login events stored per user. Older entries are pruned on each login. */
const MAX_EVENTS_PER_USER = 5

// ── Log a login event ─────────────────────────────────────────────────────────

export async function logLoginEvent(
  userId: string,
  eventType: LoginEvent['event_type'],
): Promise<void> {
  const ua = navigator.userAgent
  const browser = parseBrowser(ua)
  const os = parseOS(ua)

  try {
    // Insert new event
    await supabase.from('login_events').insert({
      user_id: userId,
      event_type: eventType,
      browser,
      os,
      ip_address: null,
    })

    // Update profiles.last_login_at so admins always have a fallback
    if (eventType === 'sign_in') {
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', userId)
    }

    // Prune old events — keep only the latest MAX_EVENTS_PER_USER
    const { data: recent } = await supabase
      .from('login_events')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(MAX_EVENTS_PER_USER)

    if (recent && recent.length >= MAX_EVENTS_PER_USER) {
      const keepIds = recent.map((r: { id: string }) => r.id)
      await supabase
        .from('login_events')
        .delete()
        .eq('user_id', userId)
        .not('id', 'in', `(${keepIds.join(',')})`)
    }
  } catch {
    // Non-critical — don't break auth flow if logging fails
    console.warn('[LoginActivity] Failed to log event')
  }
}

// ── Fetch recent login activity for the current user ──────────────────────────

export async function getLoginActivity(limit = MAX_EVENTS_PER_USER): Promise<LoginEvent[]> {
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
