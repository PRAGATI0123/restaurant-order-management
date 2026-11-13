"use client";

import { Toaster as SonnerToaster } from "sonner";

/**
 * Short pop-up messages: "Order #12 sent to kitchen", "Payment failed".
 *
 * Placed once in the root layout. Anywhere in the app you then call:
 *   import { toast } from "sonner";
 *   toast.success("Order placed");
 *   toast.error("Could not save. Please try again.");
 *
 * `unstyled` turns off sonner's own colors so we can use our theme classes,
 * which switch automatically between light and dark.
 * Sonner announces each toast to screen readers (it uses an aria-live region).
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-center"
      visibleToasts={3}
      toastOptions={{
        unstyled: true,
        duration: 4000,
        classNames: {
          toast:
            "flex w-full items-center gap-3 rounded-xl border border-border border-l-4 bg-surface p-4 text-foreground shadow-lg sm:w-[356px]",
          title: "font-semibold",
          description: "text-sm text-muted-foreground",
          icon: "shrink-0",
          success: "border-l-success [&_[data-icon]]:text-success",
          error: "border-l-danger [&_[data-icon]]:text-danger",
          warning: "border-l-accent [&_[data-icon]]:text-accent",
          info: "border-l-primary [&_[data-icon]]:text-primary",
          actionButton:
            "ml-auto rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground",
        },
      }}
    />
  );
}
