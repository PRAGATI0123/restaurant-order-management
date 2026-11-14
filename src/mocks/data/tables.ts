import type { RestaurantTable } from "@/types/table";

/**
 * SAMPLE FLOOR PLAN on the 12 × 8 grid (see domain/tables/layout.ts).
 * x, y = top-left cell. 1–4 seats take 2×2 cells, 5–6 seats 3×2, 7+ seats 4×2.
 *
 *   row 0  T1(2)    T2(2)    T3(4)    T4(4)
 *   row 3  T5(4)    T6(4)    T7(6)       T8(4)
 *   row 6  T9(8)           T10(4)   T11(4)
 */
export const sampleTables: RestaurantTable[] = [
  { id: "t1", name: "T1", seats: 2, shape: "round", status: "available", x: 0, y: 0 },
  { id: "t2", name: "T2", seats: 2, shape: "round", status: "occupied", x: 3, y: 0 },
  { id: "t3", name: "T3", seats: 4, shape: "square", status: "reserved", x: 6, y: 0 },
  { id: "t4", name: "T4", seats: 4, shape: "square", status: "occupied", x: 9, y: 0 },
  { id: "t5", name: "T5", seats: 4, shape: "square", status: "available", x: 0, y: 3 },
  { id: "t6", name: "T6", seats: 4, shape: "round", status: "cleaning", x: 3, y: 3 },
  { id: "t7", name: "T7", seats: 6, shape: "square", status: "available", x: 6, y: 3 },
  { id: "t8", name: "T8", seats: 4, shape: "square", status: "occupied", x: 10, y: 3 },
  { id: "t9", name: "T9", seats: 8, shape: "square", status: "available", x: 0, y: 6 },
  { id: "t10", name: "T10", seats: 4, shape: "round", status: "available", x: 5, y: 6 },
  { id: "t11", name: "T11", seats: 4, shape: "square", status: "available", x: 8, y: 6 },
];
