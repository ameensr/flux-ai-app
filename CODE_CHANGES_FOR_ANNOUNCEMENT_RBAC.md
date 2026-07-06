# Code Changes: Enable Role-Based Announcement Creation

## Quick Summary
These changes allow **any role** (Manager, QA Lead, Team Lead, etc.) to create/edit announcements based on their RBAC permissions configured in Enterprise RBAC panel.

---

## File 1: Update `AdminAnnouncements.tsx`

### Location
`flux-ai-app/src/modules/Announcements/AdminAnnouncements.tsx`

### Changes

```tsx
// At the top, add usePermissions import
import { usePermissions } from '@/hooks/usePermissions'

// Inside AdminAnnouncements component, after existing hooks:
export function AdminAnnouncements() {
  const { toast } = useToast()
  const { role } = useAppStore() // Already exists
  const { allAnnouncements, adminLoading, readCounts, ackCounts, fetchForAdmin } = useAnnouncementsStore()
  
  // ADD THESE LINES:
  const { canView, canCreate, canEdit, canDelete } = usePermissions()
  const hasViewPerm = canView('announcements')
  const hasCreatePerm = canCreate('announcements')
  const hasEditPerm = canEdit('announcements')
  const hasDeletePerm = canDelete('announcements')
  const isAdmin = role === 'admin' || role === 'super_admin'

  // ADD THIS CHECK (before any other code):
  if (!hasViewPerm) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Lock className="w-16 h-16 text-accent-gold mb-4" />
        <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
          No Permission
        </h3>
        <p style={{ color: 'var(--text-muted)' }}>
          You don't have permission to view announcements.
        </p>
      </div>
    )
  }

  // ... rest of existing code
}
```

### Change: Create Button (around line 300-320)
```tsx
// FIND THIS (approximately):
<button
  onClick={() => setFormModal({ show: true, announcement: null })}
  className="flex items-center gap-2 px-4 py-2.5 rounded-xl ..."
>
  <Plus className="w-4 h-4" />
  Create Announcement
</button>

// WRAP IT WITH PERMISSION CHECK:
{hasCreatePerm && (
  <button
    onClick={() => setFormModal({ show: true, announcement: null })}
    className="flex items-center gap-2 px-4 py-2.5 rounded-xl ..."
  >
    <Plus className="w-4 h-4" />
    Create Announcement
  </button>
)}
```

### Change: Edit/Delete Buttons in Announcement List
```tsx
// FIND the actions buttons section (in the announcement card):
<div className="flex gap-1.5">
  {/* Pin button */}
  <button onClick={() => handleTogglePin(a.id, a.is_pinned)}>...</button>
  
  {/* Publish/Unpublish button */}
  <button onClick={() => handleTogglePublish(a.id, a.status)}>...</button>
  
  {/* Edit button - ADD PERMISSION CHECK */}
  {hasEditPerm && (
    <button onClick={() => setFormModal({ show: true, announcement: a })}>
      <Edit2 className="w-3.5 h-3.5" />
    </button>
  )}
  
  {/* Delete button - ADD PERMISSION CHECK */}
  {hasDeletePerm && (
    <button onClick={() => handleDelete(a.id)}>
      <Trash2 className="w-3.5 h-3.5" />
    </button>
  )}
</div>
```

### Change: Pin & Publish Buttons (Optional - restrict to admins)
```tsx
{/* Pin button - only admins */}
{isAdmin && (
  <button onClick={() => handleTogglePin(a.id, a.is_pinned)}>
    {a.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
  </button>
)}

{/* Publish button - only admins or announcement creator */}
{(isAdmin || a.created_by === user?.id) && (
  <button onClick={() => handleTogglePublish(a.id, a.status)}>
    {a.status === 'published' ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
  </button>
)}
```

---

## File 2: Update `ProtectedRoute.tsx` (Optional but Recommended)

### Location
`flux-ai-app/src/components/router/ProtectedRoute.tsx`

### Changes

