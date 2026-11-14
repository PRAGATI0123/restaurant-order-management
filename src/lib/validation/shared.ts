import { z } from "zod";
import { parseRupees } from "@/domain/money";
import type { Paise } from "@/types/common";

/** ₹1,00,000. Anything above is almost certainly a typo (an extra zero or two). */
export const MAX_PRICE_PAISE: Paise = 1_00_000_00;

/** Turns typed text into paise, or returns undefined if it isn't a valid amount. */
function tryParseRupees(text: string): Paise | undefined {
  try {
    return parseRupees(text);
  } catch {
    return undefined;
  }
}

/**
 * A price typed as text ("120", "120.50"), checked and turned into paise.
 * `allowZero` is for extras that can be free, like "No onion".
 */
export function priceField({ allowZero = false } = {}) {
  return z
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
    .refine((paise) => allowZero || paise > 0, "Price must be more than ₹0.")
    .refine((paise) => paise <= MAX_PRICE_PAISE, "Price can't be more than ₹1,00,000.");
}

/** A required name between `min` and `max` characters, with spaces trimmed. */
export function nameField(what: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .min(
      min,
      min === 1
        ? `${what} name is required.`
        : `${what} must be at least ${min} characters.`,
    )
    .max(max, `${what} must be ${max} characters or fewer.`);
}

/** "Paneer   TIKKA" and "paneer tikka" count as the same name. */
export function sameName(a: string, b: string): boolean {
  const key = (text: string) => text.trim().toLowerCase().replace(/\s+/g, " ");
  return key(a) === key(b);
}

/**
 * Zod's error, flattened to one message per field: the first problem only,
 * so the form stays calm. Returns e.g. { name: "Enter a name.", price: "…" }.
 */
export function firstErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!(key in errors)) errors[key] = issue.message;
  }
  return errors;
}
