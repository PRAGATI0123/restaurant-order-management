import { describe, expect, it } from "vitest";
import { calculateBill } from "@/domain/billing/calculate-bill";
import { splitByAmounts, splitByItems, splitEqually } from "@/domain/billing/split-bill";
import { sumPaise } from "@/domain/money";
import { makeItem, seededRandom } from "@/domain/__tests__/test-data";

describe("splitEqually", () => {
  it("splits evenly; leftover paise go to the first guests", () => {
    expect(splitEqually(26250, 4)).toEqual([6563, 6563, 6562, 6562]); // ₹262.50
    expect(splitEqually(100, 3)).toEqual([34, 33, 33]);
    expect(splitEqually(1000, 1)).toEqual([1000]);
  });

  it.each([0, -2, 1.5])("rejects %s guests", (guests) => {
    expect(() => splitEqually(1000, guests)).toThrow(/guests/);
  });
});

describe("splitByItems", () => {
  const curry = makeItem({ name: "Curry", unitPricePaise: 30000 }); // ₹300
  const naan = makeItem({ name: "Naan", unitPricePaise: 10000 }); // ₹100
  const bill = calculateBill({
    items: [curry, naan],
    discount: { kind: "percent", basisPoints: 1000 }, // 10% off
    taxRateBasisPoints: 500, // 5%
  });
  // subtotal 40000 → discount 4000 → taxable 36000 → tax 1800 → total 37800

  it("each guest pays for their items, with discount and tax shared fairly", () => {
    const shares = splitByItems(bill, { [curry.id]: 0, [naan.id]: 1 }, 2);

    expect(bill.totalPaise).toBe(37800);
    expect(shares).toEqual([28350, 9450]); // 3 : 1, like their orders
    expect(sumPaise(shares)).toBe(bill.totalPaise);
  });

  it("gives 0 to a guest who ordered nothing", () => {
    expect(splitByItems(bill, { [curry.id]: 0, [naan.id]: 0 }, 2)).toEqual([37800, 0]);
  });

  it("refuses when an item isn't given to anyone", () => {
    expect(() => splitByItems(bill, { [curry.id]: 0 }, 2)).toThrow(
      /Naan hasn't been given/,
    );
  });

  it("refuses a guest number that doesn't exist", () => {
    expect(() => splitByItems(bill, { [curry.id]: 0, [naan.id]: 5 }, 2)).toThrow(
      /guest 6, who doesn't exist/,
    );
  });
});

describe("splitByAmounts", () => {
  it("accepts amounts that add up to the bill", () => {
    expect(splitByAmounts(26250, [20000, 6250])).toEqual([20000, 6250]);
  });

  it("explains how far off the amounts are", () => {
    expect(() => splitByAmounts(26250, [20000, 5000])).toThrow(
      "Amounts are ₹12.50 short of the bill (₹262.50).",
    );
    expect(() => splitByAmounts(26250, [20000, 7000])).toThrow(
      "Amounts are ₹7.50 more than the bill (₹262.50).",
    );
  });

  it("rejects an empty list or negative amounts", () => {
    expect(() => splitByAmounts(100, [])).toThrow();
    expect(() => splitByAmounts(100, [150, -50])).toThrow();
  });
});

describe("every split adds up to the bill", () => {
  it("holds for many random bills and guest counts", () => {
    const random = seededRandom(7);

    for (let run = 0; run < 300; run++) {
      const items = Array.from({ length: 1 + random(6) }, () =>
        makeItem({ unitPricePaise: random(50_000), quantity: 1 + random(4) }),
      );
      const bill = calculateBill({
        items,
        discount: { kind: "percent", basisPoints: random(3_001) },
        taxRateBasisPoints: random(2_801),
      });
      const guests = 1 + random(8);
      const guestOfItem = Object.fromEntries(
        items.map((item) => [item.id, random(guests)]),
      );

      expect(sumPaise(splitEqually(bill.totalPaise, guests))).toBe(bill.totalPaise);
      expect(sumPaise(splitByItems(bill, guestOfItem, guests))).toBe(bill.totalPaise);
    }
  });
});
