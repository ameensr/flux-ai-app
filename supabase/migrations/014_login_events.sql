-- Login Activity Tracking
-- Records each sign-in attempt (success or failure) for security auditing.

CREATE TABLE IF NOT EXISTS login_events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type  TEXT NOT NULL CHECK (event_type IN ('sign_in', 'sign_up', 'failed')),
    browser     TEXT,
    os          TEXT,
    ip_address  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups by user (most recent first)
CREATE INDEX IF NOT EXISTS idx_login_events_user_created
    ON login_events(user_id, created_at DESC);

-- RLS: users can only see their own login events
ALTER TABLE login_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own login events"
    ON login_events FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own login events"
    ON login_events FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own login events"
    ON login_events FOR DELETE
    USING (auth.uid() = user_id);

-- Admins can view all login events (for audit purposes)
CREATE POLICY "Admins can view all login events"
    ON login_events FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('admin', 'super_admin')
        )
    );
