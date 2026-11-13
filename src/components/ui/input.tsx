"use client";

import { useId } from "react";
import { cn } from "@/lib/utils/cn";

/** A plain text box in our style. 48px tall so it is easy to tap. */
export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-12 w-full rounded-xl border border-border bg-surface px-4 text-base text-foreground",
        "placeholder:text-muted-foreground",
        "aria-invalid:border-danger",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

type FieldProps = React.ComponentProps<"input"> & {
  label: string;
  /** Helper text shown under the box, e.g. "Price in rupees". */
  hint?: string;
  /** Error message. When set, the box turns red and screen readers announce it. */
  error?: string;
};

/**
 * Label + input + hint + error, wired together for accessibility:
 * - <label htmlFor> links the label to the input (tapping the label focuses the box)
 * - aria-describedby makes screen readers read the hint and error
 * - aria-invalid marks the box as wrong, which also turns its border red
 */
export function Field({ label, hint, error, id, className, ...props }: FieldProps) {
  // useId gives a unique, stable id, so two fields never clash.
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const hintId = `${inputId}-hint`;
  const errorId = `${inputId}-error`;
  // Point screen readers at whichever message is on screen: the error replaces
  // the hint, so we must never point at the hint while it's hidden.
  const describedBy = error ? errorId : hint ? hintId : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-sm font-semibold">
        {label}
      </label>
      <Input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...props}
      />
      {hint && !error && (
        <p id={hintId} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
