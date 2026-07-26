-- ============================================================
-- 067: List real active auth sessions for the current user
--
-- Active Sessions UI could not show Chrome + Firefox together
-- because the client SDK has no listSessions() API. This RPC
-- reads auth.sessions (SECURITY DEFINER) for auth.uid() only
-- and marks the JWT's session_id as current.
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
  v_claims jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RETURN;
  END IF;

  -- Prefer session_id from the JWT claims PostgREST attaches
  BEGIN
    v_claims := NULLIF(current_setting('request.jwt.claims', true), '')::jsonb;
  EXCEPTION WHEN OTHERS THEN
    v_claims := NULL;
  END;

  IF v_claims IS NOT NULL THEN
    BEGIN
      v_sid := NULLIF(v_claims ->> 'session_id', '')::uuid;
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
    s.user_agent,
    s.ip::text AS ip,
    (v_sid IS NOT NULL AND s.id = v_sid) AS is_current
  FROM auth.sessions s
  WHERE s.user_id = v_uid
  ORDER BY COALESCE(s.refreshed_at, s.updated_at, s.created_at) DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_sessions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_sessions() TO authenticated;

COMMENT ON FUNCTION public.list_my_sessions() IS
  'Returns the current user''s auth.sessions rows for the Active Sessions UI. Never exposes other users.';
