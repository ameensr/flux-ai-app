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

// ── Module prompt loader ─────────────────────────────────────────────────────

async function loadModuleSystemPrompt(
  supabase: ReturnType<typeof createClient>,
  moduleKey: string | undefined
): Promise<string | undefined> {
  if (!moduleKey) return undefined
  const { data } = await supabase
    .from('ai_module_prompts')
    .select('system_prompt')
    .eq('module_key', moduleKey)
    .eq('is_active', true)
    .single()
  return data?.system_prompt || undefined
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
    // systemPrompt from client is intentionally ignored — loaded server-side only
    const { prompt, module: mod, _test_provider_id } = await req.json()

    if (!prompt?.trim()) return json({ error: 'prompt required' }, 400)

    // Load provider — use specific id for test, otherwise active provider
    const query = supabase.from('ai_provider_configs').select('*').eq('is_enabled', true)
    const { data: config, error: cfgErr } = _test_provider_id
      ? await query.eq('id', _test_provider_id).single()
      : await query.eq('is_active', true).single()

    if (cfgErr || !config) return json({ error: 'No active AI provider configured. Please contact your administrator.' }, 503)

    // Load admin-defined system prompt for this module (server-side only, never from client)
    const systemPrompt = await loadModuleSystemPrompt(supabase, mod)

    // Decrypt API key server-side
    const apiKey = await decrypt(config.encrypted_api_key)

    // Call provider
    const { content, usage } = await dispatchToProvider(config.provider_name, {
      apiKey,
      model: config.model_name,
      prompt,
      systemPrompt,
      maxTokens: config.max_tokens,
      temperature: Number(config.temperature)
    })

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
