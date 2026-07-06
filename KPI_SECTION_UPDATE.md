# KPI Section Update - Report Preview Dashboard

## Overview
Updated the Key Performance Indicators (KPIs) section in the `/report-preview` page to prioritize data from **Release Bug Status**, **Release Testing Status**, and **Support & Exception Log**. The manual **Defects Analysis** section is now conditional and only displays when manual data is entered.

## Changes Made

### 1. Updated KPI Cards Section

**Previous KPIs (Old):**
- Support Emails
- New Features
- Code Fixes
- Defects Reported (from manual entry)
- Defects Closed (from manual entry)
- Open Defects (from manual entry)
- Team Size
- Backend Updates
- Change Requests
- QA Health Score

**New KPIs (Updated):**

#### From Release Bug Status (if available):
1. **Total Bugs** - Release bug count
2. **Active Bugs** - Currently active bugs (with pulse if > 5)
3. **Completed Bugs** - Bugs verified and closed
4. **Bug Closure Rate** - Bug resolution efficiency percentage

#### From Release Testing Status:
5. **Tests Passed** - Release tests passed
6. **Tests Failed** - Release tests failed (with pulse if > 3)
7. **Tests Blocked** - Release tests blocked
8. **Pass Rate** - Test success percentage

#### From Support & Exception Log:
9. **Support Tickets** - Total support tickets
10. **Critical Tickets** - Critical priority tickets (with pulse if > 3)
11. **High Priority** - High priority tickets
12. **Resolved Tickets** - Resolved/closed tickets

#### Additional Metrics:
13. **Team Size** - Active QA team members (internal view only)
14. **QA Health Score** - Executive quality index

### 2. Conditional Defects Analysis Section

**Before:**
- Always displayed regardless of data

**After:**
- Only displays if manual defect data is entered:
  - Checks if `defectsLastWeek` has any non-zero values
  - Checks if `defectsMTD` has any non-zero values
  - If no data exists, section is hidden entirely
- Works with toggle on/off via `vis.show_defectAnalysis`

**New Features Added:**
- **"Manual Entry" badge** - Indicates this is manual data
- **Informational note** at bottom explaining:
  - This section is for manually entered defect data
  - Suggests using Release Bug Status for automated tracking

### 3. Visual Enhancements

**Pulse Indicators:**
- Active Bugs (if > 5)
- Tests Failed (if > 3)
- Critical Tickets (if > 3)

**Sparkline Charts:**
- All KPI cards show historical trend lines
- Data pulled from saved report history

**Color Coding:**
- Blue: Informational metrics (Total Bugs, Support Tickets)
- Green: Positive metrics (Completed, Passed, Resolved)
- Red: Critical issues (Active Bugs, Failed Tests, Critical Tickets)
- Orange: Warning metrics (Blocked Tests, High Priority)
- Gold: Percentage metrics (Closure Rate, Pass Rate)
- Purple: Overall health (QA Health Score)

## Technical Implementation

### KPI Calculation Logic
```typescript
// Calculate from Release Bug Status
const releaseBugMetrics = data.releaseBugStatus?.metrics

// Calculate from Release Testing Status
const releaseTestingPassed = data.releaseItems?.filter(i => i?.status === 'Pass').length || 0
const releaseTestingFailed = data.releaseItems?.filter(i => i?.status === 'Fail').length || 0
const releaseTestingBlocked = data.releaseItems?.filter(i => i?.status === 'Blocked').length || 0
const releaseTestingTotal = data.releaseItems?.length || 0

// Calculate from Support & Exception Log
const supportTicketsTotal = data.supportTickets?.length || 0
const supportCritical = data.supportTickets?.filter(t => t?.priority === 'Critical').length || 0
const supportHigh = data.supportTickets?.filter(t => t?.priority === 'High').length || 0
const supportResolved = data.supportTickets?.filter(t => t?.status === 'Resolved' || t?.status === 'Closed').length || 0
```

