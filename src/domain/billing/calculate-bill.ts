import type { Id, Paise } from "@/types/common";
import type { Discount, OrderItem } from "@/types/order";
import { DomainError } from "../errors";
import { assertBasisPoints, assertPaise, percentOf, sumPaise } from "../money";

/**
 * THE BILL — business rules (also in docs/BUSINESS_RULES.md later)
 *
 *  1. Line total   = (item price + add-ons + modifiers) × quantity
 *  2. Cancelled items are not charged.
 *  3. Subtotal     = sum of line totals
 *  4. Discount     = % of subtotal, or a fixed amount; never more than the subtotal
 *  5. Taxable      = subtotal − discount        (tax is charged AFTER the discount)
 *  6. Tax          = tax rate × taxable, on the whole bill (not item by item)
 *  7. Total        = taxable + tax
 *
 *  Rounding happens only twice: once for the discount, once for the tax, each to
 *  the nearest paisa with halves rounding up. Everything else is exact.
 */

export type BillInput = {
  items: OrderItem[];
  discount?: Discount;
  /** e.g. 500 = 5%. */
  taxRateBasisPoints: number;
};

export type BillLine = {
  itemId: Id;
  name: string;
  quantity: number;
  /** One item including its add-ons and modifiers. */
  unitTotalPaise: Paise;
  /** unitTotalPaise × quantity. */
  lineTotalPaise: Paise;
};

export type Bill = {
  lines: BillLine[];
  subtotalPaise: Paise;
  discountPaise: Paise;
  taxablePaise: Paise;
  taxPaise: Paise;
  totalPaise: Paise;
};

/** Price of ONE of this item, with everything the guest added to it. */
export function itemUnitTotal(item: OrderItem): Paise {
  assertPaise(item.unitPricePaise, `Price of ${item.name}`);
  const extras = [...item.addOns, ...item.modifiers];
  extras.forEach((extra) => assertPaise(extra.pricePaise, `Price of ${extra.name}`));
  return item.unitPricePaise + sumPaise(extras.map((extra) => extra.pricePaise));
}

function assertQuantity(item: OrderItem): void {
  if (!Number.isSafeInteger(item.quantity) || item.quantity < 1) {
    throw new DomainError(
      `Quantity of ${item.name} must be a whole number of at least 1, got ${item.quantity}.`,
    );
  }
}

/** How much the discount takes off, in paise. Never more than the subtotal. */
export function discountAmount(subtotal: Paise, discount: Discount | undefined): Paise {
  if (!discount) return 0;
  if (discount.kind === "percent") {
    assertBasisPoints(discount.basisPoints, "Discount");
    return percentOf(subtotal, discount.basisPoints);
  }
  assertPaise(discount.amountPaise, "Discount");
  // A ₹200 discount on a ₹150 bill takes off ₹150, so the bill never goes negative.
  // (It can happen when items are cancelled after the discount was given.)
  return Math.min(discount.amountPaise, subtotal);
}

/** Works out the full bill for an order. Pure: same input → same bill, always. */
export function calculateBill({ items, discount, taxRateBasisPoints }: BillInput): Bill {
  assertBasisPoints(taxRateBasisPoints, "Tax rate");

  const lines: BillLine[] = items
    .filter((item) => item.status !== "cancelled")
    .map((item) => {
      assertQuantity(item);
      const unitTotalPaise = itemUnitTotal(item);
      return {
        itemId: item.id,
        name: item.name,
        quantity: item.quantity,
        unitTotalPaise,
        lineTotalPaise: unitTotalPaise * item.quantity,
      };
    });

  const subtotalPaise = sumPaise(lines.map((line) => line.lineTotalPaise));
  assertPaise(subtotalPaise, "Subtotal"); // catches a total too big to count exactly
  const discountPaise = discountAmount(subtotalPaise, discount);
  const taxablePaise = subtotalPaise - discountPaise;
  const taxPaise = percentOf(taxablePaise, taxRateBasisPoints);
  const totalPaise = taxablePaise + taxPaise;

  return { lines, subtotalPaise, discountPaise, taxablePaise, taxPaise, totalPaise };
}
