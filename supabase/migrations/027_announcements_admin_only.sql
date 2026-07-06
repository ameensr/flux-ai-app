-- ============================================================
-- 027: Update Announcements to Admin-Only
-- Reflect that Announcements is now integrated into Admin Panel
-- Update route_path and ensure it's properly configured
-- ============================================================

-- Update the announcements module route_path to reflect admin-only access
UPDATE public.modules 
SET 
  route_path = '/admin/announcements',
  icon = 'Megaphone',
  sort_order = 11
WHERE module_key = 'announcements';

-- Ensure announcements module exists (in case of fresh install)
INSERT INTO public.modules (module_key, module_name, route_path, icon, sort_order, is_active) 
VALUES (
  'announcements', 
  'Announcements', 
  '/admin/announcements', 
  'Megaphone', 
  11,
  true
)
ON CONFLICT (module_key) DO UPDATE SET
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  sort_order = EXCLUDED.sort_order;

-- ============================================================
-- Documentation: Announcements is now Admin-Only
-- ============================================================
-- The Announcements feature has been refactored:
-- 
-- BEFORE:
-- - Standalone module with sidebar entry
-- - Route: /announcements
-- - Pro/Free users had view access
-- - Admins had full access
--
-- AFTER:
-- - Integrated into Admin Panel as a tab
-- - Route: /admin/announcements
-- - Only accessible to users with admin module view permission
-- - Permission-based tab visibility using canView('announcements')
-- - Non-admin users can still VIEW published announcements on Dashboard
--   (via AnnouncementsWidget), but cannot manage them
--
-- Frontend Changes (already completed):
-- ✓ Removed from sidebar navigation
-- ✓ Removed standalone routes (/announcements, /manage/announcements)
-- ✓ Added as conditional tab in AdminPanel.tsx
-- ✓ AnnouncementsWidget navigates to /admin/announcements
-- ✓ Dynamic permission system (modulePermissions.ts)
-- ✓ Enterprise RBAC UI shows only relevant permissions
-- ✓ Migration 026 cleaned up permissions (admin gets 5, others get 0)
--
-- Backend/Database:
-- ✓ RLS policies already comprehensive (017_announcements_rls_rbac.sql)
-- ✓ View policy: admins see all, users see published to their audience
-- ✓ Create policy: authenticated users (frontend checks permissions)
-- ✓ Edit policy: author or admin
-- ✓ Delete policy: admin only
-- ============================================================
