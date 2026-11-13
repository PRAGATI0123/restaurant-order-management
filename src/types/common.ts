/** A record's unique id, e.g. "ord_8f3a…". */
export type Id = string;

/**
 * Money is ALWAYS stored as a whole number of paise (1 rupee = 100 paise).
 *   ₹125.50 → 12550
 * Whole numbers add and multiply exactly; decimals like 0.1 + 0.2 don't.
 * Every money field in the app ends in "Paise" so you can't mistake it for rupees.
 */
export type Paise = number;

/** A date and time as text, e.g. "2026-11-13T14:05:00.000Z" (ISO 8601). */
export type IsoDateTime = string;
