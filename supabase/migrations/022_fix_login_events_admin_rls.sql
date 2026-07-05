-- Fix: Allow super_admin to view all login events (previously only 'admin' was allowed)

DROP POLICY IF EXISTS "Admins can view all login events" ON login_events;

CREATE POLICY "Admins can view all login events"
    ON login_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
        )
    );
