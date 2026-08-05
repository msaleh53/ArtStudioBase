# Artist Studio Management System — Design

## Overview

A single-tenant, internal-only web app for an independent artist to manage their artwork inventory, commission pipeline, and exhibition calendar. Built as a full-stack portfolio project demonstrating Next.js + Supabase proficiency.

- **Tenancy**: single tenant. One seeded artist account. No public signup, no public-facing pages — everything lives behind login.
- **Auth**: Supabase email/password.
- **Visual style**: follows the token set in `DESIGN.md` (the "Dock" reference — cream canvas `#faf9f7`, cobalt `#0068f9` accent, pill buttons, 16px card radius, Roobert/Inter type), applied on top of Shadcn UI primitives.

## Architecture

- **Framework**: Next.js 14, App Router, deployed to Vercel.
- **Mutations**: Server Actions throughout — no separate REST/route-handler API layer, since this is a single-client internal tool.
- **Database**: Supabase Postgres, accessed via **Drizzle ORM**.
  - Chosen over Prisma: lighter runtime and faster cold starts on Vercel serverless (no bundled query-engine binary), and its SQL-like query builder pairs naturally with hand-written RLS policy migrations — Supabase's own workflow is SQL-migration-first, which fits drizzle-kit's model better than Prisma's migration engine.
- **Auth & authorization**: Supabase Auth (email/password). Every table carries `user_id`, enforced by RLS policies (`user_id = auth.uid()`). No signup UI; the one artist account is created via a seed script.
- **File storage**: Supabase Storage, one bucket for artwork images, RLS-protected by `user_id` path prefix.
- **Images**: store the original upload only, at `{user_id}/{artwork_id}/original.{ext}`. Rendering uses `next/image` for responsive resizing/optimization at request time — no separate thumbnail-generation pipeline.
- **Styling**: Tailwind CSS + Shadcn UI, restyled with DESIGN.md's tokens (colors, type scale, radius, shadows).

## Data Model

```
artworks
  id            uuid pk
  user_id       uuid fk -> auth.users
  title         text
  medium        text
  dimensions    text
  price         numeric
  status        enum (in_progress | finished | exhibited | sold)
  image_path    text
  created_at    timestamptz
  updated_at    timestamptz

customers
  id            uuid pk
  user_id       uuid fk -> auth.users
  name          text
  email         text
  phone         text
  notes         text

commissions
  id              uuid pk
  user_id         uuid fk -> auth.users
  customer_id     uuid fk -> customers
  artwork_id      uuid fk -> artworks, nullable, UNIQUE
  stage           enum (inquiry | deposit_paid | painting | finished | delivered)
  deadline        date
  progress_notes  text
  created_at      timestamptz
  updated_at      timestamptz

exhibitions
  id                    uuid pk
  user_id               uuid fk -> auth.users
  gallery_name          text
  submission_deadline   date
  start_date            date
  end_date              date

exhibition_artworks   (join table)
  exhibition_id   uuid fk -> exhibitions
  artwork_id      uuid fk -> artworks
  primary key (exhibition_id, artwork_id)

print_editions
  id              uuid pk
  user_id         uuid fk -> auth.users
  artwork_id      uuid fk -> artworks
  description     text        -- e.g. "giclee on paper, 11x14"
  edition_size    int
  price           numeric
  sold_count      int, default 0
  created_at      timestamptz
```

A print edition is a reproduction run tied to an original artwork — tracked as a simple stock counter (`sold_count` of `edition_size`), not individual numbered units. An artwork can have zero or more print editions (e.g. a small and a large size run). RLS restricts rows to `user_id = auth.uid()`, same as the other tables.

**Modeling assumption**: concept.md's `Artworks (1) ---< Commissions (1)` relationship is interpreted as: a commission optionally references one artwork (the piece being tracked through production), and an artwork can be attached to at most one commission at a time — enforced via a unique constraint on `commissions.artwork_id`.

Every table (`artworks`, `customers`, `commissions`, `exhibitions`, `print_editions`) has an RLS policy restricting rows to `user_id = auth.uid()`.

## Feature 1 — Visual Artwork Inventory Catalog

- Responsive Shadcn Card grid (1/2/3/4 columns by breakpoint) showing artwork images.
- Each card: image, title, medium/dimensions, and a color-coded status badge:
  - In Progress → slate
  - Finished → cobalt
  - Exhibited → violet
  - Sold → forest green
  (using DESIGN.md's accent palette)
- Upload form: Server Action validates file type/size, uploads to the Storage bucket at `{user_id}/{artwork_id}/original.{ext}`, then writes the artwork row.
- Artwork detail view has a "Prints" section listing that artwork's print editions (description, price, `sold_count`/`edition_size`). A "Mark one sold" action increments `sold_count` via Server Action, rejecting once `sold_count === edition_size` (sold out). Adding a new print edition is a small inline form (description, edition size, price).

## Feature 2 — Commission Pipeline & Client CRM

- Customers: basic list + detail CRUD.
- Commissions: kanban-style board across the 5 pipeline stages (Inquiry, Deposit Paid, Painting, Finished, Delivered). A stage dropdown per card moves it between columns — no drag-and-drop required for MVP.
- Deadlines rendered with overdue styling when past due and not yet Delivered.
- Progress notes: plain textarea per active commission, saved via Server Action on blur.

## Feature 3 — Exhibition Calendar & Mapping

- Exhibitions list + detail page showing assigned artworks.
- Assigning an artwork to an exhibition runs server-side validation in the Server Action (not only a DB constraint, so a clear error message can be returned to the form):
  - Reject if the artwork's status is `sold`.
  - Reject if the artwork is already assigned to a **different** exhibition whose `[start_date, end_date]` range overlaps this exhibition's range.

## Error Handling

Server Actions return a `{ error }` shape on failure (validation failure, RLS rejection, Storage upload failure). Forms surface these as inline errors via Shadcn form components. No custom global error boundary beyond Next.js defaults.

## Testing

Given the portfolio/demo scope, no full automated test suite. Manual verification per feature using the `run` workflow. The one piece of real business logic — the exhibition date-overlap validation — is a candidate for a narrow unit test if desired later, but is out of scope for the initial build.

## Out of Scope (MVP)

- Public-facing artist portfolio/gallery pages.
- Multi-tenant signup/onboarding.
- Thumbnail generation pipeline.
- Drag-and-drop kanban interactions.
- Payment processing (deposit tracking is a status field only, not a payment integration).
