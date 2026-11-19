import { SAMPLE_SERVICE_SOLD_OUT, sampleService } from "@/mocks/data/orders";
import { requirePermission } from "./auth-store";
import { useCartStore } from "./cart-store";
import { useMenuStore } from "./menu-store";
import { useServiceStore } from "./service-store";
import { useSettingsStore } from "./settings-store";

/**
 * A fresh start: every store goes back to how the app first opens. The sample
 * menu, floor plan and settings; no orders, payments or invoices; every table
 * free. Managers only. You stay logged in.
 */
export function resetDemoData(): void {
  requirePermission("settings.edit");
  useServiceStore.setState(useServiceStore.getInitialState(), true);
  useMenuStore.setState(useMenuStore.getInitialState(), true);
  useCartStore.setState(useCartStore.getInitialState(), true);
  useSettingsStore.setState(useSettingsStore.getInitialState(), true);
}

/**
 * Fills today with the sample service, for showing the app to someone: busy
 * tables, tickets in the kitchen and bills paid earlier today, all timed from
 * now, and two dishes that ran out. It replaces today's tables, orders,
 * payments and invoices; the rest of the menu and the settings stay as they
 * are. Managers only.
 */
export function loadSampleService(): void {
  requirePermission("settings.edit");
  useServiceStore.setState(sampleService());
  useMenuStore.setState((menu) => ({
    items: menu.items.map((item) =>
      SAMPLE_SERVICE_SOLD_OUT.includes(item.id) ? { ...item, isAvailable: false } : item,
    ),
  }));
  useCartStore.setState(useCartStore.getInitialState(), true);
}
