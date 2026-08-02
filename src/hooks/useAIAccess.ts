// Combines Centralised AI platform toggle, user allowlist, and RBAC AI permissions.
// Centralised AI OFF → nothing works.
// Centralised AI ON  → admin/super_admin always allowed; others must be on allowlist
//                      AND have can_generate_ai / can_use_advanced_ai.
// Empty allowlist → only admins.

import { usePermissions } from '@/hooks/usePermissions'
import { useAIPlatformStore } from '@/store/useAIPlatformStore'
import { useAppStore } from '@/store/useAppStore'
import {
  AI_USER_RESTRICTED_MESSAGE,
  showAIRestricted,
} from '@/store/useAIRestrictionStore'

const ADVANCED_AI_MODULES = [
  'bug-refiner',
  'test-generator',
  'writing-assistant',
  'qa-report',
] as const

export const AI_DISABLED_BY_ADMIN = 'Centralised AI is disabled by an administrator.'
export const AI_PERMISSION_DENIED = "You don't have permission to use AI generation."
export const ADVANCED_AI_PERMISSION_DENIED = "You don't have permission to use Advanced AI (Copilot)."
export const AI_USER_RESTRICTED = AI_USER_RESTRICTED_MESSAGE

export type AIDenyReason = 'disabled' | 'restricted' | 'permission' | null

/**
 * Platform + allowlist + RBAC gate for AI features.
 * Admin / super_admin always bypass the user allowlist (and RBAC),
 * but still need Centralised AI ON.
 */
export function useAIAccess() {
  const aiEnabled = useAIPlatformStore((s) => s.enabled)
  const configLoaded = useAIPlatformStore((s) => s.configLoaded)
  const isUserAllowedFn = useAIPlatformStore((s) => s.isUserAllowed)
  const userId = useAppStore((s) => s.user?.id as string | undefined)
  const role = useAppStore((s) => s.role)
  const { can } = usePermissions()

  const isAdmin = role === 'admin' || role === 'super_admin'
  // Admins bypass allowlist. Everyone else must be explicitly checked in Allowed Users.
  // Empty allowlist → only admins.
  const userAllowed =
    configLoaded
    && (isAdmin || isUserAllowedFn(userId))

  const platformOk = configLoaded && aiEnabled && userAllowed

  const canGenerate = (moduleKey: string) =>
    platformOk && can(moduleKey, 'can_generate_ai')

  const canAdvanced = (moduleKey: string) =>
    platformOk && can(moduleKey, 'can_use_advanced_ai')

  /** Copilot: needs Centralised AI + allowlist + Advanced AI on any AI module */
  const canUseCopilot = () =>
    platformOk && ADVANCED_AI_MODULES.some((m) => can(m, 'can_use_advanced_ai'))

  const getGenerateDenyReason = (moduleKey: string): AIDenyReason => {
    if (!configLoaded || !aiEnabled) return 'disabled'
    if (!userAllowed) return 'restricted'
    if (!can(moduleKey, 'can_generate_ai')) return 'permission'
    return null
  }

  const getCopilotDenyReason = (): AIDenyReason => {
    if (!configLoaded || !aiEnabled) return 'disabled'
    if (!userAllowed) return 'restricted'
    if (!ADVANCED_AI_MODULES.some((m) => can(m, 'can_use_advanced_ai'))) return 'permission'
    return null
  }

  /** Show the restriction popup when the user is blocked by the allowlist. */
  const notifyIfRestricted = (): boolean => {
    if (configLoaded && aiEnabled && !userAllowed) {
      showAIRestricted(AI_USER_RESTRICTED)
      return true
    }
    return false
  }

  return {
    aiEnabled,
    configLoaded,
    userAllowed,
    canGenerate,
    canAdvanced,
    canUseCopilot,
    getGenerateDenyReason,
    getCopilotDenyReason,
    notifyIfRestricted,
  }
}
