export const QUICK_ACTION_PROMPTS: Record<string, string> = {
  shorten:      'Shorten this text to its absolute minimum while keeping the full meaning. Return only the shortened text.',
  expand:       'Expand this text with more detail, context, and clarity. Return only the expanded text.',
  grammar:      'Fix all grammar, spelling, and punctuation errors. Return only the corrected text.',
  professional: 'Rewrite this in a polished professional tone. Return only the rewritten text.',
  friendly:     'Rewrite this in a warm, friendly, approachable tone. Return only the rewritten text.',
  simplify:     'Simplify this text so anyone can understand it. Use plain, everyday language. Return only the simplified text.',
  clarity:      'Rewrite this for maximum clarity and readability. Remove ambiguity. Return only the rewritten text.',
}

export const TONES = [
  { id: 'professional', label: 'Professional', emoji: '💼' },
  { id: 'casual',       label: 'Casual',       emoji: '😊' },
  { id: 'polite',       label: 'Polite',        emoji: '🙏' },
  { id: 'friendly',     label: 'Friendly',      emoji: '👋' },
  { id: 'confident',    label: 'Confident',     emoji: '⚡' },
  { id: 'formal',       label: 'Formal',        emoji: '📋' },
  { id: 'concise',      label: 'Concise',       emoji: '✂️' },
  { id: 'corporate',    label: 'Corporate',     emoji: '🏢' },
  { id: 'genz',         label: 'Gen Z',         emoji: '🔥' },
  { id: 'email',        label: 'Email-Ready',   emoji: '📧' },
] as const

export type ToneId = typeof TONES[number]['id']

export interface ToneResults {
  context?: string
  professional?: string
  casual?: string
  polite?: string
  friendly?: string
  confident?: string
  formal?: string
  concise?: string
  corporate?: string
  genz?: string
  email?: string
}
