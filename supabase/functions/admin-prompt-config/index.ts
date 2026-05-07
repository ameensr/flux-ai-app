// supabase/functions/admin-prompt-config/index.ts
// Admin-only CRUD for module system prompts.
// Prompts are NEVER exposed to regular users or the frontend AI calls.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

async function requireAdmin(req: Request) {
  const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
  if (!jwt) throw new Error('Unauthorized')
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: { user }, error } = await supabase.auth.getUser(jwt)
  if (error || !user) throw new Error('Unauthorized')
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') throw new Error('Forbidden')
  return { userId: user.id, supabase }
}

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
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      }
    })
  }

  try {
    const { userId, supabase } = await requireAdmin(req)
    const url = new URL(req.url)
    const id = url.searchParams.get('id')
    const action = url.searchParams.get('action')

    // GET ?id=<id>&action=versions — version history for a prompt
    if (req.method === 'GET' && id && action === 'versions') {
      const { data, error } = await supabase
        .from('ai_prompt_versions')
        .select('id, version, system_prompt, changed_by, created_at')
        .eq('prompt_id', id)
        .order('version', { ascending: false })
      if (error) throw error
      return json(data)
    }

    // GET — list all prompts
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('ai_module_prompts')
        .select('id, module_key, module_name, system_prompt, is_active, version, temperature, max_tokens, created_at, updated_at')
        .order('module_name')
      if (error) throw error
      return json(data)
    }

    // POST — create prompt
    if (req.method === 'POST') {
      const { module_key, module_name, system_prompt, is_active = true, temperature, max_tokens } = await req.json()
      if (!module_key || !module_name) return json({ error: 'module_key and module_name required' }, 400)

      if (is_active) {
        await supabase.from('ai_module_prompts').update({ is_active: false }).eq('module_key', module_key)
      }

      const { data, error } = await supabase
        .from('ai_module_prompts')
        .insert({ module_key, module_name, system_prompt: system_prompt ?? '', is_active, temperature, max_tokens, created_by: userId })
        .select('id, module_key, module_name, system_prompt, is_active, version')
        .single()
      if (error) throw error

      await supabase.from('ai_prompt_versions').insert({
        prompt_id: data.id, module_key, system_prompt: data.system_prompt, version: 1, changed_by: userId
      })

      return json(data, 201)
    }

    // PUT — update prompt, auto-increment version, save history
    if (req.method === 'PUT') {
      if (!id) return json({ error: 'id required' }, 400)
      const body = await req.json()

      const { data: current } = await supabase
        .from('ai_module_prompts')
        .select('version, system_prompt, module_key')
        .eq('id', id)
        .single()
      if (!current) return json({ error: 'Prompt not found' }, 404)

      const newVersion = current.version + 1
      const updates: Record<string, unknown> = { ...body, version: newVersion }
      delete updates.id; delete updates.created_by; delete updates.created_at

      if (body.is_active) {
        await supabase.from('ai_module_prompts')
          .update({ is_active: false })
          .eq('module_key', current.module_key)
          .neq('id', id)
      }

      const { data, error } = await supabase
        .from('ai_module_prompts')
        .update(updates)
        .eq('id', id)
        .select('id, module_key, module_name, system_prompt, is_active, version')
        .single()
      if (error) throw error

      if (body.system_prompt !== undefined && body.system_prompt !== current.system_prompt) {
        await supabase.from('ai_prompt_versions').insert({
          prompt_id: id, module_key: current.module_key,
          system_prompt: body.system_prompt, version: newVersion, changed_by: userId
        })
      }

      return json(data)
    }

    // DELETE
    if (req.method === 'DELETE') {
      if (!id) return json({ error: 'id required' }, 400)
      const { error } = await supabase.from('ai_module_prompts').delete().eq('id', id)
      if (error) throw error
      return json({ success: true })
    }

    return json({ error: 'Method not allowed' }, 405)
  } catch (err: any) {
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500
    return json({ error: err.message }, status)
  }
})
