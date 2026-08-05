import { Badge } from "@/components/ui/badge";
import type { ArtworkStatus } from "@/db/schema";

const STATUS_STYLES: Record<ArtworkStatus, string> = {
  in_progress: "bg-slate-gray text-white",
  finished: "bg-electric-cobalt text-white",
  exhibited: "bg-vivid-violet text-white",
  sold: "bg-forest text-white",
};

const STATUS_LABELS: Record<ArtworkStatus, string> = {
  in_progress: "In Progress",
  finished: "Finished",
  exhibited: "Exhibited",
  sold: "Sold",
};

export function StatusBadge({ status }: { status: ArtworkStatus }) {
  return <Badge className={STATUS_STYLES[status]}>{STATUS_LABELS[status]}</Badge>;
}
