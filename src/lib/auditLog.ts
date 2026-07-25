// src/lib/auditLog.ts
// Thin helper for writing entries to public.audit_logs from Roles &
// Permissions screens (RoleManagement, PermissionTemplates). The audit_logs
// table, its RLS policy (audit_service_insert — insert allowed for any
// authenticated request), and the AuditLogs.tsx viewer already existed, but
// nothing ever called insert on this table, so the Audit Logs tab was
// permanently empty. This wires that write path up without touching any
// existing Save/Discard/Create/Delete/Duplicate/Apply-Template behavior.
import { supabase } from './supabase'
import { useAppStore } from '@/store/useAppStore'

export type AuditAction =
  | 'role_created'
  | 'role_deleted'
  | 'permission_changed'
  | 'template_applied'

interface AuditLogInput {
  action: AuditAction
  targetType?: string
  targetId?: string | null
  module?: string | null
  oldValue?: unknown
  newValue?: unknown
}

/**
 * Records an audit trail entry. Never throws — a failure to write the audit
 * log must not block or roll back the underlying admin action (permission
 * save, role create/delete, template apply). Failures are logged to the
 * console for visibility instead.
 */
export async function logAuditEvent({
  action,
  targetType,
  targetId,
  module,
  oldValue,
  newValue,
}: AuditLogInput): Promise<void> {
  try {
    const { user, profile } = useAppStore.getState()
    const { error } = await supabase.from('audit_logs').insert({
      actor_id: user?.id ?? null,
      actor_email: profile?.email ?? user?.email ?? null,
      action,
      target_type: targetType ?? null,
      target_id: targetId ?? null,
      module: module ?? null,
      old_value: oldValue ?? null,
      new_value: newValue ?? null,
    })
    if (error) {
      console.warn(`[auditLog] failed to record "${action}":`, error.message)
    }
  } catch (e) {
    console.warn(`[auditLog] unexpected error recording "${action}":`, e)
  }
}
