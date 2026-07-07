// src/lib/modulePermissions.ts
// Centralized module permission definitions
// Each module declares which permissions it actually supports

export type PermissionKey =
  | 'can_view'
  | 'can_create'
  | 'can_edit'
  | 'can_delete'
  | 'can_export'
  | 'can_generate_ai'
  | 'can_use_advanced_ai'
  | 'can_share'
  | 'can_configure'
  | 'can_assign_members'
  | 'can_manage_roles'
  | 'can_manage_users'
  | 'can_manage_permissions'
  | 'can_manage_ai_providers'
  | 'can_manage_announcements'
  | 'can_view_audit_logs'
  | 'can_manage_templates'
  | 'can_manage_maintenance'
  | 'can_manage_system'

export interface ModulePermissionDefinition {
  moduleKey: string
  moduleName: string
  supportedPermissions: PermissionKey[]
  description?: string
}

/**
 * Module Permission Registry
 * 
 * Each module declares ONLY the permissions that are actually meaningful.
 * This prevents:
 * - Empty toggles in RBAC UI
 * - Meaningless permissions
 * - Confusion for administrators
 */
export const MODULE_PERMISSIONS: Record<string, ModulePermissionDefinition> = {
  // ── Core Modules ──────────────────────────────────────────────────────────

  'dashboard': {
    moduleKey: 'dashboard',
    moduleName: 'Dashboard',
    supportedPermissions: [
      'can_view',
      'can_export', // Export dashboard data/reports
    ],
    description: 'Main dashboard with overview and metrics'
  },

  'bug-refiner': {
    moduleKey: 'bug-refiner',
    moduleName: 'AI Bug Refiner',
    supportedPermissions: [
      'can_view',
      'can_create',
      'can_edit',
      'can_delete',
      'can_export', // Export refined bugs
      'can_generate_ai', // Use AI to refine bugs
      'can_use_advanced_ai', // Use premium AI models
      'can_share', // Share bugs externally
    ],
    description: 'AI-powered bug report refinement tool'
  },

  'test-generator': {
    moduleKey: 'test-generator',
    moduleName: 'Test Case Generator',
    supportedPermissions: [
      'can_view',
      'can_create',
      'can_edit',
      'can_delete',
      'can_export', // Export test cases
      'can_generate_ai', // Generate test cases with AI
      'can_use_advanced_ai', // Use premium AI models
      'can_share', // Share test cases
    ],
    description: 'AI-powered test case generation'
  },

  'writing-assistant': {
    moduleKey: 'writing-assistant',
    moduleName: 'Writing Assistant',
    supportedPermissions: [
      'can_view',
      'can_create',
      'can_edit',
      'can_delete',
      'can_export', // Export documents
      'can_generate_ai', // Generate content with AI
      'can_use_advanced_ai', // Use premium AI models
    ],
    description: 'AI-powered writing and documentation assistant'
  },

  'qa-report': {
    moduleKey: 'qa-report',
    moduleName: 'QA Weekly Report',
    supportedPermissions: [
      'can_view',
      'can_create',
      'can_edit',
      'can_delete',
      'can_export', // Export reports
      'can_generate_ai', // Generate reports with AI
      'can_configure', // Configure report templates
    ],
    description: 'Weekly QA status reports'
  },

  'daily-report': {
    moduleKey: 'daily-report',
    moduleName: 'Daily Update Report',
    supportedPermissions: [
      'can_view',
      'can_create',
      'can_edit',
      'can_delete',
      'can_export', // Export reports
      'can_configure', // Configure report settings
    ],
    description: 'Daily status update reports'
  },

  // ── Settings ──────────────────────────────────────────────────────────────

  'settings': {
    moduleKey: 'settings',
    moduleName: 'Settings',
    supportedPermissions: [
      'can_view',
      'can_edit', // Edit user settings
    ],
    description: 'User profile and preferences'
  },

  // ── Admin Modules ─────────────────────────────────────────────────────────

  'admin': {
    moduleKey: 'admin',
    moduleName: 'Admin Panel',
    supportedPermissions: [
      'can_view', // Access admin panel
      'can_configure', // Configure system settings
    ],
    description: 'Administrative panel and system configuration'
  },

  'announcements': {
    moduleKey: 'announcements',
    moduleName: 'Announcements',
    supportedPermissions: [
      'can_view',
      'can_create',
      'can_edit',
      'can_delete',
      'can_configure', // Configure announcement settings
    ],
    description: 'System-wide announcements and notifications'
  },

  // ── Enterprise RBAC Modules ───────────────────────────────────────────────

  'user-management': {
    moduleKey: 'user-management',
    moduleName: 'User Management',
    supportedPermissions: [
      'can_view',
      'can_create',
      'can_edit',
      'can_delete',
      'can_export',
    ],
    description: 'Manage user accounts and profiles'
  },

  'team-management': {
    moduleKey: 'team-management',
    moduleName: 'Team Management',
    supportedPermissions: [
      'can_view',
      'can_create',
      'can_edit',
      'can_delete',
      'can_configure', // Assign users to teams
    ],
    description: 'Manage teams and user team assignments'
  },

  'roles-permissions': {
    moduleKey: 'roles-permissions',
    moduleName: 'Roles & Permissions',
    supportedPermissions: [
      'can_view',
      'can_create', // Create roles
      'can_edit', // Edit permissions
      'can_delete', // Delete roles
      'can_configure', // Configure permission templates
    ],
    description: 'Role-based access control configuration'
  },

  'ai-settings': {
    moduleKey: 'ai-settings',
    moduleName: 'AI Provider Configuration',
    supportedPermissions: [
      'can_view',
      'can_edit', // Edit AI provider settings
      'can_configure', // Configure AI models
    ],
    description: 'AI provider and model configuration'
  },

  // ── Other Modules ─────────────────────────────────────────────────────────

  'history': {
    moduleKey: 'history',
    moduleName: 'History',
    supportedPermissions: [
      'can_view',
      'can_delete', // Clear history
      'can_export', // Export history
    ],
    description: 'User activity history'
  },

  // ── Project Hub ───────────────────────────────────────────────────────────

  'project-hub': {
    moduleKey: 'project-hub',
    moduleName: 'Project Hub',
    supportedPermissions: [
      'can_view',
      'can_create',
      'can_edit',
      'can_delete',
      'can_assign_members',
      'can_manage_roles',
    ],
    description: 'Project management and team collaboration'
  },

  // ── Admin Hub ─────────────────────────────────────────────────────────────

  'admin-hub': {
    moduleKey: 'admin-hub',
    moduleName: 'Admin Hub',
    supportedPermissions: [
      'can_view',
      'can_manage_users',
      'can_manage_roles',
      'can_manage_permissions',
      'can_manage_ai_providers',
      'can_manage_announcements',
      'can_view_audit_logs',
      'can_manage_templates',
      'can_manage_maintenance',
      'can_manage_system',
    ],
    description: 'Central administration hub for system management'
  },
}

