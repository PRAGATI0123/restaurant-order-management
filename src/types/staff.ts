import type { Id } from "./common";

export type Role = "cashier" | "waiter" | "kitchen" | "manager";

export type Staff = {
  id: Id;
  name: string;
  role: Role;
  /**
   * 4-digit login PIN. Stored as plain text because this is an offline demo
   * with no real accounts; a real system would store only a hash.
   */
  pin: string;
};
