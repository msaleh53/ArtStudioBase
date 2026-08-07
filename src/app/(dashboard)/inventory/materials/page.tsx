import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { materials, materialLogs } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { NewMaterialForm } from "./new-material-form";
import { MaterialLogForm } from "./material-log-form";

export default async function MaterialsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const materialRows = await db.select().from(materials)
    .where(eq(materials.userId, user.id)).orderBy(materials.name);

  const materialsWithLogs = await Promise.all(
    materialRows.map(async (m) => {
      const logs = await db.select().from(materialLogs)
        .where(and(eq(materialLogs.materialId, m.id), eq(materialLogs.userId, user.id)))
        .orderBy(desc(materialLogs.date)).limit(5);
      return { ...m, logs };
    }),
  );

  return (
    <main className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-ink-charcoal">Materials</h1>
      <NewMaterialForm />
      <ul className="space-y-4">
        {materialsWithLogs.map((m) => (
          <li key={m.id} className="bg-white rounded-card p-4">
            <p className="font-medium text-ink-charcoal">{m.name}</p>
            <p className="text-sm text-slate-gray">{m.quantity} {m.unit} on hand</p>
            <MaterialLogForm materialId={m.id} />
            {m.logs.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-hairline pt-2">
                {m.logs.map((l) => (
                  <li key={l.id} className="text-sm text-slate-gray flex justify-between">
                    <span>{l.date}{l.note && ` · ${l.note}`}</span>
                    <span>{Number(l.change) > 0 ? "+" : ""}{l.change} {m.unit}</span>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
