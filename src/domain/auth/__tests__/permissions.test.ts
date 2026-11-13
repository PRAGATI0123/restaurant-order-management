import { describe, expect, it } from "vitest";
import { ACTIONS, actionsFor, assertCan, can } from "@/domain/auth/permissions";
import type { Role } from "@/types/staff";

const ROLES: Role[] = ["cashier", "waiter", "kitchen", "manager"];

describe("permissions", () => {
  it("the manager can do everything", () => {
    for (const action of ACTIONS) {
      expect(can("manager", action)).toBe(true);
    }
  });

  it.each([
    ["waiter", "order.create", true],
    ["waiter", "table.transfer", true],
    ["waiter", "payment.take", false],
    ["waiter", "order.cancel", false],
    ["cashier", "payment.take", true],
    ["cashier", "bill.discount", true],
    ["cashier", "floorPlan.edit", false],
    ["kitchen", "kitchen.updateStatus", true],
    ["kitchen", "menu.toggleAvailability", true],
    ["kitchen", "menu.edit", false],
    ["kitchen", "payment.take", false],
  ] as const)("%s → %s: %s", (role, action, expected) => {
    expect(can(role, action)).toBe(expected);
  });

  it("only the manager can edit the menu, floor plan, settings and see reports", () => {
    for (const action of [
      "menu.edit",
      "floorPlan.edit",
      "settings.edit",
      "reports.view",
    ] as const) {
      expect(ROLES.filter((role) => can(role, action))).toEqual(["manager"]);
    }
  });

  it("every role can open at least one page", () => {
    for (const role of ROLES) {
      expect(actionsFor(role).some((action) => action.endsWith(".view"))).toBe(true);
    }
  });

  it("explains a refusal in plain words", () => {
    expect(() => assertCan("waiter", "payment.take")).toThrow(
      "A waiter can't take payments. Ask a manager.",
    );
    expect(() => assertCan("kitchen", "menu.edit")).toThrow(
      "Kitchen staff can't edit the menu. Ask a manager.",
    );
    expect(() => assertCan("manager", "settings.edit")).not.toThrow();
  });
});
