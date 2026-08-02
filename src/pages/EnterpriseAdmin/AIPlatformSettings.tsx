// Admin toggle for Centralised AI (Groq → Gemini → Kimi via FastAPI) + user allowlist.

import React, { useEffect, useMemo, useState } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useAIPlatformStore } from '@/store/useAIPlatformStore'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Bot, CheckCircle2, AlertTriangle, Save, Users, Search, X, Lock,
} from 'lucide-react'

interface ProfileOption {
  id: string
  email: string
  full_name: string | null
  role: string
}

function isAlwaysAllowedRole(role: string) {
  return role === 'admin' || role === 'super_admin'
}

function idsEqual(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const sa = [...a].sort()
  const sb = [...b].sort()
  return sa.every((id, i) => id === sb[i])
}

export function AIPlatformSettings() {
  const {
    enabled: storedEnabled,
    allowedUserIds: storedAllowedUserIds,
    loading,
    fetchConfig,
    updateConfig,
    updatedAt,
  } = useAIPlatformStore()

  const [enabled, setEnabled] = useState(storedEnabled)
  const [allowedUserIds, setAllowedUserIds] = useState<string[]>(storedAllowedUserIds)
  const [saving, setSaving] = useState(false)
  const [profiles, setProfiles] = useState<ProfileOption[]>([])
  const [profilesLoading, setProfilesLoading] = useState(false)
  const [search, setSearch] = useState('')
  /** Prevent store refetch from wiping in-progress checkbox edits. */
  const dirtyRef = React.useRef(false)

  useEffect(() => {
    void fetchConfig()
  }, [fetchConfig])

  // Sync from store only when not mid-edit (avoids wiping checked users on refetch/profiles load)
  useEffect(() => {
    if (dirtyRef.current) return
    setEnabled(storedEnabled)
    setAllowedUserIds(storedAllowedUserIds.map((id) => id.toLowerCase()))
  }, [storedEnabled, storedAllowedUserIds])

  useEffect(() => {
    if (!enabled) return
    let cancelled = false
    async function loadProfiles() {
      setProfilesLoading(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, email, full_name, role')
          .eq('status', 'active')
          .order('full_name', { ascending: true })
        if (error) throw error
        if (!cancelled) setProfiles((data as ProfileOption[]) ?? [])
      } catch (e) {
        console.warn('[AI Platform] Failed to load profiles:', e)
        if (!cancelled) {
          toast({
            variant: 'destructive',
            title: 'Could not load users',
            description: 'Unable to load the user list for AI access.',
          })
        }
      } finally {
        if (!cancelled) setProfilesLoading(false)
      }
    }
    void loadProfiles()
    return () => { cancelled = true }
  }, [enabled])

  const adminIds = useMemo(
    () => new Set(
      profiles.filter((p) => isAlwaysAllowedRole(p.role)).map((p) => p.id.toLowerCase()),
    ),
    [profiles],
  )

  const selectableStoredIds = useMemo(
    () => storedAllowedUserIds
      .map((id) => id.toLowerCase())
      .filter((id) => !adminIds.has(id)),
    [storedAllowedUserIds, adminIds],
  )

  const dirty =
    enabled !== storedEnabled || !idsEqual(allowedUserIds, selectableStoredIds)

  useEffect(() => {
    dirtyRef.current = dirty
  }, [dirty])

  const filteredProfiles = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return profiles
    return profiles.filter((p) =>
      (p.full_name ?? '').toLowerCase().includes(q)
      || p.email.toLowerCase().includes(q)
      || p.role.toLowerCase().includes(q),
    )
  }, [profiles, search])

  const selectedProfiles = useMemo(
    () => profiles.filter((p) =>
      !isAlwaysAllowedRole(p.role) && allowedUserIds.includes(p.id.toLowerCase()),
    ),
    [profiles, allowedUserIds],
  )

  const alwaysAllowedProfiles = useMemo(
    () => profiles.filter((p) => isAlwaysAllowedRole(p.role)),
    [profiles],
  )

  const toggleUser = (id: string, role?: string) => {
    if (role && isAlwaysAllowedRole(role)) return
    const profile = profiles.find((p) => p.id === id)
    if (profile && isAlwaysAllowedRole(profile.role)) return
    const key = id.toLowerCase()
    setAllowedUserIds((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key],
    )
  }

  const selectAllFiltered = () => {
    setAllowedUserIds((prev) => {
      const next = new Set(prev)
      filteredProfiles.forEach((p) => {
        if (!isAlwaysAllowedRole(p.role)) next.add(p.id.toLowerCase())
      })
      return [...next]
    })
  }

  const clearAll = () => setAllowedUserIds([])

  const handleSave = async () => {
    setSaving(true)
    try {
      // Don't persist admin/super_admin IDs — they always bypass the allowlist.
      const idsToSave = allowedUserIds.filter((id) => !adminIds.has(id.toLowerCase()))
      await updateConfig(enabled, idsToSave)
      dirtyRef.current = false
      setAllowedUserIds(idsToSave)
      // Confirm what actually landed in the DB
      await fetchConfig()
      const saved = useAIPlatformStore.getState().allowedUserIds
      toast({
        title: enabled ? 'Centralised AI Enabled' : 'Centralised AI Disabled',
        description: enabled
          ? (saved.length > 0
            ? `AI limited to ${saved.length} selected user${saved.length === 1 ? '' : 's'} (+ admins). Unchecked users are blocked.`
            : 'No users selected — only Admin / Super Admin can use AI.')
          : 'All AI generation features are blocked for every user.',
      })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: e.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <GlassCard hoverEffect={false}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              enabled
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'bg-red-500/10 border border-red-500/20',
            )}>
              {enabled
                ? <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                : <AlertTriangle className="w-5 h-5 text-red-400" />}
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Centralised AI Provider
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {enabled
                  ? 'Active — Groq → Gemini → Kimi AI features are available'
                  : 'Off — all AI modules are blocked platform-wide'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className="relative w-14 h-7 rounded-full shrink-0 transition-colors duration-300"
            style={{
              background: enabled ? '#10b981' : 'var(--hover)',
              border: `1px solid ${enabled ? 'rgba(16,185,129,0.4)' : 'var(--border)'}`,
            }}
            role="switch"
            aria-checked={enabled}
            aria-label="Toggle centralised AI"
          >
            <span
              className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300"
              style={{ transform: enabled ? 'translateX(28px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(260px,340px)_1fr] gap-6 items-start">
        {/* Left: How it works */}
        <GlassCard hoverEffect={false} className="lg:sticky lg:top-4">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-4 h-4 text-accent-gold" />
            <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
              How it works
            </h4>
          </div>
          <ol className="space-y-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold bg-accent-gold/15 text-accent-gold">
                1
              </span>
              <span>
                Turn <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Centralised AI</span> on to enable Bug Refiner, Test Architect, Writing Assistant, Copilot, and related APIs. Off blocks AI for everyone.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold bg-accent-gold/15 text-accent-gold">
                2
              </span>
              <span>
                When on, check <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Allowed Users</span> and save. Only checked users can use AI. Unchecked users are blocked. Empty list = admins only.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold bg-accent-gold/15 text-accent-gold">
                3
              </span>
              <span>
                <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Admin</span> and <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Super Admin</span> are always allowed (checked and locked). They cannot be removed from AI access.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold bg-accent-gold/15 text-accent-gold">
                4
              </span>
              <span>
                Non-admin users still need RBAC — <span className="text-accent-gold font-bold">AI Generate</span> for modules, <span className="text-accent-gold font-bold">Advanced AI</span> for Copilot. Role permission alone is not enough if they are not on the allowlist.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold bg-accent-gold/15 text-accent-gold">
                5
              </span>
              <span>
                Restricted users see a popup: <span className="italic" style={{ color: 'var(--text-primary)' }}>&ldquo;You are restricted to use AI. Contact Administration.&rdquo;</span>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="mt-0.5 w-5 h-5 rounded-md shrink-0 flex items-center justify-center text-[10px] font-bold bg-accent-gold/15 text-accent-gold">
                6
              </span>
              <span>
                Requests run on the FastAPI backend (<span className="font-bold" style={{ color: 'var(--text-primary)' }}>Groq → Gemini → Kimi</span>). API keys never leave the server.
              </span>
            </li>
          </ol>
          {updatedAt && (
            <p className="mt-5 text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
              Last updated {new Date(updatedAt).toLocaleString()}
            </p>
          )}
        </GlassCard>

        {/* Right: controls */}
        <div className="flex flex-col gap-6 min-w-0">
          {enabled ? (
            <GlassCard hoverEffect={false}>
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-accent-gold" />
                  <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>
                    Allowed Users
                  </h4>
                </div>
                <span className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {allowedUserIds.length === 0
                    ? 'Admins only'
                    : `${allowedUserIds.length} selected`}
                </span>
              </div>
              <p className="text-[11px] mb-3" style={{ color: 'var(--text-muted)' }}>
                Check users who may use AI, then click <span className="font-bold" style={{ color: 'var(--text-primary)' }}>Save Changes</span>.
                Unchecked users are blocked. Admin and Super Admin are always allowed.
              </p>
              {enabled && allowedUserIds.length === 0 && (
                <div
                  className="mb-4 flex items-start gap-2 rounded-xl px-3 py-2.5 text-[11px] leading-relaxed"
                  style={{
                    background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.3)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                  <span>
                    No users selected. After save, <span className="font-bold" style={{ color: 'var(--text-primary)' }}>only Admin / Super Admin</span> can use AI.
                  </span>
                </div>
              )}

              {(alwaysAllowedProfiles.length > 0 || selectedProfiles.length > 0) && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {alwaysAllowedProfiles.map((p) => (
                    <span
                      key={p.id}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border opacity-80"
                      style={{
                        background: 'rgba(16,185,129,0.08)',
                        borderColor: 'rgba(16,185,129,0.25)',
                        color: 'var(--text-primary)',
                      }}
                      title="Always allowed"
                    >
                      {p.full_name || p.email}
                      <Lock className="w-3 h-3 opacity-60" />
                    </span>
                  ))}
                  {selectedProfiles.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => toggleUser(p.id, p.role)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-opacity hover:opacity-80"
                      style={{
                        background: 'rgba(16,185,129,0.08)',
                        borderColor: 'rgba(16,185,129,0.25)',
                        color: 'var(--text-primary)',
                      }}
                      title="Remove"
                    >
                      {p.full_name || p.email}
                      <X className="w-3 h-3 opacity-60" />
                    </button>
                  ))}
                </div>
              )}

              <div className="relative mb-3">
                <Search
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
                  style={{ color: 'var(--text-muted)' }}
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search users by name, email, or role…"
                  className="w-full pl-9 pr-3 py-2 rounded-xl text-sm border outline-none"
                  style={{
                    background: 'var(--hover)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>

              <div className="flex items-center gap-2 mb-3">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg hover:opacity-80"
                  style={{ color: 'var(--accent)', background: 'var(--hover)' }}
                >
                  Select visible
                </button>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg hover:opacity-80"
                  style={{ color: 'var(--text-muted)', background: 'var(--hover)' }}
                >
                  Clear all
                </button>
              </div>

              <div
                className="max-h-[28rem] overflow-y-auto rounded-xl border divide-y"
                style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
              >
                {profilesLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <div className="w-5 h-5 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
                  </div>
                ) : filteredProfiles.length === 0 ? (
                  <p className="text-center text-xs py-8" style={{ color: 'var(--text-muted)' }}>
                    No users found
                  </p>
                ) : (
                  filteredProfiles.map((p) => {
                    const locked = isAlwaysAllowedRole(p.role)
                    const checked = locked || allowedUserIds.includes(p.id.toLowerCase())
                    return (
                      <label
                        key={p.id}
                        className={cn(
                          'flex items-center gap-3 px-3 py-2.5 transition-colors',
                          locked
                            ? 'cursor-not-allowed opacity-70'
                            : 'cursor-pointer hover:bg-[var(--hover)]',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={locked}
                          onChange={() => toggleUser(p.id, p.role)}
                          className="accent-[var(--accent)] disabled:opacity-80"
                          title={locked ? 'Admin / Super Admin always have AI access' : undefined}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {p.full_name || p.email}
                            {locked && (
                              <span className="ml-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                                Always on
                              </span>
                            )}
                          </p>
                          <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                            {p.email} · {p.role}
                          </p>
                        </div>
                        {locked && <Lock className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--text-muted)' }} />}
                      </label>
                    )
                  })
                )}
              </div>
            </GlassCard>
          ) : (
            <GlassCard hoverEffect={false}>
              <div className="flex items-start gap-3 py-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                    AI is turned off
                  </h4>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    Turn Centralised AI on to choose allowed users. While off, no one can run AI features — including admins.
                  </p>
                </div>
              </div>
            </GlassCard>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-gold text-background text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              {saving ? (
                <span className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
