// src/services/ai/ai-service.ts
// All AI requests go through the secure backend gateway.
// API keys are NEVER on the frontend.

import { callAIGateway, callAIGatewayStream } from './aiProviderService'
import type { AICallConfig, AIResponse } from './types'

export class AIService {
  static async callAI({ prompt, options = {} }: AICallConfig): Promise<string> {
    return callAIGateway({
      prompt: prompt.trim(),
      systemPrompt: options.systemPrompt,
      module: options.module
    })
  }

  static async streamAI(
    { prompt, options = {} }: AICallConfig,
    onChunk: (text: string) => void
  ): Promise<void> {
    const stream = await callAIGatewayStream({ prompt: prompt.trim(), module: options.module, systemPrompt: options.systemPrompt })
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
