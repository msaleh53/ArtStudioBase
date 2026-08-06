"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateArtwork } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type Artwork = {
  id: string;
  title: string;
  medium: string | null;
  dimensions: string | null;
  price: string | null;
  description: string | null;
};

export function EditArtwork({ artwork }: { artwork: Artwork }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!editing) {
    return (
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-ink-charcoal">{artwork.title}</h1>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
        </div>
        <p className="text-slate-gray">
          {[artwork.medium, artwork.dimensions, artwork.price ? `$${artwork.price}` : null].filter(Boolean).join(" · ")}
        </p>
        {artwork.description && <p className="text-ink-charcoal">{artwork.description}</p>}
      </div>
    );
  }

  return (
    <form
      className="flex-1 min-w-0 space-y-3"
      action={(formData) => startTransition(async () => {
        const result = await updateArtwork(artwork.id, formData);
        if (result.error) {
          setError(result.error);
          return;
        }
        setError(null);
        setEditing(false);
        router.refresh();
      })}
    >
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="space-y-1">
        <Label htmlFor="edit-title">Title</Label>
        <Input id="edit-title" name="title" defaultValue={artwork.title} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="edit-medium">Medium</Label>
          <Input id="edit-medium" name="medium" defaultValue={artwork.medium ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="edit-dimensions">Dimensions</Label>
          <Input id="edit-dimensions" name="dimensions" defaultValue={artwork.dimensions ?? ""} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="edit-price">Price</Label>
        <Input id="edit-price" name="price" type="number" step="0.01" defaultValue={artwork.price ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="edit-description">Description</Label>
        <Textarea id="edit-description" name="description" defaultValue={artwork.description ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="edit-image">Replace image</Label>
        <Input id="edit-image" name="image" type="file" accept="image/*" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="rounded-pill">Save</Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => { setEditing(false); setError(null); }}>Cancel</Button>
      </div>
    </form>
  );
}
