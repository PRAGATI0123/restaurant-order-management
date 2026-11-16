import { describe, expect, it } from "vitest";
import {
  amountDue,
  checkDiscount,
  checkFullPayment,
  checkPayment,
  nextEqualShare,
  quickCashAmounts,
} from "@/domain/billing/payments";
import { sumPaise } from "@/domain/money";

describe("checkPayment", () => {
  it("works out the change when a guest pays cash", () => {
    expect(
      checkPayment(
        { method: "cash", amountPaise: 128600, tenderedPaise: 150000 },
        128600,
      ),
    ).toEqual({
      method: "cash",
      amountPaise: 128600,
      tenderedPaise: 150000,
      changePaise: 21400,
    });
  });

  it("treats cash with no amount received as the exact amount (no change)", () => {
    expect(checkPayment({ method: "cash", amountPaise: 5000 }, 9000)).toMatchObject({
      tenderedPaise: 5000,
      changePaise: 0,
    });
  });

  it("refuses cash received that is less than the part being paid", () => {
    expect(() =>
      checkPayment({ method: "cash", amountPaise: 50000, tenderedPaise: 20000 }, 90000),
    ).toThrow("Cash received (₹200.00) is less than the amount to pay (₹500.00).");
  });

  it("allows a part payment, but never more than what is due", () => {
    expect(checkPayment({ method: "upi", amountPaise: 40000 }, 90000).amountPaise).toBe(
      40000,
    );
    expect(() => checkPayment({ method: "card", amountPaise: 90001 }, 90000)).toThrow(
      "₹900.01 is more than what's left to pay (₹900.00).",
    );
  });

  it("drops a 'cash received' amount from card and UPI payments", () => {
    expect(
      checkPayment({ method: "card", amountPaise: 1000, tenderedPaise: 5000 }, 1000),
    ).toEqual({ method: "card", amountPaise: 1000 });
  });

  it("refuses zero, fractions of a paisa, and paying a settled bill", () => {
    expect(() => checkPayment({ method: "cash", amountPaise: 0 }, 1000)).toThrow(
      "Enter an amount to pay.",
    );
    expect(() => checkPayment({ method: "cash", amountPaise: 10.5 }, 1000)).toThrow();
    expect(() => checkPayment({ method: "cash", amountPaise: 100 }, 0)).toThrow(
      "already fully paid",
    );
  });
});

describe("checkFullPayment", () => {
  it("accepts parts that add up to the total exactly", () => {
    const parts = checkFullPayment(126250, [
      { method: "cash", amountPaise: 50000, tenderedPaise: 50000 },
      { method: "upi", amountPaise: 76250 },
    ]);
    expect(sumPaise(parts.map((p) => p.amountPaise))).toBe(126250);
  });

  it("says how much is still missing", () => {
    expect(() =>
      checkFullPayment(126250, [{ method: "card", amountPaise: 100000 }]),
    ).toThrow("₹262.50 is still left to pay.");
  });

  it("needs no payment for a free (100% discount) bill, but one for anything else", () => {
    expect(checkFullPayment(0, [])).toEqual([]);
    expect(() => checkFullPayment(500, [])).toThrow("Add a payment first.");
  });

  it("refuses parts that together pay too much", () => {
    expect(() =>
      checkFullPayment(10000, [
        { method: "card", amountPaise: 6000 },
        { method: "upi", amountPaise: 6000 },
      ]),
    ).toThrow("more than what's left to pay");
  });
});

describe("helpers for the payment screen", () => {
  it("amountDue: the total minus every part so far", () => {
    expect(amountDue(10000, [{ amountPaise: 2500 }, { amountPaise: 2500 }])).toBe(5000);
  });

  it("quickCashAmounts: exact, then round notes a guest would hand over", () => {
    expect(quickCashAmounts(128600)).toEqual([128600, 130000, 150000, 200000]);
    expect(quickCashAmounts(4000)).toEqual([4000, 5000, 10000, 50000]);
    expect(quickCashAmounts(50000)).toEqual([50000, 200000]); // no repeats
    expect(quickCashAmounts(0)).toEqual([]);
  });

  it("nextEqualShare: each guest's share, adding up to the total exactly", () => {
    const total = 100000; // ₹1,000 between 3 guests
    const first = nextEqualShare(total, 3, 0, total);
    const second = nextEqualShare(total, 3, 1, total - first);
    const third = nextEqualShare(total, 3, 2, total - first - second);
    expect([first, second, third]).toEqual([33334, 33333, 33333]);
    expect(first + second + third).toBe(total);
  });

  it("nextEqualShare: never more than what is still due", () => {
    expect(nextEqualShare(100000, 2, 0, 20000)).toBe(20000);
  });
});

describe("checkDiscount", () => {
  it("accepts 1–100% and trims the reason", () => {
    expect(
      checkDiscount(
        { kind: "percent", basisPoints: 1000, reason: "  Regular guest " },
        5000,
      ),
    ).toEqual({ kind: "percent", basisPoints: 1000, reason: "Regular guest" });
    expect(() => checkDiscount({ kind: "percent", basisPoints: 0 }, 5000)).toThrow();
    expect(() => checkDiscount({ kind: "percent", basisPoints: 10_001 }, 5000)).toThrow(
      "at most 100%",
    );
  });

  it("refuses a fixed discount bigger than the bill", () => {
    expect(checkDiscount({ kind: "fixed", amountPaise: 5000, reason: "" }, 5000)).toEqual(
      {
        kind: "fixed",
        amountPaise: 5000,
      },
    );
    expect(() => checkDiscount({ kind: "fixed", amountPaise: 5001 }, 5000)).toThrow(
      "can't be more than the bill (₹50.00)",
    );
  });
});
