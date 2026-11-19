/**
 * Defaults the app starts with. A manager can change them in Settings.
 */

/** 5% GST, the usual rate for restaurants in India, in basis points (500 = 5%). */
export const DEFAULT_TAX_RATE_BASIS_POINTS = 500;

/**
 * The restaurant's details printed at the top of every invoice. SAMPLE values
 * (the GSTIN is made up, in the right format); a manager enters the real ones
 * in Settings.
 */
export const RESTAURANT_DETAILS = {
  name: "The Teal Chair",
  address: "12 Park Street, Kolkata 700016",
  phone: "+91 33 4000 1234",
  gstin: "19ABCDE1234F1Z5",
};
