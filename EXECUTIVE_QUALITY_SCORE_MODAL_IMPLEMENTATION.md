# Executive Quality Score Modal Implementation

## Overview
Added a 3D interactive modal for the **Executive Quality Score** in the `/report-preview` page that explains why the score was calculated and displays the calculation formula at the bottom.

## Changes Made

### 1. New Component Created
**File:** `src/modules/QAWeeklyReport/components/ExecutiveQualityScoreModal.tsx`

A sophisticated 3D modal component that:
- Displays the overall quality score with visual gauge
- Shows detailed breakdown of all 7 scoring components
- Includes individual component scores with weight percentages
- Features progress bars for each component
- Shows the exact calculation formula at the bottom
- Displays score ranges reference (Excellent, Good, Fair, Needs Attention)

### 2. Updated ReportPreviewDashboard Component
**File:** `src/modules/QAWeeklyReport/components/ReportPreviewDashboard.tsx`

**Changes:**
- Added import for `ExecutiveQualityScoreModal`
- Added state: `showQualityScoreModal`
- Made the Executive Quality Score gauge clickable with hover effects
- Added click indicator badge that appears on hover
- Integrated the modal at the end of the component

## Features

### Visual Enhancements
- **3D Card Animation**: Modal enters with spring animation and 3D rotation effect
- **Hover Effects**: Quality score gauge shows glow effect and click indicator on hover
- **Gradient Backgrounds**: Animated gradient overlays with pulsing glow effects
- **Responsive Design**: Adapts to mobile and desktop screens

### Score Components Displayed
1. **Release Pass Rate** (Weight: 35%)
   - Shows pass/fail ratio for releases
   - Icon: CheckCircle, Color: Green

2. **Failed Release Penalty** (Weight: 15%)
   - Penalizes failed releases
   - Icon: AlertTriangle, Color: Red

3. **Defect Closure Rate** (Weight: 20%)
   - Shows closed vs reported defects
   - Icon: Target, Color: Gold

4. **Open Defects Penalty** (Weight: 15%)
   - Penalizes open defects (10 points per defect)
   - Icon: Shield, Color: Orange

5. **Escaped Defects Penalty** (Weight: 20%)
   - Critical penalty for production defects (15 points per defect)
   - Icon: AlertTriangle, Color: Red

6. **Critical Support Penalty** (Weight: 15%)
   - Penalizes critical (25 points) and high priority (10 points) tickets
   - Icon: Zap, Color: Purple

7. **Automation Coverage** (Weight: 10%)
   - Percentage of team on automation
   - Icon: Users, Color: Blue

### Calculation Formula Display
At the bottom of the modal, a small text section shows:
```
Score = Σ (Component Value × Component Weight) / Total Weight

• Release Pass Rate: 95 × 35% = 33.25
• Failed Release Penalty: 100 × 15% = 15
• Defect Closure Rate: 80 × 20% = 16
• Open Defects Penalty: 70 × 15% = 10.5
• Escaped Defects Penalty: 85 × 20% = 17
• Critical Support Penalty: 75 × 15% = 11.25
• Automation Coverage: 30 × 10% = 3

Final Score: 87 (Good)
```

### Score Ranges Reference
A grid showing the four quality tiers:
- **Excellent**: 90-100 (Green)
- **Good**: 75-89 (Gold)
- **Fair**: 60-74 (Orange)
- **Needs Attention**: 0-59 (Red)

## User Experience

1. **Discovery**: User sees the Executive Quality Score gauge on the report preview dashboard
2. **Hover**: Hovering shows a glow effect and "Click to Expand" indicator
3. **Click**: Opens the 3D modal with detailed breakdown
4. **Explore**: User can review each component's contribution to the score
5. **Understand**: Bottom section shows exact calculation formula
6. **Reference**: Score ranges help understand what each tier means
7. **Close**: Click X button or backdrop to close modal

## Technical Details

### Props
```typescript
interface ExecutiveQualityScoreModalProps {
  isOpen: boolean
  onClose: () => void
  data: QAReportForm
  score: number
  label: 'Excellent' | 'Good' | 'Fair' | 'Needs Attention'
  color: string
}
```

### Styling
- Uses Framer Motion for smooth animations
- Backdrop blur effect for modal overlay
- Gradient backgrounds with animated glow effects
- Dark/light theme aware (uses CSS variables)
- Responsive grid layouts

### Animations
- Modal entrance: 3D rotation with spring physics
- Component cards: Staggered fade-in from left
- Progress bars: Animated fill with delay
- Hover effects: Scale and glow transitions

## Testing

To test the implementation:
1. Navigate to `/report-preview` page
2. Locate the **Executive Quality Score** gauge in the hero section (right side)
3. Hover over the gauge to see the glow effect and click indicator
4. Click the gauge to open the modal
5. Verify all 7 components are displayed with correct values
6. Scroll down to see the calculation formula
7. Check the score ranges reference at the bottom
8. Close the modal by clicking X or the backdrop

## Dependencies
- `framer-motion`: For animations
- `lucide-react`: For icons
- Existing QA Report types and utilities

## Notes
- The modal only shows components that are active (have data)
- The calculation matches the existing `qualityCalculator.ts` logic
- All text is small and compact as requested
- The calculation formula is displayed at the bottom in monospace font
