import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isOrderOpen } from "@/domain/orders/order-state-machine";
import { SAMPLE_SERVICE_SOLD_OUT, sampleService } from "@/mocks/data/orders";
import { useCartStore } from "@/stores/cart-store";
import { useMenuStore } from "@/stores/menu-store";
import { loadSampleService, resetDemoData } from "@/stores/reset-demo";
import { useServiceStore } from "@/stores/service-store";
import { useSettingsStore } from "@/stores/settings-store";
import { loginAs, resetAuth } from "./login-as";

/**
 * A fresh install opens on an empty day; the sample service is loaded only
 * when a manager asks for it, and is always timed from "now".
 */

const service = () => useServiceStore.getState();
const minutesBefore = (now: number, iso: string) => (now - Date.parse(iso)) / 60_000;

beforeEach(() => {
  useServiceStore.setState(useServiceStore.getInitialState(), true);
  useMenuStore.setState(useMenuStore.getInitialState(), true);
  useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  useCartStore.setState(useCartStore.getInitialState(), true);
  resetAuth();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("a fresh install", () => {
  it("opens on an empty day: no orders, bills or payments, and every table free", () => {
    expect(service().orders).toEqual([]);
    expect(service().payments).toEqual([]);
    expect(service().invoices).toEqual([]);
    expect(service().tables.length).toBeGreaterThan(0);
    expect(service().tables.every((t) => t.status === "available")).toBe(true);
  });

  it("numbers the first order of the day #101", () => {
    loginAs("waiter");
    const dish = sampleService().orders[0]!.items[0]!;
    const placed = service().placeOrder({
      type: "takeaway",
      customerName: "First guest",
      items: [{ ...dish, id: "line-1" }],
    });
    expect(placed.number).toBe(101);
  });
});

describe("loading the sample service", () => {
  it("is for managers only, and changes nothing when refused", () => {
    loginAs("waiter");
    const before = service();
    expect(() => loadSampleService()).toThrow();
    expect(service()).toBe(before);
  });

  it("fills tables, kitchen tickets and today's bills", () => {
    loginAs("manager");
    loadSampleService();

    const open = service().orders.filter((o) => isOrderOpen(o.status));
    expect(open.length).toBeGreaterThan(0);
    expect(service().invoices.length).toBeGreaterThan(0);
    expect(service().payments.length).toBeGreaterThanOrEqual(service().invoices.length);
    // Every open dine-in order sits at an occupied table.
    for (const order of open.filter((o) => o.type === "dine-in")) {
      for (const tableId of order.tableIds) {
        expect(service().tables.find((t) => t.id === tableId)?.status).toBe("occupied");
      }
    }
  });

  it("is timed from now, even on a later day (no day-old tickets)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-21T19:30:00+05:30"));
    loginAs("manager");
    loadSampleService();

    const now = Date.now();
    const open = service().orders.filter((o) => isOrderOpen(o.status));
    // Tickets in progress were placed within the last hour…
    for (const order of open) {
      expect(minutesBefore(now, order.createdAt)).toBeGreaterThanOrEqual(0);
      expect(minutesBefore(now, order.createdAt)).toBeLessThan(60);
    }
    // …and every bill was paid earlier today, never in the future.
    for (const invoice of service().invoices) {
      expect(minutesBefore(now, invoice.issuedAt)).toBeGreaterThan(0);
      expect(new Date(invoice.issuedAt).toDateString()).toBe(
        new Date(now).toDateString(),
      );
    }
  });

  it("keeps today's bills on today, even just after midnight", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 10, 21, 0, 10)); // 00:10 on this machine's clock
    loginAs("manager");
    loadSampleService();

    const now = new Date();
    expect(service().invoices.length).toBe(6);
    for (const invoice of service().invoices) {
      const paidAt = new Date(invoice.issuedAt);
      expect(paidAt.toDateString()).toBe(now.toDateString());
      expect(paidAt.getTime()).toBeLessThanOrEqual(now.getTime());
    }
    // The payments are inside "today" too, so the dashboard counts them.
    for (const payment of service().payments) {
      expect(new Date(payment.createdAt).toDateString()).toBe(now.toDateString());
    }
  });

  it("marks the two dishes that ran out, and keeps the manager's settings", () => {
    loginAs("manager");
    useSettingsStore.setState({ taxRateBasisPoints: 1200 });
    expect(useMenuStore.getState().items.every((i) => i.isAvailable)).toBe(true);
    loadSampleService();
    expect(useSettingsStore.getState().taxRateBasisPoints).toBe(1200);
    const soldOut = useMenuStore
      .getState()
      .items.filter((i) => !i.isAvailable)
      .map((i) => i.id);
    expect(soldOut.sort()).toEqual([...SAMPLE_SERVICE_SOLD_OUT].sort());
  });
});

describe("starting fresh", () => {
  it("clears the sample service back to an empty day", () => {
    loginAs("manager");
    loadSampleService();
    resetDemoData();
    expect(service().orders).toEqual([]);
    expect(service().invoices).toEqual([]);
    expect(service().tables.every((t) => t.status === "available")).toBe(true);
  });

  it("is for managers only", () => {
    loginAs("cashier");
    expect(() => resetDemoData()).toThrow();
  });
});
