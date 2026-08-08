import Link from "next/link";
import { and, desc, eq, gte, lt } from "drizzle-orm";
import { db } from "@/db";
import { income, expenses } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { EXPENSE_CATEGORY_LABELS } from "@/lib/expense-category";
import { formatCurrency } from "@/lib/currency";
import type { ExpenseCategory } from "@/db/schema";

function currentMonthRange(): { start: string; end: string } {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export default async function FinancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { start, end } = currentMonthRange();

  const [monthIncomeRows, monthExpenseRows, recentIncome, recentExpenses] = await Promise.all([
    db.select({ amount: income.amount }).from(income)
      .where(and(eq(income.userId, user.id), gte(income.date, start), lt(income.date, end))),
    db.select({ amount: expenses.amount, category: expenses.category }).from(expenses)
      .where(and(eq(expenses.userId, user.id), gte(expenses.date, start), lt(expenses.date, end))),
    db.select().from(income).where(eq(income.userId, user.id)).orderBy(desc(income.date)).limit(5),
    db.select().from(expenses).where(eq(expenses.userId, user.id)).orderBy(desc(expenses.date)).limit(5),
  ]);

  const monthIncomeTotal = monthIncomeRows.reduce((sum, r) => sum + Number(r.amount), 0);
  const monthExpenseTotal = monthExpenseRows.reduce((sum, r) => sum + Number(r.amount), 0);
  const net = monthIncomeTotal - monthExpenseTotal;

  const categoryTotals = monthExpenseRows.reduce((acc, r) => {
    acc[r.category] = (acc[r.category] ?? 0) + Number(r.amount);
    return acc;
  }, {} as Record<ExpenseCategory, number>);

  return (
    <main className="p-4 md:p-8 max-w-4xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold text-ink-charcoal">Finance</h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-card p-4">
          <p className="text-sm text-slate-gray">This month&apos;s income</p>
          <p className="text-2xl font-semibold text-ink-charcoal">{formatCurrency(monthIncomeTotal)}</p>
        </div>
        <div className="bg-white rounded-card p-4">
          <p className="text-sm text-slate-gray">This month&apos;s expenses</p>
          <p className="text-2xl font-semibold text-ink-charcoal">{formatCurrency(monthExpenseTotal)}</p>
        </div>
        <div className="bg-white rounded-card p-4">
          <p className="text-sm text-slate-gray">Net</p>
          <p className="text-2xl font-semibold text-ink-charcoal">{formatCurrency(net)}</p>
        </div>
      </div>

      <section className="bg-white rounded-card p-4 space-y-3">
        <h2 className="font-medium text-ink-charcoal">Expenses by category (this month)</h2>
        {Object.keys(categoryTotals).length === 0 && (
          <p className="text-sm text-slate-gray">No expenses logged this month.</p>
        )}
        <ul className="space-y-1">
          {(Object.entries(categoryTotals) as [ExpenseCategory, number][]).map(([category, total]) => (
            <li key={category} className="flex justify-between text-sm">
              <span className="text-ink-charcoal">{EXPENSE_CATEGORY_LABELS[category]}</span>
              <span className="text-slate-gray">{formatCurrency(total)}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white rounded-card p-4 space-y-3">
          <h2 className="font-medium text-ink-charcoal">Recent income</h2>
          {recentIncome.length === 0 && <p className="text-sm text-slate-gray">No income logged yet.</p>}
          <ul className="space-y-2">
            {recentIncome.map((r) => (
              <li key={r.id}>
                <Link
                  href="/finance/income"
                  className="block text-sm -mx-2 px-2 py-1 rounded-md transition-[background-color,transform] duration-150 hover:bg-canvas-cream active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
                >
                  <span className="text-ink-charcoal">{formatCurrency(r.amount)}</span>{" "}
                  <span className="text-slate-gray">{r.description}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="bg-white rounded-card p-4 space-y-3">
          <h2 className="font-medium text-ink-charcoal">Recent expenses</h2>
          {recentExpenses.length === 0 && <p className="text-sm text-slate-gray">No expenses logged yet.</p>}
          <ul className="space-y-2">
            {recentExpenses.map((r) => (
              <li key={r.id}>
                <Link
                  href="/finance/expenses"
                  className="block text-sm -mx-2 px-2 py-1 rounded-md transition-[background-color,transform] duration-150 hover:bg-canvas-cream active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
                >
                  <span className="text-ink-charcoal">{formatCurrency(r.amount)}</span>{" "}
                  <span className="text-slate-gray">{EXPENSE_CATEGORY_LABELS[r.category]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
