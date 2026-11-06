-- ============================================================================
-- SCRIPT: ticket_bowl_storypot_cleanup.sql
-- PURPOSE: Complete, safe, and surgical removal of legacy StoryPot database
--          resources in preparation for the new Ticket Bowl module.
--
-- TARGET ENVIRONMENT: Local Supabase / PostgreSQL or Live Production Supabase.
--
-- SAFETY GUARANTEES:
--   1. NEVER touches or drops shared application tables:
--      - projects (Project Hub & project definitions)
--      - project_members (Project memberships & roles)
--      - profiles (User identity & system roles)
--      - roles (System role definitions)
--      - permissions (Shared permission keys such as can_view, can_export, can_import)
--   2. Only removes StoryPot-specific tables, functions, policies, and module records.
--   3. Encapsulated in a transaction block so any error automatically aborts.
--   4. Includes PRE-EXECUTION diagnostics and POST-EXECUTION verification.
-- ============================================================================


-- ============================================================================
-- PART 1: PRE-EXECUTION DIAGNOSTICS & VERIFICATION (READ-ONLY)
-- Run these queries prior to execution to inspect existing StoryPot resources.
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '------------------------------------------------------------';
  RAISE NOTICE 'STARTING PRE-EXECUTION DIAGNOSTIC AUDIT FOR STORYPOT REMOVAL';
  RAISE NOTICE '------------------------------------------------------------';
END $$;

-- 1.1 Verify presence and row count of StoryPot-specific tables
SELECT 
  table_schema, 
  table_name,
  (xpath('/row/cnt/text()', xml_count))[1]::text::bigint AS estimated_or_exact_rows
FROM (
  SELECT 
    table_schema, 
    table_name,
    query_to_xml(format('SELECT COUNT(*) AS cnt FROM %I.%I', table_schema, table_name), false, true, '') AS xml_count
  FROM information_schema.tables
  WHERE table_schema = 'public' 
    AND table_name IN ('openproject_work_packages_cache', 'openproject_forwarding_history', 'openproject_sync_status')
) t;

-- 1.2 Verify StoryPot functions
SELECT 
  routine_schema, 
  routine_name, 
  data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_storypot_work_packages', 'get_storypot_stats');

-- 1.3 Verify StoryPot module and role permission associations
SELECT 
  m.id AS module_uuid,
  m.module_key,
  m.module_name,
  COUNT(rmp.id) AS role_module_permission_count
FROM modules m
LEFT JOIN role_module_permissions rmp ON rmp.module_id = m.id
WHERE m.module_key = 'story-pot'
GROUP BY m.id, m.module_key, m.module_name;

-- 1.4 Sanity check: verify that critical shared tables exist (must NOT be empty)
SELECT 
  'SHARED TABLE SANITY CHECK' AS check_type,
  table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = t.table_name
  ) AS table_exists
FROM (
  VALUES 
    ('projects'),
    ('project_members'),
    ('profiles'),
    ('roles'),
    ('permissions'),
    ('role_module_permissions'),
    ('modules')
) AS t(table_name);


-- ============================================================================
-- PART 2: ATOMIC STORYPOT CLEANUP TRANSACTION
-- Destructive execution strictly targeted at StoryPot resources.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- STEP 2.1: Drop RLS Policies on StoryPot Tables
-- Explicitly dropping policies ensures clean removal regardless of cascading rules.
-- ----------------------------------------------------------------------------

-- Policies on openproject_work_packages_cache
DROP POLICY IF EXISTS "Users can view cached work packages for their projects" ON openproject_work_packages_cache;
DROP POLICY IF EXISTS "Admins can manage cached work packages" ON openproject_work_packages_cache;

-- Policies on openproject_sync_status
DROP POLICY IF EXISTS "Users can view sync status for their projects" ON openproject_sync_status;
DROP POLICY IF EXISTS "Admins can manage sync status" ON openproject_sync_status;

-- Policies on openproject_forwarding_history
DROP POLICY IF EXISTS "Members can view forwarding history" ON openproject_forwarding_history;
DROP POLICY IF EXISTS "Importers can manage forwarding history" ON openproject_forwarding_history;


-- ----------------------------------------------------------------------------
-- STEP 2.2: Drop StoryPot Tables
-- Order of drops respects foreign key hierarchy (all reference `projects` table only).
-- No other tables in the application reference these 3 tables.
-- ----------------------------------------------------------------------------

