import React, { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

interface ImmersiveBackgroundProps {
  theme: 'light' | 'dark'
  enabled: boolean
  /** Pause canvas + heavy animation while modals/overlays are open (keeps last frame). */
  paused?: boolean
}

interface Star {
  baseX: number
  baseY: number
  x: number
  y: number
  depth: number
  radius: number
  colorTemplate: string
  twinklePhase: number
  twinkleSpeed: number
  driftAngle: number
  driftSpeed: number
}

/**
 * Premium ambient backdrop for the report preview. Performance notes:
 * - Canvas loop pauses when `paused`, tab hidden, or reduced-motion is preferred
 * - Pointer updates are rAF-batched
 * - No continuous hue-rotate filter (expensive full-layer compositing)
 */
export function ImmersiveBackground({ theme, enabled, paused = false }: ImmersiveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef({ x: 0, y: 0 })
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)
  const springX = useSpring(mouseX, { stiffness: 35, damping: 18, mass: 0.7 })
  const springY = useSpring(mouseY, { stiffness: 35, damping: 18, mass: 0.7 })

  const auraOneX = useTransform(springX, [0, 1], ['-3%', '3%'])
  const auraOneY = useTransform(springY, [0, 1], ['-3%', '3%'])
  const auraTwoX = useTransform(springX, [0, 1], ['2.5%', '-2.5%'])
  const auraTwoY = useTransform(springY, [0, 1], ['2.5%', '-2.5%'])
  const auraThreeX = useTransform(springX, [0, 1], ['-2%', '2%'])
  const auraThreeY = useTransform(springY, [0, 1], ['1.5%', '-1.5%'])

  useEffect(() => {
    if (!enabled || paused) return
    pointerRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    let rafId = 0
    let pendingX = 0.5
    let pendingY = 0.5
    let dirty = false

    const flush = () => {
      rafId = 0
      if (!dirty) return
      dirty = false
      mouseX.set(pendingX)
      mouseY.set(pendingY)
    }

    const handleMove = (e: MouseEvent) => {
      pointerRef.current = { x: e.clientX, y: e.clientY }
      pendingX = e.clientX / Math.max(1, window.innerWidth)
      pendingY = e.clientY / Math.max(1, window.innerHeight)
      dirty = true
      if (!rafId) rafId = requestAnimationFrame(flush)
    }

    window.addEventListener('mousemove', handleMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMove)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [enabled, paused, mouseX, mouseY])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !enabled) return
    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    const prefersReduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    let animationFrameId = 0
    let width = (canvas.width = window.innerWidth)
    let height = (canvas.height = window.innerHeight)

    const handleResize = () => {
      width = canvas.width = window.innerWidth
      height = canvas.height = window.innerHeight
    }
    window.addEventListener('resize', handleResize)

    const colorTemplates = theme === 'dark'
      ? ['rgba(212,175,55,ALPHA)', 'rgba(96,165,250,ALPHA)', 'rgba(196,181,253,ALPHA)', 'rgba(255,255,255,ALPHA)']
      : ['rgba(184,150,12,ALPHA)', 'rgba(37,99,235,ALPHA)', 'rgba(124,58,237,ALPHA)', 'rgba(100,116,139,ALPHA)']

    const STAR_COUNT = prefersReduced ? 24 : 48
    const stars: Star[] = Array.from({ length: STAR_COUNT }, () => {
      const depth = 0.25 + Math.random() * 0.85
      const x = Math.random() * width
      const y = Math.random() * height
      return {
        baseX: x,
        baseY: y,
        x,
        y,
        depth,
        radius: depth * (Math.random() * 1.6 + 0.6),
        colorTemplate: colorTemplates[Math.floor(Math.random() * colorTemplates.length)],
        twinklePhase: Math.random() * Math.PI * 2,
        twinkleSpeed: 0.01 + Math.random() * 0.02,
        driftAngle: Math.random() * Math.PI * 2,
        driftSpeed: 0.04 + Math.random() * 0.06,
      }
    })

    let time = 0
    let frame = 0

    const drawFrame = () => {
      time += 1
      ctx.clearRect(0, 0, width, height)

      const { x: pointerX, y: pointerY } = pointerRef.current
      const nx = (pointerX / width) * 2 - 1
      const ny = (pointerY / height) * 2 - 1

      for (const s of stars) {
        s.baseX += Math.cos(s.driftAngle) * s.driftSpeed
        s.baseY += Math.sin(s.driftAngle) * s.driftSpeed
        if (s.baseX < -20) s.baseX = width + 20
        if (s.baseX > width + 20) s.baseX = -20
        if (s.baseY < -20) s.baseY = height + 20
        if (s.baseY > height + 20) s.baseY = -20

        const parallaxStrength = 24 * s.depth
        s.x = s.baseX - nx * parallaxStrength
        s.y = s.baseY - ny * parallaxStrength

        const twinkle = 0.4 + Math.sin(time * s.twinkleSpeed + s.twinklePhase) * 0.35
        const alpha = Math.min(1, Math.max(0, twinkle)) * (theme === 'dark' ? 0.55 : 0.32) * s.depth

        ctx.beginPath()
        ctx.arc(s.x, s.y, s.radius, 0, Math.PI * 2)
        ctx.fillStyle = s.colorTemplate.replace('ALPHA', alpha.toFixed(3))
        ctx.fill()
      }

      // Constellation lines every other frame to cut fill cost
      if (frame % 2 === 0) {
        const near = stars.filter(s => s.depth > 0.78)
        for (let i = 0; i < near.length; i++) {
          for (let j = i + 1; j < near.length; j++) {
            const a = near[i]
            const b = near[j]
            const dist = Math.hypot(a.x - b.x, a.y - b.y)
            if (dist < 120) {
              ctx.beginPath()
              ctx.moveTo(a.x, a.y)
              ctx.lineTo(b.x, b.y)
              ctx.strokeStyle = theme === 'dark'
                ? `rgba(255,255,255,${((1 - dist / 120) * 0.05).toFixed(3)})`
                : `rgba(15,23,42,${((1 - dist / 120) * 0.04).toFixed(3)})`
              ctx.lineWidth = 0.6
              ctx.stroke()
            }
          }
        }
      }

      const glowRadius = 180
      const glow = ctx.createRadialGradient(pointerX, pointerY, 0, pointerX, pointerY, glowRadius)
      glow.addColorStop(0, theme === 'dark' ? 'rgba(212,175,55,0.04)' : 'rgba(184,150,12,0.03)')
      glow.addColorStop(1, 'rgba(0,0,0,0)')
      ctx.fillStyle = glow
      ctx.fillRect(pointerX - glowRadius, pointerY - glowRadius, glowRadius * 2, glowRadius * 2)
    }

    const animate = () => {
      frame += 1
      const shouldRun =
        !pausedRef.current &&
        !prefersReduced &&
        typeof document !== 'undefined' &&
        !document.hidden

      if (shouldRun) {
        drawFrame()
      }
      animationFrameId = requestAnimationFrame(animate)
    }

    if (prefersReduced) {
      drawFrame()
    } else {
      animate()
    }

    const onVisibility = () => {
      // Force a fresh frame when returning to the tab
      if (!document.hidden && !pausedRef.current) drawFrame()
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [theme, enabled])

  if (!enabled) return null

  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden print:hidden">
      {/* Static-friendly auras: keep breathing only when not paused */}
      <motion.div
        animate={
          paused
            ? undefined
            : { scale: [1, 1.14, 1], opacity: theme === 'dark' ? [0.18, 0.28, 0.18] : [0.12, 0.18, 0.12] }
        }
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-1/2 top-1/2 w-[1000px] h-[1000px] rounded-full blur-[120px]"
        style={{
          transform: 'translate(-50%, -50%)',
          background: theme === 'dark'
            ? 'radial-gradient(circle at 32% 30%, rgba(212,175,55,0.5), rgba(59,130,246,0.28) 42%, rgba(168,85,247,0.2) 68%, transparent 100%)'
            : 'radial-gradient(circle at 32% 30%, rgba(250,204,21,0.38), rgba(96,165,250,0.2) 42%, rgba(196,181,253,0.14) 68%, transparent 100%)',
        }}
      />

      <motion.div
        style={{ x: auraOneX, y: auraOneY }}
        animate={paused ? undefined : { scale: [1, 1.12, 1], opacity: theme === 'dark' ? [0.12, 0.2, 0.12] : [0.08, 0.14, 0.08] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute top-[-15%] left-[20%] w-[560px] h-[560px] rounded-full blur-[120px] ${theme === 'dark' ? 'bg-gradient-to-br from-[#d4af37]/35 to-[#facc15]/5' : 'bg-gradient-to-br from-yellow-400/25 to-amber-300/5'}`}
      />
      <motion.div
        style={{ x: auraTwoX, y: auraTwoY }}
        animate={paused ? undefined : { scale: [1, 1.1, 1], opacity: theme === 'dark' ? [0.1, 0.18, 0.1] : [0.07, 0.12, 0.07] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 1.1 }}
        className={`absolute bottom-[-12%] right-[-5%] w-[520px] h-[520px] rounded-full blur-[130px] ${theme === 'dark' ? 'bg-gradient-to-tr from-blue-600/25 to-indigo-500/5' : 'bg-gradient-to-tr from-blue-400/20 to-sky-300/5'}`}
      />
      <motion.div
        style={{ x: auraThreeX, y: auraThreeY }}
        animate={paused ? undefined : { scale: [1, 1.1, 1], opacity: theme === 'dark' ? [0.09, 0.15, 0.09] : [0.06, 0.1, 0.06] }}
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 2.2 }}
        className={`absolute top-[30%] left-[-15%] w-[420px] h-[420px] rounded-full blur-[110px] ${theme === 'dark' ? 'bg-gradient-to-tr from-purple-600/20 to-pink-500/5' : 'bg-gradient-to-tr from-purple-400/16 to-fuchsia-300/5'}`}
      />

      <canvas ref={canvasRef} className="absolute inset-0" />
    </div>
  )
}
