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
