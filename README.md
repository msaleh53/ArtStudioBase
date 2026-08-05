Artist Studio Management System — a single-tenant Next.js + Supabase app for an independent artist to manage their artwork inventory, commission pipeline, and exhibition calendar. See `docs/superpowers/specs/2026-08-05-artist-studio-design.md` for the full design doc.

## Setup

Provisioning must happen in this order — later steps depend on tables/policies created by earlier ones.

1. **Create a Supabase project** and collect four env vars from its dashboard:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `DATABASE_URL` — use the **Transaction pooler** connection string (port `6543`), not the direct connection.

   Copy `.env.example` to `.env.local` and fill these in.

2. **Apply the schema migration** (creates the six tables):

   ```bash
   npx drizzle-kit migrate
   ```

3. **Apply RLS policies** — hand-written SQL, not tracked by drizzle-kit's migration journal (drizzle-kit only generates schema DDL, not `create policy` statements), so it must be applied manually:

   ```bash
   psql "$DATABASE_URL" -f drizzle/migrations/0001_rls_policies.sql
   ```

4. **Create the storage bucket** — also hand-written SQL, also not drizzle-kit-tracked. Creates the `artwork-images` bucket and its access policy:

   ```bash
   psql "$DATABASE_URL" -f drizzle/migrations/0002_storage_bucket.sql
   ```

5. **Seed the one artist login account:**

   ```bash
   npm run seed -- <email> <password>
   ```

6. **Run the dev server:**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000) and log in with the credentials from step 5.

> **Note:** `drizzle-kit` reads `DATABASE_URL` from the environment (via `drizzle.config.ts`) and does *not* auto-load `.env.local`. The app itself (via Next.js) loads `.env.local` automatically, so this only matters for standalone `drizzle-kit` CLI invocations (step 2). If `drizzle-kit migrate` can't find `DATABASE_URL`, export it first, e.g.:
>
> ```bash
> export $(grep -v '^#' .env.local | xargs)
> ```

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
