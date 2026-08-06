import Link from "next/link";
import Image from "next/image";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { artworks, commissions, customers, exhibitions } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";
import { STATUS_LABELS } from "@/components/status-badge";
import {
  isCommissionAtRisk,
  isCommissionOverdue,
  isExhibitionRelevant,
  toStatusCounts,
  mergeRecentActivity,
  type ActivityItem,
} from "@/lib/dashboard";
import type { ArtworkStatus, CommissionStage } from "@/db/schema";

// Mirrors the STAGES array in src/app/(dashboard)/commissions/board.tsx.
const STAGE_LABELS: Record<CommissionStage, string> = {
  inquiry: "Inquiry",
  deposit_paid: "Deposit Paid",
  painting: "Painting",
  finished: "Finished",
  delivered: "Delivered",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const todayIso = new Date().toISOString().slice(0, 10);
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  const [
    statusRows,
    allCommissions,
    allExhibitions,
    recentArtworks,
    recentCustomers,
    recentCommissions,
  ] = await Promise.all([
    db
      .select({ status: artworks.status, count: sql<number>`count(*)::int` })
      .from(artworks)
      .where(eq(artworks.userId, user.id))
      .groupBy(artworks.status),
    db
      .select({
        id: commissions.id,
        stage: commissions.stage,
        deadline: commissions.deadline,
        customerName: customers.name,
      })
      .from(commissions)
      .innerJoin(customers, eq(commissions.customerId, customers.id))
      .where(and(eq(commissions.userId, user.id), eq(customers.userId, user.id))),
    db.select().from(exhibitions).where(eq(exhibitions.userId, user.id)),
    db
      .select({
        id: artworks.id,
        title: artworks.title,
        createdAt: artworks.createdAt,
        imagePath: artworks.imagePath,
        updatedAt: artworks.updatedAt,
      })
      .from(artworks)
      .where(eq(artworks.userId, user.id))
      .orderBy(desc(artworks.createdAt))
      .limit(8),
    db
      .select({ id: customers.id, name: customers.name, createdAt: customers.createdAt })
      .from(customers)
      .where(eq(customers.userId, user.id))
      .orderBy(desc(customers.createdAt))
      .limit(8),
    db
      .select({
        id: commissions.id,
        createdAt: commissions.createdAt,
        customerName: customers.name,
      })
      .from(commissions)
      .innerJoin(customers, eq(commissions.customerId, customers.id))
      .where(and(eq(commissions.userId, user.id), eq(customers.userId, user.id)))
      .orderBy(desc(commissions.createdAt))
      .limit(8),
  ]);

  const statusCounts = toStatusCounts(statusRows);

  const atRiskCommissions = allCommissions
    .filter((c) => isCommissionAtRisk(c.deadline, c.stage, todayIso))
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""));

  const upcomingExhibitions = allExhibitions
    .filter((ex) => isExhibitionRelevant(ex.startDate, ex.endDate, ex.submissionDeadline, todayIso))
    .sort((a, b) => a.startDate.localeCompare(b.startDate));

  const activityItems: ActivityItem[] = [
    ...recentArtworks.map((a) => ({
      type: "artwork" as const,
      id: a.id,
      label: a.title,
      href: `/artworks/${a.id}`,
      createdAt: a.createdAt,
      imagePath: a.imagePath,
      updatedAt: a.updatedAt,
    })),
    ...recentCustomers.map((c) => ({
      type: "customer" as const,
      id: c.id,
      label: c.name,
      href: `/customers/${c.id}`,
      createdAt: c.createdAt,
    })),
    ...recentCommissions.map((c) => ({
      type: "commission" as const,
      id: c.id,
      label: `Commission for ${c.customerName}`,
      href: "/commissions",
      createdAt: c.createdAt,
    })),
  ];
  const recentActivity = mergeRecentActivity(activityItems, 8);

  const statusOrder: ArtworkStatus[] = ["in_progress", "finished", "exhibited", "sold"];
  const activityTypeLabels: Record<ActivityItem["type"], string> = {
    artwork: "Artwork",
    customer: "Customer",
    commission: "Commission",
  };

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-8">
      <h1 className="text-2xl font-semibold text-ink-charcoal">Dashboard</h1>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {statusOrder.map((status) => (
          <div key={status} className="bg-white rounded-card p-4">
            <p className="text-sm text-slate-gray">{STATUS_LABELS[status]}</p>
            <p className="text-2xl font-semibold text-ink-charcoal">{statusCounts[status]}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="bg-white rounded-card p-4 space-y-3">
          <h2 className="font-medium text-ink-charcoal">Needs attention</h2>
          {atRiskCommissions.length === 0 && (
            <p className="text-sm text-slate-gray">No commissions need attention right now.</p>
          )}
          <ul className="space-y-2">
            {atRiskCommissions.map((c) => (
              <li key={c.id}>
                <Link href="/commissions" className="block text-sm">
                  <span className="text-ink-charcoal">{c.customerName}</span>{" "}
                  <span
                    className={isCommissionOverdue(c.deadline, c.stage, todayIso) ? "text-attention" : "text-slate-gray"}
                  >
                    Due {c.deadline}
                  </span>{" "}
                  <span className="text-slate-gray">&middot; {STAGE_LABELS[c.stage]}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="bg-white rounded-card p-4 space-y-3">
          <h2 className="font-medium text-ink-charcoal">Exhibitions</h2>
          {upcomingExhibitions.length === 0 && (
            <p className="text-sm text-slate-gray">No exhibitions right now.</p>
          )}
          <ul className="space-y-2">
            {upcomingExhibitions.map((ex) => {
              const daysUntilDeadline = ex.submissionDeadline
                ? (Date.parse(ex.submissionDeadline) - Date.parse(todayIso)) / 86_400_000
                : null;
              const deadlineIsSoon =
                daysUntilDeadline !== null && daysUntilDeadline >= 0 && daysUntilDeadline <= 14;
              return (
                <li key={ex.id}>
                  <Link href={`/exhibitions/${ex.id}`} className="block text-sm">
                    <span className="text-ink-charcoal">{ex.galleryName}</span>{" "}
                    <span className="text-slate-gray">
                      {deadlineIsSoon
                        ? `Submission due ${ex.submissionDeadline}`
                        : `Starts ${ex.startDate}`}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>

      <section className="bg-white rounded-card p-4 space-y-3">
        <h2 className="font-medium text-ink-charcoal">Recent activity</h2>
        {recentActivity.length === 0 && (
          <p className="text-sm text-slate-gray">Nothing here yet.</p>
        )}
        <ul className="space-y-2">
          {recentActivity.map((item) => (
            <li key={`${item.type}-${item.id}`}>
              <Link href={item.href} className="flex items-center gap-3 text-sm">
                {item.type === "artwork" && item.imagePath && item.updatedAt && (
                  <span className="relative w-9 h-9 shrink-0 rounded overflow-hidden bg-canvas-cream">
                    <Image
                      src={`${supabaseUrl}/storage/v1/object/public/artwork-images/${item.imagePath}?v=${item.updatedAt.getTime()}`}
                      alt=""
                      fill
                      className="object-cover"
                    />
                  </span>
                )}
                <span>
                  <span className="text-slate-gray">{activityTypeLabels[item.type]}</span>{" "}
                  <span className="text-ink-charcoal">{item.label}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
