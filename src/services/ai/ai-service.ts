import type { AIProvider, AIResponse, AICallConfig } from './types';
import { AI_SERVICE_CONFIG } from './types';

export class AIService {
  private static async getAuthToken(): Promise<string> {
    // In a real app, this would come from your auth provider (e.g., Supabase, Firebase)
    // For now, we'll return a placeholder or check localStorage
    return localStorage.getItem('flux_auth_token') || 'mock-token';
  }

  static async callAI({ provider, prompt, options = {} }: AICallConfig): Promise<string> {
    if (provider === 'mock') {
      return this.getMockResponse(options.module || 'generic');
    }

    const token = await this.getAuthToken();
    const timeout = options.timeout || (AI_SERVICE_CONFIG.providerTimeouts as any)[provider] || AI_SERVICE_CONFIG.defaultTimeout;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(AI_SERVICE_CONFIG.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          systemPrompt: options.systemPrompt || '',
          module: options.module || 'generic',
          provider: provider.toLowerCase()
        }),
        signal: controller.signal
      });

      clearTimeout(id);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(errorData.error || `AI request failed with status ${response.status}`);
      }

      const data = await response.json();
      return data.content || data.text || '';
    } catch (error: any) {
      clearTimeout(id);
      if (error.name === 'AbortError') {
        throw new Error(`Request timed out after ${timeout}ms`);
      }
      throw error;
    }
  }

  static async callAIWithFallback(config: AICallConfig): Promise<AIResponse> {
    const fallbackOrder: AIProvider[] = ['openai', 'gemini', 'nvidia', 'claude'];
    const primaryProvider = config.provider;

    try {
      const content = await this.callAI(config);
      return {
        content,
        provider: primaryProvider,
        fallbackUsed: false
      };
    } catch (primaryError: any) {
      console.warn(`Primary provider ${primaryProvider} failed:`, primaryError.message);

      for (const fallbackProvider of fallbackOrder) {
        if (fallbackProvider === primaryProvider) continue;

        try {
          console.log(`Attempting fallback to ${fallbackProvider}...`);
          const content = await this.callAI({ ...config, provider: fallbackProvider });
          return {
            content,
            provider: fallbackProvider,
            fallbackUsed: true,
            originalError: primaryError.message
          };
        } catch (fallbackError: any) {
          console.warn(`Fallback ${fallbackProvider} failed:`, fallbackError.message);
        }
      }

      throw new Error(`All providers failed. Last error: ${primaryError.message}`);
    }
  }

  private static getMockResponse(module: string): string {
    const mocks: Record<string, string> = {
      bugReport: "## AI Bug Report\n\n### Summary\nApplication crashes when clicking 'Save' on empty profile.\n\n### Severity\nCritical\n\n### Steps to Reproduce\n1. Go to Profile Settings\n2. Clear the 'Full Name' field\n3. Click 'Save Changes'\n\n### Expected Result\nValidation error message should appear.",
      testSuite: "[\n  {\"title\": \"Login with valid credentials\", \"priority\": \"High\"},\n  {\"title\": \"Login with invalid password\", \"priority\": \"Medium\"}\n]",
      generic: "This is a cinematic AI response from Flux AI."
    };
    return mocks[module] || mocks.generic;
  }
}
