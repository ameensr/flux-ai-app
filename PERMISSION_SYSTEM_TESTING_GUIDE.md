# Permission System Testing Guide

## Overview
This guide provides comprehensive test scenarios to verify the refactored Announcement Feature & Permission System. All tests should be performed after running migrations 026 and 027.

---

## Pre-Testing Setup

### 1. Apply Database Migrations
```bash
# Ensure all migrations are applied
npm run supabase:db:push
# Or manually apply:
# - 026_cleanup_module_permissions.sql
# - 027_announcements_admin_only.sql
```

### 2. Verify TypeScript Compilation
```bash
npx tsc --noEmit --skipLibCheck
# Should exit with code 0 (no errors)
```

### 3. Test User Accounts Needed
Create or identify test accounts with these roles:
- **Admin/Super Admin** - Full system access
- **Manager** (Enterprise role) - Configurable permissions
- **QA Lead** (Enterprise role) - Configurable permissions
- **Pro User** - Premium features
- **Free User** - Basic features

---

## Test Scenarios by Role

### 🔴 Test Group 1: Admin/Super Admin Role

#### Expected Behavior
- ✅ Sees all modules in sidebar
- ✅ Can access all routes
- ✅ All action buttons enabled
- ✅ Announcements appear as tab in Admin Panel
- ✅ Can create/edit/delete announcements
- ✅ Enterprise RBAC shows all permissions as granted (green checkmarks)

#### Test Steps

**1.1 Sidebar Navigation**
- [ ] Dashboard appears in sidebar
- [ ] Bug Refiner appears
- [ ] Test Generator appears
- [ ] Writing Assistant appears
- [ ] QA Report appears
- [ ] Daily Report appears
- [ ] Settings appears
- [ ] Admin appears
- [ ] **Announcements does NOT appear as standalone** ✅

