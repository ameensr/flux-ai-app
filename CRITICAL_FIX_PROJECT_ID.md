# CRITICAL FIX: Missing project_id on Import

## The Real Root Cause 🔴

The data loss issue was NOT just about debounced syncs or flash loading - it was fundamentally about **project_id not being set** when saving imported data to the database!

## What Was Happening

### User's Experience:
1. User selects **Project A** from dropdown
2. User imports a CSV file with 10 rows
3. Warning appears: "QA 'John Doe' is not configured"
4. User navigates to `/daily-report/configuration`
5. User adds "John Doe" to QA configuration
6. User navigates back to `/daily-report`
7. **ALL 10 IMPORTED ROWS ARE GONE!** 😱

### What the Code Was Doing:

```
Selected Project: Project A (UUID: aaa-111-bbb)
                    ↓
          [User imports file]
                    ↓
        setSupportRows([...imported], true)
                    ↓
        syncRowsToDatabase() called
                    ↓
┌────────────────────────────────────────────┐
│ BEFORE FIX:                                │
│ const item = {                             │
│   ...r,                                    │
│   user_id: user.id,     ← ✅ Set          │
│   sort_order: i + 1     ← ✅ Set          │
│   // project_id ???     ← ❌ MISSING!     │
│ }                                          │
│                                            │
│ Database Insert:                           │
│ INSERT INTO daily_support_logs (           │
│   support_id, description, ...,            │
│   user_id, sort_order, project_id          │
│ ) VALUES (                                 │
│   'SUP-001', 'Test bug', ...,              │
│   'user-123', 1, NULL     ← 🔴 NULL!      │
│ )                                          │
└────────────────────────────────────────────┘
                    ↓
        [User navigates to config and back]
                    ↓
        fetchReportRows() called
                    ↓
┌────────────────────────────────────────────┐
│ Database Query:                            │
│ SELECT * FROM daily_support_logs           │
│ WHERE user_id = 'user-123'                 │
│   AND project_id = 'aaa-111-bbb'  ← Project A filter │
│ ORDER BY sort_order                        │
│                                            │
│ Result: [] (EMPTY!)                        │
│                                            │
│ Why? Because imported rows have:           │
│ project_id = NULL (doesn't match 'aaa-111-bbb') │
└────────────────────────────────────────────┘
                    ↓
        [UI shows empty table]
                    ↓
        😱 USER: "My data is gone!"
```

## The Fix

### AFTER FIX:

```typescript
syncRowsToDatabase: async () => {
  const selectedProjectId = get().selectedProjectId  // ← NEW: Get current project
  
  const supportPayload = get().supportRows.map((r, i) => {
    const item: any = { ...r, user_id: user.id, sort_order: i + 1 }
    
    // ✅ NEW: Set project_id to currently selected project
    if (selectedProjectId) {
      item.project_id = selectedProjectId
    }
    
    // ... rest of mapping
    return item
  })
  
  // ...
}
```

### Now the Database Insert:

```sql
INSERT INTO daily_support_logs (
  support_id, description, ...,
  user_id, sort_order, project_id
) VALUES (
  'SUP-001', 'Test bug', ...,
  'user-123', 1, 'aaa-111-bbb'  ← ✅ Correct project_id!
)
```

### When User Returns:

```sql
SELECT * FROM daily_support_logs
WHERE user_id = 'user-123'
  AND project_id = 'aaa-111-bbb'  ← Matches!

Result: [10 rows returned] ✅
```

## Why This Wasn't Caught Earlier

1. **No project filter initially**: In early development, there might not have been a project filter, so `project_id = NULL` worked fine
2. **Testing with "All Projects"**: If tested with project dropdown set to "-- All Projects --", the query wouldn't filter by project_id
3. **Same-session testing**: If you imported and checked immediately (without navigation), localStorage still had the data
4. **Hidden by other issues**: The flash and debounce issues masked this deeper problem

## Additional Fixes in This Commit

### 1. Project-Scoped Delete

**Before:**
```typescript
// Deleted ALL user rows across ALL projects!
await supabase
  .from('daily_support_logs')
  .delete()
  .eq('user_id', user.id)
```

**After:**
```typescript
// Only delete rows for the CURRENT project
if (selectedProjectId) {
  await supabase
    .from('daily_support_logs')
    .delete()
    .eq('user_id', user.id)
    .eq('project_id', selectedProjectId)  // ← Scoped to current project
}
```

This prevents accidentally deleting data from other projects when syncing!

### 2. Better Error Detection

**Before:**
```typescript
const stateUpdate = { syncStatus: 'synced', syncing: false }

if (supportPayload.length > 0) {
  const res = results[resIdx++]
  if (!res.error && res.data) {
    stateUpdate.supportRows = res.data
  }
  // ❌ Even if error occurs, syncStatus is still 'synced'!
}

set(stateUpdate)
```

