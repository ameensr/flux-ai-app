// src/modules/ReleaseTaskTracker/components/ReleasePermissionsInfoModal.tsx
// Explains the 10 granular permissions in Release Task Tracker and displays active user permissions.

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Shield, CheckCircle2, XCircle } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { usePermissions } from '@/hooks/usePermissions'
import { useAppStore } from '@/store/useAppStore'

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
  { key: 'can_export', label: 'Export Release Tasks', desc: 'Allows downloading filtered task tables as Excel or CSV spreadsheets.' },
  { key: 'can_view_history', label: 'View Release Task History', desc: 'Allows viewing comprehensive audit change trails.' },
  { key: 'can_configure_dropdowns', label: 'Configure Dropdowns', desc: 'Allows customizing master statuses and priorities.' },
  { key: 'can_import', label: 'Import Release Tasks', desc: 'Allows bulk uploading tasks from spreadsheets.' },
  { key: 'can_manage_permissions', label: 'Manage Permissions', desc: 'Allows configuring role permissions for the module.' }
]

export function ReleasePermissionsInfoModal({ isOpen, onClose }: Props) {
  useBodyScrollLock(isOpen)
  const { can, canView } = usePermissions()
  const { profile } = useAppStore()

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/75 backdrop-blur-sm"
        />

        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-surface border border-white/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto z-10 max-h-[85vh]"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-surface-elevated/80 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-accent/20 border border-accent/30 flex items-center justify-center text-accent">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text-primary">
                  Release Task Tracker Permissions
                </h3>
                <p className="text-xs text-text-muted">
                  Active role: <strong>{profile?.role || 'User'}</strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* List */}
          <div className="p-5 space-y-2.5 overflow-y-auto flex-1">
            {PERMISSION_DESCRIPTIONS.map((item) => {
              const isAllowed =
                item.key === 'can_view'
                  ? canView('release-tracker')
                  : can('release-tracker', item.key as any)

              return (
                <div
                  key={item.key}
                  className="p-3 rounded-xl border border-white/10 bg-surface-elevated/40 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary">
                        {item.label}
                      </span>
                    </div>
                    <p className="text-[11px] text-text-muted leading-relaxed">
                      {item.desc}
                    </p>
                  </div>

                  <div className="shrink-0 pt-0.5">
                    {isAllowed ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" />
                        Enabled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3" />
                        Disabled
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 border-t border-white/10 bg-surface-elevated/70 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-8 px-4 rounded-xl border border-white/10 text-xs font-medium text-text-primary hover:bg-white/5"
            >
              Close
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
