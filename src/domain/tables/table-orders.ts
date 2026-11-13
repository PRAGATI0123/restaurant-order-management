import type { IsoDateTime } from "@/types/common";
import type { Order } from "@/types/order";
import type { RestaurantTable } from "@/types/table";
import { DomainError } from "../errors";
import { ORDER_STATUS_LABEL, isOrderOpen } from "../orders/order-state-machine";
import { TABLE_STATUS_LABEL, assertTableMove } from "./table-state-machine";

/**
 * ORDERS ↔ TABLES
 * Each function takes the records involved and returns their NEW versions
 * together, so the caller can save them all at once. Either everything
 * changes, or (if a rule is broken) nothing does: an error is thrown before
 * anything is returned.
 */

function assertDineInAndOpen(order: Order): void {
  if (order.type !== "dine-in") {
    throw new DomainError(
      `Order ${order.number} is ${order.type}; only dine-in orders use tables.`,
    );
  }
  if (!isOrderOpen(order.status)) {
    throw new DomainError(
      `Order ${order.number} is ${ORDER_STATUS_LABEL[order.status]}; its table can't change.`,
    );
  }
}

function assertNotJoined(table: RestaurantTable): void {
  if (table.mergedIntoId) {
    throw new DomainError(`${table.name} is joined to another table. Unmerge it first.`);
  }
}

function assertFree(table: RestaurantTable, purpose: string): void {
  assertNotJoined(table);
  if (table.status !== "available") {
    throw new DomainError(
      `${table.name} is ${TABLE_STATUS_LABEL[table.status]}. Only a free table can ${purpose}.`,
    );
  }
}

/**
 * SEAT: put a new dine-in order at a table. The table becomes occupied.
 * Works for a free table, or a reserved one whose guests just arrived.
 */
export function seatOrder(order: Order, table: RestaurantTable, at: IsoDateTime) {
  assertDineInAndOpen(order);
  if (order.tableIds.length > 0) {
    throw new DomainError(
      `Order ${order.number} already has a table. Transfer it instead.`,
    );
  }
  assertNotJoined(table);
  if (table.status !== "available" && table.status !== "reserved") {
    throw new DomainError(
      `${table.name} is ${TABLE_STATUS_LABEL[table.status]}. Choose a free or reserved table.`,
    );
  }

  return {
    order: { ...order, tableIds: [table.id], updatedAt: at },
    table: { ...table, status: "occupied" as const },
  };
}

/**
 * TRANSFER: move an order from one table to another (guests change tables).
 *  - The new table must be free.
 *  - The old table goes to "cleaning": guests sat there, so it needs wiping.
 *  - Orders on merged tables can't be transferred; unmerge first.
 */
export function transferOrder(
  order: Order,
  from: RestaurantTable,
  to: RestaurantTable,
  at: IsoDateTime,
) {
  assertDineInAndOpen(order);
  if (order.tableIds.length > 1) {
    throw new DomainError(
      `Order ${order.number} is on joined tables. Unmerge them before moving it.`,
    );
  }
  if (order.tableIds[0] !== from.id) {
    throw new DomainError(`Order ${order.number} isn't at ${from.name}.`);
  }
  if (to.id === from.id) {
    throw new DomainError(`Order ${order.number} is already at ${to.name}.`);
  }
  assertFree(to, "take this order");
  assertTableMove(from, "cleaning");

  return {
    order: { ...order, tableIds: [to.id], updatedAt: at },
    from: { ...from, status: "cleaning" as const },
    to: { ...to, status: "occupied" as const },
  };
}

/**
 * MERGE: join free tables onto a main table for a big group.
 *  - The main table keeps the order (if there is one already).
 *  - Joined tables point at the main table (mergedIntoId) and show as occupied.
 *  - Only free tables can be joined; a table with its own guests can't.
 */
export function mergeTables(
  main: RestaurantTable,
  joining: RestaurantTable[],
  order: Order | undefined,
  at: IsoDateTime,
) {
  if (joining.length === 0) {
    throw new DomainError("Choose at least one table to join.");
  }
  const ids = new Set(joining.map((t) => t.id));
  if (ids.size !== joining.length) {
    throw new DomainError("The same table was chosen twice.");
  }
  if (ids.has(main.id)) {
    throw new DomainError(`${main.name} can't be joined to itself.`);
  }
  assertNotJoined(main);
  joining.forEach((table) => assertFree(table, "be joined"));

  if (main.status !== "occupied") assertTableMove(main, "occupied");

  let updatedOrder = order;
  if (order) {
    assertDineInAndOpen(order);
    if (order.tableIds.length !== 1 || order.tableIds[0] !== main.id) {
      throw new DomainError(`Order ${order.number} isn't at ${main.name}.`);
    }
    updatedOrder = {
      ...order,
      tableIds: [main.id, ...joining.map((t) => t.id)],
      updatedAt: at,
    };
  }

  return {
    main: { ...main, status: "occupied" as const },
    joined: joining.map((table) => ({
      ...table,
      status: "occupied" as const,
      mergedIntoId: main.id,
    })),
    order: updatedOrder,
  };
}

/**
 * UNMERGE: separate joined tables from the main table again.
 * They were used, so they go to "cleaning". The order stays on the main table.
 */
export function unmergeTables(
  main: RestaurantTable,
  joined: RestaurantTable[],
  order: Order | undefined,
  at: IsoDateTime,
) {
  if (joined.length === 0) {
    throw new DomainError("Choose at least one table to separate.");
  }
  for (const table of joined) {
    if (table.mergedIntoId !== main.id) {
      throw new DomainError(`${table.name} isn't joined to ${main.name}.`);
    }
  }
  const leaving = new Set(joined.map((t) => t.id));

  // Copy each table, drop the link to the main table, and mark it for cleaning.
  const separated = joined.map((table): RestaurantTable => {
    const copy: RestaurantTable = { ...table, status: "cleaning" };
    delete copy.mergedIntoId;
    return copy;
  });

  return {
    main,
    separated,
    order: order && {
      ...order,
      tableIds: order.tableIds.filter((id) => !leaving.has(id)),
      updatedAt: at,
    },
  };
}

/** Seats at a main table plus every table joined to it. */
export function totalSeats(main: RestaurantTable, joined: RestaurantTable[]): number {
  return joined.reduce((seats, table) => seats + table.seats, main.seats);
}
