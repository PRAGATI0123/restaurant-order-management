import { z } from "zod";
import type { Id } from "@/types/common";
import type { AddOn, MenuCategory, ModifierGroup } from "@/types/menu";
import { firstErrors, nameField, priceField, sameName } from "./shared";

/**
 * FORM RULES for categories, add-ons, option groups and sizes.
 * Every validator returns either { ok: true, data } with clean data (prices
 * in paise), or { ok: false, errors } with one message per field.
 * Field names inside lists look like "options.1.name" (second option's name).
 */
export type Result<T> =
  { ok: true; data: T } | { ok: false; errors: Record<string, string> };

/** One editable row: a size ("Half" ₹180) or an option ("Hot" +₹0). */
export type PriceRow = {
  key: string; // stable key for React while editing
  id?: Id; // set when the row already existed before this edit
  name: string;
  price: string; // as typed
};

/** Adds "Two rows can't both be called X" errors to a list of rows. */
function checkUniqueRowNames(
  rows: { name: string }[],
  listName: string,
  ctx: z.RefinementCtx,
): void {
  rows.forEach((row, index) => {
    const firstIndex = rows.findIndex((other) => sameName(other.name, row.name));
    if (row.name.trim() && firstIndex !== index) {
      ctx.addIssue({
        code: "custom",
        path: [listName, index, "name"],
        message: `"${row.name.trim()}" is already in this list.`,
      });
    }
  });
}

// ─── Category ────────────────────────────────────────────────────────────────

const categorySchema = z.object({ name: nameField("Name", 2, 30) });

export function validateCategory(
  values: { name: string },
  existing: MenuCategory[],
  editingId?: Id,
): Result<{ name: string }> {
  const result = categorySchema.safeParse(values);
  if (!result.success) return { ok: false, errors: firstErrors(result.error) };
  const clash = existing.find(
    (c) => c.id !== editingId && sameName(c.name, result.data.name),
  );
  if (clash)
    return { ok: false, errors: { name: `There's already a "${clash.name}" category.` } };
  return { ok: true, data: result.data };
}

// ─── Add-on ──────────────────────────────────────────────────────────────────

const addOnSchema = z.object({
  name: nameField("Name", 2, 40),
  price: priceField(), // an add-on always costs something; free choices are options
  dishIds: z.array(z.string()),
});
export type AddOnFormValues = z.input<typeof addOnSchema>;
export type AddOnFormData = z.output<typeof addOnSchema>;

export function validateAddOn(
  values: AddOnFormValues,
  existing: AddOn[],
  editingId?: Id,
): Result<AddOnFormData> {
  const result = addOnSchema.safeParse(values);
  if (!result.success) return { ok: false, errors: firstErrors(result.error) };
  const clash = existing.find(
    (a) => a.id !== editingId && sameName(a.name, result.data.name),
  );
  if (clash) return { ok: false, errors: { name: `"${clash.name}" already exists.` } };
  return { ok: true, data: result.data };
}

// ─── Option group ────────────────────────────────────────────────────────────

const optionRowSchema = z.object({
  key: z.string(),
  id: z.string().optional(),
  name: nameField("Option", 1, 30),
  price: priceField({ allowZero: true }), // most options are free: "Mild", "No onion"
});

const optionGroupSchema = z
  .object({
    name: nameField("Name", 2, 40),
    required: z.boolean(), // must the guest pick one?
    maxSelect: z.number().int(),
    options: z.array(optionRowSchema).min(2, "Add at least 2 options to choose from."),
    dishIds: z.array(z.string()),
  })
  .superRefine((group, ctx) => {
    checkUniqueRowNames(group.options, "options", ctx);
    if (group.maxSelect < 1 || group.maxSelect > Math.max(group.options.length, 1)) {
      ctx.addIssue({
        code: "custom",
        path: ["maxSelect"],
        message: `Choose a number from 1 to ${group.options.length}.`,
      });
    }
  });
export type OptionGroupFormValues = z.input<typeof optionGroupSchema>;
export type OptionGroupFormData = z.output<typeof optionGroupSchema>;

export function validateOptionGroup(
  values: OptionGroupFormValues,
  existing: ModifierGroup[],
  editingId?: Id,
): Result<OptionGroupFormData> {
  const result = optionGroupSchema.safeParse(values);
  if (!result.success) return { ok: false, errors: firstErrors(result.error) };
  const clash = existing.find(
    (g) => g.id !== editingId && sameName(g.name, result.data.name),
  );
  if (clash) return { ok: false, errors: { name: `"${clash.name}" already exists.` } };
  return { ok: true, data: result.data };
}

// ─── Sizes of one dish ───────────────────────────────────────────────────────

const sizeRowSchema = z.object({
  key: z.string(),
  id: z.string().optional(),
  name: nameField("Size", 1, 20),
  price: priceField(),
});

const sizesSchema = z
  .object({ sizes: z.array(sizeRowSchema) })
  .superRefine(({ sizes }, ctx) => {
    // One size makes no sense: it's just the dish's normal price.
    if (sizes.length === 1) {
      ctx.addIssue({
        code: "custom",
        path: ["sizes"],
        message: "Add a second size, or remove this one to sell the dish in one size.",
      });
    }
    checkUniqueRowNames(sizes, "sizes", ctx);
  });
export type SizesFormData = z.output<typeof sizesSchema>;

export function validateSizes(sizes: PriceRow[]): Result<SizesFormData> {
  const result = sizesSchema.safeParse({ sizes });
  if (!result.success) return { ok: false, errors: firstErrors(result.error) };
  return { ok: true, data: result.data };
}
