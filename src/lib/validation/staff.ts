import { z } from "zod";
import type { Id } from "@/types/common";
import type { Role } from "@/types/staff";
import { firstErrors, nameField, sameName, type Result } from "./shared";

const ROLES = [
  "manager",
  "cashier",
  "waiter",
  "kitchen",
] as const satisfies readonly Role[];

const staffSchema = z.object({
  name: nameField("Name", 2, 40),
  role: z.enum(ROLES, { message: "Choose a role." }),
  pin: z
    .string()
    .trim()
    .regex(/^\d{4}$/, "The PIN must be exactly 4 digits."),
});

export type StaffFormValues = { name: string; role: Role | ""; pin: string };
export type StaffFormData = z.output<typeof staffSchema>;

/** Checks the add/edit staff form. Two people can't have the same name (login picks by name). */
export function validateStaff(
  values: StaffFormValues,
  existing: { id: Id; name: string }[],
  editingId?: Id,
): Result<StaffFormData> {
  const result = staffSchema.safeParse(values);
  if (!result.success) return { ok: false, errors: firstErrors(result.error) };
  const clash = existing.find(
    (s) => s.id !== editingId && sameName(s.name, result.data.name),
  );
  if (clash) {
    return { ok: false, errors: { name: `${clash.name} is already on the staff list.` } };
  }
  return { ok: true, data: result.data };
}
