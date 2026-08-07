import Image from "next/image";
import Link from "next/link";
import { db } from "@/db";
import { artworks } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { StatusBadge } from "@/components/status-badge";
import { UploadForm } from "./upload-form";
import { createClient } from "@/lib/supabase/server";

export default async function ArtworksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const rows = await db.select().from(artworks).where(eq(artworks.userId, user.id)).orderBy(desc(artworks.createdAt));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <main className="p-4 md:p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-ink-charcoal">Artwork Inventory</h1>
      <UploadForm isFirstUpload={rows.length === 0} />
      {rows.length === 0 && (
        <p className="text-sm text-slate-gray mb-6">No artworks yet — upload your first piece above.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {rows.map((art) => (
          <Link
            key={art.id}
            href={`/artworks/${art.id}`}
            className="bg-white rounded-card overflow-hidden block group transition-shadow duration-200 hover:shadow-lg motion-reduce:transition-none"
          >
            {art.imagePath && (
              <div className="relative aspect-square overflow-hidden">
                <Image
                  src={`${supabaseUrl}/storage/v1/object/public/artwork-images/${art.imagePath}`}
                  alt={art.title}
                  fill
                  className="object-cover transition-transform duration-200 group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
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
