// src/services/ai/aiProviderService.ts
// AI Provider Service — calls OpenRouter directly.
// API key is loaded from Supabase ai_provider_configs table (set via Admin UI).
// Falls back to env variable VITE_OPENROUTER_API_KEY if no DB config found.

import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import { hasModulePermission } from '@/lib/rbac'

// ── Config ────────────────────────────────────────────────────────────────────
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const REQUEST_TIMEOUT_MS = 45_000
const MAX_RETRIES = 2
const RETRY_DELAY_MS = 1500
const TRANSIENT_STATUS_CODES = [429, 500, 502, 503, 504]

const DEFAULT_MODEL = 'openai/gpt-4o-mini'
const BASIC_MODEL = 'openai/gpt-4o-mini'  // Free-tier/basic model for users without advanced AI
const DEFAULT_MAX_TOKENS = 4096
const DEFAULT_TEMPERATURE = 0.7

const SITE_URL = window.location.origin
const SITE_NAME = 'Qaly AI Engine'

// ── API Key Management ────────────────────────────────────────────────────────

let cachedApiKey: string | null = null
let cachedModel: string = DEFAULT_MODEL
let cachedMaxTokens: number = DEFAULT_MAX_TOKENS
let cachedTemperature: number = DEFAULT_TEMPERATURE
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 min

async function getProviderConfig(): Promise<{
  apiKey: string
  model: string
  maxTokens: number
  temperature: number
}> {
  const now = Date.now()

  // Return cached if still fresh
  if (cachedApiKey && now - cacheTimestamp < CACHE_TTL) {
    return {
      apiKey: cachedApiKey,
      model: cachedModel,
      maxTokens: cachedMaxTokens,
      temperature: cachedTemperature,
    }
  }

  // Try loading from Supabase ai_provider_configs
  try {
    const { data } = await supabase
      .from('ai_provider_configs')
      .select('encrypted_api_key, model_name, max_tokens, temperature')
      .eq('is_active', true)
      .eq('is_enabled', true)
      .order('provider_priority', { ascending: true })
      .limit(1)
      .single()

    if (data?.encrypted_api_key) {
      cachedApiKey = data.encrypted_api_key
      cachedModel = data.model_name || DEFAULT_MODEL
      cachedMaxTokens = data.max_tokens || DEFAULT_MAX_TOKENS
      cachedTemperature = data.temperature ?? DEFAULT_TEMPERATURE
      cacheTimestamp = now
      return {
        apiKey: data.encrypted_api_key as string,
        model: cachedModel,
        maxTokens: cachedMaxTokens,
        temperature: cachedTemperature,
      }
    }
  } catch {
    // DB unavailable — fall through to env var
  }

  // Fallback: env variable
  const envKey = import.meta.env.VITE_OPENROUTER_API_KEY
  if (envKey) {
    cachedApiKey = envKey
    cachedModel = DEFAULT_MODEL
    cachedMaxTokens = DEFAULT_MAX_TOKENS
    cachedTemperature = DEFAULT_TEMPERATURE
    cacheTimestamp = now
    return { apiKey: envKey, model: DEFAULT_MODEL, maxTokens: DEFAULT_MAX_TOKENS, temperature: DEFAULT_TEMPERATURE }
  }

  throw new Error('No AI provider configured. Please add an API key in Admin > AI Providers.')
}

/** Invalidate cached config (call after admin updates provider) */
export function invalidateProviderCache(): void {
  cachedApiKey = null
  cachedModel = DEFAULT_MODEL
  cachedMaxTokens = DEFAULT_MAX_TOKENS
  cachedTemperature = DEFAULT_TEMPERATURE
  cacheTimestamp = 0
}

/**
 * Check if the current user has can_use_advanced_ai permission for the given module.
 * Admins/super_admins always have access. Falls back to basic model if permission denied.
 */
function canUseAdvancedModel(module?: string): boolean {
  const { role, permissionMap } = useAppStore.getState()
  if (role === 'admin' || role === 'super_admin') return true
  if (!module) return true // if no module context, allow (backward compat)
  return hasModulePermission(permissionMap, module, 'can_use_advanced_ai')
}

