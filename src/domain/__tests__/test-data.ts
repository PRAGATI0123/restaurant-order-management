import type { ChosenOption, OrderItem } from "@/types/order";

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
    status: "pending",
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
