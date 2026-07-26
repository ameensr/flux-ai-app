// src/modules/ProjectHub/types/index.ts
// Type definitions for Project Hub module

export type ProjectStatus = 'active' | 'on_hold' | 'completed' | 'archived'
export type ProjectRole = 'owner' | 'lead' | 'member' | 'viewer'

export interface Project {
  id: string
  name: string
  description: string | null
  project_code: string | null
  status: ProjectStatus
  start_date: string | null
  target_end_date: string | null
  actual_end_date: string | null
  tags: string[] | null
  metadata: Record<string, any>
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ProjectMember {
  id: string
  project_id: string
  user_id: string
  project_role: ProjectRole
  assigned_at: string
  assigned_by: string | null
}

export interface ProjectWithMembers extends Project {
  members: ProjectMemberWithProfile[]
  member_count?: number
}

export interface ProjectMemberWithProfile extends ProjectMember {
  profile: {
    id: string
    email: string
    full_name: string | null
    role: string
    avatar_url: string | null
  }
}

export interface CreateProjectInput {
  name: string
  project_code: string
  description?: string
  status?: ProjectStatus
  start_date?: string
  target_end_date?: string
  tags?: string[]
}

export interface UpdateProjectInput {
  name?: string
  description?: string
  project_code?: string
  status?: ProjectStatus
  start_date?: string
  target_end_date?: string
  actual_end_date?: string
  tags?: string[]
}

export interface AssignMemberInput {
  project_id: string
  user_id: string
  project_role: ProjectRole
}

export interface UpdateMemberRoleInput {
  member_id: string
  project_role: ProjectRole
}

export interface ProjectFilters {
  status?: ProjectStatus[]
  search?: string
  tags?: string[]
}

export interface ProjectStats {
  total_projects: number
  active_projects: number
  completed_projects: number
  total_members: number
}

// Role permission helpers
export const PROJECT_ROLE_LABELS: Record<ProjectRole, string> = {
  owner: 'Project Owner',
  lead: 'Project Lead',
  member: 'Project Member',
  viewer: 'Viewer'
}

export const PROJECT_ROLE_DESCRIPTIONS: Record<ProjectRole, string> = {
  owner: 'Full control over project settings, members, and deletion',
  lead: 'Can manage project members and settings',
  member: 'Can contribute to project activities',
  viewer: 'Read-only access to project data'
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  active: 'Active',
  on_hold: 'On Hold',
  completed: 'Completed',
  archived: 'Archived'
}

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  active: 'bg-green-500/10 text-green-600 border-green-500/20',
  on_hold: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  completed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  archived: 'bg-gray-500/10 text-gray-600 border-gray-500/20'
}