/**
 * Resolves the effective model for the request — downgrades to basic model
 * if the user lacks can_use_advanced_ai permission for the calling module.
 */
function resolveModel(configModel: string, module?: string): string {
  if (canUseAdvancedModel(module)) return configModel
  // If configured model is the same as basic, no change needed
  if (configModel === BASIC_MODEL) return configModel
  // Downgrade to basic model
  return BASIC_MODEL
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Trusted domains for AI API calls */
const ALLOWED_HOSTS = ['openrouter.ai']

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function isTransientError(status: number): boolean {
  return TRANSIENT_STATUS_CODES.includes(status)
}

function validateUrl(url: string): void {
  try {
    const parsed = new URL(url)
    if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
      throw new Error(`Blocked request to untrusted host: ${parsed.hostname}`)
    }
  } catch (e: any) {
    if (e.message.startsWith('Blocked')) throw e
    throw new Error('Invalid URL provided for AI request')
  }
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  validateUrl(url)
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timeoutId)
  }
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AIProviderConfig {
  id: string
  provider_name: string
  model_name: string
  is_active: boolean
  is_enabled: boolean
  max_tokens: number
  temperature: number
  rate_limit_rpm: number | null
  monthly_budget: number | null
  provider_priority: number
  created_at: string
  updated_at: string
}

export interface CreateProviderPayload {
  provider_name: string
  api_key: string
  model_name: string
  is_active?: boolean
  is_enabled?: boolean
  max_tokens?: number
  temperature?: number
  rate_limit_rpm?: number | null
  monthly_budget?: number | null
  provider_priority?: number
}

export type UpdateProviderPayload = Partial<CreateProviderPayload>

// ── Admin API (Supabase direct — no Edge Function needed) ─────────────────────

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`
  }
}

export const aiProviderService = {
  async list(): Promise<AIProviderConfig[]> {
    const { data, error } = await supabase
      .from('ai_provider_configs')
      .select('*')
      .order('provider_priority')

    if (error) throw new Error(error.message)
    return (data ?? []) as AIProviderConfig[]
  },

  async create(payload: CreateProviderPayload): Promise<AIProviderConfig> {
    const { data: { session } } = await supabase.auth.getSession()
    const { data, error } = await supabase
      .from('ai_provider_configs')
      .insert({
        provider_name: payload.provider_name,
        model_name: payload.model_name,
        encrypted_api_key: payload.api_key,
        is_active: payload.is_active ?? true,
        is_enabled: payload.is_enabled ?? true,
        max_tokens: payload.max_tokens ?? DEFAULT_MAX_TOKENS,
        temperature: payload.temperature ?? DEFAULT_TEMPERATURE,
        rate_limit_rpm: payload.rate_limit_rpm ?? null,
        monthly_budget: payload.monthly_budget ?? null,
        provider_priority: payload.provider_priority ?? 1,
        created_by: session?.user?.id,
      })
      .select()
      .single()

    if (error) throw new Error(error.message)
    invalidateProviderCache()
    return data as AIProviderConfig
  },

  async update(id: string, payload: UpdateProviderPayload): Promise<AIProviderConfig> {
    const updateData: any = { ...payload }
    if (payload.api_key) {
      updateData.encrypted_api_key = payload.api_key
      delete updateData.api_key
    } else {
      delete updateData.api_key
    }

    const { data, error } = await supabase
      .from('ai_provider_configs')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) throw new Error(error.message)
    invalidateProviderCache()
    return data as AIProviderConfig
  },

  async remove(id: string): Promise<void> {
    // Clear any fallback references pointing to this provider
    await supabase
      .from('ai_provider_configs')
      .update({ fallback_provider_id: null })
      .eq('fallback_provider_id', id)

    // Clear usage logs referencing this provider
    await supabase
      .from('ai_usage_logs')
      .update({ provider_id: null })
      .eq('provider_id', id)

    const { error } = await supabase
      .from('ai_provider_configs')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
    invalidateProviderCache()
  },

  async testConnection(id: string): Promise<{ ok: boolean; latency: number; error?: string }> {
    const start = Date.now()
    try {
      const { data } = await supabase
        .from('ai_provider_configs')
        .select('encrypted_api_key, model_name')
        .eq('id', id)
        .single()

      if (!data?.encrypted_api_key) {
        return { ok: false, latency: Date.now() - start, error: 'No API key found for this provider' }
      }

      const res = await fetchWithTimeout(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.encrypted_api_key}`,
          'HTTP-Referer': SITE_URL,
          'X-Title': SITE_NAME,
        },
        body: JSON.stringify({
          model: data.model_name || DEFAULT_MODEL,
          messages: [{ role: 'user', content: 'Reply with exactly: OK' }],
          max_tokens: 10,
        }),
      }, 15_000)

      if (res.ok) {
        return { ok: true, latency: Date.now() - start }
      }

      const err = await res.json().catch(() => ({ error: { message: `HTTP ${res.status}` } }))
      return { ok: false, latency: Date.now() - start, error: err.error?.message || `HTTP ${res.status}` }
    } catch (e: any) {
      return { ok: false, latency: Date.now() - start, error: e.message }
    }
  }
}

