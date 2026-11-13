"use client";

import { cn } from "@/lib/utils/cn";

export type ChipOption<T extends string> = {
  value: T;
  label: string;
  /** Optional number shown after the label, e.g. how many items match. */
  count?: number;
};

type ChipGroupProps<T extends string> = {
  /** Read by screen readers, e.g. "Category". */
  label: string;
  options: ChipOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** "scroll" keeps chips on one line (scrolls sideways); "wrap" lets them wrap. */
  layout?: "scroll" | "wrap";
  className?: string;
};

/**
 * A row of pill buttons where exactly one is chosen: category tabs, filters.
 * Works like a set of radio buttons (role="radiogroup"), so screen readers
 * say "Starters, selected, 2 of 7". Each chip is 44px tall for touch.
 */
export function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  layout = "wrap",
  className,
}: ChipGroupProps<T>) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "flex gap-2",
        // Thin scrollbar: still usable with a mouse, but doesn't shout. Touch users swipe.
        layout === "scroll" ? "[scrollbar-width:thin] overflow-x-auto pb-2" : "flex-wrap",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex h-11 shrink-0 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors",
              selected
                ? "border-transparent bg-primary text-primary-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
            {option.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-xs tabular-nums",
                  selected ? "bg-primary-foreground/20" : "bg-surface-muted",
                )}
              >
                {option.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
