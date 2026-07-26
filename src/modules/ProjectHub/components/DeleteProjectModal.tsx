// src/modules/ProjectHub/components/DeleteProjectModal.tsx
// Enhanced deletion modal with type-to-confirm validation

import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, AlertTriangle, Trash2 } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { useTheme } from '@/context/ThemeContext'

interface DeleteProjectModalProps {
  projectName: string
  projectId: string
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteProjectModal({
  projectName,
  projectId,
  onClose,
  onConfirm
}: DeleteProjectModalProps) {
  useBodyScrollLock(true)
  const { isDark } = useTheme()
  const [confirmText, setConfirmText] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isValidConfirmation = confirmText === projectName
  const canDelete = isValidConfirmation && !isDeleting

  const handleDelete = async () => {
    if (!canDelete) return

    try {
      setIsDeleting(true)
      setError(null)
      await onConfirm()
      // Success - modal will be closed by parent
    } catch (err: any) {
      setError(err.message || 'Failed to delete project')
      setIsDeleting(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && canDelete) {
      handleDelete()
    }
  }

  // Portaled to body so parent card transforms (framer-motion hover) can't
  // trap position:fixed and clip / flicker the overlay.
  return createPortal(
    <AnimatePresence>
      <motion.div
        key="delete-project-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-[200]"
        style={{
          background: isDark
            ? 'rgba(0, 0, 0, 0.85)'
            : 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)'
        }}
        onClick={isDeleting ? undefined : onClose}
        aria-hidden="true"
      />

      <div className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none">
        <motion.div
          key="delete-project-panel"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18 }}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-project-title"
          className="pointer-events-auto relative w-full max-w-xl max-h-[min(90vh,720px)] flex flex-col rounded-2xl shadow-2xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden"
        >
          {/* Header with Warning Stripe */}
          <div className="relative shrink-0">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 via-orange-500 to-red-500" />

            <div className="p-6 pb-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 shrink-0">
                    <AlertTriangle className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <h2
                      id="delete-project-title"
                      className="text-xl font-bold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      Delete Project
                    </h2>
                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                      This action is permanent and cannot be undone
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isDeleting}
                  className="p-2 rounded-lg transition-all disabled:opacity-50 hover:bg-[var(--hover)] shrink-0"
                  style={{ color: 'var(--text-muted)' }}
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Scrollable content — keeps footer actions visible on short viewports */}
          <div className="px-6 pb-6 space-y-5 overflow-y-auto min-h-0 flex-1 overscroll-contain">
            {/* Warning Box */}
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="space-y-2 text-sm" style={{ color: 'var(--text-primary)' }}>
                  <p className="font-bold text-red-500">
                    WARNING: This will permanently delete ALL data associated with this project.
                  </p>
                  <p>
                    You are about to permanently delete <span className="font-bold">"{projectName}"</span>.
                  </p>
                  <p>This action cannot be undone.</p>
                </div>
              </div>
            </div>

            {/* What Will Be Deleted */}
            <div className="space-y-3">
              <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Deleting this project will permanently remove:
              </p>
              <div className="space-y-2 text-sm" style={{ color: 'var(--text-muted)' }}>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">•</span>
                  <span>Project information and metadata</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">•</span>
                  <span>All team member assignments</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">•</span>
                  <span>All QA Reports associated with this project</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">•</span>
                  <span>All Support & Exception Logs</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">•</span>
                  <span>All Release Testing Logs</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">•</span>
                  <span>Report History and generated reports</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">•</span>
                  <span>Dashboard data and analytics</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">•</span>
                  <span>Configuration data and settings</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-red-500 font-bold mt-0.5">•</span>
                  <span>Any other records related to this project</span>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
              <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                ⚠️ All associated data will be permanently deleted from the database. This action is irreversible.
              </p>
            </div>

            {/* Type to Confirm */}
            <div className="space-y-2">
              <label
                className="block text-sm font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Type the project name to confirm
              </label>
              <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>
                Please type <span className="font-mono font-bold px-1.5 py-0.5 rounded bg-[var(--surface-secondary)]">{projectName}</span> to confirm deletion
              </p>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isDeleting}
                placeholder={`Type "${projectName}" here`}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all disabled:opacity-50 border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:border-red-500/50 focus:ring-2 focus:ring-red-500/20"
                autoFocus
              />
              {confirmText && !isValidConfirmation && (
                <p className="text-xs text-red-500 font-medium">
                  Project name does not match. Please type exactly: {projectName}
                </p>
              )}
              {isValidConfirmation && (
                <p className="text-xs text-green-500 font-medium flex items-center gap-1">
                  ✓ Project name confirmed
                </p>
              )}
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-500 font-medium">{error}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 border border-[var(--border)] bg-[var(--surface-secondary)] text-[var(--text-primary)] hover:bg-[var(--hover)]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={!canDelete}
                className="flex-1 px-4 py-2.5 rounded-xl font-bold text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-red-500 text-white hover:bg-red-600 flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    Delete Project
                  </>
                )}
              </button>
            </div>

            <p className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
              This action will permanently delete the project and all associated data
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>,
    document.body
  )
}
