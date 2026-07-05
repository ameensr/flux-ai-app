// src/pages/EnterpriseAdmin/MaintenanceSettings.tsx
// Admin panel for Role-Based Maintenance Mode configuration.

import React, { useState, useEffect } from 'react'
import { GlassCard } from '@/components/ui/GlassCard'
import { useMaintenanceStore, type MaintenanceType } from '@/store/useMaintenanceStore'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Shield, Clock, AlertTriangle, CheckCircle2, Save,
  Mail, Eye, EyeOff, Settings2, Users, Timer
} from 'lucide-react'

interface RoleOption {
  key: string
  label: string
}

export function MaintenanceSettings() {
  const { config, fetchConfig, updateConfig, loading } = useMaintenanceStore()
  const [saving, setSaving] = useState(false)
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([])

  // Load roles dynamically from Supabase
  useEffect(() => {
    async function loadRoles() {
      const { data } = await supabase
        .from('roles')
        .select('role_key, role_name')
        .order('role_name', { ascending: true })

      if (data && data.length > 0) {
        setAvailableRoles(data.map((r: any) => ({ key: r.role_key, label: r.role_name })))
      } else {
        // Fallback if table is empty or query fails
        setAvailableRoles([
          { key: 'super_admin', label: 'Super Admin' },
          { key: 'admin', label: 'Administrator' },
          { key: 'pro', label: 'Pro User' },
          { key: 'free', label: 'Free User' },
        ])
      }
    }
    loadRoles()
  }, [])

  // Local form state
  const [enabled, setEnabled] = useState(config.enabled)
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>(config.maintenance_type)
  const [reason, setReason] = useState(config.reason)
  const [startTime, setStartTime] = useState(config.start_time || '')
  const [endTime, setEndTime] = useState(config.end_time || '')
  const [lockedRoles, setLockedRoles] = useState<string[]>(config.locked_roles)
  const [allowedRoles, setAllowedRoles] = useState<string[]>(config.allowed_roles)
  const [showCountdown, setShowCountdown] = useState(config.show_countdown)
  const [showBranding, setShowBranding] = useState(config.show_branding)
  const [supportEmail, setSupportEmail] = useState(config.support_email)
  const [customMessage, setCustomMessage] = useState(config.custom_message || '')

  useEffect(() => {
    fetchConfig()
  }, [])

  useEffect(() => {
    setEnabled(config.enabled)
    setMaintenanceType(config.maintenance_type)
    setReason(config.reason)
    setStartTime(config.start_time || '')
    setEndTime(config.end_time || '')
    setLockedRoles(config.locked_roles)
    setAllowedRoles(config.allowed_roles)
    setShowCountdown(config.show_countdown)
    setShowBranding(config.show_branding)
    setSupportEmail(config.support_email)
    setCustomMessage(config.custom_message || '')
  }, [config])

  const toggleLockedRole = (role: string) => {
    // Super Admin can never be locked
    if (role === 'super_admin') return
    setLockedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  const toggleAllowedRole = (role: string) => {
    // Super Admin can never be removed from allowed list
    if (role === 'super_admin') return
    setAllowedRoles(prev =>
      prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role]
    )
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateConfig({
        enabled,
        maintenance_type: maintenanceType,
        reason,
        start_time: startTime || null,
        end_time: endTime || null,
        locked_roles: lockedRoles,
        allowed_roles: allowedRoles,
        show_countdown: showCountdown,
        show_branding: showBranding,
        support_email: supportEmail,
        custom_message: customMessage || null,
      })
      toast({ variant: 'success', title: 'Maintenance Config Saved', description: enabled ? 'Maintenance mode is now ACTIVE.' : 'Maintenance mode is OFF.' })
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
      {/* Status Header */}
      <GlassCard hoverEffect={false}>
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              'w-10 h-10 rounded-xl flex items-center justify-center',
              enabled ? 'bg-red-500/10 border border-red-500/20' : 'bg-emerald-500/10 border border-emerald-500/20'
            )}>
              {enabled ? <AlertTriangle className="w-5 h-5 text-red-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            </div>
            <div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Maintenance Mode
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                {enabled ? 'Active — locked roles cannot access the app' : 'Inactive — all users have normal access'}
              </p>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={() => setEnabled(!enabled)}
            className="relative w-14 h-7 rounded-full shrink-0 transition-colors duration-300"
            style={{
              background: enabled ? '#ef4444' : 'var(--hover)',
              border: `1px solid ${enabled ? 'rgba(239,68,68,0.4)' : 'var(--border)'}`,
            }}
            role="switch"
            aria-checked={enabled}
          >
            <span
              className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300"
              style={{ transform: enabled ? 'translateX(28px)' : 'translateX(0)' }}
            />
          </button>
        </div>
      </GlassCard>

      {/* Settings Panel - only show when enabled or always for configuration */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Core Settings */}
        <div className="flex flex-col gap-6">
          {/* Maintenance Type */}
          <GlassCard hoverEffect={false}>
            <div className="flex items-center gap-2 mb-4">
              <Settings2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Maintenance Type</h4>
            </div>
            <div className="flex flex-col gap-2">
              {([
                ['full_lock', 'Full Lock', 'Completely block access for locked roles'],
                ['custom_message', 'Custom Message', 'Show a custom message instead of default'],
              ] as [MaintenanceType, string, string][]).map(([val, label, desc]) => (
                <label
                  key={val}
                  className={cn(
                    'flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all',
                    maintenanceType === val ? 'border' : 'border border-transparent'
                  )}
                  style={{
                    background: maintenanceType === val ? 'var(--hover)' : 'transparent',
                    borderColor: maintenanceType === val ? 'var(--accent)' : 'transparent',
                  }}
                >
                  <input
                    type="radio"
                    name="maintenanceType"
                    value={val}
                    checked={maintenanceType === val}
                    onChange={() => setMaintenanceType(val)}
                    className="mt-0.5 accent-[var(--accent)]"
                  />
                  <div>
                    <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </GlassCard>

          {/* Reason & Custom Message */}
          <GlassCard hoverEffect={false}>
            <div className="flex items-center gap-2 mb-4">
              <Mail className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Message & Contact</h4>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-muted)' }}>Reason</label>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="e.g. Weekly deployment and database optimization."
                  rows={2}
                  className="field-input text-xs w-full resize-none"
                />
              </div>
              {maintenanceType === 'custom_message' && (
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-muted)' }}>Custom Message (shown to users)</label>
                  <textarea
                    value={customMessage}
                    onChange={e => setCustomMessage(e.target.value)}
                    placeholder="e.g. We're upgrading to serve you better. Back shortly!"
                    rows={3}
                    className="field-input text-xs w-full resize-none"
                  />
                </div>
              )}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-muted)' }}>Support Email</label>
                <input
                  type="email"
                  value={supportEmail}
                  onChange={e => setSupportEmail(e.target.value)}
                  placeholder="support@company.com"
                  className="field-input text-xs w-full"
                />
              </div>
            </div>
          </GlassCard>

          {/* Schedule */}
          <GlassCard hoverEffect={false}>
            <div className="flex items-center gap-2 mb-4">
              <Timer className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Schedule (Optional)</h4>
            </div>
            <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>
              Leave empty to activate immediately when enabled. Set times for auto-activation.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-muted)' }}>Start Time</label>
                <input
                  type="datetime-local"
                  value={startTime ? startTime.slice(0, 16) : ''}
                  onChange={e => setStartTime(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  className="field-input text-xs w-full"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-muted)' }}>End Time</label>
                <input
                  type="datetime-local"
                  value={endTime ? endTime.slice(0, 16) : ''}
                  onChange={e => setEndTime(e.target.value ? new Date(e.target.value).toISOString() : '')}
                  className="field-input text-xs w-full"
                />
              </div>
            </div>
          </GlassCard>
        </div>

        {/* Right: Role Selection & Display Settings */}
        <div className="flex flex-col gap-6">
          {/* Locked Roles */}
          <GlassCard hoverEffect={false}>
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-red-400" />
              <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Locked Roles</h4>
            </div>
            <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>
              Users with these roles will be redirected to the maintenance page.
            </p>
            <div className="flex flex-col gap-1.5">
              {availableRoles.filter(r => r.key !== 'super_admin').map(role => (
                <label
                  key={role.key}
                  className={cn(
                    'flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all',
                    lockedRoles.includes(role.key) ? 'border' : 'border border-transparent'
                  )}
                  style={{
                    background: lockedRoles.includes(role.key) ? 'rgba(239,68,68,0.05)' : 'transparent',
                    borderColor: lockedRoles.includes(role.key) ? 'rgba(239,68,68,0.2)' : 'transparent',
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={lockedRoles.includes(role.key)}
                      onChange={() => toggleLockedRole(role.key)}
                      className="w-3.5 h-3.5 rounded accent-red-500"
                    />
                    <span className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>{role.label}</span>
                  </div>
                  {lockedRoles.includes(role.key) && (
                    <span className="text-[9px] font-bold uppercase tracking-widest text-red-400 bg-red-500/10 px-2 py-0.5 rounded-md">Blocked</span>
                  )}
                </label>
              ))}
            </div>
          </GlassCard>

          {/* Exception Roles (Always Allowed) */}
          <GlassCard hoverEffect={false}>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-4 h-4 text-emerald-400" />
              <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Always Allowed (Exceptions)</h4>
            </div>
            <p className="text-[10px] mb-4" style={{ color: 'var(--text-muted)' }}>
              These roles can always access the app, even during maintenance.
            </p>
            <div className="flex flex-wrap gap-2">
              {availableRoles.map(role => {
                const isSuperAdmin = role.key === 'super_admin'
                const isAllowed = allowedRoles.includes(role.key)
                return (
                  <button
                    key={role.key}
                    onClick={() => toggleAllowedRole(role.key)}
                    disabled={isSuperAdmin}
                    className={cn(
                      'px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all',
                      isAllowed ? 'text-emerald-400' : '',
                      isSuperAdmin && 'opacity-70 cursor-not-allowed'
                    )}
                    style={{
                      background: isAllowed ? 'rgba(16,185,129,0.1)' : 'var(--hover)',
                      border: `1px solid ${isAllowed ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                      color: isAllowed ? undefined : 'var(--text-muted)',
                    }}
                    title={isSuperAdmin ? 'Super Admin always has access' : undefined}
                  >
                    {role.label}{isSuperAdmin ? ' (always)' : ''}
                  </button>
                )
              })}
            </div>
          </GlassCard>

          {/* Display Options */}
          <GlassCard hoverEffect={false}>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h4 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-primary)' }}>Display Options</h4>
            </div>
            <div className="flex flex-col gap-3">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Show Countdown</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Display remaining time on maintenance page</p>
                </div>
                <button
                  onClick={() => setShowCountdown(!showCountdown)}
                  className="relative w-10 h-5 rounded-full shrink-0 transition-colors duration-200"
                  style={{
                    background: showCountdown ? 'var(--accent)' : 'var(--hover)',
                    border: `1px solid ${showCountdown ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                  role="switch"
                  aria-checked={showCountdown}
                >
                  <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200" style={{ transform: showCountdown ? 'translateX(20px)' : 'translateX(0)' }} />
                </button>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>Show Branding</p>
                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Display company branding on maintenance page</p>
                </div>
                <button
                  onClick={() => setShowBranding(!showBranding)}
                  className="relative w-10 h-5 rounded-full shrink-0 transition-colors duration-200"
                  style={{
                    background: showBranding ? 'var(--accent)' : 'var(--hover)',
                    border: `1px solid ${showBranding ? 'var(--accent)' : 'var(--border)'}`,
                  }}
                  role="switch"
                  aria-checked={showBranding}
                >
                  <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200" style={{ transform: showBranding ? 'translateX(20px)' : 'translateX(0)' }} />
                </button>
              </label>
            </div>
          </GlassCard>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className={cn(
            'flex items-center gap-2 px-8 py-3 rounded-xl text-sm font-bold transition-all',
            saving ? 'opacity-60 cursor-wait' : 'hover:opacity-90 active:scale-[0.98]'
          )}
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-fg)',
          }}
        >
          {saving ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
          ) : (
            <><Save className="w-4 h-4" /> Save Maintenance Settings</>
          )}
        </button>
      </div>
    </div>
  )
}
