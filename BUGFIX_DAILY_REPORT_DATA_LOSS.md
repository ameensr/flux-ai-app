# Bug Fix: Data Loss on Navigation After File Import

## Issue Description

**Problem:** When importing a file on the `/daily-report` page that contains validation warnings (e.g., unconfigured names), navigating to the configuration page to add the missing configuration and then returning to `/daily-report` would result in the loss of all imported file data.

**Affected Components:**
- Support & Exception Log
- Release Testing Status

## Root Cause Analysis

### The Problem Flow:

1. User imports a CSV/Excel file on `/daily-report` page
2. The imported data is added to Zustand store via `setSupportRows([...supportRows, ...imported])` or `setReleaseRows([...releaseRows, ...imported])`
3. This triggers:
   - ✅ Immediate localStorage save
   - ✅ Zustand store state update
   - ⚠️ **Debounced** database sync (3-second delay)
4. User sees validation warnings (e.g., "QA 'John Doe' is not configured")
5. User **immediately navigates** to `/daily-report/configuration` (within 3 seconds)
6. At this point:
   - ✅ Data is in localStorage
   - ✅ Data is in Zustand store memory
   - ❌ Data is **NOT YET** in the database (debounce timeout hasn't fired)
7. User adds the missing configuration and returns to `/daily-report`
8. The page remounts and calls `fetchReportRows()` which:
   - Fetches data from the database (which doesn't have the imported data)
   - **Overwrites** localStorage and Zustand store with database data
   - **Result: Imported data is lost!**

### Technical Details:

The store had two issues:

**Issue 1: Debounced Database Sync**
```typescript
// Before fix - uses 3-second debounce
setSupportRows: async (rows, forceSync = false) => {
  set({ supportRows: rows, syncStatus: 'saving' })
  localStorage.setItem('flux-daily-support-rows', JSON.stringify(rows))
  
  if (forceSync) {
    await get().syncRowsToDatabase()
  } else {
    // Debounced save - data not in DB immediately!
    if (syncTimeout) clearTimeout(syncTimeout)
    syncTimeout = setTimeout(() => {
      get().syncRowsToDatabase()
    }, 3000)
  }
}
```

**Issue 2: Aggressive Database Overwrite**
```typescript
// Before fix - always overwrites with DB data
fetchReportRows: async () => {
  // ... query database ...
  
  // This overwrites localStorage even if there are unsaved changes!
  if (!supportRes.error && supportRes.data && supportRes.data.length > 0) {
    set({ supportRows: supportRes.data as SupportLogRecord[] })
    localStorage.setItem('flux-daily-support-rows', JSON.stringify(supportRes.data))
  }
}
```

## Solution Implemented

### Fix 1: Force Immediate Sync on Import

Changed all file import handlers to use `forceSync = true` parameter:

**SupportExceptionLog.tsx:**
```typescript
// After fix - forces immediate database sync
setSupportRows([...supportRows, ...imported], true)
```

**ReleaseTestingStatus.tsx:**
```typescript
// After fix - forces immediate database sync
setReleaseRows([...releaseRows, ...imported], true)
```

This ensures imported data is immediately written to the database, not just localStorage.

### Fix 2: Protect Against Overwriting Unsaved Changes

Updated `fetchReportRows()` to check for unsaved changes before overwriting:

**store.ts:**
```typescript
fetchReportRows: async () => {
  // ... load from localStorage first ...
  
  // Check if there are unsaved changes
  const currentSyncStatus = get().syncStatus
  const hasUnsavedChanges = currentSyncStatus === 'saving' || currentSyncStatus === 'local'
  
  // ... query database ...
  
  // Only update from database if there are NO unsaved changes
  if (!hasUnsavedChanges) {
    // Safe to overwrite with database data
    set({ supportRows: supportRes.data as SupportLogRecord[] })
    localStorage.setItem('flux-daily-support-rows', JSON.stringify(supportRes.data))
  } else {
    console.log('[DailyReportStore] Skipping database overwrite - unsaved changes detected')
  }
}
```

## Files Modified

1. **src/modules/DailyUpdateReport/components/SupportExceptionLog.tsx**
   - Added `forceSync = true` to both CSV and Excel import handlers
   - Lines affected: ~503, ~626

2. **src/modules/DailyUpdateReport/components/ReleaseTestingStatus.tsx**
   - Added `forceSync = true` to both CSV and Excel import handlers
   - Lines affected: ~432, ~543

3. **src/modules/DailyUpdateReport/store.ts**
   - Added unsaved changes detection in `fetchReportRows()`
   - Prevents database data from overwriting unsaved local changes
   - Lines affected: ~262-343

## Testing Steps

### Test Case 1: Import with Validation Warnings
1. Go to `/daily-report` page
2. Import a CSV/Excel file with a name not in configuration (e.g., QA name "New User")
3. Verify warning appears: "Import completed with warnings..."
4. Immediately navigate to `/daily-report/configuration`
5. Add the missing configuration ("New User" to QA list)
6. Navigate back to `/daily-report`
7. **Expected Result:** All imported rows should still be visible with data intact

### Test Case 2: Import Without Warnings
1. Go to `/daily-report` page
2. Import a CSV/Excel file with all valid data
3. Navigate to `/daily-report/configuration`
4. Make any configuration change
5. Navigate back to `/daily-report`
6. **Expected Result:** All imported rows should still be visible

### Test Case 3: Release Testing Status
1. Repeat Test Case 1 & 2 for the "Release Testing Status" tab
2. **Expected Result:** Same behavior - no data loss

### Test Case 4: Multiple Rapid Navigations
1. Import file with warnings
2. Rapidly navigate: `/daily-report` → `/configuration` → `/daily-report` → `/configuration` → `/daily-report`
3. **Expected Result:** Data should persist through all navigations

## Verification Checklist

- [x] Fixed Support & Exception Log component (CSV import)
- [x] Fixed Support & Exception Log component (Excel import)
- [x] Fixed Release Testing Status component (CSV import)
- [x] Fixed Release Testing Status component (Excel import)
- [x] Updated store to prevent overwriting unsaved changes
- [x] Added console logging for debugging
- [x] Verified no other components have similar import patterns
- [x] Audited other Zustand stores (QAWeeklyReport, Announcements) - no similar issues found
- [ ] Manual testing performed
- [ ] Edge cases tested

## Edge Cases Handled

1. **Fast Navigation:** User navigates before debounce timer fires → Fixed by forcing immediate sync
2. **Network Latency:** Slow database write → Protected by unsaved changes check
3. **Multiple Imports:** User imports multiple files rapidly → Each triggers immediate sync
4. **Concurrent Edits:** User edits data while sync is in progress → SyncStatus properly tracked

## Additional Notes

- The fix maintains backward compatibility with existing functionality
- No breaking changes to the API or component interfaces
- Performance impact is minimal (one additional database write per import)
- The `syncStatus` state already existed and is now properly utilized

## Related Issues

This same pattern could potentially affect other pages that:
1. Use file imports with validation
2. Store data in Zustand + localStorage + database
3. Allow navigation before debounced saves complete

**Recommendation:** Audit other modules for similar patterns.
