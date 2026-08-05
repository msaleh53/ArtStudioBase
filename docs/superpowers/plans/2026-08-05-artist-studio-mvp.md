# Artist Studio Management System — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the single-tenant Artist Studio Management System MVP — artwork inventory (with print editions), commission pipeline & CRM, and exhibition calendar with double-booking validation — per the approved design spec.

**Architecture:** Next.js 14 App Router deployed to Vercel, Server Actions for all mutations, Supabase Postgres via Drizzle ORM with RLS enforcing single-tenant row ownership, Supabase Auth (email/password, one seeded account, no signup UI), Supabase Storage for artwork images rendered through `next/image`. UI is Shadcn primitives restyled with the DESIGN.md token set.

**Tech Stack:** Next.js 14 (App Router, TS), Tailwind CSS, Shadcn UI, Drizzle ORM + drizzle-kit, `postgres` driver, `@supabase/supabase-js` + `@supabase/ssr`, Vitest (one narrow unit test for the exhibition overlap rule).

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-05-artist-studio-design.md` — all data model field names, enum values, and table names below are copied verbatim from it. Don't rename.
- Single tenant only: no signup route, no multi-user UI. Every table row is scoped by `user_id = auth.uid()` via RLS.
- **Discovered during Task 12's review (2026-08-05):** the Drizzle client connects via `DATABASE_URL` as the `postgres` role, which has `rolbypassrls = true` — RLS policies exist and are correctly written (Task 5) but are NOT actually enforced on any Drizzle query. Human-ruled resolution: every Server Action and every page/component that queries the database via `db` must ALSO apply an explicit `.where(eq(<table>.userId, user.id))` (or an `and(...)` combining it with other conditions) as app-level defense-in-depth, in addition to the existing RLS policies. This applies retroactively to Tasks 9-12 (already fixed) and to all remaining tasks (13, 15, 16). Any query that reads or writes a table with a `user_id`/`userId` column must fetch the authenticated user via `createClient()` first and filter/scope by their id — no exceptions.
- No thumbnail pipeline — store the original upload only, resize via `next/image` at render time.
- No drag-and-drop kanban — a stage `<select>` per commission card is sufficient.
- No automated tests except the exhibition date-overlap validation function (per spec's Testing section). All other verification is manual, via the dev server.
- Package manager: npm.

---

### Task 1: Project scaffold, dependencies, and Supabase project credentials

**Files:**
- Create: whole Next.js project at repo root (`package.json`, `tsconfig.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`, `.env.local`, `.env.example`, `.gitignore` additions)

**Interfaces:**
- Produces: `.env.local` with `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` — every later task that touches Supabase or the DB reads these.

- [ ] **Step 1: Create the Supabase project**

Go to https://supabase.com/dashboard, create a new project (any region/name). Once provisioned, from Project Settings → API, copy the Project URL and the `anon` public key and the `service_role` secret key. From Project Settings → Database, copy the connection string (use the "Transaction" pooler connection string, port 6543, for `DATABASE_URL`).

- [ ] **Step 2: Scaffold the Next.js app**

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --import-alias "@/*" --no-turbopack
```
Accept overwriting into the current directory (it already contains `concept.md`, `DESIGN.md`, `docs/`).

- [ ] **Step 3: Install runtime and dev dependencies**

```bash
npm install drizzle-orm postgres @supabase/supabase-js @supabase/ssr zod
npm install -D drizzle-kit vitest
```

