-- ============================================================
-- 069: Harden list_my_sessions for concurrent browser logins
--
-- Fixes Active Sessions only showing one device when the same
-- user is signed in on Chrome + Firefox (etc.) at once:
--   • Prefer auth.jwt()->>'session_id' (reliable via PostgREST)
--   • Only return sessions that still have a non-revoked refresh token
--   • Exclude timeboxed / expired sessions (not_after)
-- ============================================================

CREATE OR REPLACE FUNCTION public.list_my_sessions()
RETURNS TABLE (
  id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  refreshed_at timestamptz,
  user_agent text,
  ip text,
  is_current boolean
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_sid uuid;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  -- 1) Prefer auth.jwt() (PostgREST / modern GoTrue)
  BEGIN
    v_sid := NULLIF(auth.jwt() ->> 'session_id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_sid := NULL;
  END;

  -- 2) Fallback: raw request.jwt.claims
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

  RETURN QUERY
  SELECT
    s.id,
    s.created_at,
    s.updated_at,
    s.refreshed_at,
    COALESCE(s.user_agent, '')::text AS user_agent,
    CASE
      WHEN s.ip IS NULL THEN NULL
      ELSE s.ip::text
    END AS ip,
    (v_sid IS NOT NULL AND s.id = v_sid) AS is_current
  FROM auth.sessions s
  WHERE s.user_id = v_uid
    AND (s.not_after IS NULL OR s.not_after > now())
    -- Only sessions that can still refresh (truly active logins)
    AND EXISTS (
      SELECT 1
      FROM auth.refresh_tokens rt
      WHERE rt.session_id = s.id
        AND COALESCE(rt.revoked, false) = false
    )
  ORDER BY COALESCE(s.refreshed_at, s.updated_at, s.created_at) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_sessions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_sessions() TO authenticated;

COMMENT ON FUNCTION public.list_my_sessions() IS
  'Active auth sessions for the current user (concurrent browsers/devices). Marks JWT session_id as current.';
