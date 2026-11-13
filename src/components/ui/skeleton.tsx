import { cn } from "@/lib/utils/cn";

/**
 * A grey placeholder shaped like the content that is still loading.
 * Better than a spinner for lists and cards: the page doesn't jump when data arrives.
 *
 * motion-safe: only pulse if the user hasn't asked their device to reduce motion.
 * aria-hidden: screen readers skip it (the loading message is announced elsewhere).
 */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn("rounded-lg bg-surface-muted motion-safe:animate-pulse", className)}
      {...props}
    />
  );
}