### Conditional Defects Section Logic
```typescript
{vis.show_defectAnalysis !== false && (() => {
  // Check if any manual defect data has been entered
  const hasLastWeekData = data.defectsLastWeek.reported > 0 || 
                          data.defectsLastWeek.open > 0 || 
                          data.defectsLastWeek.fixed > 0 || 
                          data.defectsLastWeek.closed > 0
  const hasMTDData = data.defectsMTD.reported > 0 || 
                     data.defectsMTD.open > 0 || 
                     data.defectsMTD.fixed > 0 || 
                     data.defectsMTD.closed > 0
  
  return hasLastWeekData || hasMTDData
})() && (
  // Render Defects Analysis section...
)}
```

## User Experience

### KPI Section Behavior

1. **With Release Bug Status Data:**
   - Shows 4 bug-related KPIs at the top
   - Displays all release testing metrics
   - Shows support ticket metrics
   - Total of ~14 KPI cards

2. **Without Release Bug Status Data:**
   - Skips bug-related KPIs
   - Still shows release testing metrics
   - Still shows support ticket metrics
   - Total of ~10 KPI cards

3. **Client Mode:**
   - Hides internal metrics (Team Size)
   - Shows only customer-facing metrics

### Defects Analysis Section Behavior

1. **No Manual Data Entered:**
   - Section is completely hidden
   - No empty state shown
   - Navigation menu updated accordingly

2. **Manual Data Entered:**
   - Section displays normally
   - Shows "Manual Entry" badge
   - Displays Last Week and MTD cards
   - Shows informational note about automated alternative

3. **Toggle Off:**
   - Section hidden via `vis.show_defectAnalysis = false`
   - Works with dashboard section toggles

## Benefits

### Data Source Priority
✅ **Primary Sources:** Release Bug Status, Release Testing, Support Log
✅ **Secondary Source:** Manual defect entry (optional)
✅ **Cleaner Dashboard:** No empty defect cards if not using manual entry

### Improved User Experience
✅ **Relevant Metrics:** KPIs reflect actual tracked data
✅ **Conditional Display:** Only shows what's relevant
✅ **Clear Labeling:** "Manual Entry" badge prevents confusion
✅ **Pulse Indicators:** Highlights critical issues requiring attention

### Better Data Integrity
✅ **Automated First:** Prioritizes uploaded/tracked data
✅ **Manual Fallback:** Still supports manual entry when needed
✅ **No Duplication:** Separates automated vs manual defect tracking

## Migration Notes

**For Users Currently Using Manual Defect Entry:**
- Section will continue to display as before
- Badge added to indicate it's manual data
- Note suggests migrating to Release Bug Status for automation

**For Users Using Release Bug Status:**
- Will see new bug-related KPIs in main section
- Manual defect section won't appear (unless they also enter manual data)
- More comprehensive metrics from uploaded bug reports

## Testing Checklist

- [ ] KPIs display correctly with Release Bug Status data
- [ ] KPIs display correctly without Release Bug Status data
- [ ] Release Testing metrics show correct values
- [ ] Support ticket metrics show correct values
- [ ] Pulse indicators appear for high values
- [ ] Sparklines show historical trends
- [ ] Defects Analysis section hidden when no manual data
- [ ] Defects Analysis section shown when manual data entered
- [ ] "Manual Entry" badge displays correctly
- [ ] Toggle `show_defectAnalysis` works correctly
- [ ] Client mode filters internal metrics
- [ ] Historical data calculations work correctly

## Files Modified

- `src/modules/QAWeeklyReport/components/ReportPreviewDashboard.tsx`
  - Updated KPI calculation logic (line ~1712)
  - Made Defects Analysis section conditional (line ~2128)
  - Added informational note for manual entry section

## Dependencies

- Existing Release Bug Status feature
- Existing Release Testing Status feature
- Existing Support & Exception Log feature
- Dashboard section toggle system
