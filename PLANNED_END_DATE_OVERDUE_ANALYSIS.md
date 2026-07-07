# Planned End Date - Overdue Condition Analysis

## Overview

The "Planned End Date" overdue logic is used to:
1. **Highlight rows** with red 🔴 indicator
2. **Count overdue tasks** in the dashboard
3. **Filter tasks** when "Overdue Tasks" card is clicked

---

## Where the Logic is Implemented

### 1. Dashboard Overdue Count (index.tsx)

**Location:** `src/modules/DailyUpdateReport/index.tsx` (lines 73-77)

```typescript
const todayStr = new Date().toISOString().split('T')[0]
const overdueTasksCount = supportRows.filter(r => {
  if (r.actual_end_date) return false         // ✅ Completed tasks are NOT overdue
  if (!r.planned_end_date) return false       // ✅ Tasks without planned date are NOT overdue
  return r.planned_end_date <= todayStr       // 🔴 Overdue if planned date is today or past
}).length
```

**Conditions:**
- ✅ Task is **NOT overdue** if: `actual_end_date` exists (task is completed)
- ✅ Task is **NOT overdue** if: `planned_end_date` is empty/null (no deadline set)
- 🔴 Task **IS overdue** if: `planned_end_date` is today or in the past AND not completed

**Note:** Uses `<=` which means **due today counts as overdue**

---

### 2. Row Health Indicator (SupportExceptionLog.tsx)

**Location:** `src/modules/DailyUpdateReport/components/SupportExceptionLog.tsx` (lines 53-67)

```typescript
const getRowHealth = (row: SupportLogRecord) => {
  if (row.actual_end_date) {
    return { icon: '✅', label: 'Completed' }
  }
  if (!row.planned_end_date) {
    return { icon: '🟢', label: 'On Track' }
  }
  if (row.planned_end_date === todayStr) {
    return { icon: '🟡', label: 'Due Today' }
  }
  if (row.planned_end_date < todayStr) {
    return { icon: '🔴', label: 'Overdue' }
  }
  return { icon: '🟢', label: 'On Track' }
}
```

**Row Status Indicators:**
- ✅ **Completed** - Has `actual_end_date`
- 🟢 **On Track** - No `planned_end_date` OR `planned_end_date` is in the future
- 🟡 **Due Today** - `planned_end_date` equals today
- 🔴 **Overdue** - `planned_end_date` is before today (past)

---

### 3. Overdue Filter (SupportExceptionLog.tsx)

**Location:** `src/modules/DailyUpdateReport/components/SupportExceptionLog.tsx` (lines 806-812)

```typescript
const filteredRows = supportRows
  .filter(row => {
    if (overdueOnlyFilter) {
      const isOverdue = !row.actual_end_date && row.planned_end_date && row.planned_end_date <= todayStr
      if (!isOverdue) return false
    }
    // ... other filters
  })
```

**Filter Logic (when "Overdue Tasks" card is clicked):**
- Shows only rows where:
  - ✅ `actual_end_date` is empty/null (not completed)
  - ✅ `planned_end_date` exists
  - 🔴 `planned_end_date` is today or in the past (`<=`)

---

## Inconsistency Detected! ⚠️

### Problem:

There's a **mismatch** between the dashboard count and the row health indicator:

**Dashboard Count (index.tsx line 76):**
```typescript
return r.planned_end_date <= todayStr  // Includes TODAY
```
- Counts tasks due **today** as overdue

**Row Health Indicator (SupportExceptionLog.tsx line 59-63):**
```typescript
if (row.planned_end_date === todayStr) {
  return { icon: '🟡', label: 'Due Today' }  // Shows YELLOW
}
if (row.planned_end_date < todayStr) {
  return { icon: '🔴', label: 'Overdue' }    // Shows RED
}
```
- Tasks due **today** show **yellow** 🟡, not red 🔴
- Only shows red 🔴 for dates **before** today

**Overdue Filter (SupportExceptionLog.tsx line 809):**
```typescript
const isOverdue = !row.actual_end_date && row.planned_end_date && row.planned_end_date <= todayStr
```
- Filters tasks due **today** as overdue (matches dashboard count)

---

## Visual Example

### Scenario: Today is 2026-07-07

| Planned End Date | Actual End Date | Dashboard Count | Row Indicator | When Filter Clicked |
|------------------|-----------------|-----------------|---------------|---------------------|
| 2026-07-05 (past) | null | ✅ Counted | 🔴 Overdue | ✅ Shown |
| 2026-07-06 (yesterday) | null | ✅ Counted | 🔴 Overdue | ✅ Shown |
| **2026-07-07 (today)** | null | ✅ **Counted** | 🟡 **Due Today** | ✅ Shown |
| 2026-07-08 (tomorrow) | null | ❌ Not counted | 🟢 On Track | ❌ Hidden |
| 2026-07-05 | 2026-07-06 | ❌ Not counted | ✅ Completed | ❌ Hidden |
| null (no date) | null | ❌ Not counted | 🟢 On Track | ❌ Hidden |

**The Inconsistency:**
- Dashboard says: "5 Overdue Tasks" (including today)
- But rows show: 2 red 🔴, 2 yellow 🟡, 1 green 🟢
- User expects: 5 red rows (to match the count)

---

## Recommended Fix

### Option 1: Count "Due Today" as Overdue (Current Behavior)

Change the row indicator to show red for today:

