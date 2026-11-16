"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ChipGroup } from "@/components/ui/chip-group";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { Field } from "@/components/ui/input";
import { DomainError } from "@/domain/errors";
import { formatRupees, paiseToText, parseRupees } from "@/domain/money";
import { cn } from "@/lib/utils/cn";
import type { Paise } from "@/types/common";
import type { Discount } from "@/types/order";

type Kind = Discount["kind"];

const PRESET_PERCENTS = ["5", "10", "15", "20"];
const QUICK_REASONS = ["Regular guest", "Staff meal", "Complaint", "Birthday"];

type DiscountDialogProps = {
  open: boolean;
  onClose: () => void;
  current?: Discount;
  subtotalPaise: Paise;
  /** Saves the discount (or removes it with undefined). Throws DomainError if a rule says no. */
  onApply: (discount: Discount | undefined) => void;
};

/**
 * Add or change the discount on a bill: a percentage (with quick 5/10/15/20%
 * buttons) or a fixed rupee amount, plus an optional reason that is printed
 * on the invoice. The rules (at most 100%, never more than the bill) are
 * checked by domain/billing/payments.ts; their message shows under the field.
 */
export function DiscountDialog({
  open,
  onClose,
  current,
  subtotalPaise,
  onApply,
}: DiscountDialogProps) {
  const [kind, setKind] = useState<Kind>(current?.kind ?? "percent");
  const [value, setValue] = useState(() =>
    !current
      ? "10"
      : current.kind === "percent"
        ? paiseToText(current.basisPoints) // 1250 basis points → "12.50"
        : paiseToText(current.amountPaise),
  );
  const [reason, setReason] = useState(current?.reason ?? "");
  const [error, setError] = useState<string>();

  function apply(discount: Discount | undefined) {
    try {
      onApply(discount);
      onClose();
    } catch (e) {
      if (e instanceof DomainError) setError(e.message);
      else throw e;
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let hundredths: number;
    try {
      // Both "12.5" (%) and "150.50" (₹) have at most 2 decimals, so the same
      // exact reader works: "12.5" → 1250 hundredths of a percent = basis points.
      hundredths = parseRupees(value);
    } catch {
      setError(
        kind === "percent"
          ? "Enter a percentage, like 10."
          : "Enter an amount, like 150.",
      );
      return;
    }
    apply(
      kind === "percent"
        ? { kind, basisPoints: hundredths, reason }
        : { kind, amountPaise: hundredths, reason },
    );
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={current ? "Change discount" : "Add discount"}
      description={`Bill before tax: ${formatRupees(subtotalPaise)}. GST is worked out after the discount.`}
    >
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <ChipGroup
          label="Discount type"
          value={kind}
          onChange={(next) => {
            setKind(next);
            setError(undefined);
          }}
          options={[
            { value: "percent", label: "Percentage %" },
            { value: "fixed", label: "Amount ₹" },
          ]}
        />

        {kind === "percent" && (
          <div
            className="flex flex-wrap gap-2"
            role="group"
            aria-label="Quick percentages"
          >
            {PRESET_PERCENTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => {
                  setValue(p);
                  setError(undefined);
                }}
                className={cn(
                  "h-11 min-w-16 rounded-xl border px-4 font-semibold tabular-nums",
                  value === p
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-surface hover:bg-surface-muted",
                )}
              >
                {p}%
              </button>
            ))}
          </div>
        )}

        <Field
          label={kind === "percent" ? "Percentage" : "Amount in rupees"}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setError(undefined);
          }}
          inputMode="decimal"
          autoComplete="off"
          error={error}
        />

        <div className="flex flex-col gap-2">
          <Field
            label="Reason (optional, printed on the bill)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={60}
            autoComplete="off"
          />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Quick reasons">
            {QUICK_REASONS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReason(r)}
                className="h-11 rounded-full border border-border px-4 text-sm font-semibold text-muted-foreground hover:text-foreground"
              >
                {r}
              </button>
            ))}
          </div>
        </div>

        <DialogFooter className="mt-2">
          {current && (
            <Button
              variant="ghost"
              className="text-danger sm:mr-auto"
              onClick={() => apply(undefined)}
            >
              Remove discount
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Apply discount</Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
