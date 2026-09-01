import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { modalCard, pressTap, springSettle } from '@/lib/motion'

export type ConfirmTone = 'danger' | 'default'

export interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
}

type Request = {
  opts: ConfirmOptions
  resolve: (value: boolean) => void
}

const ConfirmContext = createContext<(opts: ConfirmOptions) => Promise<boolean>>(
  async () => false,
)

export function useConfirm() {
  return useContext(ConfirmContext)
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<Request | null>(null)
  const queue = useRef<Request[]>([])

  const confirm = useCallback((opts: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const next = { opts, resolve }
      setRequest(current => {
        if (current) {
          queue.current.push(next)
          return current
        }
        return next
      })
    })
  }, [])

  const settle = useCallback((value: boolean) => {
    request?.resolve(value)
    const queued = queue.current.shift()
    setRequest(queued ?? null)
  }, [request])

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <ConfirmDialog
        open={!!request}
        options={request?.opts}
        onCancel={() => settle(false)}
        onConfirm={() => settle(true)}
      />
    </ConfirmContext.Provider>
  )
}

function ConfirmDialog({
  open,
  options,
  onCancel,
  onConfirm,
}: {
  open: boolean
  options?: ConfirmOptions
  onCancel: () => void
  onConfirm: () => void
}) {
  useBodyScrollLock(open)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const modalRef = useRef<HTMLDivElement>(null)
  const tone = options?.tone ?? 'danger'

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => cancelRef.current?.focus(), 40)
    return () => clearTimeout(t)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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

  const confirmBg = tone === 'danger'
    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
    : 'var(--accent)'
  const confirmColor = tone === 'danger' ? '#fff' : 'var(--accent-fg)'

  return createPortal(
    <AnimatePresence>
      {open && options && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="app-confirm-title"
          aria-describedby={options.description ? 'app-confirm-desc' : undefined}
        >
          <motion.div
            className="absolute inset-0"
            {...{ initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }}
            onClick={onCancel}
            style={{
              background: 'rgba(8, 10, 14, 0.45)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />
          <motion.div
            ref={modalRef}
            {...modalCard}
            transition={springSettle}
            className="relative w-full max-w-[380px] overflow-hidden rounded-3xl"
            style={{
              background: 'color-mix(in srgb, var(--surface) 88%, transparent)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={onCancel}
              aria-label="Close"
              className="absolute top-3.5 right-3.5 p-2 rounded-lg pressable"
              style={{ color: 'var(--text-muted)' }}
            >
              <X className="w-4 h-4" />
            </button>
            <div className="px-7 pt-9 pb-7 flex flex-col items-center text-center">
              <div
                className="mb-5 w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{
                  background: tone === 'danger'
                    ? 'linear-gradient(145deg, rgba(248,113,113,0.18), rgba(248,113,113,0.06))'
                    : 'color-mix(in srgb, var(--accent) 16%, transparent)',
                  border: tone === 'danger'
                    ? '1px solid rgba(248,113,113,0.28)'
                    : '1px solid color-mix(in srgb, var(--accent) 35%, transparent)',
                }}
              >
                <AlertTriangle
                  className="w-6 h-6"
                  style={{ color: tone === 'danger' ? '#f87171' : 'var(--accent)' }}
                />
              </div>
              <h2
                id="app-confirm-title"
                className="text-lg font-bold tracking-tight mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                {options.title}
              </h2>
              {options.description && (
                <p
                  id="app-confirm-desc"
                  className="text-[13px] leading-relaxed mb-7 max-w-[300px] whitespace-pre-wrap"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {options.description}
                </p>
              )}
              {!options.description && <div className="mb-7" />}
              <div className="w-full flex flex-col gap-2.5">
                <motion.button
                  type="button"
                  onClick={onConfirm}
                  whileTap={pressTap}
                  className="w-full py-3 rounded-2xl text-[13px] font-semibold"
                  style={{ background: confirmBg, color: confirmColor }}
                >
                  {options.confirmLabel || 'Confirm'}
                </motion.button>
                <motion.button
                  ref={cancelRef}
                  type="button"
                  onClick={onCancel}
                  whileTap={pressTap}
                  className="w-full py-3 rounded-2xl text-[13px] font-semibold"
                  style={{
                    background: 'var(--hover)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border)',
                  }}
                >
                  {options.cancelLabel || 'Cancel'}
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
