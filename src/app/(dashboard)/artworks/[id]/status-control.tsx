"use client";

import { useState, useTransition } from "react";
import { updateArtworkStatus } from "../actions";
import { StatusBadge } from "@/components/status-badge";
import type { ArtworkStatus } from "@/db/schema";

const STATUSES: ArtworkStatus[] = ["in_progress", "finished", "exhibited", "sold"];

export function StatusControl({ artworkId, status }: { artworkId: string; status: ArtworkStatus }) {
  const [current, setCurrent] = useState(status);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center gap-3">
      <StatusBadge status={current} />
      <select
        value={current}
        disabled={pending}
        className="text-sm border rounded-md px-2 py-1"
        onChange={(e) => {
          const next = e.target.value as ArtworkStatus;
          setCurrent(next);
          startTransition(() => {
            void updateArtworkStatus(artworkId, next);
          });
        }}
      >
        {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
    </div>
  );
}
