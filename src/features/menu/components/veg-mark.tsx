import { cn } from "@/lib/utils/cn";

/**
 * The standard Indian food mark: a green square with a dot for vegetarian,
 * a brown-red square with a triangle for non-vegetarian. Guests and staff
 * recognise it at a glance. The shape differs too, not only the color,
 * so it also works for color-blind staff.
 */
export function VegMark({ isVeg, className }: { isVeg: boolean; className?: string }) {
  return (
    <span
      role="img"
      aria-label={isVeg ? "Vegetarian" : "Non-vegetarian"}
      className={cn(
        "inline-flex size-5 shrink-0 items-center justify-center rounded-[3px] border-2 bg-surface",
        isVeg ? "border-success" : "border-danger",
        className,
      )}
    >
      {isVeg ? (
        <span className="size-2 rounded-full bg-success" />
      ) : (
        // A small triangle drawn with CSS borders
        <span className="h-0 w-0 border-x-[5px] border-b-[8px] border-x-transparent border-b-danger" />
      )}
    </span>
  );
}
