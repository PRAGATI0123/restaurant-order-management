import type { Id } from "./common";

export type TableStatus = "available" | "occupied" | "reserved" | "cleaning";

/** Named RestaurantTable because "Table" clashes with HTML table words. */
export type RestaurantTable = {
  id: Id;
  name: string; // "T4"
  seats: number;
  status: TableStatus;
  /** Position on the floor plan, in grid cells from the top-left. */
  x: number;
  y: number;
  /** Set when this table is merged into another; that table holds the order. */
  mergedIntoId?: Id;
};
