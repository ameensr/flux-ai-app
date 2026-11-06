// src/components/SyncReminderPopup.tsx
// Smart Sync Reminder — portal popover anchored above the Sync button.
// Uses fixed positioning so it is immune to any parent overflow/clip.

import React, { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { PandaSVG } from '@/components/LazyPanda/PandaSVG'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'

interface SyncReminderPopupProps {
  visible: boolean
  onDismiss: () => void
  anchorRef: React.RefObject<HTMLElement | null>
  displayName: string
  message: string
  formattedLastSync: string
}

const POPUP_WIDTH = 232

export function SyncReminderPopup({
  visible,
  onDismiss,
  anchorRef,
  displayName,
  message,
  formattedLastSync,
}: SyncReminderPopupProps) {
  const reduced = usePrefersReducedMotion()
  const popupRef = useRef<HTMLDivElement>(null)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [popupHeight, setPopupHeight] = useState(200)

  // Measure anchor position
  useEffect(() => {
    if (!visible || !anchorRef.current) { setRect(null); return }
    const measure = () => setRect(anchorRef.current!.getBoundingClientRect())
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('scroll', measure, true)
    }
  }, [visible, anchorRef])

  // Measure popup height after it renders
  useEffect(() => {
    if (popupRef.current) {
      setPopupHeight(popupRef.current.offsetHeight)
    }
  })

  if (!visible || !rect) return null

  // fixed coords: sit above the anchor with 8px gap
  const top  = rect.top - popupHeight - 8
  const left = rect.left

  // Clamp so it never goes off-screen left/right
  const clampedLeft = Math.max(8, Math.min(left, window.innerWidth - POPUP_WIDTH - 8))

  return createPortal(
    <AnimatePresence>
      {visible && (
        <motion.div
          ref={popupRef}
          key="sync-reminder-portal"
          initial={reduced ? { opacity: 0 } : { opacity: 0, y: 6, scale: 0.96 }}
          animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduced ? { opacity: 0 } : { opacity: 0, y: 4, scale: 0.97 }}
          transition={reduced ? { duration: 0.15 } : { duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          style={{
            position: 'fixed',
            top,
            left: clampedLeft,
            width: POPUP_WIDTH,
            zIndex: 99998,
          }}
          className="pointer-events-auto select-none"
          role="status"
          aria-live="polite"
        >
          <div className="flex flex-col items-start">

            {/* Panda above bubble */}
            <div className="relative ml-3 -mb-2 z-10">
              {!reduced && (
                <motion.div
                  className="absolute inset-0 rounded-full pointer-events-none"
                  style={{
                    background:
                      'radial-gradient(circle, rgba(99,102,241,0.2) 0%, transparent 70%)',
                    width: 48, height: 48, top: -4, left: -4,
                  }}
                  animate={{ scale: [1, 1.18, 1], opacity: [0.3, 0.75, 0.3] }}
                  transition={{ duration: 2.6, repeat: Infinity, ease: 'easeInOut' }}
                />
              )}
              <div className="w-10 h-10 drop-shadow-md">
                <PandaSVG
                  state="IDLE"
                  eyeOffset={{ x: 0, y: 0 }}
                  headRotation={-8}
                  isBlinking={false}
                  size={40}
                  reducedMotion={reduced}
                />
              </div>
            </div>

            {/* Bubble */}
            <div
              className="relative rounded-2xl px-4 py-3 w-full"
              style={{
                background:
                  'color-mix(in srgb, var(--surface) 95%, #6366f1 5%)',
                border: '1px solid color-mix(in srgb, var(--border) 70%, #6366f1 30%)',
                boxShadow:
                  '0 8px 24px -4px rgba(0,0,0,0.28), 0 0 0 1px rgba(255,255,255,0.05), 0 0 16px rgba(99,102,241,0.1)',
              }}
            >
              {/* Tail pointing down */}
              <div
                className="absolute -bottom-[7px] left-4 w-3 h-3 rotate-45"
                style={{
                  background: 'color-mix(in srgb, var(--surface) 95%, #6366f1 5%)',
                  borderRight: '1px solid color-mix(in srgb, var(--border) 70%, #6366f1 30%)',
                  borderBottom: '1px solid color-mix(in srgb, var(--border) 70%, #6366f1 30%)',
                }}
              />

              <div className="space-y-1.5">
                <p className="text-[11px] font-bold" style={{ color: 'var(--text-primary)' }}>
                  Hey {displayName}! 🐼
                </p>
                <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {message}
                </p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                  Last sync: {formattedLastSync}
                </p>
                <div className="pt-1">
                  <button
                    onClick={onDismiss}
                    className="w-full py-1.5 rounded-xl text-[11px] font-bold transition-all duration-150"
                    style={{
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(59,130,246,0.1))',
                      border: '1px solid rgba(99,102,241,0.2)',
                      color: 'var(--text-primary)',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background =
                        'linear-gradient(135deg, rgba(99,102,241,0.25), rgba(59,130,246,0.18))'
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background =
                        'linear-gradient(135deg, rgba(99,102,241,0.15), rgba(59,130,246,0.1))'
                    }}
                  >
                    Got it!
                  </button>
                </div>
              </div>
            </div>

          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  )
}
