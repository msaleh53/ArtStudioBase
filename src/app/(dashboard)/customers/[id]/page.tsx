import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [customer] = await db.select().from(customers).where(eq(customers.id, id));
  if (!customer) notFound();

  return (
    <main className="p-8 max-w-2xl mx-auto space-y-2">
      <h1 className="text-2xl font-semibold text-ink-charcoal">{customer.name}</h1>
      <p className="text-slate-gray">{customer.email} · {customer.phone}</p>
      {customer.notes && <p className="text-ink-charcoal">{customer.notes}</p>}
    </main>
  );
}
