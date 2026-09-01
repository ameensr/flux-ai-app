import React, { useLayoutEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface FitToBoxProps {
  children: React.ReactNode
  className?: string
  /** Floor so content never becomes unreadable. */
  minScale?: number
}

/**
 * Scales children down (never up) so they stay fully visible inside the parent.
 * Used on /login so browser zoom cannot create a page scrollbar.
 */
export function FitToBox({ children, className, minScale = 0.55 }: FitToBoxProps) {
  const parentRef = useRef<HTMLDivElement>(null)
  const childRef = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(1)

  useLayoutEffect(() => {
    const parent = parentRef.current
    const child = childRef.current
    if (!parent || !child) return

    let frame = 0
    const update = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const prect = parent.getBoundingClientRect()
        const vv = window.visualViewport
        const visibleLeft = vv ? Math.max(prect.left, vv.offsetLeft) : prect.left
        const visibleTop = vv ? Math.max(prect.top, vv.offsetTop) : prect.top
        const visibleRight = vv ? Math.min(prect.right, vv.offsetLeft + vv.width) : prect.right
        const visibleBottom = vv ? Math.min(prect.bottom, vv.offsetTop + vv.height) : prect.bottom
        const availW = Math.max(0, visibleRight - visibleLeft)
        const availH = Math.max(0, visibleBottom - visibleTop)
        const needW = child.offsetWidth
        const needH = child.offsetHeight
        if (availW < 1 || availH < 1 || needW < 1 || needH < 1) return
        const next = Math.min(1, availW / needW, availH / needH)
        const clamped = Math.max(minScale, next)
        setScale(prev => (Math.abs(prev - clamped) < 0.008 ? prev : clamped))
      })
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(parent)
    ro.observe(child)
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [minScale])

  return (
    <div
      ref={parentRef}
      className={cn('flex h-full w-full min-h-0 min-w-0 items-center justify-center overflow-hidden', className)}
    >
      <div
        ref={childRef}
        style={{
          transform: scale === 1 ? undefined : `scale(${scale})`,
          transformOrigin: 'center center',
        }}
      >
        {children}
      </div>
    </div>
  )
}
