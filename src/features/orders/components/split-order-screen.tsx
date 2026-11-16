"use client";

import { ArrowRightLeft, ClipboardList } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { DEFAULT_TAX_RATE_BASIS_POINTS } from "@/config/constants";
import { calculateBill } from "@/domain/billing/calculate-bill";
import { DomainError } from "@/domain/errors";
import { nextOrderNumber } from "@/domain/orders/create-order";
import { splitOrder } from "@/domain/orders/order-changes";
import { formatRupees } from "@/domain/money";
import { tryAction } from "@/lib/utils/try-action";
import { useServiceStore } from "@/stores/service-store";
import type { Id } from "@/types/common";
import type { Order } from "@/types/order";

/**
 * SPLIT AN ORDER: choose how many of each dish move to a new order
 * (separate bills for friends at one table). Both orders are previewed live,
 * using the same splitOrder rule the store will use, so what you see is
 * exactly what you get.
 */
export function SplitOrderScreen({ orderId }: { orderId: Id }) {
  const router = useRouter();
  const orders = useServiceStore((s) => s.orders);
  const doSplit = useServiceStore((s) => s.splitOrder);
  const [moves, setMoves] = useState<Record<Id, number>>({});

  const order = orders.find((o) => o.id === orderId);
  if (!order) {
    return (
      <>
        <PageHeader
          title="Split Order"
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

  // Preview: run the real rule on a copy. If it says no, show why.
  const nextNumber = nextOrderNumber(orders);
  let preview: { original: Order; created: Order } | undefined;
  let problem: string | undefined;
  try {
    preview = splitOrder(order, moves, {
      id: "preview",
      number: nextNumber,
      at: order.updatedAt,
    });
  } catch (error) {
    if (!(error instanceof DomainError)) throw error;
    problem = error.message;
  }
  const nothingChosen = Object.values(moves).every((q) => q === 0);

  const active = order.items.filter((i) => i.status === "active");

  return (
    <>
      <PageHeader
        title={`Split order ${order.number}`}
        description="Choose how many of each dish go to a new order, e.g. for separate bills."
        back={{ href: `/orders/${order.id}`, label: `Back to order ${order.number}` }}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <Card>
          <CardHeader>
            <CardTitle>Move to the new order</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {active.map((line) => (
                <li
                  key={line.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3"
                >
                  <span className="min-w-0">
                    <span className="block font-semibold">{line.name}</span>
                    <span className="block text-sm text-muted-foreground">
                      {line.quantity} on the order
                      {line.variant && ` · ${line.variant.name}`}
                    </span>
                  </span>
                  <QuantityStepper
                    label={line.name}
                    min={0}
                    max={line.quantity}
                    value={moves[line.id] ?? 0}
                    onChange={(quantity) =>
                      setMoves((m) => ({ ...m, [line.id]: quantity }))
                    }
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <PreviewCard
            title={`Stays on #${order.number}`}
            order={preview?.original ?? order}
          />
          <PreviewCard
            title={`New order #${nextNumber}`}
            order={preview?.created}
            empty="Nothing moved yet."
          />
          {!nothingChosen && problem && (
            <p role="alert" className="text-sm font-medium text-danger">
              {problem}
            </p>
          )}
          <Button
            size="lg"
            fullWidth
            disabled={!preview}
            onClick={() => {
              let created: Order | undefined;
              if (tryAction(() => (created = doSplit(order.id, moves))) && created) {
                toast.success(`Order ${created.number} created`, {
                  description: `Split from order ${order.number}`,
                });
                router.push(`/orders/${created.id}`);
              }
            }}
          >
            <ArrowRightLeft aria-hidden="true" /> Split into a new order
          </Button>
        </div>
      </div>
    </>
  );
}

function PreviewCard({
  title,
  order,
  empty,
}: {
  title: string;
  order?: Order;
  empty?: string;
}) {
  const lines = order?.items.filter((i) => i.status === "active") ?? [];
  const total = order
    ? calculateBill({
        items: order.items,
        discount: order.discount,
        taxRateBasisPoints: DEFAULT_TAX_RATE_BASIS_POINTS,
      }).totalPaise
    : 0;
  return (
    <Card className="p-4">
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <h3 className="font-semibold">{title}</h3>
        <span className="font-semibold tabular-nums">{formatRupees(total)}</span>
      </div>
      {lines.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <ul className="text-sm text-muted-foreground">
          {lines.map((line) => (
            <li key={line.id}>
              {line.quantity} × {line.name}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
