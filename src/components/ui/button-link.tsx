import type { VariantProps } from "class-variance-authority";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

type ButtonLinkProps = React.ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants>;

/**
 * A link that looks like a button.
 *
 * Use it when the button takes you to another page. A real <a> link means the
 * browser handles it properly: open in a new tab, right-click, back button,
 * and screen readers announce it as "link".
 * Use <Button> when the click does something on the same page (save, open dialog).
 */
export function ButtonLink({
  className,
  variant,
  size,
  fullWidth,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      {...props}
    />
  );
}
