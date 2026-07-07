-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 032: Fix teams RLS — use security definer is_admin() to avoid
-- recursive profile lookups that block admin team writes/assignments.
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop the old recursive policy
DROP POLICY IF EXISTS "teams_write" ON public.teams;

-- Re-create using the security definer helper (no recursion)
CREATE POLICY "teams_write" ON public.teams FOR ALL USING (
  public.is_admin()
) WITH CHECK (
  public.is_admin()
);
