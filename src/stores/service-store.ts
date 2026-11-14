import { create } from "zustand";
import { DomainError } from "@/domain/errors";
import {
  openOrderAt,
  changeStatusSafely,
  tablesJoinedTo,
} from "@/domain/tables/table-guards";
import { mergeTables, transferOrder, unmergeTables } from "@/domain/tables/table-orders";
import { sampleOrders } from "@/mocks/data/orders";
import { sampleTables } from "@/mocks/data/tables";
import type { Id } from "@/types/common";
import type { Order } from "@/types/order";
import type { RestaurantTable, TableStatus } from "@/types/table";

/** What the floor plan editor saves: where tables are and what they look like. */
export type TableLayout = Pick<
  RestaurantTable,
  "id" | "name" | "seats" | "shape" | "x" | "y"
>;

type ServiceState = {
  tables: RestaurantTable[];
  orders: Order[];

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
 * tables and orders (payments join in Step 15).
 *
 * Tables and orders live in ONE store on purpose. Moving an order changes the
 * order AND two tables. With one store, all three change in a single set(),
 * so the screen can never show the order moved but the old table still busy.
 *
 * Each action: read the current state → call the tested rules in domain/ →
 * save every changed record at once. If a rule is broken, the rule throws
 * BEFORE set() runs, so nothing changes at all.
 *
 * In memory for now (sample data, reset on refresh). Step 19: IndexedDB.
 */
export const useServiceStore = create<ServiceState>()((set, get) => ({
  tables: sampleTables,
  orders: sampleOrders,

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
    set({
      orders: replaceAll(orders, [result.order]),
      tables: replaceAll(tables, [result.from, result.to]),
    });
  },

  joinTables: (mainTableId, joiningIds) => {
    const { tables, orders } = get();
    const main = mustFind(tables, mainTableId, "table");
    const joining = joiningIds.map((id) => mustFind(tables, id, "table"));
    const result = mergeTables(main, joining, openOrderAt(main, orders), now());
    set({
      tables: replaceAll(tables, [result.main, ...result.joined]),
      orders: result.order ? replaceAll(orders, [result.order]) : orders,
    });
  },

  separateTables: (mainTableId) => {
    const { tables, orders } = get();
    const main = mustFind(tables, mainTableId, "table");
    const result = unmergeTables(
      main,
      tablesJoinedTo(main, tables),
      openOrderAt(main, orders),
      now(),
    );
    set({
      tables: replaceAll(tables, result.separated),
      orders: result.order ? replaceAll(orders, [result.order]) : orders,
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
        tables: layout.map(({ id, name, seats, shape, x, y }) => {
          const existing = current.get(id);
          const placed = { name, seats, shape, x, y };
          return existing
            ? { ...existing, ...placed }
            : { id, ...placed, status: "available" as const };
        }),
      };
    }),
}));