- [ ] **Step 4: Create env files**

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=<project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
DATABASE_URL=<pooler-connection-string>
```

Create `.env.example` with the same keys and empty values, so the shape is documented without leaking secrets:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

Confirm `.env.local` is in `.gitignore` (create-next-app adds `.env*.local` by default — verify it's present).

- [ ] **Step 5: Verify the app boots**

Run: `npm run dev`
Expected: Next.js dev server starts on port 3000, default landing page loads at `http://localhost:3000` with no console errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Scaffold Next.js app with core dependencies"
```

---

### Task 2: DESIGN.md visual tokens in Tailwind

**Files:**
- Modify: `src/app/globals.css`
- Modify: `tailwind.config.ts` (or `postcss`/`@theme` block if the scaffold generated Tailwind v4 CSS-first config — check which `create-next-app` produced in Task 1 and follow that form)

**Interfaces:**
- Produces: Tailwind color/radius/font tokens (`canvas-cream`, `surface-ivory`, `ink-charcoal`, `electric-cobalt`, `deep-cobalt`, `vivid-violet`, `forest`, `slate-gray`, `hairline`, radius `card`/`pill`) usable as `bg-canvas-cream`, `text-ink-charcoal`, `rounded-card`, `rounded-pill` etc. — every UI task from here on uses these classes instead of raw hex values.

- [ ] **Step 1: Add the token block**

Open `src/app/globals.css`. If Tailwind v4 (a `@theme { ... }` block already exists in this file from the scaffold), add inside it; otherwise add an equivalent block to `tailwind.config.ts` under `theme.extend`. Use the values from `DESIGN.md`'s Quick Start section:

```css
@theme {
  --color-canvas-cream: #faf9f7;
  --color-surface-ivory: #fbfaf7;
  --color-pure-white: #ffffff;
  --color-lavender-mist: #f4f0ff;
  --color-ink-charcoal: #121722;
  --color-slate-gray: #777c86;
  --color-steel-gray: #a5a5a5;
  --color-hairline: #efefef;
  --color-electric-cobalt: #0068f9;
  --color-deep-cobalt: #024bb1;
  --color-vivid-violet: #6736eb;
  --color-forest: #046645;

  --radius-card: 16px;
  --radius-pill: 48px;
}
```

- [ ] **Step 2: Set the page background and base type**

In `src/app/globals.css`, set body background and text color to the new tokens:
```css
body {
  background-color: var(--color-canvas-cream);
  color: var(--color-ink-charcoal);
}
```

- [ ] **Step 3: Verify visually**

Replace the contents of `src/app/page.tsx` temporarily with a smoke-test block:
```tsx
export default function Home() {
  return (
    <main className="p-8">
      <button className="bg-electric-cobalt text-white rounded-pill px-6 py-3">
        Test button
      </button>
    </main>
  );
}
```
Run: `npm run dev`, open `http://localhost:3000`.
Expected: cream page background, a pill-shaped cobalt-blue button with white text. This file gets replaced with real content in Task 16 — leave it as-is for now.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add DESIGN.md tokens to Tailwind theme"
```

---

### Task 3: Shadcn UI init and core components

**Files:**
- Create: `components.json`, `src/lib/utils.ts`, `src/components/ui/*` (generated by the CLI)

**Interfaces:**
- Produces: `src/components/ui/{button,card,badge,input,label,textarea,select,form,dialog,dropdown-menu,table}.tsx` — every feature page/component from Task 9 onward imports from these.

- [ ] **Step 1: Initialize Shadcn**

```bash
npx shadcn@latest init
```
When prompted for base color, choose "Neutral" (we override colors via the DESIGN.md tokens from Task 2, not Shadcn's default theme).

- [ ] **Step 2: Add the components this project needs**

```bash
npx shadcn@latest add button card badge input label textarea select form dialog dropdown-menu table
```

- [ ] **Step 3: Verify**

Run: `npm run build`
Expected: build succeeds with no type errors from the generated components.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Initialize Shadcn UI with core components"
```

---

### Task 4: Drizzle schema and initial migration

**Files:**
- Create: `src/db/schema.ts`
- Create: `src/db/index.ts`
- Create: `drizzle.config.ts`

**Interfaces:**
- Produces: exported tables `artworks`, `customers`, `commissions`, `exhibitions`, `exhibitionArtworks`, `printEditions`; enums `artworkStatus`, `commissionStage`; types `ArtworkStatus`, `CommissionStage`; db client `db` from `src/db/index.ts`. Every Server Action task (9, 12, 13, 15) imports these exact names.

- [ ] **Step 1: Write the schema**

Create `src/db/schema.ts`:
```ts
import {
  pgTable, pgEnum, uuid, text, numeric, integer,
  timestamp, date, primaryKey, unique,
} from "drizzle-orm/pg-core";

export const artworkStatus = pgEnum("artwork_status", [
  "in_progress", "finished", "exhibited", "sold",
]);
export const commissionStage = pgEnum("commission_stage", [
  "inquiry", "deposit_paid", "painting", "finished", "delivered",
]);

export type ArtworkStatus = (typeof artworkStatus.enumValues)[number];
export type CommissionStage = (typeof commissionStage.enumValues)[number];

export const artworks = pgTable("artworks", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  medium: text("medium"),
  dimensions: text("dimensions"),
  price: numeric("price"),
  status: artworkStatus("status").notNull().default("in_progress"),
  imagePath: text("image_path"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const customers = pgTable("customers", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  email: text("email"),
  phone: text("phone"),
  notes: text("notes"),
});

export const commissions = pgTable("commissions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  customerId: uuid("customer_id").notNull().references(() => customers.id),
  artworkId: uuid("artwork_id").references(() => artworks.id),
  stage: commissionStage("stage").notNull().default("inquiry"),
  deadline: date("deadline"),
  progressNotes: text("progress_notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ([
  unique().on(table.artworkId),
]));

export const exhibitions = pgTable("exhibitions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  galleryName: text("gallery_name").notNull(),
  submissionDeadline: date("submission_deadline"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date").notNull(),
});

export const exhibitionArtworks = pgTable("exhibition_artworks", {
  exhibitionId: uuid("exhibition_id").notNull().references(() => exhibitions.id),
  artworkId: uuid("artwork_id").notNull().references(() => artworks.id),
}, (table) => ([
  primaryKey({ columns: [table.exhibitionId, table.artworkId] }),
]));

export const printEditions = pgTable("print_editions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  artworkId: uuid("artwork_id").notNull().references(() => artworks.id),
  description: text("description"),
  editionSize: integer("edition_size").notNull(),
  price: numeric("price"),
  soldCount: integer("sold_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});
```

- [ ] **Step 2: Write the db client**

Create `src/db/index.ts`:
```ts
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const client = postgres(process.env.DATABASE_URL!, { prepare: false });
export const db = drizzle(client, { schema });
```

- [ ] **Step 3: Write drizzle-kit config**

Create `drizzle.config.ts`:
```ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
```

- [ ] **Step 4: Generate and apply the migration**

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```
Expected: a SQL file appears under `drizzle/migrations/`, and it applies with no errors. Verify in the Supabase dashboard's Table Editor that `artworks`, `customers`, `commissions`, `exhibitions`, `exhibition_artworks`, `print_editions` all exist.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add Drizzle schema and initial migration"
```

---

### Task 5: RLS policies

**Files:**
- Create: `drizzle/migrations/0001_rls_policies.sql` (hand-written — drizzle-kit only generates schema DDL, not RLS policies, so this is added directly to the migrations folder)

**Interfaces:**
- Consumes: table names from Task 4's schema.
- Produces: RLS enabled and enforced on all six tables — every Server Action task relies on this for tenant isolation (the app never adds its own `WHERE user_id = ...` filter; RLS is the enforcement layer).

- [ ] **Step 1: Write the policy SQL**

Create `drizzle/migrations/0001_rls_policies.sql`:
```sql
alter table artworks enable row level security;
create policy "own artworks" on artworks
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table customers enable row level security;
create policy "own customers" on customers
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table commissions enable row level security;
create policy "own commissions" on commissions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table exhibitions enable row level security;
create policy "own exhibitions" on exhibitions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

alter table print_editions enable row level security;
create policy "own print editions" on print_editions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- exhibition_artworks has no user_id column of its own; ownership is
-- derived from the exhibition it belongs to.
alter table exhibition_artworks enable row level security;
create policy "own exhibition artworks" on exhibition_artworks
  for all using (
    exists (select 1 from exhibitions e where e.id = exhibition_id and e.user_id = auth.uid())
  ) with check (
    exists (select 1 from exhibitions e where e.id = exhibition_id and e.user_id = auth.uid())
  );
```

- [ ] **Step 2: Apply it**

```bash
psql "$DATABASE_URL" -f drizzle/migrations/0001_rls_policies.sql
```
Expected: all statements execute with no errors.

- [ ] **Step 3: Verify RLS is on**

In the Supabase dashboard → Table Editor, confirm each of the six tables shows the RLS-enabled shield icon.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add RLS policies for tenant isolation"
```

---

### Task 6: Supabase client helpers and auth middleware

**Files:**
- Create: `src/lib/supabase/client.ts`
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/middleware.ts`
- Create: `middleware.ts` (repo root, next to `src/`)

**Interfaces:**
- Produces: `createClient()` in both `client.ts` (browser) and `server.ts` (server components/actions, async, cookie-bound), and `updateSession(request: NextRequest)` in `middleware.ts` — Task 7 (login) and every Server Action task use `createClient()` from `server.ts` to get the authenticated user and enforce RLS-scoped queries.

- [ ] **Step 1: Browser client**

Create `src/lib/supabase/client.ts`:
```ts
import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
```

- [ ] **Step 2: Server client**

Create `src/lib/supabase/server.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options));
          } catch {
            // called from a Server Component; middleware refreshes the session instead
          }
        },
      },
    },
  );
}
```

- [ ] **Step 3: Middleware session refresh + route protection**

Create `src/lib/supabase/middleware.ts`:
```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options));
        },
      },
    },
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}
```

Create `middleware.ts` at the repo root:
```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
```

- [ ] **Step 4: Verify redirect works**

Run: `npm run dev`, visit `http://localhost:3000/` while logged out.
Expected: redirected to `http://localhost:3000/login` (a 404 page is fine for now — the route doesn't exist until Task 7 — confirm the *redirect* happens, i.e. the URL bar changes to `/login`).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add Supabase client helpers and auth middleware"
```

---

### Task 7: Login page and logout action

**Files:**
- Create: `src/app/login/page.tsx`
- Create: `src/app/login/actions.ts`
- Create: `src/app/(dashboard)/actions.ts` (logout lives with the dashboard shell since it's used from the nav, built in Task 16 — created now so the action exists)

**Interfaces:**
- Consumes: `createClient()` from `src/lib/supabase/server.ts` (Task 6); Shadcn `Button`, `Input`, `Label` (Task 3).
- Produces: `login(formData: FormData)` in `src/app/login/actions.ts`, `logout()` in `src/app/(dashboard)/actions.ts` — Task 16's nav wires a form action to `logout`.

- [ ] **Step 1: Login server action**

Create `src/app/login/actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }
  redirect("/artworks");
}
```

- [ ] **Step 2: Login page**

Create `src/app/login/page.tsx`:
```tsx
import { login } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="min-h-screen flex items-center justify-center bg-canvas-cream">
      <form action={login} className="bg-white rounded-card p-8 w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold text-ink-charcoal">Studio Login</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required />
        </div>
        <Button type="submit" className="w-full rounded-pill">Log in</Button>
      </form>
    </main>
  );
}
```

- [ ] **Step 3: Logout action**

Create `src/app/(dashboard)/actions.ts`:
```ts
"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, visit `/login`. Expected: form renders with cream background and pill submit button. Submitting valid/invalid credentials can't be tested yet — no user exists until Task 8's seed script runs. Confirm the page renders without errors and an invalid submission (any email/password) round-trips to `/login?error=...` and displays the message.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add login page and logout action"
```

---

### Task 8: Seed script for the artist account

**Files:**
- Create: `scripts/seed.ts`
- Modify: `package.json` (add `"seed": "tsx scripts/seed.ts"` script)

**Interfaces:**
- Consumes: `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL` from `.env.local` (Task 1).
- Produces: one confirmed user in Supabase Auth, usable to log in via Task 7's form for the rest of manual verification.

- [ ] **Step 1: Install tsx for running the script**

```bash
npm install -D tsx dotenv
```

- [ ] **Step 2: Write the seed script**

Create `scripts/seed.ts`:
```ts
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const email = process.argv[2];
const password = process.argv[3];

if (!email || !password) {
  console.error("Usage: npm run seed -- <email> <password>");
  process.exit(1);
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

const { data, error } = await supabase.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error) {
  console.error("Failed to create user:", error.message);
  process.exit(1);
}

console.log("Created artist account:", data.user.id, data.user.email);
```

- [ ] **Step 3: Add the npm script**

In `package.json` `"scripts"`, add:
```json
"seed": "tsx scripts/seed.ts"
```

- [ ] **Step 4: Run it and verify login**

```bash
npm run seed -- artist@example.com "a-strong-password"
```
Expected: console prints the created user id and email. Then run `npm run dev`, log in at `/login` with those credentials.
Expected: redirected to `/artworks` (404 is fine — the route doesn't exist until Task 10 — confirm the redirect target URL and that no auth error appears).

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add seed script for the artist account"
```

---

### Task 9: Artwork Server Actions and Storage bucket

**Files:**
- Create: `src/app/(dashboard)/artworks/actions.ts`
- Create: `drizzle/migrations/0002_storage_bucket.sql`

**Interfaces:**
- Consumes: `db`, `artworks` table (Task 4); `createClient()` from `server.ts` (Task 6).
- Produces: `createArtwork(formData: FormData): Promise<{ error?: string }>`, `updateArtworkStatus(id: string, status: ArtworkStatus): Promise<{ error?: string }>` — Task 10's gallery page and Task 11's detail page call these.

- [ ] **Step 1: Create the storage bucket and its RLS policy**

Create `drizzle/migrations/0002_storage_bucket.sql`:
```sql
insert into storage.buckets (id, name, public)
values ('artwork-images', 'artwork-images', true)
on conflict (id) do nothing;

create policy "owner can manage own artwork images"
on storage.objects for all
using (bucket_id = 'artwork-images' and (storage.foldername(name))[1] = auth.uid()::text)
with check (bucket_id = 'artwork-images' and (storage.foldername(name))[1] = auth.uid()::text);
```
Apply it: `psql "$DATABASE_URL" -f drizzle/migrations/0002_storage_bucket.sql`
Expected: no errors. Verify in Supabase dashboard → Storage that `artwork-images` bucket exists.

Note: the bucket is public-read (so `next/image` can fetch by URL without signing), but writes are RLS-restricted to the owner's `{user_id}/...` path prefix, matching the `image_path` convention from the spec.

- [ ] **Step 2: Write the Server Actions**

Create `src/app/(dashboard)/artworks/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { artworks, type ArtworkStatus } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function createArtwork(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const title = formData.get("title") as string;
  const medium = formData.get("medium") as string;
  const dimensions = formData.get("dimensions") as string;
  const price = formData.get("price") as string;
  const file = formData.get("image") as File;

  if (!title) return { error: "Title is required" };
  if (!file || file.size === 0) return { error: "An image is required" };
  if (!file.type.startsWith("image/")) return { error: "File must be an image" };
  if (file.size > 20 * 1024 * 1024) return { error: "Image must be under 20MB" };

  const [row] = await db.insert(artworks).values({
    userId: user.id,
    title,
    medium: medium || null,
    dimensions: dimensions || null,
    price: price || null,
  }).returning();

  const ext = file.name.split(".").pop();
  const path = `${user.id}/${row.id}/original.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("artwork-images")
    .upload(path, file);

  if (uploadError) {
    await db.delete(artworks).where(eq(artworks.id, row.id));
    return { error: `Upload failed: ${uploadError.message}` };
  }

  await db.update(artworks).set({ imagePath: path }).where(eq(artworks.id, row.id));

  revalidatePath("/artworks");
  return {};
}

export async function updateArtworkStatus(id: string, status: ArtworkStatus) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await db.update(artworks).set({ status, updatedAt: new Date() }).where(eq(artworks.id, id));
  revalidatePath("/artworks");
  revalidatePath(`/artworks/${id}`);
  return {};
}
```

- [ ] **Step 3: Verify with a manual round-trip**

This is exercised end-to-end visually in Task 10 (the upload form lives there). For now:
Run: `npm run build`
Expected: compiles with no type errors — confirms `ArtworkStatus`, `artworks`, and `db` imports resolve correctly.

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "Add artwork Server Actions and Storage bucket"
```

---

### Task 10: Artworks gallery page and status badge

**Files:**
- Create: `src/components/status-badge.tsx`
- Create: `src/app/(dashboard)/artworks/page.tsx`
- Create: `src/app/(dashboard)/artworks/upload-form.tsx` (client component wrapping the create action for `useFormState`-style error display)

**Interfaces:**
- Consumes: `createArtwork` (Task 9), `db`/`artworks` (Task 4), Shadcn `Card`/`Badge`/`Button`/`Input`/`Label` (Task 3).
- Produces: `StatusBadge({ status }: { status: ArtworkStatus })` — reused by Task 11's artwork detail page.

- [ ] **Step 1: Status badge component**

Create `src/components/status-badge.tsx`:
```tsx
import { Badge } from "@/components/ui/badge";
import type { ArtworkStatus } from "@/db/schema";

const STATUS_STYLES: Record<ArtworkStatus, string> = {
  in_progress: "bg-slate-gray text-white",
  finished: "bg-electric-cobalt text-white",
  exhibited: "bg-vivid-violet text-white",
  sold: "bg-forest text-white",
};

const STATUS_LABELS: Record<ArtworkStatus, string> = {
  in_progress: "In Progress",
  finished: "Finished",
  exhibited: "Exhibited",
  sold: "Sold",
};

export function StatusBadge({ status }: { status: ArtworkStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>;
}
```

- [ ] **Step 2: Upload form (client component for inline error display)**

Create `src/app/(dashboard)/artworks/upload-form.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { createArtwork } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UploadForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const result = await createArtwork(formData);
          setError(result.error ?? null);
          if (!result.error) (document.getElementById("upload-form") as HTMLFormElement)?.reset();
        });
      }}
      id="upload-form"
      className="bg-white rounded-card p-6 space-y-3 mb-8"
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="medium">Medium</Label>
          <Input id="medium" name="medium" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dimensions">Dimensions</Label>
          <Input id="dimensions" name="dimensions" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="price">Price</Label>
          <Input id="price" name="price" type="number" step="0.01" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="image">Image</Label>
        <Input id="image" name="image" type="file" accept="image/*" required />
      </div>
      <Button type="submit" disabled={pending} className="rounded-pill">
        {pending ? "Uploading..." : "Add artwork"}
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: Gallery page**

Create `src/app/(dashboard)/artworks/page.tsx`:
```tsx
import Image from "next/image";
import Link from "next/link";
import { db } from "@/db";
import { artworks } from "@/db/schema";
import { desc } from "drizzle-orm";
import { StatusBadge } from "@/components/status-badge";
import { UploadForm } from "./upload-form";

export default async function ArtworksPage() {
  const rows = await db.select().from(artworks).orderBy(desc(artworks.createdAt));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <main className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-ink-charcoal">Artwork Inventory</h1>
      <UploadForm />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {rows.map((art) => (
          <Link
            key={art.id}
            href={`/artworks/${art.id}`}
            className="bg-white rounded-card overflow-hidden block"
          >
            {art.imagePath && (
              <div className="relative aspect-square">
                <Image
                  src={`${supabaseUrl}/storage/v1/object/public/artwork-images/${art.imagePath}`}
                  alt={art.title}
                  fill
                  className="object-cover"
                />
              </div>
            )}
            <div className="p-4 space-y-2">
              <h2 className="font-medium text-ink-charcoal">{art.title}</h2>
              <p className="text-sm text-slate-gray">{art.medium} · {art.dimensions}</p>
              <StatusBadge status={art.status} />
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, log in, visit `/artworks`. Fill out the upload form with a real image and submit.
Expected: no error shown, form clears, the new artwork card appears in the grid with its image, title, medium/dimensions, and an "In Progress" badge.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add artworks gallery page with upload form"
```

---

### Task 11: Artwork detail page and print editions

**Files:**
- Modify: `src/app/(dashboard)/artworks/actions.ts` (add print edition actions)
- Create: `src/app/(dashboard)/artworks/[id]/page.tsx`
- Create: `src/app/(dashboard)/artworks/[id]/print-editions.tsx` (client component)
- Create: `src/app/(dashboard)/artworks/[id]/status-control.tsx` (client component)

**Interfaces:**
- Consumes: `db`, `artworks`, `printEditions` (Task 4); `StatusBadge` (Task 10); `updateArtworkStatus` (Task 9).
- Produces: `createPrintEdition(artworkId: string, formData: FormData): Promise<{ error?: string }>`, `markPrintSold(printEditionId: string): Promise<{ error?: string }>`.

- [ ] **Step 1: Add print edition actions**

Append to `src/app/(dashboard)/artworks/actions.ts`:
```ts
import { printEditions } from "@/db/schema";
import { sql } from "drizzle-orm";

export async function createPrintEdition(artworkId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const description = formData.get("description") as string;
  const editionSize = Number(formData.get("editionSize"));
  const price = formData.get("price") as string;

  if (!editionSize || editionSize < 1) return { error: "Edition size must be at least 1" };

  await db.insert(printEditions).values({
    userId: user.id,
    artworkId,
    description: description || null,
    editionSize,
    price: price || null,
  });

  revalidatePath(`/artworks/${artworkId}`);
  return {};
}

export async function markPrintSold(printEditionId: string) {
  const [edition] = await db.select().from(printEditions).where(eq(printEditions.id, printEditionId));
  if (!edition) return { error: "Print edition not found" };
  if (edition.soldCount >= edition.editionSize) return { error: "Edition is sold out" };

  await db.update(printEditions)
    .set({ soldCount: sql`${printEditions.soldCount} + 1` })
    .where(eq(printEditions.id, printEditionId));

  revalidatePath(`/artworks/${edition.artworkId}`);
  return {};
}
```

- [ ] **Step 2: Print editions client component**

Create `src/app/(dashboard)/artworks/[id]/print-editions.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { createPrintEdition, markPrintSold } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PrintEdition = {
  id: string;
  description: string | null;
  editionSize: number;
  soldCount: number;
  price: string | null;
};

export function PrintEditions({ artworkId, editions }: { artworkId: string; editions: PrintEdition[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <h2 className="font-medium text-ink-charcoal">Prints</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-2">
        {editions.map((edition) => (
          <li key={edition.id} className="flex items-center justify-between bg-white rounded-card p-3">
            <span className="text-sm text-ink-charcoal">
              {edition.description} — {edition.soldCount}/{edition.editionSize} sold
              {edition.price && ` · $${edition.price}`}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={pending || edition.soldCount >= edition.editionSize}
              onClick={() => startTransition(async () => {
                const result = await markPrintSold(edition.id);
                setError(result.error ?? null);
              })}
            >
              Mark one sold
            </Button>
          </li>
        ))}
      </ul>
      <form
        action={(formData) => startTransition(async () => {
          const result = await createPrintEdition(artworkId, formData);
          setError(result.error ?? null);
        })}
        className="flex gap-2 items-end"
      >
        <div className="space-y-1">
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" placeholder="giclee on paper, 11x14" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="editionSize">Edition size</Label>
          <Input id="editionSize" name="editionSize" type="number" min="1" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="price">Price</Label>
          <Input id="price" name="price" type="number" step="0.01" />
        </div>
        <Button type="submit" disabled={pending} className="rounded-pill">Add edition</Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 3: Status control (client component)**

Create `src/app/(dashboard)/artworks/[id]/status-control.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { updateArtworkStatus } from "../actions";
import { StatusBadge } from "@/components/status-badge";
import type { ArtworkStatus } from "@/db/schema";

const STATUSES: ArtworkStatus[] = ["in_progress", "finished", "exhibited", "sold"];

export function StatusControl({ artworkId, status }: { artworkId: string; status: ArtworkStatus }) {
  const [current, setCurrent] = useState(status);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <StatusBadge status={current} />
      <select
        value={current}
        disabled={pending}
        className="text-sm border rounded-md px-2 py-1"
        onChange={(e) => {
          const next = e.target.value as ArtworkStatus;
          setCurrent(next);
          startTransition(() => updateArtworkStatus(artworkId, next));
        }}
      >
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}
```

- [ ] **Step 4: Detail page**

Create `src/app/(dashboard)/artworks/[id]/page.tsx`:
```tsx
import Image from "next/image";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { artworks, printEditions } from "@/db/schema";
import { PrintEditions } from "./print-editions";
import { StatusControl } from "./status-control";

export default async function ArtworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [art] = await db.select().from(artworks).where(eq(artworks.id, id));
  if (!art) notFound();

  const editions = await db.select().from(printEditions).where(eq(printEditions.artworkId, id));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <main className="p-8 max-w-3xl mx-auto space-y-6">
      {art.imagePath && (
        <div className="relative aspect-video rounded-card overflow-hidden">
          <Image
            src={`${supabaseUrl}/storage/v1/object/public/artwork-images/${art.imagePath}`}
            alt={art.title}
            fill
            className="object-cover"
          />
        </div>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-ink-charcoal">{art.title}</h1>
        <StatusControl artworkId={art.id} status={art.status} />
      </div>
      <p className="text-slate-gray">{art.medium} · {art.dimensions} · ${art.price}</p>
      <PrintEditions artworkId={art.id} editions={editions} />
    </main>
  );
}
```

- [ ] **Step 5: Verify manually**

Run: `npm run dev`, click into an artwork from `/artworks`. Add a print edition (e.g. size 5), confirm it appears as "0/5 sold". Click "Mark one sold" and confirm it updates to "1/5 sold". Click 4 more times and confirm the button disables at "5/5 sold". Change the status dropdown to "sold" and confirm the badge updates immediately.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add artwork detail page with print edition tracking"
```

---

### Task 12: Customer Server Actions and pages

**Files:**
- Create: `src/app/(dashboard)/customers/actions.ts`
- Create: `src/app/(dashboard)/customers/page.tsx`
- Create: `src/app/(dashboard)/customers/new-customer-form.tsx`
- Create: `src/app/(dashboard)/customers/[id]/page.tsx`

**Interfaces:**
- Consumes: `db`, `customers` (Task 4).
- Produces: `createCustomer(formData: FormData): Promise<{ error?: string }>` — Task 13's commission form uses this list to populate a customer picker.

- [ ] **Step 1: Server actions**

Create `src/app/(dashboard)/customers/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const name = formData.get("name") as string;
  if (!name) return { error: "Name is required" };

  await db.insert(customers).values({
    userId: user.id,
    name,
    email: (formData.get("email") as string) || null,
    phone: (formData.get("phone") as string) || null,
    notes: (formData.get("notes") as string) || null,
  });

  revalidatePath("/customers");
  return {};
}
```

- [ ] **Step 2: New customer form (client component)**

Create `src/app/(dashboard)/customers/new-customer-form.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { createCustomer } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewCustomerForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(async () => {
        const result = await createCustomer(formData);
        setError(result.error ?? null);
        if (!result.error) (document.getElementById("customer-form") as HTMLFormElement)?.reset();
      })}
      id="customer-form"
      className="bg-white rounded-card p-6 space-y-3 mb-8 grid grid-cols-2 gap-3"
    >
      {error && <p className="text-sm text-red-600 col-span-2">{error}</p>}
      <div className="space-y-1">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="phone">Phone</Label>
        <Input id="phone" name="phone" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="notes">Notes</Label>
        <Input id="notes" name="notes" />
      </div>
      <Button type="submit" disabled={pending} className="rounded-pill col-span-2 w-fit">
        Add customer
      </Button>
    </form>
  );
}
```

- [ ] **Step 3: List and detail pages**

Create `src/app/(dashboard)/customers/page.tsx`:
```tsx
import Link from "next/link";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { NewCustomerForm } from "./new-customer-form";

export default async function CustomersPage() {
  const rows = await db.select().from(customers);

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-ink-charcoal">Customers</h1>
      <NewCustomerForm />
      <ul className="space-y-2">
        {rows.map((c) => (
          <li key={c.id}>
            <Link href={`/customers/${c.id}`} className="block bg-white rounded-card p-4">
              <p className="font-medium text-ink-charcoal">{c.name}</p>
              <p className="text-sm text-slate-gray">{c.email} {c.phone}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

Create `src/app/(dashboard)/customers/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer] = await db.select().from(customers).where(eq(customers.id, id));
  if (!customer) notFound();

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-2">
      <h1 className="text-2xl font-semibold text-ink-charcoal">{customer.name}</h1>
      <p className="text-slate-gray">{customer.email} · {customer.phone}</p>
      {customer.notes && <p className="text-ink-charcoal">{customer.notes}</p>}
    </main>
  );
}
```

- [ ] **Step 4: Verify manually**

Run: `npm run dev`, visit `/customers`, add a customer, confirm it appears in the list and its detail page renders.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "Add customer Server Actions and pages"
```

---

### Task 13: Commission Server Actions and kanban board

**Files:**
- Create: `src/app/(dashboard)/commissions/actions.ts`
- Create: `src/app/(dashboard)/commissions/page.tsx`
- Create: `src/app/(dashboard)/commissions/board.tsx` (client component)
- Create: `src/app/(dashboard)/commissions/new-commission-form.tsx` (client component)

**Interfaces:**
- Consumes: `db`, `commissions`, `customers` (Task 4).
- Produces: `updateCommissionStage`, `updateProgressNotes` — no downstream task consumes these directly, but they follow the same `{ error? }` Server Action shape as every other feature for consistency.

- [ ] **Step 1: Server actions**

Create `src/app/(dashboard)/commissions/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { commissions, type CommissionStage } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export async function createCommission(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const customerId = formData.get("customerId") as string;
  const deadline = formData.get("deadline") as string;
  if (!customerId) return { error: "Customer is required" };

  await db.insert(commissions).values({
    userId: user.id,
    customerId,
    deadline: deadline || null,
  });

  revalidatePath("/commissions");
  return {};
}

export async function updateCommissionStage(id: string, stage: CommissionStage) {
  await db.update(commissions).set({ stage, updatedAt: new Date() }).where(eq(commissions.id, id));
  revalidatePath("/commissions");
  return {};
}

export async function updateProgressNotes(id: string, notes: string) {
  await db.update(commissions).set({ progressNotes: notes, updatedAt: new Date() }).where(eq(commissions.id, id));
  revalidatePath("/commissions");
  return {};
}
```

- [ ] **Step 2: New commission form**

Create `src/app/(dashboard)/commissions/new-commission-form.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { createCommission } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Customer = { id: string; name: string };

export function NewCommissionForm({ customers }: { customers: Customer[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(async () => {
        const result = await createCommission(formData);
        setError(result.error ?? null);
      })}
      className="bg-white rounded-card p-6 space-y-3 mb-8 flex gap-3 items-end"
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-1">
        <Label htmlFor="customerId">Customer</Label>
        <select id="customerId" name="customerId" required className="border rounded-md px-3 py-2">
          <option value="">Select...</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="deadline">Deadline</Label>
        <Input id="deadline" name="deadline" type="date" />
      </div>
      <Button type="submit" disabled={pending} className="rounded-pill">New commission</Button>
    </form>
  );
}
```

- [ ] **Step 3: Kanban board (client component)**

Create `src/app/(dashboard)/commissions/board.tsx`:
```tsx
"use client";

import { useTransition } from "react";
import { updateCommissionStage, updateProgressNotes } from "./actions";
import type { CommissionStage } from "@/db/schema";

const STAGES: { key: CommissionStage; label: string }[] = [
  { key: "inquiry", label: "Inquiry" },
  { key: "deposit_paid", label: "Deposit Paid" },
  { key: "painting", label: "Painting" },
  { key: "finished", label: "Finished" },
  { key: "delivered", label: "Delivered" },
];

type Commission = {
  id: string;
  stage: CommissionStage;
  deadline: string | null;
  progressNotes: string | null;
  customerName: string;
};

export function Board({ commissions }: { commissions: Commission[] }) {
  const [, startTransition] = useTransition();
  const isOverdue = (c: Commission) =>
    c.deadline && c.stage !== "delivered" && new Date(c.deadline) < new Date();

  return (
    <div className="grid grid-cols-5 gap-4">
      {STAGES.map((stage) => (
        <div key={stage.key} className="space-y-3">
          <h2 className="font-medium text-ink-charcoal text-sm">{stage.label}</h2>
          {commissions.filter((c) => c.stage === stage.key).map((c) => (
            <div key={c.id} className="bg-white rounded-card p-3 space-y-2">
              <p className="font-medium text-sm">{c.customerName}</p>
              {c.deadline && (
                <p className={`text-xs ${isOverdue(c) ? "text-red-600" : "text-slate-gray"}`}>
                  Due {c.deadline}
                </p>
              )}
              <textarea
                defaultValue={c.progressNotes ?? ""}
                placeholder="Progress notes..."
                className="w-full text-xs border rounded p-2"
                onBlur={(e) => startTransition(() => updateProgressNotes(c.id, e.target.value))}
              />
              <select
                value={c.stage}
                className="w-full text-xs border rounded p-1"
                onChange={(e) => startTransition(() => updateCommissionStage(c.id, e.target.value as CommissionStage))}
              >
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Page**

Create `src/app/(dashboard)/commissions/page.tsx`:
```tsx
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { commissions, customers } from "@/db/schema";
import { Board } from "./board";
import { NewCommissionForm } from "./new-commission-form";

export default async function CommissionsPage() {
  const customerRows = await db.select().from(customers);
  const commissionRows = await db
    .select({
      id: commissions.id,
      stage: commissions.stage,
      deadline: commissions.deadline,
      progressNotes: commissions.progressNotes,
      customerName: customers.name,
    })
    .from(commissions)
    .innerJoin(customers, eq(commissions.customerId, customers.id));

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-ink-charcoal">Commissions</h1>
      <NewCommissionForm customers={customerRows} />
      <Board commissions={commissionRows} />
    </main>
  );
}
```

- [ ] **Step 5: Verify manually**

Run: `npm run dev`, visit `/commissions` (with at least one customer created in Task 12). Create a commission, confirm it appears in the "Inquiry" column. Change its stage dropdown to "Painting" and confirm it moves columns after a page refresh (Server Action triggers `revalidatePath`, so it should move without a manual refresh — confirm that). Set a past deadline and confirm the overdue date renders in red.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add commission Server Actions and kanban board"
```

---

### Task 14: Exhibition overlap validation (unit tested)

**Files:**
- Create: `src/lib/exhibition-overlap.ts`
- Test: `src/lib/exhibition-overlap.test.ts`
- Modify: `package.json` (add `"test": "vitest run"` script)

**Interfaces:**
- Produces: `rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean` — Task 15's `assignArtwork` action calls this directly.

This is the one piece of real business logic called out in the spec's Testing section — it gets an actual TDD cycle, unlike the rest of the app.

- [ ] **Step 1: Add the test script**

In `package.json` `"scripts"`, add:
```json
"test": "vitest run"
```

- [ ] **Step 2: Write the failing test**

Create `src/lib/exhibition-overlap.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import { rangesOverlap } from "./exhibition-overlap";

describe("rangesOverlap", () => {
  it("returns true when ranges fully overlap", () => {
    expect(rangesOverlap("2026-01-01", "2026-01-31", "2026-01-10", "2026-01-20")).toBe(true);
  });

  it("returns true when ranges partially overlap", () => {
    expect(rangesOverlap("2026-01-01", "2026-01-15", "2026-01-10", "2026-01-31")).toBe(true);
  });

  it("returns true when ranges touch at a single boundary day", () => {
    expect(rangesOverlap("2026-01-01", "2026-01-10", "2026-01-10", "2026-01-20")).toBe(true);
  });

  it("returns false when ranges don't overlap", () => {
    expect(rangesOverlap("2026-01-01", "2026-01-10", "2026-02-01", "2026-02-10")).toBe(false);
  });

  it("returns false regardless of argument order (a after b)", () => {
    expect(rangesOverlap("2026-02-01", "2026-02-10", "2026-01-01", "2026-01-10")).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test and confirm it fails**

Run: `npx vitest run src/lib/exhibition-overlap.test.ts`
Expected: FAIL — `Cannot find module './exhibition-overlap'`.

- [ ] **Step 4: Implement**

Create `src/lib/exhibition-overlap.ts`:
```ts
export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return aStart <= bEnd && bStart <= aEnd;
}
```

- [ ] **Step 5: Run the test and confirm it passes**

Run: `npx vitest run src/lib/exhibition-overlap.test.ts`
Expected: all 5 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add exhibition date-overlap validation with unit tests"
```

---

### Task 15: Exhibition Server Actions

**Files:**
- Create: `src/app/(dashboard)/exhibitions/actions.ts`

**Interfaces:**
- Consumes: `db`, `exhibitions`, `exhibitionArtworks`, `artworks` (Task 4); `rangesOverlap` (Task 14).
- Produces: `createExhibition(formData: FormData)`, `assignArtwork(exhibitionId: string, artworkId: string): Promise<{ error?: string }>`, `unassignArtwork(exhibitionId: string, artworkId: string)` — Task 16's exhibition detail page calls these.

- [ ] **Step 1: Write the actions**

Create `src/app/(dashboard)/exhibitions/actions.ts`:
```ts
"use server";

import { revalidatePath } from "next/cache";
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { exhibitions, exhibitionArtworks, artworks } from "@/db/schema";
import { rangesOverlap } from "@/lib/exhibition-overlap";
import { createClient } from "@/lib/supabase/server";

export async function createExhibition(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const galleryName = formData.get("galleryName") as string;
  const startDate = formData.get("startDate") as string;
  const endDate = formData.get("endDate") as string;
  const submissionDeadline = formData.get("submissionDeadline") as string;

  if (!galleryName || !startDate || !endDate) {
    return { error: "Gallery name, start date, and end date are required" };
  }

  await db.insert(exhibitions).values({
    userId: user.id,
    galleryName,
    startDate,
    endDate,
    submissionDeadline: submissionDeadline || null,
  });

  revalidatePath("/exhibitions");
  return {};
}

export async function assignArtwork(exhibitionId: string, artworkId: string) {
  const [artwork] = await db.select().from(artworks).where(eq(artworks.id, artworkId));
  if (!artwork) return { error: "Artwork not found" };
  if (artwork.status === "sold") return { error: "Cannot assign a sold artwork to an exhibition" };

  const [targetExhibition] = await db.select().from(exhibitions).where(eq(exhibitions.id, exhibitionId));
  if (!targetExhibition) return { error: "Exhibition not found" };

  const otherAssignments = await db
    .select({ exhibitionId: exhibitionArtworks.exhibitionId })
    .from(exhibitionArtworks)
    .where(and(eq(exhibitionArtworks.artworkId, artworkId), ne(exhibitionArtworks.exhibitionId, exhibitionId)));

  for (const { exhibitionId: otherId } of otherAssignments) {
    const [other] = await db.select().from(exhibitions).where(eq(exhibitions.id, otherId));
    if (other && rangesOverlap(targetExhibition.startDate, targetExhibition.endDate, other.startDate, other.endDate)) {
      return { error: `Artwork is already booked for "${other.galleryName}" during an overlapping period` };
    }
  }

  await db.insert(exhibitionArtworks).values({ exhibitionId, artworkId }).onConflictDoNothing();
  revalidatePath(`/exhibitions/${exhibitionId}`);
  return {};
}

export async function unassignArtwork(exhibitionId: string, artworkId: string) {
  await db.delete(exhibitionArtworks).where(
    and(eq(exhibitionArtworks.exhibitionId, exhibitionId), eq(exhibitionArtworks.artworkId, artworkId)),
  );
  revalidatePath(`/exhibitions/${exhibitionId}`);
  return {};
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npm run build`
Expected: no type errors.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "Add exhibition Server Actions with double-booking validation"
```

---

### Task 16: Exhibitions pages, dashboard nav, and final integration

**Files:**
- Create: `src/app/(dashboard)/exhibitions/page.tsx`
- Create: `src/app/(dashboard)/exhibitions/new-exhibition-form.tsx`
- Create: `src/app/(dashboard)/exhibitions/[id]/page.tsx`
- Create: `src/app/(dashboard)/exhibitions/[id]/assign-artwork-form.tsx`
- Create: `src/app/(dashboard)/layout.tsx` (nav shell wrapping all dashboard routes)
- Modify: `src/app/page.tsx` (redirect root to `/artworks`)

**Interfaces:**
- Consumes: everything from Tasks 9–15.

- [ ] **Step 1: Exhibitions list page + new exhibition form**

Create `src/app/(dashboard)/exhibitions/new-exhibition-form.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { createExhibition } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewExhibitionForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(async () => {
        const result = await createExhibition(formData);
        setError(result.error ?? null);
      })}
      className="bg-white rounded-card p-6 space-y-3 mb-8 grid grid-cols-4 gap-3 items-end"
    >
      {error && <p className="text-sm text-red-600 col-span-4">{error}</p>}
      <div className="space-y-1">
        <Label htmlFor="galleryName">Gallery</Label>
        <Input id="galleryName" name="galleryName" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="submissionDeadline">Submission deadline</Label>
        <Input id="submissionDeadline" name="submissionDeadline" type="date" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="startDate">Start date</Label>
        <Input id="startDate" name="startDate" type="date" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="endDate">End date</Label>
        <Input id="endDate" name="endDate" type="date" required />
      </div>
      <Button type="submit" disabled={pending} className="rounded-pill col-span-4 w-fit">
        New exhibition
      </Button>
    </form>
  );
}
```

Create `src/app/(dashboard)/exhibitions/page.tsx`:
```tsx
import Link from "next/link";
import { db } from "@/db";
import { exhibitions } from "@/db/schema";
import { NewExhibitionForm } from "./new-exhibition-form";

export default async function ExhibitionsPage() {
  const rows = await db.select().from(exhibitions);

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-ink-charcoal">Exhibitions</h1>
      <NewExhibitionForm />
      <ul className="space-y-2">
        {rows.map((ex) => (
          <li key={ex.id}>
            <Link href={`/exhibitions/${ex.id}`} className="block bg-white rounded-card p-4">
              <p className="font-medium text-ink-charcoal">{ex.galleryName}</p>
              <p className="text-sm text-slate-gray">{ex.startDate} – {ex.endDate}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
```

- [ ] **Step 2: Exhibition detail page + assign form**

Create `src/app/(dashboard)/exhibitions/[id]/assign-artwork-form.tsx`:
```tsx
"use client";

import { useState, useTransition } from "react";
import { assignArtwork, unassignArtwork } from "../actions";
import { Button } from "@/components/ui/button";

type Artwork = { id: string; title: string };

export function AssignArtworkForm({
  exhibitionId, allArtworks, assignedIds,
}: { exhibitionId: string; allArtworks: Artwork[]; assignedIds: string[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const unassigned = allArtworks.filter((a) => !assignedIds.includes(a.id));

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-2">
        {allArtworks.filter((a) => assignedIds.includes(a.id)).map((a) => (
          <li key={a.id} className="flex items-center justify-between bg-white rounded-card p-3">
            <span>{a.title}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => startTransition(() => unassignArtwork(exhibitionId, a.id))}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      {unassigned.length > 0 && (
        <select
          className="border rounded-md px-3 py-2"
          defaultValue=""
          onChange={(e) => {
            const artworkId = e.target.value;
            if (!artworkId) return;
            startTransition(async () => {
              const result = await assignArtwork(exhibitionId, artworkId);
              setError(result.error ?? null);
            });
            e.target.value = "";
          }}
        >
          <option value="">Assign artwork...</option>
          {unassigned.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
      )}
    </div>
  );
}
```

Create `src/app/(dashboard)/exhibitions/[id]/page.tsx`:
```tsx
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { exhibitions, artworks, exhibitionArtworks } from "@/db/schema";
import { AssignArtworkForm } from "./assign-artwork-form";

export default async function ExhibitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [exhibition] = await db.select().from(exhibitions).where(eq(exhibitions.id, id));
  if (!exhibition) notFound();

  const allArtworks = await db.select({ id: artworks.id, title: artworks.title }).from(artworks);
  const assigned = await db
    .select({ artworkId: exhibitionArtworks.artworkId })
    .from(exhibitionArtworks)
    .where(eq(exhibitionArtworks.exhibitionId, id));

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-ink-charcoal">{exhibition.galleryName}</h1>
        <p className="text-slate-gray">{exhibition.startDate} – {exhibition.endDate}</p>
      </div>
      <AssignArtworkForm
        exhibitionId={id}
        allArtworks={allArtworks}
        assignedIds={assigned.map((a) => a.artworkId)}
      />
    </main>
  );
}
```

- [ ] **Step 3: Dashboard nav shell**

Create `src/app/(dashboard)/layout.tsx`:
```tsx
import Link from "next/link";
import { logout } from "./actions";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas-cream">
      <nav className="bg-white border-b border-hairline px-8 py-4 flex items-center justify-between">
        <div className="flex gap-6">
          <Link href="/artworks" className="text-ink-charcoal font-medium">Artworks</Link>
          <Link href="/customers" className="text-ink-charcoal font-medium">Customers</Link>
          <Link href="/commissions" className="text-ink-charcoal font-medium">Commissions</Link>
          <Link href="/exhibitions" className="text-ink-charcoal font-medium">Exhibitions</Link>
        </div>
        <form action={logout}>
          <Button variant="outline" size="sm" className="rounded-pill">Log out</Button>
        </form>
      </nav>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Redirect root to /artworks**

Replace `src/app/page.tsx`:
```tsx
import { redirect } from "next/navigation";

export default function Home() {
  redirect("/artworks");
}
```

- [ ] **Step 5: Full manual walkthrough**

Run: `npm run dev`. Starting from a logged-out session:
1. Visit `/` → redirected to `/login`.
2. Log in with the seeded account → redirected to `/artworks`.
3. Nav bar shows all four sections; clicking each loads its page inside the cream-background shell.
4. Create an exhibition A (e.g. Jan 1–31), create exhibition B (e.g. Jan 15–Feb 15) — overlapping.
5. Assign an existing artwork to exhibition A → succeeds.
6. Try assigning the same artwork to exhibition B → rejected with the overlap error message.
7. Create exhibition C (e.g. March 1–31) — non-overlapping with A. Assign the same artwork to C → succeeds.
8. Mark that artwork "Sold" using the status dropdown on its detail page (Task 11's `StatusControl`). Attempt to assign the sold artwork to a new exhibition → rejected.
9. Click "Log out" → redirected to `/login`, and visiting `/artworks` again redirects back to `/login`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "Add exhibitions pages, dashboard nav, and root redirect"
```
