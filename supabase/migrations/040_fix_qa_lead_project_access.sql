-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 040: Fix QA Lead Project Access Control
--
-- Problem: is_project_manager() function includes 'qa_lead', causing RLS to grant
-- them access to ALL projects. This conflicts with the frontend requirement that
-- qa_lead should only see projects they're explicitly members of.
--
-- Solution: Remove 'qa_lead' from is_project_manager() function.
-- QA Leads will now follow strict membership-based access like regular users.
-- ══════════════════════════════════════════════════════════════════════════════

-- Update is_project_manager() to exclude qa_lead
-- Only managers and admins can manage projects globally now
CREATE OR REPLACE FUNCTION public.is_project_manager()
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('manager', 'admin', 'super_admin')
  )
$$;

COMMENT ON FUNCTION public.is_project_manager() IS 
  'Returns true if user is manager, admin, or super_admin. QA Leads are now excluded and follow membership rules.';
