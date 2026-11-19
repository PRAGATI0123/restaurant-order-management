import { beforeEach, describe, expect, it } from "vitest";
import { useAuthStore } from "@/stores/auth-store";
import { useMenuStore } from "@/stores/menu-store";
import { useServiceStore } from "@/stores/service-store";
import { useSettingsStore } from "@/stores/settings-store";
import { loginAs, resetAuth } from "./login-as";

const service = () => useServiceStore.getState();
const order = (id: string) => service().orders.find((o) => o.id === id)!;

beforeEach(() => {
  useServiceStore.setState(useServiceStore.getInitialState(), true);
  useMenuStore.setState(useMenuStore.getInitialState(), true);
  useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  resetAuth();
});

describe("logging in", () => {
  it("has one user per role, all with the same PIN 1234", () => {
    expect(useAuthStore.getState().staff.map((s) => [s.name, s.role, s.pin])).toEqual([
      ["Pragati Gautam", "manager", "1234"],
      ["Ananya Iyer", "cashier", "1234"],
      ["Vikram Joshi", "waiter", "1234"],
      ["Farhan Qureshi", "kitchen", "1234"],
    ]);
  });

  it("logs a user in with the PIN, and out again", () => {
    const waiter = useAuthStore.getState().login("staff-waiter", "1234");
    expect(waiter).toMatchObject({ name: "Vikram Joshi", role: "waiter" });
    expect(useAuthStore.getState().currentStaffId).toBe("staff-waiter");
    useAuthStore.getState().logout();
    expect(useAuthStore.getState().currentStaffId).toBeUndefined();
  });

  it("stays logged out on a wrong PIN", () => {
    expect(() => useAuthStore.getState().login("staff-manager", "0000")).toThrow(
      "Wrong PIN",
    );
    expect(useAuthStore.getState().currentStaffId).toBeUndefined();
  });

  it("does nothing for someone who isn't logged in", () => {
    expect(() => service().setTableStatus("t6", "available")).toThrow("Log in first.");
  });
});

describe("each role can only do its own work (checked in the store, not just the screen)", () => {
  it("a waiter serves food but can't take money or cancel", () => {
    loginAs("waiter");
    service().setOrderStatus("order-105", "served");
    expect(order("order-105").status).toBe("served");
    expect(() =>
      service().settleOrder("order-105", [{ method: "cash", amountPaise: 1 }]),
    ).toThrow("A waiter can't take payments. Ask a manager.");
    expect(() => service().cancelOrder("order-101", "Guest left")).toThrow(
      "A waiter can't cancel orders or items.",
    );
  });

  it("the kitchen cooks but can't serve or move tables", () => {
    loginAs("kitchen");
    service().setOrderStatus("order-103", "preparing");
    expect(order("order-103").status).toBe("preparing");
    expect(() => service().setOrderStatus("order-105", "served")).toThrow(
      "Kitchen staff can't mark orders as served.",
    );
    expect(() => service().moveOrderToTable("order-101", "t5")).toThrow(
      "Kitchen staff can't move orders between tables.",
    );
  });

  it("the kitchen marks dishes sold out but can't edit the menu", () => {
    loginAs("kitchen");
    useMenuStore.getState().setAvailability("item-garlic-naan", false);
    expect(
      useMenuStore.getState().items.find((i) => i.id === "item-garlic-naan")?.isAvailable,
    ).toBe(false);
    expect(() => useMenuStore.getState().addCategory("Specials")).toThrow(
      "Kitchen staff can't edit the menu.",
    );
  });

  it("a cashier takes payment and gives discounts, but can't edit the floor plan", () => {
    loginAs("cashier");
    service().setDiscount("order-102", { kind: "percent", basisPoints: 500 });
    expect(order("order-102").discount).toBeDefined();
    expect(() => service().saveLayout([])).toThrow(
      "A cashier can't edit the floor plan.",
    );
  });

  it("records WHO did each step in the order's timeline", () => {
    loginAs("kitchen");
    service().setOrderStatus("order-103", "preparing");
    expect(order("order-103").statusHistory.at(-1)?.by).toBe("staff-kitchen");
  });

  it("only a manager changes settings", () => {
    loginAs("cashier");
    expect(() => useSettingsStore.getState().setTaxRate(1800)).toThrow(
      "A cashier can't change settings.",
    );
    loginAs("manager");
    useSettingsStore.getState().setTaxRate(1800);
    expect(useSettingsStore.getState().taxRateBasisPoints).toBe(1800);
  });
});

describe("settings take effect", () => {
  it("bills use the GST rate from Settings; the invoice keeps it", () => {
    loginAs("manager");
    useSettingsStore.getState().setTaxRate(1800);
    const invoice = service().settleOrder("order-102", [
      // ₹1,230.00 + 18% = ₹1,451.40
      { method: "card", amountPaise: 145140 },
    ]);
    expect(invoice).toMatchObject({ taxRateBasisPoints: 1800, totalPaise: 145140 });
  });

  it("refuses a GST rate that isn't a real slab", () => {
    loginAs("manager");
    expect(() => useSettingsStore.getState().setTaxRate(700)).toThrow(
      "Choose one of the GST rates",
    );
  });
});

describe("logging out on purpose", () => {
  it("is remembered until the next login, so the next person starts fresh", () => {
    const auth = () => useAuthStore.getState();
    auth().login("staff-waiter", "1234");
    auth().logout();
    expect(auth().loggedOutByUser).toBe(true);
    auth().login("staff-cashier", "1234");
    expect(auth().loggedOutByUser).toBe(false);
  });
});
