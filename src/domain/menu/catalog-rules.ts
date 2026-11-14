import type { Id } from "@/types/common";
import type { MenuCategory, MenuItem } from "@/types/menu";
import { DomainError } from "../errors";

/**
 * RULES FOR CATEGORIES AND SHARED OPTIONS
 * Pure functions: they take the current lists and return new ones.
 */

// ─── Categories ──────────────────────────────────────────────────────────────

/** Categories in menu order (sortOrder 0 first). */
export function sortCategories(categories: MenuCategory[]): MenuCategory[] {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Moves one category up or down by one place, then renumbers every category
 * 0, 1, 2… so the order never has gaps or ties.
 * Moving the first one "up" (or the last one "down") changes nothing.
 */
export function moveCategory(
  categories: MenuCategory[],
  categoryId: Id,
  direction: "up" | "down",
): MenuCategory[] {
  const ordered = sortCategories(categories);
  const from = ordered.findIndex((c) => c.id === categoryId);
  if (from === -1) throw new DomainError("That category doesn't exist.");

  const to = direction === "up" ? from - 1 : from + 1;
  if (to >= 0 && to < ordered.length) {
    const [moved] = ordered.splice(from, 1);
    if (moved) ordered.splice(to, 0, moved);
  }
  return ordered.map((category, index) => ({ ...category, sortOrder: index }));
}

/**
 * A category can only be deleted when it's empty. Deleting one that still has
 * dishes would leave those dishes with nowhere to show on the menu.
 */
export function assertCanDeleteCategory(category: MenuCategory, items: MenuItem[]): void {
  const count = items.filter((item) => item.categoryId === category.id).length;
  if (count > 0) {
    throw new DomainError(
      `${category.name} still has ${count} ${count === 1 ? "dish" : "dishes"}. Move or delete ${count === 1 ? "it" : "them"} first.`,
    );
  }
}

// ─── Shared add-ons and option groups ────────────────────────────────────────

/** Which list on a dish holds the link: its add-ons or its option groups. */
export type LinkField = "addOnIds" | "modifierGroupIds";

/** The dishes that use this add-on / option group. */
export function dishesUsing(
  items: MenuItem[],
  field: LinkField,
  sharedId: Id,
): MenuItem[] {
  return items.filter((item) => item[field].includes(sharedId));
}

/**
 * Sets exactly which dishes use an add-on or option group:
 * dishes in `dishIds` get the link (once), every other dish loses it.
 * Dishes that don't change are returned as the very same objects, so React
 * only redraws the cards that really changed.
 */
export function setDishLinks(
  items: MenuItem[],
  field: LinkField,
  sharedId: Id,
  dishIds: Id[],
): MenuItem[] {
  const wanted = new Set(dishIds);
  return items.map((item) => {
    const has = item[field].includes(sharedId);
    const should = wanted.has(item.id);
    if (has === should) return item;
    return {
      ...item,
      [field]: should
        ? [...item[field], sharedId]
        : item[field].filter((id) => id !== sharedId),
    };
  });
}

/** Removes an add-on / option group from every dish (used when deleting it). */
export function unlinkEverywhere(
  items: MenuItem[],
  field: LinkField,
  sharedId: Id,
): MenuItem[] {
  return setDishLinks(items, field, sharedId, []);
}
