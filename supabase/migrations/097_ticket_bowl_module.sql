-- ============================================================================
-- Migration: 097_ticket_bowl_module.sql
-- Module: Ticket Bowl
-- Description: Complete Ticket Bowl database structure, RBAC integration,
--              work package snapshots, exact forwarding transition history,
--              sync status tracking, data completeness handling, and
--              high-performance server-side progressive aggregation.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Register 'ticket-bowl' in RBAC modules registry
-- ----------------------------------------------------------------------------
INSERT INTO modules (module_key, module_name, route_path, icon, is_active, sort_order)
VALUES ('ticket-bowl', 'Ticket Bowl', '/ticket-bowl', 'Ticket', true, 25)
ON CONFLICT (module_key) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  route_path = EXCLUDED.route_path,
  icon = EXCLUDED.icon,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order;

-- ----------------------------------------------------------------------------
-- 2. Populate role_module_permissions for 'ticket-bowl'
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  v_module_id UUID;
  v_perm_view UUID;
  v_perm_dashboard UUID;
  v_perm_export UUID;
  v_perm_import UUID;
  v_perm_history UUID;
  v_role RECORD;
BEGIN
  SELECT id INTO v_module_id FROM modules WHERE module_key = 'ticket-bowl';
  SELECT id INTO v_perm_view FROM permissions WHERE permission_key = 'can_view';
  SELECT id INTO v_perm_dashboard FROM permissions WHERE permission_key = 'can_view_dashboard';
  SELECT id INTO v_perm_export FROM permissions WHERE permission_key = 'can_export';
  SELECT id INTO v_perm_import FROM permissions WHERE permission_key = 'can_import';
  SELECT id INTO v_perm_history FROM permissions WHERE permission_key = 'can_view_history';

  FOR v_role IN SELECT id, role_key FROM roles LOOP
    -- can_view - all roles get access
    IF v_perm_view IS NOT NULL THEN
      INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (v_role.id, v_module_id, v_perm_view, true)
      ON CONFLICT (role_id, module_id, permission_id) DO UPDATE SET is_enabled = true;
    END IF;

    -- can_view_dashboard - admin, super_admin, pro, manager, qa_lead
    IF v_perm_dashboard IS NOT NULL THEN
      INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (
        v_role.id, 
        v_module_id, 
        v_perm_dashboard, 
        v_role.role_key IN ('admin', 'super_admin', 'pro', 'manager', 'qa_lead')
      )
      ON CONFLICT (role_id, module_id, permission_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    END IF;

    -- can_export - all except free
    IF v_perm_export IS NOT NULL THEN
      INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (
        v_role.id, 
        v_module_id, 
        v_perm_export, 
        v_role.role_key != 'free'
      )
      ON CONFLICT (role_id, module_id, permission_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    END IF;

    -- can_import (Sync Data) - admin, super_admin, manager
    IF v_perm_import IS NOT NULL THEN
      INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (
        v_role.id, 
        v_module_id, 
        v_perm_import, 
        v_role.role_key IN ('admin', 'super_admin', 'manager')
      )
      ON CONFLICT (role_id, module_id, permission_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    END IF;

    -- can_view_history - all except free
    IF v_perm_history IS NOT NULL THEN
      INSERT INTO role_module_permissions (role_id, module_id, permission_id, is_enabled)
      VALUES (
        v_role.id, 
        v_module_id, 
        v_perm_history, 
        v_role.role_key != 'free'
      )
      ON CONFLICT (role_id, module_id, permission_id) DO UPDATE SET is_enabled = EXCLUDED.is_enabled;
    END IF;
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 3. Create table: ticket_bowl_work_packages
-- Latest synchronized snapshot of OpenProject work packages per project
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_bowl_work_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER,
  op_project_name TEXT,
  work_package_id BIGINT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT,
  type_id INTEGER,
  type_name TEXT NOT NULL,
  status_id INTEGER,
  status_name TEXT NOT NULL,
  priority_id INTEGER,
  priority_name TEXT NOT NULL DEFAULT 'Normal',
  author_id INTEGER,
  author_name TEXT,
  assignee_id INTEGER,
  assignee_name TEXT,
  responsible_id INTEGER,
  responsible_name TEXT,
  testing_status TEXT,          -- Current latest synchronized value of customField14
  is_qa_missed TEXT,            -- customField21: Yes, No, N/A, Unknown
  qa_confirmation TEXT,
  release_tag TEXT,
  version_name TEXT,
  percentage_done INTEGER DEFAULT 0,
  estimated_time TEXT,
  spent_time TEXT,
  story_points INTEGER,
  start_date DATE,
  due_date DATE,
  is_overdue BOOLEAN DEFAULT FALSE,
  created_at_op TIMESTAMPTZ,
  updated_at_op TIMESTAMPTZ,
  latest_forwarded_at TIMESTAMPTZ,       -- Most recent transition to "Forwarded to the Testing Team"
  latest_forwarded_by_id INTEGER,
  latest_forwarded_by_name TEXT,
  forwarding_count INTEGER DEFAULT 0,    -- Total verified forwarding events for this ticket
  
  -- Incomplete History & Verification Status
  sync_status TEXT NOT NULL DEFAULT 'synced' CHECK (sync_status IN ('synced', 'sync_failed', 'partially_synced')),
  history_verification_status TEXT NOT NULL DEFAULT 'unavailable' CHECK (history_verification_status IN ('verified', 'unavailable', 'unverified', 'no_matching_event')),
  history_checked_at TIMESTAMPTZ,
  history_error TEXT,

  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  raw_custom_fields JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_tb_wp_project_wpid UNIQUE (project_id, work_package_id)
);

-- ----------------------------------------------------------------------------
-- 4. Create table: ticket_bowl_forwarding_history
-- Preserves every verified transition to "Forwarded to the Testing Team"
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_bowl_forwarding_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER,
  work_package_id BIGINT NOT NULL,
  activity_id BIGINT,                    -- OpenProject activity/journal ID
  previous_testing_status TEXT,          -- Value before change
  new_testing_status TEXT NOT NULL DEFAULT 'Forwarded to the Testing Team',
  changed_at TIMESTAMPTZ NOT NULL,       -- Actual transition timestamp in UTC
  changed_by_id INTEGER,
  changed_by_name TEXT NOT NULL,         -- Actual actor from the journal entry
  verification_status TEXT NOT NULL DEFAULT 'verified',
  source TEXT NOT NULL DEFAULT 'sync',
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Deduplication composite constraint
  CONSTRAINT uq_tb_fwd_history UNIQUE (project_id, work_package_id, activity_id, changed_at)
);

-- ----------------------------------------------------------------------------
-- 5. Create table: ticket_bowl_sync_status
-- Tracks synchronization status per Qaly project and OpenProject project
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ticket_bowl_sync_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  op_project_id INTEGER,
  op_project_name TEXT,
  sync_status TEXT NOT NULL DEFAULT 'pending',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  total_fetched INTEGER DEFAULT 0,
  total_inserted INTEGER DEFAULT 0,
  total_updated INTEGER DEFAULT 0,
  forwarding_events_found INTEGER DEFAULT 0,
  history_verified_count INTEGER DEFAULT 0,
  history_unavailable_count INTEGER DEFAULT 0,
  history_unverified_count INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  last_successful_sync_at TIMESTAMPTZ,
  error_details TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT uq_tb_sync_status UNIQUE (project_id, op_project_id)
);

