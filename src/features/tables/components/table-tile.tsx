"use client";

import { Link2, Users } from "lucide-react";
import { formatRupees } from "@/domain/money";
import { TABLE_STATUS_LABEL } from "@/domain/tables/table-state-machine";
import { cn } from "@/lib/utils/cn";
import { timeSince } from "@/lib/utils/time";
import type { Order } from "@/types/order";
import type { RestaurantTable } from "@/types/table";
import { summarizeOrders } from "../order-summary";
import { TABLE_STATUS_STYLE } from "../table-style";
import { TableCircle, gridPlacement } from "./floor-canvas";

type TableTileProps = {
  table: RestaurantTable;
  /** Every open order at this table (usually one; more after a split or a second round). */
  orders: Order[];
  /** Name of the main table, when this one is joined to it. */
  joinedToName?: string;
  now: number | null;
  onSelect: (table: RestaurantTable) => void;
};

/**
 * One round table on the floor plan. The whole space is one button (easy to
 * hit). The circle's border is colored by status, and the status is written
 * in words too (not color alone).
 */
export function TableTile({
  table,
  orders,
  joinedToName,
  now,
  onSelect,
}: TableTileProps) {
  const style = TABLE_STATUS_STYLE[table.status];
  const summary = orders.length > 0 ? summarizeOrders(orders) : undefined;

  const details = joinedToName
    ? `Joined to ${joinedToName}`
    : summary
      ? `${orders.length === 1 ? "Order" : "Orders"} ${summary.label}, ${summary.itemCount} ${summary.itemCount === 1 ? "item" : "items"}, ${formatRupees(summary.totalPaise)}`
      : TABLE_STATUS_LABEL[table.status];

  return (
    <button
      type="button"
      onClick={() => onSelect(table)}
      style={gridPlacement(table)}
      aria-label={`Table ${table.name}, ${table.seats} seats, ${details}`}
      // [container-type:size] lets the circle size itself to this space
      className="group [container-type:size] flex items-center justify-center rounded-full focus-visible:outline-none"
    >
      <TableCircle
        className={cn(
          "transition-transform group-hover:-translate-y-0.5 group-focus-visible:ring-4 group-focus-visible:ring-ring motion-reduce:group-hover:translate-y-0",
          style.border,
          joinedToName && "border-dashed",
        )}
      >
        <span className="font-display text-lg leading-none font-semibold">
          {table.name}
        </span>
        <span
          className="flex items-center gap-0.5 text-[11px] text-muted-foreground"
          aria-hidden="true"
        >
          <Users className="size-3" /> {table.seats}
        </span>
        <span
          className="flex flex-col items-center text-[11px] leading-tight"
          aria-hidden="true"
        >
          {joinedToName ? (
            <span className="flex items-center gap-1 font-semibold">
              <Link2 className="size-3" /> {joinedToName}
            </span>
          ) : summary ? (
            <>
              <span className="font-semibold tabular-nums">
                {formatRupees(summary.totalPaise)}
              </span>
              <span className="text-muted-foreground">
                {summary.label}
                {now !== null && summary.since && ` · ${timeSince(summary.since, now)}`}
              </span>
            </>
          ) : (
            <span className="flex items-center gap-1 font-semibold">
              <span className={cn("size-2 rounded-full", style.dot)} />
              {TABLE_STATUS_LABEL[table.status]}
            </span>
          )}
        </span>
      </TableCircle>
    </button>
  );
}
