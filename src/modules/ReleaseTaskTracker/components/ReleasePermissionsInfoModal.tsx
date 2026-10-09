// src/modules/ReleaseTaskTracker/components/ReleasePermissionsInfoModal.tsx
// Explains the 10 granular permissions in Release Task Tracker and displays active user permissions.

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Shield, CheckCircle2, XCircle } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { usePermissions } from '@/hooks/usePermissions'
import { useAppStore } from '@/store/useAppStore'
import { Badge } from '@/components/ui/badge'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const PERMISSION_DESCRIPTIONS = [
  { key: 'can_view', label: 'View Release Task Tracker', desc: 'Allows access to the module. If disabled, module is completely hidden.' },
  { key: 'can_view_dashboard', label: 'View Release Task Dashboard', desc: 'Allows viewing manager KPI metrics, release progress, and analytics.' },
  { key: 'can_create', label: 'Add Release Task', desc: 'Allows creating new release tasks in the register.' },
  { key: 'can_edit', label: 'Edit Release Task', desc: 'Allows updating release tasks, priority, schedule, and assignees.' },
  { key: 'can_delete', label: 'Delete Release Task', desc: 'Allows soft-deleting and removing release tasks from the table.' },
  { key: 'can_lock_estimated_hours', label: 'Lock Estimated Hours', desc: 'Allows locking Estimated Hrs on a specific release task to prevent further modifications.' },
  { key: 'can_unlock_estimated_hours', label: 'Unlock Estimated Hours', desc: 'Allows authorized QA Leads to unlock Estimated Hrs so modifications can be made.' },
  { key: 'can_edit_estimated_hours', label: 'Edit Estimated Hours', desc: 'Allows editing Estimated Hrs when the task estimation is unlocked.' },
  { key: 'can_edit_time_logs', label: 'Edit / Correct Logged Hours', desc: 'Allows correcting previously logged time-log entries. Every correction is recorded in audit history with a mandatory reason.' },
  { key: 'can_export', label: 'Export Release Tasks', desc: 'Allows downloading filtered task tables as Excel or CSV spreadsheets.' },
  { key: 'can_view_history', label: 'View Release Task History', desc: 'Allows viewing comprehensive audit change trails.' },
  { key: 'can_configure_dropdowns', label: 'Configure Dropdowns', desc: 'Allows customizing master statuses and priorities.' },
  { key: 'can_import', label: 'Import Release Tasks', desc: 'Allows bulk uploading tasks from spreadsheets.' },
  { key: 'can_manage_permissions', label: 'Manage Permissions', desc: 'Allows configuring role permissions for the module.' }
]

export function ReleasePermissionsInfoModal({ isOpen, onClose }: Props) {
  useBodyScrollLock(isOpen)
  const { can, canView } = usePermissions()
  const { role, profile } = useAppStore()

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
          className="w-full max-w-xl bg-surface-elevated border border-border/60 rounded-2xl shadow-2xl flex flex-col max-h-[88vh] overflow-hidden"
          style={{ backgroundColor: 'var(--modal-bg, #141c2b)' }}
        >
          {/* Header */}
          <div className="px-6 py-4.5 border-b border-border/50 flex items-center justify-between shrink-0 bg-surface/50">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/25 flex items-center justify-center text-accent">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-text-primary">
                    Module Permissions
                  </h3>
                  <Badge variant="outline" className="text-[10px] uppercase font-mono font-bold bg-accent/10 text-accent border-accent/20">
                    Role: {role || profile?.role || 'User'}
                  </Badge>
                </div>
                <p className="text-xs text-text-muted">
                  Granular permission architecture for Release Task Tracker
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* List */}
          <div className="overflow-y-auto space-y-2.5 px-6 py-4 flex-1">
            {PERMISSION_DESCRIPTIONS.map((item) => {
              const isAllowed =
                item.key === 'can_view'
                  ? canView('release-tracker')
                  : can('release-tracker', item.key as any)

              return (
                <div
                  key={item.key}
                  className="p-3 rounded-xl border border-border/50 bg-surface/70 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-xs text-text-primary">
                        {item.label}
                      </span>
                      <span className="text-[10px] font-mono text-text-muted">
                        ({item.key})
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    {isAllowed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Granted
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full whitespace-nowrap">
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
          <div className="px-6 py-3.5 border-t border-border/50 flex items-center justify-between text-xs bg-surface/40">
            <span className="text-text-muted flex items-center gap-1">
              <Shield className="w-3.5 h-3.5 text-accent" />
              Role-based access enforced
            </span>

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface hover:bg-surface-elevated text-text-primary border border-border/60 transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
