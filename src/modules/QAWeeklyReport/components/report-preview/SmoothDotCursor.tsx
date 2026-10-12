import React, { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface SmoothDotCursorProps {
  enabled: boolean
  theme: 'light' | 'dark'
}

/**
 * Premium Smooth Dot Cursor for /report-preview
 *
 * Features:
 * - Fluid requestAnimationFrame lerp interpolation with zero React re-renders on pointermove
 * - Subtle ambient shadow glow that blooms softly while moving
 * - Adapts cleanly to dark and light backgrounds
 * - Respects prefers-reduced-motion (snaps without interpolation lag)
 * - Auto-disabled on touch devices (pointer: coarse)
 * - Tactile micro-interactions on interactive hover and click
 * - portal-mounted to document.body for unaffected fixed positioning
 */
export const SmoothDotCursor: React.FC<SmoothDotCursorProps> = ({ enabled, theme }) => {
  const cursorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!enabled) return

    // Disable completely on touch / mobile devices with coarse pointer
    const isTouchDevice =
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches ||
        (!window.matchMedia('(pointer: fine)').matches && 'ontouchstart' in window))

    if (isTouchDevice) return

    const cursorEl = cursorRef.current
    if (!cursorEl) return

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let targetX = -100
    let targetY = -100
    let currentX = -100
    let currentY = -100
    let lastX = -100
    let lastY = -100
    let isMoving = false
    let isVisible = false
    let stopTimeout: number | null = null
    let rafId: number | null = null

    // Snappy, agile lerp factor: silky smooth without sluggish trailing
    const LERP_FACTOR = prefersReducedMotion ? 1 : 0.36

    const handlePointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return

      targetX = e.clientX
      targetY = e.clientY

      if (!isVisible) {
        isVisible = true
        // Initialize position on first detected move inside viewport
        if (currentX < 0) {
          currentX = targetX
          currentY = targetY
        }
        cursorEl.style.opacity = '1'
      }

      // Check movement delta for "subtle shadow glow while moving"
      const delta = Math.hypot(targetX - lastX, targetY - lastY)
      if (delta > 1.2) {
        if (!isMoving) {
          isMoving = true
          cursorEl.setAttribute('data-moving', 'true')
        }
        if (stopTimeout) window.clearTimeout(stopTimeout)
        stopTimeout = window.setTimeout(() => {
          isMoving = false
          cursorEl.removeAttribute('data-moving')
        }, 110)
        lastX = targetX
        lastY = targetY
      }
    }

    const handlePointerOver = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null
      if (!target) return
      const interactive = target.closest(
        'button, a, input, textarea, select, [role="button"], [role="tab"], [role="switch"], [tabindex]:not([tabindex="-1"])'
      )
      if (interactive) {
        cursorEl.setAttribute('data-interactive', 'true')
      } else {
        cursorEl.removeAttribute('data-interactive')
      }
    }

    const handlePointerDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return
      cursorEl.setAttribute('data-pressed', 'true')
    }

    const handlePointerUp = () => {
      cursorEl.removeAttribute('data-pressed')
    }

    const handleMouseLeave = () => {
      isVisible = false
      cursorEl.style.opacity = '0'
      cursorEl.removeAttribute('data-moving')
      cursorEl.removeAttribute('data-interactive')
      cursorEl.removeAttribute('data-pressed')
    }

    const handleMouseEnter = () => {
      isVisible = true
      cursorEl.style.opacity = '1'
    }

    // Animation loop for fluid 60-144fps tracking
    const updateCursor = () => {
      if (prefersReducedMotion) {
        currentX = targetX
        currentY = targetY
      } else {
        currentX += (targetX - currentX) * LERP_FACTOR
        currentY += (targetY - currentY) * LERP_FACTOR
      }

      cursorEl.style.transform = `translate3d(${currentX}px, ${currentY}px, 0) translate(-50%, -50%)`
      rafId = window.requestAnimationFrame(updateCursor)
    }

    rafId = window.requestAnimationFrame(updateCursor)

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerover', handlePointerOver, { passive: true })
    window.addEventListener('pointerdown', handlePointerDown, { passive: true })
    window.addEventListener('pointerup', handlePointerUp, { passive: true })
    document.documentElement.addEventListener('mouseleave', handleMouseLeave)
    document.documentElement.addEventListener('mouseenter', handleMouseEnter)

    return () => {
      if (rafId) window.cancelAnimationFrame(rafId)
      if (stopTimeout) window.clearTimeout(stopTimeout)
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerover', handlePointerOver)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
      document.documentElement.removeEventListener('mouseleave', handleMouseLeave)
      document.documentElement.removeEventListener('mouseenter', handleMouseEnter)
    }
  }, [enabled])

  if (!enabled || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <>
      <style>{`
        .qaly-report-preview-scope.custom-cursor-active,
        .qaly-report-preview-scope.custom-cursor-active * {
          cursor: none !important;
        }

        .qaly-smooth-dot-cursor {
          position: fixed;
          top: 0;
          left: 0;
          z-index: 999999;
          pointer-events: none !important;
          user-select: none;
          contain: layout style;
          will-change: transform, opacity;
          transform: translate3d(-100px, -100px, 0) translate(-50%, -50%);
          transition: opacity 0.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .qaly-smooth-dot-cursor .qaly-cursor-aura {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 26px;
          height: 26px;
          transform: translate(-50%, -50%) scale(0.8);
          border-radius: 50%;
          pointer-events: none;
          opacity: 0.35;
          transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1),
                      opacity 0.22s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .qaly-smooth-dot-cursor[data-moving="true"] .qaly-cursor-aura {
          transform: translate(-50%, -50%) scale(1.35);
          opacity: 0.8;
        }

        .qaly-smooth-dot-cursor.theme-dark .qaly-cursor-aura {
          background: radial-gradient(circle, rgba(56, 189, 248, 0.55) 0%, rgba(37, 99, 235, 0.28) 42%, transparent 70%);
          filter: blur(1.5px);
        }

        .qaly-smooth-dot-cursor.theme-dark .qaly-cursor-dot {
          background: radial-gradient(circle at 35% 35%, #60a5fa 0%, #2563eb 65%, #1d4ed8 100%);
          box-shadow:
            0 0 6px 1.5px rgba(56, 189, 248, 0.7),
            0 0 16px 3px rgba(37, 99, 235, 0.45),
            0 2px 6px rgba(0, 0, 0, 0.7);
        }

        .qaly-smooth-dot-cursor.theme-dark[data-moving="true"] .qaly-cursor-dot {
          box-shadow:
            0 0 10px 2.5px rgba(96, 165, 250, 0.95),
            0 0 24px 6px rgba(37, 99, 235, 0.7),
            0 3px 10px rgba(0, 0, 0, 0.85);
        }

        .qaly-smooth-dot-cursor.theme-light .qaly-cursor-aura {
          background: radial-gradient(circle, rgba(37, 99, 235, 0.42) 0%, rgba(30, 64, 175, 0.18) 45%, transparent 70%);
          filter: blur(1.5px);
        }

        .qaly-smooth-dot-cursor.theme-light .qaly-cursor-dot {
          background: radial-gradient(circle at 35% 35%, #38bdf8 0%, #2563eb 70%, #1e40af 100%);
          box-shadow:
            0 0 0 1.2px rgba(255, 255, 255, 0.95),
            0 2px 7px rgba(30, 64, 175, 0.35),
            0 0 12px rgba(56, 189, 248, 0.3);
        }

        .qaly-smooth-dot-cursor.theme-light[data-moving="true"] .qaly-cursor-dot {
          box-shadow:
            0 0 0 1.5px rgba(255, 255, 255, 1),
            0 4px 14px rgba(30, 64, 175, 0.45),
            0 0 18px rgba(37, 99, 235, 0.55);
        }

        .qaly-cursor-dot {
          position: relative;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          pointer-events: none;
          transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1),
                      box-shadow 0.2s cubic-bezier(0.16, 1, 0.3, 1),
                      background-color 0.2s ease;
        }

        .qaly-smooth-dot-cursor[data-interactive="true"] .qaly-cursor-dot {
          transform: scale(1.3);
        }

        .qaly-smooth-dot-cursor[data-interactive="true"] .qaly-cursor-aura {
          transform: translate(-50%, -50%) scale(1.45);
          opacity: 0.85;
        }

        .qaly-smooth-dot-cursor[data-pressed="true"] .qaly-cursor-dot {
          transform: scale(0.85);
        }

        @media (pointer: coarse) {
          .qaly-smooth-dot-cursor {
            display: none !important;
          }
        }

        @media print {
          .qaly-smooth-dot-cursor {
            display: none !important;
          }
        }
      `}</style>
      <div
        ref={cursorRef}
        className={`qaly-smooth-dot-cursor ${theme === 'dark' ? 'theme-dark' : 'theme-light'}`}
        style={{ opacity: 0 }}
        aria-hidden="true"
      >
        {/* Ambient shadow glow aura — soft bloom while moving */}
        <div className="qaly-cursor-aura" />
        {/* Precision core dot */}
        <div className="qaly-cursor-dot" />
      </div>
    </>,
    document.body
  )
}
