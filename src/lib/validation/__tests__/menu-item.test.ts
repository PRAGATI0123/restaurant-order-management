import { describe, expect, it } from "vitest";
import {
  validateMenuItemForm,
  type MenuItemFormValues,
} from "@/lib/validation/menu-item";
import { sampleMenuItems } from "@/mocks/data/menu";

const valid: MenuItemFormValues = {
  name: "  Masala Dosa ",
  categoryId: "cat-mains",
  price: "149.50",
  isVeg: true,
  isAvailable: true,
};

describe("validateMenuItemForm", () => {
  it("accepts good input and returns clean data, with the price in paise", () => {
    const result = validateMenuItemForm(valid, sampleMenuItems);
    expect(result).toEqual({
      ok: true,
      data: { ...valid, name: "Masala Dosa", price: 14950 },
    });
  });

  it.each([
    [{ name: "" }, "name", "Name must be at least 2 characters."],
    [{ name: "x".repeat(61) }, "name", "Name must be 60 characters or fewer."],
    [{ categoryId: "" }, "categoryId", "Choose a category."],
    [{ price: "" }, "price", "Enter a price."],
    [{ price: "abc" }, "price", "Enter a price like 120 or 120.50."],
    [{ price: "12.345" }, "price", "Enter a price like 120 or 120.50."],
    [{ price: "0" }, "price", "Price must be more than ₹0."],
    [{ price: "100001" }, "price", "Price can't be more than ₹1,00,000."],
  ])("rejects %j with a message on %s", (change, field, message) => {
    const result = validateMenuItemForm({ ...valid, ...change }, sampleMenuItems);
    expect(result.ok).toBe(false);
    if (!result.ok)
      expect(result.errors[field as keyof MenuItemFormValues]).toBe(message);
  });

  it("refuses a name that's already on the menu, ignoring capitals and spaces", () => {
    const result = validateMenuItemForm(
      { ...valid, name: "paneer   TIKKA" },
      sampleMenuItems,
    );
    expect(result).toEqual({
      ok: false,
      errors: { name: '"Paneer Tikka" is already on the menu.' },
    });
  });

  it("lets an item keep its own name when it's being edited", () => {
    const result = validateMenuItemForm(
      { ...valid, name: "Paneer Tikka" },
      sampleMenuItems,
      "item-paneer-tikka",
    );
    expect(result.ok).toBe(true);
  });
});
