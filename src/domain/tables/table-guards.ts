import type { Order } from "@/types/order";
import type { RestaurantTable, TableStatus } from "@/types/table";
import { DomainError } from "../errors";
import { isOrderOpen } from "../orders/order-state-machine";
import { TABLE_STATUS_LABEL, changeTableStatus } from "./table-state-machine";

/**
 * GUARDS: rules that need to see the WHOLE floor (all tables and orders),
 * not just one table. They keep tables and orders consistent with each other.
 */

/** The open (not paid, not cancelled) order sitting at this table, if any. */
export function openOrderAt(table: RestaurantTable, orders: Order[]): Order | undefined {
  return orders.find(
    (order) => isOrderOpen(order.status) && order.tableIds.includes(table.id),
  );
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
