"use client";

import { cn } from "@/lib/utils/cn";

type SwitchProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** Read by screen readers, e.g. "Paneer Tikka available". Required: the switch has no text. */
  label: string;
  disabled?: boolean;
  className?: string;
};

/**
 * An on/off switch. It's a real <button> with role="switch", so it works with
 * a finger, a mouse, Tab + Space, and screen readers ("on" / "off").
 * The visible track is 52×32px, and the tappable area is 44px tall.
 */
export function Switch({
  checked,
  onCheckedChange,
  label,
  disabled,
  className,
}: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "group inline-flex h-11 shrink-0 items-center disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
    >
      <span
        className={cn(
          "flex h-8 w-13 items-center rounded-full p-1 transition-colors",
          checked ? "bg-success" : "bg-border",
        )}
      >
        <span
          className={cn(
            "size-6 rounded-full bg-white shadow-sm transition-transform motion-reduce:transition-none",
            checked && "translate-x-5",
          )}
        />
      </span>
    </button>
  );
}