// ── User-facing AI calls (direct to OpenRouter with retry) ────────────────────

/**
 * Calls OpenRouter with retry on transient failures.
 */
export async function callAIGateway(payload: {
  prompt: string
  systemPrompt?: string
  module?: string
}): Promise<string> {
  const config = await getProviderConfig()
  const effectiveModel = resolveModel(config.model, payload.module)
  let lastError = ''

  const messages: { role: string; content: string }[] = []
  if (payload.systemPrompt) {
    messages.push({ role: 'system', content: payload.systemPrompt })
  }
  messages.push({ role: 'user', content: payload.prompt })

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(OPENROUTER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
          'HTTP-Referer': SITE_URL,
          'X-Title': SITE_NAME,
        },
        body: JSON.stringify({
          model: effectiveModel,
          messages,
          max_tokens: config.maxTokens,
          temperature: config.temperature,
        }),
      }, REQUEST_TIMEOUT_MS)

      if (res.ok) {
        const data = await res.json()
        const content = data.choices?.[0]?.message?.content
        if (!content) throw new Error('AI returned empty response. Please try again.')
        return content
      }

      // Parse error
      const errBody = await res.json().catch(() => ({ error: { message: 'AI request failed' } }))
      lastError = errBody.error?.message || `Provider returned ${res.status}`

      if (isTransientError(res.status) && attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS * (attempt + 1))
        continue
      }

      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS)
        continue
      }
    } catch (e: any) {
      if (e.name === 'AbortError') {
        lastError = 'AI request timed out'
      } else {
        lastError = e.message || 'Network error'
      }
      if (attempt < MAX_RETRIES) {
        await delay(RETRY_DELAY_MS)
        continue
      }
    }
  }

  throw new Error(`${lastError}. All retry attempts exhausted. Please try again later.`)
}

/**
 * Streaming variant — calls OpenRouter with stream: true.
 */
export async function callAIGatewayStream(payload: {
  prompt: string
  module?: string
  systemPrompt?: string
}): Promise<ReadableStream<Uint8Array>> {
  const config = await getProviderConfig()
  const effectiveModel = resolveModel(config.model, payload.module)

  const messages: { role: string; content: string }[] = []
  if (payload.systemPrompt) {
    messages.push({ role: 'system', content: payload.systemPrompt })
  }
  messages.push({ role: 'user', content: payload.prompt })

  try {
    const res = await fetchWithTimeout(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'HTTP-Referer': SITE_URL,
        'X-Title': SITE_NAME,
      },
      body: JSON.stringify({
        model: effectiveModel,
        messages,
        max_tokens: config.maxTokens,
        temperature: config.temperature,
        stream: true,
      }),
    }, REQUEST_TIMEOUT_MS)

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: { message: 'AI stream request failed' } }))
      throw new Error(err.error?.message || 'AI stream request failed')
    }
    if (!res.body) throw new Error('No stream body received')
    return res.body
  } catch (e: any) {
    if (e.name === 'AbortError') {
      throw new Error('AI stream timed out. The provider may be overloaded — please try again.')
    }
    throw e
  }
}
