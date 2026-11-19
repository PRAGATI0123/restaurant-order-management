import { MENU_PHOTOS } from "@/mocks/data/menu-photos";
import type { MenuItem } from "@/types/menu";

/**
 * The photo to show for a dish: its own `imageUrl`, or — for a sample dish —
 * the sample photo. The fallback matters for menus saved on a device before a
 * photo was added: the saved dish has no `imageUrl`, but it should still look
 * the same as on a fresh device. Dishes added in the app have neither.
 */
export function dishPhoto(item: Pick<MenuItem, "id" | "imageUrl">): string | undefined {
  return item.imageUrl ?? MENU_PHOTOS[item.id]?.src;
}
