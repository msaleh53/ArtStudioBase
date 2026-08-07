import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { exhibitions, artworks, exhibitionArtworks } from "@/db/schema";
import { AssignArtworkForm } from "./assign-artwork-form";
import { createClient } from "@/lib/supabase/server";

export default async function ExhibitionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const [exhibition] = await db
    .select()
    .from(exhibitions)
    .where(and(eq(exhibitions.id, id), eq(exhibitions.userId, user.id)));
  if (!exhibition) notFound();

  const allArtworks = await db
    .select({ id: artworks.id, title: artworks.title })
    .from(artworks)
    .where(eq(artworks.userId, user.id));
  const assigned = await db
    .select({ artworkId: exhibitionArtworks.artworkId })
    .from(exhibitionArtworks)
    .where(eq(exhibitionArtworks.exhibitionId, id));

  return (
    <main className="p-4 md:p-8 max-w-2xl mx-auto space-y-6">
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
