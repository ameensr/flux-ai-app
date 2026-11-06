# StoryPot Module — Working Documentation

## Overview

StoryPot is a QA workflow module that bridges **OpenProject** (external project management tool) and the Qaly platform. Its core purpose is to let QA teams track when work packages (tickets) were **"Forwarded to the Testing Team"** — capturing the exact date, time, and actor of that status transition — and then export those tickets to the Release Tracker or Support Tracker.

The module operates in two modes:
- **CachedStoryPot** (default, active) — syncs data to Supabase once, then filters instantly from the local cache.
- **LegacyStoryPot** (kept for reference) — fetches directly from OpenProject on every search.

---

## Architecture

```
OpenProject API
      │
      ▼
storypot-cache.ts (sync service)
      │  fetchAllWorkPackages + fetchTestingStatusChanges
      │
      ▼
Supabase Tables
  ├── openproject_work_packages_cache   ← latest forwarding event per ticket
  └── openproject_forwarding_history    ← full history of all forwarding events
      │
      ▼
useStoryPotCache.ts (React hook)
      │  queryCachedWorkPackages / getCachedStats / getCachedFilterOptions
      │
      ▼
CachedStoryPot.tsx (UI)
  ├── CachedFilters.tsx
  ├── WorkPackageRow.tsx
  ├── StatsCards.tsx
  ├── SyncButton.tsx
  ├── Pagination.tsx
  └── DropdownPortal.tsx
```

---

## File Structure

| File | Role |
|---|---|
| `src/modules/StoryPot/index.tsx` | Re-exports `CachedStoryPot` as default |
| `src/modules/StoryPot/CachedStoryPot.tsx` | Main UI component |
| `src/modules/StoryPot/LegacyStoryPot.tsx` | Original direct-fetch version (reference only) |
| `src/modules/StoryPot/CachedFilters.tsx` | Filter panel (search, dropdowns, date range) |
| `src/modules/StoryPot/WorkPackageRow.tsx` | Single ticket row renderer |
| `src/modules/StoryPot/StatsCards.tsx` | Testing status bar + QA Missed stat cards |
| `src/modules/StoryPot/SyncButton.tsx` | Sync trigger button + progress bar |
| `src/modules/StoryPot/Pagination.tsx` | Page navigation controls |
| `src/modules/StoryPot/DropdownPortal.tsx` | Portal-based dropdown (avoids z-index clipping) |
| `src/modules/StoryPot/store.ts` | Zustand store (used by LegacyStoryPot) |
| `src/modules/StoryPot/types.ts` | TypeScript interfaces + `cachedToDisplay()` converter |
| `src/hooks/useStoryPotCache.ts` | React hook wrapping all cache service calls |
| `src/services/storypot-cache.ts` | Core sync + query service (Supabase operations) |

---

## Database Tables

### `openproject_work_packages_cache`
Stores the latest snapshot of every OpenProject work package per project.

Key columns:
- `id` — OpenProject work package ID (primary key)
- `project_id` — Qaly project UUID (FK → `projects`)
- `op_project_id` — OpenProject internal project ID (for sub-project filtering)
- `forwarded_to_testing_at` — Timestamp of the **latest** "Forwarded to the Testing Team" transition
- `forwarded_to_testing_by` — Name of the person who made that transition
- `handoff_verified` — `true` if the date came from verified activity history
- `handoff_count` — Number of times the ticket was forwarded (for repeat-forwarding detection)
- `testing_status`, `is_qa_missed`, `qa_confirmation` — QA custom fields from OpenProject
- `release_tag` — Release version (custom field, used for Bug type filtering)
- `last_synced_at` — When this row was last written

### `openproject_forwarding_history`
Stores **every individual** "Forwarded to the Testing Team" transition event per ticket. The cache table keeps only the latest; this table preserves the full history.

Key columns:
- `wp_id` — Work package ID
- `changed_at` — Exact timestamp of the transition
- `changed_by` — Actor who made the change
- `old_value` / `new_value` — Testing Status before and after
- `UNIQUE(wp_id, changed_at)` — Prevents duplicate events on re-sync

