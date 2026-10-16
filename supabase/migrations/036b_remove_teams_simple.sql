-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 036: Remove Teams (Simplified Version)
-- 
-- This is a simplified version that only drops the my_team_id() function if it exists.
-- Use this if your database never had a teams table.
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop the my_team_id() function if it exists (it may not exist, that's ok)
DROP FUNCTION IF EXISTS public.my_team_id() CASCADE;

-- Add comment to projects table
COMMENT ON TABLE public.projects IS 
  'Projects are the primary organizational unit for QA work. Each project has members with specific roles (owner, lead, member, viewer).';

-- Log completion
DO $$ 
BEGIN
  RAISE NOTICE 'Migration 036 (simplified) completed. Teams feature was never used in this database.';
END $$;
