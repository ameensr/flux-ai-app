-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 038: Fix Daily Report Dropdown Config Permissions
-- 
-- Restores proper write permissions for daily_report_dropdown_configs.
-- Migration 036 made the policy too restrictive (admin-only).
-- This migration restores the original intent from migration 013:
-- - super_admin has full access
-- - Users with can_configure permission for daily-report module can manage configs
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop the overly restrictive policy created in migration 036
DROP POLICY IF EXISTS "daily_report_configs_write" ON public.daily_report_dropdown_configs;

-- Recreate the policy matching the original from migration 013
-- This allows:
-- 1. super_admin (full access)
-- 2. admin (via is_admin() function)
-- 3. Any user whose role has can_configure permission for the daily-report module
CREATE POLICY "daily_report_configs_write" ON public.daily_report_dropdown_configs FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.role = 'super_admin' 
        OR public.is_admin()
        OR public.check_module_permission(p.role, 'daily-report', 'can_configure')
      )
  )
);

COMMENT ON POLICY "daily_report_configs_write" ON public.daily_report_dropdown_configs IS 
  'Allows super_admin, admins, and users with daily-report can_configure permission to manage dropdown configurations';
