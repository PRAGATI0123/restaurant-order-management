import type { Staff } from "@/types/staff";

/**
 * SAMPLE STAFF, one per role. The PINs are DEMO PINs, shown on the login
 * screen so anyone trying the app can log in as each role. A manager can
 * change them (and add staff) in Settings.
 */
export const sampleStaff: Staff[] = [
  { id: "staff-manager", name: "Meera Kapoor", role: "manager", pin: "1234" },
  { id: "staff-cashier", name: "Ravi Kumar", role: "cashier", pin: "2222" },
  { id: "staff-waiter", name: "Sunil Das", role: "waiter", pin: "3333" },
  { id: "staff-kitchen", name: "Imran Sheikh", role: "kitchen", pin: "4444" },
];
