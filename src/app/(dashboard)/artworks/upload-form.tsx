"use client";

import { useState, useTransition } from "react";
import { createArtwork } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UploadForm() {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const result = await createArtwork(formData);
          setError(result.error ?? null);
          if (!result.error) (document.getElementById("upload-form") as HTMLFormElement)?.reset();
        });
      }}
      id="upload-form"
      className="bg-white rounded-card p-6 space-y-3 mb-8"
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="medium">Medium</Label>
          <Input id="medium" name="medium" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dimensions">Dimensions</Label>
          <Input id="dimensions" name="dimensions" />
        </div>
        <div className="space-y-1">
          <Label htmlFor="price">Price</Label>
          <Input id="price" name="price" type="number" step="0.01" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="image">Image</Label>
        <Input id="image" name="image" type="file" accept="image/*" required />
      </div>
      <Button type="submit" disabled={pending} className="rounded-pill">
        {pending ? "Uploading..." : "Add artwork"}
      </Button>
    </form>
  );
}