-- ----------------------------------------------------------------------------
-- 5.1 Migration Safety & Schema Resilience
-- If tables already existed from an earlier partial execution or initial draft,
-- guarantee all required columns and constraints exist before creating indexes.
-- ----------------------------------------------------------------------------
ALTER TABLE ticket_bowl_work_packages ADD COLUMN IF NOT EXISTS sync_status TEXT NOT NULL DEFAULT 'synced';
ALTER TABLE ticket_bowl_work_packages ADD COLUMN IF NOT EXISTS history_verification_status TEXT NOT NULL DEFAULT 'unavailable';
ALTER TABLE ticket_bowl_work_packages ADD COLUMN IF NOT EXISTS history_checked_at TIMESTAMPTZ;
ALTER TABLE ticket_bowl_work_packages ADD COLUMN IF NOT EXISTS history_error TEXT;

ALTER TABLE ticket_bowl_forwarding_history ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'verified';
ALTER TABLE ticket_bowl_forwarding_history ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'sync';

ALTER TABLE ticket_bowl_sync_status ADD COLUMN IF NOT EXISTS history_verified_count INTEGER DEFAULT 0;
ALTER TABLE ticket_bowl_sync_status ADD COLUMN IF NOT EXISTS history_unavailable_count INTEGER DEFAULT 0;
ALTER TABLE ticket_bowl_sync_status ADD COLUMN IF NOT EXISTS history_unverified_count INTEGER DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tb_wp_sync_status'
  ) THEN
    ALTER TABLE ticket_bowl_work_packages 
      ADD CONSTRAINT chk_tb_wp_sync_status 
      CHECK (sync_status IN ('synced', 'sync_failed', 'partially_synced'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_tb_wp_history_verif'
  ) THEN
    ALTER TABLE ticket_bowl_work_packages 
      ADD CONSTRAINT chk_tb_wp_history_verif 
      CHECK (history_verification_status IN ('verified', 'unavailable', 'unverified', 'no_matching_event'));
  END IF;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 6. Indexes for Performance & Fast Search
-- ----------------------------------------------------------------------------

-- Work package filtering & sorting indexes
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_wp ON ticket_bowl_work_packages(project_id, work_package_id);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_op_proj ON ticket_bowl_work_packages(project_id, op_project_id);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_latest_fwd ON ticket_bowl_work_packages(project_id, latest_forwarded_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_testing_status ON ticket_bowl_work_packages(project_id, testing_status);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_type ON ticket_bowl_work_packages(project_id, type_name);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_status ON ticket_bowl_work_packages(project_id, status_name);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_priority ON ticket_bowl_work_packages(project_id, priority_name);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_assignee ON ticket_bowl_work_packages(project_id, assignee_name);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_author ON ticket_bowl_work_packages(project_id, author_name);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_qa_missed ON ticket_bowl_work_packages(project_id, is_qa_missed);
CREATE INDEX IF NOT EXISTS idx_tb_wp_proj_history_verif ON ticket_bowl_work_packages(project_id, history_verification_status);
CREATE INDEX IF NOT EXISTS idx_tb_wp_subject_gin ON ticket_bowl_work_packages USING gin(to_tsvector('english', subject));

-- Forwarding history indexes
CREATE INDEX IF NOT EXISTS idx_tb_fwd_proj_changed_at ON ticket_bowl_forwarding_history(project_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tb_fwd_wp_changed_at ON ticket_bowl_forwarding_history(work_package_id, changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_tb_fwd_changed_at ON ticket_bowl_forwarding_history(changed_at DESC);

-- Sync status index
CREATE INDEX IF NOT EXISTS idx_tb_sync_proj ON ticket_bowl_sync_status(project_id);

-- ----------------------------------------------------------------------------
-- 7. Row Level Security (RLS) Policies
-- ----------------------------------------------------------------------------

ALTER TABLE ticket_bowl_work_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_bowl_forwarding_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_bowl_sync_status ENABLE ROW LEVEL SECURITY;

-- SELECT: Admins/managers or project members
DROP POLICY IF EXISTS "Users can view ticket bowl work packages" ON ticket_bowl_work_packages;
CREATE POLICY "Users can view ticket bowl work packages"
  ON ticket_bowl_work_packages FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin', 'manager'))
    OR
    EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ticket_bowl_work_packages.project_id AND pm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view ticket bowl forwarding history" ON ticket_bowl_forwarding_history;
CREATE POLICY "Users can view ticket bowl forwarding history"
  ON ticket_bowl_forwarding_history FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin', 'manager'))
    OR
    EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ticket_bowl_forwarding_history.project_id AND pm.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "Users can view ticket bowl sync status" ON ticket_bowl_sync_status;
CREATE POLICY "Users can view ticket bowl sync status"
  ON ticket_bowl_sync_status FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin', 'manager'))
    OR
    EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = ticket_bowl_sync_status.project_id AND pm.user_id = auth.uid())
  );

-- WRITE: RBAC can_import on 'ticket-bowl'
DROP POLICY IF EXISTS "Authorized users can manage ticket bowl work packages" ON ticket_bowl_work_packages;
CREATE POLICY "Authorized users can manage ticket bowl work packages"
  ON ticket_bowl_work_packages FOR ALL
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

DROP POLICY IF EXISTS "Authorized users can manage ticket bowl forwarding history" ON ticket_bowl_forwarding_history;
CREATE POLICY "Authorized users can manage ticket bowl forwarding history"
  ON ticket_bowl_forwarding_history FOR ALL
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

DROP POLICY IF EXISTS "Authorized users can manage ticket bowl sync status" ON ticket_bowl_sync_status;
CREATE POLICY "Authorized users can manage ticket bowl sync status"
  ON ticket_bowl_sync_status FOR ALL
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

-- ----------------------------------------------------------------------------
-- 8. Stored Procedure: get_ticket_bowl_work_packages
-- Server-side filtering, forwarding event matching, sorting, and pagination
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_ticket_bowl_work_packages;
CREATE OR REPLACE FUNCTION get_ticket_bowl_work_packages(
  p_project_id UUID,
  p_op_project_id INTEGER DEFAULT NULL,
  p_forwarded_from TIMESTAMPTZ DEFAULT NULL,
  p_forwarded_to TIMESTAMPTZ DEFAULT NULL,
  p_type_name TEXT DEFAULT NULL,
  p_status_name TEXT DEFAULT NULL,
  p_priority_name TEXT DEFAULT NULL,
  p_testing_status TEXT DEFAULT NULL,
  p_is_qa_missed TEXT DEFAULT NULL,
  p_author_name TEXT DEFAULT NULL,
  p_assignee_name TEXT DEFAULT NULL,
  p_history_verification_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  project_id UUID,
  op_project_id INTEGER,
  op_project_name TEXT,
  work_package_id BIGINT,
  subject TEXT,
  description TEXT,
  type_id INTEGER,
  type_name TEXT,
  status_id INTEGER,
  status_name TEXT,
  priority_id INTEGER,
  priority_name TEXT,
  author_id INTEGER,
  author_name TEXT,
  assignee_id INTEGER,
  assignee_name TEXT,
  responsible_id INTEGER,
  responsible_name TEXT,
  testing_status TEXT,
  is_qa_missed TEXT,
  qa_confirmation TEXT,
  release_tag TEXT,
  version_name TEXT,
  percentage_done INTEGER,
  estimated_time TEXT,
  spent_time TEXT,
  story_points INTEGER,
  start_date DATE,
  due_date DATE,
  is_overdue BOOLEAN,
  created_at_op TIMESTAMPTZ,
  updated_at_op TIMESTAMPTZ,
  matched_forwarded_at TIMESTAMPTZ,
  matched_forwarded_by TEXT,
  forwarding_count INTEGER,
  sync_status TEXT,
  history_verification_status TEXT,
  history_checked_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  total_matching_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total BIGINT;
BEGIN
  -- 1. Compute total matching tickets count
  SELECT COUNT(DISTINCT wp.id) INTO v_total
  FROM ticket_bowl_work_packages wp
  WHERE wp.project_id = p_project_id
    AND (p_op_project_id IS NULL OR wp.op_project_id = p_op_project_id)
    AND (p_type_name IS NULL OR wp.type_name = p_type_name)
    AND (p_status_name IS NULL OR wp.status_name = p_status_name)
    AND (p_priority_name IS NULL OR wp.priority_name = p_priority_name)
    AND (p_testing_status IS NULL OR wp.testing_status = p_testing_status)
    AND (p_is_qa_missed IS NULL OR wp.is_qa_missed = p_is_qa_missed)
    AND (p_author_name IS NULL OR wp.author_name ILIKE '%' || p_author_name || '%')
    AND (p_assignee_name IS NULL OR wp.assignee_name ILIKE '%' || p_assignee_name || '%')
    AND (p_history_verification_status IS NULL OR wp.history_verification_status = p_history_verification_status)
    AND (
      p_search IS NULL OR
      wp.subject ILIKE '%' || p_search || '%' OR
      wp.work_package_id::TEXT = p_search
    )
    AND (
      (p_forwarded_from IS NULL AND p_forwarded_to IS NULL)
      OR
      EXISTS (
        SELECT 1
        FROM ticket_bowl_forwarding_history fh
        WHERE fh.project_id = wp.project_id
          AND fh.work_package_id = wp.work_package_id
          AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
          AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
      )
      OR
      (
        wp.latest_forwarded_at IS NOT NULL
        AND (p_forwarded_from IS NULL OR wp.latest_forwarded_at >= p_forwarded_from)
        AND (p_forwarded_to IS NULL OR wp.latest_forwarded_at <= p_forwarded_to)
      )
    );

  -- 2. Return paginated records with the matched forwarding event
  RETURN QUERY
  SELECT 
    wp.id,
    wp.project_id,
    wp.op_project_id,
    wp.op_project_name,
    wp.work_package_id,
    wp.subject,
    wp.description,
    wp.type_id,
    wp.type_name,
    wp.status_id,
    wp.status_name,
    wp.priority_id,
    wp.priority_name,
    wp.author_id,
    wp.author_name,
    wp.assignee_id,
    wp.assignee_name,
    wp.responsible_id,
    wp.responsible_name,
    wp.testing_status,
    wp.is_qa_missed,
    wp.qa_confirmation,
    wp.release_tag,
    wp.version_name,
    wp.percentage_done,
    wp.estimated_time,
    wp.spent_time,
    wp.story_points,
    wp.start_date,
    wp.due_date,
    wp.is_overdue,
    wp.created_at_op,
    wp.updated_at_op,
    -- If date filtered, pick latest forwarding event WITHIN the date filter; else ticket's latest
    COALESCE(
      (
        SELECT fh.changed_at
        FROM ticket_bowl_forwarding_history fh
        WHERE fh.project_id = wp.project_id
          AND fh.work_package_id = wp.work_package_id
          AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
          AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
        ORDER BY fh.changed_at DESC
        LIMIT 1
      ),
      wp.latest_forwarded_at
    ) AS matched_forwarded_at,
    COALESCE(
      (
        SELECT fh.changed_by_name
        FROM ticket_bowl_forwarding_history fh
        WHERE fh.project_id = wp.project_id
          AND fh.work_package_id = wp.work_package_id
          AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
          AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
        ORDER BY fh.changed_at DESC
        LIMIT 1
      ),
      wp.latest_forwarded_by_name
    ) AS matched_forwarded_by,
    wp.forwarding_count,
    wp.sync_status,
    wp.history_verification_status,
    wp.history_checked_at,
    wp.last_synced_at,
    v_total AS total_matching_count
  FROM ticket_bowl_work_packages wp
  WHERE wp.project_id = p_project_id
    AND (p_op_project_id IS NULL OR wp.op_project_id = p_op_project_id)
    AND (p_type_name IS NULL OR wp.type_name = p_type_name)
    AND (p_status_name IS NULL OR wp.status_name = p_status_name)
    AND (p_priority_name IS NULL OR wp.priority_name = p_priority_name)
    AND (p_testing_status IS NULL OR wp.testing_status = p_testing_status)
    AND (p_is_qa_missed IS NULL OR wp.is_qa_missed = p_is_qa_missed)
    AND (p_author_name IS NULL OR wp.author_name ILIKE '%' || p_author_name || '%')
    AND (p_assignee_name IS NULL OR wp.assignee_name ILIKE '%' || p_assignee_name || '%')
    AND (p_history_verification_status IS NULL OR wp.history_verification_status = p_history_verification_status)
    AND (
      p_search IS NULL OR
      wp.subject ILIKE '%' || p_search || '%' OR
      wp.work_package_id::TEXT = p_search
    )
    AND (
      (p_forwarded_from IS NULL AND p_forwarded_to IS NULL)
      OR
      EXISTS (
        SELECT 1
        FROM ticket_bowl_forwarding_history fh
        WHERE fh.project_id = wp.project_id
          AND fh.work_package_id = wp.work_package_id
          AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
          AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
      )
      OR
      (
        wp.latest_forwarded_at IS NOT NULL
        AND (p_forwarded_from IS NULL OR wp.latest_forwarded_at >= p_forwarded_from)
        AND (p_forwarded_to IS NULL OR wp.latest_forwarded_at <= p_forwarded_to)
      )
    )
  ORDER BY 
    COALESCE(
      (
        SELECT fh.changed_at
        FROM ticket_bowl_forwarding_history fh
        WHERE fh.project_id = wp.project_id
          AND fh.work_package_id = wp.work_package_id
          AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
          AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
        ORDER BY fh.changed_at DESC
        LIMIT 1
      ),
      wp.latest_forwarded_at
    ) DESC NULLS LAST,
    wp.updated_at_op DESC NULLS LAST,
    wp.work_package_id DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ----------------------------------------------------------------------------
-- 9. Stored Procedure: get_ticket_bowl_dashboard_stats
-- Computes complete dataset analytics: unique tickets, event counts,
-- repeat counts, current Testing Status distribution, and history verification
-- ----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS get_ticket_bowl_dashboard_stats;
CREATE OR REPLACE FUNCTION get_ticket_bowl_dashboard_stats(
  p_project_id UUID,
  p_op_project_id INTEGER DEFAULT NULL,
  p_forwarded_from TIMESTAMPTZ DEFAULT NULL,
  p_forwarded_to TIMESTAMPTZ DEFAULT NULL,
  p_type_name TEXT DEFAULT NULL,
  p_status_name TEXT DEFAULT NULL,
  p_priority_name TEXT DEFAULT NULL,
  p_testing_status TEXT DEFAULT NULL,
  p_is_qa_missed TEXT DEFAULT NULL,
  p_author_name TEXT DEFAULT NULL,
  p_assignee_name TEXT DEFAULT NULL,
  p_history_verification_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
  total_unique_tickets BIGINT,
  total_forwarding_events BIGINT,
  repeat_forwarded_tickets BIGINT,
  unavailable_history_tickets BIGINT,
  current_testing_status_counts JSONB,
  qa_missed_counts JSONB,
  type_counts JSONB,
  priority_counts JSONB,
  history_verification_counts JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH matched_tickets AS (
    SELECT wp.*
    FROM ticket_bowl_work_packages wp
    WHERE wp.project_id = p_project_id
      AND (p_op_project_id IS NULL OR wp.op_project_id = p_op_project_id)
      AND (p_type_name IS NULL OR wp.type_name = p_type_name)
      AND (p_status_name IS NULL OR wp.status_name = p_status_name)
      AND (p_priority_name IS NULL OR wp.priority_name = p_priority_name)
      AND (p_testing_status IS NULL OR wp.testing_status = p_testing_status)
      AND (p_is_qa_missed IS NULL OR wp.is_qa_missed = p_is_qa_missed)
      AND (p_author_name IS NULL OR wp.author_name ILIKE '%' || p_author_name || '%')
      AND (p_assignee_name IS NULL OR wp.assignee_name ILIKE '%' || p_assignee_name || '%')
      AND (p_history_verification_status IS NULL OR wp.history_verification_status = p_history_verification_status)
      AND (
        p_search IS NULL OR
        wp.subject ILIKE '%' || p_search || '%' OR
        wp.work_package_id::TEXT = p_search
      )
      AND (
        (p_forwarded_from IS NULL AND p_forwarded_to IS NULL)
        OR
        EXISTS (
          SELECT 1
          FROM ticket_bowl_forwarding_history fh
          WHERE fh.project_id = wp.project_id
            AND fh.work_package_id = wp.work_package_id
            AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
            AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
        )
        OR
        (
          wp.latest_forwarded_at IS NOT NULL
          AND (p_forwarded_from IS NULL OR wp.latest_forwarded_at >= p_forwarded_from)
          AND (p_forwarded_to IS NULL OR wp.latest_forwarded_at <= p_forwarded_to)
        )
      )
  ),
  events_in_range AS (
    SELECT COUNT(*) AS event_count
    FROM ticket_bowl_forwarding_history fh
    JOIN matched_tickets mt 
      ON mt.project_id = fh.project_id 
     AND mt.work_package_id = fh.work_package_id
    WHERE (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
      AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
  ),
  testing_status_agg AS (
    SELECT COALESCE(
      jsonb_object_agg(COALESCE(testing_status, 'No Testing Status'), cnt),
      '{}'::jsonb
    ) AS agg
    FROM (
      SELECT testing_status, COUNT(*)::bigint AS cnt
      FROM matched_tickets
      GROUP BY testing_status
    ) s
  ),
  qa_missed_agg AS (
    SELECT COALESCE(
      jsonb_object_agg(COALESCE(is_qa_missed, 'Unknown'), cnt),
      '{}'::jsonb
    ) AS agg
    FROM (
      SELECT is_qa_missed, COUNT(*)::bigint AS cnt
      FROM matched_tickets
      GROUP BY is_qa_missed
    ) s
  ),
  type_agg AS (
    SELECT COALESCE(
      jsonb_object_agg(COALESCE(type_name, 'Unknown'), cnt),
      '{}'::jsonb
    ) AS agg
    FROM (
      SELECT type_name, COUNT(*)::bigint AS cnt
      FROM matched_tickets
      GROUP BY type_name
    ) s
  ),
  priority_agg AS (
    SELECT COALESCE(
      jsonb_object_agg(COALESCE(priority_name, 'Normal'), cnt),
      '{}'::jsonb
    ) AS agg
    FROM (
      SELECT priority_name, COUNT(*)::bigint AS cnt
      FROM matched_tickets
      GROUP BY priority_name
    ) s
  ),
  history_verif_agg AS (
    SELECT COALESCE(
      jsonb_object_agg(COALESCE(history_verification_status, 'unavailable'), cnt),
      '{}'::jsonb
    ) AS agg
    FROM (
      SELECT history_verification_status, COUNT(*)::bigint AS cnt
      FROM matched_tickets
      GROUP BY history_verification_status
    ) s
  )
  SELECT 
    (SELECT COUNT(*) FROM matched_tickets)::bigint AS total_unique_tickets,
    (SELECT event_count FROM events_in_range)::bigint AS total_forwarding_events,
    (SELECT COUNT(*) FROM matched_tickets WHERE forwarding_count > 1)::bigint AS repeat_forwarded_tickets,
    (SELECT COUNT(*) FROM matched_tickets WHERE history_verification_status = 'unavailable')::bigint AS unavailable_history_tickets,
    (SELECT agg FROM testing_status_agg) AS current_testing_status_counts,
    (SELECT agg FROM qa_missed_agg) AS qa_missed_counts,
    (SELECT agg FROM type_agg) AS type_counts,
    (SELECT agg FROM priority_agg) AS priority_counts,
    (SELECT agg FROM history_verif_agg) AS history_verification_counts;
END;
$$;

-- ----------------------------------------------------------------------------
-- 10. Permissions Grants
-- ----------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_bowl_work_packages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_bowl_forwarding_history TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ticket_bowl_sync_status TO authenticated;
GRANT EXECUTE ON FUNCTION get_ticket_bowl_work_packages TO authenticated;
GRANT EXECUTE ON FUNCTION get_ticket_bowl_dashboard_stats TO authenticated;

-- ============================================================================
-- END OF MIGRATION: 097_ticket_bowl_module.sql
-- ============================================================================
