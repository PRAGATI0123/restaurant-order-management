/**
 * A new unique id with a readable prefix: newId("item") → "item_3f1c9a2e-…".
 * crypto.randomUUID() is built into every modern browser and Node, and the
 * chance of two ids ever clashing is effectively zero.
 */
export function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}
