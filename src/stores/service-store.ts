import { create } from "zustand";
import { DEFAULT_TAX_RATE_BASIS_POINTS, DEMO_STAFF_ID } from "@/config/constants";
import {
  nextInvoiceNumber,
  setOrderDiscount,
  settleOrder,
} from "@/domain/billing/checkout";
import type { PaymentDraft } from "@/domain/billing/payments";
import { DomainError } from "@/domain/errors";
import { cancelItem } from "@/domain/orders/cancel-item";
import { createOrder, nextOrderNumber } from "@/domain/orders/create-order";
import { addItemsToOrder, splitOrder } from "@/domain/orders/order-changes";
import { moveOrder } from "@/domain/orders/order-state-machine";
import { orderWhere } from "@/domain/orders/order-where";
import {
  changeStatusSafely,
  openOrdersAt,
  startOrderAtTable,
  tablesJoinedTo,
} from "@/domain/tables/table-guards";
import { mergeTables, transferOrder, unmergeTables } from "@/domain/tables/table-orders";
import { newId } from "@/lib/utils/id";
import { sampleOrders } from "@/mocks/data/orders";
import { sampleTables } from "@/mocks/data/tables";
import type { Id } from "@/types/common";
import type {
  DeliveryDetails,
  Discount,
  Order,
  OrderItem,
  OrderStatus,
  OrderType,
} from "@/types/order";
import type { Invoice, Payment } from "@/types/payment";
import type { RestaurantTable, TableStatus } from "@/types/table";

/** Everything the New order screen sends when "Send to kitchen" is tapped. */
export type PlaceOrderInput = {
  type: OrderType;
  items: OrderItem[];
  tableId?: Id;
  customerName?: string;
  delivery?: DeliveryDetails;
  createdBy: Id;
};

/** What the floor plan editor saves: where tables are and what they look like. */
export type TableLayout = Pick<RestaurantTable, "id" | "name" | "seats" | "x" | "y">;

type ServiceState = {
  tables: RestaurantTable[];
  orders: Order[];
  payments: Payment[];
  invoices: Invoice[];

  // orders
  placeOrder: (input: PlaceOrderInput) => Order;
  setOrderStatus: (orderId: Id, to: Exclude<OrderStatus, "paid" | "cancelled">) => void;
  cancelOrder: (orderId: Id, reason: string) => void;
  cancelOrderItem: (orderId: Id, lineId: Id, reason: string) => void;
  addItemsToOrder: (orderId: Id, lines: OrderItem[]) => void;
  splitOrder: (orderId: Id, moves: Record<Id, number>) => Order;

  // billing
  setDiscount: (orderId: Id, discount: Discount | undefined) => void;
  /** Takes the payment parts, marks the order paid, frees its tables. */
  settleOrder: (orderId: Id, parts: PaymentDraft[]) => Invoice;

  // tables
  setTableStatus: (tableId: Id, to: TableStatus) => void;
  moveOrderToTable: (orderId: Id, toTableId: Id) => void;
  joinTables: (mainTableId: Id, joiningIds: Id[]) => void;
  separateTables: (mainTableId: Id) => void;
  saveLayout: (layout: TableLayout[]) => void;
};

const now = () => new Date().toISOString();

/** Finds a record or throws a readable error (the UI shows it as a toast). */
function mustFind<T extends { id: Id }>(list: T[], id: Id, what: string): T {
  const found = list.find((entry) => entry.id === id);
  if (!found) throw new DomainError(`That ${what} doesn't exist any more.`);
  return found;
}

/** Puts updated records back into a list, matching by id. */
function replaceAll<T extends { id: Id }>(list: T[], updated: T[]): T[] {
  const byId = new Map(updated.map((entry) => [entry.id, entry]));
  return list.map((entry) => byId.get(entry.id) ?? entry);
}

/**
 * THE SERVICE STORE: everything happening on the floor right now:
 * tables, orders, and the payments and invoices that close orders.
 *
 * Tables and orders live in ONE store on purpose. Moving an order changes the
 * order AND two tables. With one store, all three change in a single set(),
 * so the screen can never show the order moved but the old table still busy.
 *
 * Each action: read the current state → call the tested rules in domain/ →
 * save every changed record at once. If a rule is broken, the rule throws
 * BEFORE set() runs, so nothing changes at all.
 *
 * A table can hold several open orders (a second round, or split bills).
 *
 * In memory for now (sample data, reset on refresh). Step 19: IndexedDB.
 */
