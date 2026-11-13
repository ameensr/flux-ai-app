import React from 'react'

export type ChartThemeId = 'light' | 'dark'

/**
 * Shared "premium fintech" chart presentation primitives for every recharts instance on
 * /report-preview — kept intentionally small and additive (gradient defs, a compact tooltip,
 * minimal axis/legend presets, a soft glow helper) rather than a chart architecture rewrite.
 * None of this touches data, calculations, or chart semantics — presentation only.
 */

/** True when the user has requested reduced motion at the OS/browser level. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * Whether a chart's entrance animation should play.
 * Plays fluidly on every load and refresh unless the user has requested reduced motion.
 */
export function resolveChartAnimation(_hasPlayed?: boolean): boolean {
  return !prefersReducedMotion()
}

function hexToRgba(hex: string, alpha: number): string {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean
  const num = parseInt(full, 16)
  if (isNaN(num)) return hex
  const r = (num >> 16) & 255
  const g = (num >> 8) & 255
  const b = num & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

/**
 * Soft ambient glow behind a chart line/area — a CSS `drop-shadow` (not an SVG blur filter),
 * so the line/fill itself stays crisp while a diffuse halo of the series color sits behind it.
 * Dark mode gets a stronger, more luminous glow; light mode gets a much subtler one so it
 * reads as a soft shadow rather than a neon effect.
 */
export function glowStyle(hex: string, theme: ChartThemeId): React.CSSProperties {
  const alpha = theme === 'dark' ? 0.5 : 0.22
  const blur = theme === 'dark' ? 7 : 4
  return { filter: `drop-shadow(0 0 ${blur}px ${hexToRgba(hex, alpha)})` }
}

/**
 * Renders an "atmospheric glow" area gradient (for use as an Area's `fill="url(#id)"`) — strong
 * just beneath the line, fading to fully transparent well before the bottom of the chart. This
 * intentionally never reaches a high, solid opacity so the fill reads as a soft glow rather than
 * a flat area fill.
 */
export function GlowAreaGradient({ id, color, theme }: { id: string; color: string; theme: ChartThemeId }) {
  const topOpacity = theme === 'dark' ? 0.4 : 0.2
  const midOpacity = theme === 'dark' ? 0.14 : 0.07
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={topOpacity} />
      <stop offset="35%" stopColor={color} stopOpacity={midOpacity} />
      <stop offset="100%" stopColor={color} stopOpacity={0} />
    </linearGradient>
  )
}

/**
 * Softer gradient for *stacked* area bands — unlike `GlowAreaGradient`, this never fades all
 * the way to transparent, since each band must stay visually distinguishable from the one
 * beneath it for the stack composition to read correctly.
 */
export function StackedAreaGradient({ id, color, theme }: { id: string; color: string; theme: ChartThemeId }) {
  const topOpacity = theme === 'dark' ? 0.55 : 0.4
  const bottomOpacity = theme === 'dark' ? 0.22 : 0.16
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={topOpacity} />
      <stop offset="100%" stopColor={color} stopOpacity={bottomOpacity} />
    </linearGradient>
  )
}

/** A subtle top-to-bottom gradient for bar fills — same color, gently tapering opacity. */
export function BarFillGradient({ id, color, theme }: { id: string; color: string; theme: ChartThemeId }) {
  const topOpacity = theme === 'dark' ? 0.95 : 0.9
  const bottomOpacity = theme === 'dark' ? 0.55 : 0.65
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} stopOpacity={topOpacity} />
      <stop offset="100%" stopColor={color} stopOpacity={bottomOpacity} />
    </linearGradient>
  )
}

/** Minimal, theme-aware axis props shared by every XAxis/YAxis — no axis line, no tick line. */
export function axisPreset(extra?: Record<string, unknown>) {
  return {
    stroke: 'var(--chart-text)',
    fontSize: 10,
    axisLine: false,
    tickLine: false,
    tickMargin: 8,
    ...extra,
  }
}

/** Compact, elegant legend preset — small circular swatches instead of the bulky default. */
export const legendPreset = {
  wrapperStyle: { fontSize: 11, paddingTop: 8 },
  iconType: 'circle' as const,
  iconSize: 8,
}

interface TooltipPayloadEntry {
  name?: string
  value?: number | string
  color?: string
  dataKey?: string | number
}

interface PremiumTooltipProps {
  active?: boolean
  label?: string | number
  payload?: TooltipPayloadEntry[]
  theme: ChartThemeId
  valueFormatter?: (value: number | string, name?: string) => React.ReactNode
}

/**
 * Compact, rounded, theme-aware tooltip shared by every recharts chart on report-preview —
 * replaces the bulky recharts default box with a small pill-like card: soft shadow, subtle
 * border, colored dot per series, clear name + value, and the label (date/category) on top.
 */
export function PremiumTooltip({ active, label, payload, theme, valueFormatter }: PremiumTooltipProps) {
  if (!active || !payload || !payload.length) return null
  return (
    <div
      className={`relative overflow-hidden rounded-2xl border px-3.5 py-2.5 text-xs backdrop-blur-2xl transition-all duration-200 ${
        theme === 'dark'
          ? 'bg-[#0f1424]/95 border-white/15 text-white shadow-[0_12px_36px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.15)]'
          : 'bg-white/95 border-slate-200/90 text-slate-900 shadow-[0_12px_36px_rgba(15,23,42,0.12),inset_0_1px_0_rgba(255,255,255,1)]'
      }`}
    >
      <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent pointer-events-none" />
      {label !== undefined && label !== null && (
        <div className={`text-[10px] font-bold uppercase tracking-wider mb-1.5 ${theme === 'dark' ? 'text-white/40' : 'text-slate-400'}`}>
          {label}
        </div>
      )}
      <div className="flex flex-col gap-1">
        {payload.map((entry, idx) => (
          <div key={idx} className="flex items-center gap-3 justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
              <span className={`truncate ${theme === 'dark' ? 'text-white/70' : 'text-slate-600'}`}>{entry.name}</span>
            </div>
            <span className="font-bold tabular-nums shrink-0">
              {valueFormatter ? valueFormatter(entry.value ?? '', entry.name) : entry.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Rounded-top-only radius — used on every Bar so stacked/grouped bars read as premium pills. */
export const BAR_RADIUS: [number, number, number, number] = [6, 6, 0, 0]
