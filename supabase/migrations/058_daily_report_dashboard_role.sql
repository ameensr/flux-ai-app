-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 058: Explicit "Dashboard Role" assignment for QA Daily Update
-- columns.
--
-- Why: migration 057 tagged each Testing Status / Smoke Status OPTION with
-- an outcome_bucket, but the /daily-report summary dashboard only looked at
-- the column whose internal_key literally equaled 'testing_status' /
-- 'smoke_testing_status'. That only ever matches the original SYSTEM
-- column. Any project that rebuilt its column list from scratch (Add New
-- Column) ends up with a CUSTOM column instead — different internal_key,
-- AND its values live in daily_report_custom_field_values rather than the
-- physical row field — so the dashboard bucket selector never appeared and
-- the cards never read from it, no matter how the options were tagged.
--
-- Fix: dashboard_role is now an explicit, user-assignable flag on the
-- column itself (works for system AND custom columns). Exactly one column
-- per table+scope may hold a given role at a time — enforced here with
-- partial unique indexes, matching the internal_key uniqueness pattern from
-- migration 056.
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.daily_report_column_configs
  ADD COLUMN IF NOT EXISTS dashboard_role TEXT CHECK (dashboard_role IN ('testing_status', 'smoke_status'));

COMMENT ON COLUMN public.daily_report_column_configs.dashboard_role IS
  'Marks this column (system or custom) as the source for a /daily-report summary dashboard metric: ''testing_status'' feeds the Support & Exception Log cards, ''smoke_status'' feeds the Release Testing Log cards. At most one column per table_key+scope may hold a given role — see uq_column_configs_dashboard_role_org / _project.';

-- Only one column per (table_key, scope) may hold a given dashboard_role.
CREATE UNIQUE INDEX IF NOT EXISTS uq_column_configs_dashboard_role_org
  ON public.daily_report_column_configs (table_key, dashboard_role)
  WHERE project_id IS NULL AND dashboard_role IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_column_configs_dashboard_role_project
  ON public.daily_report_column_configs (project_id, table_key, dashboard_role)
  WHERE project_id IS NOT NULL AND dashboard_role IS NOT NULL;

-- Backfill: assign the role to the original system columns wherever they
-- still exist under their original internal_key (org default rows and any
-- project that still has the real system column). Projects that already
-- replaced it with a custom column get nothing here — that's expected; the
-- user assigns the role explicitly to whichever column should feed the
-- dashboard now, via the Customize Columns drawer's new "Feeds Dashboard
-- Cards" toggle.
UPDATE public.daily_report_column_configs
SET dashboard_role = 'testing_status'
WHERE table_key = 'support' AND internal_key = 'testing_status' AND dashboard_role IS NULL;

UPDATE public.daily_report_column_configs
SET dashboard_role = 'smoke_status'
WHERE table_key = 'release' AND internal_key = 'smoke_testing_status' AND dashboard_role IS NULL;
