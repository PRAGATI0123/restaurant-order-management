import { describe, expect, it } from "vitest";
import { addToCart, cartCount, setLineNote, setLineQuantity } from "@/domain/orders/cart";
import {
  buildOrderItem,
  findChoiceProblems,
  unitPriceWithChoices,
  type ItemChoices,
} from "@/domain/orders/item-choices";
import { sampleAddOns, sampleMenuItems, sampleModifierGroups } from "@/mocks/data/menu";

const catalog = { addOns: sampleAddOns, modifierGroups: sampleModifierGroups };
const dish = (id: string) => sampleMenuItems.find((item) => item.id === id)!;
const none: ItemChoices = { addOnIds: [], optionIds: {}, quantity: 1 };

// Paneer Tikka: sizes Half ₹180 / Full ₹320, add-on Extra cheese +₹40, Spice level (choose 1)
const paneer = dish("item-paneer-tikka");
const paneerOk: ItemChoices = {
  variantId: "var-paneer-half",
  addOnIds: ["add-cheese"],
  optionIds: { "mod-spice": ["mod-spice-hot"] },
  quantity: 2,
};

describe("findChoiceProblems", () => {
  it("is empty when everything required is chosen", () => {
    expect(findChoiceProblems(paneer, paneerOk, catalog)).toEqual({});
  });

  it("asks for a size and a spice level when they're missing", () => {
    expect(findChoiceProblems(paneer, none, catalog)).toEqual({
      size: "Choose a size.",
      "mod-spice": "Choose a spice level.",
    });
  });

  it("enforces 'up to N' and refuses options from another group", () => {
    const dal = dish("item-dal-makhani"); // Dietary requests: optional, up to 2
    expect(findChoiceProblems(dal, none, catalog)).toEqual({}); // optional = may skip
    expect(
      findChoiceProblems(
        dal,
        { ...none, optionIds: { "mod-jain": ["mod-jain-no-onion", "mod-spice-hot"] } },
        catalog,
      ),
    ).toEqual({ "mod-jain": "Choose again for dietary requests." });
  });

  it("refuses sold-out dishes, extras the dish doesn't offer, and bad quantities", () => {
    const fish = { ...dish("item-fish-amritsari"), isAvailable: false }; // sold out
    expect(findChoiceProblems(fish, none, catalog).item).toBe(
      "Fish Amritsari is sold out.",
    );
    expect(
      findChoiceProblems(
        dish("item-butter-naan"),
        { ...none, addOnIds: ["add-cheese"] },
        catalog,
      ).addOns,
    ).toBe("That extra isn't offered with Butter Naan.");
    for (const quantity of [0, 100, 1.5]) {
      expect(
        findChoiceProblems(dish("item-butter-naan"), { ...none, quantity }, catalog)
          .quantity,
      ).toBe("Quantity must be from 1 to 99.");
    }
  });
});

describe("unitPriceWithChoices and buildOrderItem", () => {
  it("prices one dish: size + add-ons + options", () => {
    expect(unitPriceWithChoices(paneer, paneerOk, catalog)).toBe(18000 + 4000);
  });

  it("builds an order line that COPIES names and prices from the menu", () => {
    const line = buildOrderItem(
      paneer,
      { ...paneerOk, note: "  less oil " },
      catalog,
      "line-1",
    );
    expect(line).toEqual({
      id: "line-1",
      menuItemId: "item-paneer-tikka",
      name: "Paneer Tikka",
      variant: { id: "var-paneer-half", name: "Half" },
      unitPricePaise: 18000,
      addOns: [{ id: "add-cheese", name: "Extra cheese", pricePaise: 4000 }],
      modifiers: [{ id: "mod-spice-hot", name: "Hot", pricePaise: 0 }],
      quantity: 2,
      note: "less oil",
      status: "active",
    });
  });

  it("throws the first problem instead of building a bad line", () => {
    expect(() => buildOrderItem(paneer, none, catalog, "x")).toThrow("Choose a size.");
  });
});

describe("cart", () => {
  const naan = (quantity = 1, note?: string) =>
    buildOrderItem(
      dish("item-butter-naan"),
      { ...none, quantity, note },
      catalog,
      `naan-${quantity}-${note}`,
    );

  it("adds up the same dish instead of adding a second line", () => {
    const lines = addToCart(addToCart([], naan(2)), naan(1));
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(3);
    expect(cartCount(lines)).toBe(3);
  });

  it("keeps lines apart when the kitchen would make them differently", () => {
    const lines = addToCart(addToCart([], naan(1)), naan(1, "extra crispy"));
    expect(lines).toHaveLength(2);
  });

  it("changes quantities; 0 removes the line", () => {
    const lines = addToCart([], naan(1));
    const id = lines[0]!.id;
    expect(setLineQuantity(lines, id, 4)[0]?.quantity).toBe(4);
    expect(setLineQuantity(lines, id, 0)).toEqual([]);
    expect(() => setLineQuantity(lines, id, 100)).toThrow();
  });

  it("refuses to go over 99 of one dish", () => {
    expect(() => addToCart([naan(98)], naan(2))).toThrow(/more than 99/);
  });

  it("sets or clears a note, and combines lines that become identical", () => {
    const withNote = addToCart(addToCart([], naan(1)), naan(2, "extra crispy"));
    const noted = withNote.find((l) => l.note)!;
    const combined = setLineNote(withNote, noted.id, "");
    expect(combined).toHaveLength(1);
    expect(combined[0]?.quantity).toBe(3);
    expect(combined[0]?.note).toBeUndefined();
  });
});
