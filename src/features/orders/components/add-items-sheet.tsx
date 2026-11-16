"use client";

import { useState } from "react";
import { toast } from "sonner";
import { BottomSheet } from "@/components/ui/dialog";
import { hasChoices } from "@/domain/menu/menu-rules";
import { buildOrderItem } from "@/domain/orders/item-choices";
import { newId } from "@/lib/utils/id";
import { tryAction } from "@/lib/utils/try-action";
import { useMenuStore } from "@/stores/menu-store";
import { useServiceStore } from "@/stores/service-store";
import type { MenuItem } from "@/types/menu";
import type { Order, OrderItem } from "@/types/order";
import { ItemChoiceSheet } from "./item-choice-sheet";
import { MenuBrowser } from "./menu-browser";

/**
 * "One more naan for table 4": add dishes straight to an order that's still
 * in the kitchen. Reuses the New order screen's menu and choice sheet; the
 * only difference is where the dish goes (this order instead of the cart).
 */
export function AddItemsSheet({
  order,
  open,
  onClose,
}: {
  order: Order;
  open: boolean;
  onClose: () => void;
}) {
  const addItemsToOrder = useServiceStore((s) => s.addItemsToOrder);
  const addOns = useMenuStore((s) => s.addOns);
  const modifierGroups = useMenuStore((s) => s.modifierGroups);
  const [picked, setPicked] = useState<MenuItem>();

  function add(line: OrderItem) {
    addItemsToOrder(order.id, [line]); // throws a readable error if not allowed
    toast.success(`Added to order ${order.number}`, {
      description: `${line.quantity} × ${line.name}`,
    });
  }

  function pick(item: MenuItem) {
    if (hasChoices(item)) {
      setPicked(item);
      return;
    }
    tryAction(() =>
      add(
        buildOrderItem(
          item,
          { addOnIds: [], optionIds: {}, quantity: 1 },
          { addOns, modifierGroups },
          newId("line"),
        ),
      ),
    );
  }

  return (
    <>
      <BottomSheet
        open={open}
        onClose={onClose}
        title={`Add dishes to order ${order.number}`}
        description="The kitchen sees them on the same ticket."
      >
        <MenuBrowser
          onPick={pick}
          lines={order.items.filter((i) => i.status === "active")}
        />
      </BottomSheet>
      <ItemChoiceSheet item={picked} onClose={() => setPicked(undefined)} onAdd={add} />
    </>
  );
}
