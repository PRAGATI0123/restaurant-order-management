"use client";

import { ChevronDown } from "lucide-react";
import { useId } from "react";
import { cn } from "@/lib/utils/cn";

type SelectFieldProps = React.ComponentProps<"select"> & {
  label: string;
  error?: string;
};

/**
 * A labelled dropdown built on the browser's own <select>.
 * On phones and tablets the browser shows its native, finger-friendly picker,
 * which is better for touch than any custom dropdown, and fully accessible.
 */
export function SelectField({
  label,
  error,
  id,
  className,
  children,
  ...props
}: SelectFieldProps) {
  const generatedId = useId();
  const selectId = id ?? generatedId;
  const errorId = `${selectId}-error`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={selectId} className="text-sm font-semibold">
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            "h-12 w-full appearance-none rounded-xl border border-border bg-surface pr-11 pl-4 text-base text-foreground",
            "disabled:opacity-50 aria-invalid:border-danger",
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute top-1/2 right-4 size-5 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
      </div>
      {error && (
        <p id={errorId} role="alert" className="text-sm font-medium text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
