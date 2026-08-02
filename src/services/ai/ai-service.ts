// src/services/ai/ai-service.ts
// All AI requests go through the FastAPI backend (Groq → Gemini → Kimi).
// API keys never leave the backend.

import { supabase } from '@/lib/supabase'
import { beginIdleOperation, withIdleOperation } from '@/lib/idleOperations'
import { useAIPlatformStore } from '@/store/useAIPlatformStore'
import { useAppStore } from '@/store/useAppStore'
import { AI_USER_RESTRICTED_MESSAGE } from '@/store/useAIRestrictionStore'
import type { AICallConfig } from './types'

const AI_DISABLED_MESSAGE = 'Centralised AI is disabled by an administrator.'

function assertAIEnabled(): void {
  const { enabled, configLoaded, isUserAllowed } = useAIPlatformStore.getState()
  if (!configLoaded) {
    throw new Error('AI configuration is still loading. Please try again.')
  }
  if (!enabled) {
    throw new Error(AI_DISABLED_MESSAGE)
  }
  const { user, role } = useAppStore.getState()
  const isAdmin = role === 'admin' || role === 'super_admin'
  if (isAdmin) return
  const userId = user?.id as string | undefined
  if (!isUserAllowed(userId)) {
    throw new Error(AI_USER_RESTRICTED_MESSAGE)
  }
}

const MAX_PROMPT_LENGTH = 100_000
const MIN_PROMPT_LENGTH = 2
const REQUEST_TIMEOUT_MS = 90_000

const FASTAPI_URL = (import.meta.env.VITE_FASTAPI_URL as string | undefined)?.replace(/\/$/, '') || 'http://localhost:8000'

function resolveEndpoint(module?: string): string {
  switch (module) {
    case 'test-case-generator':
    case 'test-generator':
      return `${FASTAPI_URL}/ai/test-cases`
    case 'bug-refiner':
      return `${FASTAPI_URL}/ai/bug-refine`
    case 'writing-assistant':
      return `${FASTAPI_URL}/ai/writing`
    default:
      return `${FASTAPI_URL}/ai/complete`
  }
}

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`,
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

export class AIService {
  private static validateInput(prompt: string): void {
    if (!prompt || prompt.trim().length < MIN_PROMPT_LENGTH) {
      throw new Error('Prompt is too short. Please provide more context.')
    }
    if (prompt.length > MAX_PROMPT_LENGTH) {
      throw new Error(
        `Input is too long (${Math.round(prompt.length / 1000)}k chars). ` +
        `Please shorten to under ${Math.round(MAX_PROMPT_LENGTH / 1000)}k characters.`,
      )
    }
  }

  static async callAI({ prompt, options = {} }: AICallConfig): Promise<string> {
    assertAIEnabled()
    const trimmed = prompt.trim()
    AIService.validateInput(trimmed)

    // Streaming endpoints (bug-refine, test-cases): accumulate SSE into a string.
    if (options.module === 'bug-refiner' || options.module === 'test-case-generator' || options.module === 'test-generator') {
      let full = ''
      await AIService.streamAI({ prompt: trimmed, options }, (chunk) => {
        full += chunk
      })
      if (!full.trim()) throw new Error('AI returned empty response. Please try again.')
      return full
    }

    return withIdleOperation(`ai:${options.module || 'default'}`, async () => {
      const headers = await authHeaders()
      const url = resolveEndpoint(options.module)

      try {
        const res = await fetchWithTimeout(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            prompt: trimmed,
            systemPrompt: options.systemPrompt,
          }),
        }, options.timeout ?? REQUEST_TIMEOUT_MS)

        const body = await res.json().catch(() => ({}))
        if (!res.ok) {
          const detail = typeof body.detail === 'string'
            ? body.detail
            : Array.isArray(body.detail)
              ? body.detail.map((d: any) => d.msg || JSON.stringify(d)).join('; ')
              : body.error
          throw new Error(detail || `AI request failed (${res.status})`)
        }
        const content = body.content
        if (!content) throw new Error('AI returned empty response. Please try again.')
        return content as string
      } catch (e: any) {
        if (e.name === 'AbortError') {
          throw new Error('AI request timed out. Please try again.')
        }
        throw e
      }
    })
  }

  static async streamAI(
    { prompt, options = {} }: AICallConfig,
    onChunk: (text: string) => void,
  ): Promise<void> {
    assertAIEnabled()
    const trimmed = prompt.trim()
    AIService.validateInput(trimmed)

    const release = beginIdleOperation(`ai-stream:${options.module || 'default'}`)
    try {
      const headers = await authHeaders()
      const url = resolveEndpoint(options.module)

      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          prompt: trimmed,
          systemPrompt: options.systemPrompt,
        }),
      }, options.timeout ?? REQUEST_TIMEOUT_MS)

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'AI stream request failed' }))
        throw new Error(err.detail || err.error || 'AI stream request failed')
      }
      if (!res.body) throw new Error('No stream body received')

      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader()
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
            const delta = json.choices?.[0]?.delta?.content
            if (delta) {
              onChunk(delta)
              continue
            }
            if (typeof json.text === 'string' && json.text) {
              onChunk(json.text)
            }
          } catch {
            /* skip malformed lines */
          }
        }
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        throw new Error('AI stream timed out. Please try again.')
      }
      throw e
    } finally {
      release()
    }
  }
}
