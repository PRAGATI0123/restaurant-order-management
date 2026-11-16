/**
 * Defaults the app starts with. Settings (Step 18) will let a manager change
 * the ones that can vary between restaurants.
 */

/** 5% GST, the usual rate for restaurants in India, in basis points (500 = 5%). */
export const DEFAULT_TAX_RATE_BASIS_POINTS = 500;

/**
 * Who is "logged in" until real login arrives (Step 18). Every order and
 * status change records this id as the staff member who did it.
 */
export const DEMO_STAFF_ID = "staff-demo-manager";
