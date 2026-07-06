# Quick Start: Enable Role-Based Announcement Creation

## 🎯 Goal
Allow Manager, QA Lead, Team Lead, or any custom role to create/edit announcements.

---

## ⚡ Quick Setup (5 Minutes)

### Option 1: Quick Configuration (No Code - UI Only)

**For testing/demo purposes, skip code changes and just configure:**

1. **Go to Enterprise RBAC > Roles**
2. **Create/edit "Manager" role** (or any role)
3. **Go to Roles & Permissions tab**
4. **Find "Announcements" module, enable:**
   - ✅ View
   - ✅ Create
   - ✅ Edit
5. **Assign user to Manager role**
6. **User logs out and back in**

⚠️ **Limitation:** User won't see the announcement management page link in sidebar (still admin-only route). They need to manually go to `/admin/announcements` (if they can access admin panel) or you need to implement the code changes below.

---

### Option 2: Full Implementation (With Code)

**Time: ~1 hour**

#### Step 1: Update Frontend (4 files)

```bash
# File 1: AdminAnnouncements.tsx
# Add permission checks for Create/Edit/Delete buttons
# See: CODE_CHANGES_FOR_ANNOUNCEMENT_RBAC.md - File 1

# File 2: ProtectedRoute.tsx (Optional)
# Add moduleKey prop for flexible route protection
# See: CODE_CHANGES_FOR_ANNOUNCEMENT_RBAC.md - File 2

# File 3: App.tsx
# Add new /manage/announcements route OR update existing
# See: CODE_CHANGES_FOR_ANNOUNCEMENT_RBAC.md - File 3

# File 4: Sidebar.tsx
# Show announcements link based on permissions
# See: CODE_CHANGES_FOR_ANNOUNCEMENT_RBAC.md - File 4
```

#### Step 2: Deploy Frontend

```bash
cd flux-ai-app
npm run build
# Deploy to your hosting (Vercel, etc.)
```

#### Step 3: Run Database Migration (Optional - Backend Security)

```bash
# Create file: supabase/migrations/017_announcements_rls_rbac.sql
# Content: See CODE_CHANGES_FOR_ANNOUNCEMENT_RBAC.md - File 5

# Run migration
supabase db push
# OR manually run SQL in Supabase dashboard
```

#### Step 4: Configure Roles (Same as Option 1)

1. Enterprise RBAC > Roles > Enable permissions
2. Assign users to roles
3. Done! ✅

---

## 🧪 Testing

### Test Scenario 1: Manager Creates Announcement

```
1. Login as user with "Manager" role
2. Check sidebar → "Announcements" link should appear
3. Click link → Opens /manage/announcements
4. Click "Create Announcement" button → Form opens
5. Fill form, click "Save" → Success!
6. See announcement in list with "Edit" button (no "Delete")
```

**Expected Result:** ✅ Manager can create and edit announcements

---

### Test Scenario 2: Pro User (View Only)

```
1. Login as user with "Pro" role
2. Go to /announcements → Can view list
3. No "Create" button shown
4. No "Edit" or "Delete" buttons on announcements
```

**Expected Result:** ✅ Pro user can only read announcements

---

### Test Scenario 3: Admin (Full Access)

```
1. Login as Admin
2. Go to /admin/announcements
3. See all buttons: Create, Edit, Delete, Pin, Publish
4. Can edit ANY announcement (including others')
5. Can delete announcements
```

**Expected Result:** ✅ Admin has full control

---

## 🐛 Troubleshooting

### Issue: User can't see "Create Announcement" button

**Check:**
1. ✅ User's role has `can_create` permission in Enterprise RBAC?
2. ✅ User logged out and back in after permission change?
3. ✅ Code changes implemented in `AdminAnnouncements.tsx`?
4. ✅ Browser cache cleared?

**Fix:** Go to Enterprise RBAC > Roles & Permissions > Enable "Create" for the role

---

### Issue: User can access page but gets error when creating

**Check:**
1. ✅ RLS policies enabled on announcements table?
2. ✅ `created_by` trigger exists in database?
3. ✅ User is authenticated (check Supabase auth)?

**Fix:** Run database migration (Step 3 above)

---

### Issue: User sees buttons but they don't work

