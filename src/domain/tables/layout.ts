import type { Id } from "@/types/common";
import type { RestaurantTable } from "@/types/table";
import { DomainError } from "../errors";

/**
 * THE FLOOR PLAN GRID
 *
 * The room is a grid of 12 columns × 8 rows. Every table covers a rectangle of
 * cells ("footprint") that depends on its seats. Positions (x, y) are the
 * table's top-left cell, counted from 0.
 *
 *  1–4 seats → 2×2 cells   5–6 seats → 3×2   7+ seats → 4×2
 *
 * Using whole cells (not pixels) means the plan looks the same on a phone and
 * on a big screen, and two tables can never half-overlap.
 */
export const FLOOR_COLUMNS = 12;
export const FLOOR_ROWS = 8;

export type Footprint = { width: number; height: number };

export function footprint(seats: number): Footprint {
  if (seats <= 4) return { width: 2, height: 2 };
  if (seats <= 6) return { width: 3, height: 2 };
  return { width: 4, height: 2 };
}

type Placed = Pick<RestaurantTable, "id" | "seats" | "x" | "y">;

/** True if two placed tables share at least one cell. */
function overlaps(a: Placed, b: Placed): boolean {
  const fa = footprint(a.seats);
  const fb = footprint(b.seats);
  return (
    a.x < b.x + fb.width &&
    b.x < a.x + fa.width &&
    a.y < b.y + fb.height &&
    b.y < a.y + fa.height
  );
}

function insideFloor(table: Placed): boolean {
  const { width, height } = footprint(table.seats);
  return (
    table.x >= 0 &&
    table.y >= 0 &&
    table.x + width <= FLOOR_COLUMNS &&
    table.y + height <= FLOOR_ROWS
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

/** The first free spot for a table with this many seats, scanning row by row. */
export function findFreeSpot(
  tables: Placed[],
  seats: number,
): { x: number; y: number } | undefined {
  for (let y = 0; y < FLOOR_ROWS; y++) {
    for (let x = 0; x < FLOOR_COLUMNS; x++) {
      if (canPlace(tables, { id: "__new__", seats, x, y })) return { x, y };
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
