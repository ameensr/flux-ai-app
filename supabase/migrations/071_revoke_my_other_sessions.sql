-- ============================================================
-- 071: Revoke all OTHER sessions for the current user
--
-- signOut({ scope: 'others' }) can leave auth.sessions rows in
-- place so Active Sessions still lists them. This RPC deletes
-- every session except the caller's JWT session_id (and revokes
-- related refresh tokens).
-- ============================================================

CREATE OR REPLACE FUNCTION public.revoke_my_other_sessions(
  p_current_session_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sid uuid;
  v_deleted int := 0;
  v_revoked int := 0;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Prefer explicit id from the client (decoded JWT), then auth.jwt()
  v_sid := p_current_session_id;

  IF v_sid IS NULL THEN
    BEGIN
      v_sid := NULLIF(auth.jwt() ->> 'session_id', '')::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_sid := NULL;
    END;
  END IF;

  IF v_sid IS NULL THEN
    BEGIN
      v_sid := NULLIF(
        (NULLIF(current_setting('request.jwt.claims', true), '')::jsonb) ->> 'session_id',
        ''
      )::uuid;
    EXCEPTION WHEN OTHERS THEN
      v_sid := NULL;
    END;
  END IF;

  IF v_sid IS NULL THEN
    RAISE EXCEPTION 'Could not determine current session id';
  END IF;

  -- Ensure the provided session actually belongs to this user
  IF NOT EXISTS (
    SELECT 1 FROM auth.sessions s
    WHERE s.id = v_sid AND s.user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Current session not found for this user';
  END IF;

  -- Revoke refresh tokens for other sessions
  BEGIN
    UPDATE auth.refresh_tokens rt
    SET
      revoked = true,
      updated_at = now()
    WHERE rt.session_id IS NOT NULL
      AND rt.session_id <> v_sid
      AND rt.session_id IN (
        SELECT s.id FROM auth.sessions s
        WHERE s.user_id = v_uid AND s.id <> v_sid
      )
      AND COALESCE(rt.revoked, false) = false;
    GET DIAGNOSTICS v_revoked = ROW_COUNT;
  EXCEPTION WHEN OTHERS THEN
    -- Older schemas / missing columns — still delete sessions below
    v_revoked := 0;
  END;

  DELETE FROM auth.sessions s
  WHERE s.user_id = v_uid
    AND s.id <> v_sid;

  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  RETURN jsonb_build_object(
    'success', true,
    'revoked_sessions', v_deleted,
    'revoked_refresh_tokens', v_revoked,
    'kept_session_id', v_sid
  );
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_my_other_sessions(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.revoke_my_other_sessions(uuid) TO authenticated;

COMMENT ON FUNCTION public.revoke_my_other_sessions(uuid) IS
  'Deletes all auth.sessions for the caller except the current session. Used by Sign Out All Other Devices.';
