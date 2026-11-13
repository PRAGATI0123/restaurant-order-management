import type { RestaurantTable, TableStatus } from "@/types/table";
import { DomainError } from "../errors";

/**
 * THE TABLE STATE MACHINE
 *
 *              ┌──────────► reserved ──────┐
 *              │               │           ▼
 *         available ◄──────────┘        occupied
 *              ▲  └────────────────────►   │  │
 *              │                           │  │
 *              │    (guests moved away)    │  │
 *              ├───────────────────────────┘  │ (guests left)
 *              │                              ▼
 *              └────────────────────────── cleaning
 *
 *  available → occupied  guests sit down (or an order is started here)
 *  available → reserved  a booking is made
 *  reserved  → occupied  the booked guests arrive
 *  reserved  → available the booking is cancelled
 *  occupied  → cleaning  guests leave after paying
 *  occupied  → available guests moved to another table before using this one
 *  cleaning  → available table is wiped and ready
 *
 *  A dirty table can never be given to new guests directly: cleaning comes first.
 */
const ALLOWED_NEXT: Record<TableStatus, readonly TableStatus[]> = {
  available: ["occupied", "reserved"],
  reserved: ["occupied", "available"],
  occupied: ["cleaning", "available"],
  cleaning: ["available"],
};

export const TABLE_STATUS_LABEL: Record<TableStatus, string> = {
  available: "Available",
  occupied: "Occupied",
  reserved: "Reserved",
  cleaning: "Cleaning",
};

export function nextTableStatuses(from: TableStatus): readonly TableStatus[] {
  return ALLOWED_NEXT[from];
}

export function canChangeTableStatus(from: TableStatus, to: TableStatus): boolean {
  return ALLOWED_NEXT[from].includes(to);
}

/** Throws with a readable message unless the move is allowed. */
export function assertTableMove(table: RestaurantTable, to: TableStatus): void {
  if (!canChangeTableStatus(table.status, to)) {
    throw new DomainError(
      `${table.name} is ${TABLE_STATUS_LABEL[table.status]}; it can't become ${TABLE_STATUS_LABEL[to]}.`,
    );
  }
}

/**
 * Changes a table's status, e.g. when staff tap "Cleaned".
 * A table that is merged into another follows that table: change the main
 * table instead, or unmerge first.
 */
export function changeTableStatus(
  table: RestaurantTable,
  to: TableStatus,
): RestaurantTable {
  if (table.mergedIntoId) {
    throw new DomainError(`${table.name} is joined to another table. Unmerge it first.`);
  }
  assertTableMove(table, to);
  return { ...table, status: to };
}
