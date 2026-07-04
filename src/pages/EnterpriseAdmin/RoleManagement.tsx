// src/pages/EnterpriseAdmin/RoleManagement.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { invalidatePermissionCache } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import {
  Shield, Plus, Copy, Edit2, Trash2, ChevronDown, ChevronRight,
  Check, X, RefreshCw, Save, Users, ArrowDown, Search, UserCircle,
} from 'lucide-react'
import type { EnterpriseRole, ModuleRow, PermRow, RMPRow } from './types'
import { PERM_LABELS, STATUS_CONFIG } from './types'

interface MatrixData {
  roles: EnterpriseRole[]
  modules: ModuleRow[]
  permissions: PermRow[]
  matrix: RMPRow[]
}

// ── Assigned Users Modal ──────────────────────────────────────────────────────

interface AssignedUser {
  id: string
  email: string
  full_name: string | null
  employee_id: string | null
  status: string
  department_name: string | null
  last_login_at: string | null
  created_at: string
}

function AssignedUsersModal({
  role,
  userCount,
  onClose,
}: {
  role: EnterpriseRole
  userCount: number
  onClose: () => void
}) {
  const [users, setUsers] = useState<AssignedUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const modalRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Fetch users assigned to this role
  useEffect(() => {
    const fetchUsers = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('profiles')
        .select('id, email, full_name, employee_id, status, department_id, last_login_at, created_at, departments(name)')
        .eq('role', role.role_key)
        .order('full_name')
      setUsers(
        (data ?? []).map((u: any) => ({
          ...u,
          department_name: u.departments?.name ?? null,
        }))
      )
      setLoading(false)
    }
    fetchUsers()
  }, [role.role_key])

  // Focus search on open
  useEffect(() => {
    const timer = setTimeout(() => searchRef.current?.focus(), 150)
    return () => clearTimeout(timer)
  }, [])

  // Keyboard: Escape to close, Tab trapping
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'Tab' && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll<HTMLElement>(
          'button, input, [tabindex]:not([tabindex="-1"])'
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault(); last.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first.focus()
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Filter
  const filtered = search.trim()
    ? users.filter(u => {
      const q = search.toLowerCase()
      return (u.full_name ?? '').toLowerCase().includes(q)
        || u.email.toLowerCase().includes(q)
        || (u.employee_id ?? '').toLowerCase().includes(q)
    })
    : users

  const formatDate = (iso: string | null) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--overlay)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="assigned-users-title"
    >
      <motion.div
        ref={modalRef}
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg max-h-[80vh] flex flex-col rounded-3xl border overflow-hidden"
        style={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)' }}
      >
        {/* Sticky Header */}
        <div className="shrink-0 px-6 pt-6 pb-4" style={{ borderBottom: '1px solid var(--divider)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'rgba(99,102,241,0.1)' }}>
                <Users className="w-4.5 h-4.5" style={{ color: 'var(--accent)' }} />
              </div>
              <div>
                <h3 id="assigned-users-title" className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {role.role_name}
                </h3>
                <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                  {userCount} user{userCount !== 1 ? 's' : ''} assigned
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl transition-all"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hover)'; e.currentTarget.style.color = 'var(--text-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            <input
              ref={searchRef}
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, or ID…"
              className="field-input pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-5 h-5 border-2 rounded-full animate-spin" style={{ borderColor: 'var(--border)', borderTopColor: 'var(--accent)' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'var(--hover)' }}>
                <UserCircle className="w-7 h-7" style={{ color: 'var(--text-muted)' }} />
              </div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                {search ? 'No matching users' : 'No users assigned'}
              </p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {search
                  ? 'Try a different search term.'
                  : 'No users are currently assigned to this role.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((user) => {
                const initials = (user.full_name || user.email).slice(0, 2).toUpperCase()
                const statusCfg = STATUS_CONFIG[user.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.inactive
                return (
                  <div
                    key={user.id}
                    className="flex items-center gap-3 p-3 rounded-xl transition-colors"
                    style={{ border: '1px solid var(--border)' }}
                    onMouseEnter={e => { e.currentTarget.style.backgroundColor = 'var(--hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent' }}
                  >
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold"
                      style={{ background: 'rgba(99,102,241,0.1)', color: 'var(--accent)' }}
                    >
                      {initials}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                          {user.full_name || '—'}
                        </span>
                        {user.employee_id && (
                          <span className="text-[10px] shrink-0" style={{ color: 'var(--text-muted)' }}>
                            #{user.employee_id}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>
                        {user.email}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {user.department_name && (
                          <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                            {user.department_name}
                          </span>
                        )}
                        <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                          Joined {formatDate(user.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Status */}
                    <span className={cn('shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[9px] font-bold uppercase tracking-widest', statusCfg.color)}>
                      <span className={cn('w-1.5 h-1.5 rounded-full', statusCfg.dot)} />
                      {statusCfg.label}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Role Card ─────────────────────────────────────────────────────────────────

function RoleCard({
  role, isSelected, userCount, onSelect, onDuplicate, onDelete, onViewUsers,
}: {
  role: EnterpriseRole
  isSelected: boolean
  userCount: number
  onSelect: () => void
  onDuplicate: () => void
  onDelete: () => void
  onViewUsers: () => void
}) {
  const priorityColor =
    role.priority <= 10 ? 'text-red-400 border-red-500/30 bg-red-500/10' :
      role.priority <= 30 ? 'text-orange-400 border-orange-500/30 bg-orange-500/10' :
        role.priority <= 50 ? 'text-accent-gold border-accent-gold/30 bg-accent-gold/10' :
          'text-text-muted border-white/10 bg-white/5'

  return (
    <motion.div
      whileHover={{ y: -2 }}
      onClick={onSelect}
      className={cn(
        'p-4 rounded-2xl border cursor-pointer transition-all duration-300',
        isSelected
          ? 'border-accent-gold/40 bg-accent-gold/5'
          : 'border-white/5 bg-white/[0.02] hover:border-white/10'
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Shield className={cn('w-4 h-4 shrink-0', isSelected ? 'text-accent-gold' : 'text-text-muted')} />
          <span className="font-bold text-white text-sm truncate">{role.role_name}</span>
          {role.is_system && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-text-muted uppercase tracking-widest shrink-0">System</span>
          )}
        </div>
        <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={onDuplicate} className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-white transition-all" title="Duplicate">
            <Copy className="w-3 h-3" />
          </button>
          {!role.is_system && (
            <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-500/10 text-text-muted hover:text-red-400 transition-all" title="Delete">
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
      <p className="text-text-muted text-xs mb-3 line-clamp-2">{role.description || 'No description'}</p>
      <div className="flex items-center justify-between">
        <span className={cn('text-[10px] px-2 py-0.5 rounded-full border font-bold uppercase tracking-widest', priorityColor)}>
          P{role.priority}
        </span>
        <button
          onClick={e => { e.stopPropagation(); onViewUsers() }}
          className="text-[10px] text-text-muted flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-accent/10 hover:text-accent transition-all"
          title={`View ${userCount} assigned user${userCount !== 1 ? 's' : ''}`}
        >
          <Users className="w-3 h-3" /> {userCount}
        </button>
      </div>
    </motion.div>
  )
}

function PermissionCard({
  module, permissions, roleId, localState, saving, isAdmin, onToggle,
}: {
  module: ModuleRow
  permissions: PermRow[]
  roleId: string
  localState: Record<string, boolean>
  saving: string | null
  isAdmin: boolean
  onToggle: (moduleId: string, permId: string) => void
}) {
  const [expanded, setExpanded] = useState(true)
  const enabledCount = permissions.filter(p => localState[`${roleId}:${module.id}:${p.id}`]).length

  return (
    <div className="rounded-2xl border border-white/5 bg-white/[0.02] overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
          <span className="font-semibold text-white text-sm">{module.module_name}</span>
          <span className="text-[10px] text-text-muted">{module.module_key}</span>
        </div>
        <span className={cn(
          'text-[10px] px-2 py-0.5 rounded-full font-bold',
          enabledCount > 0 ? 'bg-accent-gold/10 text-accent-gold' : 'bg-white/5 text-text-muted'
        )}>
          {enabledCount}/{permissions.length}
        </span>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 flex flex-wrap gap-3 border-t border-white/5 pt-4">
              {permissions.map(perm => {
                const key = `${roleId}:${module.id}:${perm.id}`
                const enabled = localState[key] ?? false
                const isSaving = saving === key
                return (
                  <button
                    key={perm.id}
                    onClick={() => !isAdmin && onToggle(module.id, perm.id)}
                    disabled={isSaving || isAdmin}
                    title={isAdmin ? 'Admin always has full access' : `${enabled ? 'Disable' : 'Enable'} ${perm.permission_name}`}
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all duration-200',
                      enabled
                        ? isAdmin
                          ? 'bg-accent-gold/20 border-accent-gold/30 text-accent-gold cursor-not-allowed'
                          : 'bg-accent-gold/15 border-accent-gold/40 text-accent-gold hover:bg-accent-gold/25'
                        : 'bg-white/[0.02] border-white/5 text-text-muted hover:border-white/15 hover:text-white',
                      isSaving && 'opacity-50 cursor-wait'
                    )}
                  >
                    {enabled
                      ? <Check className="w-3 h-3" />
                      : <X className="w-3 h-3" />
                    }
                    {PERM_LABELS[perm.permission_key] ?? perm.permission_name}
                  </button>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function RoleManagement() {
  const { toast } = useToast()
  const [data, setData] = useState<MatrixData | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [localState, setLocalState] = useState<Record<string, boolean>>({})
  const [userCounts, setUserCounts] = useState<Record<string, number>>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewUsersRole, setViewUsersRole] = useState<EnterpriseRole | null>(null)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchMatrix = useCallback(async () => {
    setLoading(true)
    try {
      const [rolesRes, modulesRes, permsRes, rmpRes, profilesRes] = await Promise.all([
        supabase.from('roles').select('*').order('priority'),
        supabase.from('modules').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('permissions').select('*').order('permission_key'),
        supabase.from('role_module_permissions').select('*'),
        supabase.from('profiles').select('role'),
      ])

      if (rolesRes.error) throw rolesRes.error
      if (modulesRes.error) throw modulesRes.error
      if (permsRes.error) throw permsRes.error

      // Enrich roles with inherits_from_name
      const rawRoles: EnterpriseRole[] = (rolesRes.data ?? []).map(r => ({
        ...r,
        inherits_from_name: r.inherits_from
          ? (rolesRes.data ?? []).find((x: any) => x.id === r.inherits_from)?.role_name ?? null
          : null,
      }))

      const json: MatrixData = {
        roles: rawRoles,
        modules: modulesRes.data ?? [],
        permissions: permsRes.data ?? [],
        matrix: rmpRes.data ?? [],
      }
      setData(json)

      const init: Record<string, boolean> = {}
      for (const row of json.matrix) {
        init[`${row.role_id}:${row.module_id}:${row.permission_id}`] = row.is_enabled
      }
      setLocalState(init)
      setSelectedRoleId(prev => prev ?? (json.roles[0]?.id ?? null))

      const counts: Record<string, number> = {}
      for (const r of json.roles) counts[r.id] = 0
      for (const p of (profilesRes.data ?? [])) {
        const role = json.roles.find(r => r.role_key === p.role)
        if (role) counts[role.id] = (counts[role.id] ?? 0) + 1
      }
      setUserCounts(counts)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to load', description: e.message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchMatrix() }, [fetchMatrix])

  const toggle = async (moduleId: string, permId: string) => {
    if (!selectedRoleId) return
    const key = `${selectedRoleId}:${moduleId}:${permId}`
    const current = localState[key] ?? false
    const next = !current
    setLocalState(prev => ({ ...prev, [key]: next }))
    setSaving(key)
    try {
      const { error } = await supabase
        .from('role_module_permissions')
        .upsert(
          { role_id: selectedRoleId, module_id: moduleId, permission_id: permId, is_enabled: next },
          { onConflict: 'role_id,module_id,permission_id' }
        )
      if (error) throw error
      const role = data?.roles.find(r => r.id === selectedRoleId)
      if (role) invalidatePermissionCache(role.role_key)
    } catch {
      setLocalState(prev => ({ ...prev, [key]: current }))
      toast({ variant: 'destructive', title: 'Failed to update permission' })
    } finally {
      setSaving(null)
    }
  }

  const handleDuplicate = async (role: EnterpriseRole) => {
    const newKey = `${role.role_key}_copy_${Date.now()}`
    const { error } = await supabase.from('roles').insert({
      role_key: newKey,
      role_name: `${role.role_name} (Copy)`,
      description: role.description,
      priority: role.priority + 1,
      is_system: false,
    })
    if (error) { toast({ variant: 'destructive', title: 'Failed', description: error.message }); return }
    toast({ title: 'Role Duplicated' })
    fetchMatrix()
  }

  const handleDelete = async (role: EnterpriseRole) => {
    if (role.is_system) { toast({ variant: 'destructive', title: 'Cannot delete system roles' }); return }
    if ((userCounts[role.id] ?? 0) > 0) {
      toast({ variant: 'destructive', title: 'Role has users', description: 'Reassign users before deleting.' }); return
    }
    if (!confirm(`Delete role "${role.role_name}"?`)) return
    const { error } = await supabase.from('roles').delete().eq('id', role.id)
    if (error) { toast({ variant: 'destructive', title: 'Failed', description: error.message }); return }
    toast({ title: 'Role Deleted' })
    fetchMatrix()
  }

  const handleCreate = async () => {
    if (!newRoleName.trim()) return
    setCreating(true)
    const key = newRoleName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const { error } = await supabase.from('roles').insert({
      role_key: key,
      role_name: newRoleName.trim(),
      description: newRoleDesc.trim() || null,
      priority: 50,
      is_system: false,
    })
    setCreating(false)
    if (error) { toast({ variant: 'destructive', title: 'Failed', description: error.message }); return }
    toast({ title: 'Role Created' })
    setShowCreateModal(false)
    setNewRoleName('')
    setNewRoleDesc('')
    fetchMatrix()
  }

  const activeRole = data?.roles.find(r => r.id === selectedRoleId)
  const isAdminRole = activeRole?.role_key === 'admin' || activeRole?.role_key === 'super_admin'

  // Sort roles by priority
  const sortedRoles = [...(data?.roles ?? [])].sort((a, b) => a.priority - b.priority)

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          {/* Role list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-white uppercase tracking-widest">Roles</h3>
              <div className="flex gap-2">
                <button onClick={fetchMatrix} className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-white transition-all">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-gold text-background text-xs font-bold hover:opacity-90 transition-opacity"
                >
                  <Plus className="w-3.5 h-3.5" /> New Role
                </button>
              </div>
            </div>

            {/* Hierarchy visual */}
            <div className="space-y-1">
              {sortedRoles.map((role, i) => {
                const parent = sortedRoles.find(r => r.id === role.inherits_from)
                return (
                  <div key={role.id}>
                    {parent && i > 0 && (
                      <div className="flex items-center gap-2 pl-4 py-0.5">
                        <ArrowDown className="w-3 h-3 text-white/10" />
                      </div>
                    )}
                    <RoleCard
                      role={role}
                      isSelected={selectedRoleId === role.id}
                      userCount={userCounts[role.id] ?? 0}
                      onSelect={() => setSelectedRoleId(role.id)}
                      onDuplicate={() => handleDuplicate(role)}
                      onDelete={() => handleDelete(role)}
                      onViewUsers={() => setViewUsersRole(role)}
                    />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Permission cards */}
          {activeRole && data && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Shield className="w-4 h-4 text-accent-gold" />
                    {activeRole.role_name}
                  </h3>
                  <p className="text-xs text-text-muted mt-0.5">{activeRole.description}</p>
                  {activeRole.inherits_from_name && (
                    <p className="text-xs text-text-muted mt-1">
                      Inherits from: <span className="text-accent-gold">{activeRole.inherits_from_name}</span>
                    </p>
                  )}
                </div>
                {isAdminRole && (
                  <span className="text-xs px-3 py-1.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 font-bold">
                    Full Access — Locked
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {data.modules.map(mod => (
                  <PermissionCard
                    key={mod.id}
                    module={mod}
                    permissions={data.permissions}
                    roleId={activeRole.id}
                    localState={localState}
                    saving={saving}
                    isAdmin={isAdminRole}
                    onToggle={(moduleId, permId) => toggle(moduleId, permId)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Role Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'var(--overlay)' }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 16 }}
              onClick={e => e.stopPropagation()}
              className="glass-panel p-6 w-full max-w-md"
              style={{ backgroundColor: 'var(--surface-elevated)' }}
            >
              <h3 className="text-lg font-bold text-white mb-4">Create New Role</h3>
              <div className="space-y-4">
                <div>
                  <label className="label-xs mb-2 block">Role Name</label>
                  <input
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                    placeholder="e.g. Senior QA Engineer"
                    className="field-input"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="label-xs mb-2 block">Description</label>
                  <textarea
                    value={newRoleDesc}
                    onChange={e => setNewRoleDesc(e.target.value)}
                    placeholder="Describe this role's responsibilities…"
                    className="field-input resize-none h-20"
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 py-2.5 rounded-xl border border-white/10 text-text-muted hover:text-white text-sm font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={!newRoleName.trim() || creating}
                    className="flex-1 py-2.5 rounded-xl bg-accent-gold text-background text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {creating ? <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Create Role
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Assigned Users Modal */}
      <AnimatePresence>
        {viewUsersRole && (
          <AssignedUsersModal
            role={viewUsersRole}
            userCount={userCounts[viewUsersRole.id] ?? 0}
            onClose={() => setViewUsersRole(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  )
}
