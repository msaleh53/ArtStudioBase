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
