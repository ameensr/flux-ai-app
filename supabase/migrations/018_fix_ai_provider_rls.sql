-- Fix RLS on ai_provider_configs to allow super_admin write access

DROP POLICY IF EXISTS "admins_all" ON public.ai_provider_configs;

CREATE POLICY "admins_all" ON public.ai_provider_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );
