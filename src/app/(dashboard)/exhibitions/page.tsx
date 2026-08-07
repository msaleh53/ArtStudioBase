import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { exhibitions } from "@/db/schema";
import { NewExhibitionForm } from "./new-exhibition-form";
import { createClient } from "@/lib/supabase/server";

export default async function ExhibitionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const rows = await db.select().from(exhibitions).where(eq(exhibitions.userId, user.id));

  return (
    <main className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-ink-charcoal">Exhibitions</h1>
      <NewExhibitionForm />
      {rows.length === 0 && (
        <p className="text-sm text-slate-gray mb-2">No exhibitions yet.</p>
      )}
      <ul className="space-y-2">
        {rows.map((ex) => (
          <li key={ex.id}>
            <Link href={`/exhibitions/${ex.id}`} className="block bg-white rounded-card p-4">
              <p className="font-medium text-ink-charcoal">{ex.galleryName}</p>
              <p className="text-sm text-slate-gray">{ex.startDate} – {ex.endDate}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
