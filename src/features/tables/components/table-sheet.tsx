"use client";

import {
  ArrowLeft,
  ArrowRightLeft,
  Link2,
  Plus,
  Receipt,
  Unlink,
  Users,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { BottomSheet } from "@/components/ui/dialog";
import { ORDER_STATUS_LABEL } from "@/domain/orders/order-state-machine";
import { formatRupees } from "@/domain/money";
import {
  checkStatusChange,
  openOrdersAt,
  tablesJoinedTo,
} from "@/domain/tables/table-guards";
import { totalSeats } from "@/domain/tables/table-orders";
import {
  TABLE_STATUS_LABEL,
  nextTableStatuses,
} from "@/domain/tables/table-state-machine";
import { cn } from "@/lib/utils/cn";
import { timeSince } from "@/lib/utils/time";
import { tryAction } from "@/lib/utils/try-action";
import { useServiceStore } from "@/stores/service-store";
import type { Id } from "@/types/common";
import type { RestaurantTable } from "@/types/table";
import { summarizeOrder } from "../order-summary";
import { STATUS_ACTION_LABEL } from "../table-style";

type TableSheetProps = {
  tableId: Id | undefined;
  onClose: () => void;
  /** Switch the sheet to another table (e.g. from a joined table to its main one). */
  onShowTable: (tableId: Id) => void;
  now: number | null;
};

type Mode = "overview" | "move" | "join";

/** The panel that slides up when you tap a table: its order and what you can do. */
export function TableSheet({ tableId, onClose, onShowTable, now }: TableSheetProps) {
  const tables = useServiceStore((s) => s.tables);
  const orders = useServiceStore((s) => s.orders);
  const table = tables.find((t) => t.id === tableId);

  return (
    <BottomSheet
      open={table !== undefined}
      onClose={onClose}
      title={table ? `Table ${table.name}` : "Table"}
      description={
        table ? `${table.seats} seats · ${TABLE_STATUS_LABEL[table.status]}` : undefined
      }
    >
      {table && (
        // key: a fresh panel (back to the overview) for every table opened
        <SheetBody
          key={table.id}
          table={table}
          tables={tables}
          orders={orders}
          now={now}
          onClose={onClose}
          onShowTable={onShowTable}
        />
      )}
    </BottomSheet>
  );
}

function SheetBody({
  table,
  tables,
  orders,
  now,
  onClose,
  onShowTable,
}: {
  table: RestaurantTable;
  tables: RestaurantTable[];
  orders: ReturnType<typeof useServiceStore.getState>["orders"];
  now: number | null;
  onClose: () => void;
  onShowTable: (tableId: Id) => void;
}) {
  const setTableStatus = useServiceStore((s) => s.setTableStatus);
  const moveOrderToTable = useServiceStore((s) => s.moveOrderToTable);
  const joinTables = useServiceStore((s) => s.joinTables);
  const separateTables = useServiceStore((s) => s.separateTables);

  const [mode, setMode] = useState<Mode>("overview");
  const [joining, setJoining] = useState<Id[]>([]);
  const [movingId, setMovingId] = useState<Id>();

  // A table can hold several open orders (a second round, or split bills).
  const tableOrders = openOrdersAt(table, orders);
  const moving = tableOrders.find((o) => o.id === movingId);
  const joined = tablesJoinedTo(table, tables);
  const mainTable = table.mergedIntoId
    ? tables.find((t) => t.id === table.mergedIntoId)
    : undefined;
  const freeTables = tables.filter((t) => t.status === "available" && !t.mergedIntoId);

  // ── A table joined to another: everything is done from the main table ──
  if (mainTable) {
    return (
      <div className="flex flex-col gap-4">
        <p className="flex items-center gap-2 rounded-xl bg-surface-muted p-4">
          <Link2 className="size-5 text-primary" aria-hidden="true" />
          {table.name} is joined to {mainTable.name}. Manage them from {mainTable.name}.
        </p>
        <Button size="lg" onClick={() => onShowTable(mainTable.id)}>
          Open {mainTable.name}
        </Button>
      </div>
    );
  }

  // ── Choose a free table to move the order to ──
  if (mode === "move" && moving) {
    const order = moving;
    const othersRemain = tableOrders.length > 1;
    return (
      <div className="flex flex-col gap-4">
        <BackButton onClick={() => setMode("overview")} />
        <p className="font-semibold">
          Move order {order.number} from {table.name} to:
        </p>
        <FreeTablePicker
          tables={freeTables}
          emptyText="No free tables right now."
          isChosen={() => false}
          onPick={(target) => {
            if (tryAction(() => moveOrderToTable(order.id, target.id))) {
              toast.success(`Order ${order.number} moved to ${target.name}`, {
                description: othersRemain
                  ? `${table.name} still has its other orders.`
                  : `${table.name} now needs cleaning.`,
              });
              onClose();
            }
          }}
        />
      </div>
    );
  }

  // ── Choose free tables to join onto this one ──
  if (mode === "join") {
    const chosen = freeTables.filter((t) => joining.includes(t.id));
    return (
      <div className="flex flex-col gap-4">
        <BackButton onClick={() => setMode("overview")} />
        <p className="font-semibold">
          Join free tables to {table.name} for a bigger group:
        </p>
        <FreeTablePicker
          tables={freeTables.filter((t) => t.id !== table.id)}
          emptyText="No free tables to join."
          isChosen={(t) => joining.includes(t.id)}
          onPick={(t) =>
            setJoining((ids) =>
              ids.includes(t.id) ? ids.filter((id) => id !== t.id) : [...ids, t.id],
            )
          }
        />
        <Button
          size="lg"
          disabled={chosen.length === 0}
          onClick={() => {
            if (tryAction(() => joinTables(table.id, joining))) {
              toast.success(
                `${chosen.map((t) => t.name).join(", ")} joined to ${table.name}`,
                { description: `${totalSeats(table, chosen)} seats together` },
              );
              onClose();
            }
          }}
        >
          <Link2 aria-hidden="true" />
          {chosen.length === 0
            ? "Choose tables"
            : `Join ${chosen.length} ${chosen.length === 1 ? "table" : "tables"} · ${totalSeats(table, chosen)} seats`}
        </Button>
      </div>
    );
  }

  // ── Overview ──
  const statusOptions = nextTableStatuses(table.status).map((to) => ({
    to,
    label: STATUS_ACTION_LABEL[`${table.status}>${to}`] ?? TABLE_STATUS_LABEL[to],
    check: checkStatusChange(table, to, tables, orders),
  }));
  const blockedReason = statusOptions.find((option) => !option.check.ok)?.check;

  return (
    <div className="flex flex-col gap-5">
      {tableOrders.map((order) => {
        const summary = summarizeOrder(order);
        return (
          <div
            key={order.id}
            className="flex flex-col gap-3 rounded-xl border border-border p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-display text-xl font-semibold">
                Order {order.number}
              </span>
              <Badge variant="primary">{ORDER_STATUS_LABEL[order.status]}</Badge>
            </div>
            <p className="flex flex-wrap items-baseline justify-between gap-2 text-muted-foreground">
              <span>
                {summary.itemCount} {summary.itemCount === 1 ? "item" : "items"} · placed{" "}
                {timeSince(order.createdAt, now)} ago
              </span>
              <span className="text-xl font-semibold text-foreground tabular-nums">
                {formatRupees(summary.totalPaise)}
              </span>
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <ButtonLink href={`/orders/${order.id}`} variant="secondary">
                <Receipt aria-hidden="true" /> Open order
              </ButtonLink>
              <Button
                variant="secondary"
                onClick={() => {
                  setMovingId(order.id);
                  setMode("move");
                }}
              >
                <ArrowRightLeft aria-hidden="true" /> Move to another table
              </Button>
            </div>
          </div>
        );
      })}

      {joined.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-surface-muted p-4">
          <span className="flex items-center gap-2">
            <Users className="size-5 text-primary" aria-hidden="true" />
            With {joined.map((t) => t.name).join(", ")} · {totalSeats(table, joined)}{" "}
            seats
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              if (tryAction(() => separateTables(table.id))) {
                toast.success("Tables separated", {
                  description: `${joined.map((t) => t.name).join(", ")} now need cleaning.`,
                });
              }
            }}
          >
            <Unlink aria-hidden="true" /> Separate
          </Button>
        </div>
      )}

      {table.status !== "cleaning" && (
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Take an order right here: the New order page opens with this table chosen.
              With orders already open, this is a "second round" (a new kitchen ticket). */}
          <ButtonLink href={`/orders/new?table=${table.id}`} size="lg">
            <Plus aria-hidden="true" />
            {tableOrders.length > 0
              ? "New order (another round)"
              : `Start order at ${table.name}`}
          </ButtonLink>
          <Button
            variant="secondary"
            size="lg"
            onClick={() => {
              setJoining([]);
              setMode("join");
            }}
          >
            <Link2 aria-hidden="true" /> Join tables
          </Button>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <span className="text-sm font-semibold">Change status</span>
        <div className="grid gap-3 sm:grid-cols-2">
          {statusOptions.map(({ to, label, check }) => (
            <Button
              key={to}
              size="lg"
              variant={to === "available" ? "primary" : "secondary"}
              disabled={!check.ok}
              onClick={() => {
                if (tryAction(() => setTableStatus(table.id, to))) {
                  toast.success(`${table.name} is now ${TABLE_STATUS_LABEL[to]}`);
                  onClose();
                }
              }}
            >
              {label}
            </Button>
          ))}
        </div>
        {blockedReason && !blockedReason.ok && (
          <p className="text-sm text-muted-foreground">{blockedReason.reason}</p>
        )}
      </div>
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" onClick={onClick} className="-ml-2 self-start">
      <ArrowLeft aria-hidden="true" /> Back
    </Button>
  );
}

/** Big buttons, one per free table. Used for moving and for joining. */
function FreeTablePicker({
  tables,
  emptyText,
  isChosen,
  onPick,
}: {
  tables: RestaurantTable[];
  emptyText: string;
  isChosen: (table: RestaurantTable) => boolean;
  onPick: (table: RestaurantTable) => void;
}) {
  if (tables.length === 0) {
    return (
      <p className="rounded-xl bg-surface-muted p-4 text-muted-foreground">{emptyText}</p>
    );
  }
  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {tables.map((t) => {
        const chosen = isChosen(t);
        return (
          <button
            key={t.id}
            type="button"
            aria-pressed={chosen}
            onClick={() => onPick(t)}
            className={cn(
              "flex h-20 flex-col items-center justify-center rounded-xl border-2 transition-colors",
              chosen
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-surface hover:border-primary",
            )}
          >
            <span className="font-display text-xl font-semibold">{t.name}</span>
            <span className={cn("text-xs", !chosen && "text-muted-foreground")}>
              {t.seats} seats
            </span>
          </button>
        );
      })}
    </div>
  );
}
