// src/components/ProfileCard.tsx
// Premium profile card with inline editing for name and phone.

import React, { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import { toast } from '@/hooks/use-toast'
import { GlassCard } from '@/components/ui/GlassCard'
import { usePermissions } from '@/hooks/usePermissions'
import { cn } from '@/lib/utils'
import { Pencil, X, Check, User, Mail, Phone, Lock } from 'lucide-react'

export const ProfileCard: React.FC = () => {
  const { profile, setProfile } = useAppStore()
  const { canEdit } = usePermissions()
  const canEditSettings = canEdit('settings')
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState(profile?.full_name || '')
  const [phone, setPhone] = useState(profile?.phone || '')

  useEffect(() => {
    setName(profile?.full_name || '')
    setPhone(profile?.phone || '')
  }, [profile])

  const initials = (profile?.full_name || profile?.email || '?')
    .split(' ')
    .map(w => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleSave = async () => {
    if (!profile) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: name.trim() || null, phone: phone.trim() || null })
        .eq('id', profile.id)

      if (error) throw error

      setProfile({ ...profile, full_name: name.trim() || null, phone: phone.trim() || null })
      setEditing(false)
      toast({ variant: 'success', title: 'Profile Updated', description: 'Your details have been saved.' })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setName(profile?.full_name || '')
    setPhone(profile?.phone || '')
    setEditing(false)
  }

  if (!profile) return null

  return (
    <GlassCard hoverEffect={false} className="relative overflow-hidden">
      {/* Subtle gradient accent at top */}
      <div
        className="absolute top-0 left-0 right-0 h-1 rounded-t-xl"
        style={{ background: 'linear-gradient(90deg, var(--accent), rgba(99,102,241,0.3))' }}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-5 pt-2">
        <h3 className="text-xs font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>
          Profile
        </h3>
        {canEditSettings && !editing ? (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
            style={{ background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
          >
            <Pencil className="w-3 h-3" /> Edit
          </button>
        ) : canEditSettings && editing ? (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
              style={{ background: 'rgba(16,185,129,0.1)', color: '#34d399', border: '1px solid rgba(16,185,129,0.3)' }}
            >
              <Check className="w-3 h-3" /> {saving ? '...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all"
              style={{ background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        ) : null}
      </div>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-6">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center text-lg font-bold mb-3"
          style={{
            background: 'linear-gradient(135deg, var(--accent), rgba(99,102,241,0.6))',
            color: '#ffffff',
            boxShadow: '0 4px 20px rgba(99,102,241,0.25)',
          }}
        >
          {initials}
        </div>
        <div
          className="px-2.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-widest"
          style={{ background: 'var(--hover)', color: 'var(--accent)', border: '1px solid var(--border)' }}
        >
          {profile.role.replace('_', ' ')}
        </div>
      </div>

      {/* Fields */}
      <div className="flex flex-col gap-4">
        {/* Name */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
            <User className="w-3 h-3" /> Full Name
            {!canEditSettings && <Lock className="w-2.5 h-2.5 opacity-50" />}
          </label>
          {editing && canEditSettings ? (
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Enter your name"
              className="field-input text-sm w-full"
            />
          ) : (
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {profile.full_name || <span style={{ color: 'var(--text-muted)' }}>Not set</span>}
            </p>
          )}
        </div>

        {/* Email - readonly */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
            <Mail className="w-3 h-3" /> Email
            <Lock className="w-2.5 h-2.5 opacity-50" />
          </label>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {profile.email}
          </p>
        </div>

        {/* Phone */}
        <div>
          <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest mb-1.5" style={{ color: 'var(--text-muted)' }}>
            <Phone className="w-3 h-3" /> Phone Number
            {!canEditSettings && <Lock className="w-2.5 h-2.5 opacity-50" />}
          </label>
          {editing && canEditSettings ? (
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="e.g. +91 9876543210"
              className="field-input text-sm w-full"
            />
          ) : (
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {profile.phone || <span style={{ color: 'var(--text-muted)' }}>Not set</span>}
            </p>
          )}
        </div>
      </div>

      {/* Member since */}
      <div className="mt-5 pt-4" style={{ borderTop: '1px solid var(--divider)' }}>
        <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
          Member since {new Date(profile.created_at).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </p>
      </div>
    </GlassCard>
  )
}
