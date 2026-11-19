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
  /** Sizes belong to this one dish (a Half Paneer Tikka is not a Half Lassi). */
  variants: MenuItemVariant[];
  /**
   * Add-ons and option groups are SHARED: one "Spice level" group is used by
   * many dishes. The dish stores only their ids, so renaming "Hot" to
   * "Extra hot" once updates every dish that uses it.
   */
  addOnIds: Id[];
  modifierGroupIds: Id[];
  /**
   * A photo of the dish ("/images/menu/dal-makhani.jpg"). Only the sample
   * dishes have one; without it the card shows the dish's initials.
   */
  imageUrl?: string;
};
