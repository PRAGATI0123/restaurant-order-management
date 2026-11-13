import { describe, expect, it } from "vitest";
import { calculateBill } from "@/domain/billing/calculate-bill";
import { makeItem, option, seededRandom } from "@/domain/__tests__/test-data";
import type { Discount } from "@/types/order";

const GST_5 = 500; // 5% in basis points

describe("calculateBill: the basic sum", () => {
  it("adds up items, then adds tax", () => {
    const bill = calculateBill({
      items: [
        makeItem({ name: "Paneer Tikka", unitPricePaise: 10000, quantity: 2 }), // ₹200
        makeItem({ name: "Lassi", unitPricePaise: 5000, quantity: 1 }), // ₹50
      ],
      taxRateBasisPoints: GST_5,
    });

    expect(bill.subtotalPaise).toBe(25000); // ₹250.00
    expect(bill.discountPaise).toBe(0);
    expect(bill.taxablePaise).toBe(25000);
    expect(bill.taxPaise).toBe(1250); // 5% = ₹12.50
    expect(bill.totalPaise).toBe(26250); // ₹262.50
  });

  it("charges add-ons and modifiers for every unit", () => {
    const bill = calculateBill({
      items: [
        makeItem({
          unitPricePaise: 18000, // Half · ₹180
          addOns: [option("Extra cheese", 4000)], // +₹40
          modifiers: [option("Hot", 0)],
          quantity: 2,
        }),
      ],
      taxRateBasisPoints: 0,
    });

    expect(bill.lines[0]).toMatchObject({ unitTotalPaise: 22000, lineTotalPaise: 44000 });
    expect(bill.totalPaise).toBe(44000); // (₹180 + ₹40) × 2
  });

  it("doesn't charge cancelled items", () => {
    const bill = calculateBill({
      items: [
        makeItem({ unitPricePaise: 10000 }),
        makeItem({ unitPricePaise: 99900, status: "cancelled" }),
      ],
      taxRateBasisPoints: 0,
    });

    expect(bill.lines).toHaveLength(1);
    expect(bill.subtotalPaise).toBe(10000);
  });

  it("gives an all-zero bill for an empty order", () => {
    const bill = calculateBill({ items: [], taxRateBasisPoints: GST_5 });
    expect(bill).toMatchObject({ subtotalPaise: 0, taxPaise: 0, totalPaise: 0 });
  });
});

describe("calculateBill: discounts", () => {
  const items = [makeItem({ unitPricePaise: 100000 })]; // ₹1,000

  it("takes a percentage off BEFORE tax", () => {
    const bill = calculateBill({
      items,
      discount: { kind: "percent", basisPoints: 1000 }, // 10%
      taxRateBasisPoints: GST_5,
    });

    expect(bill.discountPaise).toBe(10000); // ₹100 off
    expect(bill.taxablePaise).toBe(90000); // ₹900
    expect(bill.taxPaise).toBe(4500); // 5% of ₹900, not of ₹1,000
    expect(bill.totalPaise).toBe(94500);
  });

  it("takes a fixed amount off", () => {
    const bill = calculateBill({
      items,
      discount: { kind: "fixed", amountPaise: 15000 }, // ₹150 off
      taxRateBasisPoints: GST_5,
    });

    expect(bill.taxablePaise).toBe(85000);
    expect(bill.totalPaise).toBe(89250);
  });

  it("never takes off more than the subtotal", () => {
    const bill = calculateBill({
      items: [makeItem({ unitPricePaise: 15000 })], // ₹150
      discount: { kind: "fixed", amountPaise: 20000 }, // ₹200 off
      taxRateBasisPoints: GST_5,
    });

    expect(bill.discountPaise).toBe(15000);
    expect(bill.totalPaise).toBe(0);
  });

  it("rejects a discount over 100% or below 0", () => {
    const bad: Discount[] = [
      { kind: "percent", basisPoints: 15000 },
      { kind: "percent", basisPoints: -100 },
      { kind: "fixed", amountPaise: -500 },
      { kind: "fixed", amountPaise: 10.5 },
    ];
    for (const discount of bad) {
      expect(() => calculateBill({ items, discount, taxRateBasisPoints: 0 })).toThrow();
    }
  });
});

describe("calculateBill: rounding", () => {
  it("rounds tax to the nearest paisa, halves up", () => {
    const bill = calculateBill({
      items: [makeItem({ unitPricePaise: 9999 })], // ₹99.99
      taxRateBasisPoints: GST_5, // 499.95 paise
    });

    expect(bill.taxPaise).toBe(500);
    expect(bill.totalPaise).toBe(10499);
  });

  it("taxes the whole bill once, not each line (avoids rounding drift)", () => {
    // Three 10-paise items at 5%: per line 0.5 → 1 each = 3 paise of tax.
    // On the whole bill: 30 × 5% = 1.5 → 2 paise. The correct answer is 2.
    const bill = calculateBill({
      items: [
        makeItem({ unitPricePaise: 10 }),
        makeItem({ unitPricePaise: 10 }),
        makeItem({ unitPricePaise: 10 }),
      ],
      taxRateBasisPoints: GST_5,
    });

    expect(bill.taxPaise).toBe(2);
  });
});

describe("calculateBill: bad input", () => {
  it.each([0, -1, 1.5])("rejects quantity %s", (quantity) => {
    expect(() =>
      calculateBill({ items: [makeItem({ quantity })], taxRateBasisPoints: 0 }),
    ).toThrow(/Quantity/);
  });

  it("rejects negative or fractional prices", () => {
    expect(() =>
      calculateBill({
        items: [makeItem({ unitPricePaise: -100 })],
        taxRateBasisPoints: 0,
      }),
    ).toThrow();
    expect(() =>
      calculateBill({
        items: [makeItem({ addOns: [option("Cheese", 0.5)] })],
        taxRateBasisPoints: 0,
      }),
    ).toThrow();
  });

  it("rejects a tax rate over 100%", () => {
    expect(() => calculateBill({ items: [], taxRateBasisPoints: 10001 })).toThrow(
      /Tax rate/,
    );
  });
});

describe("calculateBill: rules that hold for ANY order", () => {
  it("always: total = subtotal − discount + tax, and nothing is negative", () => {
    const random = seededRandom(42);

    for (let run = 0; run < 500; run++) {
      const items = Array.from({ length: 1 + random(6) }, () =>
        makeItem({
          unitPricePaise: random(100_000),
          quantity: 1 + random(5),
          addOns: random(2) ? [option("extra", random(5000))] : [],
          status: random(8) === 0 ? "cancelled" : "active",
        }),
      );
      // Typed list, so TypeScript knows "percent" means the Discount kind, not any text.
      const discountChoices: (Discount | undefined)[] = [
        undefined,
        { kind: "percent", basisPoints: random(10_001) },
        { kind: "fixed", amountPaise: random(200_000) },
      ];
      const discount = discountChoices[random(3)];

      const bill = calculateBill({ items, discount, taxRateBasisPoints: random(2_801) });

      expect(bill.totalPaise).toBe(
        bill.subtotalPaise - bill.discountPaise + bill.taxPaise,
      );
      expect(bill.discountPaise).toBeLessThanOrEqual(bill.subtotalPaise);
      for (const amount of [bill.discountPaise, bill.taxablePaise, bill.taxPaise]) {
        expect(Number.isSafeInteger(amount) && amount >= 0).toBe(true);
      }
    }
  });
});
