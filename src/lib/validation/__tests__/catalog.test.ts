import { describe, expect, it } from "vitest";
import {
  validateAddOn,
  validateCategory,
  validateOptionGroup,
  validateSizes,
  type OptionGroupFormValues,
  type PriceRow,
} from "@/lib/validation/catalog";
import { sampleAddOns, sampleCategories, sampleModifierGroups } from "@/mocks/data/menu";

const row = (name: string, price: string, key = name): PriceRow => ({ key, name, price });

describe("validateCategory", () => {
  it("accepts a new name, trimmed", () => {
    expect(validateCategory({ name: "  Specials " }, sampleCategories)).toEqual({
      ok: true,
      data: { name: "Specials" },
    });
  });

  it("refuses short, long and duplicate names", () => {
    expect(validateCategory({ name: "S" }, sampleCategories)).toMatchObject({
      errors: { name: "Name must be at least 2 characters." },
    });
    expect(validateCategory({ name: "x".repeat(31) }, sampleCategories)).toMatchObject({
      ok: false,
    });
    expect(validateCategory({ name: "BREADS" }, sampleCategories)).toMatchObject({
      errors: { name: 'There\'s already a "Breads" category.' },
    });
  });

  it("lets a category keep its own name when renaming", () => {
    expect(validateCategory({ name: "Breads" }, sampleCategories, "cat-breads").ok).toBe(
      true,
    );
  });
});

describe("validateAddOn", () => {
  it("accepts a priced add-on and returns paise", () => {
    const result = validateAddOn(
      { name: "Extra paneer", price: "60", dishIds: ["item-kadai-veg"] },
      sampleAddOns,
    );
    expect(result).toEqual({
      ok: true,
      data: { name: "Extra paneer", price: 6000, dishIds: ["item-kadai-veg"] },
    });
  });

  it("needs a price above zero, and a unique name", () => {
    expect(
      validateAddOn({ name: "Free mint", price: "0", dishIds: [] }, sampleAddOns),
    ).toMatchObject({ errors: { price: "Price must be more than ₹0." } });
    expect(
      validateAddOn({ name: "extra cheese", price: "40", dishIds: [] }, sampleAddOns),
    ).toMatchObject({ errors: { name: '"Extra cheese" already exists.' } });
  });
});

describe("validateOptionGroup", () => {
  const good: OptionGroupFormValues = {
    name: "Sweetness",
    required: true,
    maxSelect: 1,
    options: [row("Less sugar", "0"), row("Normal", "0"), row("Extra sweet", "10")],
    dishIds: [],
  };

  it("accepts a good group; free options are fine", () => {
    const result = validateOptionGroup(good, sampleModifierGroups);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.options.map((o) => o.price)).toEqual([0, 0, 1000]);
  });

  it("needs at least 2 options", () => {
    const result = validateOptionGroup({ ...good, options: [row("Only", "0")] }, []);
    expect(result).toMatchObject({
      errors: { options: "Add at least 2 options to choose from." },
    });
  });

  it("points at the exact option with a problem", () => {
    const result = validateOptionGroup(
      {
        ...good,
        options: [row("Mild", "0", "a"), row("", "0", "b"), row("mild", "0", "c")],
      },
      [],
    );
    expect(result).toMatchObject({
      errors: {
        "options.1.name": "Option name is required.",
        "options.2.name": '"mild" is already in this list.',
      },
    });
  });

  it("keeps 'most choices' between 1 and the number of options", () => {
    expect(validateOptionGroup({ ...good, maxSelect: 4 }, [])).toMatchObject({
      errors: { maxSelect: "Choose a number from 1 to 3." },
    });
    expect(validateOptionGroup({ ...good, maxSelect: 0 }, []).ok).toBe(false);
  });

  it("refuses a name that already exists", () => {
    expect(
      validateOptionGroup({ ...good, name: "Spice Level" }, sampleModifierGroups),
    ).toMatchObject({ errors: { name: '"Spice level" already exists.' } });
  });
});

describe("validateSizes", () => {
  it("accepts no sizes, or two or more", () => {
    expect(validateSizes([]).ok).toBe(true);
    const result = validateSizes([row("Half", "180"), row("Full", "320")]);
    expect(result.ok && result.data.sizes.map((s) => s.price)).toEqual([18000, 32000]);
  });

  it("refuses a single size, duplicate names and free sizes", () => {
    expect(validateSizes([row("Half", "180")])).toMatchObject({
      errors: {
        sizes: "Add a second size, or remove this one to sell the dish in one size.",
      },
    });
    expect(
      validateSizes([row("Half", "180", "a"), row("half", "200", "b")]),
    ).toMatchObject({
      errors: { "sizes.1.name": '"half" is already in this list.' },
    });
    expect(validateSizes([row("Half", "0"), row("Full", "320")])).toMatchObject({
      errors: { "sizes.0.price": "Price must be more than ₹0." },
    });
  });
});
