-- ============================================================================
-- Migration: 099_activity_sync_cursor.sql
-- Description: Add activity sync cursor table for incremental activity fetching
--              Tracks the last fetched activity ID per work package to avoid
--              re-fetching entire activity history on every sync.
-- ============================================================================

-- Create activity sync cursor table
CREATE TABLE IF NOT EXISTS ticket_bowl_activity_sync_cursor (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  work_package_id BIGINT NOT NULL,
  last_activity_id BIGINT NOT NULL,
  last_activity_synced_at TIMESTAMPTZ NOT NULL,
  total_activities_fetched INTEGER DEFAULT 0,
  last_sync_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT uq_activity_cursor UNIQUE (project_id, work_package_id)
);

-- Create index for fast lookups
CREATE INDEX IF NOT EXISTS idx_activity_cursor_project_wp 
  ON ticket_bowl_activity_sync_cursor(project_id, work_package_id);

-- Enable RLS
ALTER TABLE ticket_bowl_activity_sync_cursor ENABLE ROW LEVEL SECURITY;

-- RLS Policies (same as ticket_bowl_work_packages)
DROP POLICY IF EXISTS "Users can view activity sync cursors" ON ticket_bowl_activity_sync_cursor;
CREATE POLICY "Users can view activity sync cursors"
  ON ticket_bowl_activity_sync_cursor FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin', 'manager'))
    OR
    EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ticket_bowl_activity_sync_cursor.project_id AND pm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Authorized users can manage activity sync cursors" ON ticket_bowl_activity_sync_cursor;
CREATE POLICY "Authorized users can manage activity sync cursors"
  ON ticket_bowl_activity_sync_cursor FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM role_module_permissions rmp
      JOIN modules m ON m.id = rmp.module_id
      JOIN permissions p ON p.id = rmp.permission_id
      JOIN profiles pr ON pr.id = auth.uid()
      JOIN roles r ON r.role_key = pr.role
      WHERE m.module_key = 'ticket-bowl'
        AND p.permission_key = 'can_import'
        AND rmp.role_id = r.id
        AND rmp.is_enabled = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM role_module_permissions rmp
      JOIN modules m ON m.id = rmp.module_id
      JOIN permissions p ON p.id = rmp.permission_id
      JOIN profiles pr ON pr.id = auth.uid()
      JOIN roles r ON r.role_key = pr.role
      WHERE m.module_key = 'ticket-bowl'
        AND p.permission_key = 'can_import'
        AND rmp.role_id = r.id
        AND rmp.is_enabled = true
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_bowl_activity_sync_cursor TO authenticated;

-- Add comment
COMMENT ON TABLE ticket_bowl_activity_sync_cursor IS 'Tracks last fetched activity ID per work package for incremental activity syncing';
COMMENT ON COLUMN ticket_bowl_activity_sync_cursor.last_activity_id IS 'Highest activity ID fetched for this work package';
COMMENT ON COLUMN ticket_bowl_activity_sync_cursor.last_activity_synced_at IS 'Timestamp of the last_activity_id';
