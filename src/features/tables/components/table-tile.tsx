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
import { TABLE_BOX, gridPlacement } from "./floor-canvas";
import { useTaxRate } from "@/stores/settings-store";

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
 * One table on the floor plan: a rounded rectangle, the same size for every
 * table. The whole tile is one big button (easy to hit). Its border is
 * colored by status, and the status is written in words too (not color alone).
 */
export function TableTile({
  table,
  orders,
  joinedToName,
  now,
  onSelect,
}: TableTileProps) {
  const taxRate = useTaxRate(); // GST from Settings
  const style = TABLE_STATUS_STYLE[table.status];
  const summary = orders.length > 0 ? summarizeOrders(orders, taxRate) : undefined;

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
      className={cn(
        TABLE_BOX,
        "transition-transform hover:-translate-y-0.5 motion-reduce:hover:translate-y-0",
        style.border,
        joinedToName && "border-dashed",
      )}
    >
      <span className="flex items-start justify-between gap-1">
        <span className="font-display text-lg leading-none font-semibold">
          {table.name}
        </span>
        <span
          className="flex items-center gap-0.5 text-xs text-muted-foreground"
          aria-hidden="true"
        >
          <Users className="size-3" /> {table.seats}
        </span>
      </span>

      <span className="flex min-w-0 flex-col text-xs leading-tight" aria-hidden="true">
        {joinedToName ? (
          <span className="flex items-center gap-1 font-semibold">
            <Link2 className="size-3" /> with {joinedToName}
          </span>
        ) : summary ? (
          <>
            <span className="truncate text-sm font-semibold tabular-nums">
              {formatRupees(summary.totalPaise)}
            </span>
            <span className="truncate text-muted-foreground">
              {summary.label}
              {now !== null && summary.since && ` · ${timeSince(summary.since, now)}`}
            </span>
          </>
        ) : (
          <span className="flex items-center gap-1.5 font-semibold">
            <span className={cn("size-2 shrink-0 rounded-full", style.dot)} />
            {TABLE_STATUS_LABEL[table.status]}
          </span>
        )}
      </span>
    </button>
  );
}
