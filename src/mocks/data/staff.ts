import type { Staff } from "@/types/staff";

/**
 * THE ONE ACCOUNT that can log in: the owner, who runs the whole restaurant
 * (manager role, so every page and action is open). The PIN is a DEMO PIN,
 * shown on the login screen so anyone trying the app can get in.
 */
export const OWNER_ACCOUNT: Staff = {
  id: "staff-owner",
  name: "Pragati Gautam",
  role: "manager",
  pin: "1234",
};
