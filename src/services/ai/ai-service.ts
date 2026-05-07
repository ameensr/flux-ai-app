// src/services/ai/ai-service.ts
// All AI requests go through the secure backend gateway.
// API keys are NEVER on the frontend.

import { callAIGateway } from './aiProviderService'
import type { AICallConfig, AIResponse } from './types'

export class AIService {
  static async callAI({ prompt, options = {} }: AICallConfig): Promise<string> {
    return callAIGateway({
      prompt: prompt.trim(),
      systemPrompt: options.systemPrompt,
      module: options.module
    })
  }

  static async callAIWithFallback(config: AICallConfig): Promise<AIResponse> {
    try {
      const content = await this.callAI(config)
      return { content, provider: 'openai', fallbackUsed: false }
    } catch (err: any) {
      throw new Error(err.message)
    }
  }
}
