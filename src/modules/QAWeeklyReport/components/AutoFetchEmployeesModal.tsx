// src/modules/QAWeeklyReport/components/AutoFetchEmployeesModal.tsx
//
// Information / confirmation popup for "Auto Fetch Employees" in Team Resource
// Allocation. It never opens a file picker itself — it points the user at the
// existing Team Capacity Overview upload area.

import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Upload, X, FileSpreadsheet, EyeOff } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface AutoFetchEmployeesModalProps {
  open: boolean
  onCancel: () => void
  onGoToUpload: () => void
  /** Name of the capacity file already loaded on this report, if any. */
  loadedFileName?: string
  /** True when Team Capacity Overview is hidden via Dashboard Display Sections. */
  capacitySectionHidden?: boolean
}

export function AutoFetchEmployeesModal({
  open,
  onCancel,
  onGoToUpload,
  loadedFileName,
  capacitySectionHidden,
}: AutoFetchEmployeesModalProps) {
  useBodyScrollLock(open)
  const primaryRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const restoreFocusRef = useRef<HTMLElement | null>(null)

  // Remember the trigger so focus returns there on close (keyboard users).
  useEffect(() => {
    if (open) {
      restoreFocusRef.current =
        typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null
      const t = setTimeout(() => primaryRef.current?.focus(), 80)
      return () => clearTimeout(t)
    }
    const el = restoreFocusRef.current
    restoreFocusRef.current = null
    if (el && typeof el.focus === 'function') {
      const t = setTimeout(() => el.focus(), 0)
      return () => clearTimeout(t)
    }
    return undefined
  }, [open])

  // Escape to close + Tab focus trap.
  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onCancel()
        return
      }
      if (e.key !== 'Tab' || !modalRef.current) return

      const focusable = modalRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4 py-8 overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="auto-fetch-employees-title"
          aria-describedby="auto-fetch-employees-desc"
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
            style={{
              background: 'rgba(8, 10, 14, 0.45)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />

          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.94, y: 14 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 8 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="relative w-full max-w-[420px] my-auto overflow-hidden rounded-3xl"
            style={{
              background: 'var(--modal-bg, var(--card-bg))',
              border: '1px solid var(--border)',
              boxShadow: '0 32px 64px -16px rgba(0,0,0,0.45)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background:
                  'linear-gradient(90deg, transparent, var(--accent), rgba(99,102,241,0.35), transparent)',
              }}
            />

            <button
              type="button"
              onClick={onCancel}
              aria-label="Close Auto Fetch Employees"
              className="absolute top-3.5 right-3.5 p-1.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 sm:px-7 pt-8 pb-6 flex flex-col">
              <div className="flex items-start gap-3.5">
                <div
                  className="w-11 h-11 shrink-0 rounded-2xl flex items-center justify-center"
                  style={{
                    background:
                      'linear-gradient(145deg, rgba(99,102,241,0.20), rgba(99,102,241,0.06))',
                    border: '1px solid rgba(99,102,241,0.30)',
                    boxShadow: '0 8px 24px -10px rgba(99,102,241,0.45)',
                  }}
                >
                  <Sparkles className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                </div>
                <div className="min-w-0 pr-6">
                  <h2
                    id="auto-fetch-employees-title"
                    className="text-base font-bold tracking-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Auto Fetch Employees
                  </h2>
                  <p
                    id="auto-fetch-employees-desc"
                    className="text-[13px] leading-relaxed mt-1.5"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Upload the Team Capacity Overview to automatically fetch the employees for
                    this report.
                  </p>
                </div>
              </div>

              {loadedFileName && (
                <div
                  className="flex items-center gap-2.5 mt-4 p-3 rounded-xl"
                  style={{ background: 'var(--hover)', border: '1px solid var(--border)' }}
                >
                  <FileSpreadsheet
                    className="w-4 h-4 shrink-0"
                    style={{ color: 'var(--accent)' }}
                  />
                  <div className="min-w-0">
                    <span
                      className="block text-[11px] font-semibold truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {loadedFileName}
                    </span>
                    <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                      Already loaded — uploading again re-syncs the employee pool and keeps your
                      current assignments.
                    </span>
                  </div>
                </div>
              )}

              {capacitySectionHidden && (
                <div className="flex items-start gap-2.5 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/25">
                  <EyeOff className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-[11px] leading-relaxed text-amber-400">
                    Team Capacity Overview is currently hidden. Enable it under “Dashboard Display
                    Sections” to upload a file.
                  </span>
                </div>
              )}

              <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5 mt-6">
                <button
                  type="button"
                  onClick={onCancel}
                  className="px-4 py-2.5 rounded-xl text-[12px] font-bold tracking-wide transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold"
                  style={{
                    background: 'var(--hover)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Cancel
                </button>
                <button
                  ref={primaryRef}
                  type="button"
                  onClick={onGoToUpload}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-[12px] font-bold tracking-wide transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-gold"
                  style={{
                    background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                    color: 'var(--accent-fg, #fff)',
                    boxShadow: '0 10px 26px -12px rgba(99,102,241,0.65)',
                  }}
                >
                  <Upload className="w-3.5 h-3.5" />
                  Go to Upload
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
