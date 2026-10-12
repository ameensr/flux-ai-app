// src/features/panda-copilot/permissions/pandaAccessControl.ts
// Permission checks for Panda Copilot data access.
// Delegates to the existing RBAC system — never bypasses it.

import { useAppStore } from '@/store/useAppStore'
import { hasModulePermission, canAccessModule } from '@/lib/rbac'

export interface PandaAccessContext {
  userId: string | undefined
  role: string
  permissionMap: Record<string, Record<string, boolean>>
}

export function getPandaAccessContext(): PandaAccessContext {
  const { user, role, permissionMap } = useAppStore.getState()
  return { userId: user?.id, role, permissionMap }
}

export function canAccessSupportTracker(ctx: PandaAccessContext): boolean {
  const isAdmin = ctx.role === 'admin' || ctx.role === 'super_admin'
  if (isAdmin) return true
  return canAccessModule(ctx.permissionMap, 'support-tracker')
}

export function canAccessReleaseTracker(ctx: PandaAccessContext): boolean {
  const isAdmin = ctx.role === 'admin' || ctx.role === 'super_admin'
  if (isAdmin) return true
  return canAccessModule(ctx.permissionMap, 'release-tracker')
}

export function canAccessQAReport(ctx: PandaAccessContext): boolean {
  const isAdmin = ctx.role === 'admin' || ctx.role === 'super_admin'
  if (isAdmin) return true
  return canAccessModule(ctx.permissionMap, 'qa-report')
}

export function canAccessProjectHub(ctx: PandaAccessContext): boolean {
  const isAdmin = ctx.role === 'admin' || ctx.role === 'super_admin'
  if (isAdmin) return true
  return canAccessModule(ctx.permissionMap, 'project-hub')
}

export function canAccessDailyReport(ctx: PandaAccessContext): boolean {
  const isAdmin = ctx.role === 'admin' || ctx.role === 'super_admin'
  if (isAdmin) return true
  return canAccessModule(ctx.permissionMap, 'daily-report')
}

/** Returns list of module keys the user can access for cross-module search */
export function getAccessibleModules(ctx: PandaAccessContext): string[] {
  const modules: string[] = []
  if (canAccessSupportTracker(ctx)) modules.push('support-tracker')
  if (canAccessReleaseTracker(ctx)) modules.push('release-tracker')
  if (canAccessQAReport(ctx)) modules.push('qa-report')
  if (canAccessProjectHub(ctx)) modules.push('project-hub')
  return modules
}
