"use client";

import { ChevronRight, PencilRuler, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { Card } from "@/components/ui/card";
import { ChipGroup } from "@/components/ui/chip-group";
import { formatRupees } from "@/domain/money";
import { openOrderAt } from "@/domain/tables/table-guards";
import { TABLE_STATUS_LABEL } from "@/domain/tables/table-state-machine";
import { useNow } from "@/lib/hooks/use-now";
import { cn } from "@/lib/utils/cn";
import { timeSince } from "@/lib/utils/time";
import { useServiceStore } from "@/stores/service-store";
import type { Id } from "@/types/common";
import type { RestaurantTable } from "@/types/table";
import { summarizeOrder } from "../order-summary";
import { STATUS_ORDER, TABLE_STATUS_STYLE } from "../table-style";
import { FloorCanvas } from "./floor-canvas";
import { TableSheet } from "./table-sheet";
import { TableTile } from "./table-tile";

type View = "floor" | "list";

export function TablesScreen() {
  const tables = useServiceStore((s) => s.tables);
  const orders = useServiceStore((s) => s.orders);
  const now = useNow();

  const [view, setView] = useState<View>("floor");
  const [selectedId, setSelectedId] = useState<Id>();

  const counts = useMemo(() => {
    const result = { available: 0, occupied: 0, reserved: 0, cleaning: 0 };
    tables.forEach((t) => (result[t.status] += 1));
    return result;
  }, [tables]);

  const nameOf = useMemo(() => new Map(tables.map((t) => [t.id, t.name])), [tables]);
  const sortedForList = useMemo(
    () =>
      [...tables].sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { numeric: true }),
      ),
    [tables],
  );

  const select = (table: RestaurantTable) => setSelectedId(table.id);

  return (
    <>
      <PageHeader
        title="Tables"
        description={`${counts.available} free · ${counts.occupied} occupied · ${tables.length} tables in total`}
        actions={
          <>
            <ButtonLink href="/tables/editor" variant="secondary">
              <PencilRuler aria-hidden="true" /> Edit floor plan
            </ButtonLink>
            <ButtonLink href="/orders/new">
              <Plus aria-hidden="true" /> New order
            </ButtonLink>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="Tables by status">
          {STATUS_ORDER.map((status) => (
            <li key={status} className="flex items-center gap-2 text-sm">
              <span
                className={cn("size-3 rounded-full", TABLE_STATUS_STYLE[status].dot)}
                aria-hidden="true"
              />
              {TABLE_STATUS_LABEL[status]}
              <span className="font-semibold tabular-nums">{counts[status]}</span>
            </li>
          ))}
        </ul>
        <ChipGroup<View>
          label="View"
          value={view}
          onChange={setView}
          options={[
            { value: "floor", label: "Floor plan" },
            { value: "list", label: "List" },
          ]}
        />
      </div>

      {view === "floor" ? (
        <FloorCanvas>
          {tables.map((table) => (
            <TableTile
              key={table.id}
              table={table}
              order={openOrderAt(table, orders)}
              joinedToName={
                table.mergedIntoId ? nameOf.get(table.mergedIntoId) : undefined
              }
              now={now}
              onSelect={select}
            />
          ))}
        </FloorCanvas>
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {sortedForList.map((table) => {
              const order = openOrderAt(table, orders);
              const summary = order && summarizeOrder(order);
              const style = TABLE_STATUS_STYLE[table.status];
              return (
                <li key={table.id}>
                  <button
                    type="button"
                    onClick={() => select(table)}
                    className="flex min-h-16 w-full items-center gap-4 px-5 py-3 text-left hover:bg-surface-muted"
                  >
                    <span className="w-12 font-display text-xl font-semibold">
                      {table.name}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col">
                      <span className="text-sm text-muted-foreground">
                        {table.seats} seats
                        {table.mergedIntoId &&
                          ` · joined to ${nameOf.get(table.mergedIntoId)}`}
                      </span>
                      {order && summary && (
                        <span className="text-sm font-semibold">
                          Order {order.number} · {formatRupees(summary.totalPaise)} ·{" "}
                          {timeSince(order.createdAt, now)}
                        </span>
                      )}
                    </span>
                    <Badge variant={style.badge}>
                      {TABLE_STATUS_LABEL[table.status]}
                    </Badge>
                    <ChevronRight
                      className="size-5 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <TableSheet
        tableId={selectedId}
        onClose={() => setSelectedId(undefined)}
        onShowTable={setSelectedId}
        now={now}
      />
    </>
  );
}
