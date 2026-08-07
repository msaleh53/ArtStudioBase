# Mobile-Friendly UI — Design

## Problem

The dashboard shell and several pages assume a desktop viewport. The sidebar is a fixed 220px column with no responsive behavior at all, and a few page grids use fixed column counts with no mobile breakpoint. On a phone, content is squeezed illegibly or overflows.

## Scope

Whole dashboard shell (nav) plus every page confirmed to break on small screens: `finance`, `commissions` (kanban board), and page padding across the app. Desktop layout and behavior are unchanged.

## 1. Navigation

**Desktop (`md:` and up, ≥768px):** current sidebar (`src/app/(dashboard)/layout.tsx`, `nav-links.tsx`) is unchanged.

**Mobile (<768px):** sidebar is hidden. Replaced by a fixed bottom tab bar with 5 items, condensed from the current 7 nav destinations / 4 groups:

- Dashboard
- Artworks
- Clients (opens a bottom sheet listing Customers / Commissions / Exhibitions)
- Finance
- Inventory

Each tab shows an icon + short label. The active tab uses the same cobalt highlight styling currently used for the active sidebar link.

**Implementation:**
- `nav-links.tsx`'s `NAV_GROUPS` data becomes the single shared source of truth, consumed by both a desktop `<SidebarNav>` (current markup, extracted) and a new mobile `<BottomTabBar>`.
- The Clients sheet reuses the existing `Dialog` primitive (`src/components/ui/dialog.tsx`) in a slide-up-from-bottom variant.
- Page content needs bottom padding (e.g. `pb-20`) on mobile so the fixed tab bar never covers content.
- The "Log out" button currently lives in the sidebar footer, which disappears on mobile. It moves into the Clients-style sheet or a small top-right menu, shown only on mobile.

## 2. Broken grids

Confirmed via grep across dashboard pages (`grid-cols-[3-9]` with no responsive prefix):

- **`finance/page.tsx`**: `grid-cols-3` (line ~46) and `grid-cols-2` (line ~76) have no mobile breakpoint. Fix: `grid-cols-1 sm:grid-cols-3` and `grid-cols-1 md:grid-cols-2`, matching the pattern already used correctly in `artworks/page.tsx` (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`) and `dashboard/page.tsx`.
- **`commissions/board.tsx`**: `grid-cols-5` kanban board. This is a board, not a stat grid — stacking columns vertically would lose the board's mental model. On mobile it becomes a horizontally scrollable, snap-scrolling row: `flex overflow-x-auto snap-x`, each column `min-w-[85%] shrink-0 snap-center`. Desktop keeps the 5-column grid.

## 3. Page chrome

- Pages currently use uniform `p-8` (e.g. `inventory/page.tsx`). On mobile this eats too much horizontal space. Change to `p-4 md:p-8` wherever this pattern appears across dashboard pages.
- Spot-check list-row items (inventory, materials — `flex justify-between text-sm`) wrap sanely at narrow widths. These are expected to already be fine; only fix if actually broken.

## Out of scope

- No changes to desktop layout or behavior.
- No new routes. This is styling plus two new shell components: `<BottomTabBar>` and the Clients bottom sheet.

## Testing

Verify with the browser at mobile viewport widths (e.g. 375px, 414px) on: dashboard, artworks, customers, commissions (board scroll), exhibitions, finance (grid reflow), inventory. Confirm the bottom tab bar doesn't cover page content and the Clients sheet opens/closes and navigates correctly. Confirm desktop (≥768px) is visually unchanged.
