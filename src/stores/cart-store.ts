import { create } from "zustand";
import { addToCart, setLineNote, setLineQuantity } from "@/domain/orders/cart";
import type { DeliveryFormValues } from "@/lib/validation/order";
import type { Id } from "@/types/common";
import type { OrderItem, OrderType } from "@/types/order";

const EMPTY_DELIVERY: DeliveryFormValues = { customerName: "", phone: "", address: "" };

type CartState = {
  type: OrderType;
  tableId?: Id;
  customerName: string; // takeaway, optional
  delivery: DeliveryFormValues; // delivery, as typed
  lines: OrderItem[];

  setType: (type: OrderType) => void;
  setTableId: (tableId: Id | undefined) => void;
  setCustomerName: (name: string) => void;
  setDeliveryField: (field: keyof DeliveryFormValues, value: string) => void;
  addLine: (line: OrderItem) => void;
  setQuantity: (lineId: Id, quantity: number) => void;
  setNote: (lineId: Id, note: string) => void;
  reset: () => void;
};

/**
 * THE CART: the order being built on the New order screen, before it's sent.
 *
 * This is SCREEN state, not a business record: it lives only on this device
 * and is thrown away after sending. Because it's a store (not useState inside
 * the page), it survives leaving the page: start an order, check the floor
 * plan, come back, and the cart is still there.
 *
 * The rules (combine same dishes, 1–99, notes) are in domain/orders/cart.ts.
 */
export const useCartStore = create<CartState>()((set) => ({
  type: "dine-in",
  tableId: undefined,
  customerName: "",
  delivery: EMPTY_DELIVERY,
  lines: [],

  setType: (type) => set({ type }),
  setTableId: (tableId) => set({ tableId }),
  setCustomerName: (customerName) => set({ customerName }),
  setDeliveryField: (field, value) =>
    set((state) => ({ delivery: { ...state.delivery, [field]: value } })),
  addLine: (line) => set((state) => ({ lines: addToCart(state.lines, line) })),
  setQuantity: (lineId, quantity) =>
    set((state) => ({ lines: setLineQuantity(state.lines, lineId, quantity) })),
  setNote: (lineId, note) =>
    set((state) => ({ lines: setLineNote(state.lines, lineId, note) })),
  reset: () =>
    set({
      type: "dine-in",
      tableId: undefined,
      customerName: "",
      delivery: EMPTY_DELIVERY,
      lines: [],
    }),
}));
