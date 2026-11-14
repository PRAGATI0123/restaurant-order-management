import { z } from "zod";
import type { Id } from "@/types/common";
import type { TableShape } from "@/types/table";
import { firstErrors, nameField, sameName, type Result } from "./shared";

export const MAX_SEATS = 12;

const tableSchema = z.object({
  name: nameField("Table", 1, 12),
  seats: z
    .string()
    .trim()
    .regex(/^\d+$/, "Enter a whole number of seats.")
    .transform(Number)
    .refine((n) => n >= 1 && n <= MAX_SEATS, `Seats must be from 1 to ${MAX_SEATS}.`),
  shape: z.enum(["square", "round"]),
});

export type TableFormValues = { name: string; seats: string; shape: TableShape };
export type TableFormData = z.output<typeof tableSchema>;

/** Checks the add/edit table form. Two tables can't share a name ("T4"). */
export function validateTable(
  values: TableFormValues,
  existing: { id: Id; name: string }[],
  editingId?: Id,
): Result<TableFormData> {
  const result = tableSchema.safeParse(values);
  if (!result.success) return { ok: false, errors: firstErrors(result.error) };
  const clash = existing.find(
    (t) => t.id !== editingId && sameName(t.name, result.data.name),
  );
  if (clash)
    return {
      ok: false,
      errors: { name: `There's already a table called ${clash.name}.` },
    };
  return { ok: true, data: result.data };
}
