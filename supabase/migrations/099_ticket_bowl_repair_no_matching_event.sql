-- ============================================================================
-- Migration: 099_ticket_bowl_repair_no_matching_event.sql
-- Fix: Reset incorrectly assigned 'no_matching_event' records to 'unavailable'
--      so they are re-inspected on the next sync.
--
-- Root cause: The previous sync logic pre-assigned 'no_matching_event' to any
-- ticket whose current Testing Status was not the exact forwarding target,
-- without actually inspecting its activity history. This permanently excluded
-- tickets that were historically forwarded but have since moved to another
-- Testing Status (e.g., ticket 16758 forwarded on 30 Oct, then status changed).
--
-- Fix: Any ticket with 'no_matching_event' that has NO corresponding row in
-- ticket_bowl_forwarding_history is reset to 'unavailable'. This forces a
-- fresh activity inspection on the next sync, which will correctly find and
-- store the historical forwarding event.
--
-- Tickets with 'no_matching_event' that DO have forwarding history rows are
-- corrected to 'verified' (the DB count recalculation already handles this,
-- but this migration ensures consistency for any that were missed).
-- ============================================================================

-- 1. Correct tickets that have forwarding history but are marked no_matching_event
UPDATE ticket_bowl_work_packages wp
SET
  history_verification_status = 'verified',
  forwarding_count = (
    SELECT COUNT(*)::INTEGER
    FROM ticket_bowl_forwarding_history fh
    WHERE fh.project_id = wp.project_id
      AND fh.work_package_id = wp.work_package_id
  ),
  latest_forwarded_at = (
    SELECT MAX(fh.changed_at)
    FROM ticket_bowl_forwarding_history fh
    WHERE fh.project_id = wp.project_id
      AND fh.work_package_id = wp.work_package_id
  ),
  latest_forwarded_by_name = (
    SELECT fh.changed_by_name
    FROM ticket_bowl_forwarding_history fh
    WHERE fh.project_id = wp.project_id
      AND fh.work_package_id = wp.work_package_id
    ORDER BY fh.changed_at DESC
    LIMIT 1
  ),
  updated_at = NOW()
WHERE wp.history_verification_status = 'no_matching_event'
  AND EXISTS (
    SELECT 1
    FROM ticket_bowl_forwarding_history fh
    WHERE fh.project_id = wp.project_id
      AND fh.work_package_id = wp.work_package_id
  );

-- 2. Reset tickets with no_matching_event and no forwarding history to
--    'unavailable' so they are re-inspected on the next sync.
--    Clear history_checked_at so the incremental skip logic treats them as
--    needing a fresh check.
UPDATE ticket_bowl_work_packages wp
SET
  history_verification_status = 'unavailable',
  history_checked_at = NULL,
  updated_at = NOW()
WHERE wp.history_verification_status = 'no_matching_event'
  AND NOT EXISTS (
    SELECT 1
    FROM ticket_bowl_forwarding_history fh
    WHERE fh.project_id = wp.project_id
      AND fh.work_package_id = wp.work_package_id
  );

-- ============================================================================
-- END OF MIGRATION: 099_ticket_bowl_repair_no_matching_event.sql
-- ============================================================================
