import type { Role } from "@/types/staff";
import { can, type Action } from "./permissions";

/**
 * WHICH PAGES EACH ROLE MAY OPEN
 * Every page needs one permission from permissions.ts. The most specific
 * address wins: /tables/editor needs "floorPlan.edit", other /tables pages
 * need "tables.view".
 */
const PAGE_ACTIONS: [prefix: string, action: Action][] = [
  ["/tables/editor", "floorPlan.edit"],
  ["/orders/new", "order.create"],
  ["/menu/categories", "menu.edit"],
  ["/menu/modifiers", "menu.edit"],
  ["/dashboard", "dashboard.view"],
  ["/tables", "tables.view"],
  ["/orders", "orders.view"],
  ["/kitchen", "kitchen.view"],
  ["/menu", "menu.view"],
  ["/billing", "billing.view"],
  ["/reports", "reports.view"],
  ["/settings", "settings.view"],
];

const matches = (path: string, prefix: string) =>
  path === prefix || path.startsWith(`${prefix}/`);

/** The permission a page needs, or undefined for a page anyone logged in may open. */
export function actionForPath(path: string): Action | undefined {
  // Splitting has its own page under each order: /orders/order-102/split
  if (/^\/orders\/[^/]+\/split$/.test(path)) return "order.split";
  return PAGE_ACTIONS.find(([prefix]) => matches(path, prefix))?.[1];
}

export function canOpen(role: Role, path: string): boolean {
  const action = actionForPath(path);
  return action === undefined || can(role, action);
}

/** Where each role lands after logging in: its most useful page. */
const HOME_ORDER = ["/dashboard", "/tables", "/kitchen", "/orders", "/billing"];

export function homeFor(role: Role): string {
  return HOME_ORDER.find((path) => canOpen(role, path)) ?? "/settings";
}
