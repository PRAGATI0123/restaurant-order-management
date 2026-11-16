import type { Id } from "@/types/common";
import type { OrderItem } from "@/types/order";
import { DomainError } from "../errors";
import { MAX_QUANTITY } from "./item-choices";

/**
 * THE CART: the lines of an order that hasn't been sent to the kitchen yet.
 * Every function returns a NEW list; the old one is never changed.
 */

/**
 * Two lines are "the same" when the kitchen would make them the same way:
 * same dish, same size, same add-ons, same options, same note.
 */
function sameDish(a: OrderItem, b: OrderItem): boolean {
  const ids = (list: { id: Id }[]) =>
    list
      .map((x) => x.id)
      .sort()
      .join(",");
  return (
    a.menuItemId === b.menuItemId &&
    a.variant?.id === b.variant?.id &&
    ids(a.addOns) === ids(b.addOns) &&
    ids(a.modifiers) === ids(b.modifiers) &&
    (a.note ?? "") === (b.note ?? "")
  );
}

/**
 * Adds a line. If the same dish with the same choices is already in the cart,
 * its quantity goes up instead, so the kitchen ticket says "3 × Butter Naan",
 * not three separate lines.
 */
export function addToCart(lines: OrderItem[], line: OrderItem): OrderItem[] {
  const existing = lines.find((l) => sameDish(l, line));
  if (!existing) return [...lines, line];
  const quantity = existing.quantity + line.quantity;
  if (quantity > MAX_QUANTITY) {
    throw new DomainError(`That would be more than ${MAX_QUANTITY} × ${line.name}.`);
  }
  return lines.map((l) => (l === existing ? { ...l, quantity } : l));
}

/** Sets a line's quantity. 0 removes the line. */
export function setLineQuantity(
  lines: OrderItem[],
  lineId: Id,
  quantity: number,
): OrderItem[] {
  if (!Number.isInteger(quantity) || quantity < 0 || quantity > MAX_QUANTITY) {
    throw new DomainError(`Quantity must be from 0 to ${MAX_QUANTITY}.`);
  }
  if (quantity === 0) return lines.filter((l) => l.id !== lineId);
  return lines.map((l) => (l.id === lineId ? { ...l, quantity } : l));
}

/**
 * Sets a line's kitchen note ("less oil"). Empty text removes the note.
 * If another line is now exactly the same dish, the two are combined.
 */
export function setLineNote(lines: OrderItem[], lineId: Id, note: string): OrderItem[] {
  const line = lines.find((l) => l.id === lineId);
  if (!line) return lines;
  const trimmed = note.trim();
  const updated: OrderItem = { ...line };
  if (trimmed) updated.note = trimmed;
  else delete updated.note;
  return addToCart(
    lines.filter((l) => l.id !== lineId),
    updated,
  );
}

/** Number of dishes in the cart (3 × Naan + 1 × Dal = 4). */
export function cartCount(lines: OrderItem[]): number {
  return lines.reduce((sum, l) => sum + l.quantity, 0);
}
