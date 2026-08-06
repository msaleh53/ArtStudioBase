# Edit Artwork — Design

## Overview

Lets the artist edit an existing artwork's fields — title, medium, dimensions, price, description, and the image — from the artwork detail page. Currently these fields are set once at creation (`createArtwork`) and never editable afterward; only status has an update path (`updateArtworkStatus`).

## Schema Change

Add a `description` column to `artworks` (it doesn't exist today):

```
description   text, nullable
```

New Drizzle migration, following the same process as the existing `customers.createdAt` migration (check `drizzle/migrations/meta/_journal.json` for the next free index before generating, since some migrations in this repo are hand-written and unjournaled).

## Server Action

New `updateArtwork(id: string, formData: FormData): Promise<{ error?: string }>` in `src/app/(dashboard)/artworks/actions.ts`, alongside the existing `createArtwork`/`updateArtworkStatus`:

- Fetches the authenticated user via `createClient()`; all reads/writes scoped by `and(eq(artworks.id, id), eq(artworks.userId, user.id))` — same app-level RLS-bypass mitigation used everywhere else in this codebase.
- Validates `title` is non-empty (same rule `createArtwork` already enforces).
- Updates `title`, `medium`, `dimensions`, `price`, `description`, and `updatedAt`.
- If a new image file is present in the form data (optional — editing text fields without replacing the image is the common case): validate it's an image type under 20MB (same checks `createArtwork` uses), then upload to the *same* storage path the artwork already has (`{userId}/{artworkId}/original.{ext}`), overwriting the existing object via `upload(path, file, { upsert: true })`. This avoids orphaning the old file or needing a new `imagePath` when the extension is unchanged; if the new file's extension differs from the existing one, delete the old object first (via `.remove([oldPath])`) and update `imagePath` to the new extension.
- Returns `{ error: string }` on failure, `{}` on success, matching every other Server Action in this codebase.
- Calls `revalidatePath` for both `/artworks` (gallery thumbnail/title may have changed) and `/artworks/${id}`.

## UI

**New client component** `src/app/(dashboard)/artworks/[id]/edit-artwork.tsx`:

- Takes the current artwork fields as props.
- Renders in one of two modes, toggled by local `useState`:
  - **Display mode** (default): the existing static title/medium/dimensions/price/description text, plus an "Edit" button.
  - **Edit mode**: a form with `Input` fields for title/medium/dimensions/price, a `Textarea` for description, a file input for image replacement (optional — leaving it empty keeps the current image), and Save/Cancel buttons.
- Save calls `updateArtwork` via `useTransition`, mirroring the exact pattern `StatusControl` and `PrintEditions` already use in this same directory (local pending state, inline error display, no page navigation). On success, returns to display mode; the parent Server Component re-renders with fresh data on the next navigation/`revalidatePath`, but the component also optimistically updates its own local display state so the change is visible immediately without waiting for a round-trip.
- Cancel discards any in-progress edits and returns to display mode without saving.

**Detail page** (`src/app/(dashboard)/artworks/[id]/page.tsx`): replace the current static header/price block with `<EditArtwork artwork={art} />` (passing the full row). `StatusControl` stays a separate, adjacent component exactly as it is today — status changes are not part of this edit form, keeping the two concerns (status vs. descriptive fields) independently testable and visually distinct, consistent with the page's current layout.

## Out of Scope

- Editing status (already handled by `StatusControl`).
- Deleting an artwork.
- Multiple images per artwork.
