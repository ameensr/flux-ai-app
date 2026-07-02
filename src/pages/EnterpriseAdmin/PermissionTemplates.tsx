// src/pages/EnterpriseAdmin/PermissionTemplates.tsx
import React, { useEffect, useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '@/lib/supabase'
import { GlassCard } from '@/components/ui/GlassCard'
import { useToast } from '@/hooks/use-toast'
import { invalidatePermissionCache } from '@/lib/rbac'
import { cn } from '@/lib/utils'
import { Layers, Check, Zap, Shield, Users, Eye, Code2, Bug, UserCheck } from 'lucide-react'
import type { EnterpriseRole, ModuleRow, PermRow, RMPRow, PermissionTemplate } from './types'
import { TEMPLATE_PRESETS } from './types'

const TEMPLATE_ICONS: Record<string, React.ElementType> = {
  Administrator: Shield,
  Manager:       Users,
  Developer:     Code2,
  'QA Engineer': Bug,
  Viewer:        Eye,
  Client:        UserCheck,
  Guest:         UserCheck,
}

const TEMPLATE_COLORS: Record<string, string> = {
  Administrator: 'from-red-500/20 to-red-500/5 border-red-500/20',
  Manager:       'from-orange-500/20 to-orange-500/5 border-orange-500/20',
  Developer:     'from-blue-500/20 to-blue-500/5 border-blue-500/20',
  'QA Engineer': 'from-accent-gold/20 to-accent-gold/5 border-accent-gold/20',
  Viewer:        'from-white/10 to-white/5 border-white/10',
  Client:        'from-purple-500/20 to-purple-500/5 border-purple-500/20',
  Guest:         'from-gray-500/20 to-gray-500/5 border-gray-500/20',
}

export function PermissionTemplates() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState<PermissionTemplate[]>([])
  const [roles, setRoles] = useState<EnterpriseRole[]>([])
  const [modules, setModules] = useState<ModuleRow[]>([])
  const [permissions, setPermissions] = useState<PermRow[]>([])
  const [matrix, setMatrix] = useState<RMPRow[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<PermissionTemplate | null>(null)
  const [targetRoleId, setTargetRoleId] = useState('')
  const [applying, setApplying] = useState(false)
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    setLoading(true)
    try {
      const [tmplRes, rolesRes, modulesRes, permsRes, rmpRes] = await Promise.all([
        supabase.from('permission_templates').select('*').order('name'),
        supabase.from('roles').select('*').order('priority'),
        supabase.from('modules').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('permissions').select('*').order('permission_key'),
        supabase.from('role_module_permissions').select('*'),
      ])
      setTemplates(tmplRes.data ?? [])
      setRoles(rolesRes.data ?? [])
      setModules(modulesRes.data ?? [])
      setPermissions(permsRes.data ?? [])
      setMatrix(rmpRes.data ?? [])
      if (!targetRoleId && rolesRes.data?.length) setTargetRoleId(rolesRes.data[0].id)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed to load', description: e.message })
    } finally {
      setLoading(false)
    }
  }, [toast, targetRoleId])

  useEffect(() => { fetchAll() }, [])

  const applyTemplate = async () => {
    if (!selectedTemplate || !targetRoleId) return
    setApplying(true)
    try {
      const preset = selectedTemplate.config.preset
      const presetMap = TEMPLATE_PRESETS[preset] ?? {}

      const updates: { role_id: string; module_id: string; permission_id: string; is_enabled: boolean }[] = []

      for (const mod of modules) {
        const allowedPerms = presetMap[mod.module_key] ?? []
        for (const perm of permissions) {
          updates.push({
            role_id: targetRoleId,
            module_id: mod.id,
            permission_id: perm.id,
            is_enabled: allowedPerms.includes(perm.permission_key),
          })
        }
      }

      const { error } = await supabase
        .from('role_module_permissions')
        .upsert(updates, { onConflict: 'role_id,module_id,permission_id' })
      if (error) throw error

      const role = roles.find(r => r.id === targetRoleId)
      if (role) invalidatePermissionCache(role.role_key)

      toast({ title: 'Template Applied', description: `${selectedTemplate.name} applied to ${role?.role_name}.` })
      setSelectedTemplate(null)
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Failed', description: e.message })
    } finally {
      setApplying(false)
    }
  }

  // Preview: what permissions does this template grant?
  const previewMap = selectedTemplate
    ? TEMPLATE_PRESETS[selectedTemplate.config.preset] ?? {}
    : {}

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <GlassCard hoverEffect={false}>
        <div className="flex items-center gap-2 mb-2">
          <Layers className="w-5 h-5 text-accent-gold" />
          <h3 className="text-lg font-bold text-white">Permission Templates</h3>
        </div>
        <p className="text-text-muted text-sm mb-6">
          Select a template to instantly configure all permissions for a role. You can customize further after applying.
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Template grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-8">
              {templates.map((tmpl, i) => {
                const Icon = TEMPLATE_ICONS[tmpl.name] ?? Shield
                const colorClass = TEMPLATE_COLORS[tmpl.name] ?? 'from-white/10 to-white/5 border-white/10'
                const isSelected = selectedTemplate?.id === tmpl.id
                const preset = TEMPLATE_PRESETS[tmpl.config.preset] ?? {}
                const moduleCount = Object.keys(preset).length
                const permCount = Object.values(preset).flat().length

                return (
                  <motion.button
                    key={tmpl.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedTemplate(isSelected ? null : tmpl)}
                    className={cn(
                      'relative p-5 rounded-2xl border bg-gradient-to-br text-left transition-all duration-300',
                      colorClass,
                      isSelected ? 'ring-2 ring-accent-gold/50 scale-[1.02]' : 'hover:scale-[1.01]'
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-accent-gold flex items-center justify-center">
                        <Check className="w-3 h-3 text-background" />
                      </div>
                    )}
                    <Icon className="w-6 h-6 mb-3 text-white/70" />
                    <p className="font-bold text-white text-sm mb-1">{tmpl.name}</p>
                    <p className="text-text-muted text-xs mb-3 line-clamp-2">{tmpl.description}</p>
                    <div className="flex gap-3 text-[10px] text-text-muted">
                      <span>{moduleCount} modules</span>
                      <span>{permCount} permissions</span>
                    </div>
                  </motion.button>
                )
              })}
            </div>

            {/* Apply section */}
            {selectedTemplate && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-5 rounded-2xl border border-accent-gold/20 bg-accent-gold/5 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex-1">
                    <p className="text-white font-bold text-sm mb-1">
                      Apply "{selectedTemplate.name}" template
                    </p>
                    <p className="text-text-muted text-xs">
                      This will overwrite all permissions for the selected role.
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={targetRoleId}
                      onChange={e => setTargetRoleId(e.target.value)}
                      className="field-input h-10 text-sm w-48"
                    >
                      {roles.map(r => <option key={r.id} value={r.id}>{r.role_name}</option>)}
                    </select>
                    <button
                      onClick={applyTemplate}
                      disabled={applying || !targetRoleId}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-accent-gold text-background text-sm font-bold hover:opacity-90 disabled:opacity-50 transition-all whitespace-nowrap"
                    >
                      {applying
                        ? <div className="w-4 h-4 border-2 border-background/30 border-t-background rounded-full animate-spin" />
                        : <Zap className="w-4 h-4" />
                      }
                      Apply Template
                    </button>
                  </div>
                </div>

                {/* Preview */}
                <div className="border-t border-white/5 pt-4">
                  <p className="text-[10px] uppercase tracking-widest text-text-muted mb-3">Preview — Permissions Granted</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(previewMap).flatMap(([mod, perms]) =>
                      (perms as string[]).map(p => (
                        <span key={`${mod}:${p}`} className="text-[10px] px-2 py-1 rounded-lg bg-accent-gold/10 border border-accent-gold/20 text-accent-gold font-medium">
                          {mod}.{p.replace('can_', '')}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </>
        )}
      </GlassCard>
    </motion.div>
  )
}
