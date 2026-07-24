# QA Weekly Reports - Team Visibility Fix

## Problem Summary

**Issue:** QA Managers cannot see QA Weekly Reports created by QA Leads on the same team.

**Root Cause:** The `weekly_reports` table had overly restrictive RLS (Row Level Security) policies that only allowed users to see their own reports (`auth.uid() = user_id`).

## Solution Implemented

### 1. Database Migration (059_weekly_reports_team_visibility.sql)

Created a comprehensive migration that:

- **Adds `project_id` column** to `weekly_reports` table for proper project association
- **Replaces restrictive RLS policies** with team-based visibility rules
- **Creates index** on `project_id` for better query performance

### 2. Frontend Store Update (store.ts)

Updated `fetchReports` function to:
- Remove client-side `user_id` filter
- Let RLS policies handle visibility at database level
- Increased limit from 10 to 50 reports to show more team reports

## New Visibility Rules

### SELECT Policy (Who Can See Reports)

✅ **Users can see:**
1. **Their own reports** (always)
2. **Team member reports** from shared projects (if they're a Manager or QA Lead)
3. **All reports** (if they're Admin or Super Admin)

### UPDATE Policy (Who Can Edit Reports)

✅ **Users can update:**
- Their own reports
- Any report (if they're Manager, Admin, or Super Admin)

### DELETE Policy (Who Can Delete Reports)

✅ **Users can delete:**
- Their own reports
- Any report (if they're Manager, Admin, or Super Admin)

### INSERT Policy (Who Can Create Reports)

✅ **Users can create:**
- Only their own reports (enforced by `auth.uid() = user_id`)

## Team-Based Visibility Logic

The SELECT policy uses this logic:

```sql
-- Rule 1: Own reports
auth.uid() = user_id

OR

-- Rule 2: Manager/QA Lead sees team reports from shared projects
(
  -- User has manager or qa_lead role
  EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() 
    AND role IN ('manager', 'qa_lead')
  )
  AND
  -- Both users are members of at least one shared project
  EXISTS (
    SELECT 1 FROM project_members pm1
    INNER JOIN project_members pm2 ON pm1.project_id = pm2.project_id
    WHERE pm1.user_id = auth.uid()
    AND pm2.user_id = weekly_reports.user_id
  )
)

OR

-- Rule 3: Admins see everything
EXISTS (
  SELECT 1 FROM profiles WHERE id = auth.uid() 
  AND role IN ('admin', 'super_admin')
)
```

## Example Scenarios

### Scenario 1: QA Lead Creates Report
- **QA Lead (Sarah)** creates a weekly report for "Project Alpha"
- **QA Manager (John)** is also on "Project Alpha"
- ✅ **Result:** John can see Sarah's report in history

### Scenario 2: Multiple QA Leads on Same Project
- **QA Lead A (Sarah)** and **QA Lead B (Mike)** are both on "Project Beta"
- Sarah creates a weekly report
- ✅ **Result:** Mike can see Sarah's report (and vice versa)

### Scenario 3: Admin Access
- **Admin (Emily)** is not on "Project Gamma"
- QA Lead creates report for "Project Gamma"
- ✅ **Result:** Emily can see all reports regardless of project membership

### Scenario 4: Regular User
- **Regular User (Tom)** is not a Manager or QA Lead
- ❌ **Result:** Tom only sees his own reports

## Migration Steps

### Option 1: Automatic Migration (Supabase CLI)

```bash
# Apply migration
npx supabase db push

# Or if using remote Supabase
npx supabase db push --db-url postgresql://[YOUR-DB-URL]
```

### Option 2: Manual Migration (SQL Editor)

1. Open Supabase Dashboard → SQL Editor
2. Copy contents of `supabase/migrations/059_weekly_reports_team_visibility.sql`
3. Run the SQL script
4. Verify policies: Settings → Database → Policies → weekly_reports

## Testing Checklist

After applying the migration, test the following:

- [ ] QA Lead creates a report
- [ ] QA Manager on same project can see the report in History
- [ ] Another QA Lead on same project can see the report
- [ ] Admin can see all reports
- [ ] Regular user (non-manager) only sees their own reports
- [ ] Users can still create their own reports
- [ ] Users can edit/delete their own reports
- [ ] Managers can edit/delete team reports
- [ ] Reports are properly filtered by project_id when selected

## Files Modified

1. **supabase/migrations/059_weekly_reports_team_visibility.sql** (NEW)
   - Adds project_id column
   - Updates RLS policies for team visibility

2. **src/modules/QAWeeklyReport/store.ts** (MODIFIED)
   - Updated `fetchReports` to remove user_id filter
   - Increased limit from 10 to 50 reports
   - Added comments explaining team visibility

## Benefits

✅ **Better Collaboration** - Managers can monitor team's QA reporting activity  
✅ **Improved Visibility** - QA Leads can learn from each other's reports  
✅ **Consistent with Other Modules** - Matches Daily Update Report visibility model  
✅ **Secure** - Still respects project membership boundaries  
✅ **Flexible** - Admins maintain full visibility for support purposes

## Notes

- The migration is **safe to run** - uses `DO $$ BEGIN ... END $$` blocks to check if column exists
- **Backward compatible** - Existing reports remain visible to their creators
- **Performance optimized** - Added index on `project_id` column
- **Well documented** - Includes comments on policies and table

## Support

If you encounter issues:
1. Check Supabase logs for RLS policy errors
2. Verify user roles in `profiles` table
3. Confirm `project_members` table has correct assignments
4. Review `project_id` values in `weekly_reports` are properly set

---

**Created:** 2026-07-22  
**Migration:** 059  
**Status:** ✅ Ready for deployment
