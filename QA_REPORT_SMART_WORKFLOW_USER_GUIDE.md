# QA Report Smart Workflow - User Guide

## 🎯 Quick Overview

The QA Report now has **intelligent save detection** that lets you launch the Executive Dashboard without unnecessary re-saves!

## ✨ Key Features

### 1. **Smart Save Detection**
- System automatically checks if your report already exists in History
- If found → Launch button is **automatically enabled**
- No need to re-save unless you make changes!

### 2. **Display Toggles Don't Require Saving**
You can toggle these settings **without needing to re-save**:
- ✓ Show AI Insights
- ✓ Show AI Summary
- ✓ Show Historical Analytics
- ✓ Show Timeline
- ✓ Dashboard Display Sections

These are **display preferences**, not report data!

### 3. **Change Detection**
- Make actual data changes? System detects it!
- Launch button disables until you preview & save
- Clear visual feedback with lock icon

## 📋 How to Use

### For New Reports
```
1. Fill in your QA data
2. Click "Preview" button
3. Review in modal → Click "Save Report"
4. Close modal
5. Click "Launch Executive Dashboard" ✓
```

### For Existing Reports (Already in History)
```
1. Your form matches a saved report
2. Launch button is already enabled! ✓
3. Click "Launch Executive Dashboard" directly
4. No preview/save needed!
```

### Modifying a Saved Report
```
1. Change any data field
2. Launch button disables (lock icon shows)
3. Click "Preview" → Review → "Save Report"
4. Launch button re-enables ✓
```

### Just Toggling Display Settings
```
1. Toggle any display setting on/off
2. Launch button stays enabled! ✓
3. Launch directly - no save needed!
```

## 🔍 Visual Indicators

### Launch Button States

| State | Icon | Color | Meaning |
|-------|------|-------|---------|
| **Enabled** | 📄 File | Gold | Ready to launch! |
| **Disabled** | 🔒 Lock | Gray | Need to save first |
| **Launching** | ⏳ Spinner | Gold | Opening dashboard... |

### Workflow Guide Status

| Indicator | Meaning |
|-----------|---------|
| **✓ Ready to Launch** (green) | Report saved, can launch |
| **Smart Workflow** heading | Intelligent detection active |

## 💡 Pro Tips

1. **Check History First**: If you're working on a familiar report, check if it's already in History before saving again

2. **Toggle Freely**: Experiment with display settings without worrying about re-saving

3. **Visual Confirmation**: When Launch button is enabled (gold), you're good to go!

4. **Hover Tooltip**: Hover over disabled Launch button for guidance

5. **Smart Info Box**: Check the blue info box in the right panel for smart save details

## ❓ FAQ

### Q: Why is my Launch button already enabled?
**A:** Your current form matches a report already saved in History! You can launch directly.

### Q: I toggled a display setting - do I need to save?
**A:** No! Display settings don't affect the report data. Launch button stays enabled.

### Q: I changed a number field - now Launch is disabled?
**A:** Yes, actual data changes require a new save. Preview and save to re-enable.

### Q: How do I know if my report is in History?
**A:** If the Launch button is enabled (gold color, file icon), you're all set!

### Q: What counts as a "change" that requires saving?
**A:** Any change to actual report data:
- KPI values (emails, features, fixes)
- Defect numbers
- Support tickets
- Release items
- Team allocations
- Dates or text fields

**But NOT display toggles** - those are just preferences!

## 🎨 Workflow Visualization

```
┌─────────────────────────────────────────┐
│  Fill Form Data                         │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  System Checks History                  │
│  • Match found? → Enable Launch ✓       │
│  • No match? → Show lock icon           │
└───────────────┬─────────────────────────┘
                │
        ┌───────┴────────┐
        │                │
    Match Found      No Match
        │                │
        ▼                ▼
┌──────────────┐  ┌──────────────┐
│ Launch Now!  │  │ Preview &    │
│      ✓       │  │ Save First   │
└──────────────┘  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │ Launch Now!  │
                  │      ✓       │
                  └──────────────┘
```

## 🛠️ Troubleshooting

### Launch button won't enable after saving?
- Ensure save was successful (check for success message)
- Check that preview modal closed properly
- Look for "✓ Ready to Launch" indicator

### Can't save in preview modal?
- Check for validation errors in form
- Ensure project is selected
- Verify date range is valid

### Changes not being detected?
- Make sure you're changing actual data fields
- Display toggle changes don't disable the button (by design!)

## 📞 Need Help?

If you encounter issues:
1. Check the validation errors list (red boxes)
2. Review the workflow guide in the right panel
3. Check console for any error messages
4. Try the Reset button to start fresh

---

**Remember**: The system is designed to be smart and save you time. If the Launch button is enabled, you're ready to go! 🚀
