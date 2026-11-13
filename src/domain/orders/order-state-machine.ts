import type { Id, IsoDateTime } from "@/types/common";
import type { Order, OrderStatus } from "@/types/order";
import { DomainError } from "../errors";

/**
 * THE ORDER STATE MACHINE
 *
 * An order can only move along these arrows:
 *
 *     new ──► preparing ──► ready ──► served ──► paid
 *      │          │           │
 *      └──────────┴───────────┴──► cancelled
 *
 *  - Nothing ever moves backwards (a "ready" order can't become "new" again).
 *  - "paid" and "cancelled" are final: nothing can change them afterwards.
 *  - Once food is served it must be paid for; it can't be cancelled.
 *
 * Keeping the arrows in ONE table means every screen (orders, kitchen, billing)
 * follows the same rules, and a status can never be "impossible".
 */
const ALLOWED_NEXT: Record<OrderStatus, readonly OrderStatus[]> = {
  new: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "cancelled"],
  served: ["paid"],
  paid: [],
  cancelled: [],
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  new: "New",
  preparing: "Preparing",
  ready: "Ready",
  served: "Served",
  paid: "Paid",
  cancelled: "Cancelled",
};

/** The statuses this order may move to next (for showing the right buttons). */
export function nextOrderStatuses(from: OrderStatus): readonly OrderStatus[] {
  return ALLOWED_NEXT[from];
}

export function canMoveOrder(from: OrderStatus, to: OrderStatus): boolean {
  return ALLOWED_NEXT[from].includes(to);
}

/** "Open" = still in progress: not paid and not cancelled. */
export function isOrderOpen(status: OrderStatus): boolean {
  return status !== "paid" && status !== "cancelled";
}

export type ChangeContext = {
  at: IsoDateTime; // when it happened
  by: Id; // staff id of who did it
};

/**
 * Moves an order to a new status and records it in the timeline.
 * Returns a NEW order object; the one passed in is never changed. (React and
 * the database both rely on that: they compare old and new to see what changed.)
 */
export function moveOrder(
  order: Order,
  to: OrderStatus,
  { at, by }: ChangeContext,
  cancelReason?: string,
): Order {
  if (!canMoveOrder(order.status, to)) {
    throw new DomainError(
      `Order ${order.number} is ${ORDER_STATUS_LABEL[order.status]}; it can't move to ${ORDER_STATUS_LABEL[to]}.`,
    );
  }
  if (to === "preparing" && !order.items.some((item) => item.status === "active")) {
    throw new DomainError(`Order ${order.number} has no items to prepare.`);
  }
  if (to === "cancelled" && !cancelReason?.trim()) {
    throw new DomainError(`Give a reason for cancelling order ${order.number}.`);
  }

  return {
    ...order,
    status: to,
    ...(to === "cancelled" ? { cancelReason: cancelReason?.trim() } : {}),
    statusHistory: [...order.statusHistory, { status: to, at, by }],
    updatedAt: at,
  };
}
