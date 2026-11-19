import { create } from "zustand";
import { DEFAULT_TAX_RATE_BASIS_POINTS, RESTAURANT_DETAILS } from "@/config/constants";
import { DEFAULT_KITCHEN_TIMING, type KitchenTiming } from "@/domain/kitchen/delay-rules";
import { DomainError } from "@/domain/errors";
import { GST_RATES_BASIS_POINTS } from "@/lib/validation/settings";
import type { RestaurantDetails, RestaurantSettings } from "@/types/settings";
import { requirePermission } from "./auth-store";

type SettingsState = RestaurantSettings & {
  updateRestaurant: (details: RestaurantDetails) => void;
  setTaxRate: (basisPoints: number) => void;
  setKitchenTiming: (timing: KitchenTiming) => void;
};

/**
 * THE SETTINGS STORE: what a manager can change for the whole restaurant.
 *  - Restaurant details → the top of every NEW invoice.
 *  - GST rate → every bill not paid yet. Paid invoices keep the rate they
 *    were paid with (they're frozen), so history never changes.
 *  - Kitchen timing → when tickets turn amber and red.
 * Forms check the values first (lib/validation/settings.ts); the store checks
 * that a manager is the one changing them.
 */
export const useSettingsStore = create<SettingsState>()((set) => ({
  restaurant: RESTAURANT_DETAILS,
  taxRateBasisPoints: DEFAULT_TAX_RATE_BASIS_POINTS,
  kitchenTiming: DEFAULT_KITCHEN_TIMING,

  updateRestaurant: (details) => {
    requirePermission("settings.edit");
    set({ restaurant: details });
  },

  setTaxRate: (basisPoints) => {
    requirePermission("settings.edit");
    if (!(GST_RATES_BASIS_POINTS as readonly number[]).includes(basisPoints)) {
      throw new DomainError("Choose one of the GST rates: 0%, 5%, 12% or 18%.");
    }
    set({ taxRateBasisPoints: basisPoints });
  },

  setKitchenTiming: (timing) => {
    requirePermission("settings.edit");
    if (timing.lateAfterMinutes <= timing.warningAfterMinutes) {
      throw new DomainError("'Late' must come after 'Getting late'.");
    }
    set({ kitchenTiming: timing });
  },
}));

/** The GST rate for bills not paid yet. Screens re-draw when a manager changes it. */
export const useTaxRate = () => useSettingsStore((s) => s.taxRateBasisPoints);
