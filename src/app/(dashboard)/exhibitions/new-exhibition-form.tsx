"use client";

import { useState, useTransition } from "react";
import { createExhibition } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function NewExhibitionForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => startTransition(async () => {
        const result = await createExhibition(formData);
        setError(result.error ?? null);
      })}
      className="bg-white rounded-card p-6 space-y-3 mb-8 grid grid-cols-4 gap-3 items-end"
    >
      {error && <p className="text-sm text-red-600 col-span-4">{error}</p>}
      <div className="space-y-1">
        <Label htmlFor="galleryName">Gallery</Label>
        <Input id="galleryName" name="galleryName" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="submissionDeadline">Submission deadline</Label>
        <Input id="submissionDeadline" name="submissionDeadline" type="date" />
      </div>
      <div className="space-y-1">
        <Label htmlFor="startDate">Start date</Label>
        <Input id="startDate" name="startDate" type="date" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="endDate">End date</Label>
        <Input id="endDate" name="endDate" type="date" required />
      </div>
      <Button type="submit" disabled={pending} className="rounded-pill col-span-4 w-fit">
        New exhibition
      </Button>
    </form>
  );
}
