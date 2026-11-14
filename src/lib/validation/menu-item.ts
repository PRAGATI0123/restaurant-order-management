import { z } from "zod";
import type { Id } from "@/types/common";
import type { MenuItem } from "@/types/menu";
import { firstErrors, nameField, priceField, sameName } from "./shared";

/**
 * THE RULES FOR A MENU ITEM FORM, written once with Zod.
 * Zod checks the typed values and, if they're fine, hands back clean data:
 * trimmed name, price already converted to paise.
 */
export const menuItemFormSchema = z.object({
  name: nameField("Name", 2, 60),
  categoryId: z.string().min(1, "Choose a category."),
  price: priceField(),
  isVeg: z.boolean(),
  isAvailable: z.boolean(),
});

/** What the form holds while typing: everything as the user entered it. */
export type MenuItemFormValues = z.input<typeof menuItemFormSchema>;

/** Clean data after checking: the price is now in paise. */
export type MenuItemFormData = z.output<typeof menuItemFormSchema>;

export type FormErrors = Partial<Record<keyof MenuItemFormValues, string>>;

export type ValidationResult =
  { ok: true; data: MenuItemFormData } | { ok: false; errors: FormErrors };

/**
 * Checks the form. On top of the field rules, two dishes can't share a name
 * (ignoring capitals and spaces), because staff pick items by name.
 * `editingId` is the item being edited, so it doesn't clash with itself.
 */
export function validateMenuItemForm(
  values: MenuItemFormValues,
  existingItems: MenuItem[],
  editingId?: Id,
): ValidationResult {
  const result = menuItemFormSchema.safeParse(values);
  if (!result.success) {
    return { ok: false, errors: firstErrors(result.error) as FormErrors };
  }

  const duplicate = existingItems.find(
    (item) => item.id !== editingId && sameName(item.name, result.data.name),
  );
  if (duplicate) {
    return { ok: false, errors: { name: `"${duplicate.name}" is already on the menu.` } };
  }
  return { ok: true, data: result.data };
}
