import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { income, artworks } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { NewIncomeForm } from "./new-income-form";

export default async function IncomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const artworkRows = await db.select({ id: artworks.id, title: artworks.title })
    .from(artworks).where(eq(artworks.userId, user.id));

  // income.artworkId, when set, is always validated at write time (createIncome)
  // to belong to this user — so this join needs no additional user_id filter on
  // artworks, the same reasoning already documented for exhibition_artworks.
  const rows = await db
    .select({
      id: income.id,
      date: income.date,
      amount: income.amount,
      description: income.description,
      artworkTitle: artworks.title,
    })
    .from(income)
    .leftJoin(artworks, eq(income.artworkId, artworks.id))
    .where(eq(income.userId, user.id))
    .orderBy(desc(income.date));

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-ink-charcoal">Income</h1>
      <NewIncomeForm artworks={artworkRows} />
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.id} className="bg-white rounded-card p-4">
            <p className="font-medium text-ink-charcoal">${r.amount} — {r.description}</p>
            <p className="text-sm text-slate-gray">{r.date}{r.artworkTitle && ` · ${r.artworkTitle}`}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
