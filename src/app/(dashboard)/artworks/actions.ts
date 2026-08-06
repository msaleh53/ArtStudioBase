"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { artworks, printEditions, type ArtworkStatus } from "@/db/schema";
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
    await db.delete(artworks).where(and(eq(artworks.id, row.id), eq(artworks.userId, user.id)));
    return { error: `Upload failed: ${uploadError.message}` };
  }

  await db.update(artworks).set({ imagePath: path }).where(and(eq(artworks.id, row.id), eq(artworks.userId, user.id)));

  revalidatePath("/artworks");
  return {};
}

export async function updateArtwork(id: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const [artwork] = await db.select().from(artworks).where(and(eq(artworks.id, id), eq(artworks.userId, user.id)));
  if (!artwork) return { error: "Artwork not found" };

  const title = formData.get("title") as string;
  const medium = formData.get("medium") as string;
  const dimensions = formData.get("dimensions") as string;
  const price = formData.get("price") as string;
  const description = formData.get("description") as string;
  const file = formData.get("image") as File | null;

  if (!title) return { error: "Title is required" };

  let imagePath = artwork.imagePath;

  if (file && file.size > 0) {
    if (!file.type.startsWith("image/")) return { error: "File must be an image" };
    if (file.size > 20 * 1024 * 1024) return { error: "Image must be under 20MB" };

    const ext = file.name.split(".").pop();
    const newPath = `${user.id}/${id}/original.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("artwork-images")
      .upload(newPath, file, { upsert: true });

    if (uploadError) return { error: `Upload failed: ${uploadError.message}` };

    if (artwork.imagePath && artwork.imagePath !== newPath) {
      await supabase.storage.from("artwork-images").remove([artwork.imagePath]);
    }

    imagePath = newPath;
  }

  await db.update(artworks).set({
    title,
    medium: medium || null,
    dimensions: dimensions || null,
    price: price || null,
    description: description || null,
    imagePath,
    updatedAt: new Date(),
  }).where(and(eq(artworks.id, id), eq(artworks.userId, user.id)));

  revalidatePath("/artworks");
  revalidatePath(`/artworks/${id}`);
  return {};
}

export async function updateArtworkStatus(id: string, status: ArtworkStatus) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  await db.update(artworks).set({ status, updatedAt: new Date() }).where(and(eq(artworks.id, id), eq(artworks.userId, user.id)));
  revalidatePath("/artworks");
  revalidatePath(`/artworks/${id}`);
  return {};
}

export async function createPrintEdition(artworkId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const description = formData.get("description") as string;
  const editionSize = Number(formData.get("editionSize"));
  const price = formData.get("price") as string;

  if (!editionSize || editionSize < 1) return { error: "Edition size must be at least 1" };

  const [artwork] = await db.select().from(artworks).where(and(eq(artworks.id, artworkId), eq(artworks.userId, user.id)));
  if (!artwork) return { error: "Artwork not found" };

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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const [edition] = await db.select().from(printEditions).where(and(eq(printEditions.id, printEditionId), eq(printEditions.userId, user.id)));
  if (!edition) return { error: "Print edition not found" };
  if (edition.soldCount >= edition.editionSize) return { error: "Edition is sold out" };

  await db.update(printEditions)
    .set({ soldCount: sql`${printEditions.soldCount} + 1` })
    .where(and(eq(printEditions.id, printEditionId), eq(printEditions.userId, user.id)));

  revalidatePath(`/artworks/${edition.artworkId}`);
  return {};
}
