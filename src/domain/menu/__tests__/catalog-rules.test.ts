import { describe, expect, it } from "vitest";
import {
  assertCanDeleteCategory,
  dishesUsing,
  moveCategory,
  setDishLinks,
  sortCategories,
  unlinkEverywhere,
} from "@/domain/menu/catalog-rules";
import { sampleCategories, sampleMenuItems } from "@/mocks/data/menu";
import type { MenuCategory } from "@/types/menu";

const names = (categories: MenuCategory[]) =>
  sortCategories(categories).map((c) => c.name);

describe("moveCategory", () => {
  it("moves a category up or down one place and renumbers 0, 1, 2…", () => {
    const moved = moveCategory(sampleCategories, "cat-breads", "up");
    expect(names(moved)).toEqual([
      "Starters",
      "Breads",
      "Mains",
      "Rice & Biryani",
      "Drinks",
      "Desserts",
    ]);
    expect(moved.map((c) => c.sortOrder).sort()).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("does nothing past the ends", () => {
    expect(names(moveCategory(sampleCategories, "cat-starters", "up"))).toEqual(
      names(sampleCategories),
    );
    expect(names(moveCategory(sampleCategories, "cat-desserts", "down"))).toEqual(
      names(sampleCategories),
    );
  });

  it("fixes gaps and ties left in old data", () => {
    const messy: MenuCategory[] = [
      { id: "a", name: "A", sortOrder: 10 },
      { id: "b", name: "B", sortOrder: 10 },
      { id: "c", name: "C", sortOrder: 50 },
    ];
    expect(moveCategory(messy, "c", "up").map((c) => c.sortOrder)).toEqual([0, 1, 2]);
  });

  it("refuses an unknown category", () => {
    expect(() => moveCategory(sampleCategories, "nope", "up")).toThrow();
  });
});

describe("assertCanDeleteCategory", () => {
  it("allows deleting an empty category", () => {
    const empty = { id: "cat-empty", name: "Specials", sortOrder: 9 };
    expect(() => assertCanDeleteCategory(empty, sampleMenuItems)).not.toThrow();
  });

  it("refuses a category that still has dishes, and says how many", () => {
    const breads = sampleCategories.find((c) => c.id === "cat-breads")!;
    expect(() => assertCanDeleteCategory(breads, sampleMenuItems)).toThrow(
      "Breads still has 4 dishes. Move or delete them first.",
    );
  });
});

describe("shared add-ons and option groups", () => {
  it("finds the dishes that use one", () => {
    const using = dishesUsing(sampleMenuItems, "addOnIds", "add-cheese");
    expect(using.map((item) => item.name)).toEqual(["Paneer Tikka"]);
  });

  it("links exactly the chosen dishes, and unlinks the rest", () => {
    const updated = setDishLinks(sampleMenuItems, "addOnIds", "add-cheese", [
      "item-crispy-corn",
      "item-garlic-naan",
    ]);
    expect(dishesUsing(updated, "addOnIds", "add-cheese").map((i) => i.name)).toEqual([
      "Crispy Corn",
      "Garlic Naan",
    ]);
  });

  it("never adds the same link twice", () => {
    const twice = setDishLinks(
      setDishLinks(sampleMenuItems, "addOnIds", "add-cheese", ["item-paneer-tikka"]),
      "addOnIds",
      "add-cheese",
      ["item-paneer-tikka"],
    );
    const paneer = twice.find((i) => i.id === "item-paneer-tikka")!;
    expect(paneer.addOnIds.filter((id) => id === "add-cheese")).toHaveLength(1);
  });

  it("returns untouched dishes as the same objects (so React redraws less)", () => {
    const updated = setDishLinks(sampleMenuItems, "addOnIds", "add-cheese", [
      "item-paneer-tikka",
    ]);
    updated.forEach((item, i) => expect(item).toBe(sampleMenuItems[i]));
  });

  it("removes a deleted option group from every dish", () => {
    const updated = unlinkEverywhere(sampleMenuItems, "modifierGroupIds", "mod-spice");
    expect(dishesUsing(updated, "modifierGroupIds", "mod-spice")).toEqual([]);
    expect(dishesUsing(sampleMenuItems, "modifierGroupIds", "mod-spice").length).toBe(8);
  });
});
