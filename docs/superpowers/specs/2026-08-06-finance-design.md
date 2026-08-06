# Finance (Income + Expenses) — Design

## Overview

A finance section for tracking money in (sales) and money out (expenses), with a lightweight monthly summary. This is phase 1 of a two-phase plan the artist requested (finance + inventory); inventory (raw materials, finished-piece counts) is deliberately out of scope here and will be its own future spec.

## Scope

- **Income log**: manual entries — the artist records each sale herself (art sales, print sales, cash sales at a fair, etc.), rather than income being auto-derived from artwork/print "Sold" status. This captures sales that never touch the Artworks/Prints flow.
- **Expense log**: manual entries against a fixed category list, with an optional receipt upload (image or PDF).
- **Summary view**: current-month income, current-month expenses (with a per-category breakdown), and net — no charting library, styled as stat tiles matching the existing Dashboard page.

Out of scope for this spec: inventory/raw-materials tracking, auto-generating income from artwork sales, editing/deleting entries (create + list only, matching this app's existing precedent — e.g. commissions/exhibitions also don't support delete yet), exporting/printing reports.

## Data Model

```
income
  id            uuid pk
  user_id       uuid fk -> auth.users
  date          date
  amount        numeric
  description   text
  artwork_id    uuid fk -> artworks, nullable

expenses
  id            uuid pk
  user_id       uuid fk -> auth.users
  date          date
  amount        numeric
  category      expense_category enum
  description   text, nullable
  receipt_path  text, nullable

expense_category enum:
  supplies, framing, printing, studio_rent, shipping, website_fees, submission_fees, other
```

`income.artwork_id` is nullable and optional — most income entries won't reference an artwork (print sales, cash sales), but linking one is useful context when a specific inventory piece sold. No reverse constraint is needed (an artwork can have zero or more income entries referencing it — e.g. an original sale plus later print sales of the same piece).

Both tables get standard app-level `user_id` scoping on every query, per this project's established RLS-bypass mitigation (Postgres RLS policies exist but aren't enforced at the Drizzle connection level — every query must filter by `eq(table.userId, user.id)` explicitly).

## Receipt Storage

A **new, private** Supabase Storage bucket (`receipts`), distinct from the existing `artwork-images` bucket. `artwork-images` is deliberately public-read (a documented, deliberate tradeoff for that feature); receipts are financial documents and should not be reachable via a guessable-but-public URL even with UUID paths. Objects are stored at `{user_id}/{expense_id}/{filename}`, RLS-protected by the same `user_id` path-prefix pattern already used for artwork images. Viewing a receipt goes through a server-generated signed URL (short-lived), not a public URL.

Accepted file types: images (`image/*`) and PDF (`application/pdf`). Size limit matches the existing artwork-image limit (20MB).

## Pages

- **`/finance`** (new nav link, positioned after "Exhibitions"): summary/overview page.
  - Stat tiles: this month's income total, this month's expense total, net (income − expenses).
  - Expense breakdown by category for the current month (list of category → sum, categories with zero spend omitted).
  - Recent income entries (last 5) and recent expense entries (last 5), each linking to their respective log page.
- **`/finance/income`**: full income log — entry form (date, amount, description, optional artwork picker) + list of all entries, newest first, matching the existing Commissions/Exhibitions page pattern (form at top, list below).
- **`/finance/expenses`**: full expense log — entry form (date, amount, category dropdown, description, optional receipt file) + list of all entries, newest first. Each list row shows a "View receipt" link when one is attached (opens the signed URL).

## Architecture

Follows this codebase's established conventions throughout:
- Server Components fetch data inline via `db`, scoped by `eq(table.userId, user.id)`.
- Server Actions (`createIncome`, `createExpense`) live in `src/app/(dashboard)/finance/actions.ts`, following the exact validation/error-return pattern (`{ error?: string }`) used by every existing action in this app.
- Category dropdown mirrors the existing `StatusBadge`/`STATUS_LABELS` pattern used for artwork status.
- Drizzle migration for the two new tables + the new enum, following the numbering process already established for this repo's non-journaled hand-written migrations (check `drizzle/migrations/meta/_journal.json` for the next free index before generating).
- Receipt upload/signed-URL logic mirrors `createArtwork`'s Storage upload pattern, adapted for a private bucket.

## Summary Calculation

Current-month totals are computed with a date-range filter (`gte`/`lt` on the first day of the current month and the first day of next month) rather than a stored aggregate — this project's data volumes are small (single-tenant), so a live query is simpler and always correct, matching how the Dashboard page's status counts are already computed live rather than cached.