**After:**
```typescript
let hasErrors = false

if (supportPayload.length > 0) {
  const res = results[resIdx++]
  if (res.error) {
    console.error('[DailyReportStore] Support logs insert failed:', res.error)
    hasErrors = true  // ← Track errors
  } else if (res.data) {
    stateUpdate.supportRows = res.data
  }
}

// ✅ Only mark as synced if NO errors occurred
stateUpdate.syncStatus = hasErrors ? 'error' : 'synced'

set(stateUpdate)
```

## Database Schema Context

From `034_project_hub.sql`:

```sql
-- Daily support logs
ALTER TABLE public.daily_support_logs 
  ADD COLUMN IF NOT EXISTS project_id UUID 
  REFERENCES public.projects(id) ON DELETE SET NULL;

-- RLS Policy
CREATE POLICY "daily_support_logs_select" ON public.daily_support_logs 
FOR SELECT USING (
  public.is_admin() 
  OR user_id = auth.uid()
  OR (project_id IS NOT NULL AND public.is_project_member(project_id))
  OR (project_id IS NULL AND team_id IS NULL)  ← Legacy data support
);
```

The schema allows `project_id = NULL` for backward compatibility with legacy data, but NEW data should always have a project_id when a project is selected!

## Impact of This Fix

### Before Fix:
- ❌ Imported data lost when navigating away (appeared to be deleted)
- ❌ Data saved to wrong project (NULL instead of selected project)
- ❌ Sync between projects would delete all user data
- ❌ No error detection for failed database inserts

### After Fix:
- ✅ Imported data persists across navigation
- ✅ Data correctly associated with selected project
- ✅ Project data isolation (syncing Project A doesn't affect Project B)
- ✅ Errors are detected and reported
- ✅ SyncStatus accurately reflects database state

## Testing Checklist

### Critical Test Cases:

**Test 1: Import with Project Selected**
1. Select Project A from dropdown
2. Import CSV file with 5 rows
3. Navigate to configuration
4. Navigate back to daily report
5. **Expected:** All 5 rows visible
6. **Verify in DB:** All rows have `project_id = Project A's UUID`

**Test 2: Project Isolation**
1. Select Project A, import 5 rows
2. Select Project B, import 3 rows
3. Switch back to Project A
4. **Expected:** Only the 5 rows from Project A are visible
5. Switch to Project B
6. **Expected:** Only the 3 rows from Project B are visible

**Test 3: Sync Without Project**
1. Set dropdown to "-- All Projects --"
2. Import data
3. Navigate away and back
4. **Expected:** Data should still be visible (project_id = NULL is valid for "All Projects" view)

**Test 4: Error Handling**
1. Simulate database error (e.g., disconnect network)
2. Import data
3. **Expected:** syncStatus should be 'error', not 'synced'
4. **Expected:** Console error logged
5. **Expected:** Data preserved in localStorage

### Database Verification:

```sql
-- Check imported data has correct project_id
SELECT id, support_id, description, project_id, user_id
FROM daily_support_logs
WHERE user_id = 'your-user-id'
ORDER BY created_at DESC
LIMIT 10;

-- Should see project_id matching your selected project, not NULL
```

## Related Issues Fixed

1. **Data loss on navigation** ✅
2. **Flash of rows on refresh** ✅  
3. **Missing project_id** ✅ ← THIS WAS THE ROOT CAUSE
4. **Cross-project data contamination** ✅
5. **Silent error failures** ✅

## Files Modified

1. `src/modules/DailyUpdateReport/store.ts` - syncRowsToDatabase function
   - Added project_id assignment
   - Added project-scoped delete
   - Added error detection and logging
   - Lines: ~385-500

## Deployment Notes

- ✅ **No migration needed** - project_id column already exists
- ✅ **Backward compatible** - handles both NULL and set project_id
- ✅ **No breaking changes** - existing data unaffected
- ⚠️ **Users should re-import** - Old imported data might have NULL project_id

## Post-Deployment

### User Communication:
> "We've fixed a critical issue where imported data was being lost when navigating away from the Daily Report page. The issue was caused by project association not being properly set on imported rows. If you recently imported data and it disappeared, you may need to re-import it. Going forward, all imported data will be correctly associated with the selected project."

### Monitoring:
- Watch for console errors about failed database inserts
- Monitor syncStatus = 'error' occurrences
- Check for project_id = NULL in new imports (should be rare now)

## Lessons Learned

1. **Always set foreign keys when inserting data** - Don't assume they'll be set automatically
2. **Test with filters applied** - "All items" view can hide filtering bugs
3. **Check database state, not just UI** - The data was in DB but with wrong project_id
4. **Error handling matters** - Silent failures hide real issues
5. **Project scope everything** - Don't delete/update data across all projects

---

**This was the smoking gun!** 🔫 The other fixes (debounce, flash) were improvements, but this missing `project_id` was the root cause of data loss.
