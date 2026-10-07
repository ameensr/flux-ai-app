// src/lib/pandaIdleConfig.ts
// Configuration parser, validator, and formatter for Panda Idle Activity Detection.

export interface PandaIdleConfig {
  /** Whether the feature is enabled in .env and configuration is valid */
  enabled: boolean
  /** Idle duration in seconds before triggering the Panda idle message */
  thresholdSeconds: number
  /** Friendly message displayed in the Panda speech bubble */
  message: string
}

export const DEFAULT_PANDA_IDLE_MESSAGE = '<name> , Are you there, sleeping? 🐼'

/**
 * Formats the idle message template by injecting the user's name,
 * or gracefully falling back if no name is available.
 */
export function formatPandaIdleMessage(
  template: string,
  userName?: string | null
): string {
  const trimmedName = userName?.trim()

  if (trimmedName) {
    if (/<name>|{name}/i.test(template)) {
      return template.replace(/<name>|{name}/gi, trimmedName)
    }
    return `${trimmedName}, ${template}`
  }

  // If no name is provided (e.g. unauthenticated), gracefully strip the prefix/placeholder
  if (/<name>\s*,\s*|{name}\s*,\s*/i.test(template)) {
    return template.replace(/<name>\s*,\s*|{name}\s*,\s*/gi, '')
  }
  if (/<name>|{name}/i.test(template)) {
    return template.replace(/<name>|{name}/gi, 'there')
  }
  return template
}

/**
 * Safely parses and validates the Panda idle detection configuration from environment variables.
 * Fails safely: if detection is not explicitly true, or threshold is missing/invalid/< 1,
 * the feature is disabled without throwing errors or crashing the app.
 */
export function getPandaIdleConfig(
  env: Record<string, any> = import.meta.env
): PandaIdleConfig {
  const rawEnabled = env.VITE_PANDA_IDLE_DETECTION
  const isDetectionExplicitlyTrue =
    typeof rawEnabled === 'string'
      ? rawEnabled.trim().toLowerCase() === 'true'
      : Boolean(rawEnabled)

  const rawThreshold = env.VITE_PANDA_IDLE_THRESHOLD_SECONDS
  const parsedThreshold = Number(rawThreshold)

  // Validation: must be a valid, finite number >= 1
  const isValidThreshold =
    rawThreshold !== undefined &&
    rawThreshold !== null &&
    String(rawThreshold).trim() !== '' &&
    !isNaN(parsedThreshold) &&
    isFinite(parsedThreshold) &&
    parsedThreshold >= 1

  const enabled = isDetectionExplicitlyTrue && isValidThreshold

  const rawMessage = env.VITE_PANDA_IDLE_MESSAGE
  const message =
    typeof rawMessage === 'string' && rawMessage.trim().length > 0
      ? rawMessage.trim()
      : DEFAULT_PANDA_IDLE_MESSAGE

  return {
    enabled,
    thresholdSeconds: isValidThreshold ? Math.floor(parsedThreshold) : 0,
    message,
  }
}
