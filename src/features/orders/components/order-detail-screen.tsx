"use client";

import {
  Check,
  ChefHat,
  ClipboardList,
  HandPlatter,
  Plus,
  Receipt,
  Split,
  X,
  XCircle,
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
import { calculateBill, itemUnitTotal } from "@/domain/billing/calculate-bill";
import { canAddItems } from "@/domain/orders/order-changes";
import {
  ORDER_STATUS_LABEL,
  canMoveOrder,
  isOrderOpen,
} from "@/domain/orders/order-state-machine";
import { formatRupees } from "@/domain/money";
import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils/cn";
import { clockTime, timeSince } from "@/lib/utils/time";
import { tryAction } from "@/lib/utils/try-action";
import { useServiceStore } from "@/stores/service-store";
import type { Id } from "@/types/common";
import type { OrderItem, OrderStatus } from "@/types/order";
import { ORDER_STATUS_BADGE, ORDER_TYPE_LABEL, orderWhere } from "../order-display";
import { AddItemsSheet } from "./add-items-sheet";
import { ReasonDialog } from "./reason-dialog";

/** The normal path of an order, for the timeline (cancelled is shown separately). */
const PATH: OrderStatus[] = ["new", "preparing", "ready", "served", "paid"];

/** The button that moves an order one step forward (Step 8 rules decide if it's allowed). */
const NEXT_ACTION: Partial<
  Record<
    OrderStatus,
    { to: "preparing" | "ready" | "served"; label: string; icon: typeof ChefHat }
  >
> = {
  new: { to: "preparing", label: "Start preparing", icon: ChefHat },
  preparing: { to: "ready", label: "Mark ready", icon: Check },
  ready: { to: "served", label: "Mark served", icon: HandPlatter },
};

export function OrderDetailScreen({ orderId }: { orderId: Id }) {
  const orders = useServiceStore((s) => s.orders);
  const tables = useServiceStore((s) => s.tables);
  const setOrderStatus = useServiceStore((s) => s.setOrderStatus);
  const cancelOrder = useServiceStore((s) => s.cancelOrder);
  const cancelOrderItem = useServiceStore((s) => s.cancelOrderItem);
  const now = useNow();

  const [adding, setAdding] = useState(false);
  const [cancellingOrder, setCancellingOrder] = useState(false);
  const [cancellingItem, setCancellingItem] = useState<OrderItem>();

  const order = orders.find((o) => o.id === orderId);

  if (!order) {
    // e.g. the page was refreshed: new orders live in memory until Step 19
    return (
      <>
        <PageHeader
          title="Order not found"
          back={{ href: "/orders", label: "Back to orders" }}
        />
        <EmptyState
          icon={ClipboardList}
          title="This order doesn't exist"
          description="It may have been created before the page was refreshed."
          className="bg-surface"
          action={<ButtonLink href="/orders">See all orders</ButtonLink>}
        />
      </>
    );
  }

  const tableName = (id: Id) => tables.find((t) => t.id === id)?.name;
  const bill = calculateBill({
    items: order.items,
    discount: order.discount,
    taxRateBasisPoints: DEFAULT_TAX_RATE_BASIS_POINTS,
  });
  const open = isOrderOpen(order.status);
  const next = NEXT_ACTION[order.status];
  const itemsCancellable = order.status === "new" || order.status === "preparing";
  const activeUnits = order.items
    .filter((i) => i.status === "active")
    .reduce((sum, i) => sum + i.quantity, 0);

  return (
    <>
      <PageHeader
        title={`Order ${order.number}`}
        description={
          <>
            {orderWhere(order, tableName)} · {ORDER_TYPE_LABEL[order.type]}
            {order.splitFromNumber && ` · split from #${order.splitFromNumber}`}
            {now !== null && ` · placed ${timeSince(order.createdAt, now)} ago`}
          </>
        }
        back={{ href: "/orders", label: "Back to orders" }}
        actions={
          <>
            {next && canMoveOrder(order.status, next.to) && (
              <Button
                size="lg"
                onClick={() => {
                  if (tryAction(() => setOrderStatus(order.id, next.to))) {
                    toast.success(
                      `Order ${order.number} is ${ORDER_STATUS_LABEL[next.to]}`,
                    );
                  }
                }}
              >
                <next.icon aria-hidden="true" /> {next.label}
              </Button>
            )}
            {open && (
              <ButtonLink
                href={`/billing/${order.id}`}
                size="lg"
                variant={next ? "secondary" : "primary"}
              >
                <Receipt aria-hidden="true" /> Checkout
              </ButtonLink>
            )}
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-3">
                Items{" "}
                <Badge variant={ORDER_STATUS_BADGE[order.status]}>
                  {ORDER_STATUS_LABEL[order.status]}
                </Badge>
              </CardTitle>
              {canAddItems(order) && (
                <Button variant="secondary" size="sm" onClick={() => setAdding(true)}>
                  <Plus aria-hidden="true" /> Add dishes
                </Button>
              )}
            </CardHeader>
            <CardContent className="flex flex-col">
              <ul className="divide-y divide-border">
                {order.items.map((line) => {
                  const cancelled = line.status === "cancelled";
                  const extras = [
                    line.variant?.name,
                    ...line.modifiers.map((m) => m.name),
                    ...line.addOns.map((a) => `+ ${a.name}`),
                  ]
                    .filter(Boolean)
                    .join(" · ");
                  return (
                    <li key={line.id} className="flex items-start gap-3 py-3">
                      <span
                        className={cn(
                          "w-8 font-semibold tabular-nums",
                          cancelled && "text-muted-foreground",
                        )}
                      >
                        {line.quantity}×
                      </span>
                      <div
                        className={cn(
                          "min-w-0 flex-1",
                          cancelled && "text-muted-foreground",
                        )}
                      >
                        <p className={cn("font-semibold", cancelled && "line-through")}>
                          {line.name}
                        </p>
                        {extras && (
                          <p className="text-sm text-muted-foreground">{extras}</p>
                        )}
                        {line.note && <p className="text-sm">Note: {line.note}</p>}
                        {cancelled && (
                          <p className="text-sm text-danger">
                            Cancelled: {line.cancelReason}
                          </p>
                        )}
                      </div>
                      <span
                        className={cn(
                          "font-semibold tabular-nums",
                          cancelled && "text-muted-foreground line-through",
                        )}
                      >
                        {formatRupees(itemUnitTotal(line) * line.quantity)}
                      </span>
                      {itemsCancellable && !cancelled && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="-my-2 text-danger"
                          onClick={() => setCancellingItem(line)}
                          aria-label={`Cancel ${line.name}`}
                        >
                          <X aria-hidden="true" />
                        </Button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-2 flex flex-col gap-1.5 border-t border-border pt-4">
                <Row label="Subtotal" value={formatRupees(bill.subtotalPaise)} />
                {bill.discountPaise > 0 && (
                  <Row label="Discount" value={`− ${formatRupees(bill.discountPaise)}`} />
                )}
                <Row label="Tax (GST 5%)" value={formatRupees(bill.taxPaise)} />
                <div className="flex justify-between text-xl font-semibold">
                  <span>Total</span>
                  <span className="tabular-nums">{formatRupees(bill.totalPaise)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {open && (
            <div className="flex flex-wrap gap-3">
              {activeUnits >= 2 && (
                <ButtonLink href={`/orders/${order.id}/split`} variant="secondary">
                  <Split aria-hidden="true" /> Split order
                </ButtonLink>
              )}
              {canMoveOrder(order.status, "cancelled") && (
                <Button variant="danger" onClick={() => setCancellingOrder(true)}>
                  <XCircle aria-hidden="true" /> Cancel order
                </Button>
              )}
            </div>
          )}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Timeline</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="flex flex-col">
              {(order.status === "cancelled"
                ? order.statusHistory.map((h) => h.status)
                : PATH
              ).map((status, index, list) => {
                const entry = [...order.statusHistory]
                  .reverse()
                  .find((h) => h.status === status);
                const done = entry !== undefined;
                const current = order.status === status;
                return (
                  <li key={`${status}-${index}`} className="flex gap-3">
                    <span className="flex flex-col items-center">
                      <span
                        className={cn(
                          "flex size-8 items-center justify-center rounded-full border-2 text-sm font-semibold",
                          status === "cancelled"
                            ? "border-danger bg-danger text-danger-foreground"
                            : current
                              ? "border-primary bg-primary text-primary-foreground"
                              : done
                                ? "border-success bg-success text-success-foreground"
                                : "border-border text-muted-foreground",
                        )}
                      >
                        {status === "cancelled" ? (
                          <X className="size-4" aria-hidden="true" />
                        ) : done && !current ? (
                          <Check className="size-4" aria-hidden="true" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      {index < list.length - 1 && (
                        <span
                          className={cn(
                            "my-1 h-6 w-0.5",
                            done ? "bg-success" : "bg-border",
                          )}
                        />
                      )}
                    </span>
                    <span className="flex flex-col pt-1">
                      <span
                        className={cn("font-semibold", !done && "text-muted-foreground")}
                      >
                        {ORDER_STATUS_LABEL[status]}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {entry && now !== null
                          ? clockTime(entry.at)
                          : done
                            ? ""
                            : "Not yet"}
                      </span>
                      {status === "cancelled" && order.cancelReason && (
                        <span className="text-sm text-danger">{order.cancelReason}</span>
                      )}
                    </span>
                  </li>
                );
              })}
            </ol>
          </CardContent>
        </Card>
      </div>

      <AddItemsSheet order={order} open={adding} onClose={() => setAdding(false)} />

      <ReasonDialog
        open={cancellingOrder}
        onClose={() => setCancellingOrder(false)}
        title={`Cancel order ${order.number}?`}
        description="The kitchen stops making it. The order stays in the list, marked Cancelled."
        confirmLabel="Cancel order"
        quickReasons={["Guest left", "Wrong order", "Waited too long", "Duplicate order"]}
        onConfirm={(reason) => {
          if (tryAction(() => cancelOrder(order.id, reason))) {
            toast.success(`Order ${order.number} cancelled`, { description: reason });
          }
        }}
      />

      <ReasonDialog
        open={cancellingItem !== undefined}
        onClose={() => setCancellingItem(undefined)}
        title={`Cancel ${cancellingItem?.name ?? "dish"}?`}
        description="It stays on the order, crossed out, and isn't charged."
        confirmLabel="Cancel dish"
        quickReasons={["Guest changed mind", "Out of stock", "Ordered by mistake"]}
        onConfirm={(reason) => {
          const line = cancellingItem;
          if (line && tryAction(() => cancelOrderItem(order.id, line.id, reason))) {
            toast.success(`${line.name} cancelled`, { description: reason });
          }
        }}
      />
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm text-muted-foreground">
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
