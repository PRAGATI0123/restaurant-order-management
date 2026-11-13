"use client";

import { Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { startingPrice } from "@/domain/menu/menu-rules";
import { formatPrice } from "@/domain/money";
import { cn } from "@/lib/utils/cn";
import type { MenuItem } from "@/types/menu";
import { VegMark } from "./veg-mark";

/** "Paneer Butter Masala" → "PB". Shown in the tile until items have photos. */
function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}

/** "2 sizes · Add-ons · Options", so staff know the item asks questions. */
function choicesSummary(item: MenuItem): string | undefined {
  const parts = [
    item.variants.length > 0 && `${item.variants.length} sizes`,
    item.addOns.length > 0 && "Add-ons",
    item.modifierGroups.length > 0 && "Options",
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

type MenuItemCardProps = {
  item: MenuItem;
  categoryName: string;
  onToggleAvailable: (item: MenuItem, isAvailable: boolean) => void;
  onEdit: (item: MenuItem) => void;
};

export function MenuItemCard({
  item,
  categoryName,
  onToggleAvailable,
  onEdit,
}: MenuItemCardProps) {
  const choices = choicesSummary(item);
  const soldOut = !item.isAvailable;

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      {/* Picture area. Sold-out items are greyed so they stand out at a glance. */}
      <div
        className={cn(
          "relative flex aspect-[4/3] items-center justify-center bg-surface-muted",
          soldOut && "grayscale",
        )}
      >
        <span
          className={cn(
            "font-display text-4xl font-semibold text-wood",
            soldOut && "opacity-40",
          )}
          aria-hidden="true"
        >
          {initials(item.name)}
        </span>
        <VegMark isVeg={item.isVeg} className="absolute top-3 left-3" />
        {soldOut && (
          <Badge variant="danger" className="absolute top-3 right-3">
            Sold out
          </Badge>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-1 p-4">
        <h3 className="leading-tight font-semibold">{item.name}</h3>
        <p className="text-sm text-muted-foreground">{categoryName}</p>
        <p className="mt-auto pt-2 text-lg font-semibold tabular-nums">
          {item.variants.length > 0 && (
            <span className="text-sm font-normal text-muted-foreground">from </span>
          )}
          {formatPrice(startingPrice(item))}
        </p>
        {choices && <p className="text-xs text-muted-foreground">{choices}</p>}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border py-1 pr-1 pl-3">
        <div className="flex items-center gap-2">
          <Switch
            checked={item.isAvailable}
            onCheckedChange={(checked) => onToggleAvailable(item, checked)}
            label={`${item.name} available`}
          />
          <span
            className={cn("text-sm", soldOut ? "text-danger" : "text-muted-foreground")}
          >
            {soldOut ? "Sold out" : "Available"}
          </span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onEdit(item)}
          aria-label={`Edit ${item.name}`}
        >
          <Pencil aria-hidden="true" />
        </Button>
      </div>
    </Card>
  );
}
