import { FLOOR_COLUMNS, FLOOR_ROWS, footprint } from "@/domain/tables/layout";
import { cn } from "@/lib/utils/cn";
import type { RestaurantTable } from "@/types/table";

/**
 * Where a table goes on the canvas, as CSS grid lines.
 * x = 3 and 2 cells wide → "4 / span 2" (CSS grid counts from 1).
 */
export function gridPlacement(table: Pick<RestaurantTable, "x" | "y" | "seats">) {
  const { width, height } = footprint(table.seats);
  return {
    gridColumn: `${table.x + 1} / span ${width}`,
    gridRow: `${table.y + 1} / span ${height}`,
  };
}

/**
 * The room: a 12 × 8 CSS grid with a dotted background. Tables are placed on
 * it with gridPlacement(). Below 640px wide it scrolls sideways instead of
 * squashing the tables, so they stay big enough to tap.
 */
export const FloorCanvas = ({
  children,
  className,
  ref,
}: {
  children: React.ReactNode;
  className?: string;
  ref?: React.Ref<HTMLDivElement>;
}) => (
  <div className="[scrollbar-width:thin] overflow-x-auto rounded-2xl border border-border bg-surface-muted/40">
    <div
      ref={ref}
      className={cn(
        "relative grid min-w-[640px] gap-2 p-3",
        "bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[20px_20px]",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${FLOOR_COLUMNS}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${FLOOR_ROWS}, 3.5rem)`,
      }}
    >
      {children}
    </div>
  </div>
);
