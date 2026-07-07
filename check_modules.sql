-- Quick check script to verify if modules exist
-- Run this in Supabase Studio SQL Editor

-- Check all modules
SELECT 
  module_key, 
  module_name, 
  route_path, 
  is_active,
  sort_order
FROM modules
ORDER BY sort_order;

-- Expected output should include:
-- admin-hub     | Admin Hub     | /admin       | true | 5
-- project-hub   | Project Hub   | /project-hub | true | 15
