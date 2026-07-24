import React from 'react'

type ThemeId = 'light' | 'dark'

interface ChartCalloutProps {
  viewBox?: { x?: number; y?: number; cx?: number; cy?: number }
  theme: ThemeId
  title: string
  value: string
  accent?: string
}

/**
 * Floating annotated callout pinned to a specific chart data point (not just a hover tooltip),
 * rendered as SVG so it composes inside a Recharts <ReferenceDot label={...}>. Recharts injects
 * `viewBox` with the pixel position of the anchor point (ReferenceDot uses cx/cy).
 */
export const ChartCallout: React.FC<ChartCalloutProps> = ({ viewBox, theme, title, value, accent = '#34d399' }) => {
  if (!viewBox) return null
  const x = viewBox.cx ?? viewBox.x ?? 0
  const y = viewBox.cy ?? viewBox.y ?? 0
  const boxW = 122
  const boxH = 42
  const bx = x - boxW / 2
  const by = Math.max(2, y - boxH - 16)

  return (
    <g style={{ pointerEvents: 'none' }}>
      <line x1={x} y1={y - 5} x2={x} y2={by + boxH} stroke={theme === 'dark' ? 'rgba(255,255,255,0.3)' : 'rgba(15,23,42,0.3)'} strokeWidth={1.5} strokeDasharray="2 3" />
      <rect x={bx} y={by} width={boxW} height={boxH} rx={12} fill={theme === 'dark' ? '#1c2538' : '#0f172a'} />
      <text x={bx + boxW / 2} y={by + 16} textAnchor="middle" fontSize={8} fontWeight={800} fill="rgba(255,255,255,0.55)" letterSpacing={0.6}>
        {title.toUpperCase()}
      </text>
      <text x={bx + boxW / 2} y={by + 31} textAnchor="middle" fontSize={13} fontWeight={800} fill={accent}>
        {value}
      </text>
    </g>
  )
}
