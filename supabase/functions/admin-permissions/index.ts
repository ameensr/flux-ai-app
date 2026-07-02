// supabase/functions/admin-permissions/index.ts
// Admin-only CRUD for role_module_permissions.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  })
}

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
    const { supabase } = await requireAdmin(req)
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    // GET full permission matrix
    if (req.method === 'GET' && action === 'matrix') {
      const [roles, modules, permissions, rmp] = await Promise.all([
        supabase.from('roles').select('*').order('created_at'),
        supabase.from('modules').select('*').eq('is_active', true).order('sort_order'),
        supabase.from('permissions').select('*').order('permission_key'),
        supabase.from('role_module_permissions').select('*'),
      ])
      return json({
        roles: roles.data,
        modules: modules.data,
        permissions: permissions.data,
        matrix: rmp.data,
      })
    }

    // PUT toggle a single permission
    if (req.method === 'PUT' && action === 'toggle') {
      const { role_id, module_id, permission_id, is_enabled } = await req.json()
      if (!role_id || !module_id || !permission_id) return json({ error: 'Missing fields' }, 400)
      const { data, error } = await supabase
        .from('role_module_permissions')
        .upsert({ role_id, module_id, permission_id, is_enabled }, { onConflict: 'role_id,module_id,permission_id' })
        .select()
        .single()
      if (error) throw error
      return json(data)
    }

    // PUT bulk update
    if (req.method === 'PUT' && action === 'bulk') {
      const { updates } = await req.json() as {
        updates: { role_id: string; module_id: string; permission_id: string; is_enabled: boolean }[]
      }
      if (!Array.isArray(updates)) return json({ error: 'updates must be array' }, 400)
      const { error } = await supabase
        .from('role_module_permissions')
        .upsert(updates, { onConflict: 'role_id,module_id,permission_id' })
      if (error) throw error
      return json({ success: true, count: updates.length })
    }

    return json({ error: 'Not found' }, 404)
  } catch (err: any) {
    const status = err.message === 'Unauthorized' ? 401 : err.message === 'Forbidden' ? 403 : 500
    return json({ error: err.message }, status)
  }
})
