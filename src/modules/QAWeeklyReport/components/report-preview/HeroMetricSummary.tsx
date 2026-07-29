import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'

type ThemeId = 'light' | 'dark'

interface HeroMetricSummaryProps {
  theme: ThemeId
  lines: string[]
  /** When true, fill the parent (used to align with side cards without growing the section). */
  fill?: boolean
}

/**
 * Low-opacity typing summary under the hero metric tiles.
 * Absolute-filled box: typing grows upward from the bottom with a soft top fade —
 * parent height stays stable (no layout shift while typing).
 */
export const HeroMetricSummary: React.FC<HeroMetricSummaryProps> = ({ theme, lines, fill = false }) => {
  const capped = lines.filter(Boolean).slice(0, 5)
  const [visibleCount, setVisibleCount] = useState(0)
  const [typedChars, setTypedChars] = useState(0)

  const linesKey = capped.join('\n')

  useEffect(() => {
    setVisibleCount(0)
    setTypedChars(0)
  }, [linesKey])

  useEffect(() => {
    if (capped.length === 0) return

    // Full pass complete — hold, then loop from the first line
    if (visibleCount >= capped.length) {
      const loop = window.setTimeout(() => {
        setVisibleCount(0)
        setTypedChars(0)
      }, 2200)
      return () => clearTimeout(loop)
    }

    const current = capped[visibleCount] || ''
    if (typedChars < current.length) {
      const t = window.setTimeout(() => setTypedChars(c => c + 1), 18)
      return () => clearTimeout(t)
    }

    const pause = window.setTimeout(() => {
      setVisibleCount(c => c + 1)
      setTypedChars(0)
    }, 420)
    return () => clearTimeout(pause)
  }, [capped, visibleCount, typedChars])

  if (capped.length === 0) return null

  const completed = capped.slice(0, Math.min(visibleCount, capped.length))
  const typing = visibleCount < capped.length
  const typingText = typing ? (capped[visibleCount] || '').slice(0, typedChars) : ''

  return (
    <div
      className={
        fill
          ? 'absolute inset-0 overflow-hidden pointer-events-none select-none'
          : 'relative mt-3 h-[6.5rem] max-w-2xl w-full overflow-hidden pointer-events-none select-none'
      }
      aria-live="polite"
    >
      {/* Soft fade on top */}
      <div
        className="absolute inset-x-0 top-0 h-7 z-[1] pointer-events-none"
        style={{
          background:
            theme === 'dark'
              ? 'linear-gradient(to bottom, rgba(7,10,19,0.95), transparent)'
              : 'linear-gradient(to bottom, rgba(248,250,252,0.98), transparent)',
        }}
      />

      {/* Bottom-anchored stack — typing starts at the bottom, older lines rise into the fade */}
      <div
        className={`absolute inset-0 flex flex-col justify-end gap-1.5 pb-0.5 max-w-2xl font-mono text-[11px] sm:text-xs leading-relaxed tracking-wide ${
          theme === 'dark' ? 'text-white/35' : 'text-slate-500/45'
        }`}
      >
        {completed.map((line, idx) => (
          <motion.p
            key={`done-${idx}-${line.slice(0, 24)}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
          >
            {line}
          </motion.p>
        ))}

        {typing && (
          <p className="min-h-[1.25em]">
            {typingText}
            <motion.span
              animate={{ opacity: [1, 0] }}
              transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
              className={`inline-block w-[6px] h-[12px] ml-0.5 align-middle ${
                theme === 'dark' ? 'bg-white/40' : 'bg-slate-400/50'
              }`}
            />
          </p>
        )}
      </div>
    </div>
  )
}

/** Build 3–5 summary lines from live report metrics. */
export function buildHeroMetricSummaryLines(input: {
  projectName: string
  releaseCount: number
  releasePassed: number
  passRate: number
  defectClosureRate: number
  qualityScore: number
  qualityLabel: string
  totalBugs?: number
  activeBugs?: number
  supportTickets?: number
}): string[] {
  const {
    projectName,
    releaseCount,
    releasePassed,
    passRate,
    defectClosureRate,
    qualityScore,
    qualityLabel,
    totalBugs,
    activeBugs,
    supportTickets,
  } = input

  const lines: string[] = []

  if (releaseCount > 0) {
    lines.push(
      `> ${projectName || 'Project'}: ${releasePassed}/${releaseCount} release items passed · Release Pass Rate ${passRate}%`,
    )
  } else {
    lines.push(`> ${projectName || 'Project'}: no release testing items logged this week`)
  }

  if (typeof totalBugs === 'number' && totalBugs > 0) {
    lines.push(
      `> Defect closure ${defectClosureRate}% across ${totalBugs} tracked bugs${
        typeof activeBugs === 'number' ? ` · ${activeBugs} still active` : ''
      }`,
    )
  } else {
    lines.push(`> Defect closure ${defectClosureRate}% (closed vs reported this week)`)
  }

  lines.push(`> Executive quality score ${qualityScore} — ${qualityLabel}`)

  if (typeof supportTickets === 'number' && supportTickets > 0) {
    lines.push(`> Support & exception log: ${supportTickets} ticket${supportTickets === 1 ? '' : 's'} in scope`)
  }

  if (releaseCount > 0 && passRate < 75) {
    lines.push(`> Release readiness watch: pass rate below 75% threshold`)
  } else if (typeof activeBugs === 'number' && activeBugs > 0 && defectClosureRate >= 60) {
    lines.push(`> Closure trend healthy; continue clearing ${activeBugs} active defect${activeBugs === 1 ? '' : 's'}`)
  }

  return lines.slice(0, 5)
}
