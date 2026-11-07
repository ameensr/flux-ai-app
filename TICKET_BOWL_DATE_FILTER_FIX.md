# Ticket Bowl – Forwarding Date Filter Fix

## Issue Summary

The **Forwarded to Testing Date Range** filter in `/ticket-bowl` was not correctly filtering tickets based on verified historical forwarding events. The filter was including tickets based on a fallback condition that checked the `wp.latest_forwarded_at` field, which could result in incorrect matches.

### Root Cause

In the stored procedure `get_ticket_bowl_work_packages`, the date filter logic had three conditions joined by `OR`:

```sql
AND (
  (p_forwarded_from IS NULL AND p_forwarded_to IS NULL)
  OR
  EXISTS (
    -- Check for verified history records in date range ✓
    SELECT 1
    FROM ticket_bowl_forwarding_history fh
    WHERE fh.project_id = wp.project_id
      AND fh.work_package_id = wp.work_package_id
      AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
      AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
  )
  OR
  (
    -- PROBLEMATIC FALLBACK ✗
    wp.latest_forwarded_at IS NOT NULL
    AND (p_forwarded_from IS NULL OR wp.latest_forwarded_at >= p_forwarded_from)
    AND (p_forwarded_to IS NULL OR wp.latest_forwarded_at <= p_forwarded_to)
  )
)
```

The third condition was a fallback that allowed tickets to pass the filter if:
- Their `latest_forwarded_at` field fell within the date range
- **Even if no verified forwarding event existed in `ticket_bowl_forwarding_history` for that date**

This caused incorrect behavior because:
1. The `latest_forwarded_at` field is for display purposes
2. It might not be synchronized with the actual history records
3. It doesn't represent verified forwarding transitions

## The Fix

**Migration:** `100_fix_forwarding_date_filter.sql`

The fix removes the problematic fallback condition entirely. The corrected logic is:

```sql
AND (
  -- If no date filter, include all tickets
  (p_forwarded_from IS NULL AND p_forwarded_to IS NULL)
  OR
  -- If date filter is applied, MUST have a verified history record in range
  EXISTS (
    SELECT 1
    FROM ticket_bowl_forwarding_history fh
    WHERE fh.project_id = wp.project_id
      AND fh.work_package_id = wp.work_package_id
      AND (p_forwarded_from IS NULL OR fh.changed_at >= p_forwarded_from)
      AND (p_forwarded_to IS NULL OR fh.changed_at <= p_forwarded_to)
  )
)
```

### Key Changes

1. **Removed the fallback condition** that checked `wp.latest_forwarded_at`
2. **Date filtering now relies solely on** the `EXISTS` check against `ticket_bowl_forwarding_history`
3. Applied the fix to both:
   - `get_ticket_bowl_work_packages` (main query function)
   - `get_ticket_bowl_dashboard_stats` (statistics function)

## Correct Behavior

When a user selects:
```
Forwarded to Testing Date Range: 30 October 2026
```

The system will now:

1. ✅ Query `ticket_bowl_forwarding_history` for all records where `changed_at` falls on October 30, 2026
2. ✅ Include ONLY tickets that have at least one verified forwarding event on that date
3. ✅ Include tickets regardless of their current OpenProject Status (New, In Progress, Resolved, **Closed**, Rejected, etc.)
4. ✅ Display each qualifying ticket once, showing:
   - Current OpenProject Status (including Closed)
   - Current Testing Status
   - Latest forwarding date/time within the selected range
   - Who forwarded it
   - Total lifetime forwarding count

## Two Independent Fields

The fix maintains the correct understanding that these are separate fields:

### A. OpenProject Status
- Example values: New, In Progress, Resolved, Closed, Rejected
- Represents the overall ticket/work package status
- **Used for:** Display and optional filtering (user choice)

### B. Testing Status (customField14)
- Example value: `Forwarded to the Testing Team`
- Represents the QA/testing workflow status
- **Used for:** Determining if a forwarding event occurred

**Critical:** The current OpenProject Status is NOT used to determine whether a ticket qualifies for the date filter. Only the historical Testing Status transition events matter.

## Verification

### Expected Results for October 30, 2026

Based on the requirement, the filter should return these 3 tickets:

| Ticket ID | Type | Current OpenProject Status |
|---|---|---|
| 17140 | Support Issue | (actual current status) |
| 17003 | Support Issue | (actual current status) |
| 16758 | BUG | (actual current status) |

### Verification Scripts

Two scripts are provided to verify the fix:

1. **`scripts/diagnose_oct30_tickets.sql`**
   - Manually check the forwarding history for October 30, 2026
   - Verify the work package details
   - Test the stored procedure directly

2. **`scripts/verify_oct30_fix.sql`**
   - Comprehensive test suite with 6 test cases
   - Verifies that Closed tickets are included
   - Checks breakdown by status
   - Validates total count

Run these scripts after applying the migration to confirm the fix.

## Regression Tests

All these scenarios should now work correctly:

| Scenario | Expected |
|---|---|
| Forwarded on selected date, current status New | ✅ Include |
| Forwarded on selected date, current status In Progress | ✅ Include |
| Forwarded on selected date, current status Resolved | ✅ Include |
| Forwarded on selected date, current status Closed | ✅ Include |
| Forwarded on selected date, current status Rejected | ✅ Include |
| Forwarded on selected date, later changed to another Testing Status | ✅ Include |
| Current Testing Status is Forwarded, but no verified historical transition exists in range | ✅ Exclude |
| Forwarded outside selected date range | ✅ Exclude |
| Multiple forwarding events in selected range | ✅ Display one ticket row with all matching events in history |
| BUG or Support Issue | ✅ Include both |

## Additional Filters

After applying the forwarding date range, users can optionally filter by:
- OpenProject Status (optional)
- Ticket Type
- Priority
- QA Engineer / Assignee
- Author
- Ticket ID
- Subject
- Other supported fields

**Important:** These are additional filters, not eligibility conditions. If the user does not select an OpenProject Status filter, all statuses are included.

## Files Changed

1. **`supabase/migrations/100_fix_forwarding_date_filter.sql`** - The migration with the fix
2. **`scripts/diagnose_oct30_tickets.sql`** - Diagnostic script
3. **`scripts/verify_oct30_fix.sql`** - Verification test suite

## Deployment Steps

1. Review the migration file
2. Apply the migration to the database:
   ```bash
   # Via Supabase CLI
   supabase db push
   
   # Or manually in Supabase SQL Editor
   # Copy and execute 100_fix_forwarding_date_filter.sql
   ```
3. Run the verification script:
   ```bash
   # In Supabase SQL Editor or via psql
   \i scripts/verify_oct30_fix.sql
   ```
4. Verify the UI results in the Ticket Bowl page

## Success Criteria

✅ For the date filter `30 October 2026`, the Ticket Bowl returns exactly 3 unique tickets: **17140, 17003, 16758**

✅ The result includes tickets regardless of their current OpenProject Status, including Closed

✅ Each ticket displays its current OpenProject Status accurately

✅ The filter only includes tickets with verified historical Testing Status transitions to `Forwarded to the Testing Team` on the selected date

---

**Migration Applied:** `100_fix_forwarding_date_filter.sql`  
**Date:** November 7, 2026  
**Author:** Kiro AI
