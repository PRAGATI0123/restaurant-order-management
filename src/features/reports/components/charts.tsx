"use client";

import type { LucideIcon } from "lucide-react";
import { useState } from "react";
import { hourLabel, type HourBucket } from "@/domain/reports/sales-report";
import { formatRupees } from "@/domain/money";
import { cn } from "@/lib/utils/cn";

/**
 * Small, dependency-free charts for the dashboard and reports.
 * Every chart here shows ONE series, so it uses one color (teal) and needs no
 * legend: the title says what it is. Numbers are written in text colors, never
 * in the bar color, and every chart can also be read as a table.
 */

/** A headline number: label, big value, one line of context. */
export function StatTile({
  icon: Icon,
  label,
  value,
  detail,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-2xl border border-border bg-surface p-4",
        className,
      )}
    >
      <span className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
        <Icon className="size-4" aria-hidden="true" /> {label}
      </span>
      <span className="font-display text-3xl font-semibold tabular-nums">{value}</span>
      {detail && <span className="text-sm text-muted-foreground">{detail}</span>}
    </div>
  );
}

/**
 * SALES BY HOUR: one bar per hour, height = money taken in that hour.
 *  - Bars are thin, 2px apart, with 4px rounded tops sitting on the baseline.
 *  - Hover or keyboard focus on a column shows its exact numbers. The whole
 *    column is the target (easier to hit than the bar itself).
 *  - "Show as table" gives the same numbers as a plain table.
 */
export function HourlySalesChart({ hours }: { hours: HourBucket[] }) {
  const [active, setActive] = useState<number>();
  const max = Math.max(...hours.map((h) => h.totalPaise), 1);
  const shown = hours.find((h) => h.hour === active);
  // Show the tooltip on the side AWAY from the hovered bar, so it never hides it.
  const shownOnLeft = shown !== undefined && hours.indexOf(shown) >= hours.length / 2;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        {/* Recessive guide: the top value, and a faint line at half */}
        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between border-t border-dashed border-border text-xs text-muted-foreground">
          <span className="-translate-y-full bg-surface pr-1 tabular-nums">
            {formatRupees(max)}
          </span>
        </div>
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-border/60" />

        <div
          // `relative` puts the bars above the guide lines (drawn first, behind)
          className="relative flex h-48 items-end gap-0.5 border-b border-border pt-2"
          onMouseLeave={() => setActive(undefined)}
        >
          {hours.map((h) => {
            const height = (h.totalPaise / max) * 100;
            const label = `${hourLabel(h.hour)}: ${formatRupees(h.totalPaise)} from ${h.bills} ${h.bills === 1 ? "bill" : "bills"}`;
            return (
              <div
                key={h.hour}
                tabIndex={0}
                role="img"
                aria-label={label}
                onMouseEnter={() => setActive(h.hour)}
                onFocus={() => setActive(h.hour)}
                onBlur={() => setActive(undefined)}
                className="group flex h-full min-w-0 flex-1 cursor-default items-end justify-center rounded-t-[4px] outline-none focus-visible:bg-surface-muted"
              >
                <div
                  className={cn(
                    "w-full max-w-10 rounded-t-[4px] bg-primary transition-opacity",
                    active !== undefined && active !== h.hour && "opacity-50",
                  )}
                  style={{ height: h.totalPaise > 0 ? `max(${height}%, 2px)` : 0 }}
                />
              </div>
            );
          })}
        </div>

        {/* Tooltip for the hovered / focused hour */}
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm shadow-md transition-opacity",
            shownOnLeft ? "left-0" : "right-0",
            shown ? "opacity-100" : "opacity-0",
          )}
        >
          {shown && (
            <>
              <p className="font-semibold">{hourLabel(shown.hour)}</p>
              <p className="tabular-nums">{formatRupees(shown.totalPaise)}</p>
              <p className="text-muted-foreground">
                {shown.bills} {shown.bills === 1 ? "bill" : "bills"}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="flex gap-0.5" aria-hidden="true">
        {hours.map((h) => (
          <span
            key={h.hour}
            className="min-w-0 flex-1 truncate text-center text-xs text-muted-foreground"
          >
            {hourLabel(h.hour)}
          </span>
        ))}
      </div>

      <details className="text-sm">
        <summary className="inline-flex min-h-11 cursor-pointer items-center font-semibold text-primary">
          Show as table
        </summary>
        <table className="mt-2 w-full text-left">
          <thead className="text-muted-foreground">
            <tr>
              <th scope="col" className="py-1 font-semibold">
                Hour
              </th>
              <th scope="col" className="py-1 text-right font-semibold">
                Bills
              </th>
              <th scope="col" className="py-1 text-right font-semibold">
                Sales
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {hours.map((h) => (
              <tr key={h.hour}>
                <td className="py-1">{hourLabel(h.hour)}</td>
                <td className="py-1 text-right tabular-nums">{h.bills}</td>
                <td className="py-1 text-right tabular-nums">
                  {formatRupees(h.totalPaise)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

export type BarListRow = {
  key: string;
  label: string;
  value: number;
  /** What's written on the right, e.g. "₹2,653.35". */
  valueText: string;
  /** Small text under the label, e.g. "3 payments". */
  detail?: string;
};

/**
 * A ranked list with a bar under each row: top dishes, payment methods.
 * Every row is labelled with its exact value, so it reads like a table that
 * also shows sizes at a glance. Bars are measured against the biggest row.
 */
export function BarList({ rows, label }: { rows: BarListRow[]; label: string }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  return (
    <ul className="flex flex-col gap-3" aria-label={label}>
      {rows.map((row) => (
        <li key={row.key} className="flex flex-col gap-1">
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 font-semibold">
              {row.label}
              {row.detail && (
                <span className="font-normal text-muted-foreground"> · {row.detail}</span>
              )}
            </span>
            <span className="shrink-0 font-semibold tabular-nums">{row.valueText}</span>
          </div>
          <div className="h-2 rounded-full bg-surface-muted" aria-hidden="true">
            <div
              className="h-2 rounded-full bg-primary"
              style={{
                width: row.value > 0 ? `max(${(row.value / max) * 100}%, 4px)` : 0,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
