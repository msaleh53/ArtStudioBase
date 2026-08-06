"use client";

import { useState, useTransition } from "react";
import { createExpense } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS } from "@/lib/expense-category";

export function NewExpenseForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(async () => {
        const result = await createExpense(formData);
        setError(result.error ?? null);
        if (!result.error) (document.getElementById("expense-form") as HTMLFormElement)?.reset();
      })}
      id="expense-form"
      className="bg-white rounded-card p-6 space-y-3 mb-8"
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="date">Date</Label>
          <Input id="date" name="date" type="date" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="amount">Amount</Label>
          <Input id="amount" name="amount" type="number" step="0.01" required />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="category">Category</Label>
        <select id="category" name="category" required className="border rounded-md px-3 py-2 w-full">
          <option value="">Select...</option>
          {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description (optional)</Label>
        <Input id="description" name="description" placeholder="Canvas and paint order" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="receipt">Receipt (optional)</Label>
        <Input id="receipt" name="receipt" type="file" accept="image/*,application/pdf" />
      </div>
      <Button type="submit" disabled={pending} className="rounded-pill">Add expense</Button>
    </form>
  );
}
