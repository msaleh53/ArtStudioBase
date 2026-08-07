"use client";

import { useState, useTransition } from "react";
import { logMaterialChange } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function MaterialLogForm({ materialId }: { materialId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const formId = `log-form-${materialId}`;

  return (
    <form
      action={(formData) => startTransition(async () => {
        const result = await logMaterialChange(formData);
        setError(result.error ?? null);
        if (!result.error) (document.getElementById(formId) as HTMLFormElement)?.reset();
      })}
      id={formId}
      className="space-y-2 mt-3"
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      <input type="hidden" name="materialId" value={materialId} />
      <div className="grid grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label htmlFor={`date-${materialId}`}>Date</Label>
          <Input id={`date-${materialId}`} name="date" type="date" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`change-${materialId}`}>Change (+/-)</Label>
          <Input id={`change-${materialId}`} name="change" type="number" step="0.01" required placeholder="-2 or 10" />
        </div>
        <div className="space-y-1">
          <Label htmlFor={`note-${materialId}`}>Note (optional)</Label>
          <Input id={`note-${materialId}`} name="note" placeholder="Used for commission" />
        </div>
      </div>
      <Button type="submit" disabled={pending} size="sm" className="rounded-pill">Log change</Button>
    </form>
  );
}
