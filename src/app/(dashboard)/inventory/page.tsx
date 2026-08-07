import Link from "next/link";
import { and, eq, gt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { materials, artworks, printEditions } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const [unsoldOriginals, editionsWithStock, materialRows] = await Promise.all([
    db.select({ id: artworks.id, title: artworks.title, status: artworks.status })
      .from(artworks)
      .where(and(
        eq(artworks.userId, user.id),
        or(eq(artworks.status, "finished"), eq(artworks.status, "exhibited")),
      ))
      .orderBy(artworks.title),
    db.select({
      id: printEditions.id,
      description: printEditions.description,
      editionSize: printEditions.editionSize,
      soldCount: printEditions.soldCount,
      artworkId: printEditions.artworkId,
      artworkTitle: artworks.title,
    })
      .from(printEditions)
      // printEditions.artworkId is always validated at write time to belong to this
      // user; the userId check on the join below is defense-in-depth.
      .innerJoin(artworks, and(eq(printEditions.artworkId, artworks.id), eq(artworks.userId, user.id)))
      .where(and(
        eq(printEditions.userId, user.id),
        gt(sql`${printEditions.editionSize} - ${printEditions.soldCount}`, 0),
      ))
      .orderBy(artworks.title),
    db.select().from(materials).where(eq(materials.userId, user.id)).orderBy(materials.name),
  ]);

  return (
    <main className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold text-ink-charcoal">Inventory</h1>

      <section className="bg-white rounded-card p-4 space-y-3">
        <h2 className="font-medium text-ink-charcoal">Stock on hand</h2>
        {unsoldOriginals.length === 0 && editionsWithStock.length === 0 && (
          <p className="text-sm text-slate-gray">No unsold originals or prints in stock.</p>
        )}
        <ul className="space-y-1">
          {unsoldOriginals.map((a) => (
            <li key={a.id}>
              <Link href={`/artworks/${a.id}`} className="flex justify-between text-sm">
                <span className="text-ink-charcoal">{a.title}</span>
                <span className="text-slate-gray capitalize">{a.status}</span>
              </Link>
            </li>
          ))}
          {editionsWithStock.map((e) => (
            <li key={e.id}>
              <Link href={`/artworks/${e.artworkId}`} className="flex justify-between text-sm">
                <span className="text-ink-charcoal">{e.artworkTitle}{e.description && ` · ${e.description}`}</span>
                <span className="text-slate-gray">{e.editionSize - e.soldCount} of {e.editionSize} remaining</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white rounded-card p-4 space-y-3">
        <div className="flex justify-between items-center">
          <h2 className="font-medium text-ink-charcoal">Materials</h2>
          <Link href="/inventory/materials" className="text-sm text-electric-cobalt">Manage materials</Link>
        </div>
        {materialRows.length === 0 && (
          <p className="text-sm text-slate-gray">No materials tracked yet — add paint, canvas, or framing stock to start logging usage.</p>
        )}
        <ul className="space-y-1">
          {materialRows.map((m) => (
            <li key={m.id} className="flex justify-between text-sm">
              <span className="text-ink-charcoal">{m.name}</span>
              <span className="text-slate-gray">{m.quantity} {m.unit}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
