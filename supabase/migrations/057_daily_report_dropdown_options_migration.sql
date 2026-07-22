-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 057: Migrate Daily Report system dropdown columns off the
-- centralized daily_report_dropdown_configs table onto each column's own
-- dropdown_options JSONB (the same mechanism already used by custom columns
-- via the Customize Columns drawer).
--
-- Why: Support & Exception Log / Release Testing Log now have their own
-- per-column customization (migration 056). The centralized "Configuration"
-- page at /daily-report/configuration is being removed entirely. Six system
-- columns (Branch, QA, Testing Status, Retesting Status, Smoke Status, Issue
-- Source) were the last remaining consumers of daily_report_dropdown_configs
-- on the Daily Report side (via config_category) — this migration copies
-- their current option lists into dropdown_options so those columns become
-- fully self-contained, exactly like custom columns.
--
-- Also adds `outcome_bucket` to each Testing Status / Smoke Status option so
-- the /daily-report summary dashboard cards (Passed/Fixed, Pending, Blocked,
-- etc.) can be computed from column configuration instead of hardcoded
-- string arrays. Best-effort default mapping is applied based on the option
-- label; anything unmapped defaults to 'other' and can be reassigned later
-- from the Customize Columns drawer.
--
-- Non-destructive: daily_report_dropdown_configs itself is NOT dropped or
-- modified — it keeps serving /qa-report's testing_status + priority
-- dropdowns (SupportLog.tsx / ReleaseTable.tsx), which are unaffected by
-- this migration. config_category columns on daily_report_column_configs
-- rows are also left in place (unused going forward, kept only as
-- historical/debugging metadata) rather than dropped, to avoid any risk to
-- existing rows.
-- ══════════════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. Helper: build a dropdown_options JSONB array from
--    daily_report_dropdown_configs for a given category, in sort order,
--    tagging each option with a best-guess outcome_bucket when the category
--    is a status category (testing_status / smoke_status).
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION pg_temp.build_dropdown_options(p_category TEXT, p_tag_buckets BOOLEAN)
RETURNS JSONB AS $$
DECLARE
  result JSONB;
BEGIN
  -- Window functions (row_number() OVER ...) can't be nested directly inside
  -- an aggregate call (jsonb_agg(...)) — Postgres evaluates them in
  -- different query stages. Compute the row number in an inner subquery
  -- first, then aggregate the already-numbered rows in the outer query.
  SELECT COALESCE(jsonb_agg(
    jsonb_build_object(
      'id', 'opt-' || substr(md5(random()::text || clock_timestamp()::text), 1, 8),
      'label', ordered.value,
      'sort_order', ordered.rn,
      'outcome_bucket', CASE WHEN NOT p_tag_buckets THEN NULL
        WHEN lower(ordered.value) IN ('passed', 'pass', 'closed', 'fixed', 'completed', 'success') THEN 'completed'
        WHEN lower(ordered.value) IN ('blocked') THEN 'blocked'
        WHEN lower(ordered.value) IN ('pending', 'in progress', 'retesting', 'not executed', 'open') THEN 'pending'
        ELSE 'other'
      END
    )
  ), '[]'::jsonb)
  INTO result
  FROM (
    SELECT dc.value, row_number() OVER (ORDER BY dc.sort_order) AS rn
    FROM public.daily_report_dropdown_configs dc
    WHERE dc.category = p_category AND dc.is_active = true
  ) ordered;

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Apply to every daily_report_column_configs row that still links to a
--    config_category (system columns only — custom columns never had
--    config_category set, so they're untouched) and currently has an empty
--    dropdown_options array (so re-running this migration, or a column a
--    user already customized options for, is never overwritten).
-- ──────────────────────────────────────────────────────────────────────────────
UPDATE public.daily_report_column_configs c
SET dropdown_options = pg_temp.build_dropdown_options(
  c.config_category,
  c.config_category IN ('testing_status', 'smoke_status')
)
WHERE c.config_category IS NOT NULL
  AND jsonb_array_length(c.dropdown_options) = 0;

DROP FUNCTION IF EXISTS pg_temp.build_dropdown_options(TEXT, BOOLEAN);

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Comment update — config_category is now deprecated/unused by the
--    frontend (kept only for historical traceability, not dropped).
-- ──────────────────────────────────────────────────────────────────────────────
COMMENT ON COLUMN public.daily_report_column_configs.config_category IS
  'DEPRECATED (migration 057): no longer read by the frontend. System dropdown columns now manage their own dropdown_options directly, same as custom columns. Left in place only as historical metadata — safe to ignore.';

COMMENT ON COLUMN public.daily_report_column_configs.dropdown_options IS
  'Options for dropdown/multiselect/status columns: [{ id, label, sort_order, outcome_bucket }]. outcome_bucket (''completed''|''blocked''|''pending''|''other'') is only meaningful for Testing Status / Smoke Status columns and drives the /daily-report summary dashboard card calculations.';
