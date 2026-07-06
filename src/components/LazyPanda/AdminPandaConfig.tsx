// src/components/LazyPanda/AdminPandaConfig.tsx
// Admin-only configuration page for the Lazy Panda mascot.

import React, { useState, Suspense, lazy } from 'react'
import { motion } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { cn } from '@/lib/utils'
import {
  PawPrint, Eye, EyeOff, Sparkles, Plus, Trash2,
  RotateCcw, Monitor, Moon, Sun, MessageSquare,
} from 'lucide-react'
import { usePandaConfigStore, type PandaFeatureToggles } from './pandaConfig'
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
        className="relative w-11 h-6 rounded-full shrink-0 transition-colors duration-200"
        style={{
          background: enabled ? 'var(--accent)' : 'var(--hover)',
          border: `1px solid ${enabled ? 'var(--accent)' : 'var(--border)'}`,
        }}
        role="switch"
        aria-checked={enabled}
        aria-label={label}
      >
        <span
          className="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200"
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

// Auto-emoji map by category
const CATEGORY_EMOJI: Record<string, string> = {
  weekend: '👀',
  late_night: '🌙',
  early_morning: '☕',
  first_of_week: '🏆',
  general: '🐼',
}

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
    setBroadcast,
    resetToDefaults: resetMessages,
  } = usePandaMessagesStore()

  const [newText, setNewText] = useState('')
  const [newEmoji, setNewEmoji] = useState('')
  const [newCategory, setNewCategory] = useState<string>('weekend')

  // Broadcast local state — sync from store
  const [broadcastText, setBroadcastText] = useState(msgConfig.broadcast?.text || '')
  const [broadcastEmoji, setBroadcastEmoji] = useState(msgConfig.broadcast?.emoji || '📢')

  // Auto-fill emoji when category changes if user hasn't typed one
  const handleCategoryChange = (cat: string) => {
    setNewCategory(cat)
    if (!newEmoji) {
      setNewEmoji(CATEGORY_EMOJI[cat] || '🐼')
    }
  }

  // Auto-fill emoji when text starts being typed if still empty
  const handleTextChange = (text: string) => {
    setNewText(text)
    if (!newEmoji && text.length === 1) {
      setNewEmoji(CATEGORY_EMOJI[newCategory] || '🐼')
    }
  }

  const handleAddMessage = () => {
    if (!newText.trim()) return
    // Auto-add emoji if empty
    const finalEmoji = newEmoji.trim() || CATEGORY_EMOJI[newCategory] || '🐼'
    const finalText = newText.trim()
    // Automatically add emoji to the start of text if not already present
    const textWithEmoji = finalText.startsWith(finalEmoji) ? finalText : `${finalEmoji} ${finalText}`

    addMessage({
      id: `custom_${Date.now()}`,
      text: textWithEmoji,
      emoji: finalEmoji,
      category: newCategory as any,
      animation: 'wave',
      enabled: true,
    })
    setNewText('')
    setNewEmoji('')
  }

  // Broadcast toggle handler
  const handleBroadcastToggle = () => {
    const willEnable = !msgConfig.broadcast?.enabled
    const text = broadcastText.trim() || 'Welcome everyone!'
    const emoji = broadcastEmoji || '📢'
    // Auto-add emoji to broadcast text if not present
    const textWithEmoji = text.startsWith(emoji) ? text : `${emoji} ${text}`
    setBroadcast({ enabled: willEnable, text: textWithEmoji, emoji })
    if (willEnable && !broadcastText.trim()) setBroadcastText('Welcome everyone!')
    if (willEnable && !broadcastEmoji) setBroadcastEmoji('📢')
  }

  // Save broadcast on blur
  const saveBroadcast = () => {
    const text = broadcastText.trim() || 'Welcome everyone!'
    const emoji = broadcastEmoji || '📢'
    // Auto-add emoji to broadcast text
    const textWithEmoji = text.startsWith(emoji) ? text : `${emoji} ${text}`
    setBroadcast({
      enabled: msgConfig.broadcast?.enabled ?? false,
      text: textWithEmoji,
      emoji,
    })
  }

  // Auto-emoji for broadcast when text typed
  const handleBroadcastTextChange = (text: string) => {
    setBroadcastText(text)
    if (!broadcastEmoji && text.length === 1) setBroadcastEmoji('📢')
  }

  return (
    <GlassCard hoverEffect={false}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
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
          <span className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
            style={{ transform: msgConfig.enabled ? 'translateX(20px)' : 'translateX(0)' }} />
        </button>
      </div>

      {/* Show Frequency */}
      <div className="mb-4">
        <label className="text-[10px] font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--text-muted)' }}>Show Frequency</label>
        <div className="flex gap-2">
          {([['every_login', 'Every Login'], ['once_per_day', 'Once / Day'], ['once_per_session', 'Once / Session']] as [ShowFrequency, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFrequency(val)}
              className="flex-1 px-3 py-2 rounded-lg text-xs font-bold transition-all"
              style={{
                background: msgConfig.frequency === val ? 'var(--accent)' : 'var(--hover)',
                color: msgConfig.frequency === val ? '#fff' : 'var(--text-primary)',
                border: `1px solid ${msgConfig.frequency === val ? 'var(--accent)' : 'var(--border)'}`,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Active Contexts */}
      <div className="mb-4 p-3 rounded-xl" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
        <label className="text-[10px] font-bold uppercase tracking-widest block mb-2" style={{ color: 'var(--text-muted)' }}>Active Contexts</label>
        <div className="grid grid-cols-2 gap-0">
          <Toggle enabled={msgConfig.activeDays.saturday} onChange={v => setActiveDay('saturday', v)} label="Saturday" />
          <Toggle enabled={msgConfig.activeDays.sunday} onChange={v => setActiveDay('sunday', v)} label="Sunday" />
          <Toggle enabled={msgConfig.lateNightEnabled} onChange={v => setContextEnabled('lateNightEnabled', v)} label="Late Night" />
          <Toggle enabled={msgConfig.earlyMorningEnabled} onChange={v => setContextEnabled('earlyMorningEnabled', v)} label="Early Morning" />
          <Toggle enabled={msgConfig.firstOfWeekEnabled} onChange={v => setContextEnabled('firstOfWeekEnabled', v)} label="First of Week" />
          <Toggle enabled={msgConfig.randomize} onChange={v => setRandomize(v)} label="Randomize" />
        </div>
      </div>

      {/* Message List */}
      <div className="mb-3">
        <label className="text-[10px] font-bold uppercase tracking-widest block mb-1.5" style={{ color: 'var(--text-muted)' }}>Messages ({msgConfig.messages.length})</label>
        <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
          {msgConfig.messages.map(msg => (
            <div key={msg.id} className="flex items-center gap-2 py-2 px-2.5 rounded-lg" style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}>
              <span className="text-base shrink-0 w-6 text-center">{msg.emoji || '🐼'}</span>
              <span className="text-xs flex-1 truncate font-medium" style={{ color: msg.enabled ? 'var(--text-primary)' : 'var(--text-muted)' }}>{msg.text}</span>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => updateMessage(msg.id, { enabled: !msg.enabled })}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: msg.enabled ? 'var(--accent)' : 'var(--text-muted)' }}
                  title={msg.enabled ? 'Disable' : 'Enable'}
                >
                  {msg.enabled ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => removeMessage(msg.id)}
                  className="p-1.5 rounded hover:text-red-400 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  title="Remove"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Broadcast Message ── */}
      <div
        className="mb-3 p-3 rounded-xl"
        style={{
          background: msgConfig.broadcast?.enabled ? 'rgba(234,179,8,0.06)' : 'var(--card-bg)',
          border: `1px solid ${msgConfig.broadcast?.enabled ? 'rgba(234,179,8,0.25)' : 'var(--border)'}`,
        }}
      >
        {/* Broadcast header */}
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-[11px] font-bold block" style={{ color: msgConfig.broadcast?.enabled ? '#eab308' : 'var(--text-primary)' }}>
              📢 Broadcast Message
            </span>
            <span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>
              Overrides all messages when ON
            </span>
          </div>
          <button
            onClick={handleBroadcastToggle}
            className="relative rounded-full shrink-0 transition-colors duration-200"
            style={{
              width: 36, height: 18,
              background: msgConfig.broadcast?.enabled ? '#eab308' : 'var(--hover)',
              border: `1px solid ${msgConfig.broadcast?.enabled ? '#eab308' : 'var(--border)'}`,
            }}
            role="switch"
            aria-checked={!!msgConfig.broadcast?.enabled}
          >
            <span
              className="absolute top-0.5 left-0.5 rounded-full bg-white shadow transition-transform duration-200"
              style={{ width: 14, height: 14, transform: msgConfig.broadcast?.enabled ? 'translateX(18px)' : 'translateX(0)' }}
            />
          </button>
        </div>
        {/* Broadcast inputs */}
        <div className="flex gap-1.5">
          <input
            value={broadcastEmoji}
            onChange={e => setBroadcastEmoji(e.target.value)}
            onBlur={saveBroadcast}
            placeholder="📢"
            maxLength={2}
            className="field-input text-center text-sm h-8 w-10 shrink-0"
            style={{ fontWeight: '600' }}
          />
          <input
            value={broadcastText}
            onChange={e => handleBroadcastTextChange(e.target.value)}
            onBlur={saveBroadcast}
            placeholder="e.g. Happy Birthday Ameen! 🎂"
            className="field-input text-xs h-8 flex-1 min-w-0"
            style={{
              color: 'var(--text-primary)',
              fontWeight: '500',
            }}
          />
        </div>
      </div>

      {/* ── Add New Message ── */}
      <div className="p-3 rounded-xl space-y-2" style={{ background: 'var(--card-bg)', border: '1px solid var(--border)' }}>
        <label className="text-[10px] font-bold uppercase tracking-widest block" style={{ color: 'var(--text-muted)' }}>Add Message</label>
        {/* Row 1: emoji + text */}
        <div className="flex gap-1.5">
          <input
            value={newEmoji}
            onChange={e => setNewEmoji(e.target.value)}
            placeholder={CATEGORY_EMOJI[newCategory] || '🐼'}
            maxLength={2}
            className="field-input text-center text-sm h-8 w-10 shrink-0"
            style={{ fontWeight: '600' }}
          />
          <input
            value={newText}
            onChange={e => handleTextChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddMessage()}
            placeholder="Message text..."
            className="field-input text-xs h-8 flex-1 min-w-0"
            style={{
              color: 'var(--text-primary)',
              fontWeight: '500',
            }}
          />
        </div>
        {/* Row 2: category select + add button */}
        <div className="flex gap-1.5">
          <select
            value={newCategory}
            onChange={e => handleCategoryChange(e.target.value)}
            className="field-input text-xs h-8 flex-1"
            style={{
              color: 'var(--text-primary)',
              background: 'var(--input-bg)',
              padding: '0 8px',
              fontWeight: '500',
            }}
          >
            <option value="weekend" style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>🏖 Weekend</option>
            <option value="late_night" style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>🌙 Late Night</option>
            <option value="early_morning" style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>☕ Early Morning</option>
            <option value="first_of_week" style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>🏆 First of Week</option>
            <option value="general" style={{ background: 'var(--card-bg)', color: 'var(--text-primary)' }}>🐼 General</option>
          </select>
          <button
            onClick={handleAddMessage}
            disabled={!newText.trim()}
            className="flex items-center gap-1 px-3 h-8 rounded-lg text-xs font-bold transition-all disabled:opacity-40"
            style={{ background: 'var(--accent)', color: '#fff' }}
          >
            <Plus className="w-3 h-3" /> Add
          </button>
        </div>
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
    resetToDefaults,
  } = usePandaConfigStore()

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
        </div>
      </div>
    </motion.div>
  )
}
