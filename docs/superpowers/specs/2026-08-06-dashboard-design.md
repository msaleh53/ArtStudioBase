# Dashboard Overview Page — Design

## Overview

A quick-glance dashboard that becomes the new landing page after login, replacing the current root redirect to `/artworks`. Purpose: let the artist see, at a single glance, what needs attention today — not a business-analytics view (no revenue totals, no charts).

This work also includes two small polish items bundled into the same pass since they affect first impressions of the deployed app:

1. **Metadata/branding cleanup** — the browser tab still shows the default "Create Next App" title (from `src/app/layout.tsx`'s untouched `metadata` export), and `public/` still has the default Next.js template SVGs (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`), none of which are referenced by any app page.
2. **Seed realistic sample data** — a few artworks (with images), customers, commissions across different pipeline stages, and exhibitions, so the deployed app looks populated rather than empty on first visit.

## Dashboard Page

**Route:** `src/app/(dashboard)/dashboard/page.tsx` — a Server Component, following the existing per-page pattern (`createClient()` → `auth.getUser()` → inline `db` queries scoped with `eq(table.userId, user.id)`). No new Server Actions; the page is read-only.

**Root redirect:** `src/app/page.tsx` changes its redirect target from `/artworks` to `/dashboard`.

**Nav:** the dashboard nav shell (`src/app/(dashboard)/layout.tsx` or wherever the nav links live) gets a new "Dashboard" link, placed first, before "Artworks".

### Sections

1. **Artwork status breakdown** — four stat tiles: In Progress, Finished, Exhibited, Sold, each showing a count. Computed with a single grouped count query (`groupBy(artworks.status)`) scoped to the user.

2. **Needs attention** — commissions where `deadline < today` (overdue) or `deadline` falls within the next 7 days (upcoming soon), excluding commissions already in `finished` or `delivered` stage. Overdue items render in red, matching the existing overdue-date styling already used on the commissions kanban board. Each row shows customer name + deadline + stage, and links to `/commissions`. Query joins `commissions` to `customers` for the name.

3. **Upcoming exhibitions** — exhibitions where `startDate` falls within the next 30 days, or `submissionDeadline` falls within the next 14 days. Sorted soonest-first. Each row shows gallery name + the relevant date, links to `/exhibitions/[id]`.

4. **Recent activity** — the 8 most recently created records, merged across `artworks`, `customers`, and `commissions` (queried separately, then combined and sorted by `createdAt` in application code — dataset is small enough that a SQL `UNION` isn't warranted). Each entry shows a type label (Artwork / Customer / Commission), a short description (title / name / customer name), and links to the relevant detail page.

### Data fetching

All queries run in parallel via `Promise.all`:
- Status counts: 1 grouped query on `artworks`.
- At-risk commissions: 1 query joining `commissions` + `customers`, filtered by stage and deadline window.
- Upcoming exhibitions: 1 query on `exhibitions`, filtered by date windows.
- Recent activity: 3 queries (latest N from each of `artworks`, `customers`, `commissions`), merged in-memory.

Every query is scoped with `eq(table.userId, user.id)` per the app-level RLS-bypass mitigation already documented in `AGENTS.md` / the implementation plan's Global Constraints section — this applies to the dashboard's new queries exactly as it does to every other page.

### Empty states

Each section handles zero rows gracefully (e.g., "No commissions need attention right now", "No upcoming exhibitions") rather than rendering an empty list or crashing on an empty stat tile.

### Styling

Reuses existing Tailwind/DESIGN.md tokens and card styling already established on other pages (`bg-white rounded-card` cards, `text-ink-charcoal` type). No new design tokens needed.

## Metadata/Branding Cleanup

- Update `src/app/layout.tsx`'s `metadata` export: `title` → "Artist Studio" (or similar), `description` → a short one-liner about the app.
- Delete the five unused default Next.js SVGs from `public/`.

## Sample Data Seed

Extend (or add alongside) the existing `scripts/seed.ts` — which currently only creates the Supabase Auth user — with a second script or an optional flag that inserts sample rows directly via `db`:
- 3-4 artworks spanning different statuses (In Progress, Finished, Exhibited, Sold), with real placeholder images uploaded to the Supabase Storage bucket.
- 2 customers.
- 3 commissions across different pipeline stages (including at least one with a near/overdue deadline, to exercise the dashboard's "needs attention" section).
- 2 exhibitions (one with a near-future start date, one further out), with at least one artwork assigned to each (to exercise "upcoming exhibitions" and double-booking-safe state).

This seed step is a one-time manual run against the production Supabase project (same one used throughout this project), not part of the app's runtime code path.
