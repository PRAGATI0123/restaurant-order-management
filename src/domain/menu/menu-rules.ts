import type { Id, Paise } from "@/types/common";
import type { MenuItem } from "@/types/menu";

/**
 * The lowest price a guest can pay for this item: its cheapest size if it
 * has sizes, otherwise its normal price. Shown as "from ₹180" on the menu.
 */
export function startingPrice(item: MenuItem): Paise {
  if (item.variants.length === 0) return item.pricePaise;
  return Math.min(...item.variants.map((variant) => variant.pricePaise));
}

/** True if the guest has something to choose (size, add-ons or options). */
export function hasChoices(item: MenuItem): boolean {
  return (
    item.variants.length > 0 || item.addOns.length > 0 || item.modifierGroups.length > 0
  );
}

export type DietFilter = "all" | "veg" | "non-veg";
export type AvailabilityFilter = "all" | "available" | "sold-out";

export type MenuFilters = {
  query: string; // what's typed in the search box
  categoryId: Id | "all";
  diet: DietFilter;
  availability: AvailabilityFilter;
};

export const NO_MENU_FILTERS: MenuFilters = {
  query: "",
  categoryId: "all",
  diet: "all",
  availability: "all",
};

/** Lowercase, no accents, single spaces: "  Pâneer  TIKKA " → "paneer tikka". */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * The items that match every filter at once. Search matches each typed word
 * anywhere in the name, in any order: "tikka pan" finds "Paneer Tikka".
 */
export function filterMenuItems(items: MenuItem[], filters: MenuFilters): MenuItem[] {
  const words = normalize(filters.query).split(" ").filter(Boolean);

  return items.filter((item) => {
    if (filters.categoryId !== "all" && item.categoryId !== filters.categoryId)
      return false;
    if (filters.diet === "veg" && !item.isVeg) return false;
    if (filters.diet === "non-veg" && item.isVeg) return false;
    if (filters.availability === "available" && !item.isAvailable) return false;
    if (filters.availability === "sold-out" && item.isAvailable) return false;
    const name = normalize(item.name);
    return words.every((word) => name.includes(word));
  });
}

/** Number of items in each category, for the counts on the category tabs. */
export function countByCategory(items: MenuItem[]): Record<Id, number> {
  const counts: Record<Id, number> = {};
  for (const item of items) {
    counts[item.categoryId] = (counts[item.categoryId] ?? 0) + 1;
  }
  return counts;
}
