-- ============================================================================
-- Migration 082: Support Issue Tracker — New Columns
-- Adds: received_time, is_qa_miss, test_case_count, planned_end_date,
--       actual_end_date, blocked_hours, retesting_status, retesting_estimation_hrs
-- Renames nothing — start_date and finish_date are preserved as-is.
-- actual_end_date is a new separate column (not auto-populated from finish_date).
-- ============================================================================

-- 1. Add new columns to support_issues
ALTER TABLE public.support_issues
  ADD COLUMN IF NOT EXISTS received_time        TIME,
  ADD COLUMN IF NOT EXISTS is_qa_miss           TEXT DEFAULT 'Not Applicable',
  ADD COLUMN IF NOT EXISTS test_case_count      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS planned_end_date     DATE,
  ADD COLUMN IF NOT EXISTS actual_end_date      DATE,
  ADD COLUMN IF NOT EXISTS blocked_hours        NUMERIC(6,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS retesting_status     TEXT DEFAULT 'Not Required',
  ADD COLUMN IF NOT EXISTS retesting_estimation_hrs NUMERIC(6,2) DEFAULT 0;

-- 2. Indexes for new filterable columns
CREATE INDEX IF NOT EXISTS idx_support_issues_is_qa_miss       ON public.support_issues(is_qa_miss);
CREATE INDEX IF NOT EXISTS idx_support_issues_retesting_status ON public.support_issues(retesting_status);
CREATE INDEX IF NOT EXISTS idx_support_issues_planned_end      ON public.support_issues(planned_end_date);
CREATE INDEX IF NOT EXISTS idx_support_issues_actual_end       ON public.support_issues(actual_end_date);

-- 3. Seed default dropdown options for new categories
-- is_qa_miss
INSERT INTO public.support_issue_dropdown_configs (category, label, value, is_active, sort_order)
VALUES
  ('is_qa_miss', 'Yes',            'Yes',            true, 1),
  ('is_qa_miss', 'No',             'No',             true, 2),
  ('is_qa_miss', 'Under Review',   'Under Review',   true, 3),
  ('is_qa_miss', 'Not Applicable', 'Not Applicable', true, 4)
ON CONFLICT (category, lower(value)) DO NOTHING;

-- retesting_status
INSERT INTO public.support_issue_dropdown_configs (category, label, value, is_active, sort_order)
VALUES
  ('retesting_status', 'Not Required', 'Not Required', true, 1),
  ('retesting_status', 'Pending',      'Pending',      true, 2),
  ('retesting_status', 'In Retesting', 'In Retesting', true, 3),
  ('retesting_status', 'Passed',       'Passed',       true, 4),
  ('retesting_status', 'Failed',       'Failed',       true, 5),
  ('retesting_status', 'Blocked',      'Blocked',      true, 6)
ON CONFLICT (category, lower(value)) DO NOTHING;

-- 4. Blocked time tracking table (for automatic blocked duration calculation)
CREATE TABLE IF NOT EXISTS public.support_issue_blocked_periods (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  support_issue_id UUID NOT NULL REFERENCES public.support_issues(id) ON DELETE CASCADE,
  issue_id         TEXT NOT NULL,
  blocked_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unblocked_at     TIMESTAMPTZ,
  hours_blocked    NUMERIC(6,2) GENERATED ALWAYS AS (
    CASE
      WHEN unblocked_at IS NOT NULL
      THEN ROUND(EXTRACT(EPOCH FROM (unblocked_at - blocked_at)) / 3600.0, 2)
      ELSE NULL
    END
  ) STORED,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_periods_issue_id ON public.support_issue_blocked_periods(support_issue_id);
CREATE INDEX IF NOT EXISTS idx_blocked_periods_issue_str ON public.support_issue_blocked_periods(issue_id);

ALTER TABLE public.support_issue_blocked_periods ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  DROP POLICY IF EXISTS "support_blocked_periods_all_auth" ON public.support_issue_blocked_periods;
  CREATE POLICY "support_blocked_periods_all_auth" ON public.support_issue_blocked_periods
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
  DROP POLICY IF EXISTS "support_blocked_periods_all_anon" ON public.support_issue_blocked_periods;
  CREATE POLICY "support_blocked_periods_all_anon" ON public.support_issue_blocked_periods
    FOR ALL TO anon USING (true) WITH CHECK (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

GRANT ALL ON TABLE public.support_issue_blocked_periods TO authenticated, anon, service_role;
