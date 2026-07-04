-- Enterprise Announcement Management System
-- Tables: announcements, announcement_reads, announcement_acknowledgements

-- ── Announcements ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS announcements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    priority        TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
    category        TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'maintenance', 'feature', 'security', 'policy', 'event')),
    status          TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
    is_pinned       BOOLEAN NOT NULL DEFAULT false,
    requires_ack    BOOLEAN NOT NULL DEFAULT false,
    audience        TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all', 'admin', 'pro', 'free')),
    publish_date    TIMESTAMPTZ,
    expiry_date     TIMESTAMPTZ,
    attachment_url  TEXT,
    attachment_name TEXT,
    external_link   TEXT,
    author_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    author_name     TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for dashboard queries (active, non-expired, published, ordered by pin then date)
CREATE INDEX IF NOT EXISTS idx_announcements_active
    ON announcements(status, publish_date DESC)
    WHERE status = 'published';

CREATE INDEX IF NOT EXISTS idx_announcements_expiry
    ON announcements(expiry_date)
    WHERE expiry_date IS NOT NULL;

-- ── Announcement Reads (tracks who viewed which announcement) ─────────────────
CREATE TABLE IF NOT EXISTS announcement_reads (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    read_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_announcement
    ON announcement_reads(announcement_id);

CREATE INDEX IF NOT EXISTS idx_announcement_reads_user
    ON announcement_reads(user_id);

-- ── Announcement Acknowledgements (for announcements requiring explicit ack) ──
CREATE TABLE IF NOT EXISTS announcement_acknowledgements (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    announcement_id UUID NOT NULL REFERENCES announcements(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    acknowledged_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(announcement_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_announcement_acks_announcement
    ON announcement_acknowledgements(announcement_id);

-- ── RLS Policies ──────────────────────────────────────────────────────────────
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_acknowledgements ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view published announcements
CREATE POLICY "Users can view published announcements"
    ON announcements FOR SELECT
    USING (
        status = 'published'
        AND (publish_date IS NULL OR publish_date <= now())
        AND (expiry_date IS NULL OR expiry_date > now())
    );

-- Admins can view all announcements (including drafts/archived)
CREATE POLICY "Admins can view all announcements"
    ON announcements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Admins can create/update/delete announcements
CREATE POLICY "Admins can insert announcements"
    ON announcements FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can update announcements"
    ON announcements FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

CREATE POLICY "Admins can delete announcements"
    ON announcements FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Users can insert their own reads
CREATE POLICY "Users can mark announcements as read"
    ON announcement_reads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own reads"
    ON announcement_reads FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all reads (for analytics)
CREATE POLICY "Admins can view all reads"
    ON announcement_reads FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- Users can acknowledge announcements
CREATE POLICY "Users can acknowledge announcements"
    ON announcement_acknowledgements FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own acknowledgements"
    ON announcement_acknowledgements FOR SELECT
    USING (auth.uid() = user_id);

-- Admins can view all acknowledgements (for analytics)
CREATE POLICY "Admins can view all acknowledgements"
    ON announcement_acknowledgements FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role = 'admin'
        )
    );

-- ── Auto-update updated_at trigger ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_announcements_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER announcements_updated_at_trigger
    BEFORE UPDATE ON announcements
    FOR EACH ROW
    EXECUTE FUNCTION update_announcements_updated_at();
