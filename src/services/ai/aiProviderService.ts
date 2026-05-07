// src/services/ai/aiProviderService.ts
// Admin CRUD + user-facing gateway call.
// API keys are NEVER handled on the frontend.

import { supabase } from '@/lib/supabase'

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

async function authHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Not authenticated')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session.access_token}`
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

// ── Admin API ─────────────────────────────────────────────────────────────────

export const aiProviderService = {
  async list(): Promise<AIProviderConfig[]> {
    const headers = await authHeaders()
    const res = await fetch(`${FUNCTIONS_URL}/admin-ai-config`, { headers })
    if (!res.ok) throw new Error((await res.json()).error)
    return res.json()
  },

  async create(payload: CreateProviderPayload): Promise<AIProviderConfig> {
    const headers = await authHeaders()
    const res = await fetch(`${FUNCTIONS_URL}/admin-ai-config`, {
      method: 'POST', headers, body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error((await res.json()).error)
    return res.json()
  },

  async update(id: string, payload: UpdateProviderPayload): Promise<AIProviderConfig> {
    const headers = await authHeaders()
    const res = await fetch(`${FUNCTIONS_URL}/admin-ai-config?id=${id}`, {
      method: 'PUT', headers, body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error((await res.json()).error)
    return res.json()
  },

  async remove(id: string): Promise<void> {
    const headers = await authHeaders()
    const res = await fetch(`${FUNCTIONS_URL}/admin-ai-config?id=${id}`, {
      method: 'DELETE', headers
    })
    if (!res.ok) throw new Error((await res.json()).error)
  },

  async testConnection(id: string): Promise<{ ok: boolean; latency: number; error?: string }> {
    const start = Date.now()
    try {
      const headers = await authHeaders()
      const res = await fetch(`${FUNCTIONS_URL}/ai-gateway`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt: 'Reply with: OK', module: 'connection_test', _test_provider_id: id })
      })
      const data = await res.json()
      console.log('[testConnection]', { ok: res.ok, status: res.status, data })
      return { ok: res.ok, latency: Date.now() - start, error: data.error }
    } catch (e: any) {
      console.log('[testConnection] fetch error', e.message)
      return { ok: false, latency: Date.now() - start, error: e.message }
    }
  }
}

// ── User-facing gateway call ──────────────────────────────────────────────────

export async function callAIGateway(payload: {
  prompt: string
  systemPrompt?: string
  module?: string
}): Promise<string> {
  const headers = await authHeaders()
  const res = await fetch(`${FUNCTIONS_URL}/ai-gateway`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'AI request failed' }))
    throw new Error(err.error || 'AI request failed')
  }
  const data = await res.json()
  return data.content
}
