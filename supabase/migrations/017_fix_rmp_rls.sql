-- Fix RLS on role_module_permissions to allow super_admin write access

DROP POLICY IF EXISTS "rmp_admin_write" ON public.role_module_permissions;

CREATE POLICY "rmp_admin_write" ON public.role_module_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );
