import type { ChosenOption, Order, OrderItem } from "@/types/order";
import type { RestaurantTable } from "@/types/table";

/** A fixed "now" so tests never depend on the real clock. */
export const NOW = "2026-11-13T12:00:00.000Z";

let nextId = 1;

/**
 * Builds an order item for tests with sensible defaults, so each test only
 * writes the parts it cares about:
 *   makeItem({ unitPricePaise: 18000, quantity: 2 })
 */
export function makeItem(overrides: Partial<OrderItem> = {}): OrderItem {
  const id = `item-${nextId++}`;
  return {
    id,
    menuItemId: `menu-${id}`,
    name: overrides.name ?? `Item ${id}`,
    unitPricePaise: 10000,
    addOns: [],
    modifiers: [],
    quantity: 1,
    status: "active",
    ...overrides,
  };
}

/** A dine-in order with one item, status "new", unless you override parts. */
export function makeOrder(overrides: Partial<Order> = {}): Order {
  const id = `order-${nextId++}`;
  const status = overrides.status ?? "new";
  return {
    id,
    number: 42,
    type: "dine-in",
    status,
    tableIds: [],
    items: [makeItem()],
    statusHistory: [{ status, at: NOW, by: "staff-1" }],
    createdBy: "staff-1",
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

/** A free 4-seat table named after its id, unless you override parts. */
export function makeTable(overrides: Partial<RestaurantTable> = {}): RestaurantTable {
  const id = overrides.id ?? `table-${nextId++}`;
  return {
    id,
    name: overrides.name ?? id.toUpperCase(),
    seats: 4,
    shape: "square",
    status: "available",
    x: 0,
    y: 0,
    ...overrides,
  };
}

export function option(name: string, pricePaise: number): ChosenOption {
  return { id: `opt-${name}`, name, pricePaise };
}

/**
 * A tiny, repeatable random number generator. Same seed → same numbers on
 * every run, so a failing "random" test can always be reproduced.
 */
export function seededRandom(seed: number) {
  let state = seed;
  return (maxExclusive: number) => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state % maxExclusive;
  };
}
