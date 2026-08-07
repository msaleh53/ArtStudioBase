# Mobile-Friendly UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the dashboard shell and its pages usable on phone-width viewports without changing desktop behavior.

**Architecture:** The desktop sidebar (`src/app/(dashboard)/layout.tsx`, `nav-links.tsx`) is hidden below the `md:` breakpoint (768px) and replaced with a fixed bottom tab bar (new `bottom-tab-bar.tsx`). The tab bar's "Clients" tab opens a bottom-sheet variant of the existing `Dialog` primitive. Two pages have non-responsive fixed-column grids (`finance/page.tsx`, `commissions/board.tsx`) that get mobile-first breakpoints or, for the kanban board, a horizontally snap-scrolling row. Thirteen pages share a `p-8` main-tag padding pattern that becomes `p-4 md:p-8`.

**Tech Stack:** Next.js App Router, React Server/Client Components, Tailwind CSS v4, radix-ui (via `src/components/ui/dialog.tsx`), lucide-react icons.

## Global Constraints

- Mobile breakpoint is Tailwind's default `md:` (768px) — below it is "mobile", at/above it is "desktop". No other breakpoint is introduced.
- Desktop layout and behavior (≥768px) must be visually unchanged after this plan.
- No new routes. Only two new files: `bottom-tab-bar.tsx` and (if a component grows unwieldy) no splits are anticipated beyond that.
- Reuse `src/components/ui/dialog.tsx` for the Clients bottom sheet — do not build a new overlay primitive.
- Tailwind v4 is in use: use standalone `scale`/`translate`/`rotate` utilities, not `transform: scale(...)`, if any transform utility is needed (per prior project learning).
- Never verify against the real account (`saleh.mayada@gmail.com`). All live verification uses a disposable Supabase test user created via `npm run seed -- <email> <password>`, and that user (plus any rows/storage it created) must be fully deleted at the end of the verification task.

---

### Task 1: Bottom tab bar navigation + hide sidebar on mobile

**Files:**
- Modify: `src/app/(dashboard)/nav-links.tsx` (export `NAV_GROUPS`, `NavItem`, `NavGroup`)
- Create: `src/app/(dashboard)/bottom-tab-bar.tsx`
- Modify: `src/app/(dashboard)/layout.tsx`

**Interfaces:**
- Consumes: `logout` from `./actions` — `export async function logout(): Promise<void>` (existing, unchanged).
- Produces: `export const NAV_GROUPS: NavGroup[]` and `export type NavItem = { href: string; label: string }`, `export type NavGroup = { label: string; items: NavItem[] }` from `nav-links.tsx`. `export function BottomTabBar({ logoutAction }: { logoutAction: () => Promise<void> }): JSX.Element` from `bottom-tab-bar.tsx`.

- [ ] **Step 1: Export the shared nav data from `nav-links.tsx`**

In `src/app/(dashboard)/nav-links.tsx`, change the two type declarations and the const to be exported (everything else in the file is unchanged):

```tsx
export type NavItem = { href: string; label: string };
export type NavGroup = { label: string; items: NavItem[] };

export const NAV_GROUPS: NavGroup[] = [
```

- [ ] **Step 2: Create the bottom tab bar component**

