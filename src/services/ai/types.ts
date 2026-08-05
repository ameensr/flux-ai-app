// src/services/ai/types.ts

export interface AIProviderInfo {
  provider: string
  model: string
}

export interface AICallConfig {
  prompt: string
  options?: {
    systemPrompt?: string
    module?: string
    timeout?: number
    /** Optional completion budget (test suites, etc.) */
    maxTokens?: number
    /** Fired when the backend reports which provider served the response */
    onProvider?: (info: AIProviderInfo) => void
  }
}
