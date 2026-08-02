/** Default: fix grammar/spelling/clarity without forcing a stylistic tone. */
export const CORRECTED_PROMPT =
  'Fix grammar, spelling, and punctuation. Improve clarity while preserving the original meaning and intent. Do not add fluff. Return only the corrected text, no preamble.'

export const DEFAULT_TONE_ID = 'corrected' as const

export const TONES = [
  { id: 'corrected', label: 'Corrected' },
  { id: 'professional', label: 'Professional' },
  { id: 'casual', label: 'Casual' },
  { id: 'polite', label: 'Polite' },
  { id: 'friendly', label: 'Friendly' },
  { id: 'confident', label: 'Confident' },
  { id: 'formal', label: 'Formal' },
  { id: 'concise', label: 'Concise' },
  { id: 'corporate', label: 'Corporate' },
  { id: 'genz', label: 'Gen Z' },
  { id: 'email', label: 'Email-Ready' },
] as const

export type ToneId = (typeof TONES)[number]['id']

export const TONE_PROMPTS: Record<ToneId, string> = {
  corrected: CORRECTED_PROMPT,
  professional: 'Rewrite the following text in a polished, professional tone. Return only the rewritten text.',
  casual: 'Rewrite the following text in a casual, conversational tone. Return only the rewritten text.',
  polite: 'Rewrite the following text in a polite, courteous tone. Return only the rewritten text.',
  friendly: 'Rewrite the following text in a warm, friendly tone. Return only the rewritten text.',
  confident: 'Rewrite the following text in a confident, assertive tone. Return only the rewritten text.',
  formal: 'Rewrite the following text in a formal tone. Return only the rewritten text.',
  concise: 'Rewrite the following text as concisely as possible. Return only the rewritten text.',
  corporate: 'Rewrite the following text in a corporate business tone. Return only the rewritten text.',
  genz: 'Rewrite the following text in a Gen Z internet tone. Return only the rewritten text.',
  email: 'Rewrite the following text as a ready-to-send email. Return only the rewritten text.',
}

export function getToneLabel(id: ToneId): string {
  return TONES.find((t) => t.id === id)?.label ?? 'Corrected'
}
