// Popup shown when a user is blocked from AI by the platform allowlist.

import React, { useEffect } from 'react'
import { Lock } from 'lucide-react'
import { useAIRestrictionStore } from '@/store/useAIRestrictionStore'

export function AIRestrictedModal() {
  const { open, message, close } = useAIRestrictionStore()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--overlay)' }}
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-restricted-title"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border p-6 shadow-xl"
        style={{
          backgroundColor: 'var(--surface-elevated)',
          borderColor: 'var(--border)',
        }}
      >
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-red-500/10 border border-red-500/20">
            <Lock className="w-5 h-5 text-red-400" />
          </div>
          <h3
            id="ai-restricted-title"
            className="text-sm font-bold"
            style={{ color: 'var(--text-primary)' }}
          >
            AI Access Restricted
          </h3>
          <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
            {message}
          </p>
          <button
            type="button"
            onClick={close}
            className="mt-2 w-full px-4 py-2.5 rounded-xl bg-accent-gold text-background text-sm font-bold hover:opacity-90 transition-opacity"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}
