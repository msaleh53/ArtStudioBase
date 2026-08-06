import { describe, it, expect } from "vitest";
import {
  addDaysIso,
  isCommissionOverdue,
  isCommissionAtRisk,
  isExhibitionRelevant,
  toStatusCounts,
  mergeRecentActivity,
  type ActivityItem,
} from "./dashboard";

describe("addDaysIso", () => {
  it("adds days across a month boundary", () => {
    expect(addDaysIso("2026-01-30", 3)).toBe("2026-02-02");
  });

  it("subtracts days with a negative offset", () => {
    expect(addDaysIso("2026-01-05", -10)).toBe("2025-12-26");
  });
});

describe("isCommissionOverdue", () => {
  it("is true when deadline is before today and stage is active", () => {
    expect(isCommissionOverdue("2026-08-01", "painting", "2026-08-06")).toBe(true);
  });

  it("is false when deadline is today", () => {
    expect(isCommissionOverdue("2026-08-06", "painting", "2026-08-06")).toBe(false);
  });

  it("is false when stage is finished, even if overdue", () => {
    expect(isCommissionOverdue("2026-08-01", "finished", "2026-08-06")).toBe(false);
  });

  it("is false when stage is delivered, even if overdue", () => {
    expect(isCommissionOverdue("2026-08-01", "delivered", "2026-08-06")).toBe(false);
  });

  it("is false when there is no deadline", () => {
    expect(isCommissionOverdue(null, "painting", "2026-08-06")).toBe(false);
  });
});

describe("isCommissionAtRisk", () => {
  it("is true when overdue", () => {
    expect(isCommissionAtRisk("2026-08-01", "painting", "2026-08-06")).toBe(true);
  });

  it("is true when deadline falls within the default 7-day window", () => {
    expect(isCommissionAtRisk("2026-08-10", "painting", "2026-08-06")).toBe(true);
  });

  it("is false when deadline is beyond the window", () => {
    expect(isCommissionAtRisk("2026-09-01", "painting", "2026-08-06")).toBe(false);
  });

  it("respects a custom window size", () => {
    expect(isCommissionAtRisk("2026-08-20", "painting", "2026-08-06", 30)).toBe(true);
  });

  it("is false when stage is finished or delivered", () => {
    expect(isCommissionAtRisk("2026-08-07", "finished", "2026-08-06")).toBe(false);
    expect(isCommissionAtRisk("2026-08-07", "delivered", "2026-08-06")).toBe(false);
  });

  it("is false when there is no deadline", () => {
    expect(isCommissionAtRisk(null, "inquiry", "2026-08-06")).toBe(false);
  });
});

describe("isExhibitionRelevant", () => {
  it("is true when start date is within the next 30 days", () => {
    expect(isExhibitionRelevant("2026-08-20", "2026-09-20", null, "2026-08-06")).toBe(true);
  });

  it("is false when start date is more than 30 days out, no submission deadline, and it hasn't started", () => {
    expect(isExhibitionRelevant("2026-12-01", "2026-12-15", null, "2026-08-06")).toBe(false);
  });

  it("is true when submission deadline is within the next 14 days, even if start date is far out", () => {
    expect(isExhibitionRelevant("2026-12-01", "2026-12-15", "2026-08-15", "2026-08-06")).toBe(true);
  });

  it("is true when the exhibition is currently running, even if it started long ago", () => {
    expect(isExhibitionRelevant("2026-06-01", "2026-09-01", null, "2026-08-06")).toBe(true);
  });

  it("is false when the exhibition has already ended and no submission deadline is upcoming", () => {
    expect(isExhibitionRelevant("2026-07-01", "2026-07-15", "2026-06-01", "2026-08-06")).toBe(false);
  });
});

describe("toStatusCounts", () => {
  it("fills in zero for statuses with no rows", () => {
    expect(toStatusCounts([{ status: "sold", count: 2 }])).toEqual({
      in_progress: 0,
      finished: 0,
      exhibited: 0,
      sold: 2,
    });
  });

  it("returns all zeros for an empty input", () => {
    expect(toStatusCounts([])).toEqual({
      in_progress: 0,
      finished: 0,
      exhibited: 0,
      sold: 0,
    });
  });
});

describe("mergeRecentActivity", () => {
  const item = (id: string, createdAt: string): ActivityItem => ({
    type: "artwork",
    id,
    label: id,
    href: `/artworks/${id}`,
    createdAt: new Date(createdAt),
  });

  it("sorts newest first", () => {
    const result = mergeRecentActivity([
      item("a", "2026-08-01T00:00:00Z"),
      item("b", "2026-08-05T00:00:00Z"),
      item("c", "2026-08-03T00:00:00Z"),
    ]);
    expect(result.map((r) => r.id)).toEqual(["b", "c", "a"]);
  });

  it("truncates to the limit", () => {
    const items = [
      item("a", "2026-08-01T00:00:00Z"),
      item("b", "2026-08-02T00:00:00Z"),
      item("c", "2026-08-03T00:00:00Z"),
    ];
    expect(mergeRecentActivity(items, 2)).toHaveLength(2);
  });

  it("preserves imagePath and updatedAt on artwork items", () => {
    const updatedAt = new Date("2026-01-01T00:00:00Z");
    const items: ActivityItem[] = [
      {
        type: "artwork",
        id: "a1",
        label: "Desert Sun",
        href: "/artworks/a1",
        createdAt: new Date("2026-01-02T00:00:00Z"),
        imagePath: "user1/a1/original.jpg",
        updatedAt,
      },
    ];
    const result = mergeRecentActivity(items, 8);
    expect(result[0].imagePath).toBe("user1/a1/original.jpg");
    expect(result[0].updatedAt).toBe(updatedAt);
  });
});
