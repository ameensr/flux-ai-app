-- ============================================================
-- 017: Announcements RLS Policies for RBAC
-- Enable row-level security and create policies for role-based
-- announcement management
-- ============================================================

-- Enable RLS on announcements table
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any (idempotent)
DROP POLICY IF EXISTS "Users can view announcements based on audience" ON public.announcements;
DROP POLICY IF EXISTS "Users can create announcements with permission" ON public.announcements;
DROP POLICY IF EXISTS "Users can edit their own announcements or admins edit any" ON public.announcements;
DROP POLICY IF EXISTS "Only admins can delete announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can view all announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;

-- ============================================================
-- POLICY 1: View Announcements
-- Users can view based on:
-- - Admins see all (including drafts)
-- - Non-admins see published announcements targeted to them
-- - Users see their own announcements (any status)
-- ============================================================
CREATE POLICY "Users can view announcements based on audience"
  ON public.announcements FOR SELECT
  USING (
    -- Admins see all (including drafts)
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
    OR
    -- Non-admins see published announcements targeted to them
    (
      status = 'published'
      AND (
        audience = 'all'
        OR audience = (SELECT role FROM public.profiles WHERE id = auth.uid())
      )
    )
    OR
    -- Users see their own announcements (any status)
    author_id = auth.uid()
  );

-- ============================================================
-- POLICY 2: Create Announcements
-- Users can create if they have can_create permission
-- (Checked in frontend via RBAC system)
-- ============================================================
CREATE POLICY "Users can create announcements with permission"
  ON public.announcements FOR INSERT
  WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
  );

-- ============================================================
-- POLICY 3: Edit Announcements
-- Users can edit their own announcements
-- Admins can edit any announcement
-- ============================================================
CREATE POLICY "Users can edit their own announcements or admins edit any"
  ON public.announcements FOR UPDATE
  USING (
    -- Own announcements
    author_id = auth.uid()
    OR
    -- Admins can edit any
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- POLICY 4: Delete Announcements
-- Only admins can delete announcements
-- ============================================================
CREATE POLICY "Only admins can delete announcements"
  ON public.announcements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- ============================================================
-- Grant permissions to authenticated users
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON public.announcements TO authenticated;
GRANT DELETE ON public.announcements TO authenticated;

-- ============================================================
-- TRIGGER: Auto-set author_id on insert
-- Ensures announcements are always created with correct author
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_announcement_author()
RETURNS TRIGGER AS $$
BEGIN
  -- Set author_id to current user
  NEW.author_id := auth.uid();
  
  -- Set timestamps
  IF TG_OP = 'INSERT' THEN
    NEW.created_at := NOW();
  END IF;
  NEW.updated_at := NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS set_announcement_author_trigger ON public.announcements;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER set_announcement_author_trigger
  BEFORE INSERT OR UPDATE ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_announcement_author();

-- ============================================================
-- Enable RLS on related tables (reads and acknowledgements)
-- ============================================================
ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_acknowledgements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own reads" ON public.announcement_reads;
DROP POLICY IF EXISTS "Users can create their own reads" ON public.announcement_reads;
DROP POLICY IF EXISTS "Admins can view all reads" ON public.announcement_reads;
DROP POLICY IF EXISTS "Users can view their own acks" ON public.announcement_acknowledgements;
DROP POLICY IF EXISTS "Users can create their own acks" ON public.announcement_acknowledgements;
DROP POLICY IF EXISTS "Admins can view all acknowledgements" ON public.announcement_acknowledgements;

-- Policies for announcement_reads
CREATE POLICY "Users can view their own reads"
  ON public.announcement_reads FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own reads"
  ON public.announcement_reads FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all reads"
  ON public.announcement_reads FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policies for announcement_acknowledgements
CREATE POLICY "Users can view their own acks"
  ON public.announcement_acknowledgements FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can create their own acks"
  ON public.announcement_acknowledgements FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all acknowledgements"
  ON public.announcement_acknowledgements FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT ON public.announcement_reads TO authenticated;
GRANT SELECT, INSERT ON public.announcement_acknowledgements TO authenticated;