-- Table 1: StoryPot Forwarding History
-- Stores historical forwarding events from migration 096.
DROP TABLE IF EXISTS openproject_forwarding_history CASCADE;

-- Table 2: StoryPot Work Packages Cache
-- Stores ticket snapshot cache from migration 091.
DROP TABLE IF EXISTS openproject_work_packages_cache CASCADE;

-- Table 3: StoryPot Sync Status
-- Tracks sync timestamps and counts from migration 091.
DROP TABLE IF EXISTS openproject_sync_status CASCADE;


-- ----------------------------------------------------------------------------
-- STEP 2.3: Drop StoryPot Database Functions
-- Functions created in migration 091 specifically for StoryPot listing & stats.
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS public.get_storypot_work_packages(
  UUID,
  INTEGER,
  TIMESTAMPTZ,
  TIMESTAMPTZ,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  TEXT,
  INTEGER,
  INTEGER
);

DROP FUNCTION IF EXISTS public.get_storypot_stats(
  UUID,
  INTEGER
);


-- ----------------------------------------------------------------------------
-- STEP 2.4: Remove StoryPot RBAC Module Registration
-- NOTE: We do NOT delete rows from the `permissions` table, because permissions
-- like `can_view`, `can_view_dashboard`, `can_export`, and `can_import` are
-- shared system permission keys used by Dashboard, Release Tracker, Support Tracker, etc.
-- We ONLY remove the role-to-module assignments for StoryPot and the module row.
-- ----------------------------------------------------------------------------

-- Delete role_module_permissions for the story-pot module
DELETE FROM role_module_permissions
WHERE module_id IN (
  SELECT id FROM modules WHERE module_key = 'story-pot'
);

-- Delete the module entry itself
DELETE FROM modules
WHERE module_key = 'story-pot';

COMMIT;


-- ============================================================================
-- PART 3: POST-EXECUTION VERIFICATION AUDIT (READ-ONLY)
-- Run these queries after execution to guarantee clean removal and system health.
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '------------------------------------------------------------';
  RAISE NOTICE 'STARTING POST-EXECUTION VERIFICATION FOR STORYPOT REMOVAL';
  RAISE NOTICE '------------------------------------------------------------';
END $$;

-- 3.1 Verify StoryPot tables are completely gone (Expected: 0 rows)
SELECT 
  table_name,
  'FAIL: Table still exists!' AS audit_status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('openproject_work_packages_cache', 'openproject_forwarding_history', 'openproject_sync_status');

-- 3.2 Verify StoryPot functions are completely gone (Expected: 0 rows)
SELECT 
  routine_name,
  'FAIL: Function still exists!' AS audit_status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_storypot_work_packages', 'get_storypot_stats');

-- 3.3 Verify StoryPot module is completely gone (Expected: 0 rows)
SELECT 
  module_key,
  module_name,
  'FAIL: Module still exists!' AS audit_status
FROM modules
WHERE module_key = 'story-pot';

-- 3.4 Verify StoryPot role_module_permissions are completely gone (Expected: 0 rows)
SELECT 
  COUNT(*) AS orphaned_role_module_permissions,
  CASE WHEN COUNT(*) = 0 THEN 'PASS: Clean' ELSE 'FAIL: Orphaned records found' END AS audit_status
FROM role_module_permissions rmp
JOIN modules m ON m.id = rmp.module_id
WHERE m.module_key = 'story-pot';

-- 3.5 Verify shared application tables remain intact and operational
SELECT 
  'SHARED TABLE HEALTH CHECK' AS check_type,
  table_name,
  EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = t.table_name
  ) AS table_exists,
  (xpath('/row/cnt/text()', xml_count))[1]::text::bigint AS current_row_count
FROM (
  SELECT 
    table_name,
    query_to_xml(format('SELECT COUNT(*) AS cnt FROM public.%I', table_name), false, true, '') AS xml_count
  FROM (
    VALUES 
      ('projects'),
      ('project_members'),
      ('profiles'),
      ('roles'),
      ('permissions'),
      ('role_module_permissions'),
      ('modules')
  ) AS v(table_name)
) t;

-- ============================================================================
-- END OF SCRIPT: ticket_bowl_storypot_cleanup.sql
-- ============================================================================