**Check:**
1. ✅ Frontend code checks permissions before showing buttons?
2. ✅ Backend RLS policies allow the action?
3. ✅ Check browser console for errors

**Fix:** Verify both frontend (`usePermissions()` checks) and backend (RLS policies) are in place

---

### Issue: Changes not reflected after updating permissions

**Fix:** User must **logout and login again** to reload permissions from database

**Better Fix:** Implement real-time permission updates:
```tsx
// Add to usePermissions hook:
useEffect(() => {
  const subscription = supabase
    .channel('role_changes')
    .on('postgres_changes', 
      { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `user_id=eq.${user?.id}` },
      () => {
        // Reload permissions
        invalidatePermissionCache(role)
        loadPermissions()
      }
    )
    .subscribe()
  
  return () => subscription.unsubscribe()
}, [user?.id])
```

---

## 📋 Checklist

### Before Deployment
- [ ] Frontend code updated with permission checks
- [ ] Route protection configured (ProtectedRoute or adminOnly)
- [ ] Sidebar navigation shows announcements based on permissions
- [ ] Database migration run (RLS policies)
- [ ] TypeScript compilation passes (`npm run build`)

### After Deployment
- [ ] Created test roles in Enterprise RBAC (Manager, QA Lead)
- [ ] Assigned test users to roles
- [ ] Tested as Manager - can create/edit ✅
- [ ] Tested as Pro - view only ✅
- [ ] Tested as Admin - full access ✅
- [ ] Verified RLS policies block unauthorized access

---

## 🔗 Reference Documents

- **Full Implementation Plan:** `ANNOUNCEMENT_RBAC_IMPLEMENTATION.md`
- **Code Changes:** `CODE_CHANGES_FOR_ANNOUNCEMENT_RBAC.md`
- **Flow Diagram:** `ANNOUNCEMENT_RBAC_FLOW_DIAGRAM.md`

---

## 🚀 What You Get

✅ **Flexible Role Management**
   - Add new roles (Team Lead, Department Head, etc.) via UI
   - No code changes needed for new roles

✅ **Granular Permissions**
   - View, Create, Edit, Delete, Configure
   - Each role can have different combinations

✅ **Secure by Default**
   - 4 layers of security (route, UI, service, database)
   - RLS policies enforce at database level

✅ **Better UX**
   - Users only see what they can do
   - No "permission denied" errors

✅ **Audit Trail**
   - Every announcement has `created_by` field
   - Admins see who created what

---

## 💡 Pro Tips

### Tip 1: Approval Workflow
Make non-admins submit as "Draft", admins publish:

```tsx
// In service.ts createAnnouncement:
const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'
const status = isAdmin ? payload.status : 'draft'
```

### Tip 2: Scoped Editing
Users can only edit their own, admins edit any:

```tsx
// In AdminAnnouncements:
const canEditThis = hasEditPerm && (announcement.created_by === user?.id || isAdmin)

{canEditThis && <button>Edit</button>}
```

### Tip 3: Role-Based Analytics
Show different stats based on role:

```tsx
// Admins see all stats
// Others see only their own
const myAnnouncements = allAnnouncements.filter(a => a.created_by === user?.id)
const stats = isAdmin 
  ? { total: allAnnouncements.length, ... }
  : { total: myAnnouncements.length, ... }
```

---

## 🎉 Success Criteria

When implemented correctly:

✅ **Manager logs in** → Sees "Announcements" in sidebar
✅ **Manager clicks link** → Opens management page
✅ **Manager clicks "Create"** → Form opens
✅ **Manager saves** → Announcement created successfully
✅ **Manager sees "Edit" on own announcements** → Can edit
✅ **Manager doesn't see "Delete"** → Correctly restricted
✅ **Pro user** → Can only view, no create/edit buttons
✅ **Admin** → Full access to all announcements

---

## 📞 Need Help?

**Check logs:**
1. Browser Console (F12) for frontend errors
2. Supabase Dashboard > Logs for backend errors
3. Network tab to see failed API calls

**Common issues:**
- Permissions not loading → User needs to logout/login
- Button shows but fails → RLS policy blocking (check Supabase logs)
- Route blocked → ProtectedRoute missing `moduleKey` prop

**Still stuck?** Review the detailed implementation docs or check the code examples.
