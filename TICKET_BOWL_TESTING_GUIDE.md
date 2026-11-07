# Ticket Bowl Date Filter - Testing Guide

## Quick Testing Workflow

### 1. Apply the Migration

**Option A: Using Supabase CLI**
```bash
cd flux-ai-app
supabase db push
```

**Option B: Using Supabase Dashboard**
1. Open Supabase Dashboard
2. Go to SQL Editor
3. Open `supabase/migrations/100_fix_forwarding_date_filter.sql`
4. Execute the entire file

### 2. Run Verification Tests

**In Supabase SQL Editor:**

Copy and paste each of these scripts one at a time:

#### Test 1: Diagnostic Check
```bash
# File: scripts/diagnose_oct30_tickets.sql
```
This will show:
- All forwarding events on Oct 30, 2026
- Current work package details for those tickets
- Direct stored procedure results

**Expected:** Should identify tickets 17140, 17003, 16758

#### Test 2: Comprehensive Verification
```bash
# File: scripts/verify_oct30_fix.sql
```
This runs 6 tests:
1. Raw forwarding events
2. Current ticket statuses
3. Stored procedure with no status filter
4. Closed tickets specifically
5. Status breakdown
6. Total count verification

**Expected:** All tests pass, total count = 3 tickets

#### Test 3: Logic Validation
```bash
# File: scripts/test_date_filter_logic.sql
```
This tests:
- Date filter without status restriction
- Date filter WITH Closed status
- Date filter WITH In Progress status
- Status distribution

**Expected:** Demonstrates correct filtering behavior

### 3. UI Testing

#### Navigate to Ticket Bowl
```
http://localhost:5173/ticket-bowl
```

#### Test Scenario 1: Date Filter Only
1. Select project with OpenProject integration
2. Set **Forwarded to Testing Date Range**:
   - From: `2026-10-30`
   - To: `2026-10-30`
3. Leave all other filters empty

**Expected Results:**
- ✅ Shows exactly 3 tickets: 17140, 17003, 16758
- ✅ Each ticket shows its current OpenProject Status (including Closed if applicable)
- ✅ Table displays all required columns correctly

#### Test Scenario 2: Date Filter + Status Filter
1. Keep the date range as above
2. Additionally select **OpenProject Status filter** (if available in UI)
3. Choose "Closed"

**Expected Results:**
- ✅ Shows only tickets that are BOTH:
  - Forwarded on Oct 30, 2026, AND
  - Currently have status = Closed
- ✅ This is an optional refinement, not a restriction

#### Test Scenario 3: Verify Closed Tickets Appear
1. Set date range to Oct 30, 2026
2. No other filters
3. Look for any tickets with Status column showing "Closed"

**Expected Results:**
- ✅ If any of the 3 tickets (17140, 17003, 16758) are currently Closed, they appear in results
- ✅ Closed status is clearly visible in the Status column

#### Test Scenario 4: Different Date Ranges
1. Try dates before Oct 30, 2026
2. Try dates after Oct 30, 2026
3. Try a range spanning multiple days including Oct 30

**Expected Results:**
- ✅ Only tickets with verified forwarding events in the selected range appear
- ✅ Tickets forwarded outside the range do not appear

### 4. Dashboard Stats Verification

With the Oct 30, 2026 date filter applied:

**Check Dashboard Stats Display:**
- ✅ Total Unique Tickets: Should show 3
- ✅ Total Forwarding Events: Should show count of events on that date
- ✅ Status breakdown: Should show distribution across different OpenProject statuses
- ✅ No artificial exclusion of any status category

### 5. Regression Tests Checklist

Run through these scenarios manually:

| Test | Action | Expected Result |
|---|---|---|
| 1 | Date filter with ticket having status = New | ✅ Included |
| 2 | Date filter with ticket having status = In Progress | ✅ Included |
| 3 | Date filter with ticket having status = Resolved | ✅ Included |
| 4 | Date filter with ticket having status = Closed | ✅ **Included** |
| 5 | Date filter with ticket having status = Rejected | ✅ Included |
| 6 | Clear all filters | ✅ Shows all tickets |
| 7 | Date filter + Type filter (BUG) | ✅ Shows only BUGs forwarded on date |
| 8 | Date filter + Type filter (Support Issue) | ✅ Shows only Support Issues forwarded on date |
| 9 | Multiple forwarding events on same date | ✅ Shows ticket once, history shows all events |
| 10 | Ticket forwarded outside date range | ✅ Not included |

## Common Issues & Solutions

### Issue: No tickets appear even though history shows events

**Diagnosis:**
```sql
-- Check if history records exist
SELECT COUNT(*) FROM ticket_bowl_forwarding_history
WHERE changed_at >= '2026-10-30T00:00:00Z'
  AND changed_at < '2026-10-31T00:00:00Z';

-- Check if work packages exist
SELECT COUNT(*) FROM ticket_bowl_work_packages
WHERE work_package_id IN (17140, 17003, 16758);
```

**Solution:**
- Verify the migration was applied correctly
- Check project_id matches between tables
- Run a sync if data is missing

### Issue: Wrong ticket count

**Diagnosis:**
```sql
-- Check for duplicate records
SELECT work_package_id, COUNT(*)
FROM ticket_bowl_work_packages
GROUP BY work_package_id
HAVING COUNT(*) > 1;
```

**Solution:**
- Ensure DISTINCT or proper grouping in queries
- Verify the stored procedure logic

### Issue: Closed tickets not appearing

**Diagnosis:**
```sql
-- Direct check
SELECT work_package_id, status_name
FROM ticket_bowl_work_packages
WHERE work_package_id IN (17140, 17003, 16758)
  AND status_name = 'Closed';
```

**Solution:**
- Verify the migration was applied
- Check there are no client-side filters in the UI
- Confirm the stored procedure has the correct logic

## Rollback Plan

If you need to rollback the changes:

```sql
-- This will restore the previous version with the fallback
-- (Not recommended, but available if needed)

-- Copy the original function from:
-- supabase/migrations/097_ticket_bowl_module.sql
-- Lines 410-795
```

## Performance Monitoring

After deployment, monitor:

```sql
-- Query execution time
EXPLAIN ANALYZE
SELECT * FROM get_ticket_bowl_work_packages(
    p_project_id := '<your-project-id>',
    p_forwarded_from := '2026-10-30T00:00:00Z'::timestamptz,
    p_forwarded_to := '2026-10-30T23:59:59.999Z'::timestamptz,
    p_limit := 25,
    p_offset := 0
);
```

**Expected:** Query should complete in < 500ms for typical datasets

## Success Indicators

✅ Migration applies without errors  
✅ All 6 verification tests pass  
✅ UI shows exactly 3 tickets for Oct 30, 2026  
✅ Closed tickets are visible when they have qualifying forwarding events  
✅ Dashboard stats are accurate  
✅ Query performance is acceptable  
✅ No console errors in browser  
✅ No Supabase errors in logs

## Support

If you encounter issues:

1. Check the detailed documentation: `TICKET_BOWL_DATE_FILTER_FIX.md`
2. Review the migration file: `100_fix_forwarding_date_filter.sql`
3. Run diagnostic scripts to identify the issue
4. Check Supabase logs for error details

---

**Last Updated:** November 7, 2026  
**Migration Version:** 100
