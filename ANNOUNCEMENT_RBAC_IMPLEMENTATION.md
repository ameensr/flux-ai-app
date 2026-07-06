# Implementation Plan: Role-Based Announcement Creation

## Current State
- **Only Admin/Super Admin** can create/edit/delete announcements (enforced by UI visibility only)
- All other roles (Pro, Free, custom enterprise roles like Manager, QA Lead, etc.) can only **view** announcements
- The RBAC system exists but isn't being checked in the AdminAnnouncements component

## Goal
Allow **any configured role** (Manager, QA Lead, Team Lead, etc.) to create/edit announcements based on their permissions in the Enterprise RBAC matrix.

---

## Solution Architecture

### 1. Database Layer (Already Exists ✅)
The RBAC infrastructure is already in place:
- `modules` table has `announcements` module
- `permissions` table has `can_create`, `can_edit`, `can_delete`, `can_configure`
- `role_module_permissions` table stores which roles have which permissions
- `get_role_permissions()` RPC function fetches permissions for frontend

**No database changes needed!**

---

### 2. Configuration (Enterprise RBAC Panel)

#### Step 1: Grant Permissions to Custom Roles
Admins can configure announcement permissions in **Enterprise RBAC > Roles & Permissions**:

```
Module: Announcements
┌──────────────┬──────┬────────┬──────┬────────┬───────┬───────────┐
│ Role         │ View │ Create │ Edit │ Delete │ Share │ Configure │
├──────────────┼──────┼────────┼──────┼────────┼───────┼───────────┤
│ Admin        │  ✅  │   ✅   │  ✅  │   ✅   │  ✅   │    ✅     │
│ Manager      │  ✅  │   ✅   │  ✅  │   ❌   │  ✅   │    ❌     │
│ QA Lead      │  ✅  │   ✅   │  ✅  │   ❌   │  ❌   │    ❌     │
│ Team Lead    │  ✅  │   ✅   │  ✅  │   ❌   │  ❌   │    ❌     │
│ Pro          │  ✅  │   ❌   │  ❌  │   ❌   │  ❌   │    ❌     │
│ Free         │  ✅  │   ❌   │  ❌  │   ❌   │  ❌   │    ❌     │
└──────────────┴──────┴────────┴──────┴────────┴───────┴───────────┘
```

#### Permission Meanings:
- **`can_view`** - See announcements list and details
- **`can_create`** - Create new announcements
- **`can_edit`** - Edit existing announcements (their own or all, depending on implementation)
- **`can_delete`** - Delete announcements
- **`can_share`** - Share announcements externally (future feature)
- **`can_configure`** - Change announcement settings/templates (future feature)

---

### 3. Frontend Implementation

#### A. Update `usePermissions` Hook (Already Exists)
The hook already provides:
```typescript
const { canView, canCreate, canEdit, canDelete } = usePermissions()

// Usage:
canCreate('announcements') // true/false based on role
canEdit('announcements')   // true/false based on role
```

#### B. Update `AdminAnnouncements.tsx`

**Current Issue:** The component doesn't check permissions - it assumes only admins can access it.

**Changes Needed:**

1. **Check permissions before showing UI elements:**
```tsx
import { usePermissions } from '@/hooks/usePermissions'

export function AdminAnnouncements() {
  const { canView, canCreate, canEdit, canDelete } = usePermissions()
  const hasViewPerm = canView('announcements')
  const hasCreatePerm = canCreate('announcements')
  const hasEditPerm = canEdit('announcements')
  const hasDeletePerm = canDelete('announcements')

  // Early exit if no view permission
  if (!hasViewPerm) {
    return <AccessDenied message="You don't have permission to view announcements." />
  }

  // ... rest of component
}
```

2. **Conditionally render Create button:**
```tsx
{hasCreatePerm && (
  <button onClick={() => setFormModal({ show: true, announcement: null })}>
    <Plus className="w-4 h-4" />
    Create Announcement
  </button>
)}
```

3. **Conditionally render Edit/Delete actions:**
```tsx
<div className="flex gap-2">
  {hasEditPerm && (
    <button onClick={() => handleEdit(announcement)}>
      <Edit2 className="w-4 h-4" />
    </button>
  )}
  {hasDeletePerm && (
    <button onClick={() => handleDelete(announcement.id)}>
      <Trash2 className="w-4 h-4" />
    </button>
  )}
</div>
```

