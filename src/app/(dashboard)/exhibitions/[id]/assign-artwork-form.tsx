"use client";

import { useState, useTransition } from "react";
import { assignArtwork, unassignArtwork } from "../actions";
import { Button } from "@/components/ui/button";

type Artwork = { id: string; title: string };

export function AssignArtworkForm({
  exhibitionId, allArtworks, assignedIds,
}: { exhibitionId: string; allArtworks: Artwork[]; assignedIds: string[] }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const unassigned = allArtworks.filter((a) => !assignedIds.includes(a.id));

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-2">
        {allArtworks.filter((a) => assignedIds.includes(a.id)).map((a) => (
          <li key={a.id} className="flex items-center justify-between bg-white rounded-card p-3">
            <span>{a.title}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={() => startTransition(async () => { await unassignArtwork(exhibitionId, a.id); })}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      {unassigned.length > 0 && (
        <select
          className="border rounded-md px-3 py-2"
          defaultValue=""
          onChange={(e) => {
            const artworkId = e.target.value;
            if (!artworkId) return;
            startTransition(async () => {
              const result = await assignArtwork(exhibitionId, artworkId);
              setError(result.error ?? null);
            });
            e.target.value = "";
          }}
        >
          <option value="">Assign artwork...</option>
          {unassigned.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
      )}
    </div>
  );
}
