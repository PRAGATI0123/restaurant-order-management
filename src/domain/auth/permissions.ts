import type { Role } from "@/types/staff";
import { DomainError } from "../errors";

/**
 * WHO MAY DO WHAT
 *
 * Every action in the app has a name. Each role gets a list of the actions it
 * may do. Screens hide buttons the user can't use, AND the action itself checks
 * again before saving: hiding a button is for convenience, checking is for safety.
 */
export const ACTIONS = [
  // pages
  "dashboard.view",
  "tables.view",
  "orders.view",
  "kitchen.view",
  "menu.view",
  "billing.view",
  "reports.view",
  "settings.view",
  // orders
  "order.create",
  "order.cancel",
  "order.split",
  "order.serve",
  "kitchen.updateStatus",
  // billing
  "bill.discount",
  "payment.take",
  // tables
  "table.changeStatus",
  "table.transfer",
  "table.merge",
  "floorPlan.edit",
  // menu
  "menu.edit",
  "menu.toggleAvailability",
  // admin
  "settings.edit",
] as const;

export type Action = (typeof ACTIONS)[number];

/** How each action reads in a sentence: "A waiter can't take payments." */
const ACTION_DESCRIPTION: Record<Action, string> = {
  "dashboard.view": "open the dashboard",
  "tables.view": "open the floor plan",
  "orders.view": "open orders",
  "kitchen.view": "open the kitchen display",
  "menu.view": "open the menu",
  "billing.view": "open billing",
  "reports.view": "open reports",
  "settings.view": "open settings",
  "order.create": "take new orders",
  "order.cancel": "cancel orders or items",
  "order.split": "split orders",
  "order.serve": "mark orders as served",
  "kitchen.updateStatus": "start or finish preparing orders",
  "bill.discount": "give discounts",
  "payment.take": "take payments",
  "table.changeStatus": "change a table's status",
  "table.transfer": "move orders between tables",
  "table.merge": "merge tables",
  "floorPlan.edit": "edit the floor plan",
  "menu.edit": "edit the menu",
  "menu.toggleAvailability": "mark items as sold out",
  "settings.edit": "change settings",
};

export const ROLE_LABEL: Record<Role, string> = {
  cashier: "Cashier",
  waiter: "Waiter",
  kitchen: "Kitchen staff",
  manager: "Manager",
};

/** The role as the start of a sentence: "A waiter can't…", "Kitchen staff can't…". */
const ROLE_SUBJECT: Record<Role, string> = {
  cashier: "A cashier",
  waiter: "A waiter",
  kitchen: "Kitchen staff",
  manager: "A manager",
};

/**
 * The permission table. To change who can do something, change it here, and
 * only here.
 */
const ROLE_ACTIONS: Record<Role, readonly Action[]> = {
  // Front of house: tables and orders, but no money and no cancelling.
  waiter: [
    "tables.view",
    "orders.view",
    "order.create",
    "order.split",
    "order.serve",
    "table.changeStatus",
    "table.transfer",
    "table.merge",
  ],
  // The counter: takes takeaway orders and all payments.
  cashier: [
    "dashboard.view",
    "tables.view",
    "orders.view",
    "billing.view",
    "order.create",
    "order.split",
    "order.cancel",
    "bill.discount",
    "payment.take",
  ],
  // The kitchen: tickets, and saying when something runs out.
  kitchen: [
    "kitchen.view",
    "menu.view",
    "kitchen.updateStatus",
    "menu.toggleAvailability",
  ],
  // The manager can do everything.
  manager: ACTIONS,
};

export function can(role: Role, action: Action): boolean {
  return ROLE_ACTIONS[role].includes(action);
}

/** For use right before saving: throws a readable error if the role may not. */
export function assertCan(role: Role, action: Action): void {
  if (!can(role, action)) {
    throw new DomainError(
      `${ROLE_SUBJECT[role]} can't ${ACTION_DESCRIPTION[action]}. Ask a manager.`,
    );
  }
}

/** Every action this role may do (for menus and settings screens). */
export function actionsFor(role: Role): readonly Action[] {
  return ROLE_ACTIONS[role];
}
