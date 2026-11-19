import { requirePermission } from "./auth-store";
import { useCartStore } from "./cart-store";
import { useMenuStore } from "./menu-store";
import { useServiceStore } from "./service-store";
import { useSettingsStore } from "./settings-store";

/**
 * Puts every store back to the sample data: tables, orders, payments, menu
 * and settings. Handy before showing the app to someone. Managers only.
 * You stay logged in.
 */
export function resetDemoData(): void {
  requirePermission("settings.edit");
  useServiceStore.setState(useServiceStore.getInitialState(), true);
  useMenuStore.setState(useMenuStore.getInitialState(), true);
  useCartStore.setState(useCartStore.getInitialState(), true);
  useSettingsStore.setState(useSettingsStore.getInitialState(), true);
}
