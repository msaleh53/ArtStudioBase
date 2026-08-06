import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { expenses } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/currency";
import { NewExpenseForm } from "./new-expense-form";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/expense-category";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const rows = await db.select().from(expenses)
    .where(eq(expenses.userId, user.id)).orderBy(desc(expenses.date));

  const rowsWithReceiptUrls = await Promise.all(
    rows.map(async (r) => {
      if (!r.receiptPath) return { ...r, receiptUrl: null as string | null };
      const { data } = await supabase.storage.from("receipts").createSignedUrl(r.receiptPath, 3600);
      return { ...r, receiptUrl: data?.signedUrl ?? null };
    }),
  );

  return (
    <main className="p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-semibold mb-6 text-ink-charcoal">Expenses</h1>
      <NewExpenseForm />
      <ul className="space-y-2">
        {rowsWithReceiptUrls.map((r) => (
          <li key={r.id} className="bg-white rounded-card p-4">
            <p className="font-medium text-ink-charcoal">{formatCurrency(r.amount)} — {EXPENSE_CATEGORY_LABELS[r.category]}</p>
            <p className="text-sm text-slate-gray">{r.date}{r.description && ` · ${r.description}`}</p>
            {r.receiptUrl && (
              <a href={r.receiptUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-electric-cobalt">
                View receipt
              </a>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
