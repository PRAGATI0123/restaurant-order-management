import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine class names, then let the LAST conflicting Tailwind class win.
 *
 *   cn("px-4 bg-primary", isActive && "bg-accent", className)
 *
 * 1. clsx   drops false / undefined values, so conditions read naturally.
 * 2. twMerge removes earlier classes that clash with later ones
 *    ("bg-primary bg-accent" → "bg-accent"). Without it both classes stay,
 *    and which one wins depends on CSS order, not on what we wrote.
 *
 * Every component accepts a `className` prop and passes it through cn(),
 * so a page can override one style without copying the whole component.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
