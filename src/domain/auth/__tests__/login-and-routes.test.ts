import { describe, expect, it } from "vitest";
import {
  LOCKOUT_MS,
  NO_ATTEMPTS,
  afterWrongPin,
  secondsLocked,
  verifyPin,
} from "@/domain/auth/login";
import { actionForPath, canOpen, homeFor } from "@/domain/auth/routes";
import { removeStaffMember, saveStaffMember } from "@/domain/auth/staff-rules";
import type { Staff } from "@/types/staff";

const staff: Staff[] = [
  { id: "m", name: "Meera", role: "manager", pin: "1234" },
  { id: "w", name: "Sunil", role: "waiter", pin: "3333" },
];

describe("verifyPin", () => {
  it("lets the right person in with their own PIN", () => {
    expect(verifyPin(staff, "w", "3333").name).toBe("Sunil");
  });

  it("refuses another person's PIN without saying whose it is", () => {
    expect(() => verifyPin(staff, "w", "1234")).toThrow("Wrong PIN. Try again.");
  });

  it("refuses a staff member who was removed", () => {
    expect(() => verifyPin(staff, "gone", "1234")).toThrow("doesn't exist");
  });
});

describe("lockout after wrong PINs", () => {
  it("locks for 30 seconds on the 5th wrong PIN in a row", () => {
    let attempts = NO_ATTEMPTS;
    for (let i = 0; i < 4; i++) attempts = afterWrongPin(attempts, 1000);
    expect(attempts).toEqual({ wrong: 4 });
    attempts = afterWrongPin(attempts, 1000);
    expect(attempts).toEqual({ wrong: 0, lockedUntil: 1000 + LOCKOUT_MS });
  });

  it("counts the lock down in whole seconds", () => {
    const locked = { wrong: 0, lockedUntil: 31_000 };
    expect(secondsLocked(locked, 1_000)).toBe(30);
    expect(secondsLocked(locked, 30_500)).toBe(1);
    expect(secondsLocked(locked, 31_000)).toBe(0);
    expect(secondsLocked(NO_ATTEMPTS, 0)).toBe(0);
  });
});

describe("which pages each role may open", () => {
  it("uses the most specific address", () => {
    expect(actionForPath("/tables")).toBe("tables.view");
    expect(actionForPath("/tables/editor")).toBe("floorPlan.edit");
    expect(actionForPath("/orders/order-101")).toBe("orders.view");
    expect(actionForPath("/orders/new")).toBe("order.create");
    expect(actionForPath("/orders/order-102/split")).toBe("order.split");
    expect(actionForPath("/billing/invoice/inv-1")).toBe("billing.view");
  });

  it("keeps each role to its own work", () => {
    expect(canOpen("waiter", "/tables")).toBe(true);
    expect(canOpen("waiter", "/tables/editor")).toBe(false);
    expect(canOpen("waiter", "/billing")).toBe(false);
    expect(canOpen("kitchen", "/kitchen")).toBe(true);
    expect(canOpen("kitchen", "/menu")).toBe(true);
    expect(canOpen("kitchen", "/menu/categories")).toBe(false);
    expect(canOpen("cashier", "/billing/transactions")).toBe(true);
    expect(canOpen("cashier", "/settings")).toBe(false);
    expect(canOpen("manager", "/settings")).toBe(true);
  });

  it("sends each role to its most useful page after login", () => {
    expect(homeFor("manager")).toBe("/dashboard");
    expect(homeFor("cashier")).toBe("/dashboard");
    expect(homeFor("waiter")).toBe("/tables");
    expect(homeFor("kitchen")).toBe("/kitchen");
  });
});

describe("staff rules", () => {
  it("adds and edits staff", () => {
    const added = saveStaffMember(staff, {
      id: "c",
      name: "Ravi",
      role: "cashier",
      pin: "2222",
    });
    expect(added).toHaveLength(3);
    const edited = saveStaffMember(added, {
      id: "c",
      name: "Ravi K",
      role: "cashier",
      pin: "2468",
    });
    expect(edited.find((s) => s.id === "c")?.name).toBe("Ravi K");
  });

  it("always keeps at least one manager", () => {
    expect(() =>
      saveStaffMember(staff, { id: "m", name: "Meera", role: "waiter", pin: "1234" }),
    ).toThrow("Keep at least one manager");
    expect(() => removeStaffMember(staff, "m", "w")).toThrow("Keep at least one manager");
  });

  it("won't let you remove yourself", () => {
    expect(() => removeStaffMember(staff, "w", "w")).toThrow("can't remove yourself");
    expect(removeStaffMember(staff, "w", "m")).toEqual([staff[0]]);
  });
});
