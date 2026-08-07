"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { updateCommissionStage, updateProgressNotes } from "./actions";
import type { CommissionStage } from "@/db/schema";

const STAGES: { key: CommissionStage; label: string }[] = [
  { key: "inquiry", label: "Inquiry" },
  { key: "deposit_paid", label: "Deposit Paid" },
  { key: "painting", label: "Painting" },
  { key: "finished", label: "Finished" },
  { key: "delivered", label: "Delivered" },
];

type Commission = {
  id: string;
  stage: CommissionStage;
  deadline: string | null;
  progressNotes: string | null;
  customerName: string;
};

export function Board({ commissions }: { commissions: Commission[] }) {
  const [, startTransition] = useTransition();
  const isOverdue = (c: Commission) =>
    c.deadline && c.stage !== "delivered" && new Date(c.deadline) < new Date();

  const prevStagesRef = useRef<Map<string, CommissionStage>>(new Map());
  const [justDelivered, setJustDelivered] = useState<Set<string>>(new Set());

  useEffect(() => {
    const newlyDelivered: string[] = [];
    for (const c of commissions) {
      const prevStage = prevStagesRef.current.get(c.id);
      if (prevStage && prevStage !== "delivered" && c.stage === "delivered") {
        newlyDelivered.push(c.id);
      }
      prevStagesRef.current.set(c.id, c.stage);
    }
    if (newlyDelivered.length === 0) return;
    setJustDelivered((prev) => new Set([...prev, ...newlyDelivered]));
    const timeout = setTimeout(() => {
      setJustDelivered((prev) => {
        const next = new Set(prev);
        newlyDelivered.forEach((id) => next.delete(id));
        return next;
      });
    }, 600);
    return () => clearTimeout(timeout);
  }, [commissions]);

  return (
    <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-2 md:grid md:grid-cols-5 md:overflow-visible md:pb-0">
      {STAGES.map((stage) => (
        <div key={stage.key} className="min-w-[85%] shrink-0 snap-center space-y-3 md:min-w-0 md:shrink md:snap-align-none">
          <h2 className="font-medium text-ink-charcoal text-sm">{stage.label}</h2>
          {commissions.filter((c) => c.stage === stage.key).map((c) => (
            <div
              key={c.id}
              className={`rounded-card p-3 space-y-2 transition-colors duration-500 ${
                justDelivered.has(c.id)
                  ? "bg-cobalt-wash motion-safe:animate-in motion-safe:zoom-in-95 motion-safe:duration-300"
                  : "bg-white"
              }`}
            >
              <p className="font-medium text-sm">{c.customerName}</p>
              {c.deadline && (
                <p className={`text-xs ${isOverdue(c) ? "text-attention" : "text-slate-gray"}`}>
                  Due {c.deadline}
                </p>
              )}
              <textarea
                defaultValue={c.progressNotes ?? ""}
                placeholder="Progress notes..."
                className="w-full text-xs border rounded p-2"
                onBlur={(e) => startTransition(() => void updateProgressNotes(c.id, e.target.value))}
              />
              <select
                value={c.stage}
                className="w-full text-xs border rounded p-1"
                onChange={(e) => startTransition(() => void updateCommissionStage(c.id, e.target.value as CommissionStage))}
              >
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