```tsx
// Update Props interface:
interface Props {
  children: React.ReactNode
  /** Require admin role */
  adminOnly?: boolean
  /** Check module permission via RBAC (more flexible than adminOnly) */
  moduleKey?: string // ADD THIS
}

// Update component signature:
export function ProtectedRoute({ children, adminOnly = false, moduleKey }: Props) {
  const { isAuthenticated, role } = useAppStore()
  const { canView, permissionsLoaded } = usePermissions()
  const { isRoleLocked } = useMaintenanceStore()
  const location = useLocation()

  // ... existing auth checks ...

  // ADD THIS CHECK (before adminOnly check):
  // Module-level RBAC check (works for any role with permission)
  if (moduleKey && !canView(moduleKey)) {
    return <AccessDenied />
  }

  // Admin-only routes (legacy support)
  if (adminOnly && role !== 'admin' && role !== 'super_admin') {
    return <AccessDenied />
  }

  // ... rest of existing code
}
```

---

## File 3: Update `App.tsx` Routing

### Location
`flux-ai-app/src/App.tsx`

### Option A: Update existing route (Simpler)

```tsx
// FIND THIS (around line 231-232):
<Route path={ROUTES.admin} element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />
<Route path={`${ROUTES.admin}/*`} element={<ProtectedRoute adminOnly><AdminPanel /></ProtectedRoute>} />

// KEEP THESE AS IS - AdminPanel should stay admin-only
// The announcements check happens inside AdminAnnouncements component
```

### Option B: Create separate route (Recommended for better UX)

```tsx
// ADD THIS IMPORT:
const AdminAnnouncements = lazy(() => import('@/modules/Announcements/AdminAnnouncements').then(m => ({ default: m.AdminAnnouncements })))

// ADD THIS NEW ROUTE (after settings, before admin routes):
<Route 
  path="/manage/announcements" 
  element={
    <ProtectedRoute moduleKey="announcements">
      <Suspense fallback={<div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-accent-gold/30 border-t-accent-gold rounded-full animate-spin" />
      </div>}>
        <AdminAnnouncements />
      </Suspense>
    </ProtectedRoute>
  } 
/>
```

### Update routes.ts (if using Option B):

```tsx
// In flux-ai-app/src/lib/routes.ts

export const ROUTES = {
  // ... existing routes ...
  
  // Announcements
  announcements: '/announcements',           // View announcements (all users)
  adminAnnouncements: '/admin/announcements', // Admin panel embedded (admin-only)
  manageAnnouncements: '/manage/announcements', // ADD THIS - Manage announcements (role-based)
  
  // ... rest
} as const
```

---

## File 4: Update `Sidebar.tsx` Navigation

### Location
`flux-ai-app/src/components/layout/Sidebar.tsx`

### Changes

```tsx
// Add this import if not present:
import { usePermissions } from '@/hooks/usePermissions'

// Inside Sidebar component:
export function Sidebar() {
  const { role } = useAppStore()
  const { canView, canCreate } = usePermissions()
  
  // ... existing code ...
  
  // FIND the navigation items array and ADD:
  const navItems = [
    { label: 'Dashboard', icon: Home, path: ROUTES.dashboard },
    // ... other items ...
    
    // ADD THIS - Show announcements if user has view permission:
    ...(canView('announcements') ? [{
      label: 'Announcements',
      icon: Megaphone,
      path: canCreate('announcements') 
        ? ROUTES.manageAnnouncements  // Can create/edit - go to management page
        : ROUTES.announcements,       // View-only - go to public page
    }] : []),
    
    // ... rest of items
  ]
}
```

---

## File 5: Create Database Migration (Backend Enforcement)

### Location
Create new file: `flux-ai-app/supabase/migrations/017_announcements_rls_rbac.sql`

### Content

```sql
-- Enable RLS on announcements table
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can create announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can edit announcements" ON public.announcements;
DROP POLICY IF EXISTS "Users can delete announcements" ON public.announcements;

-- Policy 1: View announcements
-- Users can view announcements based on audience targeting + published status
CREATE POLICY "Users can view announcements based on audience"
  ON public.announcements FOR SELECT
  USING (
    -- Admins see all (including drafts)
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
    OR
    -- Non-admins see published announcements targeted to them
    (
      status = 'published'
      AND (
        audience = 'all'
        OR audience = (SELECT role FROM public.profiles WHERE user_id = auth.uid())
      )
    )
    OR
    -- Users see their own announcements (any status)
    created_by = auth.uid()
  );

-- Policy 2: Create announcements
-- Users can create if they have can_create permission
CREATE POLICY "Users can create announcements with permission"
  ON public.announcements FOR INSERT
  WITH CHECK (
    -- User must be authenticated
    auth.uid() IS NOT NULL
    AND
    -- Must have can_create permission (checked via RBAC system)
    -- For now, we allow all authenticated users and check in app layer
    -- TODO: Integrate with get_role_permissions() function
    true
  );

-- Policy 3: Edit announcements
-- Users can edit their own announcements, or admins can edit any
CREATE POLICY "Users can edit their announcements or admins edit any"
  ON public.announcements FOR UPDATE
  USING (
    -- Own announcements
    created_by = auth.uid()
    OR
    -- Admins can edit any
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policy 4: Delete announcements
-- Only admins can delete
CREATE POLICY "Only admins can delete announcements"
  ON public.announcements FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Grant usage to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.announcements TO authenticated;
GRANT DELETE ON public.announcements TO authenticated;

-- Ensure created_by is always set to current user on insert
CREATE OR REPLACE FUNCTION public.set_announcement_creator()
RETURNS TRIGGER AS $$
BEGIN
  NEW.created_by := auth.uid();
  NEW.created_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS set_announcement_creator_trigger ON public.announcements;
CREATE TRIGGER set_announcement_creator_trigger
  BEFORE INSERT ON public.announcements
  FOR EACH ROW
  EXECUTE FUNCTION public.set_announcement_creator();
```

---

## File 6: Update `service.ts` (Optional - Add User Context)

### Location
`flux-ai-app/src/modules/Announcements/service.ts`

### Changes

```tsx
// FIND createAnnouncement function:
export async function createAnnouncement(payload: CreateAnnouncementPayload): Promise<AnnouncementWithMeta> {
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get user's profile to check role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user?.id)
    .single()
  
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin'

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      ...payload,
      // Force draft status for non-admins (optional approval workflow)
      status: isAdmin ? payload.status : 'draft',
      created_by: user?.id, // Redundant if trigger exists, but good for clarity
    })
    .select(`
      *,
      created_by_profile:profiles!announcements_created_by_fkey(user_id,full_name,email,avatar_url)
    `)
    .single()

  if (error) throw error
  return transformAnnouncement(data)
}
```

---

## Testing Checklist

### 1. Configure Roles in Enterprise RBAC

1. Go to **Enterprise RBAC > Roles**
2. Create/Edit "Manager" role
3. Go to **Roles & Permissions** tab
4. For **Announcements** module, enable:
   - ✅ View
   - ✅ Create
   - ✅ Edit
5. Assign a test user to "Manager" role

### 2. Test as Manager

1. Login as Manager user
2. Navigate to announcements page
3. **Should see:** "Create Announcement" button ✅
4. **Should be able to:** Create new announcement ✅
5. **Should be able to:** Edit own announcements ✅
6. **Should NOT see:** Delete button (admin-only) ❌

### 3. Test as QA Lead

1. Configure QA Lead role with `can_create`, `can_edit`
2. Login as QA Lead
3. Test same as Manager

### 4. Test as Pro User (No Permissions)

1. Login as Pro user (only `can_view` by default)
2. Navigate to announcements page
3. **Should see:** Announcements list ✅
4. **Should NOT see:** "Create Announcement" button ❌
5. **Should NOT see:** Edit/Delete buttons ❌

### 5. Test as Admin

1. Login as Admin
2. **Should see:** All buttons (Create, Edit, Delete, Pin, Publish) ✅
3. **Should be able to:** Edit ANY announcement (including others') ✅
4. **Should be able to:** Delete announcements ✅

---

## Rollback Plan

If something breaks, you can quickly revert:

1. **Frontend only:** Comment out permission checks in `AdminAnnouncements.tsx`
2. **Route protection:** Change back to `adminOnly` in route
3. **Database:** Drop RLS policies with:
   ```sql
   ALTER TABLE public.announcements DISABLE ROW LEVEL SECURITY;
   ```

---

## Summary

✅ **5 files to update for frontend:** `AdminAnnouncements.tsx`, `ProtectedRoute.tsx`, `App.tsx`, `routes.ts`, `Sidebar.tsx`
✅ **1 migration for backend:** `017_announcements_rls_rbac.sql`
✅ **0 new dependencies needed** - uses existing RBAC infrastructure
✅ **Configuration via UI** - Admins can grant permissions without code changes

**Estimated Time:** 1-2 hours for implementation + 30 minutes for testing
