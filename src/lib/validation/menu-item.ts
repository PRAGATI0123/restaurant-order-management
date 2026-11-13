import { z } from "zod";
import { parseRupees } from "@/domain/money";
import type { Id, Paise } from "@/types/common";
import type { MenuItem } from "@/types/menu";

/** ₹1,00,000. Anything above is almost certainly a typo (an extra zero or two). */
const MAX_PRICE_PAISE: Paise = 1_00_000_00;

/** Turns typed text into paise, or returns undefined if it isn't a valid amount. */
function tryParseRupees(text: string): Paise | undefined {
  try {
    return parseRupees(text);
  } catch {
    return undefined;
  }
}

/**
 * THE RULES FOR A MENU ITEM FORM, written once with Zod.
 * Zod checks the typed values and, if they're fine, hands back clean data:
 * trimmed name, price already converted to paise.
 */
export const menuItemFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Name must be at least 2 characters.")
    .max(60, "Name must be 60 characters or fewer."),
  categoryId: z.string().min(1, "Choose a category."),
  price: z
    .string()
    .trim()
    .min(1, "Enter a price.")
    .transform((text, ctx) => {
      const paise = tryParseRupees(text);
      if (paise === undefined) {
        ctx.addIssue({ code: "custom", message: "Enter a price like 120 or 120.50." });
        return z.NEVER;
      }
      return paise;
    })
    .refine((paise) => paise > 0, "Price must be more than ₹0.")
    .refine((paise) => paise <= MAX_PRICE_PAISE, "Price can't be more than ₹1,00,000."),
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
    const { fieldErrors } = z.flattenError(result.error);
    const errors: FormErrors = {};
    for (const [field, messages] of Object.entries(fieldErrors)) {
      // Show only the first problem for each field, to keep the form calm.
      errors[field as keyof MenuItemFormValues] = (messages as string[])[0];
    }
    return { ok: false, errors };
  }

  const key = result.data.name.toLowerCase().replace(/\s+/g, " ");
  const duplicate = existingItems.find(
    (item) =>
      item.id !== editingId && item.name.toLowerCase().replace(/\s+/g, " ") === key,
  );
  if (duplicate) {
    return { ok: false, errors: { name: `"${duplicate.name}" is already on the menu.` } };
  }
  return { ok: true, data: result.data };
}
