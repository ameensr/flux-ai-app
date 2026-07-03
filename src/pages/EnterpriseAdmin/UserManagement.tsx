// src/pages/EnterpriseAdmin/UserManagement.tsx
import React, { useEffect, useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import {
  Users, Search, RefreshCw, MoreVertical, Eye, Edit2,
  KeyRound, UserCog, UserX, Trash2, UserCheck, ChevronUp, ChevronDown, Clock, Save, X,
} from 'lucide-react'
import type { EnterpriseUser, EnterpriseRole, Department, Plan, UserStatus } from './types'
import { STATUS_CONFIG, PLAN_CONFIG } from './types'

type SortKey = 'full_name' | 'email' | 'role' | 'status' | 'created_at' | 'last_login_at'
type SortDir = 'asc' | 'desc'

function Avatar({ user }: { user: EnterpriseUser }) {
  const initials = (user.full_name || user.email).slice(0, 2).toUpperCase()
  return (
    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent-gold/20 to-accent-gold/5 border border-accent-gold/20 flex items-center justify-center shrink-0 text-xs font-bold text-accent-gold">
      {initials}
    </div>
  )
}

function StatusBadge({ status }: { status: UserStatus }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.inactive
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest', cfg.color)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  )
}

function ActionMenu({ user, onAction }: { user: EnterpriseUser; onAction: (action: string, user: EnterpriseUser) => void }) {
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const buttonRef = React.useRef<HTMLButtonElement>(null)

  const actions = [
    { id: 'change_role', label: 'Change Role', icon: UserCog },
    { id: 'reset_password', label: 'Reset Password', icon: KeyRound },
    { id: 'change_status', label: user.status === 'active' ? 'Disable User' : 'Enable User', icon: user.status === 'active' ? UserX : UserCheck },
    { id: 'delete', label: 'Delete User', icon: Trash2, danger: true },
  ]

  const handleOpen = () => {
    // Check if there's enough space below (dropdown is ~160px tall)
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      setDropUp(spaceBelow < 180)
    }
    setOpen(v => !v)
  }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-white transition-all"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: dropUp ? 4 : -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: dropUp ? 4 : -4 }}
              transition={{ duration: 0.15 }}
              className={cn(
                "absolute right-0 z-50 w-48 py-1 rounded-xl border shadow-2xl",
                dropUp ? 'bottom-10' : 'top-10'
              )}
              style={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)' }}
            >
              {actions.map(a => (
                <button
                  key={a.id}
                  onClick={() => { setOpen(false); onAction(a.id, user) }}
                  className={cn(
                    'flex items-center gap-2.5 w-full px-4 py-2.5 text-xs font-medium transition-colors hover:bg-white/5',
                    (a as any).danger ? 'text-red-400 hover:text-red-300' : 'text-text-secondary hover:text-white'
                  )}
                >
                  <a.icon className="w-3.5 h-3.5" />
                  {a.label}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

// ── Change Role Modal ─────────────────────────────────────────────────────────
function ChangeRoleModal({
  user,
  roles,
  onClose,
  onSaved,
}: {
  user: EnterpriseUser
  roles: EnterpriseRole[]
  onClose: () => void
  onSaved: (userId: string, newRole: string) => void
}) {
  const { toast } = useToast()
  const [selectedRole, setSelectedRole] = useState(user.role)
  const [saving, setSaving] = useState(false)

  const sortedRoles = [...roles].sort((a, b) => a.priority - b.priority)

  const handleSave = async () => {
    if (selectedRole === user.role) { onClose(); return }
    setSaving(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('id', user.id)
      if (error) throw error
      toast({ title: 'Role Updated', description: `${user.full_name || user.email} → ${selectedRole}` })
      onSaved(user.id, selectedRole)
      onClose()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to update role', description: e.message })
    } finally {
      setSaving(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--overlay)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 16 }}
        transition={{ duration: 0.2 }}
        onClick={e => e.stopPropagation()}
        className="glass-panel p-6 w-full max-w-sm"
        style={{ backgroundColor: 'var(--surface-elevated)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="text-base font-bold text-white">Change Role</h3>
            <p className="text-xs text-text-muted mt-0.5">{user.full_name || user.email}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-white transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current role */}
        <div className="mb-4 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
          <span className="text-xs text-text-muted">Current role</span>
          <span className="text-xs font-bold text-white capitalize">{user.role}</span>
        </div>

        {/* Role list */}
        <div className="space-y-2 mb-5 max-h-64 overflow-y-auto pr-1">
          {sortedRoles.map(role => {
            const isSelected = selectedRole === role.role_key
            const isCurrent = user.role === role.role_key
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.role_key)}
                className={cn(
                  'w-full flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all duration-200',
                  isSelected
                    ? 'border-accent-gold/40 bg-accent-gold/8 ring-1 ring-accent-gold/30'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/10 hover:bg-white/[0.04]'
                )}
              >
                <div className="min-w-0">
                  <p className={cn('text-sm font-semibold truncate', isSelected ? 'text-accent-gold' : 'text-white')}>
                    {role.role_name}
                  </p>
                  {role.description && (
                    <p className="text-[10px] text-text-muted mt-0.5 truncate">{role.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-3">
                  {isCurrent && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-text-muted uppercase tracking-widest">
                      Current
                    </span>
                  )}
                  {isSelected && (
                    <div className="w-4 h-4 rounded-full bg-accent-gold flex items-center justify-center">
                      <UserCheck className="w-2.5 h-2.5 text-background" />
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-white/10 text-text-muted hover:text-white text-sm font-bold transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || selectedRole === user.role}
            className="flex-1 py-2.5 rounded-xl bg-accent-gold text-background text-sm font-bold hover:opacity-90 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
          >
            {saving
              ? <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
              : <Save className="w-4 h-4" />
            }
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Main Component ────────────────────────────────────────────────────────────
export function UserManagement() {
  const { toast } = useToast()
  const [users, setUsers] = useState<EnterpriseUser[]>([])
  const [roles, setRoles] = useState<EnterpriseRole[]>([])
  const [departments, setDepartments] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterDept, setFilterDept] = useState('')
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [page, setPage] = useState(0)
  const PAGE_SIZE = 10

  // Change role modal state
  const [roleModalUser, setRoleModalUser] = useState<EnterpriseUser | null>(null)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [{ data: usersData }, { data: rolesData }, { data: deptsData }] = await Promise.all([
        supabase.from('profiles').select(`
          id, email, full_name, employee_id, avatar_url, role, status,
          last_login_at, created_at, department_id, plan_id,
          departments(name), plans(plan_name)
        `).order('created_at', { ascending: false }),
        supabase.from('roles').select('*').order('priority'),
        supabase.from('departments').select('*').order('name'),
      ])

      // Enrich last_login_at with real data from login_events
      const userIds = (usersData ?? []).map((u: any) => u.id)
      let lastLogins: Record<string, string> = {}
      if (userIds.length > 0) {
        const { data: loginData } = await supabase
          .from('login_events')
          .select('user_id, created_at')
          .in('user_id', userIds)
          .eq('event_type', 'sign_in')
          .order('created_at', { ascending: false })
        if (loginData) {
          for (const row of loginData as { user_id: string; created_at: string }[]) {
            if (!lastLogins[row.user_id]) lastLogins[row.user_id] = row.created_at
          }
        }
      }

      setUsers((usersData ?? []).map((u: any) => ({
        ...u,
        last_login_at: lastLogins[u.id] || u.last_login_at || null,
        department_name: u.departments?.name ?? null,
        plan_name: u.plans?.plan_name ?? null,
      })))
      setRoles(rolesData ?? [])
      setDepartments(deptsData ?? [])
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to load users', description: e.message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchAll() }, [fetchAll])

  const handleAction = async (action: string, user: EnterpriseUser) => {
    if (action === 'change_role') {
      setRoleModalUser(user)
    } else if (action === 'change_status') {
      const newStatus: UserStatus = user.status === 'active' ? 'inactive' : 'active'
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ status: newStatus })
          .eq('id', user.id)
        if (error) throw error
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, status: newStatus } : u))
        toast({ title: 'Status Updated', description: `${user.full_name || user.email} is now ${newStatus}.` })
      } catch (e: any) {
        toast({ variant: 'destructive', title: 'Failed', description: e.message })
      }
    } else if (action === 'delete') {
      if (!confirm(`Delete ${user.full_name || user.email}? This cannot be undone.`)) return
      const { error } = await supabase.from('profiles').delete().eq('id', user.id)
      if (error) { toast({ variant: 'destructive', title: 'Failed', description: error.message }); return }
      setUsers(prev => prev.filter(u => u.id !== user.id))
      toast({ title: 'User Deleted' })
    } else if (action === 'reset_password') {
      const { error } = await supabase.auth.resetPasswordForEmail(user.email)
      if (error) { toast({ variant: 'destructive', title: 'Failed', description: error.message }); return }
      toast({ title: 'Password Reset Email Sent', description: user.email })
    }
  }

  const handleRoleSaved = (userId: string, newRole: string) => {
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
    setPage(0)
  }

  const uniqueRoles = useMemo(() => [...new Set(users.map(u => u.role))].sort(), [users])

  const filtered = useMemo(() => {
    let list = [...users]
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(u =>
        (u.full_name ?? '').toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.employee_id ?? '').toLowerCase().includes(q)
      )
    }
    if (filterRole) list = list.filter(u => u.role === filterRole)
    if (filterStatus) list = list.filter(u => u.status === filterStatus)
    if (filterDept) list = list.filter(u => u.department_id === filterDept)
    list.sort((a, b) => {
      const av = (a as any)[sortKey] ?? ''
      const bv = (b as any)[sortKey] ?? ''
      return sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av))
    })
    return list
  }, [users, search, filterRole, filterStatus, filterDept, sortKey, sortDir])

  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)

  const SortIcon = ({ k }: { k: SortKey }) => sortKey === k
    ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
    : <ChevronUp className="w-3 h-3 opacity-20" />

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.status === 'active').length,
    suspended: users.filter(u => u.status === 'suspended').length,
    pending: users.filter(u => u.status === 'pending').length,
  }), [users])

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Users', value: stats.total, icon: Users, color: 'text-white' },
          { label: 'Active', value: stats.active, icon: UserCheck, color: 'text-emerald-400' },
          { label: 'Suspended', value: stats.suspended, icon: UserX, color: 'text-red-400' },
          { label: 'Pending', value: stats.pending, icon: Clock, color: 'text-yellow-400' },
        ].map(s => (
          <GlassCard key={s.label} hoverEffect={false} className="py-5 flex flex-col items-center gap-2">
            <s.icon className={cn('w-5 h-5', s.color)} />
            <span className="text-2xl font-bold text-white">{s.value}</span>
            <span className="text-[10px] uppercase tracking-widest text-text-muted">{s.label}</span>
          </GlassCard>
        ))}
      </div>

      <GlassCard hoverEffect={false}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="w-5 h-5 text-accent-gold" /> All Users
          </h3>
          <button onClick={fetchAll} className="p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-white transition-all self-end sm:self-auto">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(0) }}
              placeholder="Search name, email, ID…"
              className="field-input pl-9 h-10 text-sm"
            />
          </div>
          <select value={filterRole} onChange={e => { setFilterRole(e.target.value); setPage(0) }} className="field-input h-10 text-sm w-36">
            <option value="">All Roles</option>
            {uniqueRoles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(0) }} className="field-input h-10 text-sm w-36">
            <option value="">All Status</option>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <select value={filterDept} onChange={e => { setFilterDept(e.target.value); setPage(0) }} className="field-input h-10 text-sm w-40">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-24">
            <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto -mx-6 px-6">
              <table className="w-full text-sm min-w-[800px]">
                <thead>
                  <tr className="border-b border-white/5">
                    {[
                      { key: 'full_name' as SortKey, label: 'User' },
                      { key: 'role' as SortKey, label: 'Role' },
                      { key: 'status' as SortKey, label: 'Status' },
                    ].map(col => (
                      <th key={col.key} className="text-left py-3 pr-4 text-text-muted font-semibold text-[10px] uppercase tracking-widest">
                        <button onClick={() => handleSort(col.key)} className="flex items-center gap-1 hover:text-white transition-colors">
                          {col.label} <SortIcon k={col.key} />
                        </button>
                      </th>
                    ))}
                    <th className="text-left py-3 pr-4 text-text-muted font-semibold text-[10px] uppercase tracking-widest">Department</th>
                    <th className="text-left py-3 pr-4 text-text-muted font-semibold text-[10px] uppercase tracking-widest">Plan</th>
                    <th className="text-left py-3 pr-4 text-text-muted font-semibold text-[10px] uppercase tracking-widest">
                      <button onClick={() => handleSort('last_login_at')} className="flex items-center gap-1 hover:text-white transition-colors">
                        Last Login <SortIcon k="last_login_at" />
                      </button>
                    </th>
                    <th className="text-right py-3 text-text-muted font-semibold text-[10px] uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {paginated.length === 0 ? (
                    <tr><td colSpan={7} className="text-center py-16 text-text-muted">No users found</td></tr>
                  ) : paginated.map((user, i) => (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="group hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <Avatar user={user} />
                          <div className="min-w-0">
                            <p className="text-white font-semibold truncate">{user.full_name || '—'}</p>
                            <p className="text-text-muted text-xs truncate">{user.email}</p>
                            {user.employee_id && <p className="text-text-muted text-[10px]">#{user.employee_id}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        {/* Inline role badge — click to open change role modal */}
                        <button
                          onClick={() => setRoleModalUser(user)}
                          className="group/role flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 hover:border-accent-gold/40 hover:bg-accent-gold/5 transition-all"
                          title="Click to change role"
                        >
                          <span className="text-xs font-bold text-white capitalize group-hover/role:text-accent-gold transition-colors">
                            {user.role}
                          </span>
                          <UserCog className="w-3 h-3 text-text-muted group-hover/role:text-accent-gold transition-colors" />
                        </button>
                      </td>
                      <td className="py-4 pr-4"><StatusBadge status={user.status} /></td>
                      <td className="py-4 pr-4 text-text-secondary text-xs">{user.department_name || '—'}</td>
                      <td className="py-4 pr-4">
                        {user.plan_name ? (
                          <span className={cn('px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-widest', PLAN_CONFIG[user.plan_name.toLowerCase()]?.color ?? 'text-text-muted bg-white/5 border-white/10')}>
                            {user.plan_name}
                          </span>
                        ) : <span className="text-text-muted text-xs">—</span>}
                      </td>
                      <td className="py-4 pr-4 text-text-muted text-xs">
                        {user.last_login_at
                          ? new Date(user.last_login_at).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
                          : 'Never'}
                      </td>
                      <td className="py-4 text-right">
                        <ActionMenu user={user} onAction={handleAction} />
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-white/5">
                <span className="text-xs text-text-muted">
                  {filtered.length} users · Page {page + 1} of {totalPages}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-text-muted hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold border border-white/10 text-text-muted hover:text-white hover:border-white/20 disabled:opacity-30 transition-all"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </GlassCard>

      {/* Change Role Modal */}
      <AnimatePresence>
        {roleModalUser && (
          <ChangeRoleModal
            user={roleModalUser}
            roles={roles}
            onClose={() => setRoleModalUser(null)}
            onSaved={handleRoleSaved}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
