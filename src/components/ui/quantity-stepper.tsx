"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  /** What is being counted, for screen readers: "Butter Naan". */
  label: string;
  min?: number;
  max?: number;
  /** Show a bin instead of "−" at the minimum, meaning "remove" (for cart lines). */
  removeAtMin?: boolean;
  size?: "md" | "lg";
  className?: string;
};

/**
 * − 2 +  buttons for quantities. Big buttons (44–48px) for fingers.
 * The number is announced to screen readers when it changes (aria-live).
 */
export function QuantityStepper({
  value,
  onChange,
  label,
  min = 1,
  max = 99,
  removeAtMin = false,
  size = "md",
  className,
}: QuantityStepperProps) {
  const atMin = value <= min;
  const button = cn(
    "flex shrink-0 items-center justify-center rounded-full border border-border bg-surface transition-colors hover:bg-surface-muted disabled:opacity-40",
    size === "lg" ? "size-12" : "size-11",
  );
  const showRemove = removeAtMin && atMin;

  return (
    <div
      className={cn("flex items-center gap-2", className)}
      role="group"
      aria-label={`${label} quantity`}
    >
      <button
        type="button"
        className={cn(button, showRemove && "text-danger")}
        onClick={() => onChange(value - 1)}
        disabled={atMin && !removeAtMin}
        aria-label={showRemove ? `Remove ${label}` : `One less ${label}`}
      >
        {showRemove ? (
          <Trash2 className="size-5" aria-hidden="true" />
        ) : (
          <Minus className="size-5" aria-hidden="true" />
        )}
      </button>
      <span
        className={cn(
          "min-w-8 text-center font-semibold tabular-nums",
          size === "lg" && "text-xl",
        )}
        aria-live="polite"
      >
        {value}
      </span>
      <button
        type="button"
        className={button}
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label={`One more ${label}`}
      >
        <Plus className="size-5" aria-hidden="true" />
      </button>
    </div>
  );
}
