-- Migration 089: Deactivate retesting-specific values that were incorrectly
-- merged into the 'status' category by migration 087.
--
-- Migration 087 merged both testing_status AND retesting_status from
-- support_issue_dropdown_configs into the single 'status' category of
-- project_dropdown_configs. This caused retesting-only values
-- (Not Required, Pending, In Retesting, Passed, Failed, Issue Reported)
-- to appear in QA Report / Support Tracker / Release Tracker status dropdowns
-- alongside the intended testing status values.
--
-- Fix: deactivate those retesting-specific values in the 'status' category.
-- They remain in the DB (so existing records referencing them are unaffected)
-- but will no longer appear in dropdowns. Admins can reactivate any they want
-- via Project Hub → Dropdown Configuration.

UPDATE public.project_dropdown_configs
SET    is_active = false,
       updated_at = now()
WHERE  category = 'status'
  AND  lower(value) IN (
         'not required',
         'pending',
         'in retesting',
         'passed',
         'failed',
         'issue reported'
       );
