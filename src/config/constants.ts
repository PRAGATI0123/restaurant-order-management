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

/**
 * The restaurant's details printed at the top of every invoice. SAMPLE values
 * (the GSTIN is made up, in the right format); Settings (Step 18) will let a
 * manager enter the real ones.
 */
export const RESTAURANT_DETAILS = {
  name: "The Teal Chair",
  address: "12 Park Street, Kolkata 700016",
  phone: "+91 33 4000 1234",
  gstin: "19ABCDE1234F1Z5",
};