### `openproject_sync_status`
Tracks the last sync state per project/op_project combination.

Key columns:
- `last_full_sync_at` — Timestamp of last completed sync
- `last_sync_status` — `pending | running | completed | completed_with_errors | failed`
- `total_work_packages` — Count of synced tickets
- `work_packages_with_forwarding_date` — Count with a verified forwarding date

---

## RBAC & Permissions

Module key: `story-pot`

| Permission | Roles | Effect |
|---|---|---|
| `can_view` | All roles | Can open the StoryPot page |
| `can_view_dashboard` | admin, super_admin, pro, manager, qa_lead | Sees stat cards (Total, QA Missed) |
| `can_export` | All except `free` | Sees checkboxes + floating export bar |
| `can_import` | admin, super_admin, manager | Sees the Sync Data button |

RLS policies on both cache tables enforce:
- **SELECT**: project members only
- **INSERT/UPDATE/DELETE**: users with `can_import` on `story-pot` (checked via `role_module_permissions`)

---

## Sync Flow (CachedStoryPot)

When a user with `can_import` clicks **Sync Data**, `syncWorkPackagesToCache()` runs four phases:

1. **Fetching** — Calls `fetchAllWorkPackages()` with concurrent batching (200/page, 5 concurrent). Streams progress to the UI.

2. **Processing** — Formats each raw OpenProject work package via `formatWorkPackage()`.

3. **Syncing Activities** — Calls `fetchTestingStatusChanges()` for **all** work packages (not just those currently showing a forwarded status, because a ticket may have been forwarded and then had its status changed again). Builds a map of `wp_id → TestingStatusChange[]`.

4. **Saving** — Upserts to `openproject_work_packages_cache` in batches of 500. Then upserts all forwarding events to `openproject_forwarding_history` (idempotent via `UNIQUE(wp_id, changed_at)`). Updates `openproject_sync_status`.

---

## Query & Filter Flow

After sync, all filtering is done against Supabase — no OpenProject API calls needed.

`queryCachedWorkPackages()` builds a Supabase query with these filter columns:

| Filter | Column | Match type |
|---|---|---|
| Forwarded date from/to | `forwarded_to_testing_at` | `gte` / `lte` (IST offset applied: `+05:30`) |
| Type | `type` | exact |
| Status | `status` | exact |
| Priority | `priority` | exact |
| Release | `release_tag` | exact |
| Testing Status | `testing_status` | `ilike` |
| QA Missed | `is_qa_missed` | `ilike` |
| Author | `author` | exact |
| Assignee | `assignee` | exact |
| Search | `subject` / `id` | `ilike` / exact |

When **any filter is active**, the query uses `range(0, 99999)` to bypass Supabase's default 1000-row cap and return all matching rows. Pagination is then applied client-side in the hook.

Default ordering: `forwarded_to_testing_at ASC NULLS LAST`, then `updated_at DESC`.

---

## useStoryPotCache Hook

The hook manages all data-fetching state for `CachedStoryPot`. It exposes:

**Data**
- `workPackages` — current page of `CachedWorkPackage[]`
- `totalCount` — total matching records
- `stats` — global unfiltered counts (total, overdue, byTestingStatus, QA Missed breakdown)
- `filteredByTestingStatus` — testing status counts for the **current filter set**
- `filteredQaMissed` — QA Missed yes/no/unknown for the **current filter set**
- `filterOptions` — distinct values for all filter dropdowns (populated from cache)
- `syncStatus` — last sync timestamp and status

**State**
- `filters` / `setFilters` / `resetFilters` — filter state management
- `page`, `pageSize`, `totalPages`, `goToPage`, `changePageSize` — pagination
- `activeFilterCount` — count of non-empty filter fields
- `isBugType` — `true` when `filters.type === 'bug'` (shows Release filter)

**Actions**
- `sync()` — triggers full sync from OpenProject
- `clearCache()` — deletes cached data for the project
- `refetch()` — re-queries without re-syncing

