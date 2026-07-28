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
  if (!jwt) {
    console.error('[requireAdmin] Authorization header is missing or empty')
    throw new Error('Unauthorized')
  }
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)
  const { data: { user }, error } = await supabase.auth.getUser(jwt)
  if (error || !user) {
    console.error('[requireAdmin] getUser failed to validate JWT:', error)
    throw new Error('Unauthorized')
  }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) {
    console.error(`[requireAdmin] User ${user.id} has role ${profile?.role} and is forbidden`)
    throw new Error('Forbidden')
  }
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
    const { userId: actorId, supabase } = await requireAdmin(req)
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

    // PUT update a user's role (uses service role — bypasses RLS)
    if (req.method === 'PUT' && action === 'update_user_role') {
      const { user_id, role } = await req.json()
      if (!user_id || !role) return json({ error: 'Missing fields' }, 400)
      const { error } = await supabase
        .from('profiles')
        .update({ role })
        .eq('id', user_id)
      if (error) throw error
      return json({ success: true })
    }

    // PUT update a user's status (uses service role — bypasses RLS)
    if (req.method === 'PUT' && action === 'update_user_status') {
      const { user_id, status } = await req.json()
      if (!user_id || !status) return json({ error: 'Missing fields' }, 400)
      const { error } = await supabase
        .from('profiles')
        .update({ status })
        .eq('id', user_id)
      if (error) throw error
      return json({ success: true })
    }

    // PUT change a user's password (admin / super_admin only — service role)
    if (req.method === 'PUT' && action === 'change_user_password') {
      const { user_id, password } = await req.json()
      if (!user_id || typeof password !== 'string') {
        return json({ error: 'Missing user_id or password' }, 400)
      }

      const trimmed = password.trim()
      if (trimmed.length < 8) {
        return json({ error: 'Password must be at least 8 characters' }, 400)
      }
      if (!/[A-Z]/.test(trimmed) || !/[a-z]/.test(trimmed) || !/\d/.test(trimmed) ||
          !/[!@#$%^&*(),.?":{}|<>_\-+=[\]\\\/~`]/.test(trimmed)) {
        return json({
          error: 'Password must include uppercase, lowercase, number, and special character',
        }, 400)
      }

      // Load actor + target roles for privilege checks
      const [{ data: actorProfile }, { data: targetProfile }] = await Promise.all([
        supabase.from('profiles').select('role').eq('id', actorId).single(),
        supabase.from('profiles').select('role, email, full_name').eq('id', user_id).single(),
      ])

      if (!targetProfile) return json({ error: 'User not found' }, 404)

      // Only super_admin may change another super_admin's password
      if (
        targetProfile.role === 'super_admin' &&
        actorProfile?.role !== 'super_admin'
      ) {
        return json({ error: 'Only a Super Admin can change a Super Admin password' }, 403)
      }

      const { error: updateError } = await supabase.auth.admin.updateUserById(user_id, {
        password: trimmed,
      })
      if (updateError) {
        console.error('[change_user_password] updateUserById failed:', updateError)
        throw new Error(updateError.message || 'Failed to update password')
      }

      return json({
        success: true,
        email: targetProfile.email,
        full_name: targetProfile.full_name,
      })
    }

    // DELETE a user from auth.users + profiles (hard delete)
    if (req.method === 'DELETE' && action === 'delete_user') {
      let body: { user_id?: string } = {}
      try {
        body = await req.json()
      } catch {
        // Some runtimes strip DELETE bodies — fall back to query string
        body = {}
      }
      const user_id = body.user_id || url.searchParams.get('user_id') || undefined
      if (!user_id) return json({ error: 'Missing user_id' }, 400)

      if (user_id === actorId) {
        return json({ error: 'You cannot delete your own account from User Management' }, 400)
      }

      // Remove memberships / bypass last-owner trigger, then delete auth user
      // (profiles.id references auth.users ON DELETE CASCADE).
      const { error: prepError } = await supabase.rpc('admin_prepare_user_deletion', {
        target_user_id: user_id,
        actor_user_id: actorId,
      })
      if (prepError) {
        console.error('[delete_user] prepare failed:', prepError)
        throw new Error(prepError.message || 'Failed to prepare user deletion')
      }

      // Prefer deleting auth user (cascades profile). Fallback: wipe profile then auth.
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(user_id)
      if (authDeleteError) {
        console.error('[delete_user] auth.admin.deleteUser failed:', authDeleteError)

        const { error: profileError } = await supabase.from('profiles').delete().eq('id', user_id)
        if (profileError) {
          console.error('[delete_user] profile delete fallback failed:', profileError)
          throw new Error(profileError.message || authDeleteError.message || 'Failed to delete user')
        }

        const { error: authRetryError } = await supabase.auth.admin.deleteUser(user_id)
        if (authRetryError) {
          // Profile gone — surface auth error clearly
          throw new Error(authRetryError.message || 'Failed to delete auth user after profile cleanup')
        }
      }

      return json({ success: true })
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
