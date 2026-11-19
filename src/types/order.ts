import type { Id, IsoDateTime, Paise } from "./common";

export type OrderType = "dine-in" | "takeaway" | "delivery";

/**
 * Where the whole order is. The kitchen works on the order as one ticket.
 * Which moves are allowed: domain/orders/order-state-machine.ts
 */
export type OrderStatus = "new" | "preparing" | "ready" | "served" | "paid" | "cancelled";

/** An item is either still part of the order, or cancelled (and not charged). */
export type OrderItemStatus = "active" | "cancelled";

/** One entry in the order's timeline: "Preparing, at 14:05, by Pragati". */
export type OrderStatusChange = {
  status: OrderStatus;
  at: IsoDateTime;
  by: Id; // staff id
};

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
  cancelReason?: string; // set when status is "cancelled"
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
  customerName?: string; // takeaway: the name called out at the counter
  delivery?: DeliveryDetails; // delivery only
  items: OrderItem[];
  discount?: Discount;
  /** Every status the order has been in, oldest first. Starts with "new". */
  statusHistory: OrderStatusChange[];
  cancelReason?: string; // set when status is "cancelled"
  splitFromNumber?: number; // set when this order was split off another one
  createdBy: Id; // staff id
  createdAt: IsoDateTime;
  updatedAt: IsoDateTime;
};
