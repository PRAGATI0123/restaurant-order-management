import type { Staff } from "@/types/staff";

/**
 * The one DEMO PIN every user logs in with. It's shown on the login screen,
 * so anyone trying the app can log in as each role and see what it can do.
 */
export const SHARED_PIN = "1234";

/** The users on the login screen: one per role. Pragati Gautam runs the restaurant. */
export const sampleStaff: Staff[] = [
  { id: "staff-manager", name: "Pragati Gautam", role: "manager", pin: SHARED_PIN },
  { id: "staff-cashier", name: "Arushi Sharma", role: "cashier", pin: SHARED_PIN },
  { id: "staff-waiter", name: "Vikram Joshi", role: "waiter", pin: SHARED_PIN },
  { id: "staff-kitchen", name: "Farhan Qureshi", role: "kitchen", pin: SHARED_PIN },
];
