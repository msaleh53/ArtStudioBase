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
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-ink-charcoal">{artwork.title}</h1>
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
        </div>
        <p className="text-slate-gray">{artwork.medium} · {artwork.dimensions} · ${artwork.price}</p>
        {artwork.description && <p className="text-ink-charcoal">{artwork.description}</p>}
      </div>
    );
  }

  return (
    <form
      className="space-y-3"
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
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={artwork.title} required />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="medium">Medium</Label>
          <Input id="medium" name="medium" defaultValue={artwork.medium ?? ""} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="dimensions">Dimensions</Label>
          <Input id="dimensions" name="dimensions" defaultValue={artwork.dimensions ?? ""} />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="price">Price</Label>
        <Input id="price" name="price" type="number" step="0.01" defaultValue={artwork.price ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={artwork.description ?? ""} />
      </div>
      <div className="space-y-1">
        <Label htmlFor="image">Replace image</Label>
        <Input id="image" name="image" type="file" accept="image/*" />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={pending} className="rounded-pill">Save</Button>
        <Button type="button" variant="outline" disabled={pending} onClick={() => { setEditing(false); setError(null); }}>Cancel</Button>
      </div>
    </form>
  );
}
