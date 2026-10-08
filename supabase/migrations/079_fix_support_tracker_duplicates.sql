-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 079: Fix Support Tracker Duplicate Data & DB Integrity
--
-- Verified against combined_qaly_schema.sql column definitions:
--   support_issue_dropdown_configs : has created_at, updated_at
--   support_issues                 : has created_at, updated_at
--   support_issue_history          : has timestamp only (NO created_at)
--   support_issue_time_logs        : has created_at, logged_at
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. Relax project_id FK + NOT NULL on support_issues (from 078, idempotent)
ALTER TABLE public.support_issues DROP CONSTRAINT IF EXISTS support_issues_project_id_fkey;
ALTER TABLE public.support_issues ALTER COLUMN project_id DROP NOT NULL;

-- 2. Deduplicate dropdown configs: keep the row with the lowest sort_order
--    per (category, lower(value)). Uses created_at as secondary tiebreaker.
DELETE FROM public.support_issue_dropdown_configs
WHERE id NOT IN (
  SELECT DISTINCT ON (category, lower(value)) id
  FROM public.support_issue_dropdown_configs
  ORDER BY category, lower(value), sort_order ASC, created_at ASC
);

-- 3. Add unique index on (category, lower(value)) to prevent future DB duplicates.
--    DROP first so re-running this migration is safe.
DROP INDEX IF EXISTS uq_support_dropdown_category_value;
CREATE UNIQUE INDEX uq_support_dropdown_category_value
  ON public.support_issue_dropdown_configs (category, lower(value));

-- 4. Deduplicate support_issues by issue_id: keep the earliest created row.
DELETE FROM public.support_issues
WHERE id NOT IN (
  SELECT DISTINCT ON (issue_id) id
  FROM public.support_issues
  ORDER BY issue_id, sl_no ASC NULLS LAST, created_at ASC
);

-- 5. Add unique index on issue_id to prevent exact duplicate issue codes.
DROP INDEX IF EXISTS uq_support_issues_issue_id;
CREATE UNIQUE INDEX uq_support_issues_issue_id
  ON public.support_issues (issue_id);

-- 6. Deduplicate support_issue_history: remove exact duplicate rows.
--    support_issue_history has NO created_at — use id (UUID PK) as tiebreaker.
DELETE FROM public.support_issue_history
WHERE id NOT IN (
  SELECT DISTINCT ON (issue_id, action, coalesce(field, ''), timestamp) id
  FROM public.support_issue_history
  ORDER BY issue_id, action, coalesce(field, ''), timestamp, id ASC
);

-- 7. Deduplicate support_issue_time_logs: remove exact duplicate log entries.
--    Uses logged_at + id as tiebreaker (created_at exists on this table).
DELETE FROM public.support_issue_time_logs
WHERE id NOT IN (
  SELECT DISTINCT ON (support_issue_id, issue_id, user_name, hours_added, logged_at) id
  FROM public.support_issue_time_logs
  ORDER BY support_issue_id, issue_id, user_name, hours_added, logged_at, created_at ASC
);

-- 8. Grant privileges (idempotent — safe to re-run)
GRANT ALL ON TABLE public.support_issues TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.support_issue_history TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.support_issue_dropdown_configs TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.support_issue_time_logs TO authenticated, anon, service_role;
