"use client";

import {
  BadgePercent,
  ChartColumn,
  Download,
  IndianRupee,
  Landmark,
  Receipt,
  ShoppingBag,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chip-group";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { PAYMENT_METHOD_LABEL } from "@/domain/billing/payments";
import { PAYMENT_METHODS, paymentTotals, splitGst } from "@/domain/billing/transactions";
import { formatRupees, paiseToText } from "@/domain/money";
import {
  RANGE_LABEL,
  cancellations,
  invoicesIn,
  itemSales,
  rangeFor,
  salesByHour,
  salesByType,
  salesSummary,
  toCsv,
  type DateRange,
  type RangePreset,
} from "@/domain/reports/sales-report";
import { useNow } from "@/lib/hooks/use-now";
import { useServiceStore } from "@/stores/service-store";
import { ORDER_TYPE_LABEL } from "@/features/orders/order-display";
import { BarList, HourlySalesChart, StatTile } from "./charts";

const PRESETS: RangePreset[] = ["today", "yesterday", "last7", "last30"];

const dayFormatter = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "16 Nov 2026" or "10 Nov 2026 – 16 Nov 2026". Browser only (time zone). */
function rangeText(range: DateRange): string {
  const first = dayFormatter.format(range.from);
  const last = dayFormatter.format(range.to - 1);
  return first === last ? first : `${first} – ${last}`;
}

/** "2026-11-16", for the CSV file name (local date). */
function isoDay(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * REPORTS: sales for a chosen period. Everything is worked out from the
 * frozen invoices (see domain/reports/sales-report.ts), so a past day always
 * shows the same numbers. "Export CSV" downloads the same report as a file
 * that opens in Excel or Google Sheets.
 */
export function ReportsScreen() {
  const now = useNow();
  const [preset, setPreset] = useState<RangePreset>("today");
  // Same range object until the period or the day changes, so the report
  // below isn't worked out again on every render.
  const range = useMemo(
    () => (now === null ? undefined : rangeFor(preset, new Date(now))),
    [preset, now],
  );

  return (
    <>
      <PageHeader
        title="Reports"
        description="Sales, dishes and payments for any period."
      />
      <ChipGroup
        label="Period"
        value={preset}
        onChange={setPreset}
        options={PRESETS.map((p) => ({ value: p, label: RANGE_LABEL[p] }))}
        className="mb-6"
      />
      {/* Which days "today" covers depends on the device's clock: browser only. */}
      {range === undefined ? (
        <Skeleton className="h-[70vh] w-full" />
      ) : (
        <Report range={range} preset={preset} />
      )}
    </>
  );
}

function Report({ range, preset }: { range: DateRange; preset: RangePreset }) {
  const invoices = useServiceStore((s) => s.invoices);
  const payments = useServiceStore((s) => s.payments);
  const orders = useServiceStore((s) => s.orders);

  const report = useMemo(() => {
    const paid = invoicesIn(invoices, range);
    const paidIds = new Set(paid.map((i) => i.id));
    return {
      paid,
      summary: salesSummary(paid),
      hours: salesByHour(paid),
      items: itemSales(paid),
      types: salesByType(paid),
      methods: paymentTotals(payments.filter((p) => paidIds.has(p.invoiceId))),
      cancelled: cancellations(orders, range),
    };
  }, [invoices, payments, orders, range]);

  const { summary, items, methods, types, cancelled } = report;
  const gst = splitGst(summary.taxPaise);
  const itemsTotal = items.reduce((sum, i) => sum + i.revenuePaise, 0);

  function exportCsv() {
    const rupees = (paise: number) => paiseToText(paise);
    const csv = toCsv([
      ["Sales report", RANGE_LABEL[preset], rangeText(range)],
      [],
      ["Summary", "Amount (₹)"],
      ["Bills", summary.bills],
      ["Sales before discount", rupees(summary.subtotalPaise)],
      ["Discounts", rupees(summary.discountPaise)],
      ["GST", rupees(summary.taxPaise)],
      ["Total collected", rupees(summary.totalPaise)],
      ["Average bill", rupees(summary.averagePaise)],
      [],
      ["Payment method", "Payments", "Amount (₹)"],
      ...PAYMENT_METHODS.map((m) => [
        PAYMENT_METHOD_LABEL[m],
        methods.byMethod[m].count,
        rupees(methods.byMethod[m].totalPaise),
      ]),
      [],
      ["Dish", "Quantity", "Sales before discount and tax (₹)"],
      ...items.map((i) => [i.name, i.quantity, rupees(i.revenuePaise)]),
      [],
      ["Cancelled", "Order", "Quantity", "Value (₹)", "Reason"],
      ...cancelled.map((c) => [
        c.name,
        c.orderNumber,
        c.quantity,
        rupees(c.valuePaise),
        c.reason,
      ]),
    ]);
    // A BOM at the start tells Excel the file is UTF-8, so "₹" shows correctly.
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sales-report-${isoDay(range.from)}${
      range.to - range.from > 86_400_000 ? `-to-${isoDay(range.to - 1)}` : ""
    }.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded", { description: link.download });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-muted-foreground">
          {rangeText(range)} · {summary.bills} {summary.bills === 1 ? "bill" : "bills"}
        </p>
        <Button
          variant="secondary"
          onClick={exportCsv}
          disabled={summary.bills === 0 && cancelled.length === 0}
        >
          <Download aria-hidden="true" /> Export CSV
        </Button>
      </div>

      {summary.bills === 0 ? (
        <EmptyState
          icon={ChartColumn}
          title="No sales in this period"
          description="Bills appear here once they're paid. Sales are kept on this device, so past days stay available."
          className="bg-surface"
        />
      ) : (
        <>
          <section aria-label="Summary" className="grid grid-cols-2 gap-3 lg:grid-cols-3">
            <StatTile
              icon={IndianRupee}
              label="Total collected"
              value={formatRupees(summary.totalPaise)}
              detail="After discounts, with GST"
            />
            <StatTile
              icon={Receipt}
              label="Bills"
              value={String(summary.bills)}
              detail={`Average ${formatRupees(summary.averagePaise)}`}
            />
            <StatTile
              icon={TrendingUp}
              label="Sales before discount"
              value={formatRupees(summary.subtotalPaise)}
              detail="What the dishes earned on the menu"
            />
            <StatTile
              icon={BadgePercent}
              label="Discounts given"
              value={formatRupees(summary.discountPaise)}
              detail={`On ${summary.discountedBills} ${summary.discountedBills === 1 ? "bill" : "bills"}`}
            />
            <StatTile
              icon={Landmark}
              label="GST collected"
              value={formatRupees(summary.taxPaise)}
              detail={`CGST ${formatRupees(gst.cgstPaise)} + SGST ${formatRupees(gst.sgstPaise)}`}
            />
            <StatTile
              icon={ShoppingBag}
              label="Dishes sold"
              value={String(items.reduce((sum, i) => sum + i.quantity, 0))}
              detail={`${items.length} different ${items.length === 1 ? "dish" : "dishes"}`}
            />
          </section>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>
                  Sales by hour
                  {preset === "today" || preset === "yesterday" ? "" : " of day"}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <HourlySalesChart hours={report.hours} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How guests paid</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-6">
                <BarList
                  label="Money taken by payment method"
                  rows={PAYMENT_METHODS.map((m) => ({
                    key: m,
                    label: PAYMENT_METHOD_LABEL[m],
                    detail: `${methods.byMethod[m].count} ${methods.byMethod[m].count === 1 ? "payment" : "payments"}`,
                    value: methods.byMethod[m].totalPaise,
                    valueText: formatRupees(methods.byMethod[m].totalPaise),
                  }))}
                />
                <div className="flex flex-col gap-2">
                  <span className="font-semibold">Order types</span>
                  <BarList
                    label="Sales by order type"
                    rows={types.map((t) => ({
                      key: t.type,
                      label: ORDER_TYPE_LABEL[t.type],
                      detail: `${t.bills} ${t.bills === 1 ? "bill" : "bills"}`,
                      value: t.totalPaise,
                      valueText: formatRupees(t.totalPaise),
                    }))}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Dish sales</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full min-w-[28rem] text-left">
                <caption className="pb-3 text-left text-sm text-muted-foreground">
                  Before the bill&apos;s discount and GST. Best earners first.
                </caption>
                <thead className="text-xs tracking-wide text-muted-foreground uppercase">
                  <tr>
                    <th scope="col" className="pb-2 font-semibold">
                      Dish
                    </th>
                    <th scope="col" className="pb-2 text-right font-semibold">
                      Sold
                    </th>
                    <th scope="col" className="pb-2 text-right font-semibold">
                      Sales
                    </th>
                    <th scope="col" className="pb-2 text-right font-semibold">
                      Share
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {items.map((item) => (
                    <tr key={item.name}>
                      <td className="py-2.5 font-semibold">{item.name}</td>
                      <td className="py-2.5 text-right tabular-nums">{item.quantity}</td>
                      <td className="py-2.5 text-right tabular-nums">
                        {formatRupees(item.revenuePaise)}
                      </td>
                      <td className="py-2.5 text-right text-muted-foreground tabular-nums">
                        {itemsTotal > 0
                          ? `${((item.revenuePaise / itemsTotal) * 100).toFixed(1)}%`
                          : "–"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Cancellations</CardTitle>
        </CardHeader>
        <CardContent>
          {cancelled.length === 0 ? (
            <p className="text-muted-foreground">Nothing was cancelled in this period.</p>
          ) : (
            <ul className="divide-y divide-border">
              {cancelled.map((c, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-baseline justify-between gap-2 py-2.5"
                >
                  <span>
                    <span className="font-semibold">
                      {c.kind === "order" ? c.name : `${c.quantity} × ${c.name}`}
                    </span>
                    <span className="text-muted-foreground">
                      {c.kind === "item" && ` · order ${c.orderNumber}`} · {c.reason}
                    </span>
                  </span>
                  <span className="text-muted-foreground tabular-nums">
                    {formatRupees(c.valuePaise)} not charged
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
