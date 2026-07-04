// src/components/LazyPanda/AdminPandaConfig.tsx
// Admin-only configuration page for the Lazy Panda mascot.

import React, { useState, Suspense, lazy } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import {
  PawPrint, Eye, EyeOff, Sparkles, Calendar, Plus, Trash2,
  RotateCcw, Monitor, Moon, Sun, Smartphone, MessageSquare, Edit2,
} from 'lucide-react'
import { usePandaConfigStore, type PandaFeatureToggles, type SeasonalTheme } from './pandaConfig'
import { usePandaMessagesStore, type SmartMessage, type ShowFrequency } from './pandaMessages'
import { AdminEventGreetings } from './AdminEventGreetings'
import { PandaSVG } from './PandaSVG'
import type { PandaState } from './types'

// ── Toggle Switch ─────────────────────────────────────────────────────────────

function Toggle({ enabled, onChange, label, description }: {
  enabled: boolean
  onChange: (v: boolean) => void
  label: string
  description?: string
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="min-w-0 mr-3">
        <span className="text-xs font-semibold block" style={{ color: 'var(--text-primary)' }}>{label}</span>
        {description && <span className="text-[10px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>{description}</span>}
      </div>
      <button
        onClick={() => onChange(!enabled)}
        className="relative w-10 h-5 rounded-full shrink-0 transition-colors duration-200"
        style={{
          background: enabled ? 'var(--accent)' : 'var(--hover)',
          border: `1px solid ${enabled ? 'var(--accent)' : 'var(--border)'}`,
        }}
        role="switch"
        aria-checked={enabled}
        aria-label={label}
      >
        <span
          className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
          style={{ transform: enabled ? 'translateX(20px)' : 'translateX(0)' }}
        />
      </button>
    </div>
  )
}

// ── Feature Labels ────────────────────────────────────────────────────────────

const FEATURE_LABELS: Record<keyof PandaFeatureToggles, { label: string; description: string }> = {
  walking: { label: 'Walking Animation', description: 'Panda walks when idle' },
  emailTracking: { label: 'Email Tracking', description: 'Eyes follow cursor on email field' },
  passwordCover: { label: 'Password Eye Cover', description: 'Covers eyes when typing password' },
  passwordPeek: { label: 'Show Password Peek', description: 'One eye peeks when password is shown' },
  loginSuccess: { label: 'Login Success Animation', description: 'Sparkle celebration on success' },
  loginFailure: { label: 'Login Failure Animation', description: 'Confused reaction on error' },
  idleSleep: { label: 'Idle Sleep Mode', description: 'Falls asleep after 15s inactivity' },
  cursorTracking: { label: 'Cursor Tracking', description: 'Head follows mouse movement' },
  loadingAnimation: { label: 'Loading Animation', description: 'Laptop + coffee during auth' },
  easterEggs: { label: 'Easter Eggs', description: 'Hidden interactions on click/tap' },
  microAnimations: { label: 'Micro Animations', description: 'Blinking, ear twitch, tail, breathing' },
  soundEffects: { label: 'Sound Effects (Future)', description: 'Audio feedback — not yet implemented' },
}

// ── Live Preview ──────────────────────────────────────────────────────────────

function LivePreview() {
  const [previewState, setPreviewState] = useState<PandaState>('IDLE')
  const [previewTheme, setPreviewTheme] = useState<'dark' | 'light'>('dark')

  const states: { id: PandaState; label: string }[] = [
    { id: 'IDLE', label: 'Idle' },
    { id: 'LOOKING_AT_EMAIL', label: 'Email Focus' },
    { id: 'PASSWORD_HIDE', label: 'Password Hide' },
    { id: 'PASSWORD_SHOW', label: 'Password Peek' },
    { id: 'LOGIN_LOADING', label: 'Loading' },
    { id: 'SUCCESS', label: 'Success' },
    { id: 'ERROR', label: 'Error' },
    { id: 'SLEEPING', label: 'Sleeping' },
  ]

  return (
    <GlassCard hoverEffect={false}>
      <div className="flex items-center gap-2 mb-4">
        <Monitor className="w-4 h-4" style={{ color: 'var(--accent)' }} />
        <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Live Preview</h3>
      </div>

      {/* Preview area */}
      <div
        className="rounded-2xl p-6 flex items-center justify-center mb-4 border"
        style={{
          background: previewTheme === 'dark' ? '#0B1020' : '#F8FAFC',
          borderColor: previewTheme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)',
          minHeight: 200,
        }}
      >
        <PandaSVG
          state={previewState}
          eyeOffset={{ x: 0, y: 0 }}
          headRotation={0}
          isBlinking={false}
          size={160}
        />
      </div>

      {/* State selector */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {states.map(s => (
          <button
            key={s.id}
            onClick={() => setPreviewState(s.id)}
            className={cn(
              'px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all',
              previewState === s.id
                ? 'bg-accent text-white'
                : 'text-text-muted hover:text-text-primary'
            )}
            style={previewState !== s.id ? { background: 'var(--hover)', border: '1px solid var(--border)' } : {}}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Theme toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setPreviewTheme('dark')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold', previewTheme === 'dark' ? 'bg-accent text-white' : '')}
          style={previewTheme !== 'dark' ? { background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' } : {}}
        >
          <Moon className="w-3 h-3" /> Dark
        </button>
        <button
          onClick={() => setPreviewTheme('light')}
          className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold', previewTheme === 'light' ? 'bg-accent text-white' : '')}
          style={previewTheme !== 'light' ? { background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' } : {}}
        >
          <Sun className="w-3 h-3" /> Light
        </button>
      </div>
    </GlassCard>
  )
}

// ── Weekend / Smart Messages Section ──────────────────────────────────────────

function WeekendMessagesSection() {
  const {
    config: msgConfig,
    setEnabled: setMsgEnabled,
    setFrequency,
    setRandomize,
    setActiveDay,
    setContextEnabled,
    addMessage,
    updateMessage,
    removeMessage,
    resetToDefaults: resetMessages,
  } = usePandaMessagesStore()

  const [newText, setNewText] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [newCategory, setNewCategory] = useState<string>('weekend')

  const handleAddMessage = () => {
    if (!newText.trim()) return
    addMessage({
      id: `custom_${Date.now()}`,
      text: newText.trim(),
      emoji: newEmoji || '🐼',
      category: newCategory as any,
      animation: 'wave',
      enabled: true,
    })
    setNewText('')
    setNewEmoji('')
  }

  return (
    <GlassCard hoverEffect={false}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4" style={{ color: 'var(--accent)' }} />
          <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Weekend & Smart Messages</h3>
        </div>
        <button
          onClick={() => setMsgEnabled(!msgConfig.enabled)}
          className="relative w-10 h-5 rounded-full shrink-0 transition-colors duration-200"
          style={{
            background: msgConfig.enabled ? 'var(--accent)' : 'var(--hover)',
            border: `1px solid ${msgConfig.enabled ? 'var(--accent)' : 'var(--border)'}`,
          }}
          role="switch"
          aria-checked={msgConfig.enabled}
        >
          <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200" style={{ transform: msgConfig.enabled ? 'translateX(20px)' : 'translateX(0)' }} />
        </button>
      </div>

      {/* Frequency */}
      <div className="mb-4">
        <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-muted)' }}>Show Frequency</label>
        <div className="flex gap-1.5">
          {([['every_login', 'Every Login'], ['once_per_day', 'Once/Day'], ['once_per_session', 'Once/Session']] as [ShowFrequency, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFrequency(val)}
              className={cn('px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all', msgConfig.frequency === val ? 'bg-accent text-white' : '')}
              style={msgConfig.frequency !== val ? { background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' } : {}}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Days + Context */}
      <div className="grid grid-cols-2 gap-x-4 mb-4">
        <Toggle enabled={msgConfig.activeDays.saturday} onChange={v => setActiveDay('saturday', v)} label="Saturday" />
        <Toggle enabled={msgConfig.activeDays.sunday} onChange={v => setActiveDay('sunday', v)} label="Sunday" />
        <Toggle enabled={msgConfig.lateNightEnabled} onChange={v => setContextEnabled('lateNightEnabled', v)} label="Late Night (10PM+)" />
        <Toggle enabled={msgConfig.earlyMorningEnabled} onChange={v => setContextEnabled('earlyMorningEnabled', v)} label="Early Morning (<6AM)" />
        <Toggle enabled={msgConfig.firstOfWeekEnabled} onChange={v => setContextEnabled('firstOfWeekEnabled', v)} label="First of Week" />
        <Toggle enabled={msgConfig.randomize} onChange={v => setRandomize(v)} label="Randomize" />
      </div>

      {/* Message List */}
      <div className="mb-3 max-h-56 overflow-y-auto space-y-1.5 pr-1">
        {msgConfig.messages.map(msg => (
          <div key={msg.id} className="flex items-center justify-between py-1.5 px-2 rounded-lg" style={{ background: 'var(--hover)' }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs shrink-0">{msg.emoji || '🐼'}</span>
              <span className="text-[10px] truncate" style={{ color: msg.enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>{msg.text}</span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => updateMessage(msg.id, { enabled: !msg.enabled })} className="p-1 rounded" style={{ color: msg.enabled ? 'var(--accent)' : 'var(--text-muted)' }}>
                {msg.enabled ? <Eye className="w-2.5 h-2.5" /> : <EyeOff className="w-2.5 h-2.5" />}
              </button>
              <button onClick={() => removeMessage(msg.id)} className="p-1 rounded hover:text-red-400" style={{ color: 'var(--text-muted)' }}>
                <Trash2 className="w-2.5 h-2.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add message */}
      <div className="p-2.5 rounded-xl space-y-2" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
        <div className="grid grid-cols-[32px_1fr_80px] gap-1.5">
          <input value={newEmoji} onChange={e => setNewEmoji(e.target.value)} placeholder="🐼" className="field-input text-center text-xs h-7" maxLength={2} />
          <input value={newText} onChange={e => setNewText(e.target.value)} placeholder="Message text..." className="field-input text-xs h-7" />
          <select value={newCategory} onChange={e => setNewCategory(e.target.value)} className="field-input text-[9px] h-7">
            <option value="weekend">Weekend</option>
            <option value="late_night">Night</option>
            <option value="early_morning">Morning</option>
            <option value="first_of_week">Monday</option>
          </select>
        </div>
        <button onClick={handleAddMessage} disabled={!newText.trim()} className="btn-accent w-full text-[10px] h-7 disabled:opacity-40">
          <Plus className="w-3 h-3" /> Add Message
        </button>
      </div>
    </GlassCard>
  )
}

// ── Main Admin Config ─────────────────────────────────────────────────────────

export function AdminPandaConfig() {
  const {
    config,
    setEnabled,
    setFeature,
    setSeasonalEnabled,
    updateSeasonalTheme,
    addSeasonalTheme,
    removeSeasonalTheme,
    resetToDefaults,
  } = usePandaConfigStore()

  const [newThemeName, setNewThemeName] = useState('')
  const [newThemeEmoji, setNewThemeEmoji] = useState('')
  const [newThemeStart, setNewThemeStart] = useState('')
  const [newThemeEnd, setNewThemeEnd] = useState('')

  // Inline editing state for seasonal themes
  const [editingThemeId, setEditingThemeId] = useState<string | null>(null)
  const [editThemeName, setEditThemeName] = useState('')
  const [editThemeEmoji, setEditThemeEmoji] = useState('')
  const [editThemeStart, setEditThemeStart] = useState('')
  const [editThemeEnd, setEditThemeEnd] = useState('')

  const handleAddTheme = () => {
    if (!newThemeName.trim() || !newThemeStart || !newThemeEnd) return
    addSeasonalTheme({
      id: newThemeName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, ''),
      name: newThemeName.trim(),
      emoji: newThemeEmoji || '🎉',
      enabled: true,
      startDate: newThemeStart,
      endDate: newThemeEnd,
    })
    setNewThemeName('')
    setNewThemeEmoji('')
    setNewThemeStart('')
    setNewThemeEnd('')
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
            <PawPrint className="w-5 h-5" style={{ color: 'var(--accent)' }} />
          </div>
          <div>
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Lazy Panda Configuration</h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Configure the interactive authentication mascot.</p>
          </div>
        </div>
        <button
          onClick={resetToDefaults}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all"
          style={{ background: 'var(--hover)', color: 'var(--text-muted)', border: '1px solid var(--border)' }}
        >
          <RotateCcw className="w-3 h-3" /> Reset Defaults
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">
        {/* Left column — Config */}
        <div className="space-y-5">

          {/* Global Enable */}
          <GlassCard hoverEffect={false}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <PawPrint className="w-4 h-4" style={{ color: config.enabled ? 'var(--accent)' : 'var(--text-muted)' }} />
                <div>
                  <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Enable Lazy Panda</span>
                  <span className="text-[10px] block" style={{ color: 'var(--text-muted)' }}>Master switch — disables mascot entirely when off</span>
                </div>
              </div>
              <button
                onClick={() => setEnabled(!config.enabled)}
                className="relative w-12 h-6 rounded-full shrink-0 transition-colors duration-200"
                style={{
                  background: config.enabled ? 'var(--accent)' : 'var(--hover)',
                  border: `1px solid ${config.enabled ? 'var(--accent)' : 'var(--border)'}`,
                }}
                role="switch"
                aria-checked={config.enabled}
              >
                <span
                  className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
                  style={{ transform: config.enabled ? 'translateX(24px)' : 'translateX(0)' }}
                />
              </button>
            </div>
          </GlassCard>

          {/* Feature Controls */}
          <GlassCard hoverEffect={false}>
            <div className="flex items-center gap-2 mb-4">
              <Eye className="w-4 h-4" style={{ color: 'var(--accent)' }} />
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Feature Controls</h3>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--divider)' }}>
              {(Object.keys(FEATURE_LABELS) as Array<keyof PandaFeatureToggles>).map(key => (
                <Toggle
                  key={key}
                  enabled={config.features[key]}
                  onChange={(v) => setFeature(key, v)}
                  label={FEATURE_LABELS[key].label}
                  description={FEATURE_LABELS[key].description}
                />
              ))}
            </div>
          </GlassCard>

          {/* Seasonal Themes */}
          <GlassCard hoverEffect={false}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>Seasonal Themes</h3>
              </div>
              <button
                onClick={() => setSeasonalEnabled(!config.seasonalEnabled)}
                className="relative w-10 h-5 rounded-full shrink-0 transition-colors duration-200"
                style={{
                  background: config.seasonalEnabled ? 'var(--accent)' : 'var(--hover)',
                  border: `1px solid ${config.seasonalEnabled ? 'var(--accent)' : 'var(--border)'}`,
                }}
                role="switch"
                aria-checked={config.seasonalEnabled}
                aria-label="Enable Seasonal Themes"
              >
                <span
                  className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
                  style={{ transform: config.seasonalEnabled ? 'translateX(20px)' : 'translateX(0)' }}
                />
              </button>
            </div>

            {/* Theme list */}
            <div className="space-y-2 mb-4">
              {config.seasonalThemes.map(theme => {
                const isEditing = editingThemeId === theme.id
                return (
                  <div
                    key={theme.id}
                    className="p-3 rounded-xl"
                    style={{ background: 'var(--hover)', border: `1px solid ${isEditing ? 'var(--accent)' : 'var(--border)'}` }}
                  >
                    {isEditing ? (
                      <div className="space-y-2">
                        <div className="grid grid-cols-[36px_1fr] gap-2">
                          <input
                            value={editThemeEmoji}
                            onChange={e => setEditThemeEmoji(e.target.value)}
                            className="field-input text-center text-sm h-8"
                            maxLength={2}
                          />
                          <input
                            value={editThemeName}
                            onChange={e => setEditThemeName(e.target.value)}
                            className="field-input text-xs h-8"
                            placeholder="Theme name"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            value={editThemeStart}
                            onChange={e => setEditThemeStart(e.target.value)}
                            className="field-input text-xs h-8"
                            placeholder="Start (MM-DD)"
                            maxLength={5}
                          />
                          <input
                            value={editThemeEnd}
                            onChange={e => setEditThemeEnd(e.target.value)}
                            className="field-input text-xs h-8"
                            placeholder="End (MM-DD)"
                            maxLength={5}
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              updateSeasonalTheme(theme.id, {
                                name: editThemeName.trim() || theme.name,
                                emoji: editThemeEmoji || theme.emoji,
                                startDate: editThemeStart || theme.startDate,
                                endDate: editThemeEnd || theme.endDate,
                              })
                              setEditingThemeId(null)
                            }}
                            className="btn-accent flex-1 text-[10px] h-7"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingThemeId(null)}
                            className="btn-ghost flex-1 text-[10px] h-7"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="text-base">{theme.emoji}</span>
                          <div className="min-w-0">
                            <span className="text-xs font-semibold block truncate" style={{ color: 'var(--text-primary)' }}>{theme.name}</span>
                            <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                              {theme.startDate} → {theme.endDate}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => updateSeasonalTheme(theme.id, { enabled: !theme.enabled })}
                            className="p-1.5 rounded-lg transition-all"
                            style={{ color: theme.enabled ? 'var(--accent)' : 'var(--text-muted)' }}
                            title={theme.enabled ? 'Disable' : 'Enable'}
                          >
                            {theme.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => {
                              setEditingThemeId(theme.id)
                              setEditThemeName(theme.name)
                              setEditThemeEmoji(theme.emoji)
                              setEditThemeStart(theme.startDate)
                              setEditThemeEnd(theme.endDate)
                            }}
                            className="p-1.5 rounded-lg transition-all"
                            style={{ color: 'var(--text-muted)' }}
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => removeSeasonalTheme(theme.id)}
                            className="p-1.5 rounded-lg transition-all hover:text-red-400"
                            style={{ color: 'var(--text-muted)' }}
                            title="Remove"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Add new theme */}
            <div className="p-3 rounded-xl space-y-2" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
              <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--text-muted)' }}>Add Seasonal Theme</span>
              <div className="grid grid-cols-[40px_1fr] gap-2">
                <input
                  value={newThemeEmoji}
                  onChange={e => setNewThemeEmoji(e.target.value)}
                  placeholder="🎉"
                  className="field-input text-center text-sm h-8"
                  maxLength={2}
                />
                <input
                  value={newThemeName}
                  onChange={e => setNewThemeName(e.target.value)}
                  placeholder="Theme name"
                  className="field-input text-xs h-8"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>Start (MM-DD)</label>
                  <input
                    value={newThemeStart}
                    onChange={e => setNewThemeStart(e.target.value)}
                    placeholder="12-01"
                    className="field-input text-xs h-8 mt-1"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="text-[9px] uppercase font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>End (MM-DD)</label>
                  <input
                    value={newThemeEnd}
                    onChange={e => setNewThemeEnd(e.target.value)}
                    placeholder="12-31"
                    className="field-input text-xs h-8 mt-1"
                    maxLength={5}
                  />
                </div>
              </div>
              <button
                onClick={handleAddTheme}
                disabled={!newThemeName.trim() || !newThemeStart || !newThemeEnd}
                className="btn-accent w-full text-xs h-8 disabled:opacity-40"
              >
                <Plus className="w-3 h-3" /> Add Theme
              </button>
            </div>
          </GlassCard>

          {/* ── Smart Messages Config ── */}
          <WeekendMessagesSection />

          {/* ── Event & Greetings Config ── */}
          <Suspense fallback={<div className="flex items-center justify-center py-8"><div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} /></div>}>
            <AdminEventGreetings />
          </Suspense>
        </div>

        {/* Right column — Live Preview */}
        <div className="space-y-5">
          <LivePreview />

          {/* Active seasonal theme indicator */}
          {(() => {
            const active = usePandaConfigStore.getState().getActiveSeasonalTheme()
            return active ? (
              <GlassCard hoverEffect={false}>
                <div className="flex items-center gap-2 text-center">
                  <span className="text-2xl">{active.emoji}</span>
                  <div>
                    <span className="text-xs font-bold block" style={{ color: 'var(--accent)' }}>Currently Active</span>
                    <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>{active.name}</span>
                  </div>
                </div>
              </GlassCard>
            ) : (
              <GlassCard hoverEffect={false}>
                <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>No seasonal theme active today.</p>
              </GlassCard>
            )
          })()}
        </div>
      </div>
    </motion.div>
  )
}
