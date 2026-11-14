import { beforeEach, describe, expect, it } from "vitest";
import { useMenuStore } from "@/stores/menu-store";

// Zustand stores work outside React too: getState() reads, actions write.
const store = () => useMenuStore.getState();
const dish = (id: string) => store().items.find((item) => item.id === id)!;

beforeEach(() => {
  // Start every test from the sample menu again.
  useMenuStore.setState(useMenuStore.getInitialState(), true);
});

describe("menu store: categories", () => {
  it("adds a category at the end and renames it", () => {
    const specials = store().addCategory("Specials");
    expect(specials.sortOrder).toBe(6);
    store().renameCategory(specials.id, "Chef's Specials");
    expect(store().categories.at(-1)?.name).toBe("Chef's Specials");
  });

  it("deletes an empty category and renumbers the rest", () => {
    const specials = store().addCategory("Specials");
    store().moveCategory(specials.id, "up"); // now 5th
    store().deleteCategory(specials.id);
    expect(
      store()
        .categories.map((c) => c.sortOrder)
        .sort(),
    ).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it("refuses to delete a category with dishes, and changes nothing", () => {
    const before = store().categories;
    expect(() => store().deleteCategory("cat-breads")).toThrow(/still has 4 dishes/);
    expect(store().categories).toBe(before);
  });
});

describe("menu store: shared add-ons and option groups", () => {
  it("creates an add-on and links it to the chosen dishes", () => {
    const addOn = store().saveAddOn({
      name: "Extra paneer",
      pricePaise: 6000,
      dishIds: ["item-kadai-veg", "item-veg-biryani"],
    });
    expect(dish("item-kadai-veg").addOnIds).toContain(addOn.id);
    expect(dish("item-veg-biryani").addOnIds).toContain(addOn.id);
  });

  it("editing keeps the same id and updates which dishes use it", () => {
    store().saveAddOn(
      { name: "Extra cheese", pricePaise: 5000, dishIds: [] },
      "add-cheese",
    );
    expect(store().addOns.find((a) => a.id === "add-cheese")?.pricePaise).toBe(5000);
    expect(dish("item-paneer-tikka").addOnIds).not.toContain("add-cheese");
  });

  it("deleting an option group removes it from every dish", () => {
    store().deleteOptionGroup("mod-spice");
    expect(store().modifierGroups.some((g) => g.id === "mod-spice")).toBe(false);
    expect(
      store().items.some((item) => item.modifierGroupIds.includes("mod-spice")),
    ).toBe(false);
  });

  it("saves a group: 'required' becomes minSelect 1, new options get ids", () => {
    const group = store().saveOptionGroup({
      name: "Sweetness",
      required: true,
      maxSelect: 1,
      options: [
        { name: "Less", pricePaise: 0 },
        { name: "Normal", pricePaise: 0 },
      ],
      dishIds: ["item-sweet-lassi"],
    });
    expect(group.minSelect).toBe(1);
    expect(group.options.every((o) => o.id.startsWith("opt_"))).toBe(true);
    expect(dish("item-sweet-lassi").modifierGroupIds).toEqual([group.id]);
  });
});

describe("menu store: sizes", () => {
  it("sets sizes and moves the dish price to its biggest size", () => {
    store().setSizes("item-veg-biryani", [
      { name: "Half", pricePaise: 18000 },
      { name: "Full", pricePaise: 30000 },
    ]);
    expect(dish("item-veg-biryani").variants.map((v) => v.name)).toEqual([
      "Half",
      "Full",
    ]);
    expect(dish("item-veg-biryani").pricePaise).toBe(30000);
  });

  it("keeps existing size ids when editing, and can remove all sizes", () => {
    const halfId = dish("item-paneer-tikka").variants[0]!.id;
    store().setSizes("item-paneer-tikka", [
      { id: halfId, name: "Half", pricePaise: 19000 },
      { name: "Full", pricePaise: 34000 },
    ]);
    expect(dish("item-paneer-tikka").variants[0]?.id).toBe(halfId);

    store().setSizes("item-paneer-tikka", []);
    expect(dish("item-paneer-tikka").variants).toEqual([]);
  });
});
