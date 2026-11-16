"use client";

import { useEffect } from "react";
import { useCartStore } from "@/stores/cart-store";
import type { Id } from "@/types/common";

/**
 * Coming from a table ("Start order at T5" on the Tables page), the address is
 * /orders/new?table=t5. This invisible helper picks that table in the cart.
 * It's the only part of the page that waits for the address, so the rest of
 * the screen can show at once.
 */
export function PreselectTable({ tableId }: { tableId?: Id }) {
  const setType = useCartStore((s) => s.setType);
  const setTableId = useCartStore((s) => s.setTableId);
  useEffect(() => {
    if (tableId) {
      setType("dine-in");
      setTableId(tableId);
    }
  }, [tableId, setType, setTableId]);
  return null;
}
