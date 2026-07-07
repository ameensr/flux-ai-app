# Project Hub Setup Guide

## Overview
The Project Hub module replaces the old Teams feature with a more robust project-based organization system. This guide will help you set up and troubleshoot the Project Hub.

---

## 🚀 Setup Steps

### Step 1: Run Database Migrations

You need to run **three migration files** in order:

#### 1. **034_project_hub.sql** - Creates projects tables
```sql
-- Location: supabase/migrations/034_project_hub.sql
-- Creates: projects, project_members tables
-- Adds: project_id columns to feature tables
```

**To run:**
- Open Supabase Dashboard → SQL Editor
- Copy contents of `supabase/migrations/034_project_hub.sql`
- Click "Run"

#### 2. **035_project_hub_rbac.sql** - Adds RBAC permissions
```sql
-- Location: supabase/migrations/035_project_hub_rbac.sql
-- Creates: project-hub module in RBAC system
-- Adds: permissions for all roles
```

**To run:**
- Open Supabase Dashboard → SQL Editor
- Copy contents of `supabase/migrations/035_project_hub_rbac.sql`
- Click "Run"

#### 3. **036_remove_teams.sql** - Removes old Teams system (OPTIONAL)
```sql
-- Location: supabase/migrations/036_remove_teams.sql OR 036_remove_teams_simple.sql
-- Removes: teams table and my_team_id() function (if they exist)
```

**⚠️ IMPORTANT - Choose ONE option:**

**Option A (Recommended if you get "teams does not exist" error):**
- Open Supabase Dashboard → SQL Editor
- Copy contents of `supabase/migrations/036_remove_teams_simple.sql`
- Click "Run"
- This version is safe for databases that never had Teams

**Option B (If your database actually had Teams):**
- Open Supabase Dashboard → SQL Editor
- Copy contents of `supabase/migrations/036_remove_teams.sql` (updated version)
- Click "Run"
- This version checks if teams exist before removing them

---

## ✅ Verification

### Check if migrations ran successfully:

```sql
-- Check if projects table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'projects'
);
-- Should return: true

-- Check if project_members table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'project_members'
);
-- Should return: true

-- Check if project-hub module exists in RBAC
SELECT * FROM public.modules WHERE module_key = 'project-hub';
-- Should return 1 row

-- Check if project-hub permissions exist
SELECT * FROM public.permissions WHERE module_key = 'project-hub';
-- Should return multiple rows
```

---

## 🐛 Troubleshooting

### Error: "column organization_id does not exist"

**Problem:** Migration 034 tried to create a column referencing organizations table that doesn't exist.

**Solution:** The migration has been updated to remove organization_id dependency. Re-run migration 034.

---

### Error: "relation 'public.teams' does not exist"

**Problem:** Your database never had a teams table (Teams feature was never used).

**Solution:** Use the simplified migration instead:
1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase/migrations/036_remove_teams_simple.sql` instead
3. This is completely safe and will complete successfully

---

### Error: "cannot drop function my_team_id() because other objects depend on it"

**Problem:** Other policies depend on the my_team_id() function.

**Solution:** Migration 036 has been updated to drop dependent policies first. Re-run migration 036.

---

### Error: "Could not embed because more than one relationship was found"

**Full Error:** 
```
Could not embed because more than one relationship was found for 'project_members' and 'profiles'
```

**Problem:** The `project_members` table has two foreign keys pointing to `profiles`:
- `user_id` → `profiles(id)` (the member)
- `assigned_by` → `profiles(id)` (who added them)

Supabase doesn't know which relationship to use when you write `profiles(...)` without specifying.

**Solution:** ✅ **Already fixed!** The code now specifies the foreign key explicitly:
```typescript
profile:profiles!project_members_user_id_fkey(...)
```

This tells Supabase to use the `user_id` foreign key relationship.

If you still see this error after refreshing, clear your browser cache (Ctrl+Shift+R or Cmd+Shift+R).

---

### Error: "Projects table does not exist"

**Problem:** Migration 034 hasn't been run yet.

**Solution:** 
1. Go to Supabase Dashboard → SQL Editor
2. Run `supabase/migrations/034_project_hub.sql`
3. Refresh the app

---

### Error: "No permission to access projects"

**Problem:** Your user role doesn't have project-hub permissions, or RLS policies are blocking access.

**Solution:**

1. **Check if module exists:**
```sql
SELECT * FROM public.modules WHERE module_key = 'project-hub';
```

2. **Check if your role has permissions:**
```sql
SELECT rp.* 
FROM public.role_permissions rp
JOIN public.modules m ON rp.module_id = m.id
WHERE m.module_key = 'project-hub' 
  AND rp.role_name = 'YOUR_ROLE_HERE';
