import type { Id, Paise } from "@/types/common";
import type { AddOn, MenuItem, ModifierGroup } from "@/types/menu";
import type { ChosenOption, OrderItem } from "@/types/order";
import { DomainError } from "../errors";
import { sumPaise } from "../money";

/**
 * WHAT THE GUEST PICKED for one dish, before it becomes an order line.
 *
 * Rules (checked against the menu at the moment of ordering):
 *  - The dish must be available (not sold out).
 *  - A dish with sizes needs exactly one size.
 *  - Each option group needs between minSelect and maxSelect choices
 *    ("Spice level: choose 1", "Dietary requests: up to 2").
 *  - Only add-ons and options the dish really offers.
 *  - Quantity: a whole number from 1 to 99.
 */
export type ItemChoices = {
  variantId?: Id;
  addOnIds: Id[];
  /** For each option group of the dish: the chosen option ids. */
  optionIds: Record<Id, Id[]>;
  quantity: number;
  note?: string;
};

/** The shared add-ons and option groups (from the menu store). */
export type Catalog = { addOns: AddOn[]; modifierGroups: ModifierGroup[] };

export const MAX_QUANTITY = 99;

/** The option groups this dish asks, in the dish's order (deleted ones skipped). */
export function groupsFor(item: MenuItem, catalog: Catalog): ModifierGroup[] {
  return item.modifierGroupIds
    .map((id) => catalog.modifierGroups.find((group) => group.id === id))
    .filter((group): group is ModifierGroup => group !== undefined);
}

/** The add-ons this dish offers (deleted ones skipped). */
export function addOnsFor(item: MenuItem, catalog: Catalog): AddOn[] {
  return item.addOnIds
    .map((id) => catalog.addOns.find((addOn) => addOn.id === id))
    .filter((addOn): addOn is AddOn => addOn !== undefined);
}

/**
 * Everything wrong with these choices, one message per place:
 * { size: "Choose a size.", "mod-spice": "Choose spice level." }.
 * An empty object means the dish can be added.
 */
export function findChoiceProblems(
  item: MenuItem,
  choices: ItemChoices,
  catalog: Catalog,
): Record<string, string> {
  const problems: Record<string, string> = {};

  if (!item.isAvailable) problems.item = `${item.name} is sold out.`;

  if (
    item.variants.length > 0 &&
    !item.variants.some((v) => v.id === choices.variantId)
  ) {
    problems.size = "Choose a size.";
  }

  for (const group of groupsFor(item, catalog)) {
    const chosen = choices.optionIds[group.id] ?? [];
    const valid = chosen.filter((id) => group.options.some((o) => o.id === id));
    if (valid.length !== chosen.length || new Set(chosen).size !== chosen.length) {
      problems[group.id] = `Choose again for ${group.name.toLowerCase()}.`;
    } else if (chosen.length < group.minSelect) {
      problems[group.id] =
        group.maxSelect === 1
          ? `Choose a ${group.name.toLowerCase()}.`
          : `Choose at least ${group.minSelect} for ${group.name.toLowerCase()}.`;
    } else if (chosen.length > group.maxSelect) {
      problems[group.id] =
        `Choose up to ${group.maxSelect} for ${group.name.toLowerCase()}.`;
    }
  }

  const offered = new Set(addOnsFor(item, catalog).map((a) => a.id));
  if (choices.addOnIds.some((id) => !offered.has(id))) {
    problems.addOns = `That extra isn't offered with ${item.name}.`;
  }

  if (
    !Number.isInteger(choices.quantity) ||
    choices.quantity < 1 ||
    choices.quantity > MAX_QUANTITY
  ) {
    problems.quantity = `Quantity must be from 1 to ${MAX_QUANTITY}.`;
  }

  return problems;
}

/** Price of ONE of this dish with these choices (for the live "Add · ₹340" button). */
export function unitPriceWithChoices(
  item: MenuItem,
  choices: Pick<ItemChoices, "variantId" | "addOnIds" | "optionIds">,
  catalog: Catalog,
): Paise {
  const variant = item.variants.find((v) => v.id === choices.variantId);
  const base = variant?.pricePaise ?? item.pricePaise;
  const addOns = addOnsFor(item, catalog).filter((a) => choices.addOnIds.includes(a.id));
  const options = groupsFor(item, catalog).flatMap((group) =>
    group.options.filter((o) => (choices.optionIds[group.id] ?? []).includes(o.id)),
  );
  return base + sumPaise([...addOns, ...options].map((extra) => extra.pricePaise));
}

const copy = ({ id, name, pricePaise }: ChosenOption): ChosenOption => ({
  id,
  name,
  pricePaise,
});

/**
 * Turns valid choices into an order line. Names and prices are COPIED from
 * the menu now (Step 7): if the menu changes later, this line won't.
 * Throws the first problem if the choices aren't valid.
 */
export function buildOrderItem(
  item: MenuItem,
  choices: ItemChoices,
  catalog: Catalog,
  lineId: Id,
): OrderItem {
  const problems = Object.values(findChoiceProblems(item, choices, catalog));
  if (problems.length > 0) throw new DomainError(problems[0]!);

  const variant = item.variants.find((v) => v.id === choices.variantId);
  const note = choices.note?.trim();
  return {
    id: lineId,
    menuItemId: item.id,
    name: item.name,
    ...(variant ? { variant: { id: variant.id, name: variant.name } } : {}),
    unitPricePaise: variant?.pricePaise ?? item.pricePaise,
    addOns: addOnsFor(item, catalog)
      .filter((a) => choices.addOnIds.includes(a.id))
      .map(copy),
    modifiers: groupsFor(item, catalog).flatMap((group) =>
      group.options
        .filter((o) => (choices.optionIds[group.id] ?? []).includes(o.id))
        .map(copy),
    ),
    quantity: choices.quantity,
    ...(note ? { note } : {}),
    status: "active",
  };
}