Create `src/app/(dashboard)/bottom-tab-bar.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { LayoutDashboard, Image as ImageIcon, Users, Wallet, Package, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { NAV_GROUPS, type NavItem } from "./nav-links";

const TAB_ICONS: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/artworks": ImageIcon,
  "/finance": Wallet,
  "/inventory": Package,
};

const STANDALONE_HREFS = ["/dashboard", "/artworks", "/finance", "/inventory"] as const;

function findItem(href: string): NavItem {
  for (const group of NAV_GROUPS) {
    const item = group.items.find((i) => i.href === href);
    if (item) return item;
  }
  throw new Error(`Nav item not found: ${href}`);
}

const clientsGroup = NAV_GROUPS.find((g) => g.label === "Clients")!;

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomTabBar({ logoutAction }: { logoutAction: () => Promise<void> }) {
  const pathname = usePathname();
  const [clientsOpen, setClientsOpen] = useState(false);

  const [dashboardItem, artworksItem, financeItem, inventoryItem] = STANDALONE_HREFS.map(findItem);
  const clientsActive = clientsGroup.items.some((i) => isActive(pathname, i.href));

  return (
    <>
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-hairline flex items-stretch h-16">
        <TabLink item={dashboardItem} active={isActive(pathname, dashboardItem.href)} />
        <TabLink item={artworksItem} active={isActive(pathname, artworksItem.href)} />
        <button
          type="button"
          onClick={() => setClientsOpen(true)}
          aria-current={clientsActive ? "page" : undefined}
          className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium ${
            clientsActive ? "text-electric-cobalt" : "text-ink-charcoal"
          }`}
        >
          <Users className="size-5" />
          Clients
        </button>
        <TabLink item={financeItem} active={isActive(pathname, financeItem.href)} />
        <TabLink item={inventoryItem} active={isActive(pathname, inventoryItem.href)} />
      </nav>

      <Dialog open={clientsOpen} onOpenChange={setClientsOpen}>
        <DialogContent
          showCloseButton
          className="inset-x-0 left-0 bottom-0 top-auto w-full max-w-none translate-x-0 translate-y-0 rounded-b-none rounded-t-xl sm:max-w-none"
        >
          <DialogHeader>
            <DialogTitle>Clients</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1">
            {clientsGroup.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setClientsOpen(false)}
                className="px-3 py-2 rounded-md text-sm font-medium text-ink-charcoal hover:bg-canvas-cream"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm" className="rounded-pill w-full">
              Log out
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function TabLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = TAB_ICONS[item.href];
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={`flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium ${
        active ? "text-electric-cobalt" : "text-ink-charcoal"
      }`}
    >
      <Icon className="size-5" />
      {item.label}
    </Link>
  );
}
```

- [ ] **Step 3: Wire the tab bar into the dashboard layout and hide the sidebar on mobile**

Replace the full contents of `src/app/(dashboard)/layout.tsx`:

```tsx
import { logout } from "./actions";
import { Button } from "@/components/ui/button";
import { NavLinks } from "./nav-links";
import { BottomTabBar } from "./bottom-tab-bar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas-cream flex">
      <aside className="hidden md:flex md:flex-col w-[220px] shrink-0 bg-white border-r border-hairline p-4 justify-between sticky top-0 h-screen">
        <div>
          <p className="font-semibold text-ink-charcoal px-3 mb-4">Studio</p>
          <NavLinks />
        </div>
        <form action={logout}>
          <Button variant="outline" size="sm" className="rounded-pill w-full">Log out</Button>
        </form>
      </aside>
      <div className="flex-1 min-w-0 pb-16 md:pb-0">{children}</div>
      <BottomTabBar logoutAction={logout} />
    </div>
  );
}
```

- [ ] **Step 4: Type-check and lint**

Run: `npm run lint`
Expected: no errors in the three touched/created files.

Run: `npx tsc --noEmit`
Expected: no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/nav-links.tsx src/app/\(dashboard\)/bottom-tab-bar.tsx src/app/\(dashboard\)/layout.tsx
git commit -m "Add mobile bottom tab bar, hide sidebar below md breakpoint"
```

---

### Task 2: Responsive grids on the finance page

**Files:**
- Modify: `src/app/(dashboard)/finance/page.tsx`

**Interfaces:**
- None — pure Tailwind class changes, no signature changes.

- [ ] **Step 1: Fix the two fixed-column grids**

In `src/app/(dashboard)/finance/page.tsx`, line 46, change:

```tsx
<div className="grid grid-cols-3 gap-4">
```
to:
```tsx
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
```

Line 76, change:

```tsx
<div className="grid grid-cols-2 gap-6">
```
to:
```tsx
<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/finance/page.tsx
git commit -m "Make finance page grids responsive on mobile"
```

---

### Task 3: Horizontally scrolling commissions board on mobile

**Files:**
- Modify: `src/app/(dashboard)/commissions/board.tsx`

**Interfaces:**
- None — pure Tailwind class changes, no signature changes.

- [ ] **Step 1: Change the board grid to scroll horizontally on mobile, grid on desktop**

In `src/app/(dashboard)/commissions/board.tsx`, change:

```tsx
    <div className="grid grid-cols-5 gap-4">
      {STAGES.map((stage) => (
        <div key={stage.key} className="space-y-3">
```
to:
```tsx
    <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 md:grid md:grid-cols-5 md:overflow-visible md:pb-0">
      {STAGES.map((stage) => (
        <div key={stage.key} className="min-w-[85%] shrink-0 snap-center space-y-3 md:min-w-0 md:shrink md:snap-none">
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/commissions/board.tsx
git commit -m "Make commissions kanban board horizontally scrollable on mobile"
```

---

### Task 4: Reduce main-tag padding on mobile across dashboard pages

**Files:**
- Modify (mechanical, same change in each): `src/app/(dashboard)/customers/[id]/page.tsx`, `src/app/(dashboard)/customers/page.tsx`, `src/app/(dashboard)/exhibitions/[id]/page.tsx`, `src/app/(dashboard)/commissions/page.tsx`, `src/app/(dashboard)/exhibitions/page.tsx`, `src/app/(dashboard)/inventory/page.tsx`, `src/app/(dashboard)/dashboard/page.tsx`, `src/app/(dashboard)/inventory/materials/page.tsx`, `src/app/(dashboard)/finance/expenses/page.tsx`, `src/app/(dashboard)/finance/page.tsx`, `src/app/(dashboard)/finance/income/page.tsx`, `src/app/(dashboard)/artworks/page.tsx`, `src/app/(dashboard)/artworks/[id]/page.tsx`

**Interfaces:**
- None — pure Tailwind class changes, no signature changes.

Every file in this list has exactly one `<main className="p-8 max-w-...">` tag. This step changes `p-8` to `p-4 md:p-8` in that tag only, in all thirteen files at once.

- [ ] **Step 1: Apply the padding change**

