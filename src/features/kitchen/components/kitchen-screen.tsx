"use client";

import { Ban, ChefHat } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  KITCHEN_COLUMNS,
  KITCHEN_NEXT,
  allDayCounts,
  buildKitchenBoard,
  kitchenSummary,
  type KitchenColumn,
  type KitchenTicket as KitchenTicketOrder,
} from "@/domain/kitchen/kitchen-board";
import { ORDER_STATUS_LABEL } from "@/domain/orders/order-state-machine";
import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils/cn";
import { tryAction } from "@/lib/utils/try-action";
import { useMenuStore } from "@/stores/menu-store";
import { useServiceStore } from "@/stores/service-store";
import type { Id } from "@/types/common";
import { orderWhere } from "@/features/orders/order-display";
import { KitchenTicket } from "./kitchen-ticket";
import { SoldOutSheet } from "./sold-out-sheet";

const COLUMN_STYLE: Record<KitchenColumn, { title: string; dot: string; empty: string }> =
  {
    new: { title: "New", dot: "bg-primary", empty: "No new tickets." },
    preparing: { title: "Preparing", dot: "bg-accent", empty: "Nothing on the stove." },
    ready: { title: "Ready", dot: "bg-success", empty: "Nothing waiting at the pass." },
  };

/**
 * THE KITCHEN DISPLAY
 * Three columns (New → Preparing → Ready). Each ticket shows a live timer and
 * one big button that moves it to the next column. Above the board:
 * how many tickets are late, and the "to cook now" count of every dish.
 */
export function KitchenScreen() {
  const orders = useServiceStore((s) => s.orders);
  const tables = useServiceStore((s) => s.tables);
  const setOrderStatus = useServiceStore((s) => s.setOrderStatus);
  const soldOutCount = useMenuStore((s) => s.items.filter((i) => !i.isAvailable).length);
  const now = useNow(1000); // ticket timers tick every second

  const [soldOut, setSoldOut] = useState({ open: false, key: 0 });

  const board = useMemo(() => buildKitchenBoard(orders), [orders]);
  const toCook = useMemo(() => allDayCounts(orders), [orders]);
  const summary = now === null ? undefined : kitchenSummary(board, new Date(now));
  const tableName = (id: Id) => tables.find((t) => t.id === id)?.name;
  const ticketCount = KITCHEN_COLUMNS.reduce((sum, c) => sum + board[c].length, 0);

  function advance(order: KitchenTicketOrder) {
    const to = KITCHEN_NEXT[order.status];
    tryAction(() => {
      setOrderStatus(order.id, to);
      toast.success(`Order ${order.number}: ${ORDER_STATUS_LABEL[to]}`);
    });
  }

  return (
    <>
      <PageHeader
        title="Kitchen Display"
        description="Tap a ticket's button to move it along. The oldest ticket is always on top."
        actions={
          <Button
            variant="secondary"
            onClick={() => setSoldOut((s) => ({ open: true, key: s.key + 1 }))}
          >
            <Ban aria-hidden="true" /> Sold out
            {soldOutCount > 0 && (
              <Badge variant="danger">
                {soldOutCount}
                <span className="sr-only">
                  {soldOutCount === 1 ? " dish" : " dishes"} sold out now
                </span>
              </Badge>
            )}
          </Button>
        }
      />

      {/* The numbers that matter at a glance. Read out only when they change. */}
      <div className="mb-4 flex flex-wrap items-center gap-2" aria-live="polite">
        {summary ? (
          <>
            <Badge variant="neutral" className="text-sm">
              {summary.toCook} to cook
            </Badge>
            {summary.warning > 0 && (
              <Badge variant="accent" className="text-sm">
                {summary.warning} getting late
              </Badge>
            )}
            {summary.late > 0 && (
              <Badge variant="danger" className="text-sm">
                {summary.late} late
              </Badge>
            )}
            <Badge variant="success" className="text-sm">
              {summary.ready} ready to serve
            </Badge>
          </>
        ) : (
          <span className="h-7" />
        )}
      </div>

      {toCook.length > 0 && (
        <section
          aria-labelledby="to-cook-title"
          className="mb-4 rounded-2xl border border-border bg-surface p-4"
        >
          <h2
            id="to-cook-title"
            className="mb-2 text-sm font-semibold tracking-wide text-muted-foreground uppercase"
          >
            To cook now (all tickets)
          </h2>
          <ul className="flex flex-wrap gap-2">
            {toCook.map((line) => (
              <li
                key={line.key}
                className="rounded-lg bg-surface-muted px-3 py-1.5 font-semibold"
              >
                <span className="tabular-nums">{line.quantity} ×</span> {line.name}
              </li>
            ))}
          </ul>
        </section>
      )}

      {ticketCount === 0 ? (
        <EmptyState
          icon={ChefHat}
          title="All caught up"
          description="New orders appear here the moment a waiter sends them."
        />
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-3">
          {KITCHEN_COLUMNS.map((column) => {
            const style = COLUMN_STYLE[column];
            const tickets = board[column];
            return (
              <section
                key={column}
                aria-labelledby={`column-${column}`}
                className="flex flex-col gap-3 rounded-2xl bg-surface-muted/50 p-3"
              >
                <h2
                  id={`column-${column}`}
                  className="flex items-center gap-2 px-1 font-display text-xl font-semibold"
                >
                  <span
                    className={cn("size-3 rounded-full", style.dot)}
                    aria-hidden="true"
                  />
                  {style.title}
                  <Badge variant="outline" className="ml-auto">
                    {tickets.length}
                    <span className="sr-only">
                      {" "}
                      {tickets.length === 1 ? "ticket" : "tickets"}
                    </span>
                  </Badge>
                </h2>
                {tickets.length === 0 ? (
                  <p className="rounded-xl border-2 border-dashed border-border p-6 text-center text-muted-foreground">
                    {style.empty}
                  </p>
                ) : (
                  <ul className="flex flex-col gap-3">
                    {tickets.map((order) => (
                      <li key={order.id}>
                        <KitchenTicket
                          order={order}
                          where={orderWhere(order, tableName)}
                          now={now}
                          onAdvance={advance}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}

      <SoldOutSheet
        key={soldOut.key}
        open={soldOut.open}
        onClose={() => setSoldOut((s) => ({ ...s, open: false }))}
      />
    </>
  );
}
