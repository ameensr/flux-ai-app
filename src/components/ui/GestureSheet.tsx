import React, { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock'
import { usePrefersReducedMotion } from '@/hooks/usePrefersReducedMotion'
import {
  rubberband,
  sheetReleaseTarget,
  springDrawer,
  springFlick,
  springSettle,
} from '@/lib/motion'

type Sample = { t: number; x: number }

interface GestureSheetProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  side?: 'right'
  /** Pixel width used for projection / rubber-band. CSS max-width still applies. */
  width?: number
  className?: string
  style?: React.CSSProperties
  zIndex?: number
  labelledBy?: string
}

const HYSTERESIS = 10

function velocityPxPerSec(history: Sample[]): number {
  if (history.length < 2) return 0
  const last = history[history.length - 1]
  let first = history[0]
  for (let i = history.length - 2; i >= 0; i--) {
    if (last.t - history[i].t > 80) {
      first = history[i]
      break
    }
    first = history[i]
  }
  const dt = last.t - first.t
  if (dt <= 0) return 0
  return ((last.x - first.x) / dt) * 1000
}

/**
 * Interruptible right sheet: 1:1 pointer tracking, rubber-band past open,
 * velocity handoff, momentum projection. Reduced motion cross-fades.
 */
export function GestureSheet({
  open,
  onClose,
  children,
  width = 580,
  className,
  style,
  zIndex = 80,
  labelledBy,
}: GestureSheetProps) {
  const reduced = usePrefersReducedMotion()
  const panelRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<{ stop: () => void } | null>(null)
  const dragging = useRef(false)
  const committed = useRef(false)
  const ignored = useRef(false)
  const startPointerX = useRef(0)
  const startPointerY = useRef(0)
  const startSheetX = useRef(0)
  const history = useRef<Sample[]>([])
  const widthRef = useRef(width)
  const [mounted, setMounted] = useState(open)
  const [panelW, setPanelW] = useState(width)

  const x = useMotionValue(open ? 0 : width)
  const backdropOpacity = useTransform(x, [0, panelW || width], [1, 0])

  useBodyScrollLock(mounted)

  const stopAnim = () => {
    animRef.current?.stop()
    animRef.current = null
  }

  const measure = useCallback(() => {
    const w = panelRef.current?.offsetWidth || width
    widthRef.current = w
    setPanelW(w)
    return w
  }, [width])

  const springTo = useCallback((target: number, velocity: number, flicked: boolean) => {
    stopAnim()
    const spring = flicked ? springFlick : springDrawer
    const a = animate(x, target, { ...spring, velocity })
    animRef.current = a
    return a
  }, [x])

  useEffect(() => {
    if (open) {
      stopAnim()
      setMounted(true)
      return
    }
    if (!mounted) return
    if (reduced) {
      setMounted(false)
      return
    }
    const w = measure()
    const a = animate(x, w, {
      ...springSettle,
      onComplete: () => setMounted(false),
    })
    animRef.current = a
    return () => a.stop()
  }, [open, mounted, reduced, measure, x])

  useEffect(() => {
    if (!mounted || !open) return
    const w = measure()
    if (reduced) {
      x.set(0)
      return
    }
    if (Math.abs(x.get()) < 1) return
    if (x.get() >= w - 1) x.set(w)
    const a = animate(x, 0, springDrawer)
    animRef.current = a
    return () => a.stop()
  }, [mounted, open, reduced, measure, x])

  useEffect(() => {
    if (!mounted) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [mounted, onClose])

  const finishDrag = (clientX: number) => {
    if (!dragging.current) return
    dragging.current = false
    committed.current = false
    const w = widthRef.current
    history.current.push({ t: performance.now(), x: clientX })
    const v = velocityPxPerSec(history.current)
    const current = x.get()
    const { target, flicked } = sheetReleaseTarget(current, v, w)
    if (target >= w) {
      stopAnim()
      const a = animate(x, w, {
        ...(flicked ? springFlick : springDrawer),
        velocity: v,
        onComplete: () => {
          setMounted(false)
          onClose()
        },
      })
      animRef.current = a
    } else {
      springTo(0, v, flicked)
    }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (reduced || e.button !== 0) return
    ignored.current = false
    committed.current = false
    dragging.current = true
    startPointerX.current = e.clientX
    startPointerY.current = e.clientY
    startSheetX.current = x.get()
    history.current = [{ t: performance.now(), x: e.clientX }]
    stopAnim()
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || ignored.current) return
    const dx = e.clientX - startPointerX.current
    const dy = e.clientY - startPointerY.current

    if (!committed.current) {
      const adx = Math.abs(dx)
      const ady = Math.abs(dy)
      if (adx < HYSTERESIS && ady < HYSTERESIS) return
      if (ady > adx) {
        ignored.current = true
        dragging.current = false
        return
      }
      committed.current = true
      e.currentTarget.setPointerCapture(e.pointerId)
    }

    const w = widthRef.current
    let next = startSheetX.current + dx
    if (next < 0) next = -rubberband(-next, w)
    if (next > w) next = w + rubberband(next - w, w) * 0.15
    x.set(next)
    const hist = history.current
    hist.push({ t: performance.now(), x: e.clientX })
    if (hist.length > 6) hist.shift()
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (committed.current) {
      try { e.currentTarget.releasePointerCapture(e.pointerId) } catch { /* already released */ }
    }
    finishDrag(e.clientX)
  }

  if (!mounted || typeof document === 'undefined') return null

  return createPortal(
    <>
      <motion.div
        className="fixed inset-0"
        style={{
          zIndex,
          background: 'color-mix(in srgb, var(--overlay) 88%, transparent)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          opacity: reduced ? (open ? 1 : 0) : backdropOpacity,
          pointerEvents: open ? 'auto' : 'none',
        }}
        onClick={onClose}
        initial={reduced ? { opacity: 0 } : false}
        animate={reduced ? { opacity: 1 } : undefined}
        transition={{ duration: 0.2 }}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={className}
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          zIndex: zIndex + 1,
          width: '100%',
          maxWidth: width,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          x: reduced ? 0 : x,
          touchAction: 'pan-y',
          willChange: 'transform',
          ...style,
        }}
        initial={reduced ? { opacity: 0 } : false}
        animate={reduced ? { opacity: 1 } : undefined}
        transition={{ duration: 0.2 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          aria-hidden
          className="absolute left-0 top-1/2 -translate-y-1/2 z-20 flex items-center justify-center"
          style={{ width: 20, height: 64, cursor: 'grab', touchAction: 'none' }}
        >
          <span
            className="rounded-full"
            style={{
              width: 4,
              height: 36,
              background: 'var(--text-muted)',
              opacity: 0.45,
            }}
          />
        </div>
        {children}
      </motion.div>
    </>,
    document.body,
  )
}