```typescript
const getRowHealth = (row: SupportLogRecord) => {
  if (row.actual_end_date) {
    return { icon: '✅', label: 'Completed' }
  }
  if (!row.planned_end_date) {
    return { icon: '🟢', label: 'On Track' }
  }
  // Changed: Now shows red for today too
  if (row.planned_end_date <= todayStr) {
    const daysOverdue = getDaysOverdueText(row.planned_end_date)
    return { icon: '🔴', label: daysOverdue || 'Due Today' }
  }
  return { icon: '🟢', label: 'On Track' }
}
```

**Pros:**
- Matches dashboard count
- More urgent: tasks due today need attention NOW
- Simpler logic (no special case for today)

**Cons:**
- Less nuanced (no distinction between "due today" and "already late")

---

### Option 2: Don't Count "Due Today" as Overdue

Change dashboard and filter to exclude today:

```typescript
// In index.tsx
const overdueTasksCount = supportRows.filter(r => {
  if (r.actual_end_date) return false
  if (!r.planned_end_date) return false
  return r.planned_end_date < todayStr  // Changed: < instead of <=
}).length

// In SupportExceptionLog.tsx filter
if (overdueOnlyFilter) {
  const isOverdue = !row.actual_end_date && row.planned_end_date && row.planned_end_date < todayStr  // Changed
  if (!isOverdue) return false
}
```

**Pros:**
- More nuanced: "due today" vs "overdue"
- Gives users grace period for today's tasks
- Matches row indicator colors

**Cons:**
- "Overdue" card doesn't show tasks due today (might miss urgent tasks)

---

### Option 3: Separate "Due Today" Count (Best UX)

Add a separate card for "Due Today":

```typescript
const dueTodayCount = supportRows.filter(r => {
  if (r.actual_end_date) return false
  return r.planned_end_date === todayStr
}).length

const overdueTasksCount = supportRows.filter(r => {
  if (r.actual_end_date) return false
  if (!r.planned_end_date) return false
  return r.planned_end_date < todayStr  // Strictly past
}).length
```

Dashboard cards:
- 🔴 **Overdue** (strictly past dates)
- 🟡 **Due Today** (clickable filter)
- 🟢 **Upcoming** (future dates)

**Pros:**
- Most accurate
- Clear distinction
- Best UX

**Cons:**
- Requires UI changes (add new card)

---

## Days Overdue Calculation

**Location:** `src/modules/DailyUpdateReport/components/SupportExceptionLog.tsx` (lines 69-80)

```typescript
const getDaysOverdueText = (plannedDateStr: string) => {
  if (!plannedDateStr) return ''
  const t = new Date(todayStr).getTime()
  const p = new Date(plannedDateStr).getTime()
  const diffTime = t - p
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return ''        // Future date
  if (diffDays === 0) return 'Today' // Due today
  if (diffDays === 1) return '1 day overdue'
  return `${diffDays} days overdue`
}
```

**Examples:**
- Planned: 2026-07-05, Today: 2026-07-07 → "2 days overdue"
- Planned: 2026-07-06, Today: 2026-07-07 → "1 day overdue"
- Planned: 2026-07-07, Today: 2026-07-07 → "Today"
- Planned: 2026-07-08, Today: 2026-07-07 → "" (empty)

**Note:** Uses `Math.ceil()` which rounds up, so even 0.1 days counts as 1 day.

---

## Current Business Logic Summary

### What Makes a Task "Overdue"?

✅ **YES - Task is Overdue if:**
1. `actual_end_date` is empty/null (not completed yet)
2. `planned_end_date` exists (has a deadline)
3. `planned_end_date <= today` (deadline is today or past)

❌ **NO - Task is NOT Overdue if:**
1. `actual_end_date` exists (completed - doesn't matter when)
2. `planned_end_date` is empty/null (no deadline set)
3. `planned_end_date > today` (deadline in future)

---

## Edge Cases

### 1. Completed Task, But Late
```typescript
{
  planned_end_date: '2026-07-05',
  actual_end_date: '2026-07-10',  // Finished late
}
```
**Result:** ✅ Shows as "Completed" (green checkmark)
**Note:** Doesn't track if completion was late

### 2. No Planned Date
```typescript
{
  planned_end_date: null,
  actual_end_date: null
}
```
**Result:** 🟢 Shows as "On Track"
**Note:** Can't be overdue without a deadline

### 3. Due Today, Not Started
```typescript
{
  planned_end_date: '2026-07-07',  // Today
  actual_start_date: null,
  actual_end_date: null
}
```
**Dashboard:** ✅ Counts as overdue
**Row Indicator:** 🟡 Shows "Due Today" (yellow)
**Inconsistency!**

### 4. Completed Early
```typescript
{
  planned_end_date: '2026-07-10',  // Future
  actual_end_date: '2026-07-07'    // Today (early!)
}
```
**Result:** ✅ Shows as "Completed"
**Note:** Doesn't distinguish early vs late completion

---

## Recommendation

**I recommend Option 1** (simplest fix):

Change `getRowHealth()` to show red 🔴 for tasks due today:

```typescript
if (row.planned_end_date <= todayStr) {
  const daysText = getDaysOverdueText(row.planned_end_date)
  return { icon: '🔴', label: daysText || 'Due Today' }
}
```

**Why:**
- Matches existing dashboard count
- Treats "due today" urgently (needs attention now)
- Single line change
- No UI changes needed
- Consistent everywhere

**Alternative:** If you want to keep "Due Today" separate, implement Option 3 (but requires adding a new dashboard card).

---

## Implementation

Would you like me to:
1. ✅ Fix the inconsistency (make "due today" show red)?
2. ✅ Keep "due today" yellow but change dashboard count?
3. ✅ Add separate "Due Today" card?
4. ✅ Keep current behavior (inconsistent but functional)?

Let me know which approach you prefer!
