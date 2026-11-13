import { describe, expect, it } from "vitest";
import {
  NO_MENU_FILTERS,
  countByCategory,
  filterMenuItems,
  hasChoices,
  startingPrice,
} from "@/domain/menu/menu-rules";
import { sampleMenuItems } from "@/mocks/data/menu";
import type { MenuItem } from "@/types/menu";

function menuItem(fields: Partial<MenuItem> & Pick<MenuItem, "name">): MenuItem {
  return {
    id: fields.name,
    categoryId: "cat-mains",
    pricePaise: 10000,
    isVeg: true,
    isAvailable: true,
    variants: [],
    addOns: [],
    modifierGroups: [],
    ...fields,
  };
}

const paneer = menuItem({ name: "Paneer Tikka", categoryId: "cat-starters" });
const chicken = menuItem({ name: "Butter Chicken", isVeg: false });
const naan = menuItem({
  name: "Garlic Naan",
  categoryId: "cat-breads",
  isAvailable: false,
});
const items = [paneer, chicken, naan];

describe("startingPrice", () => {
  it("is the normal price when there are no sizes", () => {
    expect(startingPrice(menuItem({ name: "Lassi", pricePaise: 12000 }))).toBe(12000);
  });

  it("is the cheapest size when there are sizes", () => {
    const withSizes = menuItem({
      name: "Biryani",
      pricePaise: 38000,
      variants: [
        { id: "full", name: "Full", pricePaise: 38000 },
        { id: "half", name: "Half", pricePaise: 24000 },
      ],
    });
    expect(startingPrice(withSizes)).toBe(24000);
  });
});

describe("hasChoices", () => {
  it("is true only when there's a size, add-on or option to pick", () => {
    expect(hasChoices(paneer)).toBe(false);
    expect(
      hasChoices(
        menuItem({ name: "x", addOns: [{ id: "a", name: "Cheese", pricePaise: 1 }] }),
      ),
    ).toBe(true);
  });
});

describe("filterMenuItems", () => {
  it("returns everything with no filters", () => {
    expect(filterMenuItems(items, NO_MENU_FILTERS)).toEqual(items);
  });

  it.each([
    ["paneer", ["Paneer Tikka"]],
    ["PANEER", ["Paneer Tikka"]],
    ["  tikka   pan ", ["Paneer Tikka"]], // words in any order, extra spaces ignored
    ["naan", ["Garlic Naan"]],
    ["pizza", []],
  ])('search "%s" finds %j', (query, expected) => {
    const found = filterMenuItems(items, { ...NO_MENU_FILTERS, query });
    expect(found.map((item) => item.name)).toEqual(expected);
  });

  it("filters by category, diet and availability, all together", () => {
    const names = (filters: Partial<typeof NO_MENU_FILTERS>) =>
      filterMenuItems(items, { ...NO_MENU_FILTERS, ...filters }).map((i) => i.name);

    expect(names({ categoryId: "cat-breads" })).toEqual(["Garlic Naan"]);
    expect(names({ diet: "veg" })).toEqual(["Paneer Tikka", "Garlic Naan"]);
    expect(names({ diet: "non-veg" })).toEqual(["Butter Chicken"]);
    expect(names({ availability: "sold-out" })).toEqual(["Garlic Naan"]);
    expect(names({ availability: "available", diet: "veg" })).toEqual(["Paneer Tikka"]);
  });
});

describe("countByCategory", () => {
  it("counts items per category", () => {
    expect(countByCategory(items)).toEqual({
      "cat-starters": 1,
      "cat-mains": 1,
      "cat-breads": 1,
    });
  });
});

describe("sample menu", () => {
  it("has unique ids and names, and valid prices", () => {
    const ids = sampleMenuItems.map((item) => item.id);
    const names = sampleMenuItems.map((item) => item.name.toLowerCase());
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(names).size).toBe(names.length);
    for (const item of sampleMenuItems) {
      expect(Number.isSafeInteger(item.pricePaise) && item.pricePaise > 0).toBe(true);
    }
  });
});
