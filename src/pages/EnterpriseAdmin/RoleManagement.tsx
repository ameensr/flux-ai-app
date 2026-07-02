// src/pages/EnterpriseAdmin/RoleManagement.tsx
import React, { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { invalidatePermissionCache } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import {
  Shield, Plus, Copy, Edit2, Trash2, ChevronDown, ChevronRight,
  Check, X, RefreshCw, Save, Users, ArrowDown,
} from 'lucide-react'
import type { EnterpriseRole, ModuleRow, PermRow, RMPRow } from './types'
import { PERM_LABELS } from './types'

interface MatrixData {
  roles: EnterpriseRole[]
  modules: ModuleRow[]
  permissions: PermRow[]
  matrix: RMPRow[]
}

function RoleCard({
  role, isSelected, userCount, onSelect, onDuplicate, onDelete,
}: {
  role: EnterpriseRole
  isSelected: boolean
  userCount: number
  onSelect: () => void
  onDuplicate: () => void
  onDelete: () => void
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
        <span className="text-[10px] text-text-muted flex items-center gap-1">
          <Users className="w-3 h-3" /> {userCount}
        </span>
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
    </motion.div>
  )
}
