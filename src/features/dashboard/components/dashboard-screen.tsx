"use client";

import {
  ChefHat,
  ChevronRight,
  ClipboardList,
  IndianRupee,
  LayoutGrid,
  Plus,
  Receipt,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { invoiceLabel } from "@/domain/billing/checkout";
import { PAYMENT_METHOD_LABEL } from "@/domain/billing/payments";
import { PAYMENT_METHODS, paymentTotals } from "@/domain/billing/transactions";
import { buildKitchenBoard, kitchenSummary } from "@/domain/kitchen/kitchen-board";
import { formatRupees } from "@/domain/money";
import { isOrderOpen } from "@/domain/orders/order-state-machine";
import {
  floorNow,
  invoicesIn,
  itemSales,
  rangeFor,
  salesByHour,
  salesSummary,
} from "@/domain/reports/sales-report";
import { TABLE_STATUS_LABEL } from "@/domain/tables/table-state-machine";
import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils/cn";
import { clockTime } from "@/lib/utils/time";
import { useServiceStore } from "@/stores/service-store";
import type { TableStatus } from "@/types/table";
import { ORDER_TYPE_LABEL } from "@/features/orders/order-display";
import {
  BarList,
  HourlySalesChart,
  StatTile,
} from "@/features/reports/components/charts";
import { summarizeOrder } from "@/features/tables/order-summary";
import { TABLE_STATUS_STYLE } from "@/features/tables/table-style";
import { useTaxRate } from "@/stores/settings-store";
import { useSettingsStore } from "@/stores/settings-store";
import { useCan } from "@/features/auth/hooks";

const TABLE_STATUSES: TableStatus[] = ["available", "occupied", "reserved", "cleaning"];

/**
 * THE DASHBOARD: today, live. It updates by itself whenever anything changes
 * (an order is placed, food is ready, a bill is paid), because it reads the
 * same store as every other screen. Each card links to where you'd act on it.
 */
export function DashboardScreen() {
  const can = useCan(); // hide what this role can't do (the store checks again)
  const now = useNow();
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Today at a glance. Updates live as orders and payments come in."
        actions={
          <>
            {can("kitchen.view") && (
              <ButtonLink href="/kitchen" variant="secondary">
                <ChefHat aria-hidden="true" /> Kitchen
              </ButtonLink>
            )}
            {can("order.create") && (
              <ButtonLink href="/orders/new">
                <Plus aria-hidden="true" /> New order
              </ButtonLink>
            )}
          </>
        }
      />
      {/* "Today" depends on the device's clock and time zone: browser only. */}
      {now === null ? <Skeleton className="h-[70vh] w-full" /> : <Today now={now} />}
    </>
  );
}

