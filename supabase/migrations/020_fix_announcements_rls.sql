-- ============================================================
-- 020: Fix Announcements RLS policies for super_admin
-- Widen policies to allow both 'admin' and 'super_admin' roles.
-- ============================================================

-- 1. announcements table policies
DROP POLICY IF EXISTS "Admins can view all announcements" ON public.announcements;
CREATE POLICY "Admins can view all announcements"
    ON public.announcements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE public.profiles.id = auth.uid()
            AND public.profiles.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins can insert announcements" ON public.announcements;
CREATE POLICY "Admins can insert announcements"
    ON public.announcements FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE public.profiles.id = auth.uid()
            AND public.profiles.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins can update announcements" ON public.announcements;
CREATE POLICY "Admins can update announcements"
    ON public.announcements FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE public.profiles.id = auth.uid()
            AND public.profiles.role IN ('admin', 'super_admin')
        )
    );

DROP POLICY IF EXISTS "Admins can delete announcements" ON public.announcements;
CREATE POLICY "Admins can delete announcements"
    ON public.announcements FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE public.profiles.id = auth.uid()
            AND public.profiles.role IN ('admin', 'super_admin')
        )
    );

-- 2. announcement_reads table policies
DROP POLICY IF EXISTS "Admins can view all reads" ON public.announcement_reads;
CREATE POLICY "Admins can view all reads"
    ON public.announcement_reads FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE public.profiles.id = auth.uid()
            AND public.profiles.role IN ('admin', 'super_admin')
        )
    );

-- 3. announcement_acknowledgements table policies
DROP POLICY IF EXISTS "Admins can view all acknowledgements" ON public.announcement_acknowledgements;
CREATE POLICY "Admins can view all acknowledgements"
    ON public.announcement_acknowledgements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE public.profiles.id = auth.uid()
            AND public.profiles.role IN ('admin', 'super_admin')
        )
    );
