import type { ArtworkStatus, CommissionStage } from "@/db/schema";

export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function isActiveStage(stage: CommissionStage): boolean {
  return stage !== "finished" && stage !== "delivered";
}

export function isCommissionOverdue(
  deadline: string | null,
  stage: CommissionStage,
  todayIso: string,
): boolean {
  if (!deadline || !isActiveStage(stage)) return false;
  return deadline < todayIso;
}

export function isCommissionAtRisk(
  deadline: string | null,
  stage: CommissionStage,
  todayIso: string,
  windowDays = 7,
): boolean {
  if (!deadline || !isActiveStage(stage)) return false;
  return deadline <= addDaysIso(todayIso, windowDays);
}

export function isExhibitionRelevant(
  startDate: string,
  endDate: string,
  submissionDeadline: string | null,
  todayIso: string,
): boolean {
  const isRunningNow = startDate <= todayIso && endDate >= todayIso;
  const startsWithinWindow = startDate >= todayIso && startDate <= addDaysIso(todayIso, 30);
  const submissionWithinWindow =
    !!submissionDeadline &&
    submissionDeadline >= todayIso &&
    submissionDeadline <= addDaysIso(todayIso, 14);
  return isRunningNow || startsWithinWindow || submissionWithinWindow;
}

export function toStatusCounts(
  rows: { status: ArtworkStatus; count: number }[],
): Record<ArtworkStatus, number> {
  const counts: Record<ArtworkStatus, number> = {
    in_progress: 0,
    finished: 0,
    exhibited: 0,
    sold: 0,
  };
  for (const row of rows) {
    counts[row.status] = row.count;
  }
  return counts;
}

export type ActivityItem = {
  type: "artwork" | "customer" | "commission";
  id: string;
  label: string;
  href: string;
  createdAt: Date;
  imagePath?: string | null;
  updatedAt?: Date;
};

export function mergeRecentActivity(items: ActivityItem[], limit = 8): ActivityItem[] {
  return [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()).slice(0, limit);
}
