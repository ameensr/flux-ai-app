-- ============================================================
-- 064: Allow project deletion by owners/admins
--
-- Problem:
--   DELETE on projects cascades to project_members. The
--   prevent_last_owner_deletion trigger then blocks removal of
--   the last owner ("Cannot remove the last project owner..."),
--   so project owners (and non-super-admin admins) cannot delete
--   a project they are allowed to delete via projects_delete RLS.
--
-- Fix:
--   Mark the transaction as a cascading project delete in the
--   existing BEFORE DELETE audit trigger, then skip the last-owner
--   guard when that flag is set. Direct member removal / demotion
--   of the last owner remains blocked.
-- ============================================================

-- Flag cascading project deletes (transaction-local)
CREATE OR REPLACE FUNCTION public.log_project_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Skip last-owner guard while project_members rows cascade away
  PERFORM set_config('app.cascading_project_delete', 'true', true);

  INSERT INTO public.project_deletion_audit (
    project_id, project_name, project_code, deleted_by, associated_data_counts, metadata
  )
  SELECT
    OLD.id,
    OLD.name,
    OLD.project_code,
    auth.uid(),
    jsonb_build_object(
      'members', (SELECT COUNT(*) FROM public.project_members WHERE project_id = OLD.id),
      'weekly_reports', (SELECT COUNT(*) FROM public.weekly_reports WHERE project_id = OLD.id),
      'support_logs', (SELECT COUNT(*) FROM public.daily_support_logs WHERE project_id = OLD.id),
      'testing_status', (SELECT COUNT(*) FROM public.daily_release_testing_status WHERE project_id = OLD.id)
    ),
    jsonb_build_object(
      'status', OLD.status,
      'created_at', OLD.created_at,
      'created_by', OLD.created_by,
      'tags', OLD.tags
    );

  RETURN OLD;
END;
$$;

-- Allow last-owner member rows to be removed during project cascade only
CREATE OR REPLACE FUNCTION public.prevent_last_owner_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_owner_count INT;
BEGIN
  -- Project CASCADE delete: allow removing all members including last owner
  IF current_setting('app.cascading_project_delete', true) = 'true' THEN
    RETURN OLD;
  END IF;

  -- Admins / super_admins may remove any member (including last owner)
  IF private.is_admin() THEN
    RETURN OLD;
  END IF;

  IF OLD.project_role = 'owner' THEN
    SELECT COUNT(*) INTO v_owner_count
    FROM public.project_members
    WHERE project_id = OLD.project_id
      AND project_role = 'owner';

    IF v_owner_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove the last project owner. Assign another owner first.';
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

COMMENT ON FUNCTION public.prevent_last_owner_deletion() IS
  'Prevents removing the last project owner during member management. Skipped when a project is being deleted (cascade) and for admins.';
