"use client";

import {
  Banknote,
  ChevronRight,
  CreditCard,
  ListOrdered,
  QrCode,
  Search,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { invoiceLabel } from "@/domain/billing/checkout";
import { PAYMENT_METHOD_LABEL } from "@/domain/billing/payments";
import {
  NO_TRANSACTION_FILTERS,
  PAYMENT_METHODS,
  paymentTotals,
  transactionRows,
  type MethodFilter,
  type TransactionFilters,
  type TransactionRow,
} from "@/domain/billing/transactions";
import { formatRupees } from "@/domain/money";
import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils/cn";
import { clockTime } from "@/lib/utils/time";
import { useServiceStore } from "@/stores/service-store";
import type { PaymentMethod } from "@/types/payment";

const METHOD_ICON: Record<MethodFilter, typeof Banknote> = {
  all: Wallet,
  cash: Banknote,
  card: CreditCard,
  upi: QrCode,
};

const METHOD_BADGE: Record<PaymentMethod, "success" | "primary" | "accent"> = {
  cash: "success",
  card: "primary",
  upi: "accent",
};

/**
 * TRANSACTION HISTORY: every payment taken, newest first.
 *  - The cards on top are today's takings: all together, and per method.
 *    Tapping a card shows only that method's payments.
 *  - Search finds a bill by invoice ("INV-1003") or order number ("97").
 *  - Each row opens its invoice. A split bill shows as one row per part,
 *    all pointing at the same invoice.
 */
export function TransactionsScreen() {
  const payments = useServiceStore((s) => s.payments);
  const invoices = useServiceStore((s) => s.invoices);
  const inBrowser = useNow() !== null; // times only in the browser (its time zone)
  const [filters, setFilters] = useState<TransactionFilters>(NO_TRANSACTION_FILTERS);

  const totals = useMemo(() => paymentTotals(payments), [payments]);
  const rows = useMemo(
    () => transactionRows(payments, invoices, filters),
    [payments, invoices, filters],
  );

  const cards: {
    value: MethodFilter;
    label: string;
    count: number;
    totalPaise: number;
  }[] = [
    {
      value: "all",
      label: "All payments",
      count: totals.count,
      totalPaise: totals.totalPaise,
    },
    ...PAYMENT_METHODS.map((method) => ({
      value: method,
      label: PAYMENT_METHOD_LABEL[method],
      ...totals.byMethod[method],
    })),
  ];

  return (
    <>
      <PageHeader
        title="Transaction History"
        description="Every payment taken, newest first. Tap one to see its invoice."
        back={{ href: "/billing", label: "Back to billing" }}
      />

      {/* Takings, which also work as the method filter */}
      <div
        role="radiogroup"
        aria-label="Show payments by method"
        className="mb-2 grid grid-cols-2 gap-3 lg:grid-cols-4"
      >
        {cards.map((card) => {
          const Icon = METHOD_ICON[card.value];
          const selected = filters.method === card.value;
          return (
            <button
              key={card.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setFilters((f) => ({ ...f, method: card.value }))}
              className={cn(
                "flex flex-col gap-1 rounded-2xl border-2 bg-surface p-4 text-left transition-colors",
                selected ? "border-primary" : "border-border hover:bg-surface-muted",
              )}
            >
              <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Icon className="size-4" aria-hidden="true" /> {card.label}
              </span>
              <span className="font-display text-2xl font-semibold tabular-nums">
                {formatRupees(card.totalPaise)}
              </span>
              <span className="text-sm text-muted-foreground">
                {card.count} {card.count === 1 ? "payment" : "payments"}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mb-5 text-sm text-muted-foreground">
        Amounts are what was paid towards bills. Change handed back in cash today:{" "}
        <span className="tabular-nums">{formatRupees(totals.changePaise)}</span>.
      </p>

      <div className="relative mb-3 sm:w-80">
        <Search
          className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          type="search"
          value={filters.query}
          onChange={(e) => setFilters((f) => ({ ...f, query: e.target.value }))}
          placeholder="Invoice or order number…"
          aria-label="Search by invoice or order number"
          className="pl-12"
        />
      </div>
      <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
        {rows.length} {rows.length === 1 ? "payment" : "payments"}
      </p>

      {payments.length === 0 ? (
        <EmptyState
          icon={ListOrdered}
          title="No payments yet"
          description="Payments appear here as soon as a bill is settled at checkout."
          className="bg-surface"
        />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No payments match"
          description="Try another invoice or order number, or show all methods."
          className="bg-surface"
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <TransactionItem key={row.payment.id} row={row} inBrowser={inBrowser} />
          ))}
        </ul>
      )}
    </>
  );
}

function TransactionItem({
  row,
  inBrowser,
}: {
  row: TransactionRow;
  inBrowser: boolean;
}) {
  const { payment, invoice } = row;
  const content = (
    <>
      <span className="w-20 shrink-0 text-sm text-muted-foreground tabular-nums">
        {inBrowser ? clockTime(payment.createdAt) : ""}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">
          {invoice ? invoiceLabel(invoice) : "No invoice"}
          {invoice && (
            <span className="font-normal text-muted-foreground">
              {" "}
              · Order {invoice.orderNumber} · {invoice.where}
            </span>
          )}
        </span>
        {payment.changePaise ? (
          <span className="text-sm text-muted-foreground">
            Received {formatRupees(payment.tenderedPaise ?? payment.amountPaise)}, change{" "}
            {formatRupees(payment.changePaise)}
          </span>
        ) : null}
      </span>
      <Badge variant={METHOD_BADGE[payment.method]}>
        {PAYMENT_METHOD_LABEL[payment.method]}
      </Badge>
      <span className="w-28 text-right text-lg font-semibold tabular-nums">
        {formatRupees(payment.amountPaise)}
      </span>
    </>
  );
  const rowClass =
    "flex min-h-16 flex-wrap items-center gap-x-4 gap-y-1 rounded-2xl border border-border bg-surface px-4 py-3";

  return (
    <li>
      {invoice ? (
        <Link
          href={`/billing/invoice/${invoice.id}`}
          className={cn(rowClass, "transition-colors hover:bg-surface-muted")}
        >
          {content}
          <ChevronRight className="size-5 text-muted-foreground" aria-hidden="true" />
        </Link>
      ) : (
        <div className={rowClass}>{content}</div>
      )}
    </li>
  );
}
