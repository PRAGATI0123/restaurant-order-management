/** The restaurant's details, printed at the top of every invoice. */
export type RestaurantDetails = {
  name: string;
  address: string;
  phone: string;
  /** India's GST registration number: 15 characters, e.g. 19ABCDE1234F1Z5. */
  gstin: string;
};

/** Everything a manager can change in Settings. */
export type RestaurantSettings = {
  restaurant: RestaurantDetails;
  /** GST on bills in basis points: 500 = 5%. Paid invoices keep their own rate. */
  taxRateBasisPoints: number;
  /** When a kitchen ticket turns amber (warning) and red (late). */
  kitchenTiming: { warningAfterMinutes: number; lateAfterMinutes: number };
};
