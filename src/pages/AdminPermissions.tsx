// src/pages/AdminPermissions.tsx
import React, { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { invalidatePermissionCache } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import { Shield, Crown, User, RefreshCw, Check, X } from 'lucide-react'

interface RoleRow   { id: string; role_key: string; role_name: string; description: string }
interface ModuleRow { id: string; module_key: string; module_name: string; sort_order: number }
interface PermRow   { id: string; permission_key: string; permission_name: string }
interface RMPRow    { id: string; role_id: string; module_id: string; permission_id: string; is_enabled: boolean }

const ROLE_ICONS: Record<string, React.ElementType> = {
  admin: Shield, pro: Crown, free: User,
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'text-red-400 border-red-500/30 bg-red-500/10',
  pro:   'text-accent-gold border-accent-gold/30 bg-accent-gold/10',
  free:  'text-text-muted border-white/10 bg-white/5',
}

const PERM_LABELS: Record<string, string> = {
  can_view: 'View', can_create: 'Create', can_edit: 'Edit',
  can_delete: 'Delete', can_export: 'Export', can_generate_ai: 'AI Gen',
  can_manage: 'Manage', can_use_advanced_ai: 'Adv AI',
}

export const AdminPermissions: React.FC = () => {
  const { toast } = useToast()
  const [roles, setRoles]       = useState<RoleRow[]>([])
  const [modules, setModules]   = useState<ModuleRow[]>([])
  const [perms, setPerms]       = useState<PermRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [saving, setSaving]     = useState<string | null>(null)
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [localState, setLocalState]     = useState<Record<string, boolean>>({})

  const fetchMatrix = useCallback(async () => {
    setLoading(true)
    try {
      const [
        { data: rolesData,   error: e1 },
        { data: modulesData, error: e2 },
        { data: permsData,   error: e3 },
        { data: rmpData,     error: e4 },
      ] = await Promise.all([
        supabase.from('roles').select('id,role_key,role_name,description').order('priority'),
        supabase.from('modules').select('id,module_key,module_name,sort_order').eq('is_active', true).order('sort_order'),
        supabase.from('permissions').select('id,permission_key,permission_name').order('permission_key'),
        supabase.from('role_module_permissions').select('id,role_id,module_id,permission_id,is_enabled'),
      ])

      const err = e1 || e2 || e3 || e4
      if (err) throw new Error(err.message)

      setRoles(rolesData ?? [])
      setModules(modulesData ?? [])
      setPerms(permsData ?? [])

      const init: Record<string, boolean> = {}
      for (const row of (rmpData ?? [])) {
        init[`${row.role_id}:${row.module_id}:${row.permission_id}`] = row.is_enabled
      }
      setLocalState(init)
      setSelectedRole(prev => prev ?? (rolesData?.[0]?.id ?? null))
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to load permissions', description: e.message })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { fetchMatrix() }, [fetchMatrix])

  const toggle = async (role_id: string, module_id: string, permission_id: string) => {
    const key = `${role_id}:${module_id}:${permission_id}`
    const current = localState[key] ?? false
    const next = !current
    setLocalState(prev => ({ ...prev, [key]: next }))
    setSaving(key)
    try {
      const { error } = await supabase
        .from('role_module_permissions')
        .upsert(
          { role_id, module_id, permission_id, is_enabled: next },
          { onConflict: 'role_id,module_id,permission_id' }
        )
      if (error) throw error
      invalidatePermissionCache(roles.find(r => r.id === role_id)?.role_key)
    } catch (e: any) {
      setLocalState(prev => ({ ...prev, [key]: current }))
      toast({ variant: 'destructive', title: 'Failed to update permission', description: e.message })
    } finally {
      setSaving(null)
    }
  }

  const activeRole = roles.find(r => r.id === selectedRole)
  const isAdminRole = activeRole?.role_key === 'admin' || activeRole?.role_key === 'super_admin'

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
      {/* Role selector */}
      <div className="flex flex-wrap gap-3">
        {roles.map(role => {
          const Icon = ROLE_ICONS[role.role_key] ?? Shield
          const isActive = selectedRole === role.id
          return (
            <button
              key={role.id}
              onClick={() => setSelectedRole(role.id)}
              className={cn(
                'flex items-center gap-2.5 px-5 py-3 rounded-2xl border text-sm font-bold transition-all duration-300',
                isActive
                  ? ROLE_COLORS[role.role_key] ?? 'text-white border-white/20 bg-white/10'
                  : 'text-text-muted border-white/5 bg-white/[0.02] hover:border-white/15 hover:text-white'
              )}
            >
              <Icon className="w-4 h-4" />
              {role.role_name}
            </button>
          )
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-32">
          <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
        </div>
      ) : activeRole ? (
        <GlassCard hoverEffect={false} className="overflow-x-auto">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                {React.createElement(ROLE_ICONS[activeRole.role_key] ?? Shield, { className: 'w-4 h-4 text-accent-gold' })}
                {activeRole.role_name} Permissions
              </h3>
              <p className="text-xs text-text-muted mt-1">{activeRole.description}</p>
            </div>
            <button onClick={fetchMatrix} className="p-2 rounded-xl hover:bg-white/5 text-text-muted hover:text-white transition-all">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          <table className="w-full text-sm min-w-[640px]">
            <thead>
              <tr className="border-b border-white/5">
                <th className="text-left py-3 pr-6 text-text-muted font-semibold text-xs uppercase tracking-widest w-48">Module</th>
                {perms.map(p => (
                  <th key={p.id} className="text-center py-3 px-2 text-text-muted font-semibold text-xs uppercase tracking-widest">
                    {PERM_LABELS[p.permission_key] ?? p.permission_name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.03]">
              {modules.map(mod => (
                <tr key={mod.id} className="group hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 pr-6">
                    <span className="text-white font-medium">{mod.module_name}</span>
                    <span className="block text-[10px] text-text-muted mt-0.5">{mod.module_key}</span>
                  </td>
                  {perms.map(perm => {
                    const key = `${activeRole.id}:${mod.id}:${perm.id}`
                    const enabled = localState[key] ?? false
                    const isSavingThis = saving === key
                    return (
                      <td key={perm.id} className="text-center py-4 px-2">
                        <button
                          onClick={() => !isAdminRole && toggle(activeRole.id, mod.id, perm.id)}
                          disabled={isSavingThis || isAdminRole}
                          className={cn(
                            'w-9 h-5 rounded-full relative transition-all duration-300 mx-auto block',
                            enabled
                              ? isAdminRole ? 'bg-accent-gold/40 cursor-not-allowed' : 'bg-accent-gold hover:bg-accent-gold/80'
                              : 'bg-white/10 hover:bg-white/20',
                            isSavingThis && 'opacity-50 cursor-wait',
                            isAdminRole && 'cursor-not-allowed'
                          )}
                          title={isAdminRole ? 'Admin always has full access' : `${enabled ? 'Disable' : 'Enable'} ${perm.permission_name}`}
                        >
                          <motion.div
                            animate={{ x: enabled ? 16 : 2 }}
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className={cn('absolute top-0.5 w-4 h-4 rounded-full flex items-center justify-center', enabled ? 'bg-background' : 'bg-white/40')}
                          >
                            {enabled
                              ? <Check className="w-2.5 h-2.5 text-accent-gold" />
                              : <X className="w-2.5 h-2.5 text-text-muted" />
                            }
                          </motion.div>
                        </button>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </GlassCard>
      ) : (
        <GlassCard hoverEffect={false} className="flex flex-col items-center justify-center py-20 text-center">
          <Shield className="w-10 h-10 text-text-muted mb-3 opacity-30" />
          <p className="text-text-muted text-sm">No roles found. Run the RBAC migrations first.</p>
        </GlassCard>
      )}
    </motion.div>
  )
}