**Loading flags**
- `isLoading` — data query in progress
- `isSyncing` — sync in progress
- `syncProgress` — `{ phase, current, total, message }` for the progress bar
- `hasData` — `true` if `syncStatus.lastSyncAt` exists

---

## UI Components

### CachedStoryPot (main)
- Loads Qaly projects (those with `metadata->openproject` configured) from Supabase.
- Loads OpenProject sub-projects from the OpenProject API when a Qaly project is selected.
- Passes `projectId`, `opProjectId`, and `config` to `useStoryPotCache`.
- Renders: project dropdowns → sync button → filter panel → stats → work package list → pagination → floating export bar.

### CachedFilters
- Search input (by ID or subject).
- Dropdowns: Type, Status, Priority, Release (Bug only), Author, Assignee, Testing Status, QA Missed.
- Date range section: "Date Status Changed to Forwarded to the Testing Team" (from/to). Filters on `forwarded_to_testing_at` stored in UTC, converted from IST on input.

### WorkPackageRow
- Renders a single ticket with badges (status, type, release, overdue, testing status).
- Shows a **handoff event block** when `handoff_verified = true`: displays forwarding date, time, actor, current testing status, and a repeat-count badge if `handoff_count > 1`.
- Shows an amber "Transition date unavailable" indicator when `forwarded_to_testing_at` is set but `handoff_verified = false`.
- Links directly to the ticket in OpenProject (`{openproject_url}/work_packages/{id}`).

### StatsCards
- **Testing Status strip** — always visible; a proportional color bar showing distribution across all testing statuses. Uses filter-aware counts when filters are active.
- **Stat cards** — visible only to users with `can_view_dashboard`: Total/Filtered count and QA Missed breakdown (Yes / No / Unknown).

### SyncButton
- Shows "Sync Data" (no cache) or "Re-sync" (cache exists).
- During sync: shows phase label + percentage (Fetching / Processing / Activities / Saving).
- After sync: shows last sync date/time in green.

### DropdownPortal
- Renders dropdown menus via `ReactDOM.createPortal` into `document.body` to avoid z-index and overflow clipping issues from parent containers.
- Positions itself relative to the trigger button using `getBoundingClientRect()`.
- Closes on outside click or Escape key.

---

## Export Flow

Users with `can_export` can select tickets via checkboxes and export to:

**Release Tracker** (`/release-tracker?import=storypot`)
- Writes to `sessionStorage['storypot_export_release']`
- Fields: `openproject_id`, `description`, `release_version`, `priority`, `received_date_time` (uses `forwarded_to_testing_at` if available), `assigned_to_name`, `author`, `forwarded_to_testing_at`, `forwarded_to_testing_by`

**Support Tracker** (`/support-tracker?import=storypot`)
- Writes to `sessionStorage['storypot_export_support']`
- Fields: `openproject_id`, `description`, `received_date`, `tester_name`, `author`, `forwarded_to_testing_at`, `forwarded_to_testing_by`

---

## Key Design Decisions

**Why cache instead of live API calls?**
Fetching activity history for hundreds of tickets requires one API call per ticket (N+1 problem). Caching pre-computes all forwarding dates at sync time, making date-range filtering instant.

**Why store full forwarding history separately?**
The cache table keeps only the latest forwarding event for fast date-range queries. The `openproject_forwarding_history` table preserves every event so repeat-forwarding patterns can be analyzed and `handoff_count` is accurate.

**Why `range(0, 99999)` instead of `.limit()`?**
Supabase's PostgREST has a hard default cap of 1000 rows. When filters are active, using `.range(0, 99999)` bypasses this cap so all matching tickets are returned before client-side pagination is applied.

**Why IST offset on date filters?**
Timestamps are stored in UTC. The date picker gives a local date (IST = UTC+5:30). The service converts `YYYY-MM-DD` to `YYYY-MM-DDT00:00:00+05:30` before querying, so "from 2024-01-15" correctly means midnight IST, not midnight UTC.

**Why DropdownPortal?**
The project selection panel uses `overflow: visible` but ancestor containers may clip dropdowns. Portaling to `document.body` guarantees the dropdown always renders on top regardless of stacking context.
