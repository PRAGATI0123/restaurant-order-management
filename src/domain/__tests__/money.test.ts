import { describe, expect, it } from "vitest";
import {
  allocate,
  assertPaise,
  formatRupees,
  parseRupees,
  percentOf,
  sumPaise,
} from "@/domain/money";

describe("why we count paise", () => {
  it("decimal rupees are not exact in JavaScript", () => {
    expect(0.1 + 0.2).not.toBe(0.3); // 0.30000000000000004
    expect(10 + 20).toBe(30); // whole paise are always exact
  });
});

describe("assertPaise", () => {
  it("accepts whole, non-negative numbers", () => {
    expect(() => assertPaise(0)).not.toThrow();
    expect(() => assertPaise(12550)).not.toThrow();
  });

  it.each([1.5, -1, Number.NaN, Number.POSITIVE_INFINITY])("rejects %s", (value) => {
    expect(() => assertPaise(value)).toThrow();
  });
});

describe("parseRupees", () => {
  it.each([
    ["125.50", 12550],
    ["125.5", 12550],
    ["125", 12500],
    ["7.", 700],
    ["0.05", 5],
    ["  42  ", 4200],
    ["0", 0],
  ])('reads "%s" as %i paise', (text, expected) => {
    expect(parseRupees(text)).toBe(expected);
  });

  it.each(["", "abc", "1.234", "-5", "1,000", ".5", "12.3.4"])('rejects "%s"', (text) => {
    expect(() => parseRupees(text)).toThrow(/not a valid amount/);
  });
});

describe("formatRupees", () => {
  it("shows rupees with two decimals", () => {
    expect(formatRupees(12550)).toBe("₹125.50");
    expect(formatRupees(0)).toBe("₹0.00");
    expect(formatRupees(5)).toBe("₹0.05");
  });

  it("uses Indian digit grouping (lakhs)", () => {
    expect(formatRupees(12345678)).toBe("₹1,23,456.78");
  });
});

describe("percentOf", () => {
  it("takes a percentage given in basis points", () => {
    expect(percentOf(10000, 500)).toBe(500); // 5% of ₹100 = ₹5
    expect(percentOf(10000, 250)).toBe(250); // 2.5% of ₹100 = ₹2.50
    expect(percentOf(10000, 10000)).toBe(10000); // 100%
    expect(percentOf(10000, 0)).toBe(0);
  });

  it("rounds to the nearest paisa, and exactly half rounds up", () => {
    expect(percentOf(50, 500)).toBe(3); // 2.5  → 3
    expect(percentOf(49, 500)).toBe(2); // 2.45 → 2
    expect(percentOf(51, 500)).toBe(3); // 2.55 → 3
  });

  it("stays exact for very large amounts", () => {
    // ₹90 lakh crore at 18%: far beyond what floating point multiplies exactly
    expect(percentOf(9_000_000_000_000_000, 1800)).toBe(1_620_000_000_000_000);
  });

  it("rejects percentages outside 0–100%", () => {
    expect(() => percentOf(100, -1)).toThrow();
    expect(() => percentOf(100, 10001)).toThrow();
    expect(() => percentOf(100, 12.5)).toThrow();
  });
});

describe("allocate", () => {
  it("splits evenly and gives leftover paise to the first parts", () => {
    expect(allocate(1000, [1, 1, 1])).toEqual([334, 333, 333]);
    expect(allocate(100, [1, 1, 1])).toEqual([34, 33, 33]);
  });

  it("splits in proportion to the weights", () => {
    expect(allocate(1000, [3, 1])).toEqual([750, 250]);
    expect(allocate(1000, [1, 0, 1])).toEqual([500, 0, 500]);
  });

  it("gives leftovers to the parts that lost the most to rounding", () => {
    // exact shares: 11.11 / 22.22 / 66.66 → 11 / 22 / 66 = 99, one paisa left.
    // The biggest fraction lost is 0.66 (third part), so it gets the paisa.
    expect(allocate(100, [1, 2, 6])).toEqual([11, 22, 67]);
  });

  it("returns zeros when there is nothing to split", () => {
    expect(allocate(0, [1, 2])).toEqual([0, 0]);
  });

  it("always adds up to the total", () => {
    for (let total = 0; total <= 500; total += 7) {
      for (let people = 1; people <= 9; people++) {
        const parts = allocate(
          total,
          Array.from({ length: people }, () => 1),
        );
        expect(sumPaise(parts)).toBe(total);
      }
    }
  });

  it("rejects impossible splits", () => {
    expect(() => allocate(100, [])).toThrow();
    expect(() => allocate(100, [0, 0])).toThrow();
    expect(() => allocate(100, [1, -1])).toThrow();
  });
});
