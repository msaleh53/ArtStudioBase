import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { customers } from "@/db/schema";
import { NewCustomerForm } from "./new-customer-form";
import { createClient } from "@/lib/supabase/server";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const rows = await db.select().from(customers).where(eq(customers.userId, user.id));

  return (
    <main className="p-4 md:p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-ink-charcoal">Customers</h1>
      <NewCustomerForm />
      {rows.length === 0 && (
        <p className="text-sm text-slate-gray mb-2">No customers yet — add one to start tracking commissions and sales.</p>
      )}
      <ul className="space-y-2">
        {rows.map((c) => (
          <li key={c.id}>
            <Link
              href={`/customers/${c.id}`}
              className="block bg-white rounded-card p-4 transition-[box-shadow,transform] duration-200 hover:shadow-lg active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
            >
              <p className="font-medium text-ink-charcoal">{c.name}</p>
              <p className="text-sm text-slate-gray">{c.email} {c.phone}</p>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
