// src/components/LazyPanda/useLazyPanda.ts
// Custom hook that manages the Lazy Panda state, cursor tracking, idle timer, and blink cycle.

import { useCallback, useEffect, useRef, useState } from 'react'
import type { PandaContext, PandaEvent, PandaState } from './types'
import { DEFAULT_CONFIG } from './types'
import { createInitialContext, transition } from './PandaStateMachine'
import { usePandaConfigStore } from './pandaConfig'

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
    try { localStorage.setItem(STORAGE_KEY, String(v)) } catch { }
  }, [])
  return [enabled, toggle]
}

export function useLazyPanda(isSignUp = false): UseLazyPandaReturn {
  const [ctx, setCtx] = useState<PandaContext>(() => createInitialContext(isSignUp))
  const [eyeOffset, setEyeOffset] = useState({ x: 0, y: 0 })
  const [headRotation, setHeadRotation] = useState(0)
  const [isBlinking, setIsBlinking] = useState(false)

  // Subscribe to the entire config.features object to ensure reactivity
  const features = usePandaConfigStore(s => s.config.features)

  const idleTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastActivityRef = useRef(Date.now())
  const ctxRef = useRef(ctx)
  ctxRef.current = ctx

  // Debug: Log feature changes
  useEffect(() => {
    console.log('[LazyPanda] Features updated:', features)
  }, [features])

  // ── Dispatch event — respects feature toggles ───────────────────────────────
  const send = useCallback((event: PandaEvent) => {
    console.log('[LazyPanda] Event received:', event.type, 'Features:', features)

    setCtx(prev => {
      // Gate events behind their feature toggles
      if (event.type === 'EMAIL_FOCUS' || event.type === 'EMAIL_BLUR' || event.type === 'EMAIL_TYPING') {
        if (!features.emailTracking) {
          console.log('[LazyPanda] Email event blocked - emailTracking disabled')
          return prev
        }
      }
      if (event.type === 'PASSWORD_FOCUS' || event.type === 'PASSWORD_BLUR') {
        if (!features.passwordCover) {
          console.log('[LazyPanda] Password event blocked - passwordCover disabled')
          return prev
        }
      }
      if (event.type === 'PASSWORD_SHOW_TOGGLE') {
        if (!features.passwordPeek) {
          console.log('[LazyPanda] Password peek blocked - passwordPeek disabled')
          return prev
        }
        console.log('[LazyPanda] Password show toggle:', event.visible)
      }
      if (event.type === 'LOGIN_START') {
        if (!features.loadingAnimation) return prev
      }
      if (event.type === 'LOGIN_SUCCESS') {
        if (!features.loginSuccess) return prev
      }
      if (event.type === 'LOGIN_ERROR') {
        if (!features.loginFailure) return prev
      }

      const nextState = transition(prev, event)
      console.log('[LazyPanda] State transition:', prev.state, '→', nextState.state)
      return nextState
    })
    lastActivityRef.current = Date.now()
  }, [features])

  // ── Cursor tracking (only when emailTracking + cursorTracking enabled) ───────
  useEffect(() => {
    console.log('[LazyPanda] Cursor tracking effect - enabled:', features.cursorTracking, 'state:', ctxRef.current.state)

    const handleMouseMove = (e: MouseEvent) => {
      if (!features.cursorTracking) return
      if (ctxRef.current.state !== 'LOOKING_AT_EMAIL') return

      const cx = window.innerWidth / 2
      const cy = window.innerHeight / 2
      const dx = (e.clientX - cx) / cx
      const dy = (e.clientY - cy) / cy

      const eyeX = Math.max(-1, Math.min(1, dx)) * DEFAULT_CONFIG.maxEyeRotation
      const eyeY = Math.max(-1, Math.min(1, dy)) * DEFAULT_CONFIG.maxEyeRotation
      const headRot = Math.max(-DEFAULT_CONFIG.maxHeadRotation, Math.min(DEFAULT_CONFIG.maxHeadRotation, dx * DEFAULT_CONFIG.maxHeadRotation))

      setEyeOffset({ x: eyeX, y: eyeY })
      setHeadRotation(headRot)
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [features.cursorTracking])

  // Reset eye/head when leaving LOOKING_AT_EMAIL
  useEffect(() => {
    if (ctx.state !== 'LOOKING_AT_EMAIL') {
      setEyeOffset({ x: 0, y: 0 })
      setHeadRotation(0)
    }
  }, [ctx.state])

  // ── Idle timer → SLEEPING (only when idleSleep enabled) ─────────────────────
  useEffect(() => {
    idleTimerRef.current = setInterval(() => {
      if (!features.idleSleep) return
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
  }, [features.idleSleep])

  // ── Walking animation cycle (only when walking enabled) ──────────────────────
  useEffect(() => {
    if (!features.walking) {
      console.log('[LazyPanda] Walking disabled')
      return
    }

    console.log('[LazyPanda] Walking animation enabled')
    const walkCycle = setInterval(() => {
      const s = ctxRef.current.state
      const elapsed = Date.now() - lastActivityRef.current

      // Only walk if idle for 3-5 seconds (not long enough to sleep)
      if (elapsed > 3000 && elapsed < DEFAULT_CONFIG.sleepTimeout - 2000) {
        if (s === 'IDLE' && Math.random() > 0.7) {
          // 30% chance to start walking
          console.log('[LazyPanda] Starting walk animation')
          setCtx(prev => ({ ...prev, state: 'WALKING', prevState: prev.state }))
        } else if (s === 'WALKING' && Math.random() > 0.6) {
          // 40% chance to stop walking and return to idle
          console.log('[LazyPanda] Stopping walk animation')
          setCtx(prev => ({ ...prev, state: 'IDLE', prevState: prev.state }))
        }
      }
    }, 2500)

    return () => clearInterval(walkCycle)
  }, [features.walking])

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

  // ── Blink cycle (only when microAnimations enabled) ──────────────────────────
  useEffect(() => {
    const scheduleBlink = () => {
      const delay = DEFAULT_CONFIG.blinkMin + Math.random() * (DEFAULT_CONFIG.blinkMax - DEFAULT_CONFIG.blinkMin)
      blinkTimerRef.current = setTimeout(() => {
        if (features.microAnimations) {
          const s = ctxRef.current.state
          if (s !== 'PASSWORD_HIDE' && s !== 'SLEEPING') {
            setIsBlinking(true)
            setTimeout(() => setIsBlinking(false), 150)
          }
        }
        scheduleBlink()
      }, delay)
    }
    scheduleBlink()
    return () => {
      if (blinkTimerRef.current) clearTimeout(blinkTimerRef.current)
    }
  }, [features.microAnimations])

  return {
    ctx,
    send,
    eyeOffset,
    headRotation,
    isBlinking,
    isSleeping: ctx.state === 'SLEEPING',
  }
}