```bash
grep -rl 'className="p-8 max-w-' "src/app/(dashboard)" | xargs sed -i '' 's/className="p-8 max-w-/className="p-4 md:p-8 max-w-/'
```

- [ ] **Step 2: Verify exactly 13 files changed and no unintended matches**

```bash
git diff --stat
```

Expected: 13 files listed above, one line changed (`-`/`+` pair) each. No other files touched.

```bash
grep -rn 'className="p-8 max-w-' "src/app/(dashboard)"
```

Expected: no output (all matches replaced).

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)
git commit -m "Reduce main-tag padding on mobile across dashboard pages"
```

---

### Task 5: Live verification on a disposable test account

**Files:** none (verification only — no source changes expected; if this task finds a bug, fix it in the relevant file from Tasks 1-4 and re-verify before continuing).

**Interfaces:** none.

This task follows the project's established pattern: never test against the real account (`saleh.mayada@gmail.com`); always use a disposable Supabase test user, exercise the feature live in a browser, then fully clean up.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev &
```

Wait for "Ready" in the output before continuing.

- [ ] **Step 2: Create a disposable test user**

```bash
npm run seed -- mobile-ui-test+$(date +%s)@example.test TestPassword123!
```

Note the printed user id and the email/password used — they're needed for login and cleanup.

- [ ] **Step 3: Log in as the test user and seed a little real content through the UI**

Using the Playwright browser tools:
- `browser_navigate` to `http://localhost:3000/login`, log in with the test email/password from Step 2.
- Resize to a desktop width first (`browser_resize` 1280x900) and use the app's own forms to create: one customer (Customers page), one commission for that customer (Commissions page — this exercises the kanban board), move that commission to a different stage than the default so two board columns are non-empty, one income row and one expense row (Finance page). Skip artwork creation (it requires an image upload and isn't needed to verify layout).

This gives the commissions board and finance grid real content to check reflow against, per the project's rule that scroll- and layout-dependent bugs need non-empty test data to surface.

- [ ] **Step 4: Verify mobile layout (375×812, e.g. iPhone SE/12 width)**

Using Playwright tools, `browser_resize` to 375x812, then for each of `/dashboard`, `/artworks`, `/customers`, `/commissions`, `/exhibitions`, `/finance`, `/inventory`:
- `browser_navigate` to the page.
- `browser_take_screenshot` and confirm: the sidebar is not visible, the bottom tab bar is visible and not overlapping page content (nothing is hidden behind it), and page padding looks reasonable (not cramped, not the old wide desktop padding).
- On `/commissions`, confirm the board scrolls horizontally (use `browser_snapshot` or a drag/scroll interaction) and columns snap.
- On `/finance`, confirm the three summary tiles stack to one column and the two "Recent income/expenses" sections stack to one column.

Then, still at 375×812:
- Click each of the 5 bottom tabs (`browser_click`) and confirm navigation to the right page and the correct tab highlighted as active.
- Click "Clients", confirm the bottom sheet opens listing Customers/Commissions/Exhibitions, click "Customers", confirm it navigates there and the sheet closes.
- Reopen "Clients", click "Log out" inside the sheet, confirm it logs out and redirects to `/login`. Log back in for continued testing if more checks remain.

- [ ] **Step 5: Verify desktop layout is unchanged (1280×900)**

`browser_resize` to 1280x900, navigate to `/dashboard`, `/commissions`, `/finance`:
- Confirm the sidebar is visible and the bottom tab bar is not rendered.
- Confirm the commissions board is a 5-column grid (not scrolling) and the finance grids are back to `grid-cols-3` / `grid-cols-2` layouts.
- `browser_take_screenshot` and visually compare against pre-change expectations (no visual regression from before this plan).

- [ ] **Step 6: Fix anything broken, then re-run the relevant part of Steps 4-5**

If any check fails, fix it in the appropriate file from Tasks 1-4, commit the fix, and re-verify before moving on.

- [ ] **Step 7: Clean up the test user and any data it created**

```bash
set -a; source .env.local; set +a
psql "$DATABASE_URL" -c "DELETE FROM commissions WHERE user_id = '<test-user-id>';"
psql "$DATABASE_URL" -c "DELETE FROM customers WHERE user_id = '<test-user-id>';"
psql "$DATABASE_URL" -c "DELETE FROM income WHERE user_id = '<test-user-id>';"
psql "$DATABASE_URL" -c "DELETE FROM expenses WHERE user_id = '<test-user-id>';"
```

Then delete the auth user itself (service-role key, from `.env.local`):

```bash
npx tsx -e '
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
config({ path: ".env.local" });
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
supabase.auth.admin.deleteUser("<test-user-id>").then(({ error }) => {
  if (error) { console.error(error); process.exit(1); }
  console.log("deleted");
});
'
```

Confirm no Storage objects were created for this user (none should be, since Step 3 skipped artwork/image upload).

- [ ] **Step 8: Stop the dev server and confirm a clean tree**

```bash
kill %1
git status
```

Expected: no uncommitted changes, no leftover temp scripts.
