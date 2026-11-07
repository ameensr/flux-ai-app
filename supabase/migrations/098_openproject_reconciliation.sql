-- ============================================================================
-- Migration: 098_openproject_reconciliation.sql
-- Description: Add reconciliation tracking fields to ticket_bowl_sync_status
--              to support OpenProject Sync Health Monitor
-- ============================================================================

-- Add reconciliation tracking columns to ticket_bowl_sync_status
ALTER TABLE ticket_bowl_sync_status ADD COLUMN IF NOT EXISTS reconciliation_status TEXT CHECK (reconciliation_status IN ('healthy', 'minor_issues', 'data_mismatch', 'critical_mismatch'));
ALTER TABLE ticket_bowl_sync_status ADD COLUMN IF NOT EXISTS last_reconciliation_at TIMESTAMPTZ;
ALTER TABLE ticket_bowl_sync_status ADD COLUMN IF NOT EXISTS missing_ticket_ids BIGINT[];
ALTER TABLE ticket_bowl_sync_status ADD COLUMN IF NOT EXISTS duplicate_ticket_ids BIGINT[];
ALTER TABLE ticket_bowl_sync_status ADD COLUMN IF NOT EXISTS openproject_total INTEGER DEFAULT 0;
ALTER TABLE ticket_bowl_sync_status ADD COLUMN IF NOT EXISTS supabase_total INTEGER DEFAULT 0;
ALTER TABLE ticket_bowl_sync_status ADD COLUMN IF NOT EXISTS missing_count INTEGER DEFAULT 0;
ALTER TABLE ticket_bowl_sync_status ADD COLUMN IF NOT EXISTS duplicate_count INTEGER DEFAULT 0;
ALTER TABLE ticket_bowl_sync_status ADD COLUMN IF NOT EXISTS verified_count INTEGER DEFAULT 0;
ALTER TABLE ticket_bowl_sync_status ADD COLUMN IF NOT EXISTS unavailable_count INTEGER DEFAULT 0;
ALTER TABLE ticket_bowl_sync_status ADD COLUMN IF NOT EXISTS unverified_count INTEGER DEFAULT 0;
ALTER TABLE ticket_bowl_sync_status ADD COLUMN IF NOT EXISTS forwarding_events_count INTEGER DEFAULT 0;
ALTER TABLE ticket_bowl_sync_status ADD COLUMN IF NOT EXISTS issues TEXT[];

-- Create index for reconciliation queries
CREATE INDEX IF NOT EXISTS idx_tb_sync_reconciliation ON ticket_bowl_sync_status(project_id, last_reconciliation_at DESC NULLS LAST);

-- Add comment
COMMENT ON COLUMN ticket_bowl_sync_status.reconciliation_status IS 'Overall reconciliation health: healthy, minor_issues, data_mismatch, critical_mismatch';
COMMENT ON COLUMN ticket_bowl_sync_status.missing_ticket_ids IS 'Array of OpenProject work package IDs that exist in OpenProject but not in Supabase';
COMMENT ON COLUMN ticket_bowl_sync_status.duplicate_ticket_ids IS 'Array of work package IDs that have duplicate rows in Supabase';
