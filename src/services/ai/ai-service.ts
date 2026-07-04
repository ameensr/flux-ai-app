// src/services/ai/ai-service.ts
// All AI requests go through the secure backend gateway.
// API keys are NEVER on the frontend.

import { callAIGateway, callAIGatewayStream } from './aiProviderService'
import type { AICallConfig, AIResponse } from './types'

// ── Config ────────────────────────────────────────────────────────────────────
const MAX_PROMPT_LENGTH = 100_000  // ~25k tokens — prevents accidental massive payloads
const MIN_PROMPT_LENGTH = 2        // at least 2 chars to be meaningful

export class AIService {
  /** Validates prompt before sending to the gateway */
  private static validateInput(prompt: string): void {
    if (!prompt || prompt.trim().length < MIN_PROMPT_LENGTH) {
      throw new Error('Prompt is too short. Please provide more context.')
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      throw new Error(
        `Input is too long (${Math.round(prompt.length / 1000)}k chars). ` +
        `Please shorten to under ${Math.round(MAX_PROMPT_LENGTH / 1000)}k characters.`
      )
    }
  }

  static async callAI({ prompt, options = {} }: AICallConfig): Promise<string> {
    const trimmed = prompt.trim()
    AIService.validateInput(trimmed)
    return callAIGateway({
      prompt: trimmed,
      systemPrompt: options.systemPrompt,
      module: options.module
    })
  }

  static async streamAI(
    { prompt, options = {} }: AICallConfig,
    onChunk: (text: string) => void
  ): Promise<void> {
    const trimmed = prompt.trim()
    AIService.validateInput(trimmed)
    const stream = await callAIGatewayStream({ prompt: trimmed, module: options.module, systemPrompt: options.systemPrompt })
    const reader = (stream as any).pipeThrough(new TextDecoderStream()).getReader()
    let buffer = ''
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += value
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''
      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const payload = line.slice(5).trim()
        if (payload === '[DONE]') return
        try {
          const json = JSON.parse(payload)
          // OpenAI-compat delta
          const delta = json.choices?.[0]?.delta?.content
          if (delta) { onChunk(delta); continue }
          // Anthropic delta
          if (json.type === 'content_block_delta') { onChunk(json.delta?.text ?? ''); continue }
          // Gemini
          const geminiText = json.candidates?.[0]?.content?.parts?.[0]?.text
          if (geminiText) onChunk(geminiText)
        } catch { /* skip malformed lines */ }
      }
    }
  }

}
