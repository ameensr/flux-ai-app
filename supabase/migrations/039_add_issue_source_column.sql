-- ============================================================
-- 039: Add Issue Source Column to Daily Support Logs
-- ============================================================
-- Adds issue_source column to track whether issue was missed by QA,
-- from backend update, customer reported, etc.

-- Add issue_source column to daily_support_logs table
ALTER TABLE public.daily_support_logs 
  ADD COLUMN IF NOT EXISTS issue_source TEXT;

-- Create index for performance (optional but recommended)
CREATE INDEX IF NOT EXISTS idx_daily_support_logs_issue_source 
  ON public.daily_support_logs(issue_source);

-- Add comment explaining the column
COMMENT ON COLUMN public.daily_support_logs.issue_source IS 
  'Source/origin of the issue: Missed by QA, Backend Update, Customer Reported, Internal Testing, Production, etc.';

-- Seed default dropdown configuration values for issue_source category
INSERT INTO public.daily_report_dropdown_configs (category, value, sort_order, is_active) VALUES
  ('issue_source', 'Missed by QA', 1, true),
  ('issue_source', 'Backend Update', 2, true),
  ('issue_source', 'Customer Reported', 3, true),
  ('issue_source', 'Internal Testing', 4, true),
  ('issue_source', 'Production', 5, true)
ON CONFLICT (category, value) DO NOTHING;

