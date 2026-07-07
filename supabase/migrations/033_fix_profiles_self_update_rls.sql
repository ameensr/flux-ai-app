-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 033: Fix profiles UPDATE RLS for admin/super_admin
--
-- Root cause: profiles_self_update has `with check (auth.uid() = id)`.
-- When an admin updates ANOTHER user's row, Postgres evaluates BOTH the
-- profiles_self_update and profiles_admin_update policies. Both with check
-- clauses must pass — but profiles_self_update's with check fails because
-- auth.uid() != target user id. This silently blocks the update.
--
-- Fix: narrow profiles_self_update so it only fires for the user's own row
-- by adding `using (auth.uid() = id)`. Admin updates hit only
-- profiles_admin_update which already has the correct with check.
-- ══════════════════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "profiles_self_update" ON public.profiles;

CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE
  USING ( auth.uid() = id AND public.get_my_role() NOT IN ('admin', 'super_admin') )
  WITH CHECK ( auth.uid() = id AND public.get_my_role() NOT IN ('admin', 'super_admin') );
