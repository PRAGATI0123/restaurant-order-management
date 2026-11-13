import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";

/**
 * Shown on a page whose features aren't built yet.
 * Each page replaces this with its real content in its own step.
 */
export function PagePlaceholder({ icon, step }: { icon: LucideIcon; step: number }) {
  return <EmptyState icon={icon} title="" description={``} className="bg-surface" />;
}
