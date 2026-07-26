// src/modules/ProjectHub/projectService.ts
// Service layer for Project Hub API operations

import { supabase } from '@/lib/supabase'
import type {
  Project,
  ProjectWithMembers,
  ProjectMember,
  ProjectMemberWithProfile,
  ProjectRole,
  CreateProjectInput,
  UpdateProjectInput,
  AssignMemberInput,
  UpdateMemberRoleInput,
  ProjectFilters,
  ProjectStats
} from './types'

// ══════════════════════════════════════════════════════════════════════════════
// Projects CRUD
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchProjects(filters?: ProjectFilters): Promise<ProjectWithMembers[]> {
  try {
    let query = supabase
      .from('projects')
      .select(`
        *,
        members:project_members(
          id,
          project_id,
          user_id,
          project_role,
          assigned_at,
          assigned_by,
          profile:profiles!project_members_user_id_fkey(id, email, full_name, role, avatar_url)
        )
      `)
      .order('created_at', { ascending: false })

    // Apply filters
    if (filters?.status && filters.status.length > 0) {
      query = query.in('status', filters.status)
    }

    if (filters?.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%,project_code.ilike.%${filters.search}%`)
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.contains('tags', filters.tags)
    }

    const { data, error } = await query

    if (error) {
      console.error('[fetchProjects] Supabase error:', error)

      // Provide helpful error messages
      if (error.code === '42P01') {
        throw new Error('Projects table does not exist. Please run migration 034_project_hub.sql first.')
      }
      if (error.code === 'PGRST116') {
        throw new Error('No permission to access projects. Check your role permissions.')
      }

      throw new Error(error.message || 'Failed to fetch projects')
    }

    return (data || []).map(project => ({
      ...project,
      members: project.members || [],
      member_count: project.members?.length || 0
    })) as ProjectWithMembers[]
  } catch (err: any) {
    console.error('[fetchProjects] Exception:', err)
    throw err
  }
}

export async function fetchProjectById(projectId: string): Promise<ProjectWithMembers> {
  const { data, error } = await supabase
    .from('projects')
    .select(`
      *,
      members:project_members(
        id,
        project_id,
        user_id,
        project_role,
        assigned_at,
        assigned_by,
        profile:profiles!project_members_user_id_fkey(id, email, full_name, role, avatar_url)
      )
    `)
    .eq('id', projectId)
    .single()

  if (error) throw error
  if (!data) throw new Error('Project not found')

  return {
    ...data,
    members: data.members || [],
    member_count: data.members?.length || 0
  } as ProjectWithMembers
}

export async function createProject(input: CreateProjectInput): Promise<Project> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('projects')
    .insert({
      ...input,
      created_by: userData.user.id
    })
    .select()
    .single()

  if (error) throw error
  if (!data) throw new Error('Failed to create project')

  // DB trigger also adds creator as owner; keep this as a safe fallback.
  try {
    await assignMember({
      project_id: data.id,
      user_id: userData.user.id,
      project_role: 'owner'
    })
  } catch (memberError: any) {
    // Already owner (trigger / unique) — project create still succeeded
    if (memberError?.code !== '23505' && !String(memberError?.message || '').includes('already a member')) {
      console.warn('[createProject] owner assignment fallback:', memberError)
    }
  }

  return data as Project
}

export async function updateProject(projectId: string, input: UpdateProjectInput): Promise<Project> {
  // Prepare the update payload, explicitly handling empty tags
  const updatePayload: any = { ...input }

  // If tags is an empty array or undefined, explicitly set it to empty array to clear tags
  if (input.tags !== undefined) {
    updatePayload.tags = input.tags && input.tags.length > 0 ? input.tags : []
  }

  const { data, error } = await supabase
    .from('projects')
    .update(updatePayload)
    .eq('id', projectId)
    .select()
    .single()

  if (error) throw error
  if (!data) throw new Error('Failed to update project')

  return data as Project
}

export async function deleteProject(projectId: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', projectId)

  if (error) throw error
}

export async function archiveProject(projectId: string): Promise<Project> {
  return updateProject(projectId, { status: 'archived' })
}

// ══════════════════════════════════════════════════════════════════════════════
// Project Members
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchProjectMembers(projectId: string): Promise<ProjectMemberWithProfile[]> {
  const { data, error } = await supabase
    .from('project_members')
    .select(`
      *,
      profile:profiles!project_members_user_id_fkey(id, email, full_name, role, avatar_url)
    `)
    .eq('project_id', projectId)
    .order('project_role', { ascending: true })

  if (error) throw error
  return (data || []) as ProjectMemberWithProfile[]
}

export async function assignMember(input: AssignMemberInput): Promise<ProjectMember> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('project_members')
    .insert({
      ...input,
      assigned_by: userData.user.id
    })
    .select()
    .single()

  if (error) {
    if (error.code === '23505') { // unique_violation
      throw new Error('User is already a member of this project')
    }
    throw error
  }
  if (!data) throw new Error('Failed to assign member')

  return data as ProjectMember
}

export async function updateMemberRole(
  memberId: string,
  projectRole: string,
  projectId: string
): Promise<ProjectMember> {
  // Get current user
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // Get current user's profile to check for super_admin
  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  const isSuperAdmin = currentUserProfile?.role === 'super_admin'

  // Super admins bypass all restrictions
  if (!isSuperAdmin) {
    // Get current user's role in this project
    const { data: currentUserMembership } = await supabase
      .from('project_members')
      .select('project_role')
      .eq('project_id', projectId)
      .eq('user_id', userData.user.id)
      .single()

    // Get target member's current role
    const { data: targetMember } = await supabase
      .from('project_members')
      .select('project_role, user_id')
      .eq('id', memberId)
      .single()

    if (!targetMember) throw new Error('Member not found')

    // Business rules for non-super-admins:
    // 1. Leads cannot modify Owners
    if (currentUserMembership?.project_role === 'lead' &&
      targetMember.project_role === 'owner') {
      throw new Error('Project Leads cannot modify Project Owners')
    }

    // 2. Leads cannot promote anyone to Owner
    if (currentUserMembership?.project_role === 'lead' &&
      projectRole === 'owner') {
      throw new Error('Project Leads cannot assign the Owner role')
    }

    // 3. Cannot demote the last owner
    if (targetMember.project_role === 'owner' && projectRole !== 'owner') {
      const { count } = await supabase
        .from('project_members')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('project_role', 'owner')

      if (count === 1) {
        throw new Error('Cannot remove or demote the last project owner. Assign another owner first.')
      }
    }
  }

  // Perform the update
  const { data, error } = await supabase
    .from('project_members')
    .update({ project_role: projectRole })
    .eq('id', memberId)
    .select()
    .single()

  if (error) {
    // Handle specific database errors
    if (error.message.includes('last project owner')) {
      throw new Error('Cannot remove or demote the last project owner. Assign another owner first.')
    }
    throw error
  }
  if (!data) throw new Error('Failed to update member role')

  return data as ProjectMember
}

export async function removeMember(memberId: string, projectId: string): Promise<void> {
  // Get current user
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // Get current user's profile to check for super_admin
  const { data: currentUserProfile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()

  const isSuperAdmin = currentUserProfile?.role === 'super_admin'

  // Super admins bypass all restrictions
  if (!isSuperAdmin) {
    // Get current user's role in this project
    const { data: currentUserMembership } = await supabase
      .from('project_members')
      .select('project_role')
      .eq('project_id', projectId)
      .eq('user_id', userData.user.id)
      .single()

    // Get target member's details
    const { data: targetMember } = await supabase
      .from('project_members')
      .select('project_role, user_id')
      .eq('id', memberId)
      .single()

    if (!targetMember) throw new Error('Member not found')

    // Business rules for non-super-admins:
    // 1. Leads cannot remove Owners
    if (currentUserMembership?.project_role === 'lead' &&
      targetMember.project_role === 'owner') {
      throw new Error('Project Leads cannot remove Project Owners')
    }

    // 2. Cannot remove the last owner
    if (targetMember.project_role === 'owner') {
      const { count } = await supabase
        .from('project_members')
        .select('id', { count: 'exact', head: true })
        .eq('project_id', projectId)
        .eq('project_role', 'owner')

      if (count === 1) {
        throw new Error('Cannot remove the last project owner. Assign another owner first.')
      }
    }
  }

  // Perform the deletion
  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('id', memberId)

  if (error) {
    // Handle specific database errors
    if (error.message.includes('last project owner')) {
      throw new Error('Cannot remove the last project owner. Assign another owner first.')
    }
    throw error
  }
}

export async function leaveProject(projectId: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  // Check if user is an owner and the last one
  const { data: currentMember } = await supabase
    .from('project_members')
    .select('project_role')
    .eq('project_id', projectId)
    .eq('user_id', userData.user.id)
    .single()

  if (currentMember?.project_role === 'owner') {
    const { count } = await supabase
      .from('project_members')
      .select('id', { count: 'exact', head: true })
      .eq('project_id', projectId)
      .eq('project_role', 'owner')

    if (count === 1) {
      throw new Error('Cannot leave project as the last owner. Assign another owner first or delete the project.')
    }
  }

  const { error } = await supabase
    .from('project_members')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userData.user.id)

  if (error) {
    if (error.message.includes('last project owner')) {
      throw new Error('Cannot leave project as the last owner. Assign another owner first or delete the project.')
    }
    throw error
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// User Search (for adding members)
// ══════════════════════════════════════════════════════════════════════════════

export async function searchUsers(query: string, excludeUserIds: string[] = []) {
  let dbQuery = supabase
    .from('profiles')
    .select('id, email, full_name, role, avatar_url')
    .eq('status', 'active')
    .order('full_name', { ascending: true })
    .limit(10)

  if (query) {
    dbQuery = dbQuery.or(`email.ilike.%${query}%,full_name.ilike.%${query}%`)
  }

  if (excludeUserIds.length > 0) {
    dbQuery = dbQuery.not('id', 'in', `(${excludeUserIds.join(',')})`)
  }

  const { data, error } = await dbQuery

  if (error) throw error
  return data || []
}

// ══════════════════════════════════════════════════════════════════════════════
// Statistics
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchProjectStats(): Promise<ProjectStats> {
  const { data: projects, error } = await supabase
    .from('projects')
    .select('id, status')

  if (error) throw error

  const stats = {
    total_projects: projects?.length || 0,
    active_projects: projects?.filter(p => p.status === 'active').length || 0,
    completed_projects: projects?.filter(p => p.status === 'completed').length || 0,
    total_members: 0
  }

  // Get total unique members across all projects
  const { data: members, error: membersError } = await supabase
    .from('project_members')
    .select('user_id')

  if (!membersError && members) {
    const uniqueUsers = new Set(members.map(m => m.user_id))
    stats.total_members = uniqueUsers.size
  }

  return stats
}

// ══════════════════════════════════════════════════════════════════════════════
// My Projects (for current user)
// ══════════════════════════════════════════════════════════════════════════════

export async function fetchMyProjects(): Promise<(ProjectWithMembers & { my_project_role: ProjectRole })[]> {
  const { data: userData } = await supabase.auth.getUser()
  if (!userData.user) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('project_members')
    .select(`
      project_role,
      project:projects(
        *,
        members:project_members(
          id,
          project_id,
          user_id,
          project_role,
          assigned_at,
          assigned_by,
          profile:profiles!project_members_user_id_fkey(id, email, full_name, role, avatar_url)
        )
      )
    `)
    .eq('user_id', userData.user.id)
    .order('assigned_at', { ascending: false })

  if (error) throw error

  type ProjectMemberWithProject = {
    project_role: ProjectRole
    project: ProjectWithMembers
  }

  const typedData = (data || []) as unknown as ProjectMemberWithProject[]

  return typedData
    .filter(item => item.project)
    .map(item => ({
      ...item.project,
      members: item.project.members || [],
      member_count: item.project.members?.length || 0,
      my_project_role: item.project_role,
    }))
}
