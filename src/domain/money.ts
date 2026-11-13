import type { Paise } from "@/types/common";
import { DomainError } from "./errors";

/**
 * Money helpers. Every amount is a whole number of paise (₹1 = 100 paise).
 *
 * Why not rupees with decimals? Computers store decimals in binary and many
 * can't be stored exactly:  0.1 + 0.2 === 0.30000000000000004.
 * Whole numbers up to 9 quadrillion are always exact, so we count paise and
 * only turn them into "₹125.50" when showing them.
 */

/** 10,000 basis points = 100%. So 5% = 500, 2.5% = 250. */
export const BASIS_POINTS_PER_WHOLE = 10_000;

/** Throws unless `value` is a whole, non-negative number of paise. */
export function assertPaise(value: number, label = "Amount"): void {
  if (!Number.isSafeInteger(value)) {
    throw new DomainError(`${label} must be a whole number of paise, got ${value}.`);
  }
  if (value < 0) {
    throw new DomainError(`${label} can't be negative, got ${value}.`);
  }
}

/**
 * Reads what a person typed, e.g. on the num pad, into paise, without ever
 * using decimals:  "125.50" → 12550,  "125.5" → 12550,  "7." → 700.
 * Throws for anything that isn't a plain amount with at most 2 decimals.
 */
export function parseRupees(text: string): Paise {
  const match = /^\s*(\d+)(?:\.(\d{0,2}))?\s*$/.exec(text);
  if (!match) {
    throw new DomainError(`"${text}" is not a valid amount in rupees.`);
  }
  const rupees = Number(match[1]);
  const paise = Number((match[2] ?? "").padEnd(2, "0")); // "5" → "50"
  const total = rupees * 100 + paise;
  assertPaise(total);
  return total;
}

const rupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
});

/** 12345678 → "₹1,23,456.78" (Indian digit grouping). For display only. */
export function formatRupees(amount: Paise): string {
  return rupeeFormatter.format(amount / 100);
}

const wholeRupeeFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/**
 * Like formatRupees, but drops ".00" for whole rupees: 18000 → "₹180",
 * 12550 → "₹125.50". For menu prices. Bills always use formatRupees.
 */
export function formatPrice(amount: Paise): string {
  return amount % 100 === 0
    ? wholeRupeeFormatter.format(amount / 100)
    : formatRupees(amount);
}

/**
 * Paise back into the text a person would type, for filling a form field:
 * 18000 → "180",  12550 → "125.50",  5 → "0.05". Exact, no decimals involved.
 */
export function paiseToText(amount: Paise): string {
  assertPaise(amount);
  const rupees = Math.floor(amount / 100);
  const paise = amount % 100;
  return paise === 0 ? String(rupees) : `${rupees}.${String(paise).padStart(2, "0")}`;
}

/**
 * a × b ÷ c, rounded to the nearest whole number; exactly halfway rounds UP.
 * Uses BigInt (whole numbers of any size), so it is exact and can't overflow.
 * Only for non-negative inputs, which is all money needs here.
 */
function multiplyDivideRound(a: number, b: number, c: number): number {
  const numerator = BigInt(a) * BigInt(b);
  const divisor = BigInt(c);
  const quotient = numerator / divisor; // BigInt division drops the fraction
  const remainder = numerator % divisor;
  const roundUp = remainder * BigInt(2) >= divisor;
  return Number(roundUp ? quotient + BigInt(1) : quotient);
}

/**
 * A percentage of an amount, rounded to the nearest paisa (half rounds up).
 *   percentOf(10000, 500)  → 500   (5% of ₹100 = ₹5)
 *   percentOf(50, 500)     → 3     (5% of 50 paise = 2.5 → 3)
 */
export function percentOf(amount: Paise, basisPoints: number): Paise {
  assertPaise(amount);
  assertBasisPoints(basisPoints);
  return multiplyDivideRound(amount, basisPoints, BASIS_POINTS_PER_WHOLE);
}

/** Throws unless `value` is a whole number from 0 to 10,000 (0% to 100%). */
export function assertBasisPoints(value: number, label = "Percentage"): void {
  if (!Number.isInteger(value) || value < 0 || value > BASIS_POINTS_PER_WHOLE) {
    throw new DomainError(`${label} must be between 0% and 100%.`);
  }
}

/**
 * Splits `total` into parts in proportion to `weights`, so that the parts ALWAYS
 * add up to exactly `total`. Leftover paise go one each to the parts that lost
 * the most to rounding (ties: the earlier part).
 *
 *   allocate(1000, [1, 1, 1]) → [334, 333, 333]   (not 333.33 each)
 *   allocate(1000, [3, 1])    → [750, 250]
 */
export function allocate(total: Paise, weights: number[]): Paise[] {
  assertPaise(total, "Total");
  if (weights.length === 0) {
    throw new DomainError("Need at least one part to split into.");
  }
  weights.forEach((w) => assertPaise(w, "Weight"));
  if (total === 0) return weights.map(() => 0);

  const weightSum = weights.reduce((sum, w) => sum + w, 0);
  if (weightSum === 0) {
    throw new DomainError("Can't split by weights that are all zero.");
  }

  const bigTotal = BigInt(total);
  const bigSum = BigInt(weightSum);
  const parts = weights.map((w) => {
    const exact = bigTotal * BigInt(w);
    return { share: exact / bigSum, remainder: exact % bigSum };
  });

  // Rounding everything down loses a few paise. Hand them back, biggest loss first.
  let leftover = total - parts.reduce((sum, p) => sum + Number(p.share), 0);
  const byLargestRemainder = parts
    .map((part, index) => ({ index, remainder: part.remainder }))
    .sort((a, b) =>
      a.remainder === b.remainder
        ? a.index - b.index
        : a.remainder > b.remainder
          ? -1
          : 1,
    );

  const result = parts.map((p) => Number(p.share));
  for (const { index } of byLargestRemainder) {
    if (leftover === 0) break;
    result[index] = (result[index] ?? 0) + 1;
    leftover -= 1;
  }
  return result;
}

/** Adds up a list of amounts. */
export function sumPaise(amounts: Paise[]): Paise {
  return amounts.reduce((sum, amount) => sum + amount, 0);
}
