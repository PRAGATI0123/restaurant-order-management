import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils/cn";

/**
 * A small colored label for a status: "Occupied", "Preparing", "Paid".
 * Status badges will always show text, never color alone, so color-blind
 * staff can still read the status.
 */
export const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap",
  {
    variants: {
      variant: {
        neutral: "bg-surface-muted text-foreground",
        primary: "bg-primary text-primary-foreground",
        accent: "bg-accent text-accent-foreground",
        success: "bg-success text-success-foreground",
        danger: "bg-danger text-danger-foreground",
        steel: "bg-steel text-steel-foreground",
        outline: "border border-border text-foreground",
      },
    },
    defaultVariants: {
      variant: "neutral",
    },
  },
);

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}
