# Fix: Overdue Tasks Consistency

## Problem

There was an inconsistency between the dashboard overdue count and the row indicators:

- **Dashboard:** Counted tasks due TODAY as "overdue" (using `<=`)
- **Row Indicator:** Showed tasks due TODAY as yellow 🟡 "Due Today" (not red 🔴)
- **Result:** Dashboard said "5 Overdue" but only 4 rows were red

## Solution: Option 2 - Don't Count "Due Today" as Overdue

Changed the logic to treat "due today" as still on-time, giving users a grace period.

## Changes Made

### 1. Dashboard Overdue Count (`src/modules/DailyUpdateReport/index.tsx`)

**Before:**
```typescript
const overdueTasksCount = supportRows.filter(r => {
  if (r.actual_end_date) return false
  if (!r.planned_end_date) return false
  return r.planned_end_date <= todayStr  // ❌ Included today
}).length
```

**After:**
```typescript
const overdueTasksCount = supportRows.filter(r => {
  if (r.actual_end_date) return false
  if (!r.planned_end_date) return false
  return r.planned_end_date < todayStr  // ✅ Excludes today (strictly past)
}).length
```

### 2. Overdue Filter (`src/modules/DailyUpdateReport/components/SupportExceptionLog.tsx`)

**Before:**
```typescript
if (overdueOnlyFilter) {
  const isOverdue = !row.actual_end_date && row.planned_end_date && row.planned_end_date <= todayStr  // ❌ Included today
  if (!isOverdue) return false
}
```

**After:**
```typescript
if (overdueOnlyFilter) {
  const isOverdue = !row.actual_end_date && row.planned_end_date && row.planned_end_date < todayStr  // ✅ Excludes today
  if (!isOverdue) return false
}
```

## New Behavior

### Task Status by Date (Today is 2026-07-07)

| Planned End Date | Actual End | Status | Dashboard Count | Row Icon | Filter Shows |
|------------------|------------|--------|----------------|----------|--------------|
| 2026-07-05 | null | Overdue | ✅ Counted | 🔴 Red | ✅ Shown |
| 2026-07-06 | null | Overdue | ✅ Counted | 🔴 Red | ✅ Shown |
| **2026-07-07** | null | **Due Today** | ❌ **Not counted** | 🟡 Yellow | ❌ **Hidden** |
| 2026-07-08 | null | On Track | ❌ Not counted | 🟢 Green | ❌ Hidden |
| 2026-07-05 | 2026-07-06 | Completed | ❌ Not counted | ✅ Green | ❌ Hidden |

### What's "Overdue" Now?

✅ **Overdue** = Task is incomplete AND planned date is BEFORE today (strictly past)

🟡 **Due Today** = Task is incomplete AND planned date is TODAY (still on-time, needs attention)

🟢 **On Track** = Task has no deadline OR deadline is in the future

✅ **Completed** = Task has an actual end date (regardless of whether it was late)

## Benefits

1. ✅ **Consistent with row indicators**: Dashboard count matches red 🔴 rows
2. ✅ **Grace period for today**: Tasks due today aren't "overdue" yet
3. ✅ **Clear distinction**: "Overdue" means missed deadline, not "due now"
4. ✅ **Better UX**: Yellow 🟡 shows urgency without penalty

## Example Scenario

### Before Fix:

**Tasks:**
- Task A: Due 2026-07-05 (2 days ago) → 🔴 Red
- Task B: Due 2026-07-06 (yesterday) → 🔴 Red
- Task C: Due 2026-07-07 (today) → 🟡 Yellow
- Task D: Due 2026-07-08 (tomorrow) → 🟢 Green

**Dashboard:** "3 Overdue Tasks" ← Counted A, B, C
**Rows:** Only 2 red rows (A, B) ← **Inconsistent!**
**Click "Overdue Tasks":** Shows A, B, C (including yellow row)

### After Fix:

**Tasks:** (same as above)

**Dashboard:** "2 Overdue Tasks" ← Counts only A, B
**Rows:** 2 red rows (A, B) ← **Consistent!** ✅
**Click "Overdue Tasks":** Shows only A, B (red rows only)

Task C (due today) is visible in main view with yellow icon but not in "Overdue" filter.

## User Workflow

1. User opens Daily Report
2. Sees "2 Overdue Tasks" in dashboard
3. Clicks "Overdue Tasks" card
4. Filter shows exactly 2 rows with 🔴 red icons
5. User can see yellow 🟡 "Due Today" tasks separately in main view

## Edge Cases Handled

### Case 1: Task Completed Late
```
Planned: 2026-07-05
Actual: 2026-07-08
```
**Result:** ✅ Completed (green) - Not counted as overdue

### Case 2: Task Due Today, Not Started
```
Planned: 2026-07-07 (today)
Actual: null
```
**Result:** 🟡 Due Today - NOT counted as overdue (grace period)

### Case 3: Task Due Tomorrow
```
Planned: 2026-07-08
Actual: null
```
**Result:** 🟢 On Track - Not counted as overdue

### Case 4: No Planned Date
```
Planned: null
Actual: null
```
**Result:** 🟢 On Track - Cannot be overdue without a deadline

## Testing

### Test Case 1: Dashboard Count
1. Create tasks with different planned dates (past, today, future)
2. Check dashboard "Overdue Tasks" count
3. **Expected:** Count only includes tasks with dates BEFORE today

### Test Case 2: Row Indicators Match
1. Count red 🔴 rows in table
2. Compare with dashboard "Overdue Tasks" count
3. **Expected:** Numbers match exactly

### Test Case 3: Overdue Filter
1. Click "Overdue Tasks" dashboard card
2. **Expected:** Shows only red 🔴 rows
3. **Expected:** Yellow 🟡 "Due Today" rows are hidden

### Test Case 4: Due Today Visibility
1. Create task with planned date = today
2. **Expected:** Shows yellow 🟡 icon in main view
3. **Expected:** NOT counted in overdue count
4. **Expected:** Hidden when overdue filter is active

## Files Modified

1. `src/modules/DailyUpdateReport/index.tsx` (line 76)
   - Changed `<=` to `<` in overdueTasksCount calculation

2. `src/modules/DailyUpdateReport/components/SupportExceptionLog.tsx` (line 809)
   - Changed `<=` to `<` in overdueOnlyFilter logic

## Status: ✅ FIXED

Overdue logic is now consistent across:
- ✅ Dashboard count
- ✅ Row indicators
- ✅ Overdue filter

Tasks due today are no longer counted as "overdue" - they get a grace period and show as "Due Today" 🟡 instead.
