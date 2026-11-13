import { ArrowRight, LayoutDashboard } from "lucide-react";
import Link from "next/link";
import { Brand } from "@/components/layout/app-shell";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { mainNav } from "@/config/nav";

// One line per area, shown on the tiles below.
const areaDescriptions: Record<string, string> = {
  "/dashboard": "Today's sales at a glance",
  "/tables": "Live floor plan",
  "/orders": "Dine-in, takeaway, delivery",
  "/kitchen": "Tickets and timers",
  "/menu": "Items, variants, add-ons",
  "/billing": "Checkout and invoices",
  "/reports": "Sales by date",
  "/settings": "Tax, staff, demo data",
};

// Route: /
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-5">
        <Brand />
        <ThemeToggle />
      </header>

      <section className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-12 px-6 py-10 lg:grid-cols-2">
        <div className="flex flex-col items-start gap-6">
          <Badge variant="outline">Touchscreen POS · works offline</Badge>
          <h1 className="font-display text-4xl leading-tight font-semibold sm:text-5xl">
            Run every table, order and bill from one screen.
          </h1>
          <p className="max-w-lg text-lg text-muted-foreground">
            Take orders at the table, send them to the kitchen, and settle the bill — with
            split payments, live table status and daily reports.
          </p>
          <div className="flex flex-wrap gap-3">
            <ButtonLink href="/login" size="lg">
              Start shift <ArrowRight aria-hidden="true" />
            </ButtonLink>
            <ButtonLink href="/dashboard" size="lg" variant="secondary">
              <LayoutDashboard aria-hidden="true" /> Open dashboard
            </ButtonLink>
          </div>
        </div>

        <nav aria-label="App areas">
          <ul className="grid grid-cols-2 gap-3">
            {mainNav.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex h-full flex-col gap-3 rounded-2xl border border-border bg-surface p-4 shadow-sm transition-colors hover:border-primary"
                >
                  <span className="flex size-10 items-center justify-center rounded-xl bg-surface-muted text-primary">
                    <Icon className="size-5" aria-hidden="true" />
                  </span>
                  <span>
                    <span className="block font-semibold">{label}</span>
                    <span className="block text-sm text-muted-foreground">
                      {areaDescriptions[href]}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </section>
    </main>
  );
}
