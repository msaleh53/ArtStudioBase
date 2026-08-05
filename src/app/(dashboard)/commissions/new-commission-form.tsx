"use client";

import { useState, useTransition } from "react";
import { createCommission } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Customer = { id: string; name: string };

export function NewCommissionForm({ customers }: { customers: Customer[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(async () => {
        const result = await createCommission(formData);
        setError(result.error ?? null);
      })}
      className="bg-white rounded-card p-6 space-y-3 mb-8 flex gap-3 items-end"
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-1">
        <Label htmlFor="customerId">Customer</Label>
        <select id="customerId" name="customerId" required className="border rounded-md px-3 py-2">
          <option value="">Select...</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        <Label htmlFor="deadline">Deadline</Label>
        <Input id="deadline" name="deadline" type="date" />
      </div>
      <Button type="submit" disabled={pending} className="rounded-pill">New commission</Button>
    </form>
  );
}
