-- ============================================================
-- 028: Remove Unimplemented Modules
-- Clean up modules that were planned but never implemented
-- ============================================================

-- ══════════════════════════════════════════════════════════════
-- Remove unimplemented modules and their permissions
-- ══════════════════════════════════════════════════════════════

-- These modules were defined in migration 003_rbac.sql but never
-- had corresponding pages/components built:
-- - prompt-settings: AI prompt management (not implemented)
-- - analytics: Usage analytics dashboard (not implemented)
-- - ai-settings: AI provider settings (admin only, may exist)
-- - user-management: User admin panel (admin only, may exist)

-- First, delete all role_module_permissions for these modules
DELETE FROM public.role_module_permissions
WHERE module_id IN (
  SELECT id FROM public.modules
  WHERE module_key IN ('prompt-settings', 'analytics')
);

-- Then delete the modules themselves
DELETE FROM public.modules 
WHERE module_key IN ('prompt-settings', 'analytics');

-- ============================================================
-- Note: We're keeping ai-settings and user-management
-- ============================================================
-- These might have admin pages implemented or planned:
-- - ai-settings: Corresponds to /admin/ai-providers route
-- - user-management: Corresponds to /admin/users route
-- 
-- If these are also unimplemented, run this separately:
-- DELETE FROM public.role_module_permissions
-- WHERE module_id IN (
--   SELECT id FROM public.modules
--   WHERE module_key IN ('ai-settings', 'user-management')
-- );
-- 
-- DELETE FROM public.modules 
-- WHERE module_key IN ('ai-settings', 'user-management');
-- ============================================================

-- ============================================================
-- Documentation: Modules Removed
-- ============================================================
-- 
-- REMOVED MODULES:
-- 
-- 1. prompt-settings (/admin/prompts)
--    - Purpose: Manage AI prompt templates
--    - Status: Never implemented, prompts are hardcoded
--    - Permissions: view, create, edit, delete, generate_ai
--    - Impact: None (no UI existed)
-- 
-- 2. analytics (/analytics)
--    - Purpose: Usage analytics and insights
--    - Status: Never implemented
--    - Permissions: view, export
--    - Impact: None (no UI existed)
-- 
-- RETAINED MODULES (verify if implemented):
-- 
-- 3. ai-settings (/admin/ai-settings)
--    - Check if AdminAISettings.tsx exists and works
--    - If not implemented, remove in future migration
-- 
-- 4. user-management (/admin/users)
--    - Check if user admin page exists
--    - May overlap with enterprise user management
--    - If not implemented, remove in future migration
-- 
-- ============================================================
