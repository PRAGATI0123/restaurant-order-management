import { create } from "zustand";
import { newId } from "@/lib/utils/id";
import { sampleCategories, sampleMenuItems } from "@/mocks/data/menu";
import type { Id } from "@/types/common";
import type { MenuCategory, MenuItem } from "@/types/menu";

/** What the add/edit form provides. Sizes, add-ons and options are kept as they are. */
export type MenuItemDetails = Pick<
  MenuItem,
  "name" | "categoryId" | "pricePaise" | "isVeg" | "isAvailable"
>;

type MenuState = {
  categories: MenuCategory[];
  items: MenuItem[];
  setAvailability: (itemId: Id, isAvailable: boolean) => void;
  addItem: (details: MenuItemDetails) => MenuItem;
  updateItem: (itemId: Id, details: MenuItemDetails) => void;
};

/**
 * THE MENU STORE: one shared place for menu data, used by every page.
 *
 * For now it keeps the data in memory, starting from the sample menu, so a
 * page refresh resets it. Step 19 saves it in IndexedDB instead. Pages only
 * call these actions, so they won't need to change when that happens.
 *
 * Every action REPLACES arrays and objects instead of editing them in place.
 * That's how React notices something changed and re-draws the screen.
 */
export const useMenuStore = create<MenuState>()((set) => ({
  categories: sampleCategories,
  items: sampleMenuItems,

  setAvailability: (itemId, isAvailable) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, isAvailable } : item,
      ),
    })),

  addItem: (details) => {
    const item: MenuItem = {
      id: newId("item"),
      variants: [],
      addOns: [],
      modifierGroups: [],
      ...details,
    };
    set((state) => ({ items: [...state.items, item] }));
    return item;
  },

  updateItem: (itemId, details) =>
    set((state) => ({
      items: state.items.map((item) =>
        item.id === itemId ? { ...item, ...details } : item,
      ),
    })),
}));
