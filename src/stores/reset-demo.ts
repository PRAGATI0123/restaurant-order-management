import { requirePermission, useAuthStore } from "./auth-store";
import { useCartStore } from "./cart-store";
import { useMenuStore } from "./menu-store";
import { useServiceStore } from "./service-store";
import { useSettingsStore } from "./settings-store";

/**
 * Puts every store back to the sample data: tables, orders, payments, menu,
 * settings and the staff list. Handy before showing the app to someone.
 * Managers only. Whoever is logged in stays logged in (their sample account
 * comes back too, since only sample staff can be logged in after a reset).
 */
export function resetDemoData(): void {
  const me = requirePermission("settings.edit");
  useServiceStore.setState(useServiceStore.getInitialState(), true);
  useMenuStore.setState(useMenuStore.getInitialState(), true);
  useCartStore.setState(useCartStore.getInitialState(), true);
  useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  const sample = useAuthStore.getInitialState().staff;
  useAuthStore.setState({
    staff: sample,
    // Stay logged in if you're one of the sample staff; otherwise log in again.
    currentStaffId: sample.some((s) => s.id === me.id) ? me.id : undefined,
  });
}
