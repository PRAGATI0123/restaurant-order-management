import type { Id, Paise } from "@/types/common";
import { DomainError } from "../errors";
import { allocate, assertPaise, formatRupees, sumPaise } from "../money";
import type { Bill } from "./calculate-bill";

/**
 * SPLITTING A BILL between guests. One rule for every kind of split:
 *   the shares ALWAYS add up to exactly the bill total, to the paisa.
 * That's why every split goes through allocate() from money.ts.
 */

function assertGuestCount(guests: number): void {
  if (!Number.isInteger(guests) || guests < 1) {
    throw new DomainError(
      `Number of guests must be a whole number of at least 1, got ${guests}.`,
    );
  }
}

/**
 * Everyone pays the same. Leftover paise go to the first guests.
 *   splitEqually(26250, 4) → [6563, 6563, 6562, 6562]   (₹262.50 between 4)
 */
export function splitEqually(totalPaise: Paise, guests: number): Paise[] {
  assertGuestCount(guests);
  return allocate(
    totalPaise,
    Array.from({ length: guests }, () => 1),
  );
}

/**
 * Each guest pays for what they ordered. `guestOfItem` says which guest
 * (0, 1, 2, …) had each bill line.
 *
 * Discount and tax are shared in proportion to what each guest ordered: we
 * split the final total by each guest's share of the subtotal. That way the
 * shares still add up to the total exactly, with no paisa lost to rounding.
 */
export function splitByItems(
  bill: Bill,
  guestOfItem: Record<Id, number>,
  guests: number,
): Paise[] {
  assertGuestCount(guests);
  const subtotalOfGuest = Array.from({ length: guests }, () => 0);

  for (const line of bill.lines) {
    const guest = guestOfItem[line.itemId];
    if (guest === undefined) {
      throw new DomainError(`${line.name} hasn't been given to a guest yet.`);
    }
    if (!Number.isInteger(guest) || guest < 0 || guest >= guests) {
      throw new DomainError(
        `${line.name} is given to guest ${guest + 1}, who doesn't exist.`,
      );
    }
    subtotalOfGuest[guest] = (subtotalOfGuest[guest] ?? 0) + line.lineTotalPaise;
  }

  if (bill.totalPaise === 0) return subtotalOfGuest.map(() => 0);
  return allocate(bill.totalPaise, subtotalOfGuest);
}

/**
 * Guests choose their own amounts ("I'll pay ₹500, you pay the rest").
 * Checks the amounts add up to the total, and returns them unchanged.
 */
export function splitByAmounts(totalPaise: Paise, amounts: Paise[]): Paise[] {
  assertPaise(totalPaise, "Total");
  if (amounts.length === 0) {
    throw new DomainError("Enter at least one amount.");
  }
  amounts.forEach((amount, i) => assertPaise(amount, `Amount for guest ${i + 1}`));

  const entered = sumPaise(amounts);
  if (entered !== totalPaise) {
    const gap = totalPaise - entered;
    throw new DomainError(
      gap > 0
        ? `Amounts are ${formatRupees(gap)} short of the bill (${formatRupees(totalPaise)}).`
        : `Amounts are ${formatRupees(-gap)} more than the bill (${formatRupees(totalPaise)}).`,
    );
  }
  return amounts;
}
