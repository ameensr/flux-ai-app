-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 036: Remove Teams - Clean up team-based organization
-- 
-- Removes teams table and team_id columns from all tables (if they exist).
-- Projects have replaced teams as the organizational unit.
-- This migration is safe to run even if teams never existed.
-- ══════════════════════════════════════════════════════════════════════════════

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Check if teams table exists, if not, skip this migration
-- ══════════════════════════════════════════════════════════════════════════════

DO $$ 
DECLARE
  teams_exists BOOLEAN;
BEGIN
  -- Check if teams table exists
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'teams'
  ) INTO teams_exists;

  IF NOT teams_exists THEN
    RAISE NOTICE 'Teams table does not exist. This database never used the Teams feature. Skipping cleanup.';
    RETURN;
  END IF;

  -- If we reach here, teams table exists, proceed with cleanup
  RAISE NOTICE 'Teams table found. Proceeding with cleanup...';

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 2. Mark team_id columns as deprecated via comments
  -- ═══════════════════════════════════════════════════════════════════════════
  
  -- Only add comments if columns exist
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'weekly_reports' AND column_name = 'team_id') THEN
    EXECUTE 'COMMENT ON COLUMN public.weekly_reports.team_id IS ''DEPRECATED: Use project_id instead. Will be removed in future migration.''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_support_logs' AND column_name = 'team_id') THEN
    EXECUTE 'COMMENT ON COLUMN public.daily_support_logs.team_id IS ''DEPRECATED: Use project_id instead. Will be removed in future migration.''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_release_testing_status' AND column_name = 'team_id') THEN
    EXECUTE 'COMMENT ON COLUMN public.daily_release_testing_status.team_id IS ''DEPRECATED: Use project_id instead. Will be removed in future migration.''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_report_dropdown_configs' AND column_name = 'team_id') THEN
    EXECUTE 'COMMENT ON COLUMN public.daily_report_dropdown_configs.team_id IS ''DEPRECATED: Use project_id instead. Will be removed in future migration.''';
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'team_id') THEN
    EXECUTE 'COMMENT ON COLUMN public.profiles.team_id IS ''DEPRECATED: Users are now organized via project membership. Will be removed in future migration.''';
  END IF;

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 3. Drop policies that depend on my_team_id() before dropping the function
  -- ═══════════════════════════════════════════════════════════════════════════

  -- Drop daily_report_dropdown_configs policies
  DROP POLICY IF EXISTS "daily_report_configs_select" ON public.daily_report_dropdown_configs;
  DROP POLICY IF EXISTS "daily_report_configs_write" ON public.daily_report_dropdown_configs;

  -- Drop old projects policies (from previous migrations) if they exist
  DROP POLICY IF EXISTS "projects_select_old" ON public.projects;
  DROP POLICY IF EXISTS "projects_write_old" ON public.projects;

  -- Now safe to drop the function
  DROP FUNCTION IF EXISTS public.my_team_id() CASCADE;

  -- Recreate daily_report_dropdown_configs policies WITHOUT team_id dependency
  CREATE POLICY "daily_report_configs_select" ON public.daily_report_dropdown_configs FOR SELECT USING (
    team_id IS NULL OR public.is_admin()
  );

  CREATE POLICY "daily_report_configs_write" ON public.daily_report_dropdown_configs FOR ALL USING (
    public.is_admin()
  );

  -- ═══════════════════════════════════════════════════════════════════════════
  -- 4. Drop teams table RLS policies and table
  -- ═══════════════════════════════════════════════════════════════════════════

  DROP POLICY IF EXISTS "teams_select" ON public.teams;
  DROP POLICY IF EXISTS "teams_write" ON public.teams;
  DROP TABLE IF EXISTS public.teams CASCADE;

  RAISE NOTICE 'Teams cleanup completed successfully.';
END $$;


-- ══════════════════════════════════════════════════════════════════════════════
-- Additional Comments
-- ══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE public.projects IS 
  'Projects have replaced teams as the primary organizational unit. Each project has members with specific roles (owner, lead, member, viewer).';

-- Note: If this database never had teams, this migration is a no-op and that's fine!
