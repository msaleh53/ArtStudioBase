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
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const [artwork] = await db
    .select()
    .from(artworks)
    .where(and(eq(artworks.id, artworkId), eq(artworks.userId, user.id)));
  if (!artwork) return { error: "Artwork not found" };
  if (artwork.status === "sold") return { error: "Cannot assign a sold artwork to an exhibition" };

  const [targetExhibition] = await db
    .select()
    .from(exhibitions)
    .where(and(eq(exhibitions.id, exhibitionId), eq(exhibitions.userId, user.id)));
  if (!targetExhibition) return { error: "Exhibition not found" };

  // exhibitionArtworks has no user_id column of its own, but scoping the exhibition
  // lookup below by user.id is still safe: artworkId was already verified above as
  // owned by user.id, and every exhibitionArtworks row is created exclusively by this
  // function, which always verifies both the artwork and the exhibition are owned by
  // the caller before inserting. So any row returned here necessarily belongs to an
  // exhibition also owned by user.id — this filter can't silently drop a legitimate
  // overlap check.
  const otherAssignments = await db
    .select({ exhibitionId: exhibitionArtworks.exhibitionId })
    .from(exhibitionArtworks)
    .where(and(eq(exhibitionArtworks.artworkId, artworkId), ne(exhibitionArtworks.exhibitionId, exhibitionId)));

  for (const { exhibitionId: otherId } of otherAssignments) {
    const [other] = await db
      .select()
      .from(exhibitions)
      .where(and(eq(exhibitions.id, otherId), eq(exhibitions.userId, user.id)));
    if (other && rangesOverlap(targetExhibition.startDate, targetExhibition.endDate, other.startDate, other.endDate)) {
      return { error: `Artwork is already booked for "${other.galleryName}" during an overlapping period` };
    }
  }

  await db.insert(exhibitionArtworks).values({ exhibitionId, artworkId }).onConflictDoNothing();
  revalidatePath(`/exhibitions/${exhibitionId}`);
  return {};
}

export async function unassignArtwork(exhibitionId: string, artworkId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const [targetExhibition] = await db
    .select()
    .from(exhibitions)
    .where(and(eq(exhibitions.id, exhibitionId), eq(exhibitions.userId, user.id)));
  if (!targetExhibition) return { error: "Exhibition not found" };

  await db.delete(exhibitionArtworks).where(
    and(eq(exhibitionArtworks.exhibitionId, exhibitionId), eq(exhibitionArtworks.artworkId, artworkId)),
  );
  revalidatePath(`/exhibitions/${exhibitionId}`);
  return {};
}
