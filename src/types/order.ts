import type { Id, IsoDateTime, Paise } from "./common";

export type OrderType = "dine-in" | "takeaway" | "delivery";

/** Where the whole order is. Allowed moves between them come in Step 8. */
export type OrderStatus = "new" | "preparing" | "ready" | "served" | "paid" | "cancelled";

/** Where one item is in the kitchen. */
export type OrderItemStatus = "pending" | "preparing" | "ready" | "served" | "cancelled";

/**
 * An option the guest picked (add-on or modifier), COPIED from the menu at the
 * moment of ordering. If the menu price changes tomorrow, today's bills stay
 * correct, because they never look the price up again.
 */
export type ChosenOption = {
  id: Id;
  name: string;
  pricePaise: Paise;
};

export type OrderItem = {
  id: Id;
  menuItemId: Id;
  name: string; // copied from the menu: "Paneer Tikka"
  /** Chosen size, for showing on the bill. Its price is already in unitPricePaise. */
  variant?: { id: Id; name: string };
  /** Price of one item (the variant's price if one was chosen), without extras. */
  unitPricePaise: Paise;
  addOns: ChosenOption[];
  modifiers: ChosenOption[];
  quantity: number; // whole number, at least 1
  note?: string; // "less oil"
  status: OrderItemStatus;
};

/**
 * A discount on the whole order.
 * Percentages use basis points: 1% = 100, 12.5% = 1250. Whole numbers again,
 * so even a fractional percentage is exact.
 */
export type Discount =
  | { kind: "percent"; basisPoints: number; reason?: string }
  | { kind: "fixed"; amountPaise: Paise; reason?: string };

export type DeliveryDetails = {
  customerName: string;
  phone: string;
  address: string;
};

export type Order = {
  id: Id;
  number: number; // short number staff say out loud: "Order 42"
  type: OrderType;
  status: OrderStatus;
  tableIds: Id[]; // dine-in only; more than one when tables are merged
  delivery?: DeliveryDetails; // delivery only
  items: OrderItem[];
  discount?: Discount;
  createdBy: Id; // staff id
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};
