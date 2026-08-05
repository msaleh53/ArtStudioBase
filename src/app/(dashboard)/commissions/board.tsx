"use client";

import { useTransition } from "react";
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

  return (
    <div className="grid grid-cols-5 gap-4">
      {STAGES.map((stage) => (
        <div key={stage.key} className="space-y-3">
          <h2 className="font-medium text-ink-charcoal text-sm">{stage.label}</h2>
          {commissions.filter((c) => c.stage === stage.key).map((c) => (
            <div key={c.id} className="bg-white rounded-card p-3 space-y-2">
              <p className="font-medium text-sm">{c.customerName}</p>
              {c.deadline && (
                <p className={`text-xs ${isOverdue(c) ? "text-red-600" : "text-slate-gray"}`}>
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
