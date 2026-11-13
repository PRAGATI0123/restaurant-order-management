import { LogOut, UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ActiveNavLinks, NavLinks } from "@/components/layout/nav-links";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { ButtonLink } from "@/components/ui/button-link";

/** The app name and logo. Tapping it goes to the dashboard. */
export function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <UtensilsCrossed className="size-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-display text-lg font-semibold">Restaurant POS</span>
        <span className="text-xs text-muted-foreground">my restaurant name</span>
      </span>
    </Link>
  );
}

/**
 * Who is logged in. Fixed sample values for now; in Step 10 this reads the
 * real logged-in staff member and role.
 */
function CurrentUser() {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
        DM
      </span>
      <span className="flex min-w-0 flex-col leading-tight">
        <span className="truncate font-semibold">Demo Manager</span>
        <span className="text-xs text-muted-foreground">Manager</span>
      </span>
    </div>
  );
}

/**
 * The frame around every POS page.
 *
 *  ≥1024px (laptop, tablet in landscape): fixed sidebar on the left
 *  <1024px (phone, tablet in portrait):   top bar + a row of scrollable links
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-1">
      {/* Sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex print:hidden">
        <div className="px-5 py-5">
          <Brand />
        </div>
        <nav aria-label="Main" className="flex-1 overflow-y-auto px-3 py-2">
          <Suspense fallback={<NavLinks pathname={null} variant="sidebar" />}>
            <ActiveNavLinks variant="sidebar" />
          </Suspense>
        </nav>
        <div className="flex flex-col gap-3 border-t border-border p-4">
          <div className="flex items-center justify-between gap-2">
            <CurrentUser />
            <ThemeToggle />
          </div>
          <ButtonLink href="/login" variant="ghost" size="sm" className="justify-start">
            <LogOut aria-hidden="true" /> Log out
          </ButtonLink>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (small screens only) */}
        <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur lg:hidden print:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Brand />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <ButtonLink href="/login" variant="ghost" size="icon" aria-label="Log out">
                <LogOut aria-hidden="true" />
              </ButtonLink>
            </div>
          </div>
          <nav aria-label="Main" className="overflow-x-auto px-4 pb-3">
            <Suspense fallback={<NavLinks pathname={null} variant="pills" />}>
              <ActiveNavLinks variant="pills" />
            </Suspense>
          </nav>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
