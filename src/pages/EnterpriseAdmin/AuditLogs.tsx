// src/pages/EnterpriseAdmin/AuditLogs.tsx
import React, { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { Activity, RefreshCw, Search, ChevronRight, ChevronLeft } from 'lucide-react'
import type { AuditLog } from './types'

const ACTION_COLORS: Record<string, string> = {
  permission_changed: 'text-accent-gold bg-accent-gold/10 border-accent-gold/20',
  role_created:       'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  role_deleted:       'text-red-400 bg-red-500/10 border-red-500/20',
  user_status_changed:'text-blue-400 bg-blue-500/10 border-blue-500/20',
  user_deleted:       'text-red-400 bg-red-500/10 border-red-500/20',
  template_applied:   'text-purple-400 bg-purple-500/10 border-purple-500/20',
  login:              'text-white/50 bg-white/5 border-white/10',
}

function ActionBadge({ action }: { action: string }) {
  const color = ACTION_COLORS[action] ?? 'text-text-muted bg-white/5 border-white/10'
  return (
    <span className={cn('px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest whitespace-nowrap', color)}>
      {action.replace(/_/g, ' ')}
    </span>
  )
}

function ValueDiff({ old: oldVal, next: newVal }: { old: any; next: any }) {
  if (!oldVal && !newVal) return <span className="text-text-muted text-xs">—</span>
  const fmt = (v: any) => typeof v === 'object' ? JSON.stringify(v) : String(v ?? '—')
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="text-red-400 line-through opacity-70">{fmt(oldVal)}</span>
      <ChevronRight className="w-3 h-3 text-text-muted shrink-0" />
      <span className="text-emerald-400">{fmt(newVal)}</span>
    </div>
  )
}

export function AuditLogs() {
  const { toast } = useToast()
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 20

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500)
      if (error) throw error
      setLogs(data ?? [])
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to load audit logs', description: e.message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const filtered = logs.filter(l => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      (l.actor_email ?? '').toLowerCase().includes(q) ||
      l.action.toLowerCase().includes(q) ||
      (l.module ?? '').toLowerCase().includes(q) ||
      (l.target_type ?? '').toLowerCase().includes(q)
    )
  })

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <GlassCard hoverEffect={false}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-accent-gold" />
            <h3 className="text-lg font-bold text-white">Audit Logs</h3>
            <span className="text-xs text-text-muted ml-1">({filtered.length} entries)</span>
          </div>
          <button onClick={fetchLogs} className="p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-white transition-all self-end sm:self-auto">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search by actor, action, module…"
            className="field-input pl-9 h-10 text-sm"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {logs.length === 0 ? (
              <div className="text-center py-20">
                <Activity className="w-10 h-10 text-text-muted mx-auto mb-3 opacity-30" />
                <p className="text-text-muted text-sm">No audit logs yet.</p>
                <p className="text-text-muted text-xs mt-1">Actions will appear here as they occur.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full text-sm min-w-[700px]">
                  <thead>
                    <tr className="border-b border-white/5">
                      {['Timestamp', 'Actor', 'Action', 'Module', 'Change'].map(h => (
                        <th key={h} className="text-left py-3 pr-4 text-text-muted font-semibold text-[10px] uppercase tracking-widest">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03]">
                    {paginated.map((log, i) => (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="py-3.5 pr-4 text-text-muted text-xs whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-3.5 pr-4">
                          <span className="text-white text-xs font-medium">{log.actor_email || 'System'}</span>
                        </td>
                        <td className="py-3.5 pr-4">
                          <ActionBadge action={log.action} />
                        </td>
                        <td className="py-3.5 pr-4 text-text-secondary text-xs">
                          {log.module || log.target_type || '—'}
                        </td>
                        <td className="py-3.5">
                          <ValueDiff old={log.old_value} next={log.new_value} />
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                <span className="text-xs text-text-muted">
                  {filtered.length} entries · Page {page + 1} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-2 rounded-lg border border-white/10 text-text-muted hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-2 rounded-lg border border-white/10 text-text-muted hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </GlassCard>
    </motion.div>
  )
}
