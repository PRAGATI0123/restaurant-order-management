import type { IsoDateTime } from "@/types/common";
import type { Order } from "@/types/order";
import type { RestaurantTable, TableStatus } from "@/types/table";
import { DomainError } from "../errors";
import { isOrderOpen } from "../orders/order-state-machine";
import { TABLE_STATUS_LABEL, changeTableStatus } from "./table-state-machine";

/**
 * GUARDS: rules that need to see the WHOLE floor (all tables and orders),
 * not just one table. They keep tables and orders consistent with each other.
 */

/**
 * A table can have SEVERAL open orders at once:
 *  - a group asked for separate bills (the order was split), or
 *  - guests ordered a second round after the first was already served.
 * The table only becomes free when every one of them is paid or cancelled.
 */
export function openOrdersAt(table: RestaurantTable, orders: Order[]): Order[] {
  return orders.filter(
    (order) => isOrderOpen(order.status) && order.tableIds.includes(table.id),
  );
}

/** The first open order at this table, if any. */
export function openOrderAt(table: RestaurantTable, orders: Order[]): Order | undefined {
  return openOrdersAt(table, orders)[0];
}

/** Tables joined onto this one (for a big group). */
export function tablesJoinedTo(
  table: RestaurantTable,
  tables: RestaurantTable[],
): RestaurantTable[] {
  return tables.filter((t) => t.mergedIntoId === table.id);
}

/**
 * Changes a table's status, but only if the rest of the floor allows it:
 *  - A table with an open order stays occupied until the order is paid,
 *    cancelled or moved. Otherwise the order would be "nowhere".
 *  - A main table with tables joined to it must be separated first.
 *  - Plus every rule of the table state machine (Step 8).
 */
export function changeStatusSafely(
  table: RestaurantTable,
  to: TableStatus,
  tables: RestaurantTable[],
  orders: Order[],
): RestaurantTable {
  if (to !== "occupied") {
    const order = openOrderAt(table, orders);
    if (order) {
      throw new DomainError(
        `${table.name} still has order ${order.number} open. Settle the bill or move the order first.`,
      );
    }
    const joined = tablesJoinedTo(table, tables);
    if (joined.length > 0) {
      throw new DomainError(
        `${joined.map((t) => t.name).join(", ")} ${joined.length === 1 ? "is" : "are"} joined to ${table.name}. Separate them first.`,
      );
    }
  }
  return changeTableStatus(table, to);
}

/** Like changeStatusSafely, but answers yes/no with the reason (for greying out buttons). */
export function checkStatusChange(
  table: RestaurantTable,
  to: TableStatus,
  tables: RestaurantTable[],
  orders: Order[],
): { ok: true } | { ok: false; reason: string } {
  try {
    changeStatusSafely(table, to, tables, orders);
    return { ok: true };
  } catch (error) {
    if (error instanceof DomainError) return { ok: false, reason: error.message };
    throw error;
  }
}

/**
 * A table can be removed from the floor plan only when nobody is using it:
 * it must be Available, not joined to or by another table, and have no order.
 */
export function assertCanDeleteTable(
  table: RestaurantTable,
  tables: RestaurantTable[],
  orders: Order[],
): void {
  if (table.status !== "available") {
    throw new DomainError(
      `${table.name} is ${TABLE_STATUS_LABEL[table.status]}. Only a free table can be removed.`,
    );
  }
  if (table.mergedIntoId || tablesJoinedTo(table, tables).length > 0) {
    throw new DomainError(
      `${table.name} is joined with another table. Separate them first.`,
    );
  }
  if (openOrderAt(table, orders)) {
    throw new DomainError(`${table.name} has an open order.`);
  }
}

/**
 * Why a table can't take a new order right now, or undefined if it can.
 * A table that already has orders CAN take another one (a second round, or split bills).
 */
export function whyCantStartOrder(
  table: RestaurantTable,
  tables: RestaurantTable[],
): string | undefined {
  if (table.mergedIntoId) {
    const main = tables.find((t) => t.id === table.mergedIntoId);
    return `${table.name} is joined to ${main?.name ?? "another table"}. Start the order there.`;
  }
  if (table.status === "cleaning") return `${table.name} is being cleaned.`;
  return undefined;
}

/**
 * START A DINE-IN ORDER AT A TABLE. Allowed when the table is:
 *  - Available or Reserved (guests arriving), or
 *  - Occupied (guests seated first, or ordering another round).
 * Not allowed: being cleaned, or joined to another table (use the main one).
 *
 * The order is linked to the table AND every table joined to it, so later rules
 * (move, separate) see the whole group. The table becomes Occupied.
 */
export function startOrderAtTable(
  order: Order,
  table: RestaurantTable,
  tables: RestaurantTable[],
  orders: Order[],
  at: IsoDateTime,
): { order: Order; table: RestaurantTable } {
  if (order.type !== "dine-in") {
    throw new DomainError(
      `Order ${order.number} is ${order.type}; it doesn't use a table.`,
    );
  }
  const reason = whyCantStartOrder(table, tables);
  if (reason) throw new DomainError(reason);

  const joinedIds = tablesJoinedTo(table, tables).map((t) => t.id);
  return {
    order: { ...order, tableIds: [table.id, ...joinedIds], updatedAt: at },
    table: { ...table, status: "occupied" },
  };
}
