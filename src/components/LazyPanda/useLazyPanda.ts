// src/components/LazyPanda/useLazyPanda.ts
// Custom hook that manages the Lazy Panda state, cursor tracking, idle timer, and blink cycle.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PandaContext, PandaEvent, PandaState } from './types'
import { DEFAULT_CONFIG } from './types'
import { createInitialContext, transition } from './PandaStateMachine'

export interface UseLazyPandaReturn {
  ctx: PandaContext
  send: (event: PandaEvent) => void
  eyeOffset: { x: number; y: number }
  headRotation: number
  isBlinking: boolean
  isSleeping: boolean
}

const STORAGE_KEY = 'qaly-panda-enabled'

export function usePandaEnabled(): [boolean, (v: boolean) => void] {
  const [enabled, setEnabled] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEY) !== 'false' } catch { return true }
  })
  const toggle = useCallback((v: boolean) => {
    setEnabled(v)
    try { localStorage.setItem(STORAGE_KEY, String(v)) } catch {}
  }, [])
  return [enabled, toggle]
}

export function useLazyPanda(isSignUp = false): UseLazyPandaReturn {
  const [ctx, setCtx] = useState<PandaContext>(() => createInitialContext(isSignUp))
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 })
  const [headRotation, setHeadRotation] = useState(0)
  const [isBlinking, setIsBlinking] = useState(false)

  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef(Date.now())
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx

  // ── Dispatch event ──────────────────────────────────────────────────────────
  const send = useCallback((event: PandaEvent) => {
    setCtx(prev => {
      const next = transition(prev, event)
      return next
    })
    lastActivityRef.current = Date.now()
  }, [])

  // ── Cursor tracking (only in LOOKING_AT_EMAIL state) ────────────────────────
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (ctxRef.current.state !== 'LOOKING_AT_EMAIL') return

      // Normalize mouse position relative to viewport center
      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const dx = (e.clientX - cx) / cx // -1 to 1
      const dy = (e.clientY - cy) / cy // -1 to 1

      // Clamp and apply max rotation
      const eyeX = Math.max(-1, Math.min(1, dx)) * DEFAULT_CONFIG.maxEyeRotation
      const eyeY = Math.max(-1, Math.min(1, dy)) * DEFAULT_CONFIG.maxEyeRotation
      const headRot = Math.max(-DEFAULT_CONFIG.maxHeadRotation, Math.min(DEFAULT_CONFIG.maxHeadRotation, dx * DEFAULT_CONFIG.maxHeadRotation))

      setEyeOffset({ x: eyeX, y: eyeY })
      setHeadRotation(headRot)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Reset eye/head when leaving LOOKING_AT_EMAIL
  useEffect(() => {
    if (ctx.state !== 'LOOKING_AT_EMAIL') {
      setEyeOffset({ x: 0, y: 0 })
      setHeadRotation(0)
    }
  }, [ctx.state])

  // ── Idle timer → SLEEPING ───────────────────────────────────────────────────
  useEffect(() => {
    idleTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current
      if (elapsed >= DEFAULT_CONFIG.sleepTimeout) {
        const s = ctxRef.current.state
        if (s === 'IDLE' || s === 'WALKING') {
          setCtx(prev => transition(prev, { type: 'IDLE_TIMEOUT' }))
        }
      }
    }, 2000)

    return () => {
      if (idleTimerRef.current) clearInterval(idleTimerRef.current)
    }
  }, [])

  // Wake up on any user activity
  useEffect(() => {
    const wake = () => {
      lastActivityRef.current = Date.now()
      if (ctxRef.current.state === 'SLEEPING') {
        setCtx(prev => transition(prev, { type: 'WAKE_UP' }))
      }
    }
    window.addEventListener('mousemove', wake, { passive: true })
    window.addEventListener('keydown', wake, { passive: true })
    window.addEventListener('scroll', wake, { passive: true })
    window.addEventListener('touchstart', wake, { passive: true })
    return () => {
      window.removeEventListener('mousemove', wake)
      window.removeEventListener('keydown', wake)
      window.removeEventListener('scroll', wake)
      window.removeEventListener('touchstart', wake)
    }
  }, [])

  // ── Blink cycle ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const scheduleBlink = () => {
      const delay = DEFAULT_CONFIG.blinkMin + Math.random() * (DEFAULT_CONFIG.blinkMax - DEFAULT_CONFIG.blinkMin)
      blinkTimerRef.current = setTimeout(() => {
        // Don't blink if eyes are covered
        const s = ctxRef.current.state
        if (s !== 'PASSWORD_HIDE' && s !== 'SLEEPING') {
          setIsBlinking(true)
          setTimeout(() => setIsBlinking(false), 150)
        }
        scheduleBlink()
      }, delay)
    }
    scheduleBlink()
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current)
    }
  }, [])

  return {
    ctx,
    send,
    eyeOffset,
    headRotation,
    isBlinking,
    isSleeping: ctx.state === 'SLEEPING',
  }
}
