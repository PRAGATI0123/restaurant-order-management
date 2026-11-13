import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Usually a button that fixes the emptiness, e.g. "New order". */
  action?: React.ReactNode;
  className?: string;
};

/**
 * What a screen shows when there is nothing to list yet:
 * "No orders yet" + a short hint + the next action.
 * A blank white area makes users think the app is broken; this tells them it isn't.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-border p-10 text-center",
        className,
      )}
    >
      <div className="flex size-14 items-center justify-center rounded-full bg-surface-muted text-muted-foreground">
        <Icon className="size-7" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {description && <p className="max-w-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
