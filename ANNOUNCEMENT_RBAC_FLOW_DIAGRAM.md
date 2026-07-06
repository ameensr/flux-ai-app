# Announcement RBAC Flow Diagram

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    ADMIN CONFIGURATION                           │
│                                                                   │
│  Enterprise RBAC Panel > Roles & Permissions                    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Module: Announcements                                   │    │
│  │                                                          │    │
│  │ ┌─────────┬──────┬────────┬──────┬────────┬─────────┐ │    │
│  │ │ Role    │ View │ Create │ Edit │ Delete │ Config  │ │    │
│  │ ├─────────┼──────┼────────┼──────┼────────┼─────────┤ │    │
│  │ │ Admin   │  ✅  │   ✅   │  ✅  │   ✅   │   ✅    │ │    │
│  │ │ Manager │  ✅  │   ✅   │  ✅  │   ❌   │   ❌    │ │    │
│  │ │ QA Lead │  ✅  │   ✅   │  ✅  │   ❌   │   ❌    │ │    │
│  │ │ Pro     │  ✅  │   ❌   │  ❌  │   ❌   │   ❌    │ │    │
│  │ └─────────┴──────┴────────┴──────┴────────┴─────────┘ │    │
│  └────────────────────────────────────────────────────────┘    │
│                            ↓                                     │
│                  Stored in Database:                            │
│              role_module_permissions table                      │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                     USER LOGIN FLOW                              │
│                                                                   │
│  1. User logs in → Profile loaded with role                     │
│  2. get_role_permissions(role) fetched from DB                  │
│  3. Permissions cached in usePermissions() hook                 │
│                                                                   │
│  Example for "Manager" role:                                    │
│  {                                                               │
│    announcements: {                                             │
│      can_view: true,                                            │
│      can_create: true,                                          │
│      can_edit: true,                                            │
│      can_delete: false                                          │
│    }                                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND UI LAYER                             │
│                                                                   │
│  Sidebar.tsx                                                     │
│  ┌──────────────────────────────────────────────────┐          │
│  │ Navigation                                        │          │
│  │                                                   │          │
│  │  if (canView('announcements')) {                │          │
│  │    Show "Announcements" link                     │          │
│  │  }                                                │          │
│  └──────────────────────────────────────────────────┘          │
│                            ↓                                     │
│  App.tsx - Routing                                              │
│  ┌──────────────────────────────────────────────────┐          │
│  │ <ProtectedRoute moduleKey="announcements">      │          │
│  │   <AdminAnnouncements />                         │          │
│  │ </ProtectedRoute>                                │          │
│  └──────────────────────────────────────────────────┘          │
│                            ↓                                     │
│  AdminAnnouncements.tsx                                         │
│  ┌──────────────────────────────────────────────────┐          │
│  │ const { canCreate, canEdit, canDelete } =       │          │
│  │        usePermissions()                          │          │
│  │                                                   │          │
│  │ ┌─────────────────────────────────────────────┐ │          │
│  │ │ CREATE BUTTON                                │ │          │
│  │ │ {canCreate('announcements') && (            │ │          │
│  │ │   <button>Create Announcement</button>      │ │          │
│  │ │ )}                                           │ │          │
│  │ └─────────────────────────────────────────────┘ │          │
│  │                                                   │          │
│  │ ┌─────────────────────────────────────────────┐ │          │
│  │ │ EDIT BUTTON                                  │ │          │
│  │ │ {canEdit('announcements') && (              │ │          │
│  │ │   <button>Edit</button>                     │ │          │
│  │ │ )}                                           │ │          │
│  │ └─────────────────────────────────────────────┘ │          │
│  │                                                   │          │
│  │ ┌─────────────────────────────────────────────┐ │          │
│  │ │ DELETE BUTTON                                │ │          │
│  │ │ {canDelete('announcements') && (            │ │          │
│  │ │   <button>Delete</button>                   │ │          │
│  │ │ )}                                           │ │          │
│  │ └─────────────────────────────────────────────┘ │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────────┐
│                   BACKEND API LAYER                              │
│                                                                   │
│  service.ts - createAnnouncement()                              │
│  ┌──────────────────────────────────────────────────┐          │
│  │ 1. Get current user from auth                    │          │
│  │ 2. Get user's role from profiles table           │          │
│  │ 3. Insert announcement with created_by = user.id │          │
│  │ 4. Return created announcement                   │          │
│  └──────────────────────────────────────────────────┘          │
│                            ↓                                     │
│  Supabase Database - RLS Policies                               │
│  ┌──────────────────────────────────────────────────┐          │
│  │ INSERT Policy:                                    │          │
│  │ - User must be authenticated                     │          │
│  │ - Trigger auto-sets created_by = auth.uid()     │          │
│  │                                                   │          │
│  │ UPDATE Policy:                                    │          │
│  │ - User can edit if created_by = auth.uid()      │          │
│  │ - OR user is admin/super_admin                   │          │
│  │                                                   │          │
│  │ DELETE Policy:                                    │          │
│  │ - Only admin/super_admin can delete              │          │
│  │                                                   │          │
│  │ SELECT Policy:                                    │          │
│  │ - Admins see all                                 │          │
│  │ - Users see published + targeted to their role   │          │
│  │ - Users see their own (any status)               │          │
│  └──────────────────────────────────────────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## User Journey Examples

### Example 1: Manager Creating an Announcement

```
┌────────────────────────────────────────────────────────────────┐
│ Step 1: Manager logs in                                        │
│ Role: "Manager"                                                 │
│ Permissions loaded:                                            │
│   announcements: { can_view: ✅, can_create: ✅, can_edit: ✅ } │
└────────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────────┐
│ Step 2: Manager navigates to /manage/announcements            │
│                                                                 │
│ ProtectedRoute checks:                                         │
│  ✅ User is authenticated                                       │
│  ✅ canView('announcements') = true                            │
│  → Access granted                                              │
└────────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────────┐
│ Step 3: AdminAnnouncements page renders                       │
│                                                                 │
│ UI shows:                                                       │
│  ✅ "Create Announcement" button (canCreate = true)            │
│  ✅ "Edit" button on own announcements (canEdit = true)        │
│  ❌ "Delete" button (canDelete = false)                        │
└────────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────────┐
│ Step 4: Manager clicks "Create Announcement"                  │
│                                                                 │
│ Form opens with fields:                                        │
│  - Title: "New Feature Launch"                                 │
│  - Description: "We're launching..."                           │
│  - Priority: "High"                                            │
│  - Category: "Feature"                                         │
│  - Status: "Draft" (forced for non-admins)                    │
└────────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────────┐
│ Step 5: Manager clicks "Save"                                 │
│                                                                 │
│ service.createAnnouncement() called:                           │
│  → Payload sent to Supabase                                    │
│  → RLS INSERT policy checks: ✅ authenticated                  │
│  → Trigger sets created_by = manager_user_id                  │
│  → Announcement saved to DB                                    │
└────────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────────┐
│ Step 6: Success!                                               │
│                                                                 │
│ Manager sees:                                                   │
│  ✅ "Announcement created successfully"                         │
│  ✅ New announcement in list with "Draft" badge                │
│  ✅ Can edit this announcement (own announcement)              │
│  ❌ Cannot delete (no can_delete permission)                   │
└────────────────────────────────────────────────────────────────┘
```

---

### Example 2: QA Lead Editing Own Announcement

```
┌────────────────────────────────────────────────────────────────┐
│ QA Lead sees list of announcements:                           │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📢 "Bug Bash This Friday"                                │ │
│  │ Created by: qa_lead@company.com (YOU)                    │ │
│  │ Status: Draft                                             │ │
│  │                                                           │ │
│  │ Actions: [Edit] [Publish]                                │ │
│  │          ^^^ shown because canEdit = true                │ │
│  └──────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────────┐
│ QA Lead clicks "Edit"                                          │
│                                                                 │
│ Form opens with existing data, QA Lead changes:               │
│  Title: "Bug Bash This Friday" → "Bug Bash Extended"         │
└────────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────────┐
│ QA Lead clicks "Save"                                          │
│                                                                 │
│ service.updateAnnouncement() called:                           │
│  → RLS UPDATE policy checks:                                   │
│     ✅ created_by = qa_lead_user_id (own announcement)         │
│  → Update succeeds                                             │
└────────────────────────────────────────────────────────────────┘
```

---

### Example 3: Pro User (View Only)

```
┌────────────────────────────────────────────────────────────────┐
│ Pro User logs in                                               │
│ Role: "Pro"                                                     │
│ Permissions: announcements: { can_view: ✅, can_create: ❌ }    │
└────────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────────┐
│ Pro User navigates to /announcements                           │
│                                                                 │
│ UI shows:                                                       │
│  ✅ List of published announcements                            │
│  ❌ No "Create Announcement" button (canCreate = false)        │
│  ❌ No "Edit" buttons (canEdit = false)                        │
│  ❌ No "Delete" buttons (canDelete = false)                    │
│                                                                 │
│ Pro user can:                                                   │
│  - Read announcements                                          │
│  - Mark as acknowledged                                        │
│  - Filter/search                                               │
└────────────────────────────────────────────────────────────────┘
```

---

### Example 4: Admin (Full Access)

```
┌────────────────────────────────────────────────────────────────┐
│ Admin logs in                                                  │
│ Role: "Admin"                                                   │
│ Permissions: ALL = ✅                                           │
└────────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────────┐
│ Admin sees ALL announcements (including drafts from others)   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐ │
│  │ 📢 "Bug Bash Extended" (Draft)                           │ │
│  │ Created by: qa_lead@company.com                          │ │
│  │                                                           │ │
│  │ Actions: [Edit] [Delete] [Publish] [Pin]                │ │
│  │          ^^^ ALL buttons visible                         │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Admin can:                                                      │
│  ✅ Create announcements                                        │
│  ✅ Edit ANY announcement (not just own)                       │
│  ✅ Delete ANY announcement                                     │
│  ✅ Publish/unpublish                                           │
│  ✅ Pin/unpin                                                   │
│  ✅ View full analytics                                         │
└────────────────────────────────────────────────────────────────┘
```

---

## Permission Matrix

```
╔═══════════════╦════════╦════════╦══════╦════════╦═══════╦═══════════╗
║ Role          ║ View   ║ Create ║ Edit ║ Delete ║ Pin   ║ Configure ║
╠═══════════════╬════════╬════════╬══════╬════════╬═══════╬═══════════╣
║ Super Admin   ║   ✅   ║   ✅   ║  ✅  ║   ✅   ║  ✅   ║    ✅     ║
║ Admin         ║   ✅   ║   ✅   ║  ✅  ║   ✅   ║  ✅   ║    ✅     ║
║ Manager       ║   ✅   ║   ✅   ║  ✅* ║   ❌   ║  ❌   ║    ❌     ║
║ QA Lead       ║   ✅   ║   ✅   ║  ✅* ║   ❌   ║  ❌   ║    ❌     ║
║ Team Lead     ║   ✅   ║   ✅   ║  ✅* ║   ❌   ║  ❌   ║    ❌     ║
║ Pro           ║   ✅   ║   ❌   ║  ❌  ║   ❌   ║  ❌   ║    ❌     ║
║ Free          ║   ✅   ║   ❌   ║  ❌  ║   ❌   ║  ❌   ║    ❌     ║
╚═══════════════╩════════╩════════╩══════╩════════╩═══════╩═══════════╝

* Can only edit own announcements (admins can edit any)
```

---

## Configuration Flow

```
┌────────────────────────────────────────────────────────────────┐
│ STEP 1: Admin Creates Custom Role                             │
│                                                                 │
│  Enterprise RBAC > Roles                                       │
│  Click "Create Role"                                           │
│  ┌────────────────────────────────────────────┐               │
│  │ Role Key:  qa_lead                          │               │
│  │ Role Name: QA Lead                          │               │
│  │ Priority:  50                                │               │
│  └────────────────────────────────────────────┘               │
└────────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────────┐
│ STEP 2: Admin Sets Permissions                                │
│                                                                 │
│  Enterprise RBAC > Roles & Permissions                         │
│  Select: QA Lead                                               │
│  Module: Announcements                                         │
│  ┌────────────────────────────────────────────┐               │
│  │ ☑ View                                      │               │
│  │ ☑ Create                                    │               │
│  │ ☑ Edit                                      │               │
│  │ ☐ Delete                                    │               │
│  │ ☐ Configure                                 │               │
│  └────────────────────────────────────────────┘               │
└────────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────────┐
│ STEP 3: Admin Assigns User to Role                            │
│                                                                 │
│  Enterprise RBAC > Users                                       │
│  Find: john@company.com                                        │
│  Change Role: Pro → QA Lead                                    │
└────────────────────────────────────────────────────────────────┘
                         ↓
┌────────────────────────────────────────────────────────────────┐
│ STEP 4: User Logs In                                          │
│                                                                 │
│  Next time john@company.com logs in:                           │
│   → Profile role = "qa_lead"                                   │
│   → Permissions loaded from role_module_permissions            │
│   → Can now create/edit announcements!                         │
└────────────────────────────────────────────────────────────────┘
```

---

## Security Layers

```
        ┌─────────────────────────────────────┐
        │    Layer 1: Route Protection        │
        │  ProtectedRoute checks canView()    │
        │  Blocks access if no permission     │
        └──────────────┬──────────────────────┘
                       ↓
        ┌─────────────────────────────────────┐
        │    Layer 2: UI Element Hiding       │
        │  AdminAnnouncements component       │
        │  Conditionally renders buttons      │
        │  based on permissions               │
        └──────────────┬──────────────────────┘
                       ↓
        ┌─────────────────────────────────────┐
        │    Layer 3: API Service Layer       │
        │  service.ts validates user context  │
        │  Sets created_by, enforces status   │
        └──────────────┬──────────────────────┘
                       ↓
        ┌─────────────────────────────────────┐
        │    Layer 4: Database RLS Policies   │
        │  Supabase enforces row-level rules  │
        │  Users can only edit own records    │
        │  Admins bypass restrictions         │
        └─────────────────────────────────────┘
```

**Why multiple layers?**
- **Layer 1-2:** Better UX (don't show buttons that won't work)
- **Layer 3:** Validation before hitting database
- **Layer 4:** Ultimate security (even if frontend is bypassed)

---

## Summary

✅ **Role-based** - Any role (Manager, QA Lead, etc.) can be configured
✅ **UI-driven** - Admins configure via Enterprise RBAC panel (no code)
✅ **Secure** - 4 layers of protection (route, UI, service, database)
✅ **Flexible** - Each role can have different permission combinations
✅ **Scalable** - Adding new roles doesn't require code changes
