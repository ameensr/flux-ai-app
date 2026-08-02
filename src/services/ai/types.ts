// src/services/ai/types.ts

export interface AICallConfig {
  prompt: string
  options?: {
    systemPrompt?: string
    module?: string
    timeout?: number
  }
}
