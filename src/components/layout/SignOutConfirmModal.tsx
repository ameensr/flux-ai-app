// Premium sign-out confirmation — frosted grayscale backdrop + glass card.

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { LogOut, X } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'

interface SignOutConfirmModalProps {
  open: boolean
  onCancel: () => void
  onConfirm: () => void | Promise<void>
  displayName?: string
}

export function SignOutConfirmModal({
  open,
  onCancel,
  onConfirm,
  displayName,
}: SignOutConfirmModalProps) {
  useBodyScrollLock(open)
  const [signingOut, setSigningOut] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) {
      setSigningOut(false)
      return
    }
    const t = setTimeout(() => cancelRef.current?.focus(), 80)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !signingOut) {
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
  }, [open, onCancel, signingOut])

  const handleConfirm = async () => {
    if (signingOut) return
    setSigningOut(true)
    try {
      await onConfirm()
    } catch {
      setSigningOut(false)
    }
  }

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="sign-out-confirm-title"
          aria-describedby="sign-out-confirm-desc"
        >
          {/* Backdrop — blur + black & white wash */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !signingOut && onCancel()}
            style={{
              background: 'rgba(8, 10, 14, 0.45)',
              backdropFilter: 'blur(4px) grayscale(1) saturate(0)',
              WebkitBackdropFilter: 'blur(4px) grayscale(1) saturate(0)',
            }}
          />

          {/* Soft vignette for depth */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(ellipse at center, transparent 20%, rgba(0,0,0,0.35) 100%)',
            }}
          />

          <motion.div
            ref={modalRef}
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 10 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
            className="relative w-full max-w-[360px] overflow-hidden rounded-3xl"
            style={{
              background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
              border: '1px solid var(--border)',
              boxShadow:
                '0 32px 64px -16px rgba(0,0,0,0.45), 0 0 0 1px color-mix(in srgb, var(--border) 60%, transparent)',
              backdropFilter: 'blur(24px)',
              WebkitBackdropFilter: 'blur(24px)',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Accent bar */}
            <div
              className="absolute top-0 left-0 right-0 h-[2px]"
              style={{
                background:
                  'linear-gradient(90deg, transparent, var(--accent), #f87171, transparent)',
              }}
            />

            <button
              type="button"
              onClick={onCancel}
              disabled={signingOut}
              aria-label="Close"
              className="absolute top-3.5 right-3.5 p-1.5 rounded-lg transition-colors disabled:opacity-40"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={e => {
                e.currentTarget.style.backgroundColor = 'var(--hover)'
                e.currentTarget.style.color = 'var(--text-primary)'
              }}
              onMouseLeave={e => {
                e.currentTarget.style.backgroundColor = 'transparent'
                e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-7 pt-9 pb-7 flex flex-col items-center text-center">
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.05, type: 'spring', stiffness: 280, damping: 18 }}
                className="mb-5 w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background:
                    'linear-gradient(145deg, rgba(248,113,113,0.18), rgba(248,113,113,0.06))',
                  border: '1px solid rgba(248,113,113,0.28)',
                  boxShadow: '0 8px 24px -8px rgba(248,113,113,0.35)',
                }}
              >
                <LogOut className="w-6 h-6 text-red-400" />
              </motion.div>

              <h2
                id="sign-out-confirm-title"
                className="text-lg font-bold tracking-tight mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Sign out?
              </h2>

              <p
                id="sign-out-confirm-desc"
                className="text-[13px] leading-relaxed mb-7 max-w-[280px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                {displayName
                  ? `End your session as ${displayName}. You can sign back in anytime.`
                  : 'End your current session. You can sign back in anytime.'}
              </p>

              <div className="w-full flex flex-col gap-2.5">
                <motion.button
                  type="button"
                  onClick={handleConfirm}
                  disabled={signingOut}
                  whileHover={signingOut ? undefined : { scale: 1.015 }}
                  whileTap={signingOut ? undefined : { scale: 0.985 }}
                  className="w-full py-3 rounded-2xl text-[13px] font-semibold tracking-wide transition-opacity disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{
                    background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                    color: '#fff',
                    boxShadow: '0 10px 28px -10px rgba(239,68,68,0.55)',
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  {signingOut ? 'Signing out…' : 'Yes, sign out'}
                </motion.button>

                <motion.button
                  ref={cancelRef}
                  type="button"
                  onClick={onCancel}
                  disabled={signingOut}
                  whileHover={signingOut ? undefined : { scale: 1.015 }}
                  whileTap={signingOut ? undefined : { scale: 0.985 }}
                  className="w-full py-3 rounded-2xl text-[13px] font-semibold tracking-wide transition-all disabled:opacity-50"
                  style={{
                    background: 'var(--hover)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  Stay signed in
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
