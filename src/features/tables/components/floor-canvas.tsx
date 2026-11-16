import { FLOOR_COLUMNS, FLOOR_ROWS, TABLE_SIZE } from "@/domain/tables/layout";
import { cn } from "@/lib/utils/cn";
import type { RestaurantTable } from "@/types/table";

/**
 * Where a table goes on the canvas, as CSS grid lines.
 * x = 3 → "4 / span 2" (CSS grid counts from 1; every table is 2 × 2 cells).
 */
export function gridPlacement(table: Pick<RestaurantTable, "x" | "y">) {
  return {
    gridColumn: `${table.x + 1} / span ${TABLE_SIZE}`,
    gridRow: `${table.y + 1} / span ${TABLE_SIZE}`,
  };
}

/**
 * The room: a 12 × 8 CSS grid with a dotted background.
 * The canvas keeps a 2 : 1 shape, so each cell is a little wider than tall
 * (about 4 : 3). A table covers 2 × 2 cells, so every table is the same
 * gentle rectangle, never a long thin one.
 * Below 720px wide it scrolls sideways instead of squashing the tables, so
 * they stay big enough to tap and to show an order's total and time.
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
        "relative grid aspect-[2/1] min-w-[720px] gap-2 p-3",
        "bg-[radial-gradient(var(--border)_1px,transparent_1px)] bg-size-[20px_20px]",
        className,
      )}
      style={{
        gridTemplateColumns: `repeat(${FLOOR_COLUMNS}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${FLOOR_ROWS}, minmax(0, 1fr))`,
      }}
    >
      {children}
    </div>
  </div>
);

/**
 * The look every table shares, on the floor plan and in the editor:
 * fills its 2 × 2 space, rounded corners, a 2px border (colored by the caller).
 */
export const TABLE_BOX =
  "flex flex-col justify-between overflow-hidden rounded-xl border-2 bg-surface p-2.5 text-left shadow-sm";
