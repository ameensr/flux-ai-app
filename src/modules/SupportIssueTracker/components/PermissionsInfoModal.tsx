// src/modules/SupportIssueTracker/components/PermissionsInfoModal.tsx
// Explains the 10 granular permissions in Support Issue Tracker and displays the user's active permissions.

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { X, Shield, CheckCircle2, XCircle, ArrowUpRight, Lock } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { GlassCard } from '@/components/ui/GlassCard'
import { Badge } from '@/components/ui/badge'
import { usePermissions } from '@/hooks/usePermissions'
import { useAppStore } from '@/store/useAppStore'
import { ROUTES } from '@/lib/routes'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const MODULE_PERMISSIONS_LIST = [
  { key: 'can_view', label: 'View Support Issue Tracker', desc: 'Allows access to the module. If disabled, module is completely hidden and direct URL returns 401.' },
  { key: 'can_view_dashboard', label: 'View Support Dashboard', desc: 'Controls visibility of the Manager Live Dashboard (KPI cards, charts, summaries).' },
  { key: 'can_create', label: 'Add Support Issue', desc: 'Enables adding new support issue rows.' },
  { key: 'can_edit', label: 'Edit Support Issue', desc: 'Allows modifying existing issues, status, hours, and tester assignment.' },
  { key: 'can_delete', label: 'Delete Support Issue', desc: 'Permits permanently removing support issues.' },
  { key: 'can_export', label: 'Export Support Issues', desc: 'Enables downloading filtered datasets to Microsoft Excel and CSV.' },
  { key: 'can_view_history', label: 'View History', desc: 'Allows inspecting the immutable audit history and field diff trails.' },
  { key: 'can_configure_dropdowns', label: 'Configure Dropdowns', desc: 'Permits adding, editing, and toggling testing status and tester dropdown options.' },
  { key: 'can_manage_permissions', label: 'Manage Permissions', desc: 'Allows configuring RBAC permissions in Enterprise Admin.' },
  { key: 'can_import', label: 'Import Support Issues', desc: 'Enables bulk importing support issues from Excel/CSV mapped to Project Hub.' },
]

export function PermissionsInfoModal({ isOpen, onClose }: Props) {
  useBodyScrollLock(isOpen)
  const navigate = useNavigate()
  const { role } = useAppStore()
  const { can, canView } = usePermissions()
  const canManagePerms = can('support-tracker', 'can_manage_permissions')

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm overflow-hidden"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ duration: 0.2 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-xl bg-surface-elevated border border-white/15 dark:border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
          style={{ backgroundColor: 'var(--modal-bg, #141c2b)' }}
        >
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-white/10 flex items-center justify-between shrink-0 bg-surface/50">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-text-primary">
                      Module Permissions
                    </h3>
                    <Badge variant="outline" className="text-[10px] uppercase font-mono font-bold bg-accent/10 text-accent border-accent/20">
                      Role: {role}
                    </Badge>
                  </div>
                  <p className="text-xs text-text-muted">
                    Granular permission architecture for Support Issue Tracker
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Permission list */}
            <div className="overflow-y-auto space-y-2.5 py-4 pr-1 flex-1">
              {MODULE_PERMISSIONS_LIST.map((perm) => {
                const hasPerm = can('support-tracker', perm.key)

                return (
                  <div
                    key={perm.key}
                    className="p-3 rounded-xl border border-white/10 bg-surface/70 flex items-start justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-text-primary">
                          {perm.label}
                        </span>
                        <span className="text-[10px] font-mono text-text-muted">
                          ({perm.key})
                        </span>
                      </div>
                      <p className="text-[11px] text-text-muted leading-relaxed">
                        {perm.desc}
                      </p>
                    </div>

                    <div className="self-center">
                      {hasPerm ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Granted
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                          <XCircle className="w-3.5 h-3.5" />
                          Denied
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              {canManagePerms ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose()
                    navigate(ROUTES.enterpriseRoles)
                  }}
                  className="text-accent hover:underline flex items-center gap-1 font-semibold"
                >
                  <span>Open Enterprise Role Matrix</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <span className="text-text-muted flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5" />
                  Contact Super Admin to modify role permissions
                </span>
              )}

              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-white/10 text-text-primary border border-white/10 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