```

3. **Grant permissions manually (if needed):**
```sql
-- Get module ID
SELECT id FROM public.modules WHERE module_key = 'project-hub';

-- Grant permissions (replace <module_id> with actual UUID)
INSERT INTO public.role_permissions (role_name, module_id, permission_key, granted)
VALUES 
  ('admin', '<module_id>', 'can_view', true),
  ('admin', '<module_id>', 'can_create', true),
  ('admin', '<module_id>', 'can_edit', true),
  ('admin', '<module_id>', 'can_delete', true);
```

---

### Error: Toast notification appears but no message

**Problem:** A toast is showing but the error message isn't visible.

**Solution:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for errors starting with `[ProjectHub]` or `[fetchProjects]`
4. The detailed error message will be logged there

---

## 📊 Project Hub Features

### Permission Levels

| Role | Can View | Can Create | Can Edit | Can Delete |
|------|----------|------------|----------|------------|
| **super_admin** | ✅ All | ✅ All | ✅ All | ✅ All |
| **admin** | ✅ All | ✅ All | ✅ All | ✅ All |
| **manager** | ✅ All | ✅ Yes | ✅ Own/Assigned | ❌ No |
| **qa_lead** | ✅ All | ✅ Yes | ✅ Own/Assigned | ❌ No |
| **qa_engineer** | ✅ Assigned only | ❌ No | ✅ Assigned | ❌ No |
| **developer** | ✅ Assigned only | ❌ No | ❌ No | ❌ No |
| **pro** | ✅ Assigned only | ❌ No | ❌ No | ❌ No |
| **free** | ✅ Assigned only | ❌ No | ❌ No | ❌ No |

### Project Roles

Within each project, members can have different roles:

- **Owner**: Full control over the project (created it)
- **Lead**: Can manage members and edit project settings
- **Member**: Can contribute to project work
- **Viewer**: Read-only access to project information

---

## 🔧 Manual Testing

### Test 1: View Projects
1. Navigate to Project Hub from sidebar
2. Should see: Project list (empty or populated)
3. Should NOT see: Error messages

### Test 2: Create Project (if you have permission)
1. Click "New Project" button
2. Fill in project details
3. Click "Create"
4. Should see: Success toast, new project appears in list

### Test 3: View Project Details
1. Click on any project card
2. Should see: Project details page with members list
3. Should be able to: Navigate back to projects list

### Test 4: Assign Members (if you're project owner/lead)
1. Open project details
2. Click "Add Member"
3. Search for a user
4. Assign role and click "Add"
5. Should see: Member added to project

---

## 📝 Database Schema Summary

### `projects` table
```sql
- id (UUID, PK)
- name (TEXT)
- description (TEXT)
- project_code (TEXT)
- status (active | on_hold | completed | archived)
- start_date (DATE)
- target_end_date (DATE)
- actual_end_date (DATE)
- tags (TEXT[])
- metadata (JSONB)
- created_by (UUID FK → profiles)
- created_at, updated_at (TIMESTAMPTZ)
```

### `project_members` table
```sql
- id (UUID, PK)
- project_id (UUID FK → projects)
- user_id (UUID FK → profiles)
- project_role (owner | lead | member | viewer)
- assigned_at (TIMESTAMPTZ)
- assigned_by (UUID FK → profiles)
- UNIQUE(project_id, user_id)
```

---

## 🎯 Next Steps After Setup

1. ✅ Verify all 3 migrations ran successfully
2. ✅ Check that Project Hub appears in sidebar (between Settings and Admin Panel)
3. ✅ Create your first test project
4. ✅ Assign team members to the project
5. ✅ Update existing feature modules to support project filtering (optional, Task #8)

---

## 📞 Need Help?

If you encounter issues not covered in this guide:

1. Check browser DevTools console for detailed error logs
2. Verify your user role has project-hub permissions in Admin Panel
3. Ensure all 3 migrations ran without errors
4. Check Supabase Dashboard → Database → Tables to verify `projects` and `project_members` exist
5. Review RLS policies in Supabase Dashboard → Authentication → Policies

---

## 🗂️ Related Files

**Frontend:**
- `src/modules/ProjectHub/ProjectHub.tsx` - Main page
- `src/modules/ProjectHub/ProjectDetail.tsx` - Project details view
- `src/modules/ProjectHub/projectService.ts` - API service layer
- `src/modules/ProjectHub/types/index.ts` - TypeScript types
- `src/components/layout/Sidebar.tsx` - Navigation (Project Hub positioning)

**Backend:**
- `supabase/migrations/034_project_hub.sql` - Tables & RLS
- `supabase/migrations/035_project_hub_rbac.sql` - RBAC setup
- `supabase/migrations/036_remove_teams.sql` - Teams removal

**Deprecated:**
- `src/pages/EnterpriseAdmin/TeamManagement.tsx` - Replaced by Project Hub
