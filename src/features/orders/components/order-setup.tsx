"use client";

import { Bike, ShoppingBag, Users, Utensils, type LucideIcon } from "lucide-react";
import { Field } from "@/components/ui/input";
import { whyCantStartOrder } from "@/domain/tables/table-guards";
import { TABLE_STATUS_LABEL } from "@/domain/tables/table-state-machine";
import { cn } from "@/lib/utils/cn";
import { useCartStore } from "@/stores/cart-store";
import { useServiceStore } from "@/stores/service-store";
import type { OrderType } from "@/types/order";
import { TABLE_STATUS_STYLE } from "@/features/tables/table-style";

const TYPES: { value: OrderType; label: string; icon: LucideIcon }[] = [
  { value: "dine-in", label: "Dine-in", icon: Utensils },
  { value: "takeaway", label: "Takeaway", icon: ShoppingBag },
  { value: "delivery", label: "Delivery", icon: Bike },
];

/** Step 1 of taking an order: what kind, and for whom (table, name or address). */
export function OrderSetup({ errors }: { errors: Record<string, string> }) {
  const type = useCartStore((s) => s.type);
  const setType = useCartStore((s) => s.setType);

  return (
    <section aria-label="Order details" className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Order type" className="grid grid-cols-3 gap-2">
        {TYPES.map(({ value, label, icon: Icon }) => {
          const selected = value === type;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setType(value)}
              className={cn(
                "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border-2 font-semibold transition-colors sm:flex-row sm:gap-2",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-5" aria-hidden="true" />
              {label}
            </button>
          );
        })}
      </div>

      {type === "dine-in" && <TablePicker error={errors.table} />}
      {type === "takeaway" && <TakeawayDetails />}
      {type === "delivery" && <DeliveryDetails errors={errors} />}
    </section>
  );
}

function TablePicker({ error }: { error?: string }) {
  const tables = useServiceStore((s) => s.tables);
  const orders = useServiceStore((s) => s.orders);
  const tableId = useCartStore((s) => s.tableId);
  const setTableId = useCartStore((s) => s.setTableId);

  // Only main tables are shown; a joined table is part of its main table's group.
  const candidates = tables
    .filter((t) => !t.mergedIntoId)
    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
  const chosen = tables.find((t) => t.id === tableId);
  const chosenProblem = chosen && whyCantStartOrder(chosen, tables, orders);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-semibold" id="table-label">
        Table
      </p>
      <div
        role="radiogroup"
        aria-labelledby="table-label"
        className="grid grid-cols-4 gap-2 sm:grid-cols-6"
      >
        {candidates.map((table) => {
          const reason = whyCantStartOrder(table, tables, orders);
          const selected = table.id === tableId;
          return (
            <button
              key={table.id}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={reason !== undefined}
              title={reason}
              onClick={() => setTableId(table.id)}
              aria-label={`${table.name}, ${table.seats} seats, ${TABLE_STATUS_LABEL[table.status]}${reason ? `. ${reason}` : ""}`}
              className={cn(
                "flex h-16 flex-col items-center justify-center rounded-xl border-2 transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                selected
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-surface",
              )}
            >
              <span className="font-display text-lg leading-none font-semibold">
                {table.name}
              </span>
              <span
                className={cn(
                  "mt-1 flex items-center gap-1 text-xs",
                  !selected && "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    TABLE_STATUS_STYLE[table.status].dot,
                  )}
                  aria-hidden="true"
                />
                <Users className="size-3" aria-hidden="true" />
                {table.seats}
              </span>
            </button>
          );
        })}
      </div>
      {(error ?? chosenProblem) && (
        <p role="alert" className="text-sm font-medium text-danger">
          {chosenProblem ?? error}
        </p>
      )}
    </div>
  );
}

function TakeawayDetails() {
  const customerName = useCartStore((s) => s.customerName);
  const setCustomerName = useCartStore((s) => s.setCustomerName);
  return (
    <Field
      label="Customer name (optional)"
      hint="Called out when the order is ready."
      value={customerName}
      onChange={(e) => setCustomerName(e.target.value)}
      maxLength={40}
      autoComplete="off"
    />
  );
}

function DeliveryDetails({ errors }: { errors: Record<string, string> }) {
  const delivery = useCartStore((s) => s.delivery);
  const setField = useCartStore((s) => s.setDeliveryField);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Customer name"
        value={delivery.customerName}
        onChange={(e) => setField("customerName", e.target.value)}
        error={errors.customerName}
        autoComplete="off"
      />
      <Field
        label="Mobile number"
        value={delivery.phone}
        onChange={(e) => setField("phone", e.target.value)}
        error={errors.phone}
        inputMode="tel"
        placeholder="98765 43210"
        autoComplete="off"
      />
      <Field
        label="Delivery address"
        className="sm:col-span-2"
        value={delivery.address}
        onChange={(e) => setField("address", e.target.value)}
        error={errors.address}
        placeholder="House, street, area"
        autoComplete="off"
      />
    </div>
  );
}
