import { describe, it, expect } from "vitest";
import { formatCurrency } from "./currency";

describe("formatCurrency", () => {
  it("formats a numeric-string amount with two decimals", () => {
    expect(formatCurrency("50")).toBe("$50.00");
  });

  it("formats a number with two decimals", () => {
    expect(formatCurrency(85.5)).toBe("$85.50");
  });

  it("adds a thousands separator", () => {
    expect(formatCurrency("1234.5")).toBe("$1,234.50");
  });

  it("formats zero", () => {
    expect(formatCurrency("0")).toBe("$0.00");
  });
});
