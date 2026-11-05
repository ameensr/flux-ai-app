-- Migration: Permission-based RLS for StoryPot sync writes
-- Previously the write policy hardcoded admin/super_admin/manager roles.
-- Now any role that has can_import enabled on the story-pot module in the
-- RBAC system (role_module_permissions) can write sync results.

-- Helper: reusable inline check — true if the current user's role has
-- can_import enabled for the story-pot module.
-- Used in both table policies below.

-- Fix sync_status write policy
DROP POLICY IF EXISTS "Admins can manage sync status" ON openproject_sync_status;

CREATE POLICY "Admins can manage sync status"
  ON openproject_sync_status
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM role_module_permissions rmp
      JOIN modules m   ON m.id  = rmp.module_id
      JOIN permissions p ON p.id = rmp.permission_id
      JOIN profiles pr  ON pr.id = auth.uid()
      JOIN roles r      ON r.role_key = pr.role
      WHERE m.module_key    = 'story-pot'
        AND p.permission_key = 'can_import'
        AND rmp.role_id      = r.id
        AND rmp.is_enabled   = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM role_module_permissions rmp
      JOIN modules m   ON m.id  = rmp.module_id
      JOIN permissions p ON p.id = rmp.permission_id
      JOIN profiles pr  ON pr.id = auth.uid()
      JOIN roles r      ON r.role_key = pr.role
      WHERE m.module_key    = 'story-pot'
        AND p.permission_key = 'can_import'
        AND rmp.role_id      = r.id
        AND rmp.is_enabled   = true
    )
  );

-- Fix work_packages_cache write policy
DROP POLICY IF EXISTS "Admins can manage cached work packages" ON openproject_work_packages_cache;

CREATE POLICY "Admins can manage cached work packages"
  ON openproject_work_packages_cache
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM role_module_permissions rmp
      JOIN modules m   ON m.id  = rmp.module_id
      JOIN permissions p ON p.id = rmp.permission_id
      JOIN profiles pr  ON pr.id = auth.uid()
      JOIN roles r      ON r.role_key = pr.role
      WHERE m.module_key    = 'story-pot'
        AND p.permission_key = 'can_import'
        AND rmp.role_id      = r.id
        AND rmp.is_enabled   = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM role_module_permissions rmp
      JOIN modules m   ON m.id  = rmp.module_id
      JOIN permissions p ON p.id = rmp.permission_id
      JOIN profiles pr  ON pr.id = auth.uid()
      JOIN roles r      ON r.role_key = pr.role
      WHERE m.module_key    = 'story-pot'
        AND p.permission_key = 'can_import'
        AND rmp.role_id      = r.id
        AND rmp.is_enabled   = true
    )
  );

-- Also rename the permission label in the DB to match the frontend
UPDATE permissions
SET
  permission_name = 'Sync Data',
  description     = 'Can sync / import data (e.g. sync from OpenProject, import from Excel/CSV)'
WHERE permission_key = 'can_import';
