import type { IsoDateTime } from "@/types/common";
import type { Order, OrderStatus } from "@/types/order";
import {
  DEFAULT_KITCHEN_TIMING,
  elapsedSeconds,
  ticketUrgency,
  type KitchenTiming,
} from "./delay-rules";

/**
 * THE KITCHEN BOARD
 *
 * The kitchen sees each open order as one TICKET, in one of three columns:
 *
 *     New ──tap──► Preparing ──tap──► Ready ──tap──► (served, leaves the board)
 *
 * One tap moves a ticket one column to the right. The order state machine
 * still checks every move, so the kitchen can't skip or undo a step.
 */
export const KITCHEN_COLUMNS = ["new", "preparing", "ready"] as const;
export type KitchenColumn = (typeof KITCHEN_COLUMNS)[number];

/** Where one tap sends a ticket from each column. */
export const KITCHEN_NEXT: Record<KitchenColumn, "preparing" | "ready" | "served"> = {
  new: "preparing",
  preparing: "ready",
  ready: "served",
};

export function isKitchenColumn(status: OrderStatus): status is KitchenColumn {
  return (KITCHEN_COLUMNS as readonly OrderStatus[]).includes(status);
}

/**
 * When the order last entered the status it's in now (from its timeline).
 * Falls back to when it was placed, if the timeline doesn't say.
 */
export function enteredStatusAt(order: Order): IsoDateTime {
  const entry = order.statusHistory.findLast((change) => change.status === order.status);
  return entry?.at ?? order.createdAt;
}

/**
 * Where each ticket's clock starts:
 *  - New / Preparing: when the order was PLACED. The guest has been waiting
 *    since then, whatever the kitchen was doing.
 *  - Ready: when it became ready, i.e. how long the food has sat at the pass
 *    getting cold.
 */
export function ticketClockStart(order: Order): IsoDateTime {
  return order.status === "ready" ? enteredStatusAt(order) : order.createdAt;
}

/** An order that is on the kitchen board (New, Preparing or Ready). */
export type KitchenTicket = Order & { status: KitchenColumn };

export function isKitchenTicket(order: Order): order is KitchenTicket {
  return isKitchenColumn(order.status);
}

export type KitchenBoard = Record<KitchenColumn, KitchenTicket[]>;

/**
 * Sorts open orders into the three columns, OLDEST FIRST in each
 * ("first in, first out"), so the ticket waiting longest is always on top.
 * Served, paid and cancelled orders are not on the board.
 */
export function buildKitchenBoard(orders: Order[]): KitchenBoard {
  const board: KitchenBoard = { new: [], preparing: [], ready: [] };
  for (const order of orders) {
    if (isKitchenTicket(order)) board[order.status].push(order);
  }
  for (const column of KITCHEN_COLUMNS) {
    board[column].sort(
      (a, b) =>
        Date.parse(ticketClockStart(a)) - Date.parse(ticketClockStart(b)) ||
        a.number - b.number,
    );
  }
  return board;
}

export type AllDayLine = {
  key: string;
  /** "Chicken Biryani (Full)" */
  name: string;
  quantity: number;
};

/**
 * THE "ALL-DAY" COUNT: how many of each dish the kitchen still has to make,
 * added up across every New and Preparing ticket. A cook sees "6 × Garlic
 * Naan" and makes them in one batch.
 *  - Cancelled lines don't count.
 *  - Sizes count separately: a Half and a Full biryani are different plates.
 *  - Most first, then by name.
 */
export function allDayCounts(orders: Order[]): AllDayLine[] {
  const counts = new Map<string, AllDayLine>();
  for (const order of orders) {
    if (order.status !== "new" && order.status !== "preparing") continue;
    for (const line of order.items) {
      if (line.status !== "active") continue;
      const key = `${line.menuItemId}:${line.variant?.id ?? ""}`;
      const name = line.variant ? `${line.name} (${line.variant.name})` : line.name;
      const current = counts.get(key);
      counts.set(key, { key, name, quantity: (current?.quantity ?? 0) + line.quantity });
    }
  }
  return [...counts.values()].sort(
    (a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name),
  );
}

export type KitchenSummary = {
  /** Tickets still to cook (New + Preparing). */
  toCook: number;
  /** Of those, getting late (amber). */
  warning: number;
  /** Of those, late (red). */
  late: number;
  /** Food waiting at the pass to be served. */
  ready: number;
};

/** The numbers at the top of the kitchen screen. */
export function kitchenSummary(
  board: KitchenBoard,
  now: Date,
  timing: KitchenTiming = DEFAULT_KITCHEN_TIMING,
): KitchenSummary {
  const cooking = [...board.new, ...board.preparing];
  const urgency = cooking.map((order) =>
    ticketUrgency(elapsedSeconds(order.createdAt, now), timing),
  );
  return {
    toCook: cooking.length,
    warning: urgency.filter((u) => u === "warning").length,
    late: urgency.filter((u) => u === "late").length,
    ready: board.ready.length,
  };
}
