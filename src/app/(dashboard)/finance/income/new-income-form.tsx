"use client";

import { useState, useTransition } from "react";
import { createIncome } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Artwork = { id: string; title: string };

export function NewIncomeForm({ artworks }: { artworks: Artwork[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(async () => {
        const result = await createIncome(formData);
        setError(result.error ?? null);
        if (!result.error) (document.getElementById("income-form") as HTMLFormElement)?.reset();
      })}
      id="income-form"
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
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" required placeholder="Sold at spring fair" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="artworkId">Artwork (optional)</Label>
        <select id="artworkId" name="artworkId" className="border rounded-md px-3 py-2 w-full">
          <option value="">None</option>
          {artworks.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
      </div>
      <Button type="submit" disabled={pending} className="rounded-pill">Add income</Button>
    </form>
  );
}