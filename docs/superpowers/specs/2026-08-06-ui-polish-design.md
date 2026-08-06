# UI Polish (Nav, Trust, Empty States) — Design

## Overview

A focused round of UI improvements following the full design review (see review artifact discussed with the user). Six independent, concrete changes — no schema changes, no new external integrations, UI/presentation only. Scope is deliberately limited to items with an unambiguous, mechanical fix; the review's more subjective items (reordering status-badge hues) are deferred.

## Scope

1. **Sidebar navigation** — replaces the flat top bar with a grouped left sidebar, active-route highlighting, and a small wordmark. Supersedes the review's standalone "just add an active state to the top bar" quick-win, since the nav is being rebuilt in this same plan anyway — no point patching a bar about to be replaced.
2. **Currency formatting** — one shared formatter, applied consistently across `/finance`'s stat tiles and recent-entry lists (currently `$85.50` in tiles vs `$50` in lists on the same page).
3. **Empty-state copy** — one line of muted copy on Artworks, Customers, Commissions, and Exhibitions when the list is empty, matching the tone already established on `/finance` ("No income logged yet.").
4. **Semantic "attention" token** — a new DESIGN.md token for "needs attention / overdue," replacing the two ad-hoc `text-red-600` (Tailwind default, not in the palette) usages that mean "overdue" (dashboard's at-risk commissions, commissions kanban board). The other 8 `text-red-600` usages are form-validation error text — a different meaning — and are explicitly NOT touched by this plan.
5. **Artwork card hover state** — lift + subtle image scale on the artworks gallery grid, so cards signal interactivity before the cursor is mid-click. Respects `prefers-reduced-motion`.
6. **Dashboard activity thumbnails** — small (32–40px) thumbnail next to artwork-type rows in the dashboard's "Recent activity" list, using the same `imagePath`/cache-busting pattern already established on the artwork detail page.
7. **Prune `DESIGN.md`** — the file is not a design system authored for this app; it's a verbatim style-guide extraction from a different SaaS product ("Dock" — references to "Deal Rooms," "Enablement Agent," customer logos "Lattice, BrightHire, Loom," pricing tables). Remove the sections describing components this app never uses, rewrite the two sections that describe that other product's marketing site as if it were this one, and add the two new tokens from items 1 and 4 above. This is documentation hygiene — it does not change any rendered UI.

Out of scope: reordering status-badge colors (subjective, no unambiguous target state), any change to the Finance/Commissions/Exhibitions business logic, mobile-specific responsive redesign beyond what the sidebar naturally needs, Inventory (future feature, not yet built).

## Navigation Redesign

Replaces `src/app/(dashboard)/layout.tsx`'s current flat `<nav>` row.

**Structure:** left sidebar, fixed width 220px, `bg-white`, `border-r border-hairline` (matching the existing top bar's `border-hairline` convention). Content area keeps its current `bg-canvas-cream` and padding.

**Groups** (in order, from the review):
- *Studio* — Dashboard, Artworks
- *Clients* — Customers, Commissions, Exhibitions
- *Money* — Finance

Group labels: small caps, `text-steel-gray`, `text-xs`, `tracking-wide`, `uppercase`, 8px top padding above each group.

**Wordmark:** plain text "Studio" (or similar — final copy is an implementation detail), `font-semibold`, `text-ink-charcoal`, sits above the groups.

**Active state:** the current route's link gets a distinct treatment using the app's *existing* Electric Cobalt token (`#0068f9`) — not a new color. Concretely: a light cobalt-tinted background pill behind the active item's label, cobalt text color, left accent bar (3px, cobalt, rounded). Add a new DESIGN.md token for the light background wash (`--color-cobalt-wash`, roughly `#e6f0ff` — 10% cobalt over white) since no existing token serves this role; this is the one new color this plan introduces, and it is scoped to nav/list active-states only.

**Determining "active":** use Next.js's `usePathname()` in a small client component (the rest of `layout.tsx` can stay a Server Component; only the nav list needs to be client-side to read the pathname) — match by prefix (`/artworks` also highlights for `/artworks/[id]`).

**Mobile:** out of scope for this plan (no breakpoint collapse to a drawer/hamburger) — the sidebar's fixed 220px width is acceptable at the desktop widths this single-user tool is actually used at today. Flagged as a known gap, not silently ignored.

## Currency Formatting

New `src/lib/currency.ts`:
```ts
export function formatCurrency(amount: string | number): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
}
```
Applied to every dollar-amount render on `/finance`, `/finance/income`, `/finance/expenses`: stat tiles, category breakdown, recent-entry lists, and the full income/expense list rows. Not applied to `artworks`/`print-editions` price displays in this plan (separate area, not part of the reviewed inconsistency) — noted as a natural follow-up, not required here.

## Empty States

One line of `text-sm text-slate-gray` copy, shown when the relevant list is empty, matching the existing pattern already used on `/finance`:
- Artworks (`src/app/(dashboard)/artworks/page.tsx`): "No artworks yet — upload your first piece above."
- Customers (`src/app/(dashboard)/customers/page.tsx`): "No customers yet."
- Exhibitions (`src/app/(dashboard)/exhibitions/page.tsx`): "No exhibitions yet."
- Commissions (`src/app/(dashboard)/commissions/board.tsx`): one line above the board, shown only when the total commission count across all stages is zero — not per-column (the board's five columns are a fixed pipeline view, not five independent empty-able lists).

## Semantic Attention Token

New DESIGN.md token: `--color-attention` / Tailwind `text-attention`, value `#b3541e` (muted rust/ochre — deliberately distinct from both Electric Cobalt and the existing red-600 form-error color, so "overdue" reads as its own category rather than "error"). Replaces `text-red-600` in exactly two places:
- `src/app/(dashboard)/dashboard/page.tsx` (at-risk commissions list, the `isCommissionOverdue(...)` conditional)
- `src/app/(dashboard)/commissions/board.tsx` (the `isOverdue(c)` conditional)

Form-validation error text (the other 8 usages of `text-red-600` across the app) is unchanged — it has a different meaning ("this input is invalid") and should stay visually distinct from "this item is overdue."

## Artwork Card Hover State

`src/app/(dashboard)/artworks/page.tsx`'s gallery grid cards: on hover, 2–3px lift via `shadow-lg` (already an existing token), and the artwork image scales to ~1.03 over ~200ms. Wrapped in `motion-reduce:transition-none motion-reduce:transform-none` (or equivalent) so `prefers-reduced-motion` is respected.

## Dashboard Activity Thumbnails

`src/app/(dashboard)/dashboard/page.tsx`'s "Recent activity" list: for rows where `type === "artwork"`, render a 32–40px square thumbnail before the label, using the same Supabase public-bucket URL pattern and `?v=${updatedAt.getTime()}` cache-busting query param already established on the artwork detail page (`src/app/(dashboard)/artworks/[id]/page.tsx`). Requires adding `imagePath` and `updatedAt` to the `recentArtworks` query (both already exist as columns on `artworks`, just not currently selected in this query) and threading them through `ActivityItem`. Customer and commission activity rows are unchanged (no thumbnail — they have no associated image).

## DESIGN.md Pruning

**Remove entirely** (describe components/sections of the *other* product, "Dock," that this app has no equivalent of and never will):
- `### Hero Section`
- `### Product Feature Card`
- `### Tab Bar`
- `### Customer Stat Card`
- `### Gradient CTA Banner`
- `### Footer`
- `### Pricing Table Row`
- `### Checklist/Step Item` (references "Success Criteria," "Next Steps" — Dock's own product features, not this app's)
- `## Similar Brands` (Linear/Attio/Raycast/Pitch/Loom comparisons are positioning for "Dock," not for this app)

**Rewrite** (currently describe Dock's marketing site; replace with what's true of this app):
- `## Imagery` — currently describes "product screenshots" and "customer logos (Lattice, BrightHire, Loom)" as the dominant visual. Rewrite to state that artwork photography is the dominant visual (the gallery grid, artwork detail pages, and the new dashboard thumbnails from item 6), presented in the existing 16px rounded-image containers.
- `## Layout` (the prose section, not the token table) — currently describes a marketing hero/social-proof/CTA-banner page structure. Rewrite to describe this app's actual layout: sidebar + content shell (from item 1), `max-w-*` centered content per page, card-grid or list patterns for collection pages.
- `### Top Navigation Bar` → rename to `### Sidebar Navigation`, replace its description with the structure defined in this spec's "Navigation Redesign" section (groups, active-state treatment, wordmark).
- `## Agent Prompt Guide`'s three numbered example prompts (`Hero section`, `Customer stat card`, `Product feature card with screenshot`, `Tab bar`) — replace with prompts relevant to this app's actual components (e.g. sidebar nav item, artwork gallery card, stat tile). Keep the "Quick Color Reference" list as-is; add the two new tokens.

**Add:**
- The `--color-cobalt-wash` token (from "Navigation Redesign" above) to the Colors table.
- The `--color-attention` token (from "Semantic Attention Token" above) to the Colors table.
- One `### Do` bullet and one `### Don't` bullet covering when to use the new attention token (do: overdue/needs-attention states; don't: form validation errors, which stay on the existing red).

**Leave unchanged:** Tokens — Colors (existing rows), Tokens — Typography, Type Scale, Spacing Scale, Border Radius, Shadows (token table), Primary Filled Button, Ghost/Neutral Button, Text Link, Surfaces, Elevation, Radius Language, Shadow Philosophy, Quick Start / CSS Custom Properties / Tailwind v4 sections — all of these describe things this app actually uses, correctly.

## Testing

This is a UI-only plan; no new business logic beyond `formatCurrency` (pure function, unit-testable) and the empty/total-count checks (trivial, covered by manual verification). Manual verification (dev server walkthrough) is the primary check for the visual/layout changes, consistent with how prior UI-only work in this codebase has been verified.
