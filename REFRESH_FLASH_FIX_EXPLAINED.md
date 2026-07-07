# Refresh Flash Issue - Visual Explanation

## The Problem: Flash on Refresh ⚡

### BEFORE FIX - What Was Happening:

```
User clicks "Refresh" button while viewing Project B (empty)
              ↓
┌─────────────────────────────────────────────────────────┐
│ Step 1: Load localStorage IMMEDIATELY                   │
│ - localStorage has data from Project A (old session)    │
│ - No project filter applied                             │
│ - UI shows: [Row 1, Row 2, Row 3] ← FLASH! ⚡          │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: Query database (300-500ms later)                │
│ - Query filters by Project B                            │
│ - Database returns: [] (empty - no data for Project B)  │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ Step 3: Update UI with database results                 │
│ - UI shows: [] (empty)                                  │
│ - Previous rows VANISH! 💨                              │
└─────────────────────────────────────────────────────────┘

RESULT: User sees rows appear for ~300-500ms then disappear
```

### Timeline Diagram:

```
Time:    0ms              200ms             400ms
         |                 |                 |
UI:   [Empty]  →  [Row1,Row2,Row3]  →     [Empty]
                        ⚡ FLASH           💨 VANISH
         ↑                 ↑                 ↑
    Click Refresh    localStorage       Database
                       loaded            cleared it
```

## The Fix: Smart localStorage Loading

### AFTER FIX - What Happens Now:

```
User clicks "Refresh" button while viewing Project B (empty)
              ↓
┌─────────────────────────────────────────────────────────┐
│ Step 1: Check syncStatus FIRST                          │
│ - syncStatus === 'synced' (no unsaved changes)          │
│ - SKIP loading localStorage (prevents flash!)           │
│ - UI shows: [] (empty) with loading spinner             │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: Query database (300-500ms later)                │
│ - Query filters by Project B                            │
│ - Database returns: [] (empty - no data for Project B)  │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ Step 3: Update UI with database results                 │
│ - UI shows: [] (empty)                                  │
│ - No flash, smooth experience ✅                        │
└─────────────────────────────────────────────────────────┘

RESULT: Clean loading experience, no visual artifacts
```

### Timeline Diagram:

```
Time:    0ms              200ms             400ms
         |                 |                 |
UI:   [Empty]  →  [Loading spinner...]  →   [Empty]
                    or [DB data if exists]
         ↑                                     ↑
    Click Refresh                        Database
                                        smoothly loads
    
    ✅ No flash, no visual artifacts
```

## Exception: When Unsaved Changes Exist

```
User imports data, then clicks "Refresh" before sync completes
              ↓
┌─────────────────────────────────────────────────────────┐
│ Step 1: Check syncStatus FIRST                          │
│ - syncStatus === 'saving' (HAS unsaved changes!)        │
│ - LOAD localStorage (preserve user's work)              │
│ - UI shows: [Imported Row 1, Row 2, Row 3] ✅          │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ Step 2: Query database                                  │
│ - Database might not have latest imports yet            │
│ - Returns: [] or older data                             │
└─────────────────────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────────────────────┐
│ Step 3: SKIP database overwrite                         │
│ - Detects unsaved changes                               │
│ - KEEPS localStorage data (protects user's work) 🛡️    │
│ - UI shows: [Imported Row 1, Row 2, Row 3] ✅          │
└─────────────────────────────────────────────────────────┘

RESULT: User's imported data is PROTECTED, not lost
```

## Code Changes

### Before:
```typescript
fetchReportRows: async () => {
  // PROBLEM: Always loaded localStorage first
  const localSupport = localStorage.getItem('flux-daily-support-rows')
  if (localSupport) set({ supportRows: JSON.parse(localSupport) })
  
  // ... query database ...
  
  // Then overwrote with database results
  if (!supportRes.error) {
    set({ supportRows: supportRes.data || [] })
  }
}
```

### After:
```typescript
fetchReportRows: async () => {
  const currentSyncStatus = get().syncStatus
  const hasUnsavedChanges = currentSyncStatus === 'saving' || currentSyncStatus === 'local'
  
  // FIXED: Only load localStorage if there are unsaved changes
  if (hasUnsavedChanges) {
    const localSupport = localStorage.getItem('flux-daily-support-rows')
    if (localSupport) set({ supportRows: JSON.parse(localSupport) })
  }
  
  // ... query database ...
  
  // FIXED: Only overwrite if NO unsaved changes
  if (!hasUnsavedChanges) {
    if (!supportRes.error) {
      const dbRows = supportRes.data || []
      set({ supportRows: dbRows })
      localStorage.setItem('flux-daily-support-rows', JSON.stringify(dbRows))
    }
  }
}
```

## The Logic Flow

```
┌──────────────────────────────────────────┐
│ User Action: Click Refresh / Page Load  │
└────────────────┬─────────────────────────┘
                 ↓
         ┌───────────────┐
         │ Check Status  │
         └───────┬───────┘
                 ↓
        Are there unsaved changes?
         (syncStatus check)
                 ↓
        ┌────────┴────────┐
        │                 │
    YES │                 │ NO
        ↓                 ↓
┌────────────────┐  ┌────────────────┐
│ Load localStorage│  │ Skip localStorage│
│ (preserve work) │  │ (prevent flash) │
└────────┬────────┘  └────────┬────────┘
         │                    │
         └────────┬───────────┘
                  ↓
         ┌────────────────┐
         │ Query Database │
         └────────┬────────┘
                  ↓
        Are there unsaved changes?
                  ↓
        ┌────────┴────────┐
        │                 │
    YES │                 │ NO
        ↓                 ↓
┌────────────────┐  ┌────────────────┐
│ Keep localStorage│  │ Update with DB │
│ data (protect)  │  │ data (sync)    │
└─────────────────┘  └─────────────────┘
```

## Why This Works

**Project Filtering:**
- localStorage doesn't know about project filters
- Database queries DO filter by project
- Old code showed unfiltered localStorage first = wrong data = flash
- New code skips localStorage unless actively editing = correct data = no flash

**Unsaved Changes Protection:**
- When user imports/edits: `syncStatus = 'saving'`
- localStorage is loaded and protected
- Database can't overwrite until sync completes
- User's work is safe

**Clean Refresh:**
- When no changes: `syncStatus = 'synced'`
- Skip localStorage entirely
- Show loading state
- Database loads smoothly
- No visual artifacts

## Testing Scenarios

| Scenario | Old Behavior | New Behavior |
|----------|-------------|--------------|
| Refresh with empty project | ⚡ Flash of old data → vanish | ✅ Smooth load, no flash |
| Refresh with data | ⚡ Flash → replaced | ✅ Smooth load |
| Import then refresh | ❌ Data lost | ✅ Data preserved |
| Switch projects | ⚡ Flash wrong project data | ✅ Clean switch |
| Rapid refreshes | ⚡ Multiple flashes | ✅ Stable display |

## Edge Cases Handled

1. **Stale localStorage from different project** ✅
   - Not loaded unless actively editing
   
2. **Network latency** ✅
   - Shows loading state instead of stale data
   
3. **Mid-sync refresh** ✅
   - Protects unsaved changes
   
4. **Empty database results** ✅
   - No confusion with localStorage data
   
5. **Project switching** ✅
   - Each project has clean data load

## Summary

**Root Cause:** localStorage loaded before database, showing unfiltered/stale data

**The Fix:** Only load localStorage when there are active unsaved changes

**Result:** 
- ✅ No more flash of rows
- ✅ Smooth loading experience  
- ✅ Protected unsaved changes
- ✅ Correct project filtering
