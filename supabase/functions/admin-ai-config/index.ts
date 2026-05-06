// supabase/functions/admin-ai-config/index.ts
// Admin-only CRUD for AI provider configurations.
// API keys are encrypted with AES-256-GCM before storage.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ENCRYPTION_KEY_B64 = Deno.env.get('AI_KEY_ENCRYPTION_SECRET')! // 32-byte base64 key
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

// ── Crypto helpers ────────────────────────────────────────────────────────────

async function importKey(): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(ENCRYPTION_KEY_B64), c => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

async function encrypt(plaintext: string): Promise<string> {
  const key = await importKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  // Store as iv:ciphertext, both base64
  const ivB64 = btoa(String.fromCharCode(...iv))
  const ctB64 = btoa(String.fromCharCode(...new Uint8Array(ciphertext)))
  return `${ivB64}:${ctB64}`
}

async function decrypt(stored: string): Promise<string> {
  const key = await importKey()
  const [ivB64, ctB64] = stored.split(':')
  const iv = Uint8Array.from(atob(ivB64), c => c.charCodeAt(0))
  const ct = Uint8Array.from(atob(ctB64), c => c.charCodeAt(0))
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct)
  return new TextDecoder().decode(plain)
}

// ── Auth helper ───────────────────────────────────────────────────────────────

async function requireAdmin(req: Request): Promise<{ userId: string; supabase: ReturnType<typeof createClient> }> {
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jwt) throw new Error('Unauthorized')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: { user }, error } = await supabase.auth.getUser(jwt)
  if (error || !user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { userId: user.id, supabase }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
}

// ── Handler ───────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      }
    })
  }

  try {
    const { userId, supabase } = await requireAdmin(req)
    const url = new URL(req.url)
    const id = url.searchParams.get('id')

    // GET — list all providers (mask keys)
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('ai_provider_configs')
        .select('id, provider_name, model_name, is_active, is_enabled, max_tokens, temperature, rate_limit_rpm, monthly_budget, provider_priority, created_at, updated_at')
        .order('provider_priority', { ascending: true })

      if (error) throw error
      return json(data)
    }

    // POST — create provider
    if (req.method === 'POST') {
      const body = await req.json()
      const { api_key, ...rest } = body
      if (!api_key) return json({ error: 'api_key required' }, 400)

      const encrypted_api_key = await encrypt(api_key)

      // If new provider is set active, deactivate others first
      if (rest.is_active) {
        await supabase.from('ai_provider_configs').update({ is_active: false }).eq('is_active', true)
      }

      const { data, error } = await supabase
        .from('ai_provider_configs')
        .insert({ ...rest, encrypted_api_key, created_by: userId })
        .select('id, provider_name, model_name, is_active, is_enabled')
        .single()

      if (error) throw error
      return json(data, 201)
    }

    // PUT — update provider
    if (req.method === 'PUT') {
      if (!id) return json({ error: 'id required' }, 400)
      const body = await req.json()
      const { api_key, ...rest } = body

      const updates: Record<string, unknown> = { ...rest }
      if (api_key) updates.encrypted_api_key = await encrypt(api_key)

      // If activating this provider, deactivate others
      if (rest.is_active) {
        await supabase.from('ai_provider_configs').update({ is_active: false }).neq('id', id)
      }

      const { data, error } = await supabase
        .from('ai_provider_configs')
        .update(updates)
        .eq('id', id)
        .select('id, provider_name, model_name, is_active, is_enabled')
        .single()

      if (error) throw error
      return json(data)
    }

    // DELETE — remove provider
    if (req.method === 'DELETE') {
      if (!id) return json({ error: 'id required' }, 400)
      const { error } = await supabase.from('ai_provider_configs').delete().eq('id', id)
      if (error) throw error
      return json({ success: true })
    }

    return json({ error: 'Method not allowed' }, 405)
  } catch (err: any) {
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500
    return json({ error: err.message }, status)
  }
})
