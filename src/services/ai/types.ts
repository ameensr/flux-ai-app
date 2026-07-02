// src/services/ai/types.ts

export interface AIResponse {
  content: string
  provider: string
  fallbackUsed?: boolean
}

export interface AICallConfig {
  prompt: string
  options?: {
    systemPrompt?: string
    module?: string
    timeout?: number
  }
}
