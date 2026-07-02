// supabase/functions/ai-gateway/index.ts
// Centralized AI gateway. API keys NEVER leave this function.
// All authenticated users can call this; keys are decrypted server-side only.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ENCRYPTION_KEY_B64 = Deno.env.get('AI_KEY_ENCRYPTION_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ── Crypto ────────────────────────────────────────────────────────────────────

async function decrypt(stored: string): Promise<string> {
  const raw = Uint8Array.from(atob(ENCRYPTION_KEY_B64), c => c.charCodeAt(0))
  const key = await crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['decrypt'])
  const [ivB64, ctB64] = stored.split(':')
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0))
  const ct = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0))
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(plain)
}

// ── Auth ──────────────────────────────────────────────────────────────────────

async function requireAuth(req: Request) {
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jwt) throw new Error('Unauthorized')
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: { user }, error } = await supabase.auth.getUser(jwt)
  if (error || !user) throw new Error('Unauthorized')
  return { user, supabase }
}

// ── Provider adapters ─────────────────────────────────────────────────────────

interface ProviderRequest {
  apiKey: string
  model: string
  prompt: string
  systemPrompt?: string
  maxTokens: number
  temperature: number
}

// ── Streaming adapters ────────────────────────────────────────────────────────

function streamOpenAICompat(baseUrl: string, r: ProviderRequest): Promise<Response> {
  return fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${r.apiKey}` },
    body: JSON.stringify({
      model: r.model,
      messages: [
        ...(r.systemPrompt ? [{ role: 'system', content: r.systemPrompt }] : []),
        { role: 'user', content: r.prompt }
      ],
      max_tokens: r.maxTokens,
      temperature: r.temperature,
      stream: true
    })
  })
}

function streamAnthropic(r: ProviderRequest): Promise<Response> {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': r.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': 'messages-2023-06-01'
    },
    body: JSON.stringify({
      model: r.model,
      max_tokens: r.maxTokens,
      ...(r.systemPrompt ? { system: r.systemPrompt } : {}),
      messages: [{ role: 'user', content: r.prompt }],
      stream: true
    })
  })
}

function streamGemini(r: ProviderRequest): Promise<Response> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${r.model}:streamGenerateContent?key=${r.apiKey}&alt=sse`
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: r.prompt }] }],
      generationConfig: { maxOutputTokens: r.maxTokens, temperature: r.temperature }
    })
  })
}

const STREAMING_BASE_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  deepseek: 'https://api.deepseek.com/v1',
  nvidia: 'https://integrate.api.nvidia.com/v1',
}

async function dispatchStream(providerName: string, r: ProviderRequest): Promise<Response> {
  if (providerName === 'anthropic') return streamAnthropic(r)
  if (providerName === 'gemini') return streamGemini(r)
  const baseUrl = STREAMING_BASE_URLS[providerName]
  if (!baseUrl) throw new Error(`Streaming not supported for provider: ${providerName}`)
  return streamOpenAICompat(baseUrl, r)
}

async function callOpenAI(r: ProviderRequest): Promise<{ content: string; usage: any }> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${r.apiKey}` },
    body: JSON.stringify({
      model: r.model,
      messages: [
        ...(r.systemPrompt ? [{ role: 'system', content: r.systemPrompt }] : []),
        { role: 'user', content: r.prompt }
      ],
      max_tokens: r.maxTokens,
      temperature: r.temperature
    })
  })
  if (!res.ok) throw new Error(`OpenAI error: ${await res.text()}`)
  const d = await res.json()
  return { content: d.choices[0].message.content, usage: d.usage }
}

async function callAnthropic(r: ProviderRequest): Promise<{ content: string; usage: any }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': r.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: r.model,
      max_tokens: r.maxTokens,
      ...(r.systemPrompt ? { system: r.systemPrompt } : {}),
      messages: [{ role: 'user', content: r.prompt }]
    })
  })
  if (!res.ok) throw new Error(`Anthropic error: ${await res.text()}`)
  const d = await res.json()
  return { content: d.content[0].text, usage: d.usage }
}

async function callGemini(r: ProviderRequest): Promise<{ content: string; usage: any }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${r.model}:generateContent?key=${r.apiKey}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: r.prompt }] }],
      generationConfig: { maxOutputTokens: r.maxTokens, temperature: r.temperature }
    })
  })
  if (!res.ok) throw new Error(`Gemini error: ${await res.text()}`)
  const d = await res.json()
  return { content: d.candidates[0].content.parts[0].text, usage: d.usageMetadata }
}

// OpenAI-compatible: Groq, OpenRouter, DeepSeek
async function callOpenAICompat(baseUrl: string, r: ProviderRequest): Promise<{ content: string; usage: any }> {
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${r.apiKey}` },
    body: JSON.stringify({
      model: r.model,
      messages: [
        ...(r.systemPrompt ? [{ role: 'system', content: r.systemPrompt }] : []),
        { role: 'user', content: r.prompt }
      ],
      max_tokens: r.maxTokens,
      temperature: r.temperature,
      stream: false
    })
  })
  if (!res.ok) throw new Error(`Provider error: ${await res.text()}`)
  const d = await res.json()
  return { content: d.choices[0].message.content, usage: d.usage }
}

