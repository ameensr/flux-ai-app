export type AIProvider = 'openai' | 'nvidia' | 'gemini' | 'claude' | 'deepseek' | 'grok' | 'perplexity' | 'mock';

export interface AIResponse {
  content: string;
  provider: AIProvider;
  fallbackUsed?: boolean;
  originalError?: string;
}

export interface AICallConfig {
  provider: AIProvider;
  prompt: string;
  options?: {
    systemPrompt?: string;
    module?: string;
    timeout?: number;
  };
}

export const AI_SERVICE_CONFIG = {
  endpoint: '/api/ai/generate',
  defaultTimeout: 120000,
  providerTimeouts: {
    nvidia: 270000,
    claude: 90000,
    openai: 60000,
    gemini: 60000,
    deepseek: 60000,
    grok: 60000,
    perplexity: 60000
  }
};
