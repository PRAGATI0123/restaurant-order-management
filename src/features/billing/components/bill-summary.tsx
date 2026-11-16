import { formatRupees } from "@/domain/money";
import { cn } from "@/lib/utils/cn";
import type { Paise } from "@/types/common";
import type { Discount } from "@/types/order";
import type { InvoiceLine } from "@/types/payment";

type BillSummaryProps = {
  lines: InvoiceLine[];
  subtotalPaise: Paise;
  discount?: Discount;
  discountPaise: Paise;
  taxRateBasisPoints: number;
  taxPaise: Paise;
  totalPaise: Paise;
  /** Shown next to the discount row, e.g. an "Add discount" button. */
  discountAction?: React.ReactNode;
  className?: string;
};

/** "10%" for a percent discount, nothing for a fixed one. */
function discountLabel(discount: Discount | undefined): string {
  if (!discount) return "Discount";
  const what =
    discount.kind === "percent"
      ? `Discount (${discount.basisPoints / 100}%)`
      : "Discount";
  return discount.reason ? `${what} · ${discount.reason}` : what;
}

/**
 * THE BILL, as the guest sees it: every line, then subtotal, discount, GST and
 * the total. The checkout screen and the invoice (Step 16) both use it, so
 * the numbers can never be laid out differently in two places.
 */
export function BillSummary({
  lines,
  subtotalPaise,
  discount,
  discountPaise,
  taxRateBasisPoints,
  taxPaise,
  totalPaise,
  discountAction,
  className,
}: BillSummaryProps) {
  return (
    <div className={cn("flex flex-col", className)}>
      <table className="w-full text-left">
        <caption className="sr-only">Bill lines</caption>
        <thead className="text-xs tracking-wide text-muted-foreground uppercase">
          <tr>
            <th scope="col" className="pb-2 font-semibold">
              Item
            </th>
            <th scope="col" className="pb-2 text-right font-semibold">
              Qty
            </th>
            <th scope="col" className="pb-2 text-right font-semibold">
              Amount
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {lines.map((line, index) => (
            <tr key={index} className="align-top">
              <td className="py-2.5 pr-3">
                <p className="font-semibold">{line.name}</p>
                {line.details && (
                  <p className="text-sm text-muted-foreground">{line.details}</p>
                )}
                {line.quantity > 1 && (
                  <p className="text-sm text-muted-foreground tabular-nums">
                    {formatRupees(line.unitTotalPaise)} each
                  </p>
                )}
              </td>
              <td className="py-2.5 text-right tabular-nums">{line.quantity}</td>
              <td className="py-2.5 pl-3 text-right font-semibold tabular-nums">
                {formatRupees(line.lineTotalPaise)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="mt-3 flex flex-col gap-1.5 border-t border-border pt-3">
        <Row label="Subtotal" value={formatRupees(subtotalPaise)} />
        {(discountPaise > 0 || discountAction) && (
          <div className="flex min-h-11 items-center justify-between gap-3">
            <dt className="flex flex-wrap items-center gap-x-2 text-muted-foreground">
              {discountLabel(discount)}
              {discountAction}
            </dt>
            <dd className="whitespace-nowrap text-success tabular-nums">
              {discountPaise > 0 ? `− ${formatRupees(discountPaise)}` : formatRupees(0)}
            </dd>
          </div>
        )}
        <Row
          label={`GST (${taxRateBasisPoints / 100}%)`}
          value={formatRupees(taxPaise)}
        />
        <div className="mt-1 flex items-baseline justify-between border-t border-border pt-3">
          <dt className="font-display text-xl font-semibold">Total</dt>
          <dd className="font-display text-3xl font-semibold tabular-nums">
            {formatRupees(totalPaise)}
          </dd>
        </div>
      </dl>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 text-muted-foreground">
      <dt>{label}</dt>
      <dd className="whitespace-nowrap tabular-nums">{value}</dd>
    </div>
  );
}
