import { z } from "zod";
import type { DeliveryDetails } from "@/types/order";
import { firstErrors, nameField, type Result } from "./shared";

/**
 * An Indian mobile number: 10 digits starting with 6–9. People type it in many
 * ways ("98765 43210", "+91-9876543210", "09876543210"), so we first remove
 * spaces, dashes and the +91 / 0 prefix, then check, and store the clean 10 digits.
 */
export function normalizePhone(text: string): string {
  const digits = text.replace(/[\s\-()]/g, "");
  return digits.replace(/^(\+91|91(?=\d{10}$)|0(?=\d{10}$))/, "");
}

const deliverySchema = z.object({
  customerName: nameField("Name", 2, 40),
  phone: z
    .string()
    .transform(normalizePhone)
    .refine((digits) => /^[6-9]\d{9}$/.test(digits), "Enter a 10-digit mobile number."),
  address: z
    .string()
    .trim()
    .min(10, "Enter the full address (house, street, area).")
    .max(200, "Address must be 200 characters or fewer."),
});

export type DeliveryFormValues = z.input<typeof deliverySchema>;

/** Checks the delivery form; returns clean details (phone as 10 digits). */
export function validateDelivery(values: DeliveryFormValues): Result<DeliveryDetails> {
  const result = deliverySchema.safeParse(values);
  if (!result.success) return { ok: false, errors: firstErrors(result.error) };
  return { ok: true, data: result.data };
}
