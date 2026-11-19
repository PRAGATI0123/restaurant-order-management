import { UtensilsCrossed } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { ActiveNavLinks, NavLinks } from "@/components/layout/nav-links";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import {
  CurrentUser,
  LogoutButton,
  RestaurantName,
} from "@/features/auth/components/current-user";

/** The app name and logo. Tapping it goes to the dashboard. */
export function Brand() {
  return (
    <Link href="/dashboard" className="flex items-center gap-3">
      <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <UtensilsCrossed className="size-5" aria-hidden="true" />
      </span>
      <span className="flex flex-col leading-tight">
        <span className="font-display text-lg font-semibold">Restaurant POS</span>
        <RestaurantName />
      </span>
    </Link>
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
          <LogoutButton />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (small screens only) */}
        <header className="sticky top-0 z-10 border-b border-border bg-surface/95 backdrop-blur lg:hidden print:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Brand />
            <div className="flex items-center gap-2">
              <ThemeToggle />
              <LogoutButton compact />
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
