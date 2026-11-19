"use client";

import { Plus, Search, SearchX } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ChipGroup } from "@/components/ui/chip-group";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { sortCategories } from "@/domain/menu/catalog-rules";
import {
  NO_MENU_FILTERS,
  filterMenuItems,
  startingPrice,
} from "@/domain/menu/menu-rules";
import { formatPrice } from "@/domain/money";
import { cn } from "@/lib/utils/cn";
import { useCartStore } from "@/stores/cart-store";
import { useMenuStore } from "@/stores/menu-store";
import type { MenuItem } from "@/types/menu";
import type { OrderItem } from "@/types/order";
import { VegMark } from "@/features/menu/components/veg-mark";
import Image from "next/image";

/**
 * The menu for taking orders: search, category tabs and big dish tiles.
 * Sold-out dishes are shown (so staff can tell the guest) but can't be tapped.
 * A small number on a tile shows how many are already in this order.
 */
export function MenuBrowser({
  onPick,
  lines: linesOverride,
}: {
  onPick: (item: MenuItem) => void;
  /** Lines to count on the tiles. Default: the cart. (Adding to an existing order passes its lines.) */
  lines?: OrderItem[];
}) {
  const items = useMenuStore((s) => s.items);
  const categories = useMenuStore((s) => s.categories);
  const cartLines = useCartStore((s) => s.lines);
  const lines = linesOverride ?? cartLines;

  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState<string>("all");

  const visible = useMemo(
    () => filterMenuItems(items, { ...NO_MENU_FILTERS, query, categoryId }),
    [items, query, categoryId],
  );
  const inCart = useMemo(() => {
    const counts = new Map<string, number>();
    for (const line of lines) {
      counts.set(line.menuItemId, (counts.get(line.menuItemId) ?? 0) + line.quantity);
    }
    return counts;
  }, [lines]);

  return (
    <section aria-labelledby="menu-heading" className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 id="menu-heading" className="font-display text-2xl font-semibold">
          Menu
        </h2>
        <div className="relative sm:w-72">
          <Search
            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search dishes…"
            aria-label="Search dishes"
            className="pl-12"
          />
        </div>
      </div>

      <ChipGroup
        label="Category"
        layout="scroll"
        value={categoryId}
        onChange={setCategoryId}
        options={[
          { value: "all", label: "All" },
          ...sortCategories(categories).map((c) => ({ value: c.id, label: c.name })),
        ]}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title="No dishes match"
          description="Try another word."
        />
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {visible.map((item) => {
            const count = inCart.get(item.id) ?? 0;
            const soldOut = !item.isAvailable;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  disabled={soldOut}
                  onClick={() => onPick(item)}
                  aria-label={`${item.name}, ${formatPrice(startingPrice(item))}${soldOut ? ", sold out" : ""}${count > 0 ? `, ${count} in order` : ""}`}
                  className={cn(
                    "relative flex h-full min-h-28 w-full flex-col gap-2 rounded-2xl border-2 bg-surface p-3 text-left transition-colors",
                    count > 0
                      ? "border-primary"
                      : "border-border hover:border-primary/60",
                    soldOut && "cursor-not-allowed opacity-50",
                  )}
                >
                  {item.imageUrl && (
                    // A small photo helps find the dish fast; decorative (the name is below).
                    <span className="relative -mx-3 -mt-3 mb-1 block aspect-[16/9] overflow-hidden rounded-t-[14px]">
                      <Image
                        src={item.imageUrl}
                        alt=""
                        fill
                        sizes="(min-width: 1280px) 20vw, (min-width: 640px) 30vw, 50vw"
                        className="object-cover"
                      />
                    </span>
                  )}
                  <span className="flex items-start justify-between gap-2">
                    <VegMark isVeg={item.isVeg} />
                    {count > 0 && (
                      <span className="flex size-7 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {count}
                      </span>
                    )}
                  </span>
                  <span className="leading-tight font-semibold">{item.name}</span>
                  <span className="mt-auto flex items-center justify-between gap-2">
                    <span className="font-semibold tabular-nums">
                      {item.variants.length > 0 && (
                        <span className="text-xs font-normal text-muted-foreground">
                          from{" "}
                        </span>
                      )}
                      {formatPrice(startingPrice(item))}
                    </span>
                    {soldOut ? (
                      <Badge variant="danger">Sold out</Badge>
                    ) : (
                      <Plus className="size-5 text-primary" aria-hidden="true" />
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
