# Quick Fix: "teams does not exist" Error

## Problem
When running migration `036_remove_teams.sql`, you get:
```
Error: Failed to run sql query: ERROR: 42P01: relation "public.teams" does not exist
```

## Root Cause
Your database never had a Teams table, so there's nothing to remove. This is completely normal!

---

## ✅ Solution: Use the Simplified Migration

Instead of running `036_remove_teams.sql`, run this simpler version:

### **Run: `036_remove_teams_simple.sql`**

1. Open Supabase Dashboard → SQL Editor
2. Copy **ALL** the content below:

```sql
-- ══════════════════════════════════════════════════════════════════════════════
-- Migration 036: Remove Teams (Simplified Version)
-- 
-- This is a simplified version that only drops the my_team_id() function if it exists.
-- Use this if your database never had a teams table.
-- ══════════════════════════════════════════════════════════════════════════════

-- Drop the my_team_id() function if it exists (it may not exist, that's ok)
DROP FUNCTION IF EXISTS public.my_team_id() CASCADE;

-- Add comment to projects table
COMMENT ON TABLE public.projects IS 
  'Projects are the primary organizational unit for QA work. Each project has members with specific roles (owner, lead, member, viewer).';

-- Log completion
DO $$ 
BEGIN
  RAISE NOTICE 'Migration 036 (simplified) completed. Teams feature was never used in this database.';
END $$;
```

3. Click **"Run"**
4. You should see: **Success!** or a message saying "Migration 036 (simplified) completed"

---

## After Running the Migration

Now test Project Hub:

1. **Refresh your app** (F5 or Ctrl+R)
2. **Click on "Project Hub"** in the sidebar
3. **Check the browser console** (F12 → Console tab)

### Expected Results:
✅ No error toasts
✅ Empty project list showing "No projects found"
✅ "New Project" button visible (if you have create permission)

### If you still see errors:
Check the browser console for messages like:
- `[ProjectHub] Load projects error:` → This will tell you the exact issue
- `[fetchProjects] Supabase error:` → This shows the database error

---

## Complete Migration Checklist

Run these in order:

- [x] **Step 1:** `034_project_hub.sql` (Creates projects tables) ✅
- [x] **Step 2:** `035_project_hub_rbac.sql` (Adds permissions) ✅
- [ ] **Step 3:** `036_remove_teams_simple.sql` (Cleanup - use this one!) ← **YOU ARE HERE**

---

## Verification Query

After running all migrations, verify everything is set up correctly:

```sql
-- Check if projects table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'projects'
) AS projects_exists,

-- Check if project_members table exists
EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'project_members'
) AS project_members_exists,

-- Check if project-hub module exists
EXISTS (
  SELECT FROM public.modules WHERE module_key = 'project-hub'
) AS module_exists;
```

**Expected result:** All three should return `true`

---

## Still Having Issues?

1. **Copy the exact error** from browser console
2. **Check your user role** in the app (bottom of sidebar)
3. **Verify permissions:**
   ```sql
   SELECT m.module_key, rp.permission_key, rp.granted
   FROM public.role_permissions rp
   JOIN public.modules m ON rp.module_id = m.id
   WHERE m.module_key = 'project-hub' 
     AND rp.role_name = 'YOUR_ROLE_HERE';
   ```
   (Replace `YOUR_ROLE_HERE` with your actual role like 'admin', 'manager', etc.)

---

## Summary

✅ **Updated files:**
- `036_remove_teams.sql` - Now handles missing teams gracefully
- `036_remove_teams_simple.sql` - **← Use this one** (simpler, safer)
- `PROJECT_HUB_SETUP_GUIDE.md` - Complete setup and troubleshooting guide
- `MIGRATION_QUICK_FIX.md` - This quick reference guide

✅ **What changed:**
- Project Hub now positioned between Settings and Admin Panel ✅
- Teams section removed from Enterprise RBAC ✅
- Better error messages in Project Hub component ✅
- Migration 036 now handles databases without Teams ✅
