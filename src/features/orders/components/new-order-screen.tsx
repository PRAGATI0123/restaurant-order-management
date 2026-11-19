"use client";

import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { BottomSheet } from "@/components/ui/dialog";
import { calculateBill } from "@/domain/billing/calculate-bill";
import { hasChoices } from "@/domain/menu/menu-rules";
import { cartCount } from "@/domain/orders/cart";
import { buildOrderItem } from "@/domain/orders/item-choices";
import { formatRupees } from "@/domain/money";
import { newId } from "@/lib/utils/id";
import { tryAction } from "@/lib/utils/try-action";
import { validateDelivery } from "@/lib/validation/order";
import { useCartStore } from "@/stores/cart-store";
import { useMenuStore } from "@/stores/menu-store";
import { useServiceStore } from "@/stores/service-store";
import { DomainError } from "@/domain/errors";
import type { MenuItem } from "@/types/menu";
import type { DeliveryDetails, Order } from "@/types/order";
import { CartPanel } from "./cart-panel";
import { ItemChoiceSheet } from "./item-choice-sheet";
import { MenuBrowser } from "./menu-browser";
import { OrderSetup } from "./order-setup";
import { useTaxRate } from "@/stores/settings-store";

/**
 * TAKING AN ORDER
 *  1. Choose dine-in (+ table), takeaway (+ name) or delivery (+ address).
 *  2. Tap dishes. Dishes with choices open a sheet; simple ones go straight in.
 *  3. Check the cart, then "Send to kitchen".
 * The order then exists with status "new" (and its table is Occupied).
 */
export function NewOrderScreen() {
  const taxRate = useTaxRate(); // GST from Settings
  const cart = useCartStore();
  const tables = useServiceStore((s) => s.tables);
  const placeOrder = useServiceStore((s) => s.placeOrder);
  const addOns = useMenuStore((s) => s.addOns);
  const modifierGroups = useMenuStore((s) => s.modifierGroups);

  const [picked, setPicked] = useState<MenuItem>();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [cartOpen, setCartOpen] = useState(false);

  const tableName = tables.find((t) => t.id === cart.tableId)?.name;
  const summary =
    cart.type === "dine-in"
      ? `Dine-in${tableName ? ` · ${tableName}` : ""}`
      : cart.type === "takeaway"
        ? "Takeaway"
        : "Delivery";
  const count = cartCount(cart.lines);
  const total = calculateBill({
    items: cart.lines,
    taxRateBasisPoints: taxRate,
  }).totalPaise;

  function pick(item: MenuItem) {
    if (hasChoices(item)) {
      setPicked(item);
      return;
    }
    // A simple dish (no size or options): straight into the order.
    tryAction(() =>
      cart.addLine(
        buildOrderItem(
          item,
          { addOnIds: [], optionIds: {}, quantity: 1 },
          { addOns, modifierGroups },
          newId("line"),
        ),
      ),
    );
  }

  function send() {
    const nextErrors: Record<string, string> = {};
    let delivery: DeliveryDetails | undefined;
    if (cart.type === "dine-in" && !cart.tableId) nextErrors.table = "Choose a table.";
    if (cart.type === "delivery") {
      const checked = validateDelivery(cart.delivery);
      if (checked.ok) delivery = checked.data;
      else Object.assign(nextErrors, checked.errors);
    }
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      setCartOpen(false); // show the form fields that need fixing
      toast.error("Some details are missing", {
        description: Object.values(nextErrors)[0],
      });
      return;
    }

    let order: Order;
    try {
      order = placeOrder({
        type: cart.type,
        items: cart.lines,
        tableId: cart.tableId,
        customerName: cart.customerName,
        delivery,
      });
    } catch (error) {
      // A business rule said no (e.g. the table was just taken by someone else).
      if (error instanceof DomainError) {
        toast.error(error.message);
        return;
      }
      throw error; // a real bug: don't hide it
    }

    toast.success(`Order ${order.number} sent to the kitchen`, {
      description: `${summary} · ${count} ${count === 1 ? "item" : "items"} · ${formatRupees(total)}`,
    });
    cart.reset();
    setErrors({});
    setCartOpen(false);
  }

  return (
    <>
      <PageHeader
        title="New Order"
        description="Choose the order type, add dishes, then send it to the kitchen."
        back={{ href: "/orders", label: "Back to orders" }}
      />

      <div className="grid gap-6 pb-24 xl:grid-cols-[1fr_24rem] xl:pb-0">
        <div className="flex min-w-0 flex-col gap-8">
          <OrderSetup errors={errors} />
          <MenuBrowser onPick={pick} />
        </div>
        <aside className="hidden xl:block" aria-label="Current order">
          <div className="sticky top-8">
            <CartPanel summary={summary} onSend={send} />
          </div>
        </aside>
      </div>

      {/* Below 1280px the menu needs the room: the cart lives behind a bar at the bottom. */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 p-3 backdrop-blur lg:left-64 xl:hidden">
        <Button size="lg" fullWidth onClick={() => setCartOpen(true)}>
          <ShoppingCart aria-hidden="true" />
          {count === 0
            ? "Order is empty"
            : `View order · ${count} ${count === 1 ? "item" : "items"} · ${formatRupees(total)}`}
        </Button>
      </div>
      <BottomSheet
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        title="Current order"
        description={summary}
      >
        <CartPanel summary={summary} onSend={send} embedded />
      </BottomSheet>

      <ItemChoiceSheet item={picked} onClose={() => setPicked(undefined)} />
    </>
  );
}
