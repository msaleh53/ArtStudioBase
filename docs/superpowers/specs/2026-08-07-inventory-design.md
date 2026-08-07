# Inventory Tracking — Design

## Overview

Inventory tracking for the studio: raw-materials stock with a usage log, and a read-only "stock on hand" view of unsold finished work. This is the second half of a two-phase plan the artist requested (finance + inventory); Finance shipped first as its own spec.

## Scope

- **Materials**: raw supplies (paint, canvas, framing materials, etc.) with a name, unit of measure, and a running quantity on hand.
- **Material log**: each restock or usage event is recorded (date, +/− change, optional note); the material's quantity is the running total of its log entries.
- **Stock-on-hand view**: a read-only aggregation of existing data — unsold original artworks (status `finished` or `exhibited`) and print editions with copies remaining (`editionSize − soldCount`). No new table; this is a live query over `artworks` and `printEditions`.

Out of scope for this spec: low-stock thresholds/alerts (deferred), material categories, editing/deleting materials or log entries (create + list only, matching this app's existing precedent for income/expenses/commissions/exhibitions), a dedicated finished-piece table (finished-piece counts stay derived from `artworks`/`printEditions`, not duplicated).

## Data Model

```
materials
  id            uuid pk
  user_id       uuid fk -> auth.users
  name          text not null
  unit          text not null            -- e.g. "tubes", "panels", "yards"
  quantity      numeric not null default 0   -- running stock level, derived from log but stored for fast reads
  created_at    timestamp

material_logs
  id            uuid pk
  user_id       uuid fk -> auth.users
  material_id   uuid fk -> materials, not null
  date          date not null
  change        numeric not null         -- positive = restock, negative = used
  note          text, nullable
  created_at    timestamp
```

Both tables get standard app-level `user_id` scoping on every query, per this project's established RLS-bypass mitigation (Postgres RLS policies exist but aren't enforced at the Drizzle connection level — every query must filter by `eq(table.userId, user.id)` explicitly).

`materials.quantity` is a stored running total, not computed live from `material_logs` on every read — it's updated in the same server action/transaction that inserts a log row. This matches the list-heavy, low-volume nature of this app while keeping material list reads cheap (no aggregation join needed to show current stock).

## Stock-on-Hand Calculation

Computed live, same approach as Finance's monthly summary and the Dashboard's status counts (this project's data volumes are small enough that a live query is simpler and always correct, versus a cached/stored aggregate):

- Unsold originals: `artworks` where `status` is `finished` or `exhibited` (i.e., made but not sold and not `in_progress`), scoped to the user.
- Print editions with stock: `printEditions` where `editionSize - soldCount > 0`, scoped to the user, showing remaining count.

## Pages

- **`/inventory`** (new nav link, positioned after "Finance"): overview page.
  - "Stock on hand" section: list of unsold originals (title, status, linking to the artwork) and print editions with remaining copies (description, remaining/total, linking to the parent artwork).
  - "Materials" section: table of materials (name, unit, quantity), linking to `/inventory/materials` for management.
- **`/inventory/materials`**: full materials management page — add-material form (name, unit, starting quantity) at top, followed by a list of materials. Each material shows its current quantity and a log-entry form (date, change amount, optional note) plus its recent log history (newest first), matching the existing Commissions/Exhibitions page pattern (form at top, list below).

## Architecture

Follows this codebase's established conventions throughout:
- Server Components fetch data inline via `db`, scoped by `eq(table.userId, user.id)`.
- Server Actions `createMaterial` and `logMaterialChange` live in `src/app/(dashboard)/inventory/actions.ts`, following the exact validation/error-return pattern (`{ error?: string }`) used by every existing action in this app.
- `logMaterialChange` inserts the `material_logs` row and updates `materials.quantity` in a single transaction, so the two never drift.
- Drizzle migration for the two new tables, following the numbering process already established for this repo's hand-written migrations (check `drizzle/migrations/meta/_journal.json` for the next free index before generating).
- Nav link added to the existing sidebar nav component, after "Finance".

## Error Handling

- `logMaterialChange` validates that a `used` (negative) entry doesn't drop `quantity` below zero; returns `{ error: "Not enough X in stock" }` rather than allowing a negative running total.
- Standard required-field validation on both forms (name/unit/quantity for materials, date/change for log entries), matching existing action patterns.

## Testing

Live-verified walkthrough with a disposable test account (never the real account), per this project's established practice: create a material, log a restock, log a usage that reduces quantity, attempt a usage that would go negative (expect rejection), confirm the stock-on-hand view reflects an existing finished artwork and print edition correctly.
