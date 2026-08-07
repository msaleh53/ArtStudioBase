"use client";

import { useState, useTransition } from "react";
import { createMaterial } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewMaterialForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(async () => {
        const result = await createMaterial(formData);
        setError(result.error ?? null);
        if (!result.error) (document.getElementById("material-form") as HTMLFormElement)?.reset();
      })}
      id="material-form"
      className="bg-white rounded-card p-6 space-y-3 mb-8"
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" required placeholder="Canvas 18x24" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="unit">Unit</Label>
          <Input id="unit" name="unit" required placeholder="panels" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="quantity">Starting quantity</Label>
          <Input id="quantity" name="quantity" type="number" step="0.01" placeholder="0" />
        </div>
      </div>
      <Button type="submit" disabled={pending} className="rounded-pill">Add material</Button>
    </form>
  );
}
