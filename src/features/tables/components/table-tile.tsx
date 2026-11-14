"use client";

import { Link2, Users } from "lucide-react";
import { TABLE_STATUS_LABEL } from "@/domain/tables/table-state-machine";
import { formatRupees } from "@/domain/money";
import { cn } from "@/lib/utils/cn";
import { timeSince } from "@/lib/utils/time";
import type { Order } from "@/types/order";
import type { RestaurantTable } from "@/types/table";
import { summarizeOrder } from "../order-summary";
import { TABLE_STATUS_STYLE } from "../table-style";
import { gridPlacement } from "./floor-canvas";

type TableTileProps = {
  table: RestaurantTable;
  order?: Order;
  /** Name of the main table, when this one is joined to it. */
  joinedToName?: string;
  now: number | null;
  onSelect: (table: RestaurantTable) => void;
};

/**
 * One table on the floor plan. The whole tile is one big button (easy to hit),
 * colored by status, and says the status in words too (not color alone).
 */
export function TableTile({ table, order, joinedToName, now, onSelect }: TableTileProps) {
  const style = TABLE_STATUS_STYLE[table.status];
  const summary = order && summarizeOrder(order);

  const details = joinedToName
    ? `Joined to ${joinedToName}`
    : order && summary
      ? `Order ${order.number}, ${summary.itemCount} items, ${formatRupees(summary.totalPaise)}`
      : TABLE_STATUS_LABEL[table.status];

  return (
    <button
      type="button"
      onClick={() => onSelect(table)}
      style={gridPlacement(table)}
      aria-label={`Table ${table.name}, ${table.seats} seats, ${details}`}
      className={cn(
        "flex flex-col justify-between overflow-hidden border-2 bg-surface p-3 text-left shadow-sm transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        table.shape === "round" ? "rounded-[2rem]" : "rounded-xl",
        style.border,
        joinedToName && "border-dashed",
      )}
    >
      <span className="flex items-start justify-between gap-2">
        <span className="font-display text-xl font-semibold">{table.name}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="size-3.5" aria-hidden="true" /> {table.seats}
        </span>
      </span>

      <span className="flex flex-col gap-0.5 text-xs" aria-hidden="true">
        {joinedToName ? (
          <span className="flex items-center gap-1 font-semibold">
            <Link2 className="size-3.5" /> with {joinedToName}
          </span>
        ) : order && summary ? (
          <>
            <span className="truncate text-muted-foreground">
              #{order.number}
              {now !== null && ` · ${timeSince(order.createdAt, now)}`}
            </span>
            <span className="truncate text-sm font-semibold tabular-nums">
              {formatRupees(summary.totalPaise)}
            </span>
          </>
        ) : (
          <span className="flex items-center gap-1.5 font-semibold">
            <span className={cn("size-2 rounded-full", style.dot)} />
            {TABLE_STATUS_LABEL[table.status]}
          </span>
        )}
      </span>
    </button>
  );
}
