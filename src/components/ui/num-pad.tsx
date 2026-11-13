"use client";

import { Delete } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type NumPadProps = {
  /** The current text, e.g. "125.5". The parent owns it (a "controlled" component). */
  value: string;
  onChange: (value: string) => void;
  /** Name read out by screen readers, e.g. "Amount received" or "PIN". */
  label: string;
  /** Most characters allowed, e.g. 4 for a PIN. */
  maxLength?: number;
  /** Show a "." key, for money. Allows at most 2 digits after the dot (paise). */
  allowDecimal?: boolean;
  className?: string;
};

/**
 * A big on-screen number pad for touch screens: PIN entry, cash received,
 * custom discount. Each key is 64px tall, so it's easy to hit with a finger.
 *
 * Layout:   1 2 3
 *           4 5 6
 *           7 8 9
 *         (./C) 0 ⌫
 */
export function NumPad({
  value,
  onChange,
  label,
  maxLength = 10,
  allowDecimal = false,
  className,
}: NumPadProps) {
  function pressDigit(digit: string) {
    if (value.length >= maxLength) return;
    if (allowDecimal) {
      const decimals = value.split(".")[1];
      if (decimals !== undefined && decimals.length >= 2) return; // no fractions of a paisa
      if (value === "0") return onChange(digit); // "07" → "7"
    }
    onChange(value + digit);
  }

  function pressDot() {
    if (value.includes(".") || value.length >= maxLength) return;
    onChange(value === "" ? "0." : value + ".");
  }

  const keyClass =
    "flex h-16 items-center justify-center rounded-xl border border-border bg-surface text-2xl font-semibold tabular-nums transition-colors select-none hover:bg-surface-muted active:bg-surface-muted";

  return (
    <div
      role="group"
      aria-label={label}
      className={cn("grid grid-cols-3 gap-2", className)}
    >
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
        <button
          key={digit}
          type="button"
          className={keyClass}
          onClick={() => pressDigit(digit)}
        >
          {digit}
        </button>
      ))}

      {allowDecimal ? (
        <button
          type="button"
          className={keyClass}
          onClick={pressDot}
          aria-label="Decimal point"
        >
          .
        </button>
      ) : (
        <button
          type="button"
          className={cn(keyClass, "text-lg text-muted-foreground")}
          onClick={() => onChange("")}
          aria-label="Clear"
        >
          C
        </button>
      )}

      <button type="button" className={keyClass} onClick={() => pressDigit("0")}>
        0
      </button>

      <button
        type="button"
        className={keyClass}
        onClick={() => onChange(value.slice(0, -1))}
        aria-label="Delete last digit"
      >
        <Delete className="size-6" aria-hidden="true" />
      </button>
    </div>
  );
}
