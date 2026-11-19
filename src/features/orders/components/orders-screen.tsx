"use client";

import { ChevronRight, ClipboardList, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  DEFAULT_ORDER_FILTERS,
  countOrders,
  filterOrders,
  type OrderListFilters,
  type OrderStatusFilter,
} from "@/domain/orders/order-filters";
import { ORDER_STATUS_LABEL } from "@/domain/orders/order-state-machine";
import { formatRupees } from "@/domain/money";
import { useNow } from "@/lib/hooks/use-now";
import { timeSince } from "@/lib/utils/time";
import { useServiceStore } from "@/stores/service-store";
import type { OrderType } from "@/types/order";
import { summarizeOrder } from "@/features/tables/order-summary";
import {
  ORDER_STATUS_BADGE,
  ORDER_TYPE_LABEL,
  itemsPreview,
  orderWhere,
} from "../order-display";
import { useTaxRate } from "@/stores/settings-store";
import { useCan } from "@/features/auth/hooks";

const STATUS_CHIPS: { value: OrderStatusFilter; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "new", label: "New" },
  { value: "preparing", label: "Preparing" },
  { value: "ready", label: "Ready" },
  { value: "served", label: "Served" },
  { value: "paid", label: "Paid" },
  { value: "cancelled", label: "Cancelled" },
  { value: "all", label: "All" },
];

/** Every order, newest first, with status and type filters and search. */
export function OrdersScreen() {
  const can = useCan(); // hide what this role can't do (the store checks again)
  const taxRate = useTaxRate(); // GST from Settings
  const orders = useServiceStore((s) => s.orders);
  const tables = useServiceStore((s) => s.tables);
  const now = useNow();
  const [filters, setFilters] = useState<OrderListFilters>(DEFAULT_ORDER_FILTERS);

  const tableName = useMemo(() => {
    const names = new Map(tables.map((t) => [t.id, t.name]));
    return (id: string) => names.get(id);
  }, [tables]);

  const counts = useMemo(() => countOrders(orders), [orders]);
  const visible = useMemo(
    () =>
      filterOrders(orders, filters, (order) =>
        [orderWhere(order, tableName), order.delivery?.phone ?? ""].join(" "),
      ),
    [orders, filters, tableName],
  );
  const filtered =
    filters.status !== DEFAULT_ORDER_FILTERS.status ||
    filters.type !== "all" ||
    filters.query !== "";

  return (
    <>
      <PageHeader
        title="Orders"
        description={`${counts.open} open · ${counts.all} today`}
        actions={
          can("order.create") && (
            <ButtonLink href="/orders/new" size="lg">
              <Plus aria-hidden="true" /> New order
            </ButtonLink>
          )
        }
      />

      <div className="mb-4 flex flex-col gap-3">
        <ChipGroup<OrderStatusFilter>
          label="Status"
          layout="scroll"
          value={filters.status}
          onChange={(status) => setFilters((f) => ({ ...f, status }))}
          options={STATUS_CHIPS.map((chip) => ({ ...chip, count: counts[chip.value] }))}
        />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ChipGroup<OrderType | "all">
            label="Order type"
            value={filters.type}
            onChange={(type) => setFilters((f) => ({ ...f, type }))}
            options={[
              { value: "all", label: "All types" },
              { value: "dine-in", label: "Dine-in" },
              { value: "takeaway", label: "Takeaway" },
              { value: "delivery", label: "Delivery" },
            ]}
          />
          <div className="relative sm:w-72">
            <Search
              className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={filters.query}
              onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
              placeholder="Order no., table or name"
              aria-label="Search orders"
              className="pl-12"
            />
          </div>
        </div>
      </div>

      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        {visible.length} {visible.length === 1 ? "order" : "orders"}
      </p>

      {visible.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title={filtered ? "No orders match" : "No open orders"}
          description={
            filtered ? "Try another filter or search." : "New orders will appear here."
          }
          className="bg-surface"
          action={
            filtered ? (
              <Button
                variant="secondary"
                onClick={() => setFilters(DEFAULT_ORDER_FILTERS)}
              >
                Clear filters
              </Button>
            ) : (
              can("order.create") && (
                <ButtonLink href="/orders/new">
                  <Plus aria-hidden="true" /> New order
                </ButtonLink>
              )
            )
          }
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((order) => {
            const summary = summarizeOrder(order, taxRate);
            return (
              <li key={order.id}>
                <Link
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-primary"
                >
                  <span className="flex w-16 shrink-0 flex-col">
                    <span className="font-display text-2xl font-semibold">
                      #{order.number}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {timeSince(order.createdAt, now)}
                    </span>
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-semibold">
                      {orderWhere(order, tableName)}
                      <span className="font-normal text-muted-foreground">
                        {" "}
                        · {ORDER_TYPE_LABEL[order.type]}
                        {order.splitFromNumber &&
                          ` · split from #${order.splitFromNumber}`}
                      </span>
                    </span>
                    <span className="truncate text-sm text-muted-foreground">
                      {itemsPreview(order) || "All items cancelled"}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className="font-semibold tabular-nums">
                      {formatRupees(summary.totalPaise)}
                    </span>
                    <Badge variant={ORDER_STATUS_BADGE[order.status]}>
                      {ORDER_STATUS_LABEL[order.status]}
                    </Badge>
                  </span>
                  <ChevronRight
                    className="hidden size-5 text-muted-foreground sm:block"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
