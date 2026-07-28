-- ============================================================
-- 070: Fix list_my_sessions runtime failure
--
-- Root cause: RETURN QUERY type mismatch when auth.sessions
-- uses "timestamp without time zone" but the function declared
-- timestamptz — PostgREST then returns an error and the UI
-- falls back to "this device only".
--
-- Fix: return timestamps as text (ISO) so casting cannot fail,
-- and drop the refresh_tokens filter that broke some projects.
-- ============================================================

DROP FUNCTION IF EXISTS public.list_my_sessions();

CREATE OR REPLACE FUNCTION public.list_my_sessions()
RETURNS TABLE (
  id uuid,
  created_at text,
  updated_at text,
  refreshed_at text,
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

  -- Prefer auth.jwt(); fall back to request claims
  BEGIN
    v_sid := NULLIF(auth.jwt() ->> 'session_id', '')::uuid;
  EXCEPTION WHEN OTHERS THEN
    v_sid := NULL;
  END;

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
    s.created_at::text,
    s.updated_at::text,
    s.refreshed_at::text,
    COALESCE(s.user_agent::text, ''),
    CASE WHEN s.ip IS NULL THEN NULL ELSE s.ip::text END,
    (v_sid IS NOT NULL AND s.id = v_sid)
  FROM auth.sessions AS s
  WHERE s.user_id = v_uid
  ORDER BY COALESCE(s.refreshed_at, s.updated_at, s.created_at) DESC NULLS LAST;
END;
$$;

REVOKE ALL ON FUNCTION public.list_my_sessions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_my_sessions() TO authenticated;

COMMENT ON FUNCTION public.list_my_sessions() IS
  'Lists auth.sessions for the current user as text timestamps (Active Sessions UI).';
