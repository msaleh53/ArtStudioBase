"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { createArtwork } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UploadForm({ isFirstUpload }: { isFirstUpload: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [celebrating, setCelebrating] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => () => timeoutsRef.current.forEach(clearTimeout), []);

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          const result = await createArtwork(formData);
          setError(result.error ?? null);
          if (!result.error) {
            (document.getElementById("upload-form") as HTMLFormElement)?.reset();
            if (isFirstUpload) {
              setCelebrating(true);
              setDismissing(false);
              timeoutsRef.current.push(setTimeout(() => setDismissing(true), 2200));
              timeoutsRef.current.push(setTimeout(() => setCelebrating(false), 2400));
            }
          }
        });
      }}
      id="upload-form"
      className="bg-white rounded-card p-6 space-y-3 mb-8"
    >
      {celebrating && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-pill bg-electric-cobalt px-4 py-2 text-sm font-medium text-white motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-top-1 motion-safe:duration-200 ${
            dismissing ? "motion-safe:animate-out motion-safe:fade-out motion-safe:duration-200" : ""
          }`}
        >
          <Check className="size-4" aria-hidden="true" />
          Your studio is live — first piece added.
        </div>
      )}
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
