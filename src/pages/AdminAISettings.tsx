// src/pages/AdminAISettings.tsx
// Admin-only AI provider management panel.

import React, { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { FloatingButton } from '@/components/ui/FloatingButton'
import { CinematicHeading } from '@/components/ui/CinematicHeading'
import { RoleGuard } from '@/components/ui/RoleGuard'
import { useToast } from '@/hooks/use-toast'
import { aiProviderService, type AIProviderConfig, type CreateProviderPayload } from '@/services/ai/aiProviderService'
import {
  Plus, Trash2, Edit3, CheckCircle2, XCircle, Zap, Eye, EyeOff,
  RefreshCw, Shield, Globe, Cpu, Sparkles, ChevronDown, ChevronUp,
  Activity, ToggleLeft, ToggleRight, Star, Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Provider metadata ─────────────────────────────────────────────────────────

const PROVIDERS = [
  { id: 'openai',      label: 'OpenAI',      icon: Globe,    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
  { id: 'anthropic',   label: 'Anthropic',   icon: Shield,   models: ['claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229'] },
  { id: 'gemini',      label: 'Gemini',      icon: Sparkles, models: ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-2.0-flash'] },
  { id: 'groq',        label: 'Groq',        icon: Zap,      models: ['llama-3.3-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it'] },
  { id: 'openrouter',  label: 'OpenRouter',  icon: Globe,    models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'meta-llama/llama-3.1-70b-instruct'] },
  { id: 'deepseek',    label: 'DeepSeek',    icon: Cpu,      models: ['deepseek-chat', 'deepseek-reasoner'] },
  { id: 'ollama',      label: 'Ollama',      icon: Cpu,      models: ['llama3.2', 'mistral', 'codellama'] },
  { id: 'nvidia',      label: 'NVIDIA',      icon: Zap,      models: [
    'z-ai/glm4.7',
    'meta/llama-3.3-70b-instruct',
    'meta/llama-3.1-405b-instruct',
    'meta/llama-3.1-70b-instruct',
    'meta/llama-3.1-8b-instruct',
    'nvidia/llama-3.1-nemotron-70b-instruct',
    'nvidia/llama-3.1-nemotron-ultra-253b-v1',
    'nvidia/llama-3.3-nemotron-super-49b-v1',
    'mistralai/mistral-large-2-instruct',
    'mistralai/mixtral-8x22b-instruct-v0.1',
    'mistralai/mistral-7b-instruct-v0.3',
    'google/gemma-3-27b-it',
    'google/gemma-3-12b-it',
    'google/gemma-3-4b-it',
    'deepseek-ai/deepseek-r1',
    'deepseek-ai/deepseek-r1-0528',
    'qwen/qwen2.5-72b-instruct',
    'qwen/qwen2.5-coder-32b-instruct',
    'microsoft/phi-4',
    'microsoft/phi-3.5-mini-instruct',
    'ibm/granite-3.3-8b-instruct',
  ] },
]

const PROVIDER_COLORS: Record<string, string> = {
  openai: 'text-green-400 bg-green-400/10 border-green-400/20',
  anthropic: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  gemini: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  groq: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  openrouter: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  deepseek: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  ollama: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  nvidia: 'text-green-300 bg-green-300/10 border-green-300/20',
}

// ── Custom Dropdown ──────────────────────────────────────────────────────────

interface CustomSelectProps {
  value: string
  onChange: (value: string) => void
  options: string[]
  className?: string
}

const CustomSelect: React.FC<CustomSelectProps> = ({ value, onChange, options, className }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div ref={ref} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between bg-[#141414] border border-white/10 rounded-xl px-4 py-3 text-sm text-white hover:border-accent-gold/50 focus:outline-none focus:border-accent-gold transition-all"
      >
        <span className="truncate font-mono text-xs text-white">{value}</span>
        <ChevronDown className={cn('w-4 h-4 text-text-muted shrink-0 ml-2 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-2 bg-[#141414] border border-white/10 rounded-xl overflow-hidden shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
          >
            <div className="max-h-56 overflow-y-auto">
              {options.map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => { onChange(opt); setOpen(false) }}
                  className={cn(
                    'w-full flex items-center justify-between px-4 py-2.5 text-xs font-mono text-left transition-colors',
                    value === opt
                      ? 'bg-accent-gold/15 text-accent-gold'
                      : 'text-white/80 hover:bg-white/5 hover:text-white'
                  )}
                >
                  <span className="truncate">{opt}</span>
                  {value === opt && <Check className="w-3.5 h-3.5 shrink-0 ml-2" />}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Empty form state ──────────────────────────────────────────────────────────

const emptyForm = (): CreateProviderPayload => ({
  provider_name: 'openai',
  api_key: '',
  model_name: 'gpt-4o',
  is_active: false,
  is_enabled: true,
  max_tokens: 4096,
  temperature: 0.7,
  rate_limit_rpm: null,
  monthly_budget: null,
  provider_priority: 0,
})

// ── Component ─────────────────────────────────────────────────────────────────

export const AdminAISettings = () => {
  const { toast } = useToast()
  const [configs, setConfigs] = useState<AIProviderConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateProviderPayload>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [showKey, setShowKey] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<Record<string, { ok: boolean; latency: number }>>({})
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      setConfigs(await aiProviderService.list())
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message })
    } finally {
      setLoading(false)
    }
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setShowKey(false)
    setShowForm(true)
  }

  const openEdit = (cfg: AIProviderConfig) => {
    setEditingId(cfg.id)
    setForm({
      provider_name: cfg.provider_name,
      api_key: '',  // never pre-fill key
      model_name: cfg.model_name,
      is_active: cfg.is_active,
      is_enabled: cfg.is_enabled,
      max_tokens: cfg.max_tokens,
      temperature: cfg.temperature,
      rate_limit_rpm: cfg.rate_limit_rpm,
      monthly_budget: cfg.monthly_budget,
      provider_priority: cfg.provider_priority,
    })
    setShowKey(false)
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.provider_name || !form.model_name) {
      toast({ variant: 'destructive', title: 'Validation', description: 'Provider and model are required.' })
      return
    }
    if (!editingId && !form.api_key) {
      toast({ variant: 'destructive', title: 'Validation', description: 'API key is required for new providers.' })
      return
    }

    setSaving(true)
    try {
      if (editingId) {
        const payload = { ...form }
        if (!payload.api_key) delete (payload as any).api_key
        await aiProviderService.update(editingId, payload)
        toast({ title: 'Provider Updated' })
      } else {
        await aiProviderService.create(form)
        toast({ title: 'Provider Added' })
      }
      setShowForm(false)
      await load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Save Failed', description: e.message })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this provider? This cannot be undone.')) return
    try {
      await aiProviderService.remove(id)
      toast({ title: 'Provider Removed' })
      await load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: e.message })
    }
  }

  const handleToggleActive = async (cfg: AIProviderConfig) => {
    try {
      await aiProviderService.update(cfg.id, { is_active: !cfg.is_active })
      await load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message })
    }
  }

  const handleToggleEnabled = async (cfg: AIProviderConfig) => {
    try {
      await aiProviderService.update(cfg.id, { is_enabled: !cfg.is_enabled })
      await load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message })
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    const result = await aiProviderService.testConnection(id)
    setTestResults(prev => ({ ...prev, [id]: result }))
    setTestingId(null)
    toast({
      title: result.ok ? 'Connection OK' : 'Connection Failed',
      description: result.ok ? `Responded in ${result.latency}ms` : (result.error ?? 'Provider did not respond.'),
      variant: result.ok ? 'default' : 'destructive'
    })
  }

  const selectedProviderMeta = PROVIDERS.find(p => p.id === form.provider_name)

  return (
    <RoleGuard permission="manage:ai-providers">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-12">
        <div className="flex items-start justify-between mb-10">
          <CinematicHeading
            title="AI Providers"
            subtitle="Centrally manage AI provider API keys and models. Users never see or configure these."
            align="left"
          />
          <FloatingButton onClick={openCreate} className="mt-2 shrink-0">
            <Plus className="w-4 h-4 mr-2" /> Add Provider
          </FloatingButton>
        </div>

        {/* Security notice */}
        <div className="mb-8 p-4 rounded-2xl bg-green-500/5 border border-green-500/15 flex items-center gap-3">
          <Shield className="w-5 h-5 text-green-400 shrink-0" />
          <p className="text-xs text-green-400/80 leading-relaxed">
            API keys are encrypted with AES-256-GCM before storage. They are decrypted only inside the secure Edge Function and never exposed to clients.
          </p>
        </div>

        {/* Provider list */}
        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
          </div>
        ) : configs.length === 0 ? (
          <GlassCard hoverEffect={false} className="flex flex-col items-center justify-center py-24 text-center">
            <Cpu className="w-12 h-12 text-text-muted mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Providers Configured</h3>
            <p className="text-text-secondary mb-6">Add your first AI provider to enable AI features for all users.</p>
            <FloatingButton onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> Add Provider</FloatingButton>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {configs.map((cfg) => {
              const meta = PROVIDERS.find(p => p.id === cfg.provider_name)
              const Icon = meta?.icon ?? Cpu
              const colorClass = PROVIDER_COLORS[cfg.provider_name] ?? 'text-white/60 bg-white/5 border-white/10'
              const testResult = testResults[cfg.id]
              const isExpanded = expandedId === cfg.id

              return (
                <GlassCard key={cfg.id} hoverEffect={false} className="p-0 overflow-hidden">
                  {/* Main row */}
                  <div className="flex items-center gap-4 p-5">
                    {/* Icon + name */}
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center border shrink-0', colorClass)}>
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{meta?.label ?? cfg.provider_name}</span>
                        <span className={cn('px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest', colorClass)}>
                          {cfg.provider_name}
                        </span>
                        {cfg.is_active && (
                          <span className="px-2 py-0.5 rounded-full bg-accent-gold/10 border border-accent-gold/30 text-[9px] font-black uppercase tracking-widest text-accent-gold flex items-center gap-1">
                            <Star className="w-2.5 h-2.5" /> Active
                          </span>
                        )}
                        {testResult && (
                          <span className={cn('px-2 py-0.5 rounded-full border text-[9px] font-black uppercase tracking-widest flex items-center gap-1',
                            testResult.ok ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                          )}>
                            {testResult.ok ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                            {testResult.ok ? `${testResult.latency}ms` : 'Failed'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-0.5 font-mono">{cfg.model_name}</p>
                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Enabled toggle */}
                      <button
                        onClick={() => handleToggleEnabled(cfg)}
                        title={cfg.is_enabled ? 'Disable' : 'Enable'}
                        className="p-2 hover:bg-white/5 rounded-lg transition-all"
                      >
                        {cfg.is_enabled
                          ? <ToggleRight className="w-5 h-5 text-green-400" />
                          : <ToggleLeft className="w-5 h-5 text-text-muted" />}
                      </button>

                      {/* Set active */}
                      <button
                        onClick={() => handleToggleActive(cfg)}
                        title={cfg.is_active ? 'Deactivate' : 'Set as Active'}
                        className={cn('p-2 rounded-lg transition-all', cfg.is_active ? 'text-accent-gold' : 'text-text-muted hover:text-accent-gold hover:bg-white/5')}
                      >
                        <Star className="w-4 h-4" />
                      </button>

                      {/* Test */}
                      <button
                        onClick={() => handleTest(cfg.id)}
                        disabled={testingId === cfg.id}
                        title="Test connection"
                        className="p-2 hover:bg-white/5 rounded-lg text-text-muted hover:text-white transition-all disabled:opacity-40"
                      >
                        {testingId === cfg.id
                          ? <RefreshCw className="w-4 h-4 animate-spin" />
                          : <Activity className="w-4 h-4" />}
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => openEdit(cfg)}
                        className="p-2 hover:bg-white/5 rounded-lg text-text-muted hover:text-white transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(cfg.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-text-muted hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Expand */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : cfg.id)}
                        className="p-2 hover:bg-white/5 rounded-lg text-text-muted hover:text-white transition-all"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded details */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 pt-0 border-t border-white/5 grid grid-cols-2 md:grid-cols-4 gap-4 mt-0 pt-4">
                          {[
                            { label: 'Max Tokens', value: cfg.max_tokens.toLocaleString() },
                            { label: 'Temperature', value: cfg.temperature },
                            { label: 'Rate Limit', value: cfg.rate_limit_rpm ? `${cfg.rate_limit_rpm} rpm` : '—' },
                            { label: 'Monthly Budget', value: cfg.monthly_budget ? `$${cfg.monthly_budget}` : '—' },
                          ].map(item => (
                            <div key={item.label} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                              <p className="text-[9px] font-black uppercase tracking-widest text-text-muted mb-1">{item.label}</p>
                              <p className="text-sm font-bold text-white">{item.value}</p>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              )
            })}
          </div>
        )}

        {/* Add/Edit Form Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={(e) => e.target === e.currentTarget && setShowForm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="w-full max-w-lg"
              >
                <GlassCard hoverEffect={false} className="bg-background/90">
                  <h3 className="text-xl font-bold text-white mb-6">
                    {editingId ? 'Edit Provider' : 'Add AI Provider'}
                  </h3>

                  <div className="space-y-5">
                    {/* Provider select */}
                    <div>
                      <label className="label-xs">Provider</label>
                      <div className="grid grid-cols-3 gap-2 mt-2">
                        {PROVIDERS.map(p => (
                          <button
                            key={p.id}
                            onClick={() => {
                              setForm(f => ({ ...f, provider_name: p.id, model_name: p.models[0] }))
                            }}
                            className={cn(
                              'flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition-all',
                              form.provider_name === p.id
                                ? 'bg-accent-gold/10 border-accent-gold text-accent-gold'
                                : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20'
                            )}
                          >
                            <p.icon className="w-4 h-4" />
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Model */}
                    <div>
                      <label className="label-xs">Model</label>
                      <CustomSelect
                        value={form.model_name}
                        onChange={val => setForm(f => ({ ...f, model_name: val }))}
                        options={selectedProviderMeta?.models ?? []}
                        className="mt-2"
                      />
                    </div>

                    {/* API Key */}
                    <div>
                      <label className="label-xs">
                        API Key {editingId && <span className="text-text-muted normal-case font-normal">(leave blank to keep existing)</span>}
                      </label>
                      <div className="relative mt-2">
                        <input
                          type={showKey ? 'text' : 'password'}
                          value={form.api_key}
                          onChange={e => setForm(f => ({ ...f, api_key: e.target.value }))}
                          placeholder={editingId ? '••••••••••••••••' : 'sk-...'}
                          className="field-input pr-10 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(v => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors"
                        >
                          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-text-muted mt-1.5 flex items-center gap-1">
                        <Shield className="w-3 h-3 text-green-400" />
                        Encrypted with AES-256-GCM before storage
                      </p>
                    </div>

                    {/* Max tokens + Temperature */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label-xs">Max Tokens</label>
                        <input
                          type="number"
                          value={form.max_tokens}
                          onChange={e => setForm(f => ({ ...f, max_tokens: Number(e.target.value) }))}
                          className="field-input mt-2"
                        />
                      </div>
                      <div>
                        <label className="label-xs">Temperature</label>
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          max="2"
                          value={form.temperature}
                          onChange={e => setForm(f => ({ ...f, temperature: Number(e.target.value) }))}
                          className="field-input mt-2"
                        />
                      </div>
                    </div>

                    {/* Rate limit + Budget */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label-xs">Rate Limit (rpm)</label>
                        <input
                          type="number"
                          value={form.rate_limit_rpm ?? ''}
                          onChange={e => setForm(f => ({ ...f, rate_limit_rpm: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="Unlimited"
                          className="field-input mt-2"
                        />
                      </div>
                      <div>
                        <label className="label-xs">Monthly Budget ($)</label>
                        <input
                          type="number"
                          value={form.monthly_budget ?? ''}
                          onChange={e => setForm(f => ({ ...f, monthly_budget: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="Unlimited"
                          className="field-input mt-2"
                        />
                      </div>
                    </div>

                    {/* Set as active */}
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <div
                        onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                        className={cn(
                          'w-10 h-5 rounded-full relative transition-colors',
                          form.is_active ? 'bg-accent-gold' : 'bg-white/10'
                        )}
                      >
                        <div className={cn(
                          'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all',
                          form.is_active ? 'left-5' : 'left-0.5'
                        )} />
                      </div>
                      <span className="text-sm text-text-secondary">Set as active provider</span>
                    </label>
                  </div>

                  <div className="flex gap-3 mt-8">
                    <button
                      onClick={() => setShowForm(false)}
                      className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-sm font-bold text-text-secondary transition-all"
                    >
                      Cancel
                    </button>
                    <FloatingButton onClick={handleSave} disabled={saving} className="flex-1">
                      {saving ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : null}
                      {editingId ? 'Update' : 'Add Provider'}
                    </FloatingButton>
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </RoleGuard>
  )
}