/**
 * Get supported permissions for a module
 */
export function getModulePermissions(moduleKey: string): PermissionKey[] {
  return MODULE_PERMISSIONS[moduleKey]?.supportedPermissions ?? []
}

/**
 * Check if a module supports a specific permission
 */
export function moduleSupportsPermission(moduleKey: string, permissionKey: PermissionKey): boolean {
  const permissions = getModulePermissions(moduleKey)
  return permissions.includes(permissionKey)
}

/**
 * Get all module keys that are registered
 */
export function getAllModuleKeys(): string[] {
  return Object.keys(MODULE_PERMISSIONS)
}

/**
 * Get module definition by key
 */
export function getModuleDefinition(moduleKey: string): ModulePermissionDefinition | undefined {
  return MODULE_PERMISSIONS[moduleKey]
}

/**
 * Permission display labels
 */
export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  can_view: 'View',
  can_create: 'Create',
  can_edit: 'Edit',
  can_delete: 'Delete',
  can_export: 'Export',
  can_generate_ai: 'AI Generate',
  can_use_advanced_ai: 'Advanced AI',
  can_share: 'Share',
  can_configure: 'Configure',
  can_assign_members: 'Assign Members',
  can_manage_roles: 'Manage Roles',
  can_manage_users: 'Manage Users',
  can_manage_permissions: 'Manage Permissions',
  can_manage_ai_providers: 'Manage AI Providers',
  can_manage_announcements: 'Manage Announcements',
  can_view_audit_logs: 'View Audit Logs',
  can_manage_templates: 'Manage Templates',
  can_manage_maintenance: 'Manage Maintenance',
  can_manage_system: 'Manage System',
}

/**
 * Permission descriptions for tooltips
 */
export const PERMISSION_DESCRIPTIONS: Record<PermissionKey, string> = {
  can_view: 'Can view and access the module',
  can_create: 'Can create new items',
  can_edit: 'Can edit existing items',
  can_delete: 'Can delete items',
  can_export: 'Can export data (Jira, Slack, CSV, etc.)',
  can_generate_ai: 'Can use AI generation features',
  can_use_advanced_ai: 'Can use advanced/premium AI models',
  can_share: 'Can share items with external stakeholders',
  can_configure: 'Can modify module settings and configurations',
  can_assign_members: 'Can add and remove project members',
  can_manage_roles: 'Can change member roles within projects',
  can_manage_users: 'Can create, edit, and delete user accounts',
  can_manage_permissions: 'Can assign module permissions to roles',
  can_manage_ai_providers: 'Can configure AI provider settings and API keys',
  can_manage_announcements: 'Can create, publish, and delete announcements',
  can_view_audit_logs: 'Can view system audit logs and security events',
  can_manage_templates: 'Can create and edit permission templates',
  can_manage_maintenance: 'Can configure maintenance mode settings',
  can_manage_system: 'Can perform system-level configuration (super admin only)',
}
