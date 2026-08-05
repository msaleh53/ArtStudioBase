import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { commissions, customers } from "@/db/schema";
import { Board } from "./board";
import { NewCommissionForm } from "./new-commission-form";
import { createClient } from "@/lib/supabase/server";

export default async function CommissionsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const customerRows = await db.select().from(customers).where(eq(customers.userId, user.id));
  const commissionRows = await db
    .select({
      id: commissions.id,
      stage: commissions.stage,
      deadline: commissions.deadline,
      progressNotes: commissions.progressNotes,
      customerName: customers.name,
    })
    .from(commissions)
    .innerJoin(customers, eq(commissions.customerId, customers.id))
    .where(and(eq(commissions.userId, user.id), eq(customers.userId, user.id)));

  return (
    <main className="p-8 max-w-7xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-ink-charcoal">Commissions</h1>
      <NewCommissionForm customers={customerRows} />
      <Board commissions={commissionRows} />
    </main>
  );
}
