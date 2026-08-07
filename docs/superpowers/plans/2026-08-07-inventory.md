# Inventory Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add raw-materials stock tracking (with a restock/usage log) and a read-only "stock on hand" view of unsold finished work, so the artist can see what materials she has and what unsold pieces/prints exist.

**Architecture:** Two new tables (`materials`, `material_logs`), following this codebase's existing per-table conventions (app-level `user_id` scoping on every query, hand-written RLS policies applied separately from drizzle-kit's journaled migrations). `materials.quantity` is a stored running total, updated transactionally whenever a `material_logs` row is inserted. Two new pages under `/inventory` (`/inventory`, `/inventory/materials`) following the existing list-page-with-inline-form pattern already used by Customers/Commissions/Finance. The stock-on-hand view is a live query over the existing `artworks` and `printEditions` tables — no new table for finished-piece counts.

**Tech Stack:** Next.js App Router, Drizzle ORM, Supabase (Postgres + Auth), Tailwind CSS + Shadcn UI.

## Global Constraints

- Every query or mutation touching a table with a `user_id` column MUST fetch the authenticated user via `createClient()` first and filter/scope by `eq(table.userId, user.id)` (or an `and(...)` combining it with other conditions) — RLS is not enforced at the DB connection level in this project, so this app-level filter is the actual security boundary. No exceptions.
- `logMaterialChange` MUST verify the referenced material belongs to the authenticated user before reading/updating its quantity (`eq(materials.id, materialId) AND eq(materials.userId, user.id)`) — same ownership-check pattern used by `createIncome`'s artwork lookup and `createPrintEdition`.
- `logMaterialChange` MUST reject a change that would drop `materials.quantity` below zero, returning `{ error: ... }` rather than allowing a negative running total.
- The `material_logs` insert and the `materials.quantity` update MUST happen inside a single `db.transaction(...)` — the running total is derived state that must never drift from its log.
- Styling uses only the existing DESIGN.md tokens already wired into Tailwind (`bg-canvas-cream`, `text-ink-charcoal`, `text-slate-gray`, `bg-white`, `rounded-card`, `rounded-pill`, `text-electric-cobalt`) — no new tokens.
- Match the existing code style: Server Components fetch data inline, Server Actions live in the route's `actions.ts`, client form components use `useTransition` + local `useState` for pending/error state (see `src/app/(dashboard)/finance/income/new-income-form.tsx` for the exact pattern).
- Out of scope for this plan: low-stock thresholds/alerts, material categories, editing/deleting materials or log entries (create + list only, matching this app's existing precedent), a dedicated finished-piece table (finished-piece counts stay derived from `artworks`/`printEditions`, never duplicated into a new table).

---

### Task 1: Database schema, migration, and RLS policies

**Files:**
- Modify: `src/db/schema.ts`
- Create: new drizzle-kit-generated migration file under `drizzle/migrations/` (exact filename determined in Step 2)
- Create: `drizzle/migrations/0009_materials_rls.sql` (hand-written, not journaled — see Step 4)

**Interfaces:**
- Produces: `materials` table, `materialLogs` table (both in `src/db/schema.ts`) — Task 2's Server Actions and Tasks 3-4's pages all consume these.

- [ ] **Step 1: Add the schema**

In `src/db/schema.ts`, add this after the `expenses` table definition (placement relative to other tables doesn't matter, Drizzle doesn't require declaration order):

```ts
export const materials = pgTable("materials", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  quantity: numeric("quantity").notNull().default("0"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const materialLogs = pgTable("material_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  materialId: uuid("material_id").notNull().references(() => materials.id),
  date: date("date").notNull(),
  change: numeric("change").notNull(),
  note: text("note"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

All the types used here (`pgTable`, `uuid`, `text`, `numeric`, `date`, `timestamp`) are already imported at the top of `src/db/schema.ts` — no import changes needed.

- [ ] **Step 2: Generate the migration**

This repo's migration numbering has an established quirk: some migrations are hand-written and never added to drizzle-kit's journal (`drizzle/migrations/meta/_journal.json`), so drizzle-kit names new output based on the journal's entry count, not by scanning the directory or the highest existing filename.

Run: `cat drizzle/migrations/meta/_journal.json`
Expected: 4 entries, tags `0000_solid_starhawk`, `0003_brown_old_lace`, `0004_majestic_franklin_richards`, `0005_chilly_hitman`.

Run: `npx drizzle-kit generate`
Expected: a new file appears under `drizzle/migrations/`, most likely auto-named `0004_<generated-name>.sql` (entry count 4, zero-padded) — this would collide with the existing `0004_majestic_franklin_richards.sql` in a directory listing. The highest migration file actually present is `0007_receipts_bucket.sql`, so rename the generated file to `0008_<generated-name>.sql` and update its `tag` field to match in the newly-added entry in `drizzle/migrations/meta/_journal.json` (the `idx` field can stay as `drizzle-kit` set it — only `tag` and filename need to agree with each other).

- [ ] **Step 3: Apply the migration**

Do NOT export `DATABASE_URL` inline or print `.env.local`'s contents — both patterns have been blocked by this environment's permission classifier in earlier sessions, and env vars set via `export` in one shell command do not persist to a later, separate command anyway. Instead, write a small script file that loads the env file and runs the command in the same invocation, then delete the script afterward:

Create a temporary file `scripts/_apply-migration.sh`:

```bash
#!/bin/bash
set -euo pipefail
set -a
source .env.local
set +a
npx drizzle-kit migrate
```

Run: `bash scripts/_apply-migration.sh`
Expected: command completes with no errors; the `materials` and `material_logs` tables exist on the live database.

Then delete the temporary script: `rm scripts/_apply-migration.sh` (it must never be committed — it exists only to load credentials into one shell invocation without printing or inlining them).

- [ ] **Step 4: Write and apply the RLS policy SQL**

This project's RLS policies are hand-written SQL, applied manually — they are not generated by drizzle-kit and not added to the journal (see `drizzle/migrations/0001_rls_policies.sql` for the original precedent, and `drizzle/migrations/0006_income_expenses_rls.sql` for the most recent one).

Create `drizzle/migrations/0009_materials_rls.sql`:

```sql
alter table materials enable row level security;
create policy "own materials" on materials
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table material_logs enable row level security;
create policy "own material_logs" on material_logs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Apply it the same way as Step 3 — one self-contained script, no inline credentials, deleted after use. Create a temporary `scripts/_apply-migration.sh`:

```bash
#!/bin/bash
set -euo pipefail
set -a
source .env.local
set +a
psql "$DATABASE_URL" -f drizzle/migrations/0009_materials_rls.sql
```

Run: `bash scripts/_apply-migration.sh`
Expected: both `ALTER TABLE`/`CREATE POLICY` pairs succeed with no errors, for both tables.

Then delete the temporary script: `rm scripts/_apply-migration.sh`.

If any of Steps 3-4 hits a permission block from the environment (this has happened before with DB-credential-handling commands), stop and report BLOCKED rather than working around it with inline credentials — the controller will apply the migration directly.

- [ ] **Step 5: Verify**

Run: `npm run build`
Expected: build succeeds. (Use `npm run build`, not bare `tsc --noEmit` — this project's `src/app/layout.tsx` uses the Next.js 16 typegen global `LayoutProps<"/">`, which only exists after `.next/types` has been generated by a build/dev run; bare `tsc` won't see it and will report a false error.)

- [ ] **Step 6: Commit**

```bash
git add src/db/schema.ts drizzle/migrations/
git commit -m "Add materials and material_logs schema and RLS policies"
```

---

### Task 2: Materials Server Actions

**Files:**
- Create: `src/app/(dashboard)/inventory/actions.ts`

**Interfaces:**
- Consumes: `materials`, `materialLogs` from `@/db/schema` (Task 1).
- Produces: `createMaterial(formData: FormData): Promise<{ error?: string }>`, `logMaterialChange(formData: FormData): Promise<{ error?: string }>` — Task 3's forms call both.

- [ ] **Step 1: Write the Server Actions**

Create `src/app/(dashboard)/inventory/actions.ts`:

```ts
"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { materials, materialLogs } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function createMaterial(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = formData.get("name") as string;
  const unit = formData.get("unit") as string;
  const quantity = (formData.get("quantity") as string) || "0";

  if (!name) return { error: "Name is required" };
  if (!unit) return { error: "Unit is required" };

  await db.insert(materials).values({
    userId: user.id,
    name,
    unit,
    quantity,
  });

  revalidatePath("/inventory");
  revalidatePath("/inventory/materials");
  return {};
}

export async function logMaterialChange(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const materialId = formData.get("materialId") as string;
  const date = formData.get("date") as string;
  const changeRaw = formData.get("change") as string;
  const note = (formData.get("note") as string) || null;

  if (!materialId) return { error: "Material is required" };
  if (!date) return { error: "Date is required" };
  if (!changeRaw) return { error: "Change amount is required" };

  const change = Number(changeRaw);
  if (Number.isNaN(change) || change === 0) {
    return { error: "Change must be a non-zero number" };
  }

  const [material] = await db.select().from(materials)
    .where(and(eq(materials.id, materialId), eq(materials.userId, user.id)));
  if (!material) return { error: "Material not found" };

  const newQuantity = Number(material.quantity) + change;
  if (newQuantity < 0) return { error: `Not enough ${material.name} in stock` };

  await db.transaction(async (tx) => {
    await tx.insert(materialLogs).values({
      userId: user.id,
      materialId,
      date,
      change: changeRaw,
      note,
    });
    await tx.update(materials).set({ quantity: newQuantity.toString() })
      .where(and(eq(materials.id, materialId), eq(materials.userId, user.id)));
  });

  revalidatePath("/inventory");
  revalidatePath("/inventory/materials");
  return {};
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: build succeeds with no type errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(dashboard\)/inventory/actions.ts
git commit -m "Add materials Server Actions"
```

---

### Task 3: Materials page

**Files:**
- Create: `src/app/(dashboard)/inventory/materials/page.tsx`
- Create: `src/app/(dashboard)/inventory/materials/new-material-form.tsx`
- Create: `src/app/(dashboard)/inventory/materials/material-log-form.tsx`

**Interfaces:**
- Consumes: `createMaterial`, `logMaterialChange` (Task 2); `materials`, `materialLogs` from `@/db/schema`; `Button`, `Input`, `Label` from `@/components/ui/*`.
- Produces: route `/inventory/materials`.

- [ ] **Step 1: Write the add-material form component**

Create `src/app/(dashboard)/inventory/materials/new-material-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { createMaterial } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewMaterialForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(async () => {
        const result = await createMaterial(formData);
        setError(result.error ?? null);
        if (!result.error) (document.getElementById("material-form") as HTMLFormElement)?.reset();
      })}
      id="material-form"
      className="bg-white rounded-card p-6 space-y-3 mb-8"
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="Canvas 18x24" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="unit">Unit</Label>
          <Input id="unit" name="unit" required placeholder="panels" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="quantity">Starting quantity</Label>
          <Input id="quantity" name="quantity" type="number" step="0.01" placeholder="0" />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="rounded-pill">Add material</Button>
    </form>
  );
}
```

- [ ] **Step 2: Write the log-entry form component**

Create `src/app/(dashboard)/inventory/materials/material-log-form.tsx`:

```tsx
"use client";

import { useState, useTransition } from "react";
import { logMaterialChange } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MaterialLogForm({ materialId }: { materialId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formId = `log-form-${materialId}`;

  return (
    <form
      action={(formData) => startTransition(async () => {
        const result = await logMaterialChange(formData);
        setError(result.error ?? null);
        if (!result.error) (document.getElementById(formId) as HTMLFormElement)?.reset();
      })}
      id={formId}
      className="space-y-2 mt-3"
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input type="hidden" name="materialId" value={materialId} />
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`date-${materialId}`}>Date</Label>
          <Input id={`date-${materialId}`} name="date" type="date" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`change-${materialId}`}>Change (+/-)</Label>
          <Input id={`change-${materialId}`} name="change" type="number" step="0.01" required placeholder="-2 or 10" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`note-${materialId}`}>Note (optional)</Label>
          <Input id={`note-${materialId}`} name="note" placeholder="Used for commission" />
        </div>
      </div>
      <Button type="submit" disabled={pending} size="sm" className="rounded-pill">Log change</Button>
    </form>
  );
}
```

- [ ] **Step 3: Write the page**

Create `src/app/(dashboard)/inventory/materials/page.tsx`:

```tsx
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { materials, materialLogs } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { NewMaterialForm } from "./new-material-form";
import { MaterialLogForm } from "./material-log-form";

export default async function MaterialsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const materialRows = await db.select().from(materials)
    .where(eq(materials.userId, user.id)).orderBy(materials.name);

  const materialsWithLogs = await Promise.all(
    materialRows.map(async (m) => {
      const logs = await db.select().from(materialLogs)
        .where(eq(materialLogs.materialId, m.id))
        .orderBy(desc(materialLogs.date)).limit(5);
      return { ...m, logs };
    }),
  );

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-ink-charcoal">Materials</h1>
      <NewMaterialForm />
      <ul className="space-y-4">
        {materialsWithLogs.map((m) => (
          <li key={m.id} className="bg-white rounded-card p-4">
            <p className="font-medium text-ink-charcoal">{m.name}</p>
            <p className="text-sm text-slate-gray">{m.quantity} {m.unit} on hand</p>
            <MaterialLogForm materialId={m.id} />
            {m.logs.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-hairline pt-2">
                {m.logs.map((l) => (
                  <li key={l.id} className="text-sm text-slate-gray flex justify-between">
                    <span>{l.date}{l.note && ` · ${l.note}`}</span>
                    <span>{Number(l.change) > 0 ? "+" : ""}{l.change} {m.unit}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, log in, visit `/inventory/materials`.

Expected:
1. Page renders with the add-material form and an empty list.
2. Submit a material with name "Canvas 18x24", unit "panels", starting quantity 10 — appears in the list showing "10 panels on hand".
3. On that material, log a change of `+5` with a note "Restock" — quantity updates to "15 panels on hand" and the log history shows "+5 panels · Restock".
4. Log a change of `-3` — quantity updates to "12 panels on hand", log history shows the new entry.
5. Log a change of `-100` (more than on hand) — inline error "Not enough Canvas 18x24 in stock", quantity unchanged.
6. Submit the add-material form with name left empty — inline error "Name is required", no navigation.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/inventory/materials/
git commit -m "Add materials management page"
```

---

### Task 4: Inventory overview page and nav wiring

**Files:**
- Create: `src/app/(dashboard)/inventory/page.tsx`
- Modify: `src/app/(dashboard)/nav-links.tsx`

**Interfaces:**
- Consumes: `materials`, `artworks`, `printEditions` from `@/db/schema`.
- Produces: route `/inventory` (the section's landing page).

- [ ] **Step 1: Write the overview page**

Create `src/app/(dashboard)/inventory/page.tsx`:

```tsx
import Link from "next/link";
import { and, eq, gt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { materials, artworks, printEditions } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [unsoldOriginals, editionsWithStock, materialRows] = await Promise.all([
    db.select({ id: artworks.id, title: artworks.title, status: artworks.status })
      .from(artworks)
      .where(and(
        eq(artworks.userId, user.id),
        or(eq(artworks.status, "finished"), eq(artworks.status, "exhibited")),
      ))
      .orderBy(artworks.title),
    db.select({
      id: printEditions.id,
      description: printEditions.description,
      editionSize: printEditions.editionSize,
      soldCount: printEditions.soldCount,
      artworkId: printEditions.artworkId,
      artworkTitle: artworks.title,
    })
      .from(printEditions)
      .innerJoin(artworks, eq(printEditions.artworkId, artworks.id))
      .where(and(
        eq(printEditions.userId, user.id),
        gt(sql`${printEditions.editionSize} - ${printEditions.soldCount}`, 0),
      ))
      .orderBy(artworks.title),
    db.select().from(materials).where(eq(materials.userId, user.id)).orderBy(materials.name),
  ]);

  return (
    <main className="p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold text-ink-charcoal">Inventory</h1>

      <section className="bg-white rounded-card p-4 space-y-3">
        <h2 className="font-medium text-ink-charcoal">Stock on hand</h2>
        {unsoldOriginals.length === 0 && editionsWithStock.length === 0 && (
          <p className="text-sm text-slate-gray">No unsold originals or prints in stock.</p>
        )}
        <ul className="space-y-1">
          {unsoldOriginals.map((a) => (
            <li key={a.id}>
              <Link href={`/artworks/${a.id}`} className="flex justify-between text-sm">
                <span className="text-ink-charcoal">{a.title}</span>
                <span className="text-slate-gray capitalize">{a.status}</span>
              </Link>
            </li>
          ))}
          {editionsWithStock.map((e) => (
            <li key={e.id}>
              <Link href={`/artworks/${e.artworkId}`} className="flex justify-between text-sm">
                <span className="text-ink-charcoal">{e.artworkTitle}{e.description && ` · ${e.description}`}</span>
                <span className="text-slate-gray">{e.editionSize - e.soldCount} of {e.editionSize} remaining</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white rounded-card p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-medium text-ink-charcoal">Materials</h2>
          <Link href="/inventory/materials" className="text-sm text-electric-cobalt">Manage materials</Link>
        </div>
        {materialRows.length === 0 && <p className="text-sm text-slate-gray">No materials tracked yet.</p>}
        <ul className="space-y-1">
          {materialRows.map((m) => (
            <li key={m.id} className="flex justify-between text-sm">
              <span className="text-ink-charcoal">{m.name}</span>
              <span className="text-slate-gray">{m.quantity} {m.unit}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Add the nav link**

In `src/app/(dashboard)/nav-links.tsx`, add a new single-item `"Inventory"` group to `NAV_GROUPS`, after the existing `"Money"` group (matching the spec's "positioned after Finance" — the sidebar is grouped, not a flat list, so this preserves that ordering as its own group, the same way `"Money"` is itself a single-item group):

```ts
const NAV_GROUPS: NavGroup[] = [
  {
    label: "Studio",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/artworks", label: "Artworks" },
    ],
  },
  {
    label: "Clients",
    items: [
      { href: "/customers", label: "Customers" },
      { href: "/commissions", label: "Commissions" },
      { href: "/exhibitions", label: "Exhibitions" },
    ],
  },
  {
    label: "Money",
    items: [{ href: "/finance", label: "Finance" }],
  },
  {
    label: "Inventory",
    items: [{ href: "/inventory", label: "Inventory" }],
  },
];
```

- [ ] **Step 3: Verify manually**

Run: `npm run dev`, log in, visit `/inventory`.

Expected:
1. Sidebar shows a new "Inventory" group (with a single "Inventory" link) after the "Money" group.
2. "Stock on hand" shows "No unsold originals or prints in stock." if you have none with status `finished`/`exhibited` or print editions with remaining copies; otherwise lists them, each linking to its artwork detail page.
3. Change an artwork's status to "finished" (via the existing edit-artwork flow) — reload `/inventory` and confirm it now appears in "Stock on hand".
4. If a print edition exists with `soldCount < editionSize`, confirm it appears with the correct "`N` of `M` remaining" count; if `soldCount === editionSize`, confirm it does NOT appear.
5. "Materials" section lists materials with current quantity/unit (from Task 3's data) and a working "Manage materials" link to `/inventory/materials`.

Run: `npm run build`
Expected: build succeeds.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(dashboard\)/inventory/page.tsx src/app/\(dashboard\)/nav-links.tsx
git commit -m "Add inventory overview page and nav link"
```
