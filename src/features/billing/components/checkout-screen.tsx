"use client";

import {
  CheckCircle2,
  ChefHat,
  FileText,
  HandPlatter,
  LayoutGrid,
  Percent,
  Receipt,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { DEFAULT_TAX_RATE_BASIS_POINTS } from "@/config/constants";
import { calculateBill } from "@/domain/billing/calculate-bill";
import { invoiceLabel, invoiceLines } from "@/domain/billing/checkout";
import { PAYMENT_METHOD_LABEL, type PaymentDraft } from "@/domain/billing/payments";
import { formatRupees } from "@/domain/money";
import { ORDER_STATUS_LABEL } from "@/domain/orders/order-state-machine";
import { tryAction } from "@/lib/utils/try-action";
import { useServiceStore } from "@/stores/service-store";
import type { Id } from "@/types/common";
import type { Order } from "@/types/order";
import {
  ORDER_STATUS_BADGE,
  ORDER_TYPE_LABEL,
  orderWhere,
} from "@/features/orders/order-display";
import { BillSummary } from "./bill-summary";
import { DiscountDialog } from "./discount-dialog";
import { PaymentPanel } from "./payment-panel";

/**
 * CHECKOUT for one order: the bill on the left, taking payment on the right.
 * What shows depends on where the order is:
 *   New / Preparing → "still in the kitchen" (no payment yet)
 *   Ready           → one tap to mark it served, then pay
 *   Served          → the full checkout
 *   Paid            → the receipt: payments, change, invoice number
 *   Cancelled       → nothing to pay
 */
export function CheckoutScreen({ orderId }: { orderId: Id }) {
  const orders = useServiceStore((s) => s.orders);
  const tables = useServiceStore((s) => s.tables);
  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    return (
      <>
        <PageHeader
          title="Bill not found"
          back={{ href: "/billing", label: "Back to billing" }}
        />
        <EmptyState
          icon={Receipt}
          title="This order doesn't exist"
          description="It may have been created before the page was refreshed."
          className="bg-surface"
          action={<ButtonLink href="/billing">See open bills</ButtonLink>}
        />
      </>
    );
  }

  const where = orderWhere(order, (id) => tables.find((t) => t.id === id)?.name);

  return (
    <>
      <PageHeader
        title={`Checkout · Order ${order.number}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {where} · {ORDER_TYPE_LABEL[order.type]}
            <Badge variant={ORDER_STATUS_BADGE[order.status]}>
              {ORDER_STATUS_LABEL[order.status]}
            </Badge>
          </span>
        }
        back={{ href: "/billing", label: "Back to billing" }}
      />
      {order.status === "paid" ? (
        <PaidView order={order} />
      ) : order.status === "cancelled" ? (
        <EmptyState
          icon={Receipt}
          title="This order was cancelled"
          description={`Nothing to pay. Reason: ${order.cancelReason ?? "not given"}.`}
          className="bg-surface"
          action={<ButtonLink href="/billing">See open bills</ButtonLink>}
        />
      ) : (
        <OpenCheckout order={order} />
      )}
    </>
  );
}

function OpenCheckout({ order }: { order: Order }) {
  const setDiscount = useServiceStore((s) => s.setDiscount);
  const setOrderStatus = useServiceStore((s) => s.setOrderStatus);
  const settleOrder = useServiceStore((s) => s.settleOrder);

  const [parts, setParts] = useState<PaymentDraft[]>([]);
  const [discountForm, setDiscountForm] = useState({ open: false, key: 0 });

  const bill = calculateBill({
    items: order.items,
    discount: order.discount,
    taxRateBasisPoints: DEFAULT_TAX_RATE_BASIS_POINTS,
  });
  const servable = order.status === "served";
  const discountLocked = parts.length > 0;

  function finish(all: PaymentDraft[]) {
    tryAction(() => {
      const invoice = settleOrder(order.id, all);
      const change = all.reduce(
        (sum, p) => sum + Math.max(0, (p.tenderedPaise ?? p.amountPaise) - p.amountPaise),
        0,
      );
      toast.success(
        `Paid ${formatRupees(invoice.totalPaise)} · ${invoiceLabel(invoice)}`,
        {
          description: change > 0 ? `Give ${formatRupees(change)} change.` : undefined,
        },
      );
    });
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_24rem]">
      <Card>
        <CardHeader>
          <CardTitle>Bill</CardTitle>
        </CardHeader>
        <CardContent>
          <BillSummary
            lines={invoiceLines(order, bill)}
            subtotalPaise={bill.subtotalPaise}
            discount={order.discount}
            discountPaise={bill.discountPaise}
            taxRateBasisPoints={DEFAULT_TAX_RATE_BASIS_POINTS}
            taxPaise={bill.taxPaise}
            totalPaise={bill.totalPaise}
            discountAction={
              <Button
                variant="ghost"
                size="sm"
                className="text-primary"
                disabled={discountLocked}
                onClick={() => setDiscountForm((f) => ({ open: true, key: f.key + 1 }))}
              >
                <Percent aria-hidden="true" />
                {order.discount ? "Change" : "Add discount"}
              </Button>
            }
          />
          {discountLocked && (
            <p className="mt-2 text-sm text-muted-foreground">
              Remove the payments added so far to change the discount.
            </p>
          )}
          {order.items.some((i) => i.status === "cancelled") && (
            <p className="mt-2 text-sm text-muted-foreground">
              Cancelled dishes are not on the bill.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment</CardTitle>
        </CardHeader>
        <CardContent>
          {servable ? (
            <PaymentPanel
              totalPaise={bill.totalPaise}
              parts={parts}
              onAddPart={(part) => setParts((p) => [...p, part])}
              onRemovePart={(index) => setParts((p) => p.filter((_, i) => i !== index))}
              onFinish={finish}
            />
          ) : order.status === "ready" ? (
            <div className="flex flex-col gap-3">
              <p className="text-muted-foreground">
                The food is ready. Mark it served once it reaches the guest, then take
                payment.
              </p>
              <Button
                size="lg"
                fullWidth
                onClick={() => {
                  if (tryAction(() => setOrderStatus(order.id, "served"))) {
                    toast.success(`Order ${order.number} served`);
                  }
                }}
              >
                <HandPlatter aria-hidden="true" /> Mark served
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3">
              <p className="flex items-center gap-2 font-semibold">
                <ChefHat className="size-5 text-accent" aria-hidden="true" />
                Still in the kitchen ({ORDER_STATUS_LABEL[order.status]})
              </p>
              <p className="text-muted-foreground">
                Payment opens once the food is served. You can already add a discount.
              </p>
              <ButtonLink href={`/orders/${order.id}`} variant="secondary">
                Open the order
              </ButtonLink>
            </div>
          )}
        </CardContent>
      </Card>

      <DiscountDialog
        key={discountForm.key}
        open={discountForm.open}
        onClose={() => setDiscountForm((f) => ({ ...f, open: false }))}
        current={order.discount}
        subtotalPaise={bill.subtotalPaise}
        onApply={(discount) => {
          setDiscount(order.id, discount); // throws DomainError → shown in the dialog
          toast.success(discount ? "Discount applied" : "Discount removed");
        }}
      />
    </div>
  );
}

/** After payment: what was paid, how, the change, and the invoice number. */
function PaidView({ order }: { order: Order }) {
  const invoices = useServiceStore((s) => s.invoices);
  const payments = useServiceStore((s) => s.payments);
  const tables = useServiceStore((s) => s.tables);
  const invoice = invoices.find((i) => i.orderId === order.id);
  const paidWith = payments.filter((p) => p.orderId === order.id);
  const change = paidWith.reduce((sum, p) => sum + (p.changePaise ?? 0), 0);
  const cleaning = order.tableIds
    .map((id) => tables.find((t) => t.id === id))
    .filter((t) => t?.status === "cleaning")
    .map((t) => t!.name);

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardContent className="flex flex-col items-center gap-4 pt-6 text-center">
        <CheckCircle2 className="size-14 text-success" aria-hidden="true" />
        <div>
          <h2 className="font-display text-2xl font-semibold">Payment complete</h2>
          {invoice && (
            <p className="text-muted-foreground">
              {invoiceLabel(invoice)} · {formatRupees(invoice.totalPaise)}
            </p>
          )}
        </div>

        {change > 0 && (
          <p className="rounded-xl bg-accent/20 px-4 py-2 text-lg font-semibold">
            Give change: <span className="tabular-nums">{formatRupees(change)}</span>
          </p>
        )}

        {paidWith.length > 0 && (
          <ul className="w-full divide-y divide-border text-left">
            {paidWith.map((p) => (
              <li key={p.id} className="flex justify-between gap-3 py-2">
                <span className="font-semibold">{PAYMENT_METHOD_LABEL[p.method]}</span>
                <span className="text-right tabular-nums">
                  {formatRupees(p.amountPaise)}
                  {p.tenderedPaise !== undefined && p.tenderedPaise > p.amountPaise && (
                    <span className="block text-sm text-muted-foreground">
                      received {formatRupees(p.tenderedPaise)}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {cleaning.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {cleaning.join(" + ")} {cleaning.length === 1 ? "is" : "are"} now marked for
            cleaning.
          </p>
        )}

        <div className="flex w-full flex-col gap-2 sm:flex-row">
          {invoice && (
            <ButtonLink
              href={`/billing/invoice/${invoice.id}`}
              variant="secondary"
              className="flex-1"
            >
              <FileText aria-hidden="true" /> View invoice
            </ButtonLink>
          )}
          <ButtonLink href="/tables" variant="secondary" className="flex-1">
            <LayoutGrid aria-hidden="true" /> Tables
          </ButtonLink>
          <ButtonLink href="/billing" className="flex-1">
            <Receipt aria-hidden="true" /> Open bills
          </ButtonLink>
        </div>
      </CardContent>
    </Card>
  );
}
