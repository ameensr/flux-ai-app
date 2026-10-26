-- Migration 090: Qub.ai Rebranding Announcement Configuration
-- Adds rebranding_announcement_enabled column to maintenance_config
-- and creates a dedicated fallback configuration table with RLS.

-- 1. Add column to maintenance_config if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'maintenance_config' 
      AND column_name = 'rebranding_announcement_enabled'
  ) THEN
    ALTER TABLE public.maintenance_config 
    ADD COLUMN rebranding_announcement_enabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
END $$;

-- 2. Standalone config table for dedicated storage / fallback
CREATE TABLE IF NOT EXISTS public.rebranding_announcement_config (
  id UUID PRIMARY KEY DEFAULT '00000000-0000-0000-0000-000000000001',
  enabled BOOLEAN NOT NULL DEFAULT false,
  updated_by UUID REFERENCES auth.users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert singleton default row
INSERT INTO public.rebranding_announcement_config (id, enabled)
VALUES ('00000000-0000-0000-0000-000000000001', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS
ALTER TABLE public.rebranding_announcement_config ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'rebranding_announcement_config' 
      AND policyname = 'Anyone can read rebranding config'
  ) THEN
    CREATE POLICY "Anyone can read rebranding config"
      ON public.rebranding_announcement_config FOR SELECT
      USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'rebranding_announcement_config' 
      AND policyname = 'Admins can update rebranding config'
  ) THEN
    CREATE POLICY "Admins can update rebranding config"
      ON public.rebranding_announcement_config FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin')
        )
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
      AND tablename = 'rebranding_announcement_config' 
      AND policyname = 'Admins can insert rebranding config'
  ) THEN
    CREATE POLICY "Admins can insert rebranding config"
      ON public.rebranding_announcement_config FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin')
        )
      );
  END IF;
END $$;

GRANT SELECT ON TABLE public.rebranding_announcement_config TO anon, authenticated;
GRANT UPDATE, INSERT ON TABLE public.rebranding_announcement_config TO authenticated;

-- Enable Realtime for rebranding_announcement_config
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.rebranding_announcement_config;
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN undefined_object THEN NULL;
END $$;
