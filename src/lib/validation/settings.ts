import { z } from "zod";
import type { RestaurantDetails } from "@/types/settings";
import { firstErrors, nameField, type Result } from "./shared";

/**
 * GSTIN format: 2-digit state code, 10-character PAN (5 letters, 4 digits,
 * 1 letter), entity number, "Z", check character.  e.g. 19ABCDE1234F1Z5
 */
const GSTIN = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const detailsSchema = z.object({
  name: nameField("Restaurant", 2, 60),
  address: z
    .string()
    .trim()
    .min(5, "Enter the full address.")
    .max(120, "Keep the address under 120 characters."),
  phone: z
    .string()
    .trim()
    .regex(/^\+?[\d\s-]{8,20}$/, "Enter a phone number, like +91 33 4000 1234."),
  gstin: z
    .string()
    .trim()
    .toUpperCase()
    .regex(GSTIN, "A GSTIN has 15 characters, like 19ABCDE1234F1Z5."),
});

export function validateRestaurantDetails(
  values: RestaurantDetails,
): Result<RestaurantDetails> {
  const result = detailsSchema.safeParse(values);
  return result.success
    ? { ok: true, data: result.data }
    : { ok: false, errors: firstErrors(result.error) };
}

const minutes = (label: string) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, `${label}: enter whole minutes.`)
    .transform(Number)
    .refine((n) => n >= 1 && n <= 120, `${label} must be from 1 to 120 minutes.`);

const timingSchema = z
  .object({
    warningAfterMinutes: minutes("Getting late"),
    lateAfterMinutes: minutes("Late"),
  })
  .refine((t) => t.lateAfterMinutes > t.warningAfterMinutes, {
    path: ["lateAfterMinutes"],
    message: "'Late' must come after 'Getting late'.",
  });

export type KitchenTimingValues = {
  warningAfterMinutes: string;
  lateAfterMinutes: string;
};

export function validateKitchenTiming(values: KitchenTimingValues) {
  const result = timingSchema.safeParse(values);
  return result.success
    ? ({ ok: true, data: result.data } as const)
    : ({ ok: false, errors: firstErrors(result.error) } as const);
}

/** GST rates a restaurant bill can use in India (0% for exempt items). */
export const GST_RATES_BASIS_POINTS = [0, 500, 1200, 1800] as const;
