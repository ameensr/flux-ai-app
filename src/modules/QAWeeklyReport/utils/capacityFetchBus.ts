// src/modules/QAWeeklyReport/utils/capacityFetchBus.ts
//
// Lightweight one-way signal bus between the Team Capacity Overview upload card
// and the Team Resource Allocation card (Auto Fetch Employees).
//
// Both cards are siblings rendered by /qa-report and already share their real
// data through the QA report store (`form.teamCapacity`). This bus only carries
// *transient UI signals* — "scroll me to the upload area", "a parse just
// started / succeeded / failed" — so no report data or calculation lives here.

const EVENT_NAME = 'qa-report:capacity-fetch'

export type CapacityFetchSignal =
  /** Team Resource Allocation asked us to reveal + focus the upload area. */
  | { kind: 'focus-upload' }
  /** A capacity file started parsing. */
  | { kind: 'fetch-start'; fileName: string }
  /** A capacity file parsed successfully. */
  | { kind: 'fetch-success'; fileName: string; count: number }
  /** A capacity file failed to parse (or contained no usable employee rows). */
  | { kind: 'fetch-error'; reason: 'empty' | 'parse'; detail?: string }

/** User-facing copy for the Auto Fetch status line. */
export const CAPACITY_FETCH_MESSAGES = {
  loading: 'Fetching employees from Team Capacity Overview...',
  success: 'Employees fetched successfully.',
  empty: 'No eligible employees were found in the uploaded Team Capacity Overview.',
  error: 'Unable to read the Team Capacity Overview. Please verify the file format.',
} as const

/**
 * Map a parser/validator error onto the two user-facing failure buckets.
 * "empty" = the file was readable but held no eligible employee rows.
 */
export function classifyCapacityFailure(message: unknown): 'empty' | 'parse' {
  const m = String(message ?? '').toLowerCase()
  if (
    m.includes('no valid employee data') ||
    m.includes('no team members found') ||
    m.includes('no eligible')
  ) {
    return 'empty'
  }
  return 'parse'
}

export function emitCapacityFetchSignal(signal: CapacityFetchSignal): void {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return
  try {
    window.dispatchEvent(new CustomEvent<CapacityFetchSignal>(EVENT_NAME, { detail: signal }))
  } catch {
    /* Signals are best-effort UI sugar — never break the upload on failure. */
  }
}

/** Ask the Team Capacity Overview card to scroll into view and focus its upload area. */
export function requestCapacityUploadFocus(): void {
  emitCapacityFetchSignal({ kind: 'focus-upload' })
}

/** Subscribe to capacity fetch signals. Returns an unsubscribe function. */
export function subscribeCapacityFetchSignal(
  handler: (signal: CapacityFetchSignal) => void,
): () => void {
  if (typeof window === 'undefined' || typeof window.addEventListener !== 'function') {
    return () => {}
  }
  const listener = (e: Event) => {
    const detail = (e as CustomEvent<CapacityFetchSignal>).detail
    if (detail && typeof detail.kind === 'string') handler(detail)
  }
  window.addEventListener(EVENT_NAME, listener)
  return () => window.removeEventListener(EVENT_NAME, listener)
}
