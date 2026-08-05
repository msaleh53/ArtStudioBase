import { describe, it, expect } from "vitest";
import { rangesOverlap } from "./exhibition-overlap";

describe("rangesOverlap", () => {
  it("returns true when ranges fully overlap", () => {
    expect(rangesOverlap("2026-01-01", "2026-01-31", "2026-01-10", "2026-01-20")).toBe(true);
  });

  it("returns true when ranges partially overlap", () => {
    expect(rangesOverlap("2026-01-01", "2026-01-15", "2026-01-10", "2026-01-31")).toBe(true);
  });

  it("returns true when ranges touch at a single boundary day", () => {
    expect(rangesOverlap("2026-01-01", "2026-01-10", "2026-01-10", "2026-01-20")).toBe(true);
  });

  it("returns false when ranges don't overlap", () => {
    expect(rangesOverlap("2026-01-01", "2026-01-10", "2026-02-01", "2026-02-10")).toBe(false);
  });

  it("returns false regardless of argument order (a after b)", () => {
    expect(rangesOverlap("2026-02-01", "2026-02-10", "2026-01-01", "2026-01-10")).toBe(false);
  });
});
