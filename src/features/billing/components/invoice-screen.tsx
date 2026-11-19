"use client";

import { ClipboardList, FileText, ListOrdered, Printer } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { EmptyState } from "@/components/ui/empty-state";
import { invoiceLabel } from "@/domain/billing/checkout";
import { PAYMENT_METHOD_LABEL } from "@/domain/billing/payments";
import { splitGst } from "@/domain/billing/transactions";
import { formatRupees } from "@/domain/money";
import { useNow } from "@/lib/hooks/use-now";
import { dateTime } from "@/lib/utils/time";
import { useServiceStore } from "@/stores/service-store";
import type { Id } from "@/types/common";
import { ORDER_TYPE_LABEL } from "@/features/orders/order-display";
import { BillSummary } from "./bill-summary";

/**
 * THE INVOICE: the bill exactly as it was when it was paid, ready to print.
 * Everything comes from the frozen Invoice record (Step 15), never from the
 * menu or the live order, so it reads the same however long ago it was paid.
 *
 * "Print" uses the browser's own print dialog (which can also save as PDF).
 * The sidebar, header and buttons are hidden on paper (print:hidden), and
 * globals.css forces black-on-white even in dark mode.
 */
export function InvoiceScreen({ invoiceId }: { invoiceId: Id }) {
  const invoices = useServiceStore((s) => s.invoices);
  const payments = useServiceStore((s) => s.payments);
  // Dates are only written in the browser (its time zone), never on the server.
  const inBrowser = useNow() !== null;

  const invoice = invoices.find((i) => i.id === invoiceId);
  if (!invoice) {
    return (
      <>
        <PageHeader
          title="Invoice not found"
          back={{ href: "/billing/transactions", label: "Back to transactions" }}
        />
        <EmptyState
          icon={FileText}
          title="This invoice doesn't exist"
          description="It may have been removed when the demo data was reset."
          className="bg-surface"
          action={
            <ButtonLink href="/billing/transactions">See all transactions</ButtonLink>
          }
        />
      </>
    );
  }

  const paidWith = payments.filter((p) => invoice.paymentIds.includes(p.id));
  const { cgstPaise, sgstPaise } = splitGst(invoice.taxPaise);
  const halfRate = invoice.taxRateBasisPoints / 200; // 500 → 2.5 (%)

  return (
    <>
      <div className="print:hidden">
        <PageHeader
          title={invoiceLabel(invoice)}
          description={`Order ${invoice.orderNumber} · ${invoice.where} · ${formatRupees(invoice.totalPaise)}`}
          back={{ href: "/billing/transactions", label: "Back to transactions" }}
          actions={
            <>
              <ButtonLink href={`/orders/${invoice.orderId}`} variant="secondary">
                <ClipboardList aria-hidden="true" /> Order
              </ButtonLink>
              <ButtonLink href="/billing/transactions" variant="secondary">
                <ListOrdered aria-hidden="true" /> Transactions
              </ButtonLink>
              <Button onClick={() => window.print()}>
                <Printer aria-hidden="true" /> Print
              </Button>
            </>
          }
        />
      </div>

      <article
        aria-label={`Invoice ${invoiceLabel(invoice)}`}
        className="mx-auto flex max-w-2xl flex-col gap-6 rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-10 print:max-w-none print:border-0 print:p-0 print:shadow-none"
      >
        <header className="flex flex-col justify-between gap-4 border-b border-border pb-6 sm:flex-row">
          <div>
            <p className="font-display text-2xl font-semibold">
              {invoice.restaurant.name}
            </p>
            <p className="text-sm text-muted-foreground">{invoice.restaurant.address}</p>
            <p className="text-sm text-muted-foreground">
              Phone {invoice.restaurant.phone}
            </p>
            <p className="text-sm text-muted-foreground">
              GSTIN {invoice.restaurant.gstin}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Tax invoice
            </p>
            <p className="font-display text-xl font-semibold">{invoiceLabel(invoice)}</p>
            <p className="text-sm text-muted-foreground">
              {inBrowser ? dateTime(invoice.issuedAt) : " "}
            </p>
          </div>
        </header>

        <dl className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <dt className="text-muted-foreground">Order</dt>
            <dd className="font-semibold">#{invoice.orderNumber}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Type</dt>
            <dd className="font-semibold">{ORDER_TYPE_LABEL[invoice.orderType]}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">
              {invoice.orderType === "dine-in" ? "Table" : "Customer"}
            </dt>
            <dd className="font-semibold">{invoice.where}</dd>
          </div>
        </dl>

        <BillSummary
          lines={invoice.lines}
          subtotalPaise={invoice.subtotalPaise}
          discount={invoice.discount}
          discountPaise={invoice.discountPaise}
          taxRateBasisPoints={invoice.taxRateBasisPoints}
          taxPaise={invoice.taxPaise}
          totalPaise={invoice.totalPaise}
        />
        <p className="-mt-3 text-sm text-muted-foreground">
          GST is CGST {halfRate}% {formatRupees(cgstPaise)} + SGST {halfRate}%{" "}
          {formatRupees(sgstPaise)}.
        </p>

        {paidWith.length > 0 && (
          <section
            aria-labelledby="paid-with-title"
            className="border-t border-border pt-4"
          >
            <h2 id="paid-with-title" className="mb-2 font-semibold">
              Paid with
            </h2>
            <ul className="flex flex-col gap-1.5 text-sm">
              {paidWith.map((p) => (
                <li key={p.id} className="flex justify-between gap-3">
                  <span>
                    {PAYMENT_METHOD_LABEL[p.method]}
                    {p.changePaise ? (
                      <span className="text-muted-foreground">
                        {" "}
                        · received {formatRupees(p.tenderedPaise ?? p.amountPaise)},
                        change {formatRupees(p.changePaise)}
                      </span>
                    ) : null}
                  </span>
                  <span className="font-semibold tabular-nums">
                    {formatRupees(p.amountPaise)}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <footer className="border-t border-dashed border-border pt-4 text-center text-sm text-muted-foreground">
          Thank you for dining with us!
        </footer>
      </article>
    </>
  );
}
