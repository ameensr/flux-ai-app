// src/pages/EnterpriseAdmin/types.ts

export type UserStatus = 'active' | 'inactive' | 'suspended' | 'pending' | 'locked' | 'invited'
export type PlanKey = 'enterprise' | 'business' | 'professional' | 'standard' | 'free' | 'trial'

export interface EnterpriseUser {
  id: string
  email: string
  full_name: string | null
  employee_id: string | null
  avatar_url: string | null
  role: string
  role_id?: string
  department_id: string | null
  department_name?: string | null
  plan_id: string | null
  plan_name?: string | null
  status: UserStatus
  last_login_at: string | null
  created_at: string
}

export interface EnterpriseRole {
  id: string
  role_key: string
  role_name: string
  description: string | null
  priority: number
  inherits_from: string | null
  inherits_from_name?: string | null
  is_system: boolean
  created_by: string | null
  created_at: string
  user_count?: number
}

export interface Department {
  id: string
  name: string
  description: string | null
}

export interface Plan {
  id: string
  plan_key: PlanKey
  plan_name: string
}

export interface PermissionTemplate {
  id: string
  name: string
  description: string | null
  config: { preset: string }
}

export interface AuditLog {
  id: string
  actor_email: string | null
  action: string
  target_type: string | null
  target_id: string | null
  module: string | null
  old_value: any
  new_value: any
  ip_address: string | null
  user_agent: string | null
  created_at: string
}

export interface ModuleRow   { id: string; module_key: string; module_name: string; sort_order: number }
export interface PermRow     { id: string; permission_key: string; permission_name: string }
export interface RMPRow      { id: string; role_id: string; module_id: string; permission_id: string; is_enabled: boolean }
export interface UserOverride { id: string; user_id: string; module_id: string; permission_id: string; is_allowed: boolean; reason: string | null }

export const STATUS_CONFIG: Record<UserStatus, { label: string; color: string; dot: string }> = {
  active:    { label: 'Active',    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', dot: 'bg-emerald-400' },
  inactive:  { label: 'Inactive',  color: 'text-gray-400 bg-gray-500/10 border-gray-500/20',         dot: 'bg-gray-400' },
  suspended: { label: 'Suspended', color: 'text-red-400 bg-red-500/10 border-red-500/20',             dot: 'bg-red-400' },
  pending:   { label: 'Pending',   color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',   dot: 'bg-yellow-400' },
  locked:    { label: 'Locked',    color: 'text-orange-400 bg-orange-500/10 border-orange-500/20',   dot: 'bg-orange-400' },
  invited:   { label: 'Invited',   color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',         dot: 'bg-blue-400' },
}

export const PLAN_CONFIG: Record<string, { color: string }> = {
  enterprise:   { color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  business:     { color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  professional: { color: 'text-accent-gold bg-accent-gold/10 border-accent-gold/20' },
  standard:     { color: 'text-white bg-white/5 border-white/10' },
  free:         { color: 'text-text-muted bg-white/[0.02] border-white/5' },
  trial:        { color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
}

export const PERM_LABELS: Record<string, string> = {
  can_view:            'View',
  can_create:          'Create',
  can_edit:            'Edit',
  can_delete:          'Delete',
  can_export:          'Export',
  can_generate_ai:     'AI Gen',
  can_manage:          'Manage',
  can_use_advanced_ai: 'Adv AI',
}

export const TEMPLATE_PRESETS: Record<string, Record<string, string[]>> = {
  admin: {
    dashboard: ['can_view','can_create','can_edit','can_delete','can_export','can_generate_ai','can_manage','can_use_advanced_ai'],
    'bug-refiner': ['can_view','can_create','can_edit','can_delete','can_export','can_generate_ai','can_use_advanced_ai'],
    'test-generator': ['can_view','can_create','can_edit','can_delete','can_export','can_generate_ai','can_use_advanced_ai'],
    'writing-assistant': ['can_view','can_create','can_edit','can_delete','can_export','can_generate_ai','can_use_advanced_ai'],
    history: ['can_view','can_delete','can_export'],
    settings: ['can_view','can_edit','can_manage'],
    'qa-report': ['can_view','can_create','can_edit','can_delete','can_export','can_generate_ai'],
  },
  manager: {
    dashboard: ['can_view','can_export','can_generate_ai'],
    'bug-refiner': ['can_view','can_create','can_edit','can_export','can_generate_ai'],
    'test-generator': ['can_view','can_create','can_edit','can_export','can_generate_ai'],
    'writing-assistant': ['can_view','can_create','can_edit','can_export'],
    history: ['can_view','can_export'],
    settings: ['can_view'],
    'qa-report': ['can_view','can_create','can_edit','can_export','can_generate_ai'],
  },
  developer: {
    dashboard: ['can_view','can_generate_ai'],
    'bug-refiner': ['can_view','can_create','can_edit','can_export','can_generate_ai','can_use_advanced_ai'],
    'test-generator': ['can_view','can_create','can_edit','can_export','can_generate_ai','can_use_advanced_ai'],
    'writing-assistant': ['can_view','can_create','can_edit'],
    history: ['can_view'],
    settings: ['can_view'],
    'qa-report': ['can_view','can_create'],
  },
  qa_engineer: {
    dashboard: ['can_view','can_generate_ai'],
    'bug-refiner': ['can_view','can_create','can_edit','can_export','can_generate_ai'],
    'test-generator': ['can_view','can_create','can_edit','can_export','can_generate_ai'],
    'writing-assistant': ['can_view','can_create'],
    history: ['can_view'],
    settings: ['can_view'],
    'qa-report': ['can_view','can_create','can_edit','can_export','can_generate_ai'],
  },
  viewer: {
    dashboard: ['can_view'],
    'bug-refiner': ['can_view'],
    'test-generator': ['can_view'],
    'writing-assistant': ['can_view'],
    history: ['can_view'],
    settings: ['can_view'],
    'qa-report': ['can_view'],
  },
  client: {
    dashboard: ['can_view'],
    'qa-report': ['can_view'],
    history: ['can_view'],
  },
  guest: {
    dashboard: ['can_view'],
  },
}
