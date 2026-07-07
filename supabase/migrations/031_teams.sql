-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 031: Teams
-- Adds team isolation so each team's data is scoped and invisible to others.
-- super_admin / admin bypass all team restrictions.
-- ══════════════════════════════════════════════════════════════════════════════

-- 1. teams table
CREATE TABLE IF NOT EXISTS public.teams (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL UNIQUE,
  description TEXT,
  created_by  UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Everyone can read teams (needed for dropdowns)
CREATE POLICY "teams_select" ON public.teams FOR SELECT USING (true);

-- Only admin/super_admin can create/update/delete teams
CREATE POLICY "teams_write" ON public.teams FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- 2. Add team_id to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_team_id ON public.profiles(team_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- Helper: is current user admin/super_admin?
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'super_admin')
  )
$$;

-- Helper: get current user's team_id
CREATE OR REPLACE FUNCTION public.my_team_id()
RETURNS UUID LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT team_id FROM public.profiles WHERE id = auth.uid()
$$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Scope weekly_reports to teams
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.weekly_reports ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

-- Backfill: assign existing rows to the owner's team
UPDATE public.weekly_reports wr
SET team_id = p.team_id
FROM public.profiles p
WHERE wr.user_id = p.id AND wr.team_id IS NULL;

DROP POLICY IF EXISTS "weekly_reports_select_own" ON public.weekly_reports;
DROP POLICY IF EXISTS "weekly_reports_insert_own" ON public.weekly_reports;
DROP POLICY IF EXISTS "weekly_reports_update_own" ON public.weekly_reports;
DROP POLICY IF EXISTS "weekly_reports_delete_own" ON public.weekly_reports;

CREATE POLICY "weekly_reports_select" ON public.weekly_reports FOR SELECT USING (
  public.is_admin() OR team_id = public.my_team_id() OR user_id = auth.uid()
);
CREATE POLICY "weekly_reports_insert" ON public.weekly_reports FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY "weekly_reports_update" ON public.weekly_reports FOR UPDATE USING (
  public.is_admin() OR user_id = auth.uid()
);
CREATE POLICY "weekly_reports_delete" ON public.weekly_reports FOR DELETE USING (
  public.is_admin() OR user_id = auth.uid()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Scope daily_report_dropdown_configs to teams
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.daily_report_dropdown_configs ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "daily_report_configs_select" ON public.daily_report_dropdown_configs;
DROP POLICY IF EXISTS "daily_report_configs_all_admin" ON public.daily_report_dropdown_configs;

-- Shared (team_id IS NULL) configs are visible to all; team configs only to that team or admins
CREATE POLICY "daily_report_configs_select" ON public.daily_report_dropdown_configs FOR SELECT USING (
  team_id IS NULL OR public.is_admin() OR team_id = public.my_team_id()
);
CREATE POLICY "daily_report_configs_write" ON public.daily_report_dropdown_configs FOR ALL USING (
  public.is_admin() OR (
    team_id = public.my_team_id() AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('manager', 'qa_lead') OR public.check_module_permission(p.role, 'daily-report', 'can_configure'))
    )
  )
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Scope daily_support_logs to teams
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.daily_support_logs ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

UPDATE public.daily_support_logs dl
SET team_id = p.team_id
FROM public.profiles p
WHERE dl.user_id = p.id AND dl.team_id IS NULL;

DROP POLICY IF EXISTS "daily_support_logs_select" ON public.daily_support_logs;
DROP POLICY IF EXISTS "daily_support_logs_insert" ON public.daily_support_logs;
DROP POLICY IF EXISTS "daily_support_logs_update" ON public.daily_support_logs;
DROP POLICY IF EXISTS "daily_support_logs_delete" ON public.daily_support_logs;

CREATE POLICY "daily_support_logs_select" ON public.daily_support_logs FOR SELECT USING (
  public.is_admin() OR team_id = public.my_team_id() OR user_id = auth.uid()
);
CREATE POLICY "daily_support_logs_insert" ON public.daily_support_logs FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY "daily_support_logs_update" ON public.daily_support_logs FOR UPDATE USING (
  public.is_admin() OR user_id = auth.uid()
);
CREATE POLICY "daily_support_logs_delete" ON public.daily_support_logs FOR DELETE USING (
  public.is_admin() OR user_id = auth.uid()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Scope daily_release_testing_status to teams
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.daily_release_testing_status ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

UPDATE public.daily_release_testing_status dr
SET team_id = p.team_id
FROM public.profiles p
WHERE dr.user_id = p.id AND dr.team_id IS NULL;

DROP POLICY IF EXISTS "daily_release_testing_status_select" ON public.daily_release_testing_status;
DROP POLICY IF EXISTS "daily_release_testing_status_insert" ON public.daily_release_testing_status;
DROP POLICY IF EXISTS "daily_release_testing_status_update" ON public.daily_release_testing_status;
DROP POLICY IF EXISTS "daily_release_testing_status_delete" ON public.daily_release_testing_status;

CREATE POLICY "daily_release_testing_status_select" ON public.daily_release_testing_status FOR SELECT USING (
  public.is_admin() OR team_id = public.my_team_id() OR user_id = auth.uid()
);
CREATE POLICY "daily_release_testing_status_insert" ON public.daily_release_testing_status FOR INSERT WITH CHECK (
  auth.uid() = user_id
);
CREATE POLICY "daily_release_testing_status_update" ON public.daily_release_testing_status FOR UPDATE USING (
  public.is_admin() OR user_id = auth.uid()
);
CREATE POLICY "daily_release_testing_status_delete" ON public.daily_release_testing_status FOR DELETE USING (
  public.is_admin() OR user_id = auth.uid()
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. Scope projects to teams
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL;

DROP POLICY IF EXISTS "projects_select" ON public.projects;
DROP POLICY IF EXISTS "projects_write" ON public.projects;

CREATE POLICY "projects_select" ON public.projects FOR SELECT USING (
  team_id IS NULL OR public.is_admin() OR team_id = public.my_team_id()
);
CREATE POLICY "projects_write" ON public.projects FOR ALL USING (
  public.is_admin() OR (
    team_id = public.my_team_id() AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND (p.role IN ('manager', 'qa_lead') OR public.check_module_permission(p.role, 'qa-report', 'can_configure'))
    )
  )
);

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. updated_at trigger for teams
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.set_teams_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS teams_updated_at ON public.teams;
CREATE TRIGGER teams_updated_at
  BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_teams_updated_at();
