export type Role = 'free' | 'pro' | 'admin'

export type Permission =
  | 'access:dashboard'
  | 'access:bug-refiner'
  | 'access:test-generator'
  | 'access:writing-assistant'
  | 'access:history'
  | 'access:settings'
  | 'access:admin'
  | 'export:jira'
  | 'export:slack'
  | 'ai:unlimited'

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  free: [
    'access:dashboard',
    'access:bug-refiner',
    'access:test-generator',
    'access:writing-assistant',
    'access:settings',
  ],
  pro: [
    'access:dashboard',
    'access:bug-refiner',
    'access:test-generator',
    'access:writing-assistant',
    'access:history',
    'access:settings',
    'export:jira',
    'export:slack',
    'ai:unlimited',
  ],
  admin: [
    'access:dashboard',
    'access:bug-refiner',
    'access:test-generator',
    'access:writing-assistant',
    'access:history',
    'access:settings',
    'access:admin',
    'export:jira',
    'export:slack',
    'ai:unlimited',
  ],
}

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function getPermissions(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] ?? []
}
