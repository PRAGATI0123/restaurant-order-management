"use client";

import { ChevronRight, ListOrdered, Receipt } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { EmptyState } from "@/components/ui/empty-state";
import { formatRupees } from "@/domain/money";
import { ORDER_STATUS_LABEL, isOrderOpen } from "@/domain/orders/order-state-machine";
import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils/cn";
import { timeSince } from "@/lib/utils/time";
import { useServiceStore } from "@/stores/service-store";
import type { Id } from "@/types/common";
import type { Order } from "@/types/order";
import { summarizeOrder } from "@/features/tables/order-summary";
import {
  ORDER_STATUS_BADGE,
  ORDER_TYPE_LABEL,
  orderWhere,
} from "@/features/orders/order-display";
import { useTaxRate } from "@/stores/settings-store";

/**
 * BILLING: every bill that is still open.
 *  - "Ready to pay": served orders, oldest first (those guests waited longest).
 *  - "Not served yet": still in the kitchen or waiting to be served. They're
 *    listed so the cashier can see what's coming, but checkout waits.
 */
export function BillingScreen() {
  const taxRate = useTaxRate(); // GST from Settings
  const orders = useServiceStore((s) => s.orders);
  const tables = useServiceStore((s) => s.tables);
  const now = useNow();
  const tableName = (id: Id) => tables.find((t) => t.id === id)?.name;

  const open = orders
    .filter((o) => isOrderOpen(o.status))
    .toSorted((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
  const toPay = open.filter((o) => o.status === "served");
  const coming = open.filter((o) => o.status !== "served");
  const outstanding = toPay.reduce(
    (sum, o) => sum + summarizeOrder(o, taxRate).totalPaise,
    0,
  );

  return (
    <>
      <PageHeader
        title="Billing"
        description="Bills waiting for payment. Tap one to open checkout."
        actions={
          <ButtonLink href="/billing/transactions" variant="secondary">
            <ListOrdered aria-hidden="true" /> Transactions
          </ButtonLink>
        }
      />

      {open.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No open bills"
          description="Every order has been paid. New bills appear here once food is served."
          className="bg-surface"
        />
      ) : (
        <div className="flex flex-col gap-8">
          <section aria-labelledby="to-pay-title">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="to-pay-title" className="font-display text-xl font-semibold">
                Ready to pay ({toPay.length})
              </h2>
              {toPay.length > 0 && (
                <p className="text-muted-foreground">
                  Outstanding:{" "}
                  <span className="font-semibold text-foreground tabular-nums">
                    {formatRupees(outstanding)}
                  </span>
                </p>
              )}
            </div>
            {toPay.length === 0 ? (
              <p className="rounded-2xl border-2 border-dashed border-border p-6 text-center text-muted-foreground">
                No served orders waiting for payment.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {toPay.map((order) => (
                  <BillRow
                    key={order.id}
                    order={order}
                    where={orderWhere(order, tableName)}
                    now={now}
                  />
                ))}
              </ul>
            )}
          </section>

          {coming.length > 0 && (
            <section aria-labelledby="coming-title">
              <h2 id="coming-title" className="mb-3 font-display text-xl font-semibold">
                Not served yet ({coming.length})
              </h2>
              <ul className="flex flex-col gap-2">
                {coming.map((order) => (
                  <BillRow
                    key={order.id}
                    order={order}
                    where={orderWhere(order, tableName)}
                    now={now}
                  />
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </>
  );
}

/** One open bill in the list. The whole row is a link to its checkout. */
function BillRow({
  order,
  where,
  now,
}: {
  order: Order;
  where: string;
  now: number | null;
}) {
  const taxRate = useTaxRate(); // GST from Settings
  const summary = summarizeOrder(order, taxRate);
  const ready = order.status === "served";
  return (
    <li>
      <Link
        href={`/billing/${order.id}`}
        className={cn(
          "flex min-h-16 items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-3 transition-colors hover:bg-surface-muted",
          !ready && "opacity-80",
        )}
      >
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex flex-wrap items-center gap-2 font-semibold">
            <span className="font-display text-lg">#{order.number}</span>
            <span>{where}</span>
            <Badge variant={ORDER_STATUS_BADGE[order.status]}>
              {ORDER_STATUS_LABEL[order.status]}
            </Badge>
          </span>
          <span className="text-sm text-muted-foreground">
            {ORDER_TYPE_LABEL[order.type]} · {summary.itemCount}{" "}
            {summary.itemCount === 1 ? "item" : "items"}
            {now !== null && ` · placed ${timeSince(order.createdAt, now)} ago`}
          </span>
        </span>
        <span className="text-right">
          <span className="block text-lg font-semibold tabular-nums">
            {formatRupees(summary.totalPaise)}
          </span>
          <span className="text-sm text-muted-foreground">
            {ready ? "Checkout" : "Not served yet"}
          </span>
        </span>
        <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}