4. **Show role-appropriate analytics:**
```tsx
// Admins see all stats
// Non-admins only see their own created announcements count
const statsToShow = role === 'admin' || role === 'super_admin' 
  ? allStats 
  : userOwnedStats
```

#### C. Update Routing (Optional but Recommended)

**Current:** `/admin/announcements` is only accessible to admins

**Better Approach:** Create a role-agnostic route

**Option 1: Keep existing route, update protection**
```tsx
// In App.tsx
<Route 
  path={ROUTES.adminAnnouncements} 
  element={
    <ProtectedRoute moduleKey="announcements">
      <AdminAnnouncements />
    </ProtectedRoute>
  } 
/>
```

Update `ProtectedRoute.tsx` to accept `moduleKey`:
```tsx
interface Props {
  children: React.ReactNode
  adminOnly?: boolean
  moduleKey?: string // New prop
}

export function ProtectedRoute({ children, adminOnly, moduleKey }: Props) {
  // ... existing auth checks

  // Module-level check (works for any role)
  if (moduleKey && !canView(moduleKey)) {
    return <AccessDenied />
  }

  // Admin-only check (legacy support)
  if (adminOnly && role !== 'admin' && role !== 'super_admin') {
    return <AccessDenied />
  }

  return <>{children}</>
}
```

**Option 2: Create separate route for non-admins**
```tsx
// In routes.ts
export const ROUTES = {
  // ... existing routes
  announcements: '/announcements',           // View announcements
  adminAnnouncements: '/admin/announcements', // Admin full management
  manageAnnouncements: '/manage/announcements', // Non-admin management
}

// In App.tsx
<Route path={ROUTES.manageAnnouncements} element={
  <ProtectedRoute moduleKey="announcements">
    <AdminAnnouncements />
  </ProtectedRoute>
} />
```

---

### 4. Sidebar/Navigation Updates

Update `Sidebar.tsx` to show "Announcements" link for roles with `can_view`:

```tsx
const { canView, canCreate } = usePermissions()

const announcementNavItem = canView('announcements') 
  ? {
      label: 'Announcements',
      icon: Megaphone,
      path: canCreate('announcements') 
        ? ROUTES.manageAnnouncements  // Has create/edit access
        : ROUTES.announcements,       // View-only access
    }
  : null

// In nav items array:
{announcementNavItem && <NavItem {...announcementNavItem} />}
```

---

### 5. Backend Service Updates

Update `service.ts` to add user context to queries:

```typescript
// In service.ts

export async function createAnnouncement(payload: CreateAnnouncementPayload) {
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase
    .from('announcements')
    .insert({
      ...payload,
      created_by: user?.id,
      // Non-admins can only create drafts initially (optional policy)
      status: canPublishImmediately(user) ? payload.status : 'draft',
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Helper to check if user can publish immediately
function canPublishImmediately(user: User | null): boolean {
  // Admins can publish immediately
  // Others must submit as draft for admin approval
  const profile = useAppStore.getState().profile
  return profile?.role === 'admin' || profile?.role === 'super_admin'
}
```

---

### 6. Row-Level Security (RLS) Policies (Database)

Add policies to enforce permissions at database level:

```sql
-- Allow users to view announcements they have permission for
CREATE POLICY "Users can view announcements based on RBAC"
  ON announcements FOR SELECT
  USING (
    -- Admins see all
    auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('admin', 'super_admin'))
    OR
    -- Others see based on audience + their role permissions
    (
      audience = 'all'
      OR audience = (SELECT role FROM profiles WHERE user_id = auth.uid())
    )
  );

-- Allow users to create announcements if they have can_create permission
CREATE POLICY "Users can create announcements based on RBAC"
  ON announcements FOR INSERT
  WITH CHECK (
    -- Check if user has can_create permission for announcements module
    EXISTS (
      SELECT 1 FROM get_role_permissions((SELECT role FROM profiles WHERE user_id = auth.uid()))
      WHERE module_key = 'announcements' AND permission_key = 'can_create'
    )
  );

-- Allow users to edit announcements if they have can_edit permission
CREATE POLICY "Users can edit announcements based on RBAC"
  ON announcements FOR UPDATE
  USING (
    -- Can edit if has permission + (is owner OR is admin)
    EXISTS (
      SELECT 1 FROM get_role_permissions((SELECT role FROM profiles WHERE user_id = auth.uid()))
      WHERE module_key = 'announcements' AND permission_key = 'can_edit'
    )
    AND (
      created_by = auth.uid()  -- Own announcements
      OR
      auth.uid() IN (SELECT user_id FROM profiles WHERE role IN ('admin', 'super_admin')) -- Admins edit all
    )
  );

-- Allow users to delete announcements if they have can_delete permission (admin-only usually)
CREATE POLICY "Users can delete announcements based on RBAC"
  ON announcements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM get_role_permissions((SELECT role FROM profiles WHERE user_id = auth.uid()))
      WHERE module_key = 'announcements' AND permission_key = 'can_delete'
    )
  );
```

