-- Migration: Fix duplicate sync status rows caused by NULL conflict upsert bug
-- Postgres NULL != NULL in UNIQUE constraints, so upsert with onConflict never
-- matched when op_project_id was NULL, inserting a new row on every sync.
-- Keep only the most recently updated row per (project_id, op_project_id).

DELETE FROM openproject_sync_status
WHERE id NOT IN (
  SELECT DISTINCT ON (project_id, op_project_id) id
  FROM openproject_sync_status
  ORDER BY project_id, op_project_id, updated_at DESC NULLS LAST
);
