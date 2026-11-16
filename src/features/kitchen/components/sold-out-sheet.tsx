"use client";

import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { BottomSheet } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { VegMark } from "@/features/menu/components/veg-mark";
import { useMenuStore } from "@/stores/menu-store";
import type { MenuItem } from "@/types/menu";

/**
 * THE SOLD-OUT SHORTCUT
 * When the kitchen runs out of something, the cook switches it off right here,
 * without leaving the kitchen screen. Waiters then see "Sold out" and can't
 * add it to new orders (Step 9 rules). Switch it back on when it's restocked.
 *
 * The list stays in A–Z order while you switch things, so a row never jumps
 * away from under your finger.
 */
export function SoldOutSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const items = useMenuStore((s) => s.items);
  const categories = useMenuStore((s) => s.categories);
  const setAvailability = useMenuStore((s) => s.setAvailability);
  const [query, setQuery] = useState("");

  const soldOutCount = items.filter((i) => !i.isAvailable).length;
  const shown = useMemo(() => {
    const words = query.trim().toLowerCase();
    return items
      .filter((item) => item.name.toLowerCase().includes(words))
      .toSorted((a, b) => a.name.localeCompare(b.name));
  }, [items, query]);
  const categoryName = (id: string) => categories.find((c) => c.id === id)?.name ?? "";

  function change(item: MenuItem, isAvailable: boolean) {
    setAvailability(item.id, isAvailable);
    toast(
      isAvailable ? `${item.name} is available again` : `${item.name} marked sold out`,
      {
        action: { label: "Undo", onClick: () => setAvailability(item.id, !isAvailable) },
      },
    );
  }

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Sold out today"
      description="Switch a dish off when it runs out. Waiters can't add it to new orders until you switch it back on."
    >
      <div className="flex flex-col gap-3">
        <div className="relative">
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

        <p className="text-sm text-muted-foreground" aria-live="polite">
          {soldOutCount === 0
            ? "Everything is available."
            : `${soldOutCount} ${soldOutCount === 1 ? "dish is" : "dishes are"} sold out.`}
        </p>

        {shown.length === 0 ? (
          <p className="py-6 text-center text-muted-foreground">
            No dish matches “{query.trim()}”.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {shown.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-1.5">
                <VegMark isVeg={item.isVeg} />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{item.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {categoryName(item.categoryId)}
                  </p>
                </div>
                {!item.isAvailable && <Badge variant="danger">Sold out</Badge>}
                <Switch
                  checked={item.isAvailable}
                  onCheckedChange={(on) => change(item, on)}
                  label={`${item.name} available`}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </BottomSheet>
  );
}