---

## Implementation Checklist

### Phase 1: Basic RBAC Integration
- [ ] Update `AdminAnnouncements.tsx` to use `usePermissions()` hook
- [ ] Show/hide Create button based on `canCreate('announcements')`
- [ ] Show/hide Edit/Delete buttons based on `canEdit()` and `canDelete()`
- [ ] Add permission check at component entry (redirect if no `can_view`)
- [ ] Test with different roles

### Phase 2: Routing & Navigation
- [ ] Update route protection to use `moduleKey="announcements"` instead of `adminOnly`
- [ ] OR: Create new `/manage/announcements` route for non-admin creators
- [ ] Update Sidebar to show announcements link based on permissions
- [ ] Update breadcrumbs/page titles to be role-agnostic

### Phase 3: Backend Enforcement
- [ ] Create RLS policies for announcements table
- [ ] Update service.ts to add user context
- [ ] Optional: Add approval workflow (non-admins submit drafts, admins publish)
- [ ] Test CRUD operations with different roles

### Phase 4: UX Enhancements
- [ ] Show filtered analytics (users see only their created announcements)
- [ ] Add "Pending Approval" badge for draft announcements created by non-admins
- [ ] Add notification to admins when non-admin submits announcement for review
- [ ] Add audit log for announcement changes

---

## Configuration Example

### Scenario: QA Lead Role

1. **Admin goes to Enterprise RBAC > Roles**
2. **Finds or creates "QA Lead" role**
3. **Goes to Roles & Permissions tab**
4. **Enables for Announcements module:**
   - ✅ View
   - ✅ Create
   - ✅ Edit (own announcements)
   - ❌ Delete (only admins)
   - ❌ Configure

5. **Assigns user to QA Lead role**

6. **QA Lead can now:**
   - View all published announcements
   - Create new announcements (as drafts or published, depending on policy)
   - Edit their own announcements
   - Cannot delete announcements
   - Cannot configure announcement settings

---

## Benefits of This Approach

✅ **Flexible** - Admins control who can create announcements via RBAC matrix
✅ **Scalable** - Works for any custom enterprise role (Manager, QA Lead, Team Lead, etc.)
✅ **Secure** - Enforced at both frontend (UI) and backend (RLS policies)
✅ **No Code Changes for New Roles** - Just configure in Enterprise RBAC panel
✅ **Gradual Rollout** - Can start with UI-only checks, add RLS later
✅ **Audit Trail** - All changes tracked with user context

---

## Testing Plan

1. **Create test roles:**
   - "Manager" with `can_create`, `can_edit`
   - "QA Lead" with `can_create`, `can_edit`
   - "Viewer" with only `can_view`

2. **Test each role:**
   - Can they see announcements page?
   - Can they create announcements?
   - Can they edit their own announcements?
   - Can they edit others' announcements?
   - Can they delete announcements?

3. **Test RLS policies:**
   - Try to create announcement via direct API call without permission
   - Try to edit someone else's announcement without permission
   - Verify admins can still do everything

---

## Migration Path

If you want to implement this incrementally:

**Week 1:** Frontend permission checks only (UI shows/hides buttons)
**Week 2:** Add RLS policies for backend enforcement
**Week 3:** Add approval workflow (optional)
**Week 4:** Add audit logs and notifications

This way, you can deploy to production safely and validate each step.
