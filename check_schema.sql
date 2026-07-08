-- Check project_members table structure
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'project_members'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check project_roles table structure (if it exists)
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'project_roles'
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- Show your actual project memberships
SELECT * 
FROM project_members 
WHERE user_id = auth.uid();
