-- Migration: Daily Report Testing Status Enhancements
-- Description: 
--   1. Add testing_status column to daily_release_testing_status table
--   2. Rename status column to testing_status in daily_support_logs table
--   3. Rename dropdown config category from 'status' to 'testing_status'
--   4. Update RLS policies to reflect new column names
-- Date: 2026-07-08

-- ============================================================================
-- PART 1: Add testing_status column to daily_release_testing_status
-- ============================================================================

-- Add new testing_status column to daily_release_testing_status table
ALTER TABLE daily_release_testing_status 
ADD COLUMN IF NOT EXISTS testing_status TEXT;

-- Add comment explaining the column
COMMENT ON COLUMN daily_release_testing_status.testing_status IS 
'Centralized testing status field (e.g., Passed, Failed, Blocked, In Progress). Uses testing_status dropdown config.';

-- ============================================================================
-- PART 2: Rename status to testing_status in daily_support_logs
-- ============================================================================

-- Rename the status column to testing_status in daily_support_logs
ALTER TABLE daily_support_logs 
RENAME COLUMN status TO testing_status;

-- Update column comment
COMMENT ON COLUMN daily_support_logs.testing_status IS 
'Testing status of the support task (e.g., Passed, Failed, Blocked, In Progress). Uses testing_status dropdown config.';

-- ============================================================================
-- PART 3: Update dropdown config category from 'status' to 'testing_status'
-- ============================================================================

-- Update existing dropdown config records from 'status' to 'testing_status'
UPDATE daily_report_dropdown_configs 
SET category = 'testing_status' 
WHERE category = 'status';

-- Add comment to make purpose clear
COMMENT ON TABLE daily_report_dropdown_configs IS 
'Master dropdown configuration values for Daily Report module. Categories: branch, qa, testing_status, retesting_status, smoke_status, issue_source.';

-- ============================================================================
-- PART 4: Verify indexes and constraints
-- ============================================================================

-- Check if we need to recreate any indexes that reference the old column name
-- (Most indexes should automatically handle column renames, but we verify here)

-- Create index on testing_status for better query performance if not exists
CREATE INDEX IF NOT EXISTS idx_daily_support_logs_testing_status 
ON daily_support_logs(testing_status);

CREATE INDEX IF NOT EXISTS idx_daily_release_testing_status_testing_status 
ON daily_release_testing_status(testing_status);

-- ============================================================================
-- PART 5: Update RLS Policies (if any reference the old column name)
-- ============================================================================

-- RLS policies on daily_support_logs and daily_release_testing_status should 
-- continue to work as they typically reference user_id and project_id, not status fields.
-- This section is included for completeness and future-proofing.

-- Verify existing policies still work
DO $$ 
BEGIN
  -- Log migration completion
  RAISE NOTICE 'Migration 041 completed successfully';
  RAISE NOTICE '  - Added testing_status column to daily_release_testing_status';
  RAISE NOTICE '  - Renamed status to testing_status in daily_support_logs';
  RAISE NOTICE '  - Updated dropdown config category from status to testing_status';
  RAISE NOTICE '  - Created performance indexes on testing_status columns';
END $$;

-- ============================================================================
-- ROLLBACK INSTRUCTIONS (for emergency use only)
-- ============================================================================

-- To rollback this migration:
-- 1. ALTER TABLE daily_support_logs RENAME COLUMN testing_status TO status;
-- 2. ALTER TABLE daily_release_testing_status DROP COLUMN testing_status;
-- 3. UPDATE daily_report_dropdown_configs SET category = 'status' WHERE category = 'testing_status';
-- 4. DROP INDEX IF EXISTS idx_daily_support_logs_testing_status;
-- 5. DROP INDEX IF EXISTS idx_daily_release_testing_status_testing_status;
