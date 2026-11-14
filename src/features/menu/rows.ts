import { paiseToText } from "@/domain/money";
import type { PriceRow } from "@/lib/validation/catalog";
import type { PricedInput } from "@/stores/menu-store";
import type { Id, Paise } from "@/types/common";

/** Saved sizes/options → editable rows (prices back to typed text, ids kept). */
export function toRows(list: { id: Id; name: string; pricePaise: Paise }[]): PriceRow[] {
  return list.map((entry) => ({
    key: entry.id,
    id: entry.id,
    name: entry.name,
    price: paiseToText(entry.pricePaise),
  }));
}

/** Checked rows (price already in paise) → what the store saves. */
export function fromRows(rows: { id?: Id; name: string; price: Paise }[]): PricedInput[] {
  return rows.map(({ id, name, price }) => ({ id, name, pricePaise: price }));
}
