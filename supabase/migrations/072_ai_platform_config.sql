-- Centralised AI provider kill-switch (singleton)
-- When enabled = false, FastAPI AI routes and frontend AIService must block.

CREATE TABLE IF NOT EXISTS public.ai_platform_config (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled     BOOLEAN NOT NULL DEFAULT true,
  updated_by  UUID REFERENCES auth.users(id),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.ai_platform_config (id, enabled)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  true
) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.ai_platform_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read ai platform config"
  ON public.ai_platform_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can update ai platform config"
  ON public.ai_platform_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert ai platform config"
  ON public.ai_platform_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

GRANT SELECT ON TABLE public.ai_platform_config TO anon, authenticated;
GRANT UPDATE, INSERT ON TABLE public.ai_platform_config TO authenticated;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_platform_config;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
