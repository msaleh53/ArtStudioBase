"use client";

import { useState, useTransition } from "react";
import { createPrintEdition, markPrintSold } from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PrintEdition = {
  id: string;
  description: string | null;
  editionSize: number;
  soldCount: number;
  price: string | null;
};

export function PrintEditions({ artworkId, editions }: { artworkId: string; editions: PrintEdition[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="space-y-4">
      <h2 className="font-medium text-ink-charcoal">Prints</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-2">
        {editions.map((edition) => {
          const soldOut = edition.soldCount >= edition.editionSize;
          return (
            <li key={edition.id} className="flex items-center justify-between bg-white rounded-card p-3">
              <span className="flex items-center gap-2 text-sm text-ink-charcoal">
                {edition.description} — {edition.soldCount}/{edition.editionSize} sold
                {edition.price && ` · $${edition.price}`}
                {soldOut && <Badge className="bg-electric-cobalt text-white">Sold out</Badge>}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={pending || soldOut}
                onClick={() => startTransition(async () => {
                  const result = await markPrintSold(edition.id);
                  setError(result.error ?? null);
                })}
              >
                Mark one sold
              </Button>
            </li>
          );
        })}
      </ul>
      <form
        action={(formData) => startTransition(async () => {
          const result = await createPrintEdition(artworkId, formData);
          setError(result.error ?? null);
        })}
        className="flex gap-2 items-end"
      >
        <div className="space-y-1">
          <Label htmlFor="description">Description</Label>
          <Input id="description" name="description" placeholder="giclee on paper, 11x14" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="editionSize">Edition size</Label>
          <Input id="editionSize" name="editionSize" type="number" min="1" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="price">Price</Label>
          <Input id="price" name="price" type="number" step="0.01" />
        </div>
        <Button type="submit" disabled={pending} className="rounded-pill">Add edition</Button>
      </form>
    </div>
  );
}
