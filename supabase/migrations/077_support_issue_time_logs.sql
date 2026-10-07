-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 077: Support Issue Incremental Time Log System
-- 
-- Adds cumulative work hours time logging per support issue.
-- Allows testers to log hours progressively with User, Hours Added, 
-- Comment, and Timestamp.
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.support_issue_time_logs (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  issue_id          TEXT NOT NULL, -- e.g. 'SUP-1024'
  support_issue_id  UUID REFERENCES public.support_issues(id) ON DELETE CASCADE,
  user_name         TEXT NOT NULL,
  user_id           UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  hours_added       NUMERIC(6, 2) NOT NULL,
  comment           TEXT NOT NULL DEFAULT '',
  logged_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_support_time_logs_issue_str ON public.support_issue_time_logs(issue_id);
CREATE INDEX IF NOT EXISTS idx_support_time_logs_issue_id ON public.support_issue_time_logs(support_issue_id);
CREATE INDEX IF NOT EXISTS idx_support_time_logs_logged_at ON public.support_issue_time_logs(logged_at DESC);

-- Enable RLS
ALTER TABLE public.support_issue_time_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users full read/write for time logs
DO $$
BEGIN
  DROP POLICY IF EXISTS "support_time_logs_all_auth" ON public.support_issue_time_logs;
  CREATE POLICY "support_time_logs_all_auth" ON public.support_issue_time_logs
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