**1.2 Admin Panel - Announcements Tab**
- [ ] Navigate to Admin Panel (/admin)
- [ ] Verify "Announcements" tab is visible
- [ ] Click Announcements tab
- [ ] URL changes to /admin/announcements
- [ ] Can see all announcements (including drafts)
- [ ] "New Announcement" button is visible and enabled
- [ ] Can create a new announcement
- [ ] Can edit any announcement (own or others')
- [ ] Can delete any announcement

**1.3 Dashboard - Announcements Widget**
- [ ] Navigate to Dashboard
- [ ] AnnouncementsWidget is visible
- [ ] Click "View All" or manage announcements link
- [ ] Redirects to /admin/announcements (not /announcements)

**1.4 Enterprise RBAC UI**
- [ ] Navigate to Admin > Enterprise > Roles
- [ ] Select Admin role
- [ ] Verify all module permission cards show:
   - **Dashboard**: 2 permissions (View ✅, Export ✅)
   - **Bug Refiner**: 8 permissions (all ✅)
   - **Test Generator**: 8 permissions (all ✅)
   - **Writing Assistant**: 7 permissions (View, Create, Edit, Delete, Export, Gen AI, Adv AI - no Share)
   - **QA Report**: 7 permissions (all ✅)
   - **Daily Report**: 6 permissions (all ✅)
   - **Settings**: 2 permissions (View ✅, Edit ✅)
   - **Admin**: 2 permissions (View ✅, Configure ✅)
   - **Announcements**: 5 permissions (View, Create, Edit, Delete, Configure - all ✅)
   - **History**: 3 permissions (View ✅, Delete ✅, Export ✅)
- [ ] All permissions show green checkmark (granted by default)
- [ ] Banner shows "Unrestricted Access" message

**1.5 Settings - Profile Editing**
- [ ] Navigate to Settings
- [ ] Profile card shows "Edit" button
- [ ] Can edit name and phone number
- [ ] Changes save successfully

---

### 🟡 Test Group 2: Pro User Role

#### Expected Behavior
- ✅ Sees most modules (minus Admin)
- ✅ Has AI features enabled
- ✅ Cannot share items
- ✅ Cannot access announcements management
- ✅ Can view published announcements on Dashboard

#### Test Steps

**2.1 Sidebar Navigation**
- [ ] Dashboard appears
- [ ] Bug Refiner appears
- [ ] Test Generator appears
- [ ] Writing Assistant appears
- [ ] QA Report appears
- [ ] Daily Report appears
- [ ] Settings appears
- [ ] **Admin does NOT appear** ✅
- [ ] **Announcements does NOT appear** ✅

**2.2 Module Access**
- [ ] Can access all non-admin modules
- [ ] AI generation buttons are enabled
- [ ] Advanced AI features work
- [ ] Export buttons are enabled
- [ ] **Share buttons are hidden or disabled** ✅

**2.3 Announcements Access**
- [ ] Navigate to Dashboard
- [ ] AnnouncementsWidget shows published announcements
- [ ] Click "View All" → should show "Not Authorized" or redirect to Dashboard
- [ ] Direct URL /admin/announcements → "Not Authorized"
- [ ] Direct URL /announcements → "Not Found" (route removed)
- [ ] Admin Panel is not accessible

**2.4 Settings - Profile Editing**
- [ ] Navigate to Settings
- [ ] Profile card shows "Edit" button
- [ ] Can edit name and phone

---

### 🟢 Test Group 3: Free User Role

#### Expected Behavior
- ✅ Limited module access
- ✅ Basic AI features only
- ✅ Cannot export
- ✅ Cannot share
- ✅ Cannot edit/delete in most modules
- ✅ Can view published announcements only

#### Test Steps

**3.1 Sidebar Navigation**
- [ ] Dashboard appears
- [ ] Bug Refiner appears (if view enabled)
- [ ] Test Generator appears (if view enabled)
- [ ] Writing Assistant appears (if view enabled)
- [ ] Settings appears
- [ ] **Admin does NOT appear** ✅
- [ ] **Premium modules may be locked** (Dashboard shows lock icon)

**3.2 Module Restrictions**
- [ ] Bug Refiner: Can view and create, but edit/delete disabled
- [ ] Test Generator: Can view and create, but edit/delete disabled
- [ ] Writing Assistant: Can view and create only
- [ ] Export buttons are hidden or disabled
- [ ] Advanced AI features are disabled
- [ ] Share functionality not available

**3.3 Announcements Access**
- [ ] Dashboard shows published announcements (read-only)
- [ ] Cannot access /admin/announcements
- [ ] Cannot manage announcements
- [ ] No "New Announcement" or "Edit" buttons

**3.4 Settings - Profile Editing**
- [ ] Navigate to Settings
- [ ] Profile card shows "Edit" button
- [ ] Can edit name and phone

---

### 🔵 Test Group 4: Enterprise Roles (Manager, QA Lead, etc.)

#### Expected Behavior
- ✅ Permissions fully customizable via Enterprise RBAC
- ✅ Can be granted announcements permissions
- ✅ Module access based on configured permissions

#### Test Steps

**4.1 Configure Manager Role with Announcements Access**
- [ ] Login as Admin
- [ ] Navigate to Admin > Enterprise > Roles
- [ ] Select "Manager" role
- [ ] Locate "Announcements" module card
- [ ] Should show 5 permissions: View, Create, Edit, Delete, Configure
- [ ] Enable "View" permission (toggle to checkmark)
- [ ] Enable "Create" permission
- [ ] Save changes (automatically saved on toggle)
- [ ] Verify success message

**4.2 Test Manager User Access**
- [ ] Login as Manager user
- [ ] Navigate to Admin Panel
- [ ] **Announcements tab should now be visible** ✅
- [ ] Click Announcements tab
- [ ] Can view announcements list
- [ ] "New Announcement" button is visible (canCreate enabled)
- [ ] Can create new announcements
- [ ] Cannot edit others' announcements (only canCreate, not canEdit)
- [ ] Cannot delete announcements (canDelete not enabled)

**4.3 Configure QA Lead with Limited Access**
- [ ] As Admin, navigate to Enterprise > Roles
- [ ] Select "QA Lead" role
- [ ] For Announcements module, enable only "View"
- [ ] Disable Create, Edit, Delete, Configure

**4.4 Test QA Lead User Access**
- [ ] Login as QA Lead
- [ ] Admin Panel shows Announcements tab (canView enabled)
- [ ] Click Announcements tab
- [ ] Can see announcements list (read-only)
- [ ] **"New Announcement" button is hidden** ✅
- [ ] No edit or delete buttons visible
- [ ] Announcements are view-only

**4.5 Test Permission Inheritance**
- [ ] Create a custom role "Senior QA" that inherits from "QA Lead"
- [ ] Verify inherited permissions appear in UI
- [ ] Override specific permissions
- [ ] Test that user with Senior QA role has correct combined permissions

---

## Test Scenarios by Module

### 📊 Dashboard Module

**Permissions**: View, Export

**Admin Test**
- [ ] Can view Dashboard
- [ ] Can export dashboard data (if feature exists)
- [ ] Module cards show all accessible modules
- [ ] Locked modules show lock icon for users without access

**Free User Test**
- [ ] Can view Dashboard
- [ ] Export button hidden (no export permission)
- [ ] Restricted modules show lock icon

---

### 🐛 Bug Refiner Module

**Permissions**: View, Create, Edit, Delete, Export, Gen AI, Adv AI, Share

**Admin Test**
- [ ] Can view bugs
- [ ] Can create new bugs
- [ ] Can edit any bug
- [ ] Can delete bugs
- [ ] Can export bug list
- [ ] AI generation buttons enabled
- [ ] Advanced AI features work
- [ ] Share button visible (if implemented)

**Pro User Test**
- [ ] Has all permissions except Share
- [ ] Share button hidden or disabled

**Free User Test**
- [ ] Can view and create only
- [ ] Edit/Delete buttons hidden or disabled
- [ ] Export hidden
- [ ] Basic AI only (no Advanced AI)

---

### 🧪 Test Generator Module

**Permissions**: Same as Bug Refiner (8 total)

**Test same scenarios as Bug Refiner**
- [ ] Admin: full access
- [ ] Pro: all except share
- [ ] Free: view + create + basic AI only

---

### ✍️ Writing Assistant Module

**Permissions**: View, Create, Edit, Delete, Export, Gen AI, Adv AI (no Share)

**Admin Test**
- [ ] Full CRUD access
- [ ] AI features enabled
- [ ] Export enabled
- [ ] **No Share button anywhere** ✅ (module doesn't support sharing)

**Pro User Test**
- [ ] Same permissions as Admin for this module
- [ ] All 7 permissions enabled

**Free User Test**
- [ ] View, Create, Gen AI only
- [ ] Edit/Delete/Export disabled

---

### 📝 QA Report Module

**Permissions**: View, Create, Edit, Delete, Export, Gen AI, Configure

**Admin Test**
- [ ] Can view reports
- [ ] Can create reports
- [ ] Can edit reports
- [ ] Can delete reports
- [ ] Can export reports
- [ ] AI generation works
- [ ] **Can access Configuration page** ✅
- [ ] Configuration settings are editable

**Pro User Test**
- [ ] All permissions enabled
- [ ] Can access /qa-report/configuration

**Free User Test**
- [ ] View, Create, Gen AI only
- [ ] Configuration link hidden or disabled

---

### 📅 Daily Report Module

**Permissions**: View, Create, Edit, Delete, Export, Configure (no AI)

**Admin Test**
- [ ] Full CRUD access
- [ ] Can export daily reports
- [ ] Can access Configuration page
- [ ] **No AI generation buttons** ✅ (module doesn't use AI)

**Pro User Test**
- [ ] All 6 permissions enabled

**Free User Test**
- [ ] View and Create only
- [ ] Export and Configure hidden

---

### ⚙️ Settings Module

**Permissions**: View, Edit

**All Users Test**
- [ ] All authenticated users can view Settings
- [ ] Profile editing requires Edit permission
- [ ] Users without Edit permission see lock icons on name/phone fields
- [ ] Theme switcher works for everyone (no permission required)
- [ ] Security settings visible to all

**Admin Test**
- [ ] Can edit profile (name, phone)
- [ ] Edit button visible

**Restricted User Test (hypothetical)**
- [ ] If Edit permission disabled, Edit button hidden
- [ ] Profile fields read-only
- [ ] Lock icons shown on name and phone labels

---

### 🛡️ Admin Module

**Permissions**: View, Configure

**Admin Test**
- [ ] Can access /admin
- [ ] Can access all admin sub-pages
- [ ] Can configure system settings

**Non-Admin Test**
- [ ] Admin menu item not in sidebar
- [ ] Direct URL /admin → "Not Authorized"
- [ ] Direct URL /admin/announcements → "Not Authorized" (unless canView('announcements'))

---

### 📢 Announcements Module

**Permissions**: View, Create, Edit, Delete, Configure

**Admin Test**
- [ ] Admin Panel shows Announcements tab
- [ ] Can view all announcements (including drafts)
- [ ] Can create new announcements
- [ ] Can edit any announcement
- [ ] Can delete any announcement
- [ ] Configure permission controls access to announcement settings

**Manager with View + Create Test**
- [ ] Announcements tab visible in Admin Panel
- [ ] Can view announcements
- [ ] "New Announcement" button visible
- [ ] Can create announcements
- [ ] Cannot edit others' announcements
- [ ] Cannot delete announcements
- [ ] Author can edit their own (RLS policy)

**QA Lead with View Only Test**
- [ ] Announcements tab visible
- [ ] Read-only access
- [ ] No action buttons (New, Edit, Delete all hidden)

**Non-Admin User without Permission Test**
- [ ] Admin Panel not accessible
- [ ] Direct URL /admin/announcements → "Not Authorized"
- [ ] Dashboard AnnouncementsWidget shows published announcements
- [ ] Widget is read-only
- [ ] Clicking "View All" shows "Not Authorized" or redirects

---

### 📜 History Module

**Permissions**: View, Delete, Export

**Admin Test**
- [ ] Can view history
- [ ] Can delete history entries
- [ ] Can export history

**Pro User Test**
- [ ] All 3 permissions enabled

**Free User Test**
- [ ] View only (if enabled)
- [ ] Delete and Export hidden

---

## Enterprise RBAC UI Testing

### Dynamic Permission Rendering

**Test 1: Verify Only Relevant Permissions Show**
- [ ] Navigate to Enterprise > Roles
- [ ] Select any role
- [ ] For each module, count visible permissions:
  - Dashboard: exactly 2 toggles (View, Export)
  - Bug Refiner: exactly 8 toggles
  - Test Generator: exactly 8 toggles
  - Writing Assistant: exactly 7 toggles (no Share)
  - QA Report: exactly 7 toggles (no Share or Adv AI)
  - Daily Report: exactly 6 toggles (no AI)
  - Settings: exactly 2 toggles (View, Edit)
  - Admin: exactly 2 toggles (View, Configure)
  - Announcements: exactly 5 toggles (View, Create, Edit, Delete, Configure)
  - History: exactly 3 toggles (View, Delete, Export)

**Test 2: Permission Labels**
- [ ] All permission toggles use friendly labels:
  - can_view → "View"
  - can_create → "Create"
  - can_edit → "Edit"
  - can_delete → "Delete"
  - can_export → "Export"
  - can_generate_ai → "AI Gen"
  - can_use_advanced_ai → "Adv AI"
  - can_share → "Share"
  - can_configure → "Configure"

**Test 3: Permission Toggle Functionality**
- [ ] Click to enable a permission (grey → gold checkmark)
- [ ] Permission saves automatically
- [ ] Refresh page → permission state persists
- [ ] Click to disable → returns to grey X
- [ ] State persists across sessions

**Test 4: Module Permission Count Display**
- [ ] Each module card header shows "X/Y" count
- [ ] X = enabled permissions
- [ ] Y = total supported permissions
- [ ] Count updates in real-time when toggling
- [ ] Admin role shows green badge "X/X" (all enabled)
- [ ] Other roles show gold badge when partial

**Test 5: Admin Role Special Handling**
- [ ] Admin/Super Admin roles show all permissions as green checkmarks
- [ ] All toggles are disabled (cannot be clicked)
- [ ] Banner shows "Unrestricted Access" message
- [ ] Tooltip says "Granted — system administrator"

---

## Route Protection Testing

### Protected Routes

**Test each route with different roles:**

| Route | Admin | Pro | Free | Enterprise |
|-------|-------|-----|------|------------|
| /dashboard | ✅ | ✅ | ✅ | Based on permission |
| /bug-refiner | ✅ | ✅ | ✅ | Based on permission |
| /test-generator | ✅ | ✅ | ✅ | Based on permission |
| /writing-assistant | ✅ | ✅ | ✅ | Based on permission |
| /qa-report | ✅ | ✅ | ✅ | Based on permission |
| /daily-report | ✅ | ✅ | ✅ | Based on permission |
| /settings | ✅ | ✅ | ✅ | ✅ |
| /admin | ✅ | ❌ | ❌ | ❌ |
| /admin/announcements | ✅ | ❌ | ❌ | Based on canView('announcements') |
| /admin/enterprise | ✅ | ❌ | ❌ | ❌ |
| /announcements | 404 | 404 | 404 | 404 (removed) |
| /manage/announcements | 404 | 404 | 404 | 404 (removed) |

**For each ❌ case:**
- [ ] User is redirected or sees "Not Authorized" page
- [ ] No error in browser console
- [ ] Navigation is graceful

---

## Database Testing

### Run Migrations

```bash
# Connect to Supabase database
supabase db reset

# Or apply migrations individually
supabase db push
```

**Verify:**
- [ ] `modules` table: announcements route_path = '/admin/announcements'
- [ ] `role_module_permissions` table: Admin has all permissions enabled
- [ ] `role_module_permissions` table: Pro/Free have correct subset
- [ ] No duplicate permission entries
- [ ] All foreign key constraints valid

### RLS Policy Testing

**Test with SQL Client (pgAdmin or Supabase SQL Editor)**

```sql
-- Set user context to test RLS
SET LOCAL ROLE authenticated;
SET LOCAL request.jwt.claims TO '{"sub":"<user-uuid>"}';

-- Test 1: Admin sees all announcements
SELECT * FROM announcements;

-- Test 2: Regular user sees only published + own
SELECT * FROM announcements;

-- Test 3: Try to insert announcement
INSERT INTO announcements (title, content, status, audience) 
VALUES ('Test', 'Test content', 'draft', 'all');

-- Test 4: Try to update own announcement
UPDATE announcements SET title = 'Updated' WHERE id = '<own-announcement-id>';

-- Test 5: Try to update others' announcement (should fail for non-admin)
UPDATE announcements SET title = 'Hacked' WHERE id = '<others-announcement-id>';

-- Test 6: Try to delete announcement (admin only)
DELETE FROM announcements WHERE id = '<announcement-id>';
```

**Expected Results:**
- [ ] Admins can perform all operations
- [ ] Users can view published announcements
- [ ] Users can view their own drafts
- [ ] Users can edit their own announcements
- [ ] Users CANNOT edit others' announcements (unless admin)
- [ ] Only admins can delete announcements

---

## Regression Testing

### Verify Existing Features Still Work

**1. User Authentication**
- [ ] Login works
- [ ] Logout works
- [ ] Password reset works
- [ ] Session persists correctly

**2. Module Functionality**
- [ ] Bug Refiner CRUD operations work
- [ ] Test Generator creates test cases
- [ ] Writing Assistant generates content
- [ ] QA Report generates reports
- [ ] Daily Report creates updates

**3. AI Features**
- [ ] AI generation endpoints respond
- [ ] Generated content appears correctly
- [ ] Advanced AI features work (Pro users)
- [ ] AI features disabled correctly (Free users)

**4. Export Functionality**
- [ ] Export buttons appear for authorized users
- [ ] Export generates correct file format
- [ ] Export hidden for unauthorized users

**5. Theme Switching**
- [ ] Light/Dark mode toggle works
- [ ] Theme persists across sessions
- [ ] CSS variables update correctly

---

## Edge Cases & Error Handling

### Test Error Scenarios

**1. Permission Denied**
- [ ] Accessing /admin/announcements without permission shows clear error
- [ ] Error message is user-friendly: "You don't have permission to access announcements"
- [ ] User is redirected to Dashboard or appropriate page

**2. Invalid Routes**
- [ ] /announcements returns 404
- [ ] /manage/announcements returns 404
- [ ] Random invalid routes show 404 page

**3. Concurrent Permission Changes**
- [ ] Admin changes user's permissions while user is logged in
- [ ] User refreshes page → new permissions apply
- [ ] Permission cache is invalidated correctly

**4. Network Errors**
- [ ] Permission loading failure shows appropriate message
- [ ] Retry mechanism works
- [ ] User is not locked out of the system

**5. Database Errors**
- [ ] RLS policy violations return appropriate errors
- [ ] Frontend shows user-friendly error messages
- [ ] No sensitive database information leaked

---

## Performance Testing

### Permission Check Performance

**Test 1: Sidebar Rendering**
- [ ] Sidebar renders within 200ms
- [ ] Permission checks don't block UI
- [ ] No flickering or layout shifts

**Test 2: Module Navigation**
- [ ] Navigating between modules is smooth
- [ ] Permission checks are cached
- [ ] No redundant API calls

**Test 3: Enterprise RBAC UI**
- [ ] Role list loads within 1 second
- [ ] Permission matrix renders smoothly
- [ ] Toggle updates are instantaneous
- [ ] No lag when switching between roles

**Test 4: Announcement Loading**
- [ ] Announcements list loads within 1 second
- [ ] Dashboard widget loads announcements in background
- [ ] No blocking of other dashboard widgets

---

## Accessibility Testing

### Keyboard Navigation

- [ ] Can tab through all permission toggles
- [ ] Can toggle permissions with Enter/Space keys
- [ ] Focus indicators are visible
- [ ] Modal traps focus correctly

### Screen Reader Support

- [ ] Permission toggles announce state (enabled/disabled)
- [ ] Role selection announces current role
- [ ] Module cards have proper labels
- [ ] Error messages are announced

### Visual Indicators

- [ ] Color is not the only indicator (icons + text)
- [ ] Sufficient contrast ratios
- [ ] Disabled states are clearly visible
- [ ] Lock icons indicate restricted access

---

## Final Verification Checklist

### Code Quality

- [ ] TypeScript compilation passes: `npx tsc --noEmit --skipLibCheck`
- [ ] No console errors in browser
- [ ] No console warnings (or only expected ones)
- [ ] ESLint passes (if configured)
- [ ] No deprecated API usage

### Documentation

- [ ] modulePermissions.ts has clear comments
- [ ] Migration files have documentation headers
- [ ] PERMISSION_LABELS are accurate
- [ ] This testing guide is followed

### Security

- [ ] No API keys in frontend code
- [ ] RLS policies are enforced
- [ ] Permission checks happen on both frontend and backend
- [ ] No SQL injection vulnerabilities
- [ ] No XSS vulnerabilities in announcement content

### User Experience

- [ ] Permission-denied messages are clear
- [ ] No dead links or broken navigation
- [ ] Module cards show appropriate states
- [ ] Loading states are handled gracefully
- [ ] Error states are user-friendly

---

## Sign-Off

After completing all tests above, document results:

### Test Summary

**Date:** _____________  
**Tester:** _____________  
**Environment:** _____________  

**Results:**
- Total Tests: _____
- Passed: _____
- Failed: _____
- Blocked: _____

**Critical Issues Found:**
1. 
2. 
3. 

**Minor Issues Found:**
1. 
2. 
3. 

**Overall Status:** ⬜ PASS ⬜ PASS WITH ISSUES ⬜ FAIL

**Notes:**


---

## Appendix: Quick Test Commands

```bash
# TypeScript compilation
npx tsc --noEmit --skipLibCheck

# Run migrations
npm run supabase:db:push

# Check migration status
npm run supabase:migration:list

# Reset database (WARNING: deletes all data)
npm run supabase:db:reset

# View RLS policies
supabase db inspect --schema public --table announcements

# Test specific user permissions (in psql)
SELECT * FROM check_module_permission('<user-id>', 'announcements', 'can_create');
```

---

## Support

If you encounter issues during testing:

1. Check browser console for errors
2. Verify migrations are applied: `supabase migration list`
3. Check Supabase logs for RLS policy violations
4. Verify user role in `profiles` table
5. Check `role_module_permissions` table for correct data
6. Clear browser cache and localStorage
7. Test in incognito mode to rule out caching issues

---

**END OF TESTING GUIDE**
