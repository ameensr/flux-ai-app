// src/pages/EnterpriseAdmin/RoleManagement.tsx
import React, { useEffect, useState, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { invalidatePermissionCache, fetchAllRoleModulePermissions } from '@/lib/rbac'
import { logAuditEvent } from '@/lib/auditLog'
import { getModulePermissions, PERMISSION_LABELS } from '@/lib/modulePermissions'
import { cn } from '@/lib/utils'
import { useAppStore } from '@/store/useAppStore'
import { usePermissions } from '@/hooks/usePermissions'
import {
  Shield, Plus, Copy, Edit2, Trash2, ChevronDown, ChevronRight,
  Check, X, RefreshCw, Save, Users, ArrowDown, Search, UserCircle,
  RotateCcw, AlertTriangle,
} from 'lucide-react'
import type { EnterpriseRole, ModuleRow, PermRow, RMPRow } from './types'
import { STATUS_CONFIG } from './types'

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
  role, isSelected, userCount, canManageRoles, onSelect, onDuplicate, onDelete, onViewUsers,
}: {
  role: EnterpriseRole
  isSelected: boolean
  userCount: number
  canManageRoles: boolean
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
        {canManageRoles && (
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
        )}
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
  module, permissions, roleId, localState, dirtyKeys, savingAll, isAdmin, canEditMatrix, onToggle,
}: {
  module: ModuleRow
  permissions: PermRow[]
  roleId: string
  localState: Record<string, boolean>
  dirtyKeys: Set<string>
  savingAll: boolean
  isAdmin: boolean
  canEditMatrix: boolean
  onToggle: (moduleId: string, permId: string) => void
}) {
  const [expanded, setExpanded] = useState(true)

  // Get only the permissions that this module actually supports
  const supportedPermissionKeys = getModulePermissions(module.module_key)
  const filteredPermissions = permissions.filter(p => supportedPermissionKeys.includes(p.permission_key as any))

  // If no permissions are supported, don't render this module
  if (filteredPermissions.length === 0) return null

  // Read-only for admin (always-granted banner shown elsewhere) OR for a role
  // that can view this matrix but lacks can_manage_permissions on admin-hub.
  const readOnly = isAdmin || !canEditMatrix

  const enabledCount = isAdmin ? filteredPermissions.length : filteredPermissions.filter(p => localState[`${roleId}:${module.id}:${p.id}`]).length
  const hasDirty = !readOnly && filteredPermissions.some(p => dirtyKeys.has(`${roleId}:${module.id}:${p.id}`))

  return (
    <div className={cn(
      'rounded-2xl border overflow-hidden transition-colors',
      hasDirty ? 'border-accent-gold/30 bg-accent-gold/[0.03]' : 'border-white/5 bg-white/[0.02]'
    )}>
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? <ChevronDown className="w-4 h-4 text-text-muted" /> : <ChevronRight className="w-4 h-4 text-text-muted" />}
          <span className="font-semibold text-white text-sm">{module.module_name}</span>
          <span className="text-[10px] text-text-muted">{module.module_key}</span>
          {hasDirty && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent-gold" title="Unsaved changes" />
          )}
        </div>
        <span className={cn(
          'text-[10px] px-2 py-0.5 rounded-full font-bold',
          isAdmin ? 'bg-green-500/10 text-green-400' : enabledCount > 0 ? 'bg-accent-gold/10 text-accent-gold' : 'bg-white/5 text-text-muted'
        )}>
          {enabledCount}/{filteredPermissions.length}
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
              {filteredPermissions.map(perm => {
                const key = `${roleId}:${module.id}:${perm.id}`
                const enabled = isAdmin ? true : (localState[key] ?? false)
                const isDirty = dirtyKeys.has(key)
                return (
                  <button
                    key={perm.id}
                    onClick={() => !readOnly && onToggle(module.id, perm.id)}
                    disabled={savingAll || readOnly}
                    title={
                      isAdmin
                        ? 'Granted — system administrator'
                        : !canEditMatrix
                          ? 'You need the "Manage Permissions" admin-hub capability to edit this'
                          : `${enabled ? 'Disable' : 'Enable'} ${perm.permission_name}`
                    }
                    className={cn(
                      'flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-all duration-200',
                      isAdmin
                        ? 'bg-green-500/10 border-green-500/25 text-green-400 cursor-default'
                        : enabled
                          ? 'bg-accent-gold/15 border-accent-gold/40 text-accent-gold hover:bg-accent-gold/25'
                          : 'bg-white/[0.02] border-white/5 text-text-muted hover:border-white/15 hover:text-white',
                      isDirty && !readOnly && 'ring-1 ring-accent-gold/60',
                      (savingAll || (!isAdmin && !canEditMatrix)) && 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    {enabled
                      ? <Check className="w-3 h-3" />
                      : <X className="w-3 h-3" />
                    }
                    {PERMISSION_LABELS[perm.permission_key as keyof typeof PERMISSION_LABELS] ?? perm.permission_name}
                    {isDirty && !readOnly && <span className="w-1 h-1 rounded-full bg-accent-gold" />}
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
  const { role: currentUserRole } = useAppStore()
  const { can } = usePermissions()
  const isAdminUser = currentUserRole === 'admin' || currentUserRole === 'super_admin'
  // "Manage Roles" = create/duplicate/delete roles. "Manage Permissions" =
  // toggle/save the permission matrix for a role. These are separate
  // admin-hub capabilities so a role can be granted one without the other
  // (e.g. a support lead who can adjust permissions but shouldn't be able
  // to create or delete roles outright).
  const canManageRoles = isAdminUser || can('admin-hub', 'can_manage_roles')
  const canManagePermissions = isAdminUser || can('admin-hub', 'can_manage_permissions')
  const [data, setData] = useState<MatrixData | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingAll, setSavingAll] = useState(false)
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null)
  const [localState, setLocalState] = useState<Record<string, boolean>>({})
  // Pending, unsaved edits: key -> new value. Only written to the DB on Save.
  const [pendingChanges, setPendingChanges] = useState<Record<string, boolean>>({})
  const [userCounts, setUserCounts] = useState<Record<string, number>>({})
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [viewUsersRole, setViewUsersRole] = useState<EnterpriseRole | null>(null)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDesc, setNewRoleDesc] = useState('')
  const [creating, setCreating] = useState(false)

  const savedStateRef = useRef<Record<string, boolean>>({})
  const dirtyKeys = new Set(Object.keys(pendingChanges))
  const hasUnsavedChanges = dirtyKeys.size > 0

  const fetchMatrix = useCallback(async () => {
    setLoading(true)
    try {
      const [rolesRes, modulesRes, permsRes, rmpRows, profilesRes] = await Promise.all([
        supabase.from('roles').select('*').order('priority'),
        supabase.from('modules').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('permissions').select('*').order('permission_key'),
        // Paginated — a plain select('*') silently truncates at PostgREST's
        // default 1000-row Max Rows limit on a fully-seeded matrix (roles x
        // modules x permissions commonly exceeds 1000), which is what made
        // saved permission changes intermittently "disappear" after a
        // refresh even though they were correctly persisted. See
        // fetchAllRoleModulePermissions in lib/rbac.ts for the full story.
        fetchAllRoleModulePermissions(),
        supabase.from('profiles').select('role'),
      ])

      if (rolesRes.error) throw rolesRes.error
      if (modulesRes.error) throw modulesRes.error
      if (permsRes.error) throw permsRes.error

      // Enrich roles with inherits_from_name
      const rawRoles: EnterpriseRole[] = (rolesRes.data ?? []).map((r: EnterpriseRole) => ({
        ...r,
        inherits_from_name: r.inherits_from
          ? (rolesRes.data ?? []).find((x: EnterpriseRole) => x.id === r.inherits_from)?.role_name ?? null
          : null,
      }))

      const json: MatrixData = {
        roles: rawRoles,
        modules: modulesRes.data ?? [],
        permissions: permsRes.data ?? [],
        matrix: rmpRows as RMPRow[],
      }
      setData(json)

      const init: Record<string, boolean> = {}
      for (const row of json.matrix) {
        init[`${row.role_id}:${row.module_id}:${row.permission_id}`] = row.is_enabled
      }
      savedStateRef.current = init
      setLocalState(init)
      setPendingChanges({})
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

  // Warn before leaving the page/tab with unsaved permission changes.
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [hasUnsavedChanges])

  // Toggle only updates local UI state + the pending-changes set. Nothing is
  // written to the database until "Save Changes" is clicked.
  const toggle = (moduleId: string, permId: string) => {
    if (!selectedRoleId || !canManagePermissions) return
    const key = `${selectedRoleId}:${moduleId}:${permId}`
    const next = !(localState[key] ?? false)
    setLocalState(prev => ({ ...prev, [key]: next }))

    const savedValue = savedStateRef.current[key] ?? false
    setPendingChanges(prev => {
      const updated = { ...prev }
      if (next === savedValue) {
        // Reverted back to the saved value — no longer a pending change.
        delete updated[key]
      } else {
        updated[key] = next
      }
      return updated
    })
  }

  // Persist every pending change in one batch write.
  const saveChanges = async () => {
    if (!selectedRoleId || dirtyKeys.size === 0 || !canManagePermissions) return
    setSavingAll(true)
    try {
      const rows = Object.entries(pendingChanges).map(([key, is_enabled]) => {
        const [role_id, module_id, permission_id] = key.split(':')
        return { role_id, module_id, permission_id, is_enabled }
      })

      // .select() is required to detect an RLS-blocked write. rmp_admin_write
      // only allows this for callers whose OWN profiles.role is literally
      // 'admin'/'super_admin' — a role granted "Manage Permissions" via this
      // very screen (but whose literal role is something else, e.g. a
      // custom role or 'manager') passes the frontend's canManagePermissions
      // check but gets silently blocked at the database layer. Without
      // .select(), that silent block looks identical to success: error is
      // null, "Permissions Saved" shows, the toggle looks enabled — until
      // the next page load re-fetches the real (unchanged) DB state and the
      // toggle reverts. Comparing returned rows against what we tried to
      // write catches that.
      const { data: written, error } = await supabase
        .from('role_module_permissions')
        .upsert(rows, { onConflict: 'role_id,module_id,permission_id', ignoreDuplicates: false })
        .select('role_id,module_id,permission_id')

      if (error) throw error

      if (!written || written.length < rows.length) {
        throw new Error(
          "Some permission changes weren't saved — you may not have permission to modify this role's matrix. " +
          'Ask an admin/super_admin to verify your access, or check that Roles & Permissions RLS is up to date.'
        )
      }

      const oldValue = Object.fromEntries(
        Object.keys(pendingChanges).map(key => [key, savedStateRef.current[key] === true])
      )
      savedStateRef.current = { ...savedStateRef.current, ...pendingChanges }
      setPendingChanges({})

      const role = data?.roles.find(r => r.id === selectedRoleId)
      if (role) invalidatePermissionCache(role.role_key)

      logAuditEvent({
        action: 'permission_changed',
        targetType: 'role',
        targetId: selectedRoleId,
        module: 'role_module_permissions',
        oldValue,
        newValue: pendingChanges,
      })

      toast({ title: 'Permissions Saved', description: `${rows.length} change${rows.length !== 1 ? 's' : ''} applied.` })
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to save permissions', description: e?.message })
    } finally {
      setSavingAll(false)
    }
  }

  // Revert all unsaved edits back to the last-saved state.
  const discardChanges = () => {
    setLocalState(savedStateRef.current)
    setPendingChanges({})
  }

  const selectRole = (roleId: string) => {
    if (roleId === selectedRoleId) return
    if (hasUnsavedChanges && !confirm('You have unsaved permission changes for this role. Switch roles and discard them?')) {
      return
    }
    setPendingChanges({})
    setLocalState(savedStateRef.current)
    setSelectedRoleId(roleId)
  }

  const handleDuplicate = async (role: EnterpriseRole) => {
    if (!canManageRoles) return
    const newKey = `${role.role_key}_copy_${Date.now()}`
    const { data: newRole, error } = await supabase
      .from('roles')
      .insert({
        role_key: newKey,
        role_name: `${role.role_name} (Copy)`,
        description: role.description,
        priority: role.priority + 1,
        is_system: false,
      })
      .select('id')
      .single()
    if (error) { toast({ variant: 'destructive', title: 'Failed', description: error.message }); return }

    // The roles_seed_permissions trigger (migration 046) auto-zero-fills the
    // new role's role_module_permissions the instant it's inserted above. To
    // make "Duplicate" actually clone the source role's matrix (rather than
    // producing an empty, deny-by-default role with the same name), copy
    // every enabled permission from the source role onto the new one.
    if (newRole?.id) {
      const sourceEnabled = (data?.matrix ?? []).filter(
        row => row.role_id === role.id && row.is_enabled
      )
      if (sourceEnabled.length > 0) {
        const rows = sourceEnabled.map(row => ({
          role_id: newRole.id,
          module_id: row.module_id,
          permission_id: row.permission_id,
          is_enabled: true,
        }))
        const { error: copyError } = await supabase
          .from('role_module_permissions')
          .upsert(rows, { onConflict: 'role_id,module_id,permission_id' })
        if (copyError) {
          toast({
            variant: 'destructive',
            title: 'Role duplicated, but permissions could not be copied',
            description: copyError.message,
          })
          fetchMatrix()
          return
        }
      }
    }

    logAuditEvent({
      action: 'role_created',
      targetType: 'role',
      targetId: newRole?.id ?? null,
      newValue: { role_key: newKey, role_name: `${role.role_name} (Copy)`, duplicated_from: role.role_key },
    })
    toast({ title: 'Role Duplicated', description: 'Permissions copied from the source role.' })
    fetchMatrix()
  }

  const handleDelete = async (role: EnterpriseRole) => {
    if (!canManageRoles) return
    if (role.is_system) { toast({ variant: 'destructive', title: 'Cannot delete system roles' }); return }
    if ((userCounts[role.id] ?? 0) > 0) {
      toast({ variant: 'destructive', title: 'Role has users', description: 'Reassign users before deleting.' }); return
    }
    if (!confirm(`Delete role "${role.role_name}"?`)) return
    const { error } = await supabase.from('roles').delete().eq('id', role.id)
    if (error) { toast({ variant: 'destructive', title: 'Failed', description: error.message }); return }
    logAuditEvent({
      action: 'role_deleted',
      targetType: 'role',
      targetId: role.id,
      oldValue: { role_key: role.role_key, role_name: role.role_name },
    })
    toast({ title: 'Role Deleted' })
    fetchMatrix()
  }

  const handleCreate = async () => {
    if (!newRoleName.trim() || !canManageRoles) return
    setCreating(true)
    const key = newRoleName.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
    const { data: created, error } = await supabase
      .from('roles')
      .insert({
        role_key: key,
        role_name: newRoleName.trim(),
        description: newRoleDesc.trim() || null,
        priority: 50,
        is_system: false,
      })
      .select('id')
      .single()
    setCreating(false)
    if (error) { toast({ variant: 'destructive', title: 'Failed', description: error.message }); return }
    logAuditEvent({
      action: 'role_created',
      targetType: 'role',
      targetId: created?.id ?? null,
      newValue: { role_key: key, role_name: newRoleName.trim() },
    })
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
                <button
                  onClick={() => {
                    if (hasUnsavedChanges && !confirm('You have unsaved permission changes. Refresh and discard them?')) return
                    fetchMatrix()
                  }}
                  className="p-1.5 rounded-lg hover:bg-white/5 text-text-muted hover:text-white transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {canManageRoles && (
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent-gold text-background text-xs font-bold hover:opacity-90 transition-opacity"
                  >
                    <Plus className="w-3.5 h-3.5" /> New Role
                  </button>
                )}
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
                      canManageRoles={canManageRoles}
                      onSelect={() => selectRole(role.id)}
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
                  <span className="text-xs px-3 py-1.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 font-bold flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" /> Unrestricted Access
                  </span>
                )}
              </div>

              {/* Admin role info banner */}
              {isAdminRole && (
                <div className="flex items-start gap-3 p-4 rounded-2xl border border-green-500/15 bg-green-500/[0.04]">
                  <Shield className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-green-400 mb-0.5">All permissions granted by default</p>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      This is a system administrator role with unrestricted access to all modules. Permissions are not configurable — full access is always enforced at both the application and database level.
                    </p>
                  </div>
                </div>
              )}

              {/* Read-only notice for users who can view this matrix but lack
                  the admin-hub "Manage Permissions" capability to edit it. */}
              {!isAdminRole && !canManagePermissions && (
                <div className="flex items-start gap-3 p-4 rounded-2xl border border-white/10 bg-white/[0.03]">
                  <AlertTriangle className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-text-secondary mb-0.5">Read-only view</p>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      You can view this permission matrix, but editing it requires the "Manage Permissions" admin-hub capability.
                    </p>
                  </div>
                </div>
              )}

              <div className="space-y-3 pb-20">
                {data.modules.map(mod => (
                  <PermissionCard
                    key={mod.id}
                    module={mod}
                    permissions={data.permissions}
                    roleId={activeRole.id}
                    localState={localState}
                    dirtyKeys={dirtyKeys}
                    savingAll={savingAll}
                    isAdmin={isAdminRole}
                    canEditMatrix={canManagePermissions}
                    onToggle={(moduleId, permId) => toggle(moduleId, permId)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Sticky Save/Discard bar — appears only when there are unsaved edits */}
      <AnimatePresence>
        {hasUnsavedChanges && !isAdminRole && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-4 px-5 py-3.5 rounded-2xl border shadow-2xl"
            style={{ backgroundColor: 'var(--surface-elevated)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-accent-gold shrink-0" />
              <span className="text-sm font-semibold text-white whitespace-nowrap">
                {dirtyKeys.size} unsaved change{dirtyKeys.size !== 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={discardChanges}
                disabled={savingAll}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-white/10 text-text-muted hover:text-white text-xs font-bold transition-all disabled:opacity-50"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Discard
              </button>
              <button
                onClick={saveChanges}
                disabled={savingAll}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-gold text-background text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all"
              >
                {savingAll
                  ? <div className="w-3.5 h-3.5 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                  : <Save className="w-3.5 h-3.5" />
                }
                Save Changes
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
