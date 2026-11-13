import type { Id, Paise } from "./common";

export type MenuCategory = {
  id: Id;
  name: string; // "Starters"
  sortOrder: number; // position on the menu, 0 = first
};

/** A size or version of an item. Pick exactly one: "Half" ₹180 or "Full" ₹320. */
export type MenuItemVariant = {
  id: Id;
  name: string;
  pricePaise: Paise; // replaces the item's base price
};

/** An extra that costs more: "Extra cheese" +₹40. Pick any number. */
export type AddOn = {
  id: Id;
  name: string;
  pricePaise: Paise; // added on top of the item price
};

/** One choice inside a modifier group: "Hot" in "Spice level". Usually free. */
export type ModifierOption = {
  id: Id;
  name: string;
  pricePaise: Paise;
};

/** A question the kitchen needs answered: "Spice level", choose 1. */
export type ModifierGroup = {
  id: Id;
  name: string;
  minSelect: number; // 1 = required
  maxSelect: number; // 1 = choose one, 3 = up to three
  options: ModifierOption[];
};

export type MenuItem = {
  id: Id;
  name: string;
  categoryId: Id;
  pricePaise: Paise; // used when the item has no variants
  isVeg: boolean;
  isAvailable: boolean; // false = sold out today
  variants: MenuItemVariant[];
  addOns: AddOn[];
  modifierGroups: ModifierGroup[];
};