function Today({ now }: { now: number }) {
  const timing = useSettingsStore((s) => s.kitchenTiming); // amber / red minutes, from Settings
  const taxRate = useTaxRate(); // GST from Settings
  const orders = useServiceStore((s) => s.orders);
  const tables = useServiceStore((s) => s.tables);
  const invoices = useServiceStore((s) => s.invoices);
  const payments = useServiceStore((s) => s.payments);

  const today = useMemo(() => {
    const range = rangeFor("today", new Date(now));
    const paid = invoicesIn(invoices, range);
    const paidIds = new Set(paid.map((i) => i.id));
    const open = orders.filter((o) => isOrderOpen(o.status));
    return {
      paid,
      summary: salesSummary(paid),
      hours: salesByHour(paid),
      topDishes: itemSales(paid).slice(0, 5),
      methods: paymentTotals(payments.filter((p) => paidIds.has(p.invoiceId))),
      openValue: open.reduce((sum, o) => sum + summarizeOrder(o, taxRate).totalPaise, 0),
      floor: floorNow(tables, orders),
      kitchen: kitchenSummary(buildKitchenBoard(orders), new Date(now), timing),
    };
  }, [now, orders, tables, invoices, payments, taxRate, timing]);

  const { summary, floor, kitchen } = today;
  const recent = today.paid
    .toSorted((a, b) => b.issuedAt.localeCompare(a.issuedAt))
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6">
      <section
        aria-label="Today's numbers"
        className="grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        <StatTile
          icon={IndianRupee}
          label="Sales today"
          value={formatRupees(summary.totalPaise)}
          detail={`${summary.bills} ${summary.bills === 1 ? "bill" : "bills"} paid`}
        />
        <StatTile
          icon={TrendingUp}
          label="Average bill"
          value={formatRupees(summary.averagePaise)}
          detail={
            summary.discountPaise > 0
              ? `${formatRupees(summary.discountPaise)} given in discounts`
              : "No discounts today"
          }
        />
        <StatTile
          icon={ClipboardList}
          label="Open orders"
          value={String(floor.openOrders)}
          detail={`${formatRupees(today.openValue)} still to be paid`}
        />
        <StatTile
          icon={LayoutGrid}
          label="Tables in use"
          value={`${floor.occupied} / ${floor.tables}`}
          detail={`${floor.available} free to seat`}
        />
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Sales by hour</CardTitle>
          </CardHeader>
          <CardContent>
            {today.hours.length > 0 ? (
              <HourlySalesChart hours={today.hours} />
            ) : (
              <p className="py-10 text-center text-muted-foreground">
                No bills paid yet today.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Right now</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <Link
              href="/kitchen"
              className="-m-2 flex flex-col gap-2 rounded-xl p-2 hover:bg-surface-muted"
            >
              <span className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-2">
                  <ChefHat className="size-5 text-primary" aria-hidden="true" /> Kitchen
                </span>
                <ChevronRight
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
              </span>
              <span className="flex flex-wrap gap-2">
                <Badge variant="neutral">{kitchen.toCook} to cook</Badge>
                {kitchen.warning > 0 && (
                  <Badge variant="accent">{kitchen.warning} getting late</Badge>
                )}
                {kitchen.late > 0 && <Badge variant="danger">{kitchen.late} late</Badge>}
                <Badge variant="success">{kitchen.ready} ready to serve</Badge>
              </span>
            </Link>

            <Link
              href="/tables"
              className="-m-2 flex flex-col gap-2 rounded-xl p-2 hover:bg-surface-muted"
            >
              <span className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-2">
                  <LayoutGrid className="size-5 text-primary" aria-hidden="true" /> Tables
                </span>
                <ChevronRight
                  className="size-5 text-muted-foreground"
                  aria-hidden="true"
                />
              </span>
              <span className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {TABLE_STATUSES.map((status) => (
                  <span key={status} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-2.5 rounded-full",
                        TABLE_STATUS_STYLE[status].dot,
                      )}
                      aria-hidden="true"
                    />
                    {TABLE_STATUS_LABEL[status]}
                    <span className="ml-auto font-semibold tabular-nums">
                      {tables.filter((t) => t.status === status).length}
                    </span>
                  </span>
                ))}
              </span>
            </Link>

            <div className="flex flex-col gap-2">
              <span className="font-semibold">Paid with today</span>
              <BarList
                label="Money taken by payment method today"
                rows={PAYMENT_METHODS.map((method) => ({
                  key: method,
                  label: PAYMENT_METHOD_LABEL[method],
                  value: today.methods.byMethod[method].totalPaise,
                  valueText: formatRupees(today.methods.byMethod[method].totalPaise),
                }))}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Top dishes today</CardTitle>
            <ButtonLink href="/reports" variant="ghost" size="sm">
              Reports <ChevronRight aria-hidden="true" />
            </ButtonLink>
          </CardHeader>
          <CardContent>
            {today.topDishes.length > 0 ? (
              <BarList
                label="Top dishes today by sales"
                rows={today.topDishes.map((dish) => ({
                  key: dish.name,
                  label: dish.name,
                  detail: `${dish.quantity} sold`,
                  value: dish.revenuePaise,
                  valueText: formatRupees(dish.revenuePaise),
                }))}
              />
            ) : (
              <p className="py-6 text-center text-muted-foreground">
                Nothing sold yet today.
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle>Latest bills</CardTitle>
            <ButtonLink href="/billing/transactions" variant="ghost" size="sm">
              All <ChevronRight aria-hidden="true" />
            </ButtonLink>
          </CardHeader>
          <CardContent>
            {recent.length > 0 ? (
              <ul className="-mx-2 flex flex-col">
                {recent.map((invoice) => (
                  <li key={invoice.id}>
                    <Link
                      href={`/billing/invoice/${invoice.id}`}
                      className="flex min-h-12 items-center gap-3 rounded-xl px-2 hover:bg-surface-muted"
                    >
                      <Receipt
                        className="size-4 text-muted-foreground"
                        aria-hidden="true"
                      />
                      <span className="flex-1">
                        <span className="font-semibold">{invoiceLabel(invoice)}</span>
                        <span className="text-muted-foreground">
                          {" "}
                          · {invoice.where} · {ORDER_TYPE_LABEL[invoice.orderType]}
                        </span>
                      </span>
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {clockTime(invoice.issuedAt)}
                      </span>
                      <span className="w-24 text-right font-semibold tabular-nums">
                        {formatRupees(invoice.totalPaise)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-muted-foreground">
                No bills paid yet today.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
