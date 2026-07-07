# Fix: "More than one relationship was found" Error

## Error Message
```
Failed to Load Projects
Could not embed because more than one relationship was found for 'project_members' and 'profiles'
```

## Root Cause

The `project_members` table has **two foreign key relationships** to the `profiles` table:

```sql
CREATE TABLE project_members (
  user_id UUID REFERENCES profiles(id),      -- FK #1: The member
  assigned_by UUID REFERENCES profiles(id),  -- FK #2: Who added them
  ...
);
```

When you write a Supabase query like this:
```typescript
profile:profiles(id, email, full_name, ...)
```

Supabase doesn't know whether to use `user_id` or `assigned_by` as the join key.

---

## ✅ Solution: Specify the Foreign Key Explicitly

Change this:
```typescript
profile:profiles(...)
```

To this:
```typescript
profile:profiles!project_members_user_id_fkey(...)
```

The `!project_members_user_id_fkey` explicitly tells Supabase to use the foreign key constraint named `project_members_user_id_fkey` (which links `user_id` to `profiles.id`).

---

## Fixed Queries

### Before (❌ Ambiguous)
```typescript
.select(`
  *,
  members:project_members(
    profile:profiles(id, email, full_name, role, avatar_url)
  )
`)
```

### After (✅ Explicit)
```typescript
.select(`
  *,
  members:project_members(
    profile:profiles!project_members_user_id_fkey(id, email, full_name, role, avatar_url)
  )
`)
```

---

## What Changed

All Supabase queries in `src/modules/ProjectHub/projectService.ts` have been updated:

1. ✅ `fetchProjects()` - List all projects with members
2. ✅ `fetchProjectById()` - Get single project details
3. ✅ `fetchProjectMembers()` - Get members for a project
4. ✅ `fetchMyProjects()` - Get projects for current user

---

## How to Apply the Fix

1. **Refresh your browser** (Ctrl+R or F5)
2. **Clear cache if needed** (Ctrl+Shift+R or Cmd+Shift+R)
3. **Click "Project Hub"** in the sidebar
4. You should now see: ✅ Empty projects list or existing projects

---

## If You Still See the Error

1. **Hard refresh** your browser (Ctrl+Shift+R / Cmd+Shift+R)
2. **Clear browser cache completely:**
   - Chrome: Ctrl+Shift+Delete → Clear cached images and files
   - Firefox: Ctrl+Shift+Delete → Cached Web Content
3. **Check DevTools Console (F12)** for any other errors
4. **Verify the migration ran successfully:**
   ```sql
   SELECT EXISTS (
     SELECT FROM information_schema.tables 
     WHERE table_name = 'project_members'
   );
   ```

---

## Understanding Foreign Key Names

Supabase automatically names foreign keys using this pattern:
```
{table_name}_{column_name}_fkey
```

For our case:
- Table: `project_members`
- Column: `user_id`
- Foreign Key Name: `project_members_user_id_fkey`

If you wanted to join using `assigned_by` instead, you would use:
```typescript
assigner:profiles!project_members_assigned_by_fkey(...)
```

---

## Technical Details

### Why This Happens

Supabase PostgREST API uses foreign key constraints to determine relationships. When multiple FKs point to the same table, you must disambiguate.

### How to Find FK Names

Run this query in Supabase SQL Editor:
```sql
SELECT
  tc.table_name, 
  kcu.column_name, 
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name = 'project_members';
```

Result:
```
table_name       | column_name  | constraint_name
-----------------+--------------+----------------------------------
project_members  | user_id      | project_members_user_id_fkey
project_members  | assigned_by  | project_members_assigned_by_fkey
project_members  | project_id   | project_members_project_id_fkey
```

---

## Summary

✅ **All queries fixed** - Foreign key explicitly specified in all project queries
✅ **No code changes needed** - Just refresh your browser
✅ **Documentation updated** - Error added to troubleshooting guide

**The fix is already applied. Just refresh your app and it should work!** 🎉
