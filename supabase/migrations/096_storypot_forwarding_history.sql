-- Migration: StoryPot forwarding history table
-- Stores every individual "Forwarded to the Testing Team" transition event per ticket.
-- The main cache table (openproject_work_packages_cache) keeps only the LATEST event
-- for fast date-range filtering. This table preserves the full history.

CREATE TABLE IF NOT EXISTS openproject_forwarding_history (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wp_id         BIGINT      NOT NULL,
  project_id    UUID        NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER,

  -- The exact transition event
  changed_at    TIMESTAMPTZ NOT NULL,
  changed_by    TEXT        NOT NULL,
  old_value     TEXT,                   -- Testing Status value before the transition
  new_value     TEXT        NOT NULL DEFAULT 'Forwarded to the Testing Team',

  -- Sync metadata
  synced_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Prevent duplicate events: same ticket + same timestamp = same event
  UNIQUE (wp_id, changed_at)
);

CREATE INDEX idx_fwd_history_wp       ON openproject_forwarding_history(wp_id);
CREATE INDEX idx_fwd_history_project  ON openproject_forwarding_history(project_id, changed_at DESC);
CREATE INDEX idx_fwd_history_date     ON openproject_forwarding_history(changed_at DESC);

-- RLS
ALTER TABLE openproject_forwarding_history ENABLE ROW LEVEL SECURITY;

-- Read: project members
CREATE POLICY "Members can view forwarding history"
  ON openproject_forwarding_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = openproject_forwarding_history.project_id
        AND pm.user_id = auth.uid()
    )
  );

-- Write: same RBAC check as the cache table (can_import on story-pot)
CREATE POLICY "Importers can manage forwarding history"
  ON openproject_forwarding_history FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM role_module_permissions rmp
      JOIN modules m    ON m.id  = rmp.module_id
      JOIN permissions p ON p.id = rmp.permission_id
      JOIN profiles pr   ON pr.id = auth.uid()
      JOIN roles r       ON r.role_key = pr.role
      WHERE m.module_key     = 'story-pot'
        AND p.permission_key = 'can_import'
        AND rmp.role_id      = r.id
        AND rmp.is_enabled   = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM role_module_permissions rmp
      JOIN modules m    ON m.id  = rmp.module_id
      JOIN permissions p ON p.id = rmp.permission_id
      JOIN profiles pr   ON pr.id = auth.uid()
      JOIN roles r       ON r.role_key = pr.role
      WHERE m.module_key     = 'story-pot'
        AND p.permission_key = 'can_import'
        AND rmp.role_id      = r.id
        AND rmp.is_enabled   = true
    )
  );

GRANT SELECT ON openproject_forwarding_history TO authenticated;
