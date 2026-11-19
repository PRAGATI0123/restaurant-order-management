"use client";

import { MessageSquareText, Send, ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Field } from "@/components/ui/input";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { calculateBill, itemUnitTotal } from "@/domain/billing/calculate-bill";
import { cartCount } from "@/domain/orders/cart";
import { formatRupees } from "@/domain/money";
import { cn } from "@/lib/utils/cn";
import { tryAction } from "@/lib/utils/try-action";
import { useCartStore } from "@/stores/cart-store";
import type { OrderItem } from "@/types/order";
import { useTaxRate } from "@/stores/settings-store";

type CartPanelProps = {
  /** "Dine-in · T5", shown under the title. */
  summary: string;
  onSend: () => void;
  /** Inside a bottom sheet: no card border, no title of its own. */
  embedded?: boolean;
};

/** The order being built: lines, quantities, notes, totals, and Send. */
export function CartPanel({ summary, onSend, embedded = false }: CartPanelProps) {
  const taxRate = useTaxRate(); // GST from Settings
  const lines = useCartStore((s) => s.lines);
  const setQuantity = useCartStore((s) => s.setQuantity);
  const setNote = useCartStore((s) => s.setNote);
  const reset = useCartStore((s) => s.reset);

  const [noteFor, setNoteFor] = useState<OrderItem>();
  const [confirmClear, setConfirmClear] = useState(false);

  // Same function the checkout will use (Step 7), so these numbers always match the bill.
  const bill = calculateBill({
    items: lines,
    taxRateBasisPoints: taxRate,
  });
  const count = cartCount(lines);

  return (
    <div
      className={cn(
        "flex flex-col",
        !embedded && "rounded-2xl border border-border bg-surface shadow-sm",
      )}
    >
      {!embedded && (
        <div className="flex items-baseline justify-between gap-2 border-b border-border p-5">
          <h2 className="font-display text-2xl font-semibold">Current order</h2>
          <span className="text-sm text-muted-foreground">{summary}</span>
        </div>
      )}

      {lines.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title="Nothing added yet"
          description="Tap a dish on the menu to add it."
          className="m-5 p-6"
        />
      ) : (
        <ul
          className={cn(
            "divide-y divide-border overflow-y-auto",
            !embedded && "max-h-[50vh] px-5",
          )}
        >
          {lines.map((line) => {
            const extras = [
              line.variant?.name,
              ...line.modifiers.map((m) => m.name),
              ...line.addOns.map((a) => `+ ${a.name}`),
            ]
              .filter(Boolean)
              .join(" · ");
            return (
              <li key={line.id} className="flex flex-col gap-2 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold">{line.name}</p>
                    {extras && <p className="text-sm text-muted-foreground">{extras}</p>}
                    {line.note && (
                      <p className="text-sm text-accent-foreground">
                        <span className="rounded bg-accent/40 px-1.5">
                          Note: {line.note}
                        </span>
                      </p>
                    )}
                  </div>
                  <span className="font-semibold tabular-nums">
                    {formatRupees(itemUnitTotal(line) * line.quantity)}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <QuantityStepper
                    label={line.name}
                    value={line.quantity}
                    removeAtMin
                    onChange={(q) => tryAction(() => setQuantity(line.id, q))}
                  />
                  <Button variant="ghost" size="sm" onClick={() => setNoteFor(line)}>
                    <MessageSquareText aria-hidden="true" />{" "}
                    {line.note ? "Edit note" : "Note"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div
        className={cn(
          "flex flex-col gap-2 border-t border-border pt-4",
          !embedded && "px-5 pb-5",
        )}
      >
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>
            Subtotal · {count} {count === 1 ? "item" : "items"}
          </span>
          <span className="tabular-nums">{formatRupees(bill.subtotalPaise)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Tax (GST 5%)</span>
          <span className="tabular-nums">{formatRupees(bill.taxPaise)}</span>
        </div>
        <div className="flex justify-between text-xl font-semibold" aria-live="polite">
          <span>Total</span>
          <span className="tabular-nums">{formatRupees(bill.totalPaise)}</span>
        </div>
        <Button
          size="lg"
          fullWidth
          disabled={lines.length === 0}
          onClick={onSend}
          className="mt-2"
        >
          <Send aria-hidden="true" /> Send to kitchen
        </Button>
        {lines.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)}>
            Clear order
          </Button>
        )}
      </div>

      <NoteDialog line={noteFor} onClose={() => setNoteFor(undefined)} onSave={setNote} />
      <ConfirmDialog
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        onConfirm={reset}
        title="Clear this order?"
        description="All dishes, the table and customer details will be removed. Nothing was sent to the kitchen yet."
        confirmLabel="Clear order"
      />
    </div>
  );
}

function NoteDialog({
  line,
  onClose,
  onSave,
}: {
  line: OrderItem | undefined;
  onClose: () => void;
  onSave: (lineId: string, note: string) => void;
}) {
  return (
    <Dialog
      open={line !== undefined}
      onClose={onClose}
      title={`Note for ${line?.name ?? "dish"}`}
    >
      {line && <NoteForm key={line.id} line={line} onClose={onClose} onSave={onSave} />}
    </Dialog>
  );
}

function NoteForm({
  line,
  onClose,
  onSave,
}: {
  line: OrderItem;
  onClose: () => void;
  onSave: (lineId: string, note: string) => void;
}) {
  const [note, setNote] = useState(line.note ?? "");
  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (tryAction(() => onSave(line.id, note))) onClose();
      }}
    >
      <Field
        label="Kitchen note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="e.g. less oil, no coriander"
        hint="Leave empty to remove the note."
        maxLength={80}
        autoComplete="off"
      />
      <DialogFooter>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit">Save note</Button>
      </DialogFooter>
    </form>
  );
}
