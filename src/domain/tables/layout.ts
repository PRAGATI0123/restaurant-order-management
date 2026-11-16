import type { Id } from "@/types/common";
import type { RestaurantTable } from "@/types/table";
import { DomainError } from "../errors";

/**
 * THE FLOOR PLAN GRID
 *
 * The room is a grid of 12 columns × 8 rows of cells. Every table is the
 * same size: a rounded rectangle covering 2 × 2 cells, whatever its number of
 * seats. Positions (x, y) are the table's top-left cell, counted from 0.
 *
 * Using whole cells (not pixels) means the plan looks the same on a phone and
 * on a big screen, and two tables can never half-overlap.
 */
export const FLOOR_COLUMNS = 12;
export const FLOOR_ROWS = 8;

/** Every table covers TABLE_SIZE × TABLE_SIZE cells. */
export const TABLE_SIZE = 2;

type Placed = Pick<RestaurantTable, "id" | "x" | "y">;

/** True if two placed tables share at least one cell. */
function overlaps(a: Placed, b: Placed): boolean {
  return (
    a.x < b.x + TABLE_SIZE &&
    b.x < a.x + TABLE_SIZE &&
    a.y < b.y + TABLE_SIZE &&
    b.y < a.y + TABLE_SIZE
  );
}

function insideFloor(table: Placed): boolean {
  return (
    table.x >= 0 &&
    table.y >= 0 &&
    table.x + TABLE_SIZE <= FLOOR_COLUMNS &&
    table.y + TABLE_SIZE <= FLOOR_ROWS
  );
}

/**
 * Can `candidate` stand where it says, without leaving the room or touching
 * another table? The candidate itself (same id) is ignored, so a table can be
 * checked at a new spot while it's still listed at its old one.
 */
export function canPlace(tables: Placed[], candidate: Placed): boolean {
  return (
    insideFloor(candidate) &&
    tables.every((other) => other.id === candidate.id || !overlaps(other, candidate))
  );
}

/**
 * The neat layout: a table every 3 cells (2 for the table + 1 gap), so new
 * tables line up in tidy rows with walking space between them.
 */
export const TABLE_PITCH = TABLE_SIZE + 1;

/**
 * Where a new table should go.
 * 1st choice: the first free spot in the neat rows (x = 0, 3, 6, 9; y = 0, 3, 6).
 * 2nd choice: any free spot at all, scanning row by row.
 * undefined = the room is full.
 */
export function findFreeSpot(tables: Placed[]): { x: number; y: number } | undefined {
  const fits = (x: number, y: number) => canPlace(tables, { id: "__new__", x, y });

  for (let y = 0; y < FLOOR_ROWS; y += TABLE_PITCH) {
    for (let x = 0; x < FLOOR_COLUMNS; x += TABLE_PITCH) {
      if (fits(x, y)) return { x, y };
    }
  }
  for (let y = 0; y < FLOOR_ROWS; y++) {
    for (let x = 0; x < FLOOR_COLUMNS; x++) {
      if (fits(x, y)) return { x, y };
    }
  }
  return undefined;
}

/**
 * Moves a table to (x, y) if it fits there; otherwise throws.
 * Returns the whole new list (the other tables are untouched).
 */
export function moveTableTo<T extends Placed & { name: string }>(
  // Generic: works on full tables AND on the editor's layout drafts, and gives
  // back the same kind it was given. Nothing extra (like a status) is added.
  tables: T[],
  tableId: Id,
  x: number,
  y: number,
): T[] {
  const table = tables.find((t) => t.id === tableId);
  if (!table) throw new DomainError("That table doesn't exist.");
  if (!canPlace(tables, { ...table, x, y })) {
    throw new DomainError(`There's no room for ${table.name} there.`);
  }
  return tables.map((t) => (t.id === tableId ? { ...t, x, y } : t));
}
