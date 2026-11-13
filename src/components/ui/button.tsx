import { cva, type VariantProps } from "class-variance-authority";
import { LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils/cn";

/**
 * All button styles in one place.
 *
 * cva ("class variance authority") maps props to classes:
 *   buttonVariants({ variant: "danger", size: "lg" }) → "…base… bg-danger … h-14 …"
 *
 * Every size is at least 44px tall, the minimum comfortable touch target.
 */
export const buttonVariants = cva(
  // Base: shared by every button
  [
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold whitespace-nowrap",
    "transition-colors select-none",
    "disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-5 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary:
          "border border-border bg-surface text-foreground hover:bg-surface-muted",
        accent: "bg-accent text-accent-foreground hover:brightness-95",
        danger: "bg-danger text-danger-foreground hover:brightness-95",
        ghost: "text-foreground hover:bg-surface-muted",
      },
      size: {
        sm: "h-11 px-4 text-sm", // 44px
        md: "h-12 px-5 text-base", // 48px (default)
        lg: "h-14 px-6 text-lg", // 56px: big actions like "Pay"
        icon: "size-12", // square, for icon-only buttons
      },
      fullWidth: {
        true: "w-full",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    /** Shows a spinner and blocks clicks while something is saving. */
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  fullWidth,
  loading = false,
  disabled,
  children,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      // Default to "button": inside a <form>, a plain <button> would submit it.
      type={type}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && (
        <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" />
      )}
      {children}
    </button>
  );
}
