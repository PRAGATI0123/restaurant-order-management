import type { RestaurantTable } from "@/types/table";

/**
 * SAMPLE FLOOR PLAN on the 12 × 8 grid (see domain/tables/layout.ts).
 * Every table is the same size (2 × 2 cells); x, y = top-left cell.
 * Laid out in three neat rows with a one-cell gap between tables:
 *
 *   row 0   T1   T2   T3   T4
 *   row 3   T5   T6   T7   T8
 *   row 6   T9   T10  T11
 *
 * Every table starts free: the app opens on a fresh day. The busy floor of
 * the sample service (Settings → Load sample service) is in ./orders.ts.
 */
export const sampleTables: RestaurantTable[] = [
  { id: "t1", name: "T1", seats: 2, status: "available", x: 0, y: 0 },
  { id: "t2", name: "T2", seats: 2, status: "available", x: 3, y: 0 },
  { id: "t3", name: "T3", seats: 4, status: "available", x: 6, y: 0 },
  { id: "t4", name: "T4", seats: 4, status: "available", x: 9, y: 0 },
  { id: "t5", name: "T5", seats: 4, status: "available", x: 0, y: 3 },
  { id: "t6", name: "T6", seats: 4, status: "available", x: 3, y: 3 },
  { id: "t7", name: "T7", seats: 6, status: "available", x: 6, y: 3 },
  { id: "t8", name: "T8", seats: 4, status: "available", x: 9, y: 3 },
  { id: "t9", name: "T9", seats: 8, status: "available", x: 0, y: 6 },
  { id: "t10", name: "T10", seats: 4, status: "available", x: 3, y: 6 },
  { id: "t11", name: "T11", seats: 4, status: "available", x: 6, y: 6 },
];
