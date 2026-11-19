import { MENU_PHOTOS } from "@/mocks/data/menu-photos";
import type { MenuItem } from "@/types/menu";
import { dishPhoto } from "../dish-photo";

/**
 * Who took each sample dish photo, and under which licence. The photos are
 * free to reuse WITH credit (Creative Commons), so the credit lives right
 * here on the Menu page, folded away until someone opens it.
 */
export function PhotoCredits({ items }: { items: MenuItem[] }) {
  const credited = items.filter((item) => dishPhoto(item) && MENU_PHOTOS[item.id]);
  if (credited.length === 0) return null;

  return (
    <details className="mt-8 text-sm text-muted-foreground">
      <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold">
        Photo credits ({credited.length})
      </summary>
      <p className="mb-2">
        Sample dish photos from Wikimedia Commons and Flickr (via Openverse), used under
        their free licences.
      </p>
      <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
        {credited.map((item) => {
          const photo = MENU_PHOTOS[item.id]!;
          return (
            <li key={item.id}>
              <span className="font-semibold text-foreground">{item.name}</span>:{" "}
              <a
                href={photo.source}
                target="_blank"
                rel="noreferrer noopener"
                className="underline underline-offset-2 hover:text-foreground"
              >
                photo by {photo.author}
              </a>
              , {photo.licence}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
