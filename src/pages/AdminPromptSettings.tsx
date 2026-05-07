// src/pages/AdminPromptSettings.tsx
// Admin-only: manage per-module system prompts, version history, and live test.

import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GlassCard } from '@/components/ui/GlassCard'
import { FloatingButton } from '@/components/ui/FloatingButton'
import { CinematicHeading } from '@/components/ui/CinematicHeading'
import { RoleGuard } from '@/components/ui/RoleGuard'
import { useToast } from '@/hooks/use-toast'
import {
  promptService, KNOWN_MODULES,
  type ModulePrompt, type CreatePromptPayload, type PromptVersion
} from '@/services/ai/promptService'
import {
  Plus, Trash2, Edit3, RefreshCw, History, Play, ChevronDown,
  ChevronUp, CheckCircle2, FileText, Zap, X
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ── Empty form ────────────────────────────────────────────────────────────────

const emptyForm = (): CreatePromptPayload => ({
  module_key: KNOWN_MODULES[0].key,
  module_name: KNOWN_MODULES[0].name,
  system_prompt: '',
  is_active: true,
  temperature: null,
  max_tokens: null,
})

// ── Version History Drawer ────────────────────────────────────────────────────

const VersionDrawer: React.FC<{ promptId: string; onClose: () => void }> = ({ promptId, onClose }) => {
  const [versions, setVersions] = useState<PromptVersion[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    promptService.getVersions(promptId)
      .then(setVersions)
      .finally(() => setLoading(false))
  }, [promptId])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 260 }}
        className="w-full max-w-md h-full bg-[#0f0f0f] border-l border-white/10 flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-accent-gold" />
            <h3 className="text-sm font-bold text-white">Version History</h3>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-text-muted hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
            </div>
          ) : versions.length === 0 ? (
            <p className="text-center text-text-muted text-sm py-12">No version history yet.</p>
          ) : versions.map(v => (
            <div key={v.id} className="rounded-xl border border-white/8 bg-white/[0.02] overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === v.id ? null : v.id)}
                className="w-full flex items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 rounded-full bg-accent-gold/10 border border-accent-gold/20 text-[9px] font-black text-accent-gold uppercase tracking-widest">
                    v{v.version}
                  </span>
                  <span className="text-xs text-text-muted">
                    {new Date(v.created_at).toLocaleString()}
                  </span>
                </div>
                {expanded === v.id ? <ChevronUp className="w-3.5 h-3.5 text-text-muted" /> : <ChevronDown className="w-3.5 h-3.5 text-text-muted" />}
              </button>
              <AnimatePresence>
                {expanded === v.id && (
                  <motion.div
                    initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
                    className="overflow-hidden"
                  >
                    <pre className="px-4 pb-4 text-[11px] text-text-secondary whitespace-pre-wrap font-mono leading-relaxed border-t border-white/5 pt-3">
                      {v.system_prompt || <span className="italic text-text-muted">Empty prompt</span>}
                    </pre>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Test Panel ────────────────────────────────────────────────────────────────

const TestPanel: React.FC<{ moduleKey: string; onClose: () => void }> = ({ moduleKey, onClose }) => {
  const [input, setInput] = useState('')
  const [output, setOutput] = useState('')
  const [running, setRunning] = useState(false)
  const { toast } = useToast()

  const run = async () => {
    if (!input.trim()) return
    setRunning(true)
    setOutput('')
    try {
      const result = await promptService.testPrompt(moduleKey, input)
      setOutput(result)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Test Failed', description: e.message })
    } finally {
      setRunning(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-2xl"
      >
        <GlassCard hoverEffect={false} className="bg-background/90">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-accent-gold" />
              <h3 className="text-sm font-bold text-white">Live Test — <span className="text-text-muted font-mono">{moduleKey}</span></h3>
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-text-muted hover:text-white transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="label-xs">User Prompt</label>
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                rows={4}
                placeholder="Enter a test prompt…"
                className="field-input mt-2 resize-none"
              />
            </div>

            <FloatingButton onClick={run} disabled={running || !input.trim()} className="w-full">
              {running ? <RefreshCw className="w-4 h-4 animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
              {running ? 'Running…' : 'Run Test'}
            </FloatingButton>

            {output && (
              <div>
                <label className="label-xs mb-2 block">Response</label>
                <pre className="w-full bg-white/[0.03] border border-white/10 rounded-xl p-4 text-xs text-text-secondary whitespace-pre-wrap font-mono leading-relaxed max-h-64 overflow-y-auto">
                  {output}
                </pre>
              </div>
            )}
          </div>
        </GlassCard>
      </motion.div>
    </motion.div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────

export const AdminPromptSettings = () => {
  const { toast } = useToast()
  const [prompts, setPrompts] = useState<ModulePrompt[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreatePromptPayload>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [testKey, setTestKey] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try { setPrompts(await promptService.list()) }
    catch (e: any) { toast({ variant: 'destructive', title: 'Error', description: e.message }) }
    finally { setLoading(false) }
  }

  const openCreate = () => {
    setEditingId(null)
    setForm(emptyForm())
    setShowForm(true)
  }

  const openEdit = (p: ModulePrompt) => {
    setEditingId(p.id)
    setForm({
      module_key: p.module_key,
      module_name: p.module_name,
      system_prompt: p.system_prompt,
      is_active: p.is_active,
      temperature: p.temperature,
      max_tokens: p.max_tokens,
    })
    setShowForm(true)
  }

  const handleSave = async () => {
    if (!form.module_key || !form.module_name) {
      toast({ variant: 'destructive', title: 'Validation', description: 'Module key and name are required.' })
      return
    }
    setSaving(true)
    try {
      if (editingId) {
        await promptService.update(editingId, {
          system_prompt: form.system_prompt,
          is_active: form.is_active,
          temperature: form.temperature,
          max_tokens: form.max_tokens,
        })
        toast({ title: 'Prompt Updated' })
      } else {
        await promptService.create(form)
        toast({ title: 'Prompt Created' })
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
    if (!confirm('Delete this prompt? This cannot be undone.')) return
    try {
      await promptService.remove(id)
      toast({ title: 'Prompt Deleted' })
      await load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Delete Failed', description: e.message })
    }
  }

  const handleToggleActive = async (p: ModulePrompt) => {
    try {
      await promptService.update(p.id, { is_active: !p.is_active })
      await load()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Update Failed', description: e.message })
    }
  }

  // Modules not yet configured
  const configuredKeys = new Set(prompts.map(p => p.module_key))
  const availableModules = KNOWN_MODULES.filter(m => !configuredKeys.has(m.key))

  return (
    <RoleGuard permission="manage:ai-providers">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="py-12">
        <div className="flex items-start justify-between mb-10">
          <CinematicHeading
            title="Prompt Settings"
            subtitle="Define server-side system prompts per module. These are injected at the Edge Function level — users never see them."
            align="left"
          />
          <FloatingButton onClick={openCreate} className="mt-2 shrink-0">
            <Plus className="w-4 h-4 mr-2" /> New Prompt
          </FloatingButton>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
          </div>
        ) : prompts.length === 0 ? (
          <GlassCard hoverEffect={false} className="flex flex-col items-center justify-center py-24 text-center">
            <FileText className="w-12 h-12 text-text-muted mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Prompts Configured</h3>
            <p className="text-text-secondary mb-6">Create system prompts for each AI module.</p>
            <FloatingButton onClick={openCreate}><Plus className="w-4 h-4 mr-2" /> New Prompt</FloatingButton>
          </GlassCard>
        ) : (
          <div className="space-y-4">
            {prompts.map(p => {
              const isExpanded = expandedId === p.id
              return (
                <GlassCard key={p.id} hoverEffect={false} className="p-0 overflow-hidden">
                  {/* Row */}
                  <div className="flex items-center gap-4 p-5">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-white">{p.module_name}</span>
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-text-muted font-mono">
                          {p.module_key}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-text-muted">
                          v{p.version}
                        </span>
                        {p.is_active ? (
                          <span className="px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-[9px] font-black uppercase tracking-widest text-green-400 flex items-center gap-1">
                            <CheckCircle2 className="w-2.5 h-2.5" /> Active
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[9px] font-black uppercase tracking-widest text-text-muted">
                            Inactive
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted mt-1 truncate max-w-lg">
                        {p.system_prompt ? p.system_prompt.slice(0, 100) + (p.system_prompt.length > 100 ? '…' : '') : <span className="italic">No prompt set</span>}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Toggle active */}
                      <button
                        onClick={() => handleToggleActive(p)}
                        title={p.is_active ? 'Deactivate' : 'Activate'}
                        className={cn('p-2 rounded-lg transition-all text-xs font-bold', p.is_active ? 'text-green-400 hover:bg-green-500/10' : 'text-text-muted hover:bg-white/5 hover:text-white')}
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>

                      {/* Live test */}
                      <button
                        onClick={() => setTestKey(p.module_key)}
                        title="Live test"
                        className="p-2 hover:bg-white/5 rounded-lg text-text-muted hover:text-accent-gold transition-all"
                      >
                        <Play className="w-4 h-4" />
                      </button>

                      {/* Version history */}
                      <button
                        onClick={() => setHistoryId(p.id)}
                        title="Version history"
                        className="p-2 hover:bg-white/5 rounded-lg text-text-muted hover:text-white transition-all"
                      >
                        <History className="w-4 h-4" />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => openEdit(p)}
                        className="p-2 hover:bg-white/5 rounded-lg text-text-muted hover:text-white transition-all"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>

                      {/* Delete */}
                      <button
                        onClick={() => handleDelete(p.id)}
                        className="p-2 hover:bg-red-500/10 rounded-lg text-text-muted hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      {/* Expand */}
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : p.id)}
                        className="p-2 hover:bg-white/5 rounded-lg text-text-muted hover:text-white transition-all"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded: full prompt + overrides */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="px-5 pb-5 border-t border-white/5 pt-4 space-y-4">
                          <div>
                            <p className="label-xs mb-2">System Prompt</p>
                            <pre className="text-xs text-text-secondary whitespace-pre-wrap font-mono leading-relaxed bg-white/[0.02] border border-white/5 rounded-xl p-4 max-h-48 overflow-y-auto">
                              {p.system_prompt || <span className="italic text-text-muted">Empty</span>}
                            </pre>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                              <p className="label-xs mb-1">Temperature Override</p>
                              <p className="text-sm font-bold text-white">{p.temperature ?? <span className="text-text-muted font-normal text-xs">Uses provider default</span>}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                              <p className="label-xs mb-1">Max Tokens Override</p>
                              <p className="text-sm font-bold text-white">{p.max_tokens ?? <span className="text-text-muted font-normal text-xs">Uses provider default</span>}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GlassCard>
              )
            })}
          </div>
        )}

        {/* Create / Edit Modal */}
        <AnimatePresence>
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
              onClick={e => e.target === e.currentTarget && setShowForm(false)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
                className="w-full max-w-2xl max-h-[90vh] overflow-y-auto"
              >
                <GlassCard hoverEffect={false} className="bg-background/90">
                  <h3 className="text-xl font-bold text-white mb-6">
                    {editingId ? 'Edit Prompt' : 'New Module Prompt'}
                  </h3>

                  <div className="space-y-5">
                    {/* Module selection — only for new prompts */}
                    {!editingId && (
                      <div>
                        <label className="label-xs">Module</label>
                        <div className="grid grid-cols-2 gap-2 mt-2 max-h-48 overflow-y-auto pr-1">
                          {(availableModules.length > 0 ? availableModules : KNOWN_MODULES).map(m => (
                            <button
                              key={m.key}
                              onClick={() => setForm(f => ({ ...f, module_key: m.key, module_name: m.name }))}
                              className={cn(
                                'flex flex-col items-start gap-0.5 p-3 rounded-xl border text-left transition-all',
                                form.module_key === m.key
                                  ? 'bg-accent-gold/10 border-accent-gold text-accent-gold'
                                  : 'bg-white/5 border-white/10 text-text-muted hover:border-white/20'
                              )}
                            >
                              <span className="text-xs font-bold">{m.name}</span>
                              <span className="text-[10px] font-mono opacity-60">{m.key}</span>
                            </button>
                          ))}
                        </div>
                        {availableModules.length === 0 && (
                          <p className="text-[10px] text-text-muted mt-1.5">All known modules already have prompts. You can still create an additional one.</p>
                        )}
                      </div>
                    )}

                    {/* System Prompt */}
                    <div>
                      <label className="label-xs">System Prompt</label>
                      <textarea
                        value={form.system_prompt}
                        onChange={e => setForm(f => ({ ...f, system_prompt: e.target.value }))}
                        rows={8}
                        placeholder="You are a…"
                        className="field-input mt-2 resize-y font-mono text-xs leading-relaxed"
                      />
                    </div>

                    {/* Overrides */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="label-xs">Temperature Override</label>
                        <input
                          type="number" step="0.1" min="0" max="2"
                          value={form.temperature ?? ''}
                          onChange={e => setForm(f => ({ ...f, temperature: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="Provider default"
                          className="field-input mt-2"
                        />
                      </div>
                      <div>
                        <label className="label-xs">Max Tokens Override</label>
                        <input
                          type="number"
                          value={form.max_tokens ?? ''}
                          onChange={e => setForm(f => ({ ...f, max_tokens: e.target.value ? Number(e.target.value) : null }))}
                          placeholder="Provider default"
                          className="field-input mt-2"
                        />
                      </div>
                    </div>

                    {/* Active toggle */}
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <div
                        onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
                        className={cn('w-10 h-5 rounded-full relative transition-colors', form.is_active ? 'bg-accent-gold' : 'bg-white/10')}
                      >
                        <div className={cn('absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all', form.is_active ? 'left-5' : 'left-0.5')} />
                      </div>
                      <span className="text-sm text-text-secondary">Set as active prompt for this module</span>
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
                      {saving && <RefreshCw className="w-4 h-4 animate-spin mr-2" />}
                      {editingId ? 'Update Prompt' : 'Create Prompt'}
                    </FloatingButton>
                  </div>
                </GlassCard>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Version History Drawer */}
        <AnimatePresence>
          {historyId && <VersionDrawer promptId={historyId} onClose={() => setHistoryId(null)} />}
        </AnimatePresence>

        {/* Live Test Modal */}
        <AnimatePresence>
          {testKey && <TestPanel moduleKey={testKey} onClose={() => setTestKey(null)} />}
        </AnimatePresence>
      </motion.div>
    </RoleGuard>
  )
}