export const useServiceStore = create<ServiceState>()((set, get) => {
  /** Applies a change to one order and saves it. */
  const updateOrder = (orderId: Id, change: (order: Order) => Order) => {
    const { orders } = get();
    const updated = change(mustFind(orders, orderId, "order"));
    set({ orders: replaceAll(orders, [updated]) });
  };
  const by = () => ({ at: now(), by: DEMO_STAFF_ID }); // who did it, and when (login: Step 18)

  return {
    tables: sampleTables,
    orders: sampleOrders,
    payments: [],
    invoices: [],

    // ─── Orders ──────────────────────────────────────────────────────────────

    placeOrder: ({ tableId, ...input }) => {
      const { tables, orders } = get();
      const at = now();
      const order = createOrder({
        ...input,
        id: newId("order"),
        number: nextOrderNumber(orders),
        at,
      });

      if (order.type !== "dine-in") {
        set({ orders: [...orders, order] });
        return order;
      }
      if (!tableId) throw new DomainError("Choose a table for this dine-in order.");
      // New order + its table, saved together (or neither, if a rule says no).
      const seated = startOrderAtTable(
        order,
        mustFind(tables, tableId, "table"),
        tables,
        orders,
        at,
      );
      set({
        orders: [...orders, seated.order],
        tables: replaceAll(tables, [seated.table]),
      });
      return seated.order;
    },

    // "paid" only happens at checkout (with a payment), "cancelled" needs a reason.
    setOrderStatus: (orderId, to) =>
      updateOrder(orderId, (order) => moveOrder(order, to, by())),

    cancelOrder: (orderId, reason) =>
      updateOrder(orderId, (order) => moveOrder(order, "cancelled", by(), reason)),

    cancelOrderItem: (orderId, lineId, reason) =>
      updateOrder(orderId, (order) => cancelItem(order, lineId, reason, by())),

    addItemsToOrder: (orderId, lines) =>
      updateOrder(orderId, (order) => addItemsToOrder(order, lines, now())),

    splitOrder: (orderId, moves) => {
      const { orders } = get();
      const { original, created } = splitOrder(
        mustFind(orders, orderId, "order"),
        moves,
        {
          id: newId("order"),
          number: nextOrderNumber(orders),
          at: now(),
        },
      );
      set({ orders: [...replaceAll(orders, [original]), created] });
      return created;
    },

    // ─── Billing ─────────────────────────────────────────────────────────────

    setDiscount: (orderId, discount) =>
      updateOrder(orderId, (order) => setOrderDiscount(order, discount, now())),

    settleOrder: (orderId, parts) => {
      const { tables, orders, payments, invoices } = get();
      const order = mustFind(orders, orderId, "order");
      const tableName = (id: Id) => tables.find((t) => t.id === id)?.name;
      // Order paid + payments + invoice + freed tables: ONE set(), all or nothing.
      const result = settleOrder({
        order,
        tables,
        orders,
        parts,
        taxRateBasisPoints: DEFAULT_TAX_RATE_BASIS_POINTS, // Settings: Step 18
        where: orderWhere(order, tableName),
        invoiceNumber: nextInvoiceNumber(invoices),
        ...by(),
        newId,
      });
      set({
        orders: replaceAll(orders, [result.order]),
        tables: replaceAll(tables, result.tables),
        payments: [...payments, ...result.payments],
        invoices: [...invoices, result.invoice],
      });
      return result.invoice;
    },

    // ─── Tables ──────────────────────────────────────────────────────────────

    setTableStatus: (tableId, to) => {
      const { tables, orders } = get();
      const updated = changeStatusSafely(
        mustFind(tables, tableId, "table"),
        to,
        tables,
        orders,
      );
      set({ tables: replaceAll(tables, [updated]) });
    },

    moveOrderToTable: (orderId, toTableId) => {
      const { tables, orders } = get();
      const order = mustFind(orders, orderId, "order");
      const from = mustFind(tables, order.tableIds[0] ?? "", "table");
      const to = mustFind(tables, toTableId, "table");
      const result = transferOrder(order, from, to, now());
      // If other orders are still open at the old table, its guests are still
      // there: it stays Occupied instead of going to Cleaning.
      const othersRemain = openOrdersAt(from, orders).some((o) => o.id !== orderId);
      set({
        orders: replaceAll(orders, [result.order]),
        tables: replaceAll(tables, [othersRemain ? from : result.from, result.to]),
      });
    },

    joinTables: (mainTableId, joiningIds) => {
      const { tables, orders } = get();
      const main = mustFind(tables, mainTableId, "table");
      const joining = joiningIds.map((id) => mustFind(tables, id, "table"));
      const result = mergeTables(main, joining, undefined, now());
      // Every open order at the main table now covers the joined tables too.
      const linked = openOrdersAt(main, orders).map((order) => ({
        ...order,
        tableIds: [...new Set([...order.tableIds, ...joiningIds])],
      }));
      set({
        tables: replaceAll(tables, [result.main, ...result.joined]),
        orders: replaceAll(orders, linked),
      });
    },

    separateTables: (mainTableId) => {
      const { tables, orders } = get();
      const main = mustFind(tables, mainTableId, "table");
      const joined = tablesJoinedTo(main, tables);
      const result = unmergeTables(main, joined, undefined, now());
      const leaving = new Set(joined.map((t) => t.id));
      const unlinked = openOrdersAt(main, orders).map((order) => ({
        ...order,
        tableIds: order.tableIds.filter((id) => !leaving.has(id)),
      }));
      set({
        tables: replaceAll(tables, result.separated),
        orders: replaceAll(orders, unlinked),
      });
    },

    saveLayout: (layout) =>
      set((state) => {
        const current = new Map(state.tables.map((t) => [t.id, t]));
        return {
          // Keep each table's live status; take position and looks from the editor.
          // New tables start Available. Tables left out of the layout were removed.
          // Copy ONLY the layout fields, by name. Even if a caller passes objects
          // with extra fields (like a status), they can't change live data.
          tables: layout.map(({ id, name, seats, x, y }) => {
            const existing = current.get(id);
            const placed = { name, seats, x, y };
            return existing
              ? { ...existing, ...placed }
              : { id, ...placed, status: "available" as const };
          }),
        };
      }),
  };
});
