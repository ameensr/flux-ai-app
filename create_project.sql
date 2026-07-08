-- ============================================
-- CREATE A NEW PROJECT (if none exist)
-- ============================================

-- Check if any projects exist
SELECT COUNT(*) as total_projects FROM projects;

-- If count = 0, create a default project:
INSERT INTO projects (
  name,
  project_code,
  description,
  status,
  start_date,
  created_at,
  updated_at
) VALUES (
  'Default Project',           -- Project name
  'DEFAULT-001',               -- Project code
  'Default project for existing data',  -- Description
  'active',                    -- Status
  CURRENT_DATE,                -- Start date
  NOW(),                       -- Created timestamp
  NOW()                        -- Updated timestamp
) RETURNING id, name, project_code;

-- ⬆️ Copy the 'id' value returned above
-- Then use it in the UPDATE queries from get_project_id.sql
