// src/services/ai/types.ts

export type AIProvider = 'openai' | 'anthropic' | 'gemini' | 'groq' | 'openrouter' | 'deepseek' | 'ollama'

export interface AIResponse {
  content: string
  provider: AIProvider | string
  fallbackUsed?: boolean
  originalError?: string
}

export interface AICallConfig {
  provider?: AIProvider  // ignored — gateway uses admin-configured active provider
  prompt: string
  options?: {
    systemPrompt?: string
    module?: string
    timeout?: number
  }
}
