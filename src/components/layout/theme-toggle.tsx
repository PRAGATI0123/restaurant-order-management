"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

// One button that flips between light and dark.
//
// Which icon to show is decided by CSS (`dark:` classes), not by JavaScript.
// The server can't know the user's saved theme, so if JavaScript picked the icon,
// the first paint could show the wrong one and then "jump". With CSS, the icon
// is correct from the very first paint.
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Switch between light and dark mode"
      title="Switch between light and dark mode"
      className="inline-flex size-11 items-center justify-center rounded-full border border-border bg-surface text-foreground transition-colors hover:bg-surface-muted"
    >
      {/* Light mode shows the moon ("go dark"); dark mode shows the sun ("go light") */}
      <Moon className="size-5 dark:hidden" aria-hidden="true" />
      <Sun className="hidden size-5 dark:block" aria-hidden="true" />
    </button>
  );
}
