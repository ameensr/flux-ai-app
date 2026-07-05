-- Role-Based Maintenance Mode
-- Allows admins to lock specific roles out of the application
-- while other roles continue working normally.

CREATE TABLE IF NOT EXISTS public.maintenance_config (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled         BOOLEAN NOT NULL DEFAULT false,
  maintenance_type TEXT NOT NULL DEFAULT 'full_lock' CHECK (maintenance_type IN ('full_lock', 'custom_message')),
  reason          TEXT DEFAULT 'Scheduled maintenance in progress.',
  start_time      TIMESTAMPTZ,
  end_time        TIMESTAMPTZ,
  locked_roles    TEXT[] NOT NULL DEFAULT '{}',  -- role keys that are blocked, e.g. {'free', 'pro'}
  allowed_roles   TEXT[] NOT NULL DEFAULT '{super_admin,admin}', -- roles that always bypass
  show_countdown  BOOLEAN NOT NULL DEFAULT true,
  show_branding   BOOLEAN NOT NULL DEFAULT true,
  support_email   TEXT DEFAULT 'support@company.com',
  custom_message  TEXT,
  updated_by      UUID REFERENCES auth.users(id),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Only one config row should exist (singleton pattern)
-- Insert the default row
INSERT INTO public.maintenance_config (id, enabled, locked_roles, allowed_roles)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  false,
  '{}',
  '{super_admin,admin}'
) ON CONFLICT (id) DO NOTHING;

-- RLS
ALTER TABLE public.maintenance_config ENABLE ROW LEVEL SECURITY;

-- Everyone can read maintenance config (needed for the gate check)
CREATE POLICY "Anyone can read maintenance config"
  ON public.maintenance_config FOR SELECT
  USING (true);

-- Only admins/super_admins can update
CREATE POLICY "Admins can update maintenance config"
  ON public.maintenance_config FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can insert maintenance config"
  ON public.maintenance_config FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'super_admin')
    )
  );
