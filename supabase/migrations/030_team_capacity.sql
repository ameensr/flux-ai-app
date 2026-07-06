-- ══════════════════════════════════════════════════════════════════════════════
-- Migration: Team Capacity Tracking
-- Description: Simplified QA-focused team capacity (not performance evaluation)
-- Version: 030
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop old resource utilization tables if they exist
DROP TABLE IF EXISTS public.resource_utilization_insights CASCADE;
DROP TABLE IF EXISTS public.resource_utilization_data CASCADE;
DROP TABLE IF EXISTS public.resource_utilization_reports CASCADE;

-- ══════════════════════════════════════════════════════════════════════════════
-- Table: team_capacity_reports
-- Purpose: Store uploaded team capacity data
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.team_capacity_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Report metadata
  report_id UUID REFERENCES public.qa_weekly_reports(id) ON DELETE CASCADE,
  uploaded_by UUID REFERENCES auth.users(id),
  file_name TEXT NOT NULL,
  upload_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Period (optional, extracted from filename or manual input)
  period_start DATE,
  period_end DATE,
  
  -- Summary stats (calculated from members)
  total_members INTEGER NOT NULL,
  available_members INTEGER NOT NULL,
  on_leave_members INTEGER NOT NULL,
  no_logs_members INTEGER NOT NULL,
  average_hours NUMERIC(5,1) NOT NULL,
  estimated_capacity_percent INTEGER NOT NULL,
  
  -- AI-generated summary
  ai_summary TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- Table: team_capacity_members
-- Purpose: Individual team member availability data
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.team_capacity_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign key to report
  capacity_report_id UUID NOT NULL REFERENCES public.team_capacity_reports(id) ON DELETE CASCADE,
  
  -- Member data
  member_name TEXT NOT NULL,
  logged_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  leave_hours NUMERIC(6,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK (status IN ('available', 'on-leave', 'no-logs')),
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- Indexes
-- ══════════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_team_capacity_reports_report_id 
  ON public.team_capacity_reports(report_id);

CREATE INDEX IF NOT EXISTS idx_team_capacity_reports_uploaded_by 
  ON public.team_capacity_reports(uploaded_by);

CREATE INDEX IF NOT EXISTS idx_team_capacity_reports_upload_date 
  ON public.team_capacity_reports(upload_date DESC);

CREATE INDEX IF NOT EXISTS idx_team_capacity_members_report 
  ON public.team_capacity_members(capacity_report_id);

CREATE INDEX IF NOT EXISTS idx_team_capacity_members_status 
  ON public.team_capacity_members(status);

-- ══════════════════════════════════════════════════════════════════════════════
-- Row-Level Security (RLS)
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.team_capacity_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_capacity_members ENABLE ROW LEVEL SECURITY;

-- Policy: Allow authenticated users to view capacity reports
CREATE POLICY "Users can view team capacity reports"
  ON public.team_capacity_reports
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow authenticated users to insert capacity reports
CREATE POLICY "Users can create team capacity reports"
  ON public.team_capacity_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid());

-- Policy: Allow users to update their own reports
CREATE POLICY "Users can update their own capacity reports"
  ON public.team_capacity_reports
  FOR UPDATE
  TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- Policy: Allow users to delete their own reports
CREATE POLICY "Users can delete their own capacity reports"
  ON public.team_capacity_reports
  FOR DELETE
  TO authenticated
  USING (uploaded_by = auth.uid());

-- Policy: Allow viewing member data
CREATE POLICY "Users can view capacity member data"
  ON public.team_capacity_members
  FOR SELECT
  TO authenticated
  USING (true);

-- Policy: Allow inserting member data linked to user's reports
CREATE POLICY "Users can insert capacity member data"
  ON public.team_capacity_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.team_capacity_reports 
      WHERE id = capacity_report_id 
      AND uploaded_by = auth.uid()
    )
  );

-- Policy: Allow deleting member data via CASCADE (handled by report deletion)

-- ══════════════════════════════════════════════════════════════════════════════
-- Functions
-- ══════════════════════════════════════════════════════════════════════════════

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_team_capacity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_team_capacity_reports_updated_at
  BEFORE UPDATE ON public.team_capacity_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_team_capacity_updated_at();

-- ══════════════════════════════════════════════════════════════════════════════
-- Comments
-- ══════════════════════════════════════════════════════════════════════════════

COMMENT ON TABLE public.team_capacity_reports IS 
  'QA team capacity tracking - focuses on availability, not performance evaluation';

COMMENT ON TABLE public.team_capacity_members IS 
  'Individual team member availability data for capacity reports';

COMMENT ON COLUMN public.team_capacity_members.status IS 
  'Member status: available (working), on-leave (leave taken), no-logs (no hours logged)';
