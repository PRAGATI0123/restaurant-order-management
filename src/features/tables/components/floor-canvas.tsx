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
 * The canvas keeps a 3 : 2 shape (12 : 8), so every cell is square and a
 * 2 × 2 table space is square too: round tables stay perfect circles.
 * Below 640px wide it scrolls sideways instead of squashing the tables, so
 * they stay big enough to tap.
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
        "relative grid aspect-[3/2] min-w-[640px] gap-2 p-3",
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
 * The round table itself, drawn inside its grid space. The space is a
 * "container", and the circle is as big as the smaller of its width and
 * height (min(100cqw, 100cqh)), so it's always a true circle, never an oval.
 */
export function TableCircle({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex size-[min(100cqw,100cqh)] flex-col items-center justify-center gap-0.5 rounded-full border-2 bg-surface p-2 text-center shadow-sm",
        className,
      )}
    >
      {children}
    </span>
  );
}
