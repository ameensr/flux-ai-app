-- Fix foreign key on ai_usage_logs to SET NULL on provider delete
-- This prevents deletion failures when a provider has usage history.

ALTER TABLE public.ai_usage_logs
  DROP CONSTRAINT IF EXISTS ai_usage_logs_provider_id_fkey;

ALTER TABLE public.ai_usage_logs
  ADD CONSTRAINT ai_usage_logs_provider_id_fkey
  FOREIGN KEY (provider_id)
  REFERENCES public.ai_provider_configs(id)
  ON DELETE SET NULL;

-- Also allow admins/super_admins to update usage logs (for cleanup)
DROP POLICY IF EXISTS "admins_write_logs" ON public.ai_usage_logs;
CREATE POLICY "admins_write_logs" ON public.ai_usage_logs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );
