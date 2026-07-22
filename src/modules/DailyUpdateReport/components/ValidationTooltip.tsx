// src/modules/DailyUpdateReport/components/ValidationTooltip.tsx
// Hover-only validation error indicator for spreadsheet rows.
//
// Renders a small "!" icon inline (zero layout impact), and only mounts the
// error panel into a document.body portal while the icon is actually
// hovered. Position is computed from the icon's live bounding rect and the
// panel is `position: fixed`, so it always renders correctly aligned next to
// the icon regardless of the table's horizontal scroll, sticky columns, or
// row position — none of which a CSS-only `absolute` tooltip nested inside
// an `overflow-x-auto` + `sticky` cell can guarantee (that nesting is what
// caused the previous misalignment).

import React, { useRef, useState, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertCircle } from 'lucide-react'

interface ValidationTooltipProps {
  errors: string[]
}

export const ValidationTooltip: React.FC<ValidationTooltipProps> = ({ errors }) => {
  const [hovered, setHovered] = useState(false)
  const [coords, setCoords] = useState<{ top: number; left: number; flip: boolean } | null>(null)
  const iconRef = useRef<HTMLButtonElement>(null)
  const hasErrors = errors.length > 0

  const updatePosition = () => {
    const rect = iconRef.current?.getBoundingClientRect()
    if (!rect) return
    const panelWidth = 260
    const wouldOverflowRight = rect.right + 8 + panelWidth > window.innerWidth
    setCoords({
      top: rect.top + rect.height / 2,
      left: wouldOverflowRight ? rect.left - 8 : rect.right + 8,
      flip: wouldOverflowRight,
    })
  }

  // ⚠️ This effect must always run on every render (never behind an early
  // `return null` above it) — React requires the same hooks to fire in the
  // same order on every render of a given component instance. Previously
  // `if (errors.length === 0) return null` sat between the useState/useRef
  // calls and this useLayoutEffect, so a row whose `errors` array toggled
  // between empty and non-empty across re-renders (e.g. validation clearing
  // after a field is fixed) skipped this hook on some renders and not
  // others, throwing "Rendered fewer hooks than expected." The `hasErrors`
  // guard now lives only inside the effect body and the final render, never
  // before a hook call.
  useLayoutEffect(() => {
    if (!hovered || !hasErrors) return
    updatePosition()
    // Keep the tooltip glued to the icon if the table scrolls while hovered
    const handle = () => updatePosition()
    window.addEventListener('scroll', handle, true)
    window.addEventListener('resize', handle)
    return () => {
      window.removeEventListener('scroll', handle, true)
      window.removeEventListener('resize', handle)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hovered, hasErrors])

  if (!hasErrors) return null

  return (
    <>
      <button
        ref={iconRef}
        type="button"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onFocus={() => setHovered(true)}
        onBlur={() => setHovered(false)}
        className="shrink-0 leading-none"
        aria-label={`${errors.length} validation issue${errors.length === 1 ? '' : 's'}`}
      >
        <AlertCircle className="w-4 h-4 text-red-500 animate-pulse cursor-help" />
      </button>

      {createPortal(
        <AnimatePresence>
          {hovered && coords && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'fixed',
                top: coords.top,
                left: coords.left,
                transform: `translate(${coords.flip ? '-100%' : '0'}, -50%)`,
                width: 260,
                zIndex: 9999,
              }}
              className="pointer-events-none bg-red-950/95 border border-red-500/40 text-red-200 text-[10px] p-2.5 rounded-lg shadow-2xl backdrop-blur-md"
            >
              <span className="font-bold block border-b border-red-500/20 pb-1 mb-1">
                Validation Issue{errors.length === 1 ? '' : 's'}
              </span>
              {errors.map((err, i) => (
                <span key={i} className="block mt-0.5 leading-normal">• {err}</span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  )
}
