import { create } from "zustand";
import {
  assertCanDeleteCategory,
  moveCategory,
  setDishLinks,
  unlinkEverywhere,
} from "@/domain/menu/catalog-rules";
import { DomainError } from "@/domain/errors";
import { newId } from "@/lib/utils/id";
import {
  sampleAddOns,
  sampleCategories,
  sampleMenuItems,
  sampleModifierGroups,
} from "@/mocks/data/menu";
import type { Id, Paise } from "@/types/common";
import type {
  AddOn,
  MenuCategory,
  MenuItem,
  MenuItemVariant,
  ModifierGroup,
} from "@/types/menu";

/** What the add/edit dish form provides. Sizes, add-ons and options are kept as they are. */
export type MenuItemDetails = Pick<
  MenuItem,
  "name" | "categoryId" | "pricePaise" | "isVeg" | "isAvailable"
>;

/** A size, add-on option or group option as the forms send it: id only if it already existed. */
export type PricedInput = { id?: Id; name: string; pricePaise: Paise };

export type AddOnInput = { name: string; pricePaise: Paise; dishIds: Id[] };

export type OptionGroupInput = {
  name: string;
  required: boolean;
  maxSelect: number;
  options: PricedInput[];
  dishIds: Id[];
};

type MenuState = {
  categories: MenuCategory[];
  items: MenuItem[];
  addOns: AddOn[];
  modifierGroups: ModifierGroup[];

  // dishes
  setAvailability: (itemId: Id, isAvailable: boolean) => void;
  addItem: (details: MenuItemDetails) => MenuItem;
  updateItem: (itemId: Id, details: MenuItemDetails) => void;
  setSizes: (itemId: Id, sizes: PricedInput[]) => void;

  // categories
  addCategory: (name: string) => MenuCategory;
  renameCategory: (categoryId: Id, name: string) => void;
  moveCategory: (categoryId: Id, direction: "up" | "down") => void;
  deleteCategory: (categoryId: Id) => void;

  // shared add-ons and option groups (editingId undefined = create a new one)
  saveAddOn: (input: AddOnInput, editingId?: Id) => AddOn;
  deleteAddOn: (addOnId: Id) => void;
  saveOptionGroup: (input: OptionGroupInput, editingId?: Id) => ModifierGroup;
  deleteOptionGroup: (groupId: Id) => void;
};

/** Gives new rows an id and keeps the ids of rows that already existed. */
function withIds(rows: PricedInput[], prefix: string): MenuItemVariant[] {
  return rows.map((row) => ({
    id: row.id ?? newId(prefix),
    name: row.name,
    pricePaise: row.pricePaise,
  }));
}

/**
 * THE MENU STORE: one shared place for menu data, used by every page.
 *
 * For now it keeps the data in memory, starting from the sample menu, so a
 * page refresh resets it. Step 19 saves it in IndexedDB instead. Pages only
 * call these actions, so they won't need to change when that happens.
 *
 * Every action REPLACES arrays and objects instead of editing them in place.
 * That's how React notices something changed and re-draws the screen.
 * The rules themselves live in domain/menu/catalog-rules.ts (and are tested);
 * the store only applies them.
 */
export const useMenuStore = create<MenuState>()((set, get) => ({
  categories: sampleCategories,
  items: sampleMenuItems,
  addOns: sampleAddOns,
  modifierGroups: sampleModifierGroups,

  // ─── Dishes ────────────────────────────────────────────────────────────────

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
      addOnIds: [],
      modifierGroupIds: [],
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

  setSizes: (itemId, sizes) =>
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== itemId) return item;
        const variants = withIds(sizes, "size");
        // The dish's own price follows its biggest size, so it never looks
        // cheaper than it is anywhere sizes aren't shown.
        const pricePaise =
          variants.length > 0
            ? Math.max(...variants.map((v) => v.pricePaise))
            : item.pricePaise;
        return { ...item, variants, pricePaise };
      }),
    })),

  // ─── Categories ────────────────────────────────────────────────────────────

  addCategory: (name) => {
    const category: MenuCategory = {
      id: newId("cat"),
      name,
      sortOrder: get().categories.length, // goes to the end
    };
    set((state) => ({ categories: [...state.categories, category] }));
    return category;
  },

  renameCategory: (categoryId, name) =>
    set((state) => ({
      categories: state.categories.map((c) => (c.id === categoryId ? { ...c, name } : c)),
    })),

  moveCategory: (categoryId, direction) =>
    set((state) => ({
      categories: moveCategory(state.categories, categoryId, direction),
    })),

  deleteCategory: (categoryId) => {
    const { categories, items } = get();
    const category = categories.find((c) => c.id === categoryId);
    if (!category) throw new DomainError("That category doesn't exist.");
    assertCanDeleteCategory(category, items); // throws a readable error if not empty
    set({
      // Renumber the rest so the order stays 0, 1, 2…
      categories: categories
        .filter((c) => c.id !== categoryId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((c, index) => ({ ...c, sortOrder: index })),
    });
  },

  // ─── Shared add-ons ────────────────────────────────────────────────────────

  saveAddOn: ({ name, pricePaise, dishIds }, editingId) => {
    const addOn: AddOn = { id: editingId ?? newId("add"), name, pricePaise };
    set((state) => ({
      addOns: editingId
        ? state.addOns.map((a) => (a.id === editingId ? addOn : a))
        : [...state.addOns, addOn],
      items: setDishLinks(state.items, "addOnIds", addOn.id, dishIds),
    }));
    return addOn;
  },

  deleteAddOn: (addOnId) =>
    set((state) => ({
      addOns: state.addOns.filter((a) => a.id !== addOnId),
      items: unlinkEverywhere(state.items, "addOnIds", addOnId),
    })),

  // ─── Shared option groups ──────────────────────────────────────────────────

  saveOptionGroup: ({ name, required, maxSelect, options, dishIds }, editingId) => {
    const group: ModifierGroup = {
      id: editingId ?? newId("mod"),
      name,
      minSelect: required ? 1 : 0,
      maxSelect,
      options: withIds(options, "opt"),
    };
    set((state) => ({
      modifierGroups: editingId
        ? state.modifierGroups.map((g) => (g.id === editingId ? group : g))
        : [...state.modifierGroups, group],
      items: setDishLinks(state.items, "modifierGroupIds", group.id, dishIds),
    }));
    return group;
  },

  deleteOptionGroup: (groupId) =>
    set((state) => ({
      modifierGroups: state.modifierGroups.filter((g) => g.id !== groupId),
      items: unlinkEverywhere(state.items, "modifierGroupIds", groupId),
    })),
}));
