-- ============================================================
-- 068: Fix Super Admin delete for Auth-dashboard–created users
--
-- Symptoms:
--   Users created in Supabase Authentication dashboard appear in
--   User Management but delete fails. Users who signed up via the
--   app can be deleted.
--
-- Causes:
--   1. Edge function deletes profiles first → CASCADE removes
--      project_members → prevent_last_owner_deletion blocks when
--      auth.uid() is null (service_role), so is_admin() is false.
--   2. Several public tables reference auth.users WITHOUT ON DELETE
--      CASCADE/SET NULL, so auth.admin.deleteUser fails.
--
-- Fix:
--   - Skip last-owner guard for service_role / admin user deletion
--   - RPC to prepare deletion (memberships + FK cleanup)
--   - Soften auth.users FKs to ON DELETE SET NULL / CASCADE
-- ============================================================

-- ── 1. Last-owner triggers: allow service_role + admin-delete flag ───────────
CREATE OR REPLACE FUNCTION public.prevent_last_owner_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_owner_count INT;
BEGIN
  -- Project CASCADE delete
  IF current_setting('app.cascading_project_delete', true) = 'true' THEN
    RETURN OLD;
  END IF;

  -- Admin hard-delete of a user (edge function / RPC)
  IF current_setting('app.admin_deleting_user', true) = 'true' THEN
    RETURN OLD;
  END IF;

  -- Service role (Supabase edge functions using service key)
  IF coalesce(auth.jwt() ->> 'role', auth.role()) = 'service_role' THEN
    RETURN OLD;
  END IF;

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

CREATE OR REPLACE FUNCTION public.prevent_last_owner_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_owner_count INT;
BEGIN
  IF current_setting('app.admin_deleting_user', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF coalesce(auth.jwt() ->> 'role', auth.role()) = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF private.is_admin() THEN
    RETURN NEW;
  END IF;

  IF OLD.project_role = 'owner' AND NEW.project_role != 'owner' THEN
    SELECT COUNT(*) INTO v_owner_count
    FROM public.project_members
    WHERE project_id = OLD.project_id
      AND project_role = 'owner';

    IF v_owner_count <= 1 THEN
      RAISE EXCEPTION 'Cannot remove or demote the last project owner. Assign another owner first.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ── 2. Soften auth.users FKs that block admin deleteUser ─────────────────────
DO $$
DECLARE
  r record;
BEGIN
  -- Drop and recreate known blocking FKs to auth.users
  FOR r IN
    SELECT c.conname, c.conrelid::regclass AS tbl, a.attname AS col
    FROM pg_constraint c
    JOIN pg_attribute a
      ON a.attrelid = c.conrelid AND a.attnum = ANY (c.conkey) AND NOT a.attisdropped
    WHERE c.contype = 'f'
      AND c.confrelid = 'auth.users'::regclass
      AND c.conrelid::regclass::text LIKE 'public.%'
  LOOP
    -- Skip profiles PK (must stay ON DELETE CASCADE — already correct)
    IF r.tbl::text = 'public.profiles' AND r.col = 'id' THEN
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %s DROP CONSTRAINT IF EXISTS %I', r.tbl, r.conname);

    -- NOT NULL columns → CASCADE delete dependent rows
    -- Nullable columns → SET NULL
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = split_part(r.tbl::text, '.', 2)
        AND column_name = r.col
        AND is_nullable = 'NO'
    ) THEN
      EXECUTE format(
        'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE CASCADE',
        r.tbl, r.conname, r.col
      );
    ELSE
      EXECUTE format(
        'ALTER TABLE %s ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES auth.users(id) ON DELETE SET NULL',
        r.tbl, r.conname, r.col
      );
    END IF;
  END LOOP;
END $$;

-- ── 3. Prepare user deletion (memberships + flag) ────────────────────────────
CREATE OR REPLACE FUNCTION public.admin_prepare_user_deletion(
  target_user_id uuid,
  actor_user_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor uuid := coalesce(actor_user_id, auth.uid());
  v_actor_role text;
  v_removed_members int := 0;
BEGIN
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'target_user_id is required';
  END IF;

  -- Allow service_role (edge function) or admin/super_admin callers
  IF coalesce(auth.jwt() ->> 'role', auth.role()) <> 'service_role' THEN
    IF v_actor IS NULL THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
    SELECT role INTO v_actor_role FROM public.profiles WHERE id = v_actor;
    IF v_actor_role IS NULL OR v_actor_role NOT IN ('admin', 'super_admin') THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  -- Never allow deleting yourself through this path
  IF v_actor IS NOT NULL AND v_actor = target_user_id THEN
    RAISE EXCEPTION 'You cannot delete your own account from User Management';
  END IF;

  PERFORM set_config('app.admin_deleting_user', 'true', true);

  DELETE FROM public.project_members
  WHERE user_id = target_user_id;
  GET DIAGNOSTICS v_removed_members = ROW_COUNT;

  -- Clear assigned_by / created_by style refs that point at this profile
  BEGIN
    UPDATE public.project_members SET assigned_by = NULL WHERE assigned_by = target_user_id;
  EXCEPTION WHEN undefined_column OR undefined_table THEN
    NULL;
  END;

  BEGIN
    UPDATE public.projects SET created_by = NULL WHERE created_by = target_user_id;
  EXCEPTION WHEN undefined_column OR undefined_table THEN
    NULL;
  END;

  RETURN jsonb_build_object(
    'ok', true,
    'removed_memberships', v_removed_members
  );
END;
$$;

REVOKE ALL ON FUNCTION public.admin_prepare_user_deletion(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_prepare_user_deletion(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_prepare_user_deletion(uuid, uuid) TO authenticated;

COMMENT ON FUNCTION public.admin_prepare_user_deletion(uuid, uuid) IS
  'Prepares a user for hard delete: bypasses last-owner guards and removes project memberships. Called by admin-permissions edge function before auth.admin.deleteUser.';