async function callNvidia(r: ProviderRequest): Promise<{ content: string; usage: any }> {
  const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${r.apiKey}` },
    body: JSON.stringify({
      model: r.model,
      messages: [
        ...(r.systemPrompt ? [{ role: 'system', content: r.systemPrompt }] : []),
        { role: 'user', content: r.prompt }
      ],
      temperature: Math.min(r.temperature, 1),
      top_p: 1,
      max_tokens: r.maxTokens,
      stream: false
    })
  })
  if (!res.ok) throw new Error(`NVIDIA error: ${await res.text()}`)
  const d = await res.json()
  return { content: d.choices[0].message.content, usage: d.usage }
}

const PROVIDER_BASE_URLS: Record<string, string> = {
  groq: 'https://api.groq.com/openai/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  deepseek: 'https://api.deepseek.com/v1',
  nvidia: 'https://integrate.api.nvidia.com/v1',
}

async function dispatchToProvider(providerName: string, r: ProviderRequest): Promise<{ content: string; usage: any }> {
  switch (providerName) {
    case 'openai': return callOpenAI(r)
    case 'anthropic': return callAnthropic(r)
    case 'gemini': return callGemini(r)
    case 'nvidia': return callNvidia(r)
    default: {
      const baseUrl = PROVIDER_BASE_URLS[providerName]
      if (!baseUrl) throw new Error(`Unknown provider: ${providerName}`)
      return callOpenAICompat(baseUrl, r)
    }
  }
}

// ── Main handler ──────────────────────────────────────────────────────────────

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      }
    })
  }

  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const start = Date.now()

  try {
    const { user, supabase } = await requireAuth(req)
    const { prompt, module: mod, _test_provider_id, stream = false, systemPrompt } = await req.json()

    if (!prompt?.trim()) return json({ error: 'prompt required' }, 400)

    // ── Backend permission enforcement ────────────────────────
    const { data: profile } = await supabase
      .from('profiles').select('role').eq('id', user.id).single()
    const userRole = profile?.role ?? 'free'

    if (userRole !== 'admin' && mod) {
      const { data: access } = await supabase.rpc('check_module_permission', {
        p_role_key: userRole,
        p_module_key: mod,
        p_permission_key: 'can_generate_ai'
      })
      if (!access) {
        return json({ error: 'Access denied: insufficient permissions for this module.' }, 403)
      }
    }


    // Load provider — use specific id for test, otherwise active provider
    const query = supabase.from('ai_provider_configs').select('*').eq('is_enabled', true)
    const { data: config, error: cfgErr } = _test_provider_id
      ? await query.eq('id', _test_provider_id).single()
      : await query.eq('is_active', true).single()

    if (cfgErr || !config) return json({ error: 'No active AI provider configured. Please contact your administrator.' }, 503)

    // Decrypt API key server-side
    const apiKey = await decrypt(config.encrypted_api_key)

    const providerReq: ProviderRequest = {
      apiKey,
      model: config.model_name,
      prompt,
      systemPrompt,
      maxTokens: config.max_tokens,
      temperature: Number(config.temperature)
    }

    // ── Streaming path ────────────────────────────────────────────────────────
    if (stream) {
      const upstream = await dispatchStream(config.provider_name, providerReq)
      if (!upstream.ok) throw new Error(`Provider stream error: ${await upstream.text()}`)
      if (!upstream.body) throw new Error('No stream body from provider')
      return new Response(upstream.body, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Access-Control-Allow-Origin': '*',
        }
      })
    }

    // ── Non-streaming path ────────────────────────────────────────────────────
    const { content, usage } = await dispatchToProvider(config.provider_name, providerReq)

    // Log usage (non-blocking)
    supabase.from('ai_usage_logs').insert({
      user_id: user.id,
      provider_id: config.id,
      module: mod,
      prompt_tokens: usage?.prompt_tokens ?? usage?.inputTokenCount ?? null,
      completion_tokens: usage?.completion_tokens ?? usage?.outputTokenCount ?? null,
      total_tokens: usage?.total_tokens ?? null,
      latency_ms: Date.now() - start
    }).then(() => {})

    return json({ content, provider: config.provider_name, model: config.model_name })
  } catch (err: any) {
    const status = err.message === 'Unauthorized' ? 401 : 500
    return json({ error: err.message }, status)
  }
})
