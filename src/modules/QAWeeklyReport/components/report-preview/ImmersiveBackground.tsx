import React, { useEffect, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

interface ImmersiveBackgroundProps {
  theme: 'light' | 'dark'
  enabled: boolean
  /** Pause canvas + heavy animation while modals/overlays are open (preserves battery & GPU) */
  paused?: boolean
}

// 5x5 micro dot-matrix typographic glyphs
const MICRO_GLYPHS: Record<string, number[][]> = {
  // Arrow matching uploaded studio reference
  arrow: [
    [0, 0, 1, 0, 0],
    [0, 0, 0, 1, 0],
    [1, 1, 1, 0, 1],
    [0, 0, 0, 1, 0],
    [0, 0, 1, 0, 0],
  ],
  // Plus / crosshair telemetry glyph
  cross: [
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [1, 1, 1, 1, 1],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
  ],
  // Percent % symbol
  percent: [
    [1, 1, 0, 0, 1],
    [1, 1, 0, 1, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 0, 1, 1],
    [1, 0, 0, 1, 1],
  ],
  // Diamond motif
  diamond: [
    [0, 0, 1, 0, 0],
    [0, 1, 0, 1, 0],
    [1, 0, 0, 0, 1],
    [0, 1, 0, 1, 0],
    [0, 0, 1, 0, 0],
  ],
  // Q
  Q: [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 1, 0],
    [0, 1, 1, 0, 1],
  ],
  // A
  A: [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  // 1
  '1': [
    [0, 0, 1, 0, 0],
    [0, 1, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 0, 1, 0, 0],
    [0, 1, 1, 1, 0],
  ],
  // 0
  '0': [
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
  ],
}

interface FloatingGlyphCluster {
  xRatio: number
  yRatio: number
  glyphs: string[]
  dotSpacing: number
  driftAngle: number
  driftSpeed: number
  phase: number
  pulseSpeed: number
  baseAlpha: number
}

/**
 * Premium Dot-Matrix Background Animation:
 * Matches the application UI color palette in both Light & Dark modes.
 * Features:
 * - Fluid interactive dot-matrix field with cursor-reactive waves
 * - Oceanic sine-traveling pulse wave across the entire matrix
 * - Floating Swiss studio micro dot-matrix typographic clusters (Arrows, % Telemetry, QA, Crosshairs)
 * - Atmospheric Aurora backdrops matched to application indigo/slate UI colors
 */
export function ImmersiveBackground({ theme, enabled, paused = false }: ImmersiveBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const pointerRef = useRef({ x: -1000, y: -1000, currentX: -1000, currentY: -1000 })
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  const mouseX = useMotionValue(0.5)
  const mouseY = useMotionValue(0.5)
  const springX = useSpring(mouseX, { stiffness: 35, damping: 20, mass: 0.7 })
  const springY = useSpring(mouseY, { stiffness: 35, damping: 20, mass: 0.7 })

  const auraOneX = useTransform(springX, [0, 1], ['-3%', '3%'])
  const auraOneY = useTransform(springY, [0, 1], ['-3%', '3%'])
  const auraTwoX = useTransform(springX, [0, 1], ['2.5%', '-2.5%'])
  const auraTwoY = useTransform(springY, [0, 1], ['2.5%', '-2.5%'])
  const auraThreeX = useTransform(springX, [0, 1], ['-2%', '2%'])
  const auraThreeY = useTransform(springY, [0, 1], ['1.5%', '-1.5%'])

  useEffect(() => {
    if (!enabled || paused) return

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
      pointerRef.current.x = e.clientX
      pointerRef.current.y = e.clientY
      if (pointerRef.current.currentX < -500) {
        pointerRef.current.currentX = e.clientX
        pointerRef.current.currentY = e.clientY
      }
      pendingX = e.clientX / Math.max(1, window.innerWidth)
      pendingY = e.clientY / Math.max(1, window.innerHeight)
      dirty = true
      if (!rafId) rafId = requestAnimationFrame(flush)
    }

    const handleLeave = () => {
      pointerRef.current.x = -1000
      pointerRef.current.y = -1000
    }

    window.addEventListener('mousemove', handleMove, { passive: true })
    window.addEventListener('mouseleave', handleLeave)

    return () => {
      window.removeEventListener('mousemove', handleMove)
      window.removeEventListener('mouseleave', handleLeave)
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
    let width = 0
    let height = 0
    let dpr = 1

    const handleResize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * dpr)
      canvas.height = Math.floor(height * dpr)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
    }
    handleResize()
    window.addEventListener('resize', handleResize)

    // Setup 7 curated floating dot-matrix typographic clusters scattered across background
    const clusters: FloatingGlyphCluster[] = [
      { xRatio: 0.08, yRatio: 0.16, glyphs: ['arrow'], dotSpacing: 5.5, driftAngle: 0.3, driftSpeed: 0.04, phase: 0.2, pulseSpeed: 0.02, baseAlpha: 0.35 },
      { xRatio: 0.88, yRatio: 0.14, glyphs: ['cross'], dotSpacing: 5.5, driftAngle: 2.1, driftSpeed: 0.03, phase: 1.5, pulseSpeed: 0.018, baseAlpha: 0.32 },
      { xRatio: 0.92, yRatio: 0.48, glyphs: ['1', '0', '0', 'percent'], dotSpacing: 5.0, driftAngle: 3.4, driftSpeed: 0.035, phase: 2.8, pulseSpeed: 0.022, baseAlpha: 0.38 },
      { xRatio: 0.06, yRatio: 0.62, glyphs: ['Q', 'A'], dotSpacing: 5.2, driftAngle: 1.2, driftSpeed: 0.03, phase: 4.1, pulseSpeed: 0.016, baseAlpha: 0.34 },
      { xRatio: 0.84, yRatio: 0.82, glyphs: ['arrow'], dotSpacing: 5.5, driftAngle: 4.8, driftSpeed: 0.04, phase: 5.3, pulseSpeed: 0.02, baseAlpha: 0.36 },
      { xRatio: 0.14, yRatio: 0.88, glyphs: ['diamond'], dotSpacing: 5.5, driftAngle: 0.8, driftSpeed: 0.03, phase: 3.2, pulseSpeed: 0.019, baseAlpha: 0.3 },
      { xRatio: 0.52, yRatio: 0.06, glyphs: ['cross'], dotSpacing: 5.0, driftAngle: 2.7, driftSpeed: 0.025, phase: 0.8, pulseSpeed: 0.015, baseAlpha: 0.25 },
    ]

    let time = 0
    const GRID_STEP = 36 // Regular pitch for the dot-matrix canvas field

    const isDark = theme === 'dark'
    // Color Palette matching Application UI
    const unlitColor = isDark ? 'rgba(99, 102, 241, 0.065)' : 'rgba(99, 102, 241, 0.05)'
    const waveLitColor = isDark ? 'rgba(129, 140, 248, ALPHA)' : 'rgba(79, 70, 229, ALPHA)'
    const cursorLitColor = isDark ? 'rgba(129, 140, 248, ALPHA)' : 'rgba(79, 70, 229, ALPHA)'
    const glyphLitColor = isDark ? 'rgba(129, 140, 248, ALPHA)' : 'rgba(79, 70, 229, ALPHA)'
    const glyphUnlitColor = isDark ? 'rgba(99, 102, 241, 0.055)' : 'rgba(99, 102, 241, 0.04)'

    const drawFrame = () => {
      time += 1
      ctx.save()
      ctx.scale(dpr, dpr)
      ctx.clearRect(0, 0, width, height)

      // Smooth pointer trailing lerp
      const p = pointerRef.current
      if (p.x > -500) {
        p.currentX += (p.x - p.currentX) * 0.12
        p.currentY += (p.y - p.currentY) * 0.12
      } else {
        p.currentX = -1000
        p.currentY = -1000
      }

      const ptrX = p.currentX
      const ptrY = p.currentY
      const mouseRadius = 220
      const mouseRadiusSq = mouseRadius * mouseRadius

      // ── 1. Draw Background Dot-Matrix Field ──────────────────────────
      const wavePhase = time * 0.024
      const xCount = Math.ceil(width / GRID_STEP) + 1
      const yCount = Math.ceil(height / GRID_STEP) + 1

      for (let ix = 0; ix < xCount; ix++) {
        const x = ix * GRID_STEP
        for (let iy = 0; iy < yCount; iy++) {
          const y = iy * GRID_STEP

          // Diagonal traveling sine wave
          const waveVal = Math.sin((x * 0.0035 + y * 0.0035) - wavePhase)
          const isWaveCrest = waveVal > 0.45

          // Cursor distance calculation
          let cursorFactor = 0
          if (ptrX > -500) {
            const dx = x - ptrX
            const dy = y - ptrY
            const distSq = dx * dx + dy * dy
            if (distSq < mouseRadiusSq) {
              const dist = Math.sqrt(distSq)
              cursorFactor = 1 - dist / mouseRadius
              cursorFactor = cursorFactor * cursorFactor // smooth quad falloff
            }
          }

          let dotRadius = isDark ? 1.25 : 1.15
          let fillStyle = unlitColor

          if (cursorFactor > 0.01) {
            // Illuminated by cursor
            dotRadius = (isDark ? 1.3 : 1.2) + cursorFactor * 1.6
            const alpha = (isDark ? 0.25 : 0.2) + cursorFactor * (isDark ? 0.65 : 0.55)
            fillStyle = cursorLitColor.replace('ALPHA', alpha.toFixed(3))
          } else if (isWaveCrest) {
            // Ambient wave crest
            const crestIntensity = (waveVal - 0.45) / 0.55
            dotRadius = (isDark ? 1.25 : 1.15) + crestIntensity * 0.5
            const alpha = crestIntensity * (isDark ? 0.22 : 0.16)
            fillStyle = waveLitColor.replace('ALPHA', alpha.toFixed(3))
          }

          ctx.beginPath()
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2)
          ctx.fillStyle = fillStyle
          ctx.fill()
        }
      }

      // ── 2. Draw Floating Swiss Studio Micro Dot-Matrix Typographic Clusters ──
      for (const cluster of clusters) {
        // Slow drifting movement
        cluster.xRatio += Math.cos(cluster.driftAngle) * (cluster.driftSpeed / width)
        cluster.yRatio += Math.sin(cluster.driftAngle) * (cluster.driftSpeed / height)

        if (cluster.xRatio < 0.02) cluster.xRatio = 0.98
        if (cluster.xRatio > 0.98) cluster.xRatio = 0.02
        if (cluster.yRatio < 0.04) cluster.yRatio = 0.96
        if (cluster.yRatio > 0.96) cluster.yRatio = 0.04

        const rootX = cluster.xRatio * width
        const rootY = cluster.yRatio * height

        // Breathing alpha pulse
        const pulse = 0.65 + 0.35 * Math.sin(time * cluster.pulseSpeed + cluster.phase)
        const activeAlpha = Math.min(1, Math.max(0.1, cluster.baseAlpha * pulse))

        let offsetX = 0
        const dotPitch = cluster.dotSpacing
        const dotR = dotPitch * 0.28

        for (const glyphKey of cluster.glyphs) {
          const matrix = MICRO_GLYPHS[glyphKey]
          if (!matrix) continue

          const rows = matrix.length
          const cols = matrix[0].length

          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const cell = matrix[r][c]
              const dx = rootX + offsetX + c * dotPitch
              const dy = rootY + r * dotPitch

              ctx.beginPath()
              ctx.arc(dx, dy, cell === 1 ? dotR * 1.15 : dotR * 0.75, 0, Math.PI * 2)
              ctx.fillStyle = cell === 1
                ? glyphLitColor.replace('ALPHA', activeAlpha.toFixed(3))
                : glyphUnlitColor
              ctx.fill()
            }
          }
          offsetX += cols * dotPitch + dotPitch * 1.5
        }
      }

      // ── 3. Subtle Luminous Pointer Halo ──────────────────────────────
      if (ptrX > -500) {
        const glowRadius = 140
        const glow = ctx.createRadialGradient(ptrX, ptrY, 0, ptrX, ptrY, glowRadius)
        glow.addColorStop(
          0,
          isDark ? 'rgba(99, 102, 241, 0.08)' : 'rgba(79, 70, 229, 0.05)'
        )
        glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
        ctx.fillStyle = glow
        ctx.fillRect(ptrX - glowRadius, ptrY - glowRadius, glowRadius * 2, glowRadius * 2)
      }

      ctx.restore()
    }

    const animate = () => {
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
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden print:hidden select-none">
      {/* ── Atmospheric Ambient UI Color Blooms ── */}
      <motion.div
        animate={
          paused
            ? undefined
            : {
                scale: [1, 1.12, 1],
                opacity: theme === 'dark' ? [0.22, 0.32, 0.22] : [0.12, 0.18, 0.12],
              }
        }
        transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute left-1/2 top-1/2 w-[1100px] h-[1100px] rounded-full blur-[140px]"
        style={{
          transform: 'translate(-50%, -50%)',
          background:
            theme === 'dark'
              ? 'radial-gradient(circle at 40% 40%, rgba(99,102,241,0.28), rgba(79,70,229,0.14) 42%, rgba(15,23,42,0.06) 70%, transparent 100%)'
              : 'radial-gradient(circle at 40% 40%, rgba(99,102,241,0.14), rgba(79,70,229,0.07) 42%, rgba(226,232,240,0.1) 70%, transparent 100%)',
        }}
      />

      <motion.div
        style={{ x: auraOneX, y: auraOneY }}
        animate={
          paused
            ? undefined
            : {
                scale: [1, 1.1, 1],
                opacity: theme === 'dark' ? [0.16, 0.24, 0.16] : [0.08, 0.14, 0.08],
              }
        }
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        className={`absolute top-[-10%] left-[18%] w-[620px] h-[620px] rounded-full blur-[130px] ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-indigo-600/30 to-blue-600/5'
            : 'bg-gradient-to-br from-indigo-400/20 to-sky-300/5'
        }`}
      />

      <motion.div
        style={{ x: auraTwoX, y: auraTwoY }}
        animate={
          paused
            ? undefined
            : {
                scale: [1, 1.08, 1],
                opacity: theme === 'dark' ? [0.14, 0.22, 0.14] : [0.07, 0.12, 0.07],
              }
        }
        transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut', delay: 1.2 }}
        className={`absolute bottom-[-10%] right-[-6%] w-[580px] h-[580px] rounded-full blur-[140px] ${
          theme === 'dark'
            ? 'bg-gradient-to-tr from-indigo-700/25 to-violet-600/5'
            : 'bg-gradient-to-tr from-indigo-400/18 to-purple-300/5'
        }`}
      />

      <motion.div
        style={{ x: auraThreeX, y: auraThreeY }}
        animate={
          paused
            ? undefined
            : {
                scale: [1, 1.08, 1],
                opacity: theme === 'dark' ? [0.12, 0.18, 0.12] : [0.06, 0.1, 0.06],
              }
        }
        transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut', delay: 2.4 }}
        className={`absolute top-[28%] left-[-12%] w-[480px] h-[480px] rounded-full blur-[120px] ${
          theme === 'dark'
            ? 'bg-gradient-to-tr from-blue-700/20 to-indigo-500/5'
            : 'bg-gradient-to-tr from-sky-400/15 to-indigo-300/5'
        }`}
      />

      {/* ── High-Performance Canvas for Dot-Matrix Field & Typographic Clusters ── */}
      <canvas ref={canvasRef} className="absolute inset-0 pointer-events-none" />
    </div>
  )
}
